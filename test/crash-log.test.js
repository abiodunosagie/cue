const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createCrashLog, redact } = require('../src/crash-log');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-crash-')), 'cue-crash.log');

test('redact masks provider keys, bearer tokens, long secrets and the saved keys', () => {
  const out = redact('key sk-ant-api03-abcdefgh12345678 and Bearer abc.def.ghi123456 and ' + 'x'.repeat(40) + ' and mykey-123456789', ['mykey-123456789']);
  assert.doesNotMatch(out, /sk-ant/);
  assert.doesNotMatch(out, /abc\.def/);
  assert.doesNotMatch(out, /x{40}/);
  assert.doesNotMatch(out, /mykey-123456789/);
  assert.match(out, /\[hidden\]/);
});

test('writes one private line per event with the stack', () => {
  const file = tmpFile();
  const log = createCrashLog({ file, now: () => new Date('2026-10-10T12:00:00Z') });
  log.write('main', new Error('boom'));
  log.write('renderer', 'TypeError: x is undefined\n    at a.js:1');
  const lines = fs.readFileSync(file, 'utf8').trim().split('\n');
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^2026-10-10T12:00:00.000Z \[main\] Error: boom/);
  assert.match(lines[1], /\[renderer\] TypeError: x is undefined \\n {5}at a\.js:1/);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('rotates past the size cap and keeps one old file', () => {
  const file = tmpFile();
  const log = createCrashLog({ file, maxBytes: 200 });
  for (let i = 0; i < 10; i++) log.write('main', new Error('entry ' + i));
  assert.ok(fs.existsSync(file + '.1'));
  assert.ok(fs.statSync(file).size < 600);
});

test('never throws, even when the folder is gone', () => {
  const log = createCrashLog({ file: '/nonexistent-dir-cue/cue-crash.log' });
  assert.doesNotThrow(() => log.write('main', new Error('x')));
});

test('caps an entry and keeps saved keys out', () => {
  const file = tmpFile();
  const log = createCrashLog({ file, secrets: () => ['dg-secret-key-1'] });
  log.write('renderer', 'leak dg-secret-key-1 ' + 'y'.repeat(10000));
  const text = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(text, /dg-secret-key-1/);
  assert.ok(text.length < 4200);
});

test('rotation replaces an older rotated file', () => {
  const file = tmpFile();
  fs.writeFileSync(file + '.1', 'old');
  fs.writeFileSync(file, 'x'.repeat(300));
  createCrashLog({ file, maxBytes: 200 }).write('main', new Error('new'));
  assert.equal(fs.readFileSync(file + '.1', 'utf8'), 'x'.repeat(300));
  assert.match(fs.readFileSync(file, 'utf8'), /new/);
});

test('an error loop is capped per minute', () => {
  const file = tmpFile();
  let t = 0;
  const log = createCrashLog({ file, now: () => new Date(t) });
  for (let i = 0; i < 50; i++) log.write('renderer', 'loop ' + i);
  assert.equal(fs.readFileSync(file, 'utf8').trim().split('\n').length, 20);
  t = 61000;
  log.write('renderer', 'later');
  assert.match(fs.readFileSync(file, 'utf8'), /later/);
});

test('the same error twice in a row is written once', () => {
  const file = tmpFile();
  const log = createCrashLog({ file });
  log.write('renderer', 'same');
  log.write('renderer', 'same');
  log.write('renderer', 'other');
  assert.equal(fs.readFileSync(file, 'utf8').trim().split('\n').length, 2);
});
