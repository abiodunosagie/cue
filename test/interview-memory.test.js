const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createInterviewMemory, MAX_TURNS, STALE_MS } = require('../src/interview-memory');
const { turnsSentByBuild } = require('../src/prompts');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-memory-')), 'cue-interview.json');
}

test('turns and answers survive a restart', () => {
  const file = tempFile();
  const a = createInterviewMemory({ file, debounceMs: 0 });
  a.load();
  a.addTurn({ channel: 'them', text: 'Tell me about yourself.', ts: 1 });
  a.addAnswer({ mode: 'answerThis', text: 'I build mobile apps.' });
  const b = createInterviewMemory({ file, debounceMs: 0 });
  b.load();
  assert.deepEqual(b.turns().map((t) => t.text), ['Tell me about yourself.']);
  assert.equal(b.summary().answerCount, 1);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('clear deletes the file and empties memory', () => {
  const file = tempFile();
  const m = createInterviewMemory({ file, debounceMs: 0 });
  m.load();
  m.addTurn({ channel: 'them', text: 'Q' });
  m.clear();
  assert.equal(fs.existsSync(file), false);
  assert.equal(m.summary().turnCount, 0);
  assert.equal(m.digest(), '');
});

test('a record older than the stale window starts a fresh interview', () => {
  const file = tempFile();
  let now = 1000;
  const m = createInterviewMemory({ file, now: () => now, debounceMs: 0 });
  m.load();
  m.addTurn({ channel: 'them', text: 'old question' });
  now += STALE_MS + 1;
  const later = createInterviewMemory({ file, now: () => now, debounceMs: 0 });
  later.load();
  assert.equal(later.summary().turnCount, 0);
  assert.equal(fs.existsSync(file), false);
});

test('a corrupt file is ignored, not fatal', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{not json');
  const m = createInterviewMemory({ file, debounceMs: 0 });
  assert.equal(m.load().turns.length, 0);
});

test('turns are capped', () => {
  const m = createInterviewMemory({});
  for (let i = 0; i < MAX_TURNS + 25; i++) m.addTurn({ channel: 'you', text: 't' + i });
  assert.equal(m.summary().turnCount, MAX_TURNS);
  assert.equal(m.turns()[0].text, 't25');
});

test('digest lists interviewer questions, keeps the newest within budget, and carries the last spoken answer', () => {
  const m = createInterviewMemory({});
  for (let i = 0; i < 50; i++) m.addTurn({ channel: 'them', text: 'Question number ' + i + ' ' + 'x'.repeat(80) });
  m.addTurn({ channel: 'you', text: 'my own words' });
  m.addAnswer({ mode: 'answerThis', text: 'Spoken answer.' });
  m.addAnswer({ mode: 'leetcode', text: 'code answer' });
  m.addAnswer({ mode: 'recap', text: 'recap answer' });
  m.addAnswer({ mode: 'followup', text: 'followup answer' });
  m.addAnswer({ mode: 'ask', text: 'ask answer' });
  const d = m.digest({ maxChars: 1000 });
  assert.ok(d.length < 1600);
  assert.match(d, /Question number 49/);
  assert.doesNotMatch(d, /Question number 0 /);
  assert.match(d, /latest \d+ of 50/);
  assert.doesNotMatch(d, /my own words/);
  assert.match(d, /Spoken answer\./);
  assert.doesNotMatch(d, /code answer/);
  assert.doesNotMatch(d, /recap answer|followup answer|ask answer/);
});

test('codingHistory returns the last coding solves, bounded', () => {
  const m = createInterviewMemory({});
  m.addAnswer({ mode: 'leetcode', text: 'first' });
  m.addAnswer({ mode: 'say', text: 'spoken' });
  m.addAnswer({ mode: 'leetcode', text: 'second' });
  m.addAnswer({ mode: 'leetcode', text: 'y'.repeat(5000) });
  const h = m.codingHistory();
  assert.equal(h.length, 2);
  assert.equal(h[0], 'second');
  assert.equal(h[1].length, 2000);
});

test('empty answers are not stored', () => {
  const m = createInterviewMemory({});
  m.addAnswer({ mode: 'say', text: '   ' });
  assert.equal(m.summary().answerCount, 0);
});

test('an answer that started before Clear is dropped and does not recreate the file', () => {
  const file = tempFile();
  const m = createInterviewMemory({ file, debounceMs: 0 });
  m.load();
  m.addTurn({ channel: 'them', text: 'Old question' });
  const startedIn = m.generation();
  assert.deepEqual(m.clear(), { ok: true });
  m.addAnswer({ mode: 'answerThis', text: 'Old answer', generation: startedIn });
  assert.equal(m.summary().answerCount, 0);
  assert.equal(fs.existsSync(file), false);
  m.addAnswer({ mode: 'answerThis', text: 'New answer', generation: m.generation() });
  assert.equal(m.summary().answerCount, 1);
});

test('writes are batched, flushed on demand, and Clear cancels a pending write', async () => {
  const file = tempFile();
  const m = createInterviewMemory({ file, debounceMs: 30 });
  m.load();
  m.addTurn({ channel: 'them', text: 'one' });
  m.addTurn({ channel: 'you', text: 'two' });
  assert.equal(fs.existsSync(file), false);
  m.flush();
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).turns.length, 2);
  m.addTurn({ channel: 'them', text: 'three' });
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).turns.length, 3);
  m.addTurn({ channel: 'them', text: 'four' });
  m.clear();
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(fs.existsSync(file), false);
});

test('every write is atomic and resets the file to 0600', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{}', { mode: 0o644 });
  fs.chmodSync(file, 0o644);
  fs.writeFileSync(file + '.tmp', 'stale', { mode: 0o644 });
  fs.chmodSync(file + '.tmp', 0o644);
  const m = createInterviewMemory({ file, debounceMs: 0 });
  m.addTurn({ channel: 'them', text: 'Q' });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(fs.existsSync(file + '.tmp'), false);
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).turns[0].text, 'Q');
});

test('clear reports failure when the file cannot be deleted, and still forgets the interview', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-memory-'));
  const file = path.join(dir, 'cue-interview.json');
  const m = createInterviewMemory({ file, debounceMs: 0 });
  m.addTurn({ channel: 'them', text: 'Q' });
  fs.chmodSync(dir, 0o500); // no unlink inside a read-only directory
  try {
    assert.deepEqual(m.clear(), { ok: false });
    assert.equal(m.summary().turnCount, 0);
    assert.equal(m.digest(), '');
  } finally {
    fs.chmodSync(dir, 0o700);
  }
  assert.deepEqual(createInterviewMemory({ file: path.join(dir, 'missing.json') }).clear(), { ok: true });
});

test('digest skips the turns the mode build() already sends', () => {
  const m = createInterviewMemory({});
  const transcript = [];
  for (let i = 0; i < 30; i++) {
    const turn = { channel: i % 2 ? 'you' : 'them', text: 'turn ' + i + ' end' };
    m.addTurn(turn);
    transcript.push(turn);
  }
  // assist sends the last 14 turns (16..29): only questions 0..14 belong in the digest.
  const d = m.digest({ skipRecent: turnsSentByBuild('assist', { transcript }) });
  assert.match(d, /turn 14 end/);
  assert.doesNotMatch(d, /turn 16 end/);
  // answerThis drops the heard question (turn 28) plus 8 more before it.
  assert.equal(turnsSentByBuild('answerThis', { transcript: transcript.concat([{ channel: 'them', text: 'why flutter' }]), userText: 'why flutter' }), 9);
  assert.equal(turnsSentByBuild('recap', { transcript }), 30);
  assert.equal(turnsSentByBuild('leetcode', { transcript }), 0);
  assert.equal(turnsSentByBuild('say', { transcript: transcript.slice(0, 3) }), 3);
});

test('a failed write stays pending and the flush on quit retries it', () => {
  const file = tempFile();
  const m = createInterviewMemory({ file, debounceMs: 0 });
  const realWrite = fs.writeFileSync;
  fs.writeFileSync = () => { const e = new Error('disk full'); e.code = 'ENOSPC'; throw e; };
  try { m.addTurn({ channel: 'them', text: 'Q' }); } finally { fs.writeFileSync = realWrite; }
  assert.equal(fs.existsSync(file), false);
  m.flush();
  assert.equal(JSON.parse(fs.readFileSync(file, 'utf8')).turns[0].text, 'Q');
});

test('clear reports failure when a leftover temp file cannot be deleted', () => {
  const file = tempFile();
  const m = createInterviewMemory({ file, debounceMs: 0 });
  m.addTurn({ channel: 'them', text: 'Q' });
  fs.mkdirSync(file + '.tmp'); // unlinkSync on a directory fails with EPERM/EISDIR, not ENOENT
  assert.deepEqual(m.clear(), { ok: false });
  assert.equal(fs.existsSync(file), false, 'the interview itself is still deleted');
  fs.rmdirSync(file + '.tmp');
});

test('a record without a valid start time is ignored', () => {
  const file = tempFile();
  fs.writeFileSync(file, JSON.stringify({ updatedAt: Date.now(), turns: [{ channel: 'them', text: 'Q' }], answers: [] }));
  const m = createInterviewMemory({ file, debounceMs: 0 });
  assert.equal(m.load().turns.length, 0);
});
