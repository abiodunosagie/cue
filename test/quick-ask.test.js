const test = require('node:test');
const assert = require('node:assert/strict');
const { quickAsk } = require('../src/quick-ask');

test('quick ask returns the whole reply and passes the request through', async () => {
  let args = null;
  const llm = { stream: async (a) => { args = a; return 'QUESTION: why flutter?'; } };
  assert.equal(await quickAsk({ llm, system: 'S', text: 'T', imageDataUrl: 'data:x', maxTokens: 9, timeoutMs: 100 }), 'QUESTION: why flutter?');
  assert.equal(args.system, 'S'); assert.equal(args.turns[0].text, 'T'); assert.equal(args.imageDataUrl, 'data:x'); assert.equal(args.maxTokens, 9);
});

test('a stalled call rejects after the timeout instead of hanging', async () => {
  const llm = { stream: () => new Promise(() => {}) };
  await assert.rejects(quickAsk({ llm, system: '', text: '', maxTokens: 1, timeoutMs: 20 }), /took too long/);
});
