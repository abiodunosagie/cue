// Recording the candidate's face while they read a script (Script > Record).
// The renderer captures the camera and records it (renderer/recorder.js); this
// side owns the file: chunks arrive every second and are appended to disk, so
// a long take never sits in memory and a crash keeps what was recorded. When
// the take ends, ffmpeg (when installed) moves the index to the front of the
// MP4 so it opens and uploads everywhere; without it the file is kept as is.
//
// The presets and the crop maths live in renderer/record-presets.js, loaded by
// both sides, so the choice and its advice are in one place.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { PRESETS, PRESET_IDS, DEFAULT_PRESET, cropFor } = require('../renderer/record-presets');

function normalizeRecording(value) {
  const v = value && typeof value === 'object' ? value : {};
  const id = (x) => (typeof x === 'string' ? x.slice(0, 200) : '');
  return {
    cameraId: id(v.cameraId),
    micId: id(v.micId),
    on: v.on === true,
    autoStop: v.autoStop !== false,
    preset: PRESET_IDS.includes(v.preset) ? v.preset : DEFAULT_PRESET
  };
}

// A name the candidate can find in Downloads: the script's name, the date and
// time, the preset and the take, e.g. "Upwork intro 2026-09-28 14.05 landscape take 2.mp4".
function fileNameFor({ scriptName, preset, take, now = new Date() }) {
  // No path separators or control characters, and no leading dot (a hidden file in Finder).
  const clean = String(scriptName || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+/, '').trim().slice(0, 60) || 'cue recording';
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${clean} ${stamp} ${PRESET_IDS.includes(preset) ? preset : DEFAULT_PRESET}${take > 1 ? ' take ' + take : ''}.mp4`;
}

// Videos are the candidate's face and voice: readable by them only, even in a shared folder.
const FILE_MODE = 0o600;

// A path that nothing is at, not even a dangling link: "name.mp4", else "name (2).mp4", ...
function freePath(dir, name) {
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  const taken = (p) => { try { fs.lstatSync(p); return true; } catch { return false; } };
  for (let i = 1; i < 1000; i++) {
    const p = path.join(dir, i === 1 ? name : `${base} (${i})${ext}`);
    if (!taken(p)) return p;
  }
  return path.join(dir, `${base} ${Date.now()}${ext}`);
}

// Creates `name` in `dir` exclusively (fails rather than follow or replace
// anything already there, a link included) and returns its path.
function reserve(dir, name) {
  for (let i = 0; i < 5; i++) {
    const p = freePath(dir, name);
    try { fs.closeSync(fs.openSync(p, 'wx', FILE_MODE)); return p; } catch (e) { if (e.code !== 'EEXIST') throw e; }
  }
  throw new Error('No free file name in ' + dir);
}

const FFMPEG_PATHS = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg'];
function findFfmpeg() {
  return FFMPEG_PATHS.find((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } }) || '';
}

// Chromium writes a fragmented MP4; copying it into a plain one with the
// index first fixes the length some players show and lets it stream. Nothing
// is re-encoded. Resolves true when `out` was written.
function remux(ffmpeg, input, out) {
  return new Promise((resolve) => {
    execFile(ffmpeg, ['-y', '-v', 'error', '-i', input, '-c', 'copy', '-movflags', '+faststart', out], { timeout: 300000 }, (err) => resolve(!err));
  });
}

// A MediaRecorder chunk is about a second of video (a few MB); anything far
// bigger is not one. A take stops growing at the cap rather than fill the disk.
const MAX_CHUNK_BYTES = 64 * 1024 * 1024;
const MAX_TAKE_BYTES = 40 * 1024 * 1024 * 1024;

// One take at a time. `folder()` is where videos go (Downloads unless changed).
function createRecorderFiles({ folder, ffmpeg = findFfmpeg(), maxTakeBytes = MAX_TAKE_BYTES } = {}) {
  let take = null; // { id, final, part, fd, bytes, failed }
  let seq = 0;

  function begin({ scriptName, preset, take: takeNo }) {
    if (take) abort();
    const dir = folder();
    fs.mkdirSync(dir, { recursive: true });
    // Both names are created here, exclusively, so a folder that cannot be
    // written fails Start, not the take, and nothing else can sit at either
    // name when the take ends. The part file sits next to the final one, so a
    // crash leaves the take where it is looked for.
    const final = reserve(dir, fileNameFor({ scriptName, preset, take: takeNo }));
    let part;
    try { part = reserve(dir, path.basename(final).replace(/\.mp4$/, '.recording.mp4')); } catch (e) { removeQuietly(final); throw e; }
    // Written synchronously: each chunk is on disk before the next arrives, and
    // a quit (abort) closes the file with nothing left in a buffer.
    const fd = fs.openSync(part, 'r+');
    const id = String(++seq);
    take = { id, final, part, fd, bytes: 0, failed: '' };
    return { id, file: path.basename(final) };
  }

  function chunk(id, data) {
    if (!take || take.id !== id || take.failed) return { ok: false, error: take && take.failed ? take.failed : 'No recording in progress.' };
    const buf = Buffer.from(data);
    if (buf.length > MAX_CHUNK_BYTES) return { ok: false, error: 'A piece of the video was too large to be real.' };
    if (take.bytes + buf.length > maxTakeBytes) { take.failed = 'The take reached its size limit; what came before it is saved.'; return { ok: false, error: take.failed }; }
    try {
      fs.writeSync(take.fd, buf, 0, buf.length, take.bytes);
      take.bytes += buf.length;
      return { ok: true };
    } catch (e) {
      take.failed = e.message;
      return { ok: false, error: e.message };
    }
  }

  async function end(id) {
    if (!take || take.id !== id) return { error: 'No recording in progress.' };
    const t = take;
    take = null;
    fs.closeSync(t.fd);
    if (!t.bytes) { removeQuietly(t.part); removeQuietly(t.final); return { error: 'Nothing was recorded.' }; }
    // A take cut short by an error or the size cap still keeps what it has.
    const warning = t.failed ? 'The recording stopped early: ' + t.failed : '';
    if (ffmpeg) {
      // ffmpeg writes into a file this process just created, never a name it did not.
      const tmp = reserve(path.dirname(t.final), path.basename(t.final).replace(/\.mp4$/, '.remux.mp4'));
      if (await remux(ffmpeg, t.part, tmp)) {
        fs.chmodSync(tmp, FILE_MODE);
        fs.renameSync(tmp, t.final);
        removeQuietly(t.part);
        return { path: t.final, bytes: fs.statSync(t.final).size, remuxed: true, warning };
      }
      removeQuietly(tmp);
    }
    fs.renameSync(t.part, t.final);
    return { path: t.final, bytes: t.bytes, remuxed: false, warning };
  }

  // A take thrown away (the page reloaded, cue quit): keep what was recorded.
  function abort() {
    if (!take) return;
    const t = take;
    take = null;
    try { fs.closeSync(t.fd); } catch { /* already closed */ }
    // The reserved final name is still empty: only the part file holds the take.
    removeQuietly(t.final);
  }

  return { begin, chunk, end, abort, hasFfmpeg: () => !!ffmpeg };
}

function removeQuietly(p) {
  try { fs.unlinkSync(p); } catch { /* already gone */ }
}

function defaultFolder() {
  return path.join(os.homedir(), 'Downloads');
}

module.exports = {
  PRESETS, PRESET_IDS, DEFAULT_PRESET,
  normalizeRecording, cropFor, fileNameFor, freePath, findFfmpeg, createRecorderFiles, defaultFolder
};
