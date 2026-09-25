// Teleprompter scripts: what is stored, and the "Check it" review.
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeScripts, readingTime, MAX_SCRIPTS, MAX_SCRIPT_CHARS } = require('../src/scripts');
const { parseReview, reviewPrompt, reviewScript } = require('../src/script-review');

test('stored scripts are cleaned: bad entries, duplicate ids and oversize text are dropped or cut', () => {
  const out = normalizeScripts([
    { id: 'a', title: '  Upwork intro ', text: 'Hi', updatedAt: 5 },
    { id: 'a', title: 'dup', text: 'x' },
    null, 'text', { title: 'no id' },
    { id: 'b', title: '', text: 'y'.repeat(MAX_SCRIPT_CHARS + 50) }
  ]);
  assert.deepEqual(out.map((s) => [s.id, s.title, s.text.length, s.updatedAt]), [['a', 'Upwork intro', 2, 5], ['b', 'Untitled script', MAX_SCRIPT_CHARS, 0]]);
  assert.equal(normalizeScripts(Array.from({ length: 30 }, (_, i) => ({ id: 's' + i, text: 't' }))).length, MAX_SCRIPTS);
  assert.deepEqual(normalizeScripts('nope'), []);
});

test('reading time at a calm pace', () => {
  assert.deepEqual(readingTime('one two three'), { words: 3, seconds: 1 });
  assert.equal(readingTime('word '.repeat(140)).seconds, 60);
});

test('a review reply is parsed; em dashes become commas; broken replies fail with a plain message', () => {
  const r = parseReview('Here: {"verdict":"Good start — a bit long.","suggestions":[{"what":"Cut the second line","why":"It repeats"},{"what":""}],"revised":"Hi — I am Ada."}');
  assert.deepEqual(r, { verdict: 'Good start, a bit long.', suggestions: [{ what: 'Cut the second line', why: 'It repeats' }], revised: 'Hi, I am Ada.' });
  assert.throws(() => parseReview('no json'), /did not return a review/);
  assert.throws(() => parseReview('{"verdict":"x"}'), /did not return a review/);
});

test('the script and background go to the model as tagged data', async () => {
  assert.match(reviewPrompt('Hi there', 'Flutter dev'), /<background>\nFlutter dev\n<\/background>[\s\S]*<script>\nHi there\n<\/script>/);
  let asked = null;
  const reply = '{"verdict":"ok","suggestions":[],"revised":"Hi there."}';
  const res = await reviewScript({ script: 'Hi there', background: '', llm: { ready: true }, quickAsk: async (a) => { asked = a; return reply; } });
  assert.equal(res.revised, 'Hi there.');
  assert.match(asked.system, /Never invent/);
  await assert.rejects(reviewScript({ script: '  ', llm: { ready: true }, quickAsk: async () => reply }), /Write or paste/);
  await assert.rejects(reviewScript({ script: 'Hi', llm: { ready: false }, quickAsk: async () => reply }), /Smart model/);
});
