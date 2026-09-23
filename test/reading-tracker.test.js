const test = require('node:test');
const assert = require('node:assert');
const { tokenize, locate } = require('../renderer/reading-tracker');

const ANSWER = [
  'At my last company I led the migration of our payments service from a monolith to event driven microservices.',
  'The hardest part was keeping the ledger consistent, so we introduced an outbox table and idempotent consumers.',
  'Latency dropped by forty percent and on-call pages fell from twelve a week to two.',
  'Looking back, I would invest in contract testing earlier because most incidents came from schema drift.'
].map(tokenize);

test('tokenize drops stopwords and punctuation, keeps content words', () => {
  assert.deepStrictEqual(tokenize('The ledger, it was consistent!'), ['ledger', 'consistent']);
  assert.deepStrictEqual(tokenize(''), []);
  assert.deepStrictEqual(tokenize(null), []);
});

test('tokenize matches simple word forms', () => {
  assert.deepStrictEqual(tokenize('consumers'), tokenize('consumer'));
  assert.deepStrictEqual(tokenize('testing'), tokenize('tested'));
  assert.deepStrictEqual(tokenize('processes'), tokenize('process'));
  assert.deepStrictEqual(tokenize('classes'), tokenize('class'));
});

test('reading a paragraph word for word finds it', () => {
  const spoken = tokenize('the hardest part was keeping the ledger consistent');
  assert.strictEqual(locate(ANSWER, spoken, -1).index, 1);
});

test('a loose summary of a paragraph still finds it', () => {
  const spoken = tokenize('so latency went down about forty percent and pages dropped a lot');
  assert.strictEqual(locate(ANSWER, spoken, 0).index, 2);
});

test('progress grows as the reader moves through a paragraph', () => {
  const start = locate(ANSWER, tokenize('looking back I would invest'), 2);
  const end = locate(ANSWER, tokenize('looking back I would invest in contract testing earlier because most incidents came from schema drift'), 2);
  assert.strictEqual(start.index, 3);
  assert.strictEqual(end.index, 3);
  assert.ok(start.progress < 0.4, `start progress ${start.progress}`);
  assert.ok(end.progress > 0.9, `end progress ${end.progress}`);
});

test('unrelated speech or too few words does not move', () => {
  assert.strictEqual(locate(ANSWER, tokenize('sorry could you repeat the question'), 1), null);
  assert.strictEqual(locate(ANSWER, tokenize('ledger'), 0), null);
  assert.strictEqual(locate([], tokenize('ledger consistent outbox'), -1), null);
});

test('leftover words from the previous paragraph do not pull the view back', () => {
  // Just moved to paragraph 2; the window still ends with paragraph 1 words.
  const spoken = tokenize('outbox table and idempotent consumers latency dropped by forty percent');
  assert.strictEqual(locate(ANSWER, spoken, 2).index, 2);
});

test('clearly re-reading an earlier paragraph does go back', () => {
  const spoken = tokenize('I led the migration of our payments service from a monolith to event driven microservices');
  assert.strictEqual(locate(ANSWER, spoken, 3).index, 0);
});

test('a word shared by two paragraphs resolves by word order', () => {
  const blocks = [
    'We cached the results in Redis to cut database load.',
    'Later we moved the cache to the edge, which cut database load again.'
  ].map(tokenize);
  const spoken = tokenize('moved the cache to the edge');
  assert.strictEqual(locate(blocks, spoken, 0).index, 1);
});

test('a nearer paragraph wins a close call over a far one', () => {
  const blocks = [
    'Intro about the team.',
    'We tuned the query planner and added indexes.',
    'Unrelated middle paragraph on hiring.',
    'Another unrelated paragraph on budgets.',
    'Finally we tuned the query planner and added indexes again.'
  ].map(tokenize);
  assert.strictEqual(locate(blocks, tokenize('tuned the query planner and added indexes'), 0).index, 1);
});

test('a one-word paragraph counts as fully read', () => {
  const blocks = [tokenize('Kubernetes'), tokenize('Kubernetes clusters scale pods')];
  const found = locate(blocks, tokenize('kubernetes clusters scale pods'), -1);
  assert.strictEqual(found.index, 1);
  assert.ok(found.progress > 0.9);
});
