const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { PRESETS, PRESET_IDS, cropFor } = require('../renderer/record-presets');
const { normalizeRecording, fileNameFor, freePath, createRecorderFiles } = require('../src/recording');

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cue-rec-'));

test('every preset says what it is usually for, and only the prompter records nothing', () => {
  for (const id of PRESET_IDS) {
    const p = PRESETS[id];
    assert.ok(p.label && p.usual && p.camera, id);
    assert.equal(!!p.request, id !== 'prompter', id);
    // It asks for the camera mode nearest its shape (4:5 comes from the 3:4 mode) and crops the rest.
    if (p.request) assert.ok(Math.abs(p.request.width / p.request.height - p.aspect) < 0.06, id + ' asks for a mode near its shape');
    assert.doesNotMatch(p.usual + p.camera + p.label, /—/, 'no em dashes');
  }
});

test('the crop keeps the preset shape, centred, in even pixels', () => {
  assert.deepEqual(cropFor(1920, 1440, 9 / 16), { sx: 555, sy: 0, sw: 810, sh: 1440 });
  assert.deepEqual(cropFor(1920, 1080, 16 / 9), { sx: 0, sy: 0, sw: 1920, sh: 1080 });
  assert.deepEqual(cropFor(1328, 1760, 4 / 5), { sx: 0, sy: 50, sw: 1328, sh: 1660 });
  const sq = cropFor(1921, 1081, 1);
  assert.equal(sq.sw % 2, 0); assert.equal(sq.sh % 2, 0); assert.equal(sq.sw, sq.sh);
  assert.deepEqual(cropFor(0, 0, 1), { sx: 0, sy: 0, sw: 2, sh: 2 });
});

test('recording settings are cleaned', () => {
  assert.deepEqual(normalizeRecording(null), { cameraId: '', micId: '', on: false, autoStop: true, subtitles: false, preset: 'landscape' });
  assert.deepEqual(normalizeRecording({ cameraId: 'c', micId: 7, on: 'yes', preset: 'nope' }), { cameraId: 'c', micId: '', on: false, autoStop: true, subtitles: false, preset: 'landscape' });
  assert.equal(normalizeRecording({ on: true, preset: 'portrait' }).preset, 'portrait');
});

test('file names are safe, dated, and never overwrite', () => {
  const now = new Date(2026, 8, 28, 9, 5);
  assert.equal(fileNameFor({ scriptName: 'Upwork: intro/v2', preset: 'portrait', take: 1, now }), 'Upwork intro v2 2026-09-28 09.05 portrait.mp4');
  assert.equal(fileNameFor({ scriptName: '', preset: 'bogus', take: 3, now }), 'cue recording 2026-09-28 09.05 landscape take 3.mp4');
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'a.mp4'), '');
  assert.equal(path.basename(freePath(dir, 'a.mp4')), 'a (2).mp4');
  assert.equal(path.basename(freePath(dir, 'b.mp4')), 'b.mp4');
});

test('a take is written chunk by chunk and renamed when it ends', async () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  const { id, file } = files.begin({ scriptName: 'Intro', preset: 'landscape', take: 1 });
  assert.ok(fs.existsSync(path.join(dir, file.replace(/\.mp4$/, '.recording.mp4'))), 'written next to the final file while recording');
  assert.equal((await files.chunk(id, new Uint8Array([1, 2, 3]))).ok, true);
  assert.equal((await files.chunk('other', new Uint8Array([9]))).ok, false);
  await files.chunk(id, new Uint8Array([4]));
  const res = await files.end(id);
  assert.equal(res.remuxed, false);
  assert.deepEqual([...fs.readFileSync(res.path)], [1, 2, 3, 4]);
  assert.equal(path.basename(res.path), file);
  assert.equal(fs.statSync(res.path).mode & 0o777, 0o600, 'only the candidate can read their video');
  assert.deepEqual(fs.readdirSync(dir), [file], 'no part file left behind');
  assert.deepEqual(await files.end(id), { error: 'No recording in progress.' });
});

test('an empty take leaves no file behind', async () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  const { id } = files.begin({ scriptName: 'x', preset: 'landscape', take: 1 });
  assert.equal((await files.end(id)).error, 'Nothing was recorded.');
  assert.deepEqual(fs.readdirSync(dir), []);
});

test('the camera is declared: entitlement and an honest usage line', () => {
  const plist = fs.readFileSync(path.join(__dirname, '..', 'build-resources', 'entitlements.mac.plist'), 'utf8');
  assert.match(plist, /com\.apple\.security\.device\.camera<\/key>\s*<true\/>/);
  const builder = fs.readFileSync(path.join(__dirname, '..', 'electron-builder.cjs'), 'utf8');
  assert.doesNotMatch(builder, /does not use the camera/);
  assert.match(builder, /NSCameraUsageDescription:\s*"cue uses the camera only when you record yourself/);
});

test('the microphone check calls quiet, good and loud at the right levels', () => {
  const { micVerdict } = require('../renderer/record-presets');
  assert.equal(micVerdict(0).level, 'quiet');
  assert.equal(micVerdict(0.005).level, 'quiet');   // -46 dBFS
  assert.equal(micVerdict(0.1).level, 'good');      // -20 dBFS
  assert.equal(micVerdict(0.5).level, 'good');      // -6 dBFS
  assert.equal(micVerdict(0.9).level, 'loud');      // -0.9 dBFS
});

test('auto-stop is on unless turned off', () => {
  assert.equal(normalizeRecording({}).autoStop, true);
  assert.equal(normalizeRecording({ autoStop: false }).autoStop, false);
});

test('a link planted at the video name is never written through', async () => {
  const dir = tmpDir();
  const target = path.join(dir, 'victim.txt');
  fs.writeFileSync(target, 'keep me');
  const now = new Date(2026, 8, 28, 9, 5);
  const name = fileNameFor({ scriptName: 'Intro', preset: 'landscape', take: 1, now });
  fs.symlinkSync(target, path.join(dir, name));
  assert.notEqual(path.basename(freePath(dir, name)), name, 'a dangling or live link counts as taken');
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  const { id, file } = files.begin({ scriptName: 'Intro', preset: 'landscape', take: 1 });
  assert.notEqual(file, name);
  await files.chunk(id, new Uint8Array([1]));
  await files.end(id);
  assert.equal(fs.readFileSync(target, 'utf8'), 'keep me');
});

test('a take stops at its size cap and keeps what came before', async () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '', maxTakeBytes: 4 });
  const { id } = files.begin({ scriptName: 'Cap', preset: 'landscape', take: 1 });
  assert.equal((await files.chunk(id, new Uint8Array([1, 2, 3]))).ok, true);
  assert.equal((await files.chunk(id, new Uint8Array([4, 5]))).ok, false);
  const res = await files.end(id);
  assert.deepEqual([...fs.readFileSync(res.path)], [1, 2, 3]);
  assert.match(res.warning, /size limit/);
});

test('a take thrown away on reload keeps its part file and frees the final name', () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  const { file } = files.begin({ scriptName: 'Reload', preset: 'landscape', take: 1 });
  files.abort();
  assert.deepEqual(fs.readdirSync(dir), [file.replace(/\.mp4$/, '.recording.mp4')]);
});

test('subtitles follow the script, one sentence per caption at most, with skipped words placed between', () => {
  const { buildCues, toSrt, HEARD_LAG_MS } = require('../renderer/subtitles');
  const tokens = 'Hello, I am a Flutter developer. I build apps people use every day and I love clean architecture in every project I ship.'.split(' ');
  const times = tokens.map((_, i) => (i === 5 ? undefined : 1000 + i * 350));
  const cues = buildCues(tokens, times, 12000);
  assert.equal(cues.map((c) => c.text).join(' '), tokens.join(' '), 'every word, in order, exactly as written');
  assert.equal(cues[0].text, 'Hello, I am a Flutter developer.');
  assert.equal(cues[0].start, 1000 - HEARD_LAG_MS);
  const { MAX_LINE_CHARS, LINE_SLACK_CHARS } = require('../renderer/subtitles');
  for (const c of cues) {
    assert.ok(c.text.length <= MAX_LINE_CHARS + LINE_SLACK_CHARS * 3, c.text);
    assert.ok(c.text.split(' ').length > 1, 'no word alone: ' + c.text);
    assert.ok(c.end > c.start);
  }
  for (let k = 1; k < cues.length; k++) assert.ok(cues[k].start >= cues[k - 1].end, 'no overlap');
  assert.ok(cues[cues.length - 1].end <= 12000);
  assert.match(toSrt(cues), /^1\n00:00:00,600 --> 00:00:02,700\nHello, I am a Flutter developer\.\n\n2\n/);
});

test('no words heard means no subtitles, and times never run backwards', () => {
  const { buildCues } = require('../renderer/subtitles');
  assert.deepEqual(buildCues(['a', 'b'], [], 5000), []);
  const cues = buildCues(['One', 'two.', 'Three', 'four.'], [3000, 2000, 4000, 4500], 0);
  assert.ok(cues[1].start >= cues[0].start);
});

test('a take keeps its subtitles beside the video, and bad caption text is ignored', async () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  let { id } = files.begin({ scriptName: 'Subs', preset: 'landscape', take: 1 });
  await files.chunk(id, new Uint8Array([1]));
  let res = await files.end(id, { srt: '1\n00:00:00,500 --> 00:00:02,000\nHello there.\n' });
  assert.equal(path.basename(res.srt), path.basename(res.path).replace(/\.mp4$/, '.srt'));
  assert.equal(fs.readFileSync(res.srt, 'utf8'), '1\n00:00:00,500 --> 00:00:02,000\nHello there.\n');
  assert.equal(fs.statSync(res.srt).mode & 0o777, 0o600);
  ({ id } = files.begin({ scriptName: 'Junk', preset: 'landscape', take: 1 }));
  await files.chunk(id, new Uint8Array([1]));
  res = await files.end(id, { srt: 'rm -rf /' });
  assert.equal(res.srt, '');
});

test('the opening words are captioned even when the first word heard came later', () => {
  const { buildCues } = require('../renderer/subtitles');
  const cues = buildCues(['Hello,', 'I', 'am', 'here.'], [undefined, undefined, 2000, 2400], 0);
  assert.equal(cues.map((c) => c.text).join(' '), 'Hello, I am here.');
  assert.ok(cues[0].start < 2000);
});

test('captions spoken fast never overlap, and a long last word does not stand alone', () => {
  const { buildCues } = require('../renderer/subtitles');
  const fast = buildCues(['Hi.', 'I', 'am', 'here.'], [3000, 3100, 3200, 3300], 10000);
  for (let k = 1; k < fast.length; k++) assert.ok(fast[k].start >= fast[k - 1].end, JSON.stringify(fast));
  const words = 'Now we go to the shop for milk today antidisestablishmentarianism.'.split(' ');
  const cues = buildCues(words, words.map((_, i) => 1000 + i * 300), 0);
  assert.ok(cues.every((c) => c.text.split(' ').length > 1), JSON.stringify(cues.map((c) => c.text)));
});

test('words after the last one heard get no caption, and a take cut short drops captions after it', () => {
  const { buildCues } = require('../renderer/subtitles');
  const cues = buildCues(['One', 'two.', 'Three', 'four.'], [1000, 1300], 0);
  assert.equal(cues.map((c) => c.text).join(' '), 'One two.');
  assert.deepEqual(buildCues(['A.', 'B.'], [1000, 9000], 5000).map((c) => c.text), ['A.']);
});

test('oversized or malformed subtitles are refused and said', async () => {
  const dir = tmpDir();
  const files = createRecorderFiles({ folder: () => dir, ffmpeg: '' });
  const { id } = files.begin({ scriptName: 'Big', preset: 'landscape', take: 1 });
  await files.chunk(id, new Uint8Array([1]));
  const res = await files.end(id, { srt: '1\n00:00:00,000 --> 00:00:01,000\n' + 'x'.repeat(1024 * 1024) });
  assert.equal(res.srt, '');
  assert.match(res.subtitleError, /not valid/);
});
