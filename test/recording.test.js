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
  assert.deepEqual(normalizeRecording(null), { cameraId: '', micId: '', on: false, preset: 'landscape' });
  assert.deepEqual(normalizeRecording({ cameraId: 'c', micId: 7, on: 'yes', preset: 'nope' }), { cameraId: 'c', micId: '', on: false, preset: 'landscape' });
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
  assert.equal(files.chunk(id, new Uint8Array([1, 2, 3])).ok, true);
  assert.equal(files.chunk('other', new Uint8Array([9])).ok, false);
  files.chunk(id, new Uint8Array([4]));
  const res = await files.end(id);
  assert.equal(res.remuxed, false);
  assert.deepEqual([...fs.readFileSync(res.path)], [1, 2, 3, 4]);
  assert.equal(path.basename(res.path), file);
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
