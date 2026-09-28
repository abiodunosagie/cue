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
  const clean = String(scriptName || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60) || 'cue recording';
  const pad = (n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${clean} ${stamp} ${PRESETS[preset] ? preset : DEFAULT_PRESET}${take > 1 ? ' take ' + take : ''}.mp4`;
}

// A path that does not exist yet: "name.mp4", else "name (2).mp4", ...
function freePath(dir, name) {
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 1; i < 1000; i++) {
    const p = path.join(dir, i === 1 ? name : `${base} (${i})${ext}`);
    if (!fs.existsSync(p)) return p;
  }
  return path.join(dir, `${base} ${Date.now()}${ext}`);
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

// One take at a time. `folder()` is where videos go (Downloads unless changed).
function createRecorderFiles({ folder, ffmpeg = findFfmpeg() } = {}) {
  let take = null; // { id, path, part, stream, bytes, failed }
  let seq = 0;

  function begin({ scriptName, preset, take: takeNo }) {
    if (take) abort();
    const dir = folder();
    fs.mkdirSync(dir, { recursive: true });
    const final = freePath(dir, fileNameFor({ scriptName, preset, take: takeNo }));
    // Written next to the final file, so a crash leaves the take where it is looked for.
    const part = final.replace(/\.mp4$/, '.recording.mp4');
    // Opened here, not lazily, so a folder that cannot be written fails Start, not the take.
    const stream = fs.createWriteStream(part, { fd: fs.openSync(part, 'wx', 0o644) });
    const id = String(++seq);
    take = { id, final, part, stream, bytes: 0, failed: '' };
    stream.on('error', (e) => { if (take && take.id === id) take.failed = e.message; });
    return { id, file: path.basename(final) };
  }

  function chunk(id, data) {
    if (!take || take.id !== id || take.failed) return { ok: false, error: take && take.failed ? take.failed : 'No recording in progress.' };
    const buf = Buffer.from(data);
    take.bytes += buf.length;
    take.stream.write(buf);
    return { ok: true };
  }

  async function end(id) {
    if (!take || take.id !== id) return { error: 'No recording in progress.' };
    const t = take;
    take = null;
    await new Promise((resolve) => t.stream.end(resolve));
    if (t.failed) return { error: 'The video could not be written: ' + t.failed, path: t.part };
    if (!t.bytes) { try { fs.unlinkSync(t.part); } catch { /* nothing written */ } return { error: 'Nothing was recorded.' }; }
    if (ffmpeg && await remux(ffmpeg, t.part, t.final)) {
      try { fs.unlinkSync(t.part); } catch { /* the remuxed copy is what counts */ }
      return { path: t.final, bytes: fs.statSync(t.final).size, remuxed: true };
    }
    fs.renameSync(t.part, t.final);
    return { path: t.final, bytes: t.bytes, remuxed: false };
  }

  // A take thrown away (the page reloaded, cue quit): keep what was recorded.
  function abort() {
    if (!take) return;
    const t = take;
    take = null;
    t.stream.end();
  }

  return { begin, chunk, end, abort, active: () => !!take, hasFfmpeg: () => !!ffmpeg };
}

function defaultFolder() {
  return path.join(os.homedir(), 'Downloads');
}

module.exports = {
  PRESETS, PRESET_IDS, DEFAULT_PRESET,
  normalizeRecording, cropFor, fileNameFor, freePath, findFfmpeg, createRecorderFiles, defaultFolder
};
