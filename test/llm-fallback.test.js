const assert = require('node:assert/strict');
const test = require('node:test');
const { createLLM, createFallbackLLM, isTransientError } = require('../src/llm');

const anthropic = (models, extra = {}) => ({
  provider: 'anthropic',
  apiKeys: { anthropic: 'sk-ant-test' },
  models: { anthropic: models },
  smart: true,
  ...extra
});

test('transient errors: overload, server errors, rate limits, timeouts and dropped connections', () => {
  for (const status of [408, 429, 500, 502, 503, 504, 529]) assert.equal(isTransientError({ status }), true, String(status));
  assert.equal(isTransientError({ error: { type: 'overloaded_error' } }), true);
  assert.equal(isTransientError({ error: { error: { type: 'overloaded_error' } } }), true);
  assert.equal(isTransientError(new Error('fetch failed')), true);
  assert.equal(isTransientError(Object.assign(new Error('x'), { name: 'APIConnectionTimeoutError' })), true);
  assert.equal(isTransientError(new Error('the model stopped responding (timed out). Please try again.')), true);
});

test('not transient: bad key, bad request, missing model, nothing at all', () => {
  for (const status of [400, 401, 403, 404]) assert.equal(isTransientError({ status, message: 'overloaded' }), false, String(status));
  assert.equal(isTransientError(new Error('The model declined to answer this request.')), false);
  assert.equal(isTransientError(null), false);
});

test('Smart falls back to the Fast model', () => {
  const settings = anthropic({ fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5', coding: 'claude-sonnet-5-5' });
  const primary = createLLM(settings);
  const backup = createFallbackLLM(settings, {}, primary);
  assert.equal(primary.model, 'claude-sonnet-5-5');
  assert.equal(backup.model, 'claude-haiku-5-5');
});

test('Coding falls back to the Smart model and keeps the coding budget', () => {
  const settings = anthropic({ fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5', coding: 'claude-opus-5-5' });
  const primary = createLLM(settings, { tier: 'coding' });
  const backup = createFallbackLLM(settings, { tier: 'coding' }, primary);
  assert.equal(backup.model, 'claude-sonnet-5-5');
  // Same coding tier: the long token budget and the coding speed options.
  const fastTier = createLLM(settings, { tier: 'fast' });
  assert.notEqual(backup.model, fastTier.model);
});

test('no fallback below Fast, or when the backup is the same model', () => {
  const same = anthropic({ fast: 'claude-sonnet-5-5', smart: 'claude-sonnet-5-5', coding: 'claude-sonnet-5-5' });
  assert.equal(createFallbackLLM(same, {}, createLLM(same)), null);
  assert.equal(createFallbackLLM(same, { tier: 'coding' }, createLLM(same, { tier: 'coding' })), null);
  const split = anthropic({ fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5' }, { smart: false });
  assert.equal(createFallbackLLM(split, {}, createLLM(split)), null);
  assert.equal(createFallbackLLM(split, { tier: 'fast' }, createLLM(split, { tier: 'fast' })), null);
});

test('no fallback when the backup is not set up', () => {
  const settings = anthropic({ fast: 'claude-haiku-5-5', smart: 'claude-sonnet-5-5' }, { apiKeys: {} });
  assert.equal(createFallbackLLM(settings, {}, createLLM(settings)), null);
});
