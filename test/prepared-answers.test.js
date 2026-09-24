const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createPreparedStore, profileHash, canPrepare, parseItems, findMatch, confirmSameQuestion } = require('../src/prepared-answers');

const items = [
  { question: 'Tell me about yourself.', variants: ['Walk me through your background.', 'Introduce yourself.', 'Can you give me a quick overview of your experience?'], answer: 'INTRO' },
  { question: 'How do you manage state in a large Flutter app?', variants: ['What state management do you use in Flutter?', 'How do you structure state in big Flutter projects?'], answer: 'STATE' },
  { question: 'How do you handle offline sync in a mobile app?', variants: ['How would you make a mobile app work offline and sync later?'], answer: 'OFFLINE' },
  { question: 'What is your biggest weakness?', variants: ['What would you say you need to improve on?'], answer: 'WEAKNESS' }
];

test('near-identical questions match directly; synonyms count as the same word', () => {
  const m = findMatch(items, 'So, walk me through your background');
  assert.equal(m.item.answer, 'INTRO'); assert.equal(m.direct, true);
  const app = findMatch(items, 'How do you manage state in large Flutter applications?');
  assert.equal(app.item.answer, 'STATE'); assert.equal(app.direct, true);
});

test('close paraphrases and near-misses are only candidates, left to the Fast model', () => {
  const para = findMatch(items, 'What state management approach do you use in Flutter?');
  assert.equal(para.item.answer, 'STATE'); assert.equal(para.direct, false);
  const miss = findMatch(items, 'How do you test state management in Flutter?');
  assert.equal(miss.direct, false);
});

test('unrelated questions are not even candidates', () => {
  assert.equal(findMatch(items, 'Tell me about a time you failed.'), null);
  assert.equal(findMatch(items, 'What is your biggest strength?'), null);
  assert.equal(findMatch(items, 'Why Flutter?'), null);
  assert.equal(findMatch(items, ''), null);
});

const replying = (text, delay = 0) => ({ stream: async ({ onToken, maxTokens }) => { assert.equal(maxTokens, 5); await new Promise((r) => setTimeout(r, delay)); onToken(text); return text; } });

test('the Fast model confirms a candidate only on YES; NO, errors and slowness fall back', async () => {
  assert.equal(await confirmSameQuestion({ llm: replying('YES'), heard: 'a', prepared: 'b' }), true);
  assert.equal(await confirmSameQuestion({ llm: replying(' yes.'), heard: 'a', prepared: 'b' }), true);
  assert.equal(await confirmSameQuestion({ llm: replying('NO'), heard: 'a', prepared: 'b' }), false);
  assert.equal(await confirmSameQuestion({ llm: replying('YES', 60), heard: 'a', prepared: 'b', timeoutMs: 20 }), false);
  assert.equal(await confirmSameQuestion({ llm: { stream: async () => { throw new Error('down'); } }, heard: 'a', prepared: 'b' }), false);
});

test('the model reply is parsed defensively', () => {
  const reply = 'Here you go:\n```json\n[{"question":"Q1","variants":["a",""],"answer":"A1"},{"question":"","answer":"x"},{"question":"Q2"},{"question":"Q3","answer":"A3"}]\n```';
  assert.deepEqual(parseItems(reply), [{ question: 'Q1', variants: ['a'], answer: 'A1' }, { question: 'Q3', variants: [], answer: 'A3' }]);
  assert.deepEqual(parseItems('not json'), []);
  assert.deepEqual(parseItems('[{"question": }]'), []);
});

test('the profile hash changes with any profile field, and preparing needs a resume and a job description', () => {
  const base = { resumeText: 'cv', jobDescription: 'jd', starStories: 's' };
  assert.equal(profileHash(base), profileHash({ ...base }));
  assert.notEqual(profileHash(base), profileHash({ ...base, starStories: 's2' }));
  assert.notEqual(profileHash(base), profileHash({ ...base, aiRules: 'short' }));
  assert.equal(canPrepare(base), true);
  assert.equal(canPrepare({ resumeText: 'cv' }), false);
});

test('the bank survives a restart, is 0600, and is only current for the profile it was made from', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-prep-')), 'cue-prepared.json');
  const a = createPreparedStore({ file });
  assert.equal(a.replace('h1', items, 5), true);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const b = createPreparedStore({ file });
  b.load();
  assert.equal(b.summary().count, 4);
  assert.equal(b.isCurrent('h1'), true);
  assert.equal(b.isCurrent('h2'), false);
  assert.equal(b.match('introduce yourself').item.answer, 'INTRO');
  assert.equal(b.match('introduce yourself').direct, true);
  assert.equal(b.clear(), true);
  assert.equal(fs.existsSync(file), false);
  assert.equal(b.isCurrent('h1'), false);
});
