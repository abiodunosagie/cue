const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createInterviewMemory, MAX_TURNS, STALE_MS } = require('../src/interview-memory');

function tempFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-memory-')), 'cue-interview.json');
}

test('turns and answers survive a restart', () => {
  const file = tempFile();
  const a = createInterviewMemory({ file });
  a.load();
  a.addTurn({ channel: 'them', text: 'Tell me about yourself.', ts: 1 });
  a.addAnswer({ mode: 'answerThis', text: 'I build mobile apps.' });
  const b = createInterviewMemory({ file });
  b.load();
  assert.deepEqual(b.turns().map((t) => t.text), ['Tell me about yourself.']);
  assert.equal(b.summary().answerCount, 1);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
});

test('clear deletes the file and empties memory', () => {
  const file = tempFile();
  const m = createInterviewMemory({ file });
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
  const m = createInterviewMemory({ file, now: () => now });
  m.load();
  m.addTurn({ channel: 'them', text: 'old question' });
  now += STALE_MS + 1;
  const later = createInterviewMemory({ file, now: () => now });
  later.load();
  assert.equal(later.summary().turnCount, 0);
  assert.equal(fs.existsSync(file), false);
});

test('a corrupt file is ignored, not fatal', () => {
  const file = tempFile();
  fs.writeFileSync(file, '{not json');
  const m = createInterviewMemory({ file });
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
  const d = m.digest({ maxChars: 1000 });
  assert.ok(d.length < 1600);
  assert.match(d, /Question number 49/);
  assert.doesNotMatch(d, /Question number 0 /);
  assert.match(d, /latest \d+ of 50/);
  assert.doesNotMatch(d, /my own words/);
  assert.match(d, /Spoken answer\./);
  assert.doesNotMatch(d, /code answer/);
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
