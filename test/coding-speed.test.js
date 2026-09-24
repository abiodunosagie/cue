const test = require('node:test');
const assert = require('node:assert/strict');
const { codingSpeedOptions } = require('../src/llm');

test('Fastest uses low effort and fast mode on Opus 5.5', () => {
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'fastest'), { effort: 'low', fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', undefined), { effort: 'low', fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'balanced'), { effort: 'medium', fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'careful'), { effort: 'high' });
});

test('only models that support them get effort or fast mode', () => {
  assert.deepEqual(codingSpeedOptions('claude-sonnet-5', 'fastest'), { effort: 'low' });   // no fast mode
  assert.equal(codingSpeedOptions('claude-haiku-4-5', 'fastest'), null);                  // neither
  assert.equal(codingSpeedOptions('claude-sonnet-4-5-20250929', 'fastest'), null);
  assert.equal(codingSpeedOptions('gpt-5', 'fastest'), null);
});

// A stand-in for the Anthropic SDK: refuses requests until `refuseUntil`
// requests were made, and records what each request asked for.
const retries = [];
function fakeSdk(refusals) {
  const calls = [];
  retries.length = 0;
  const path = require.resolve('@anthropic-ai/sdk');
  require.cache[path] = {
    id: path, filename: path, loaded: true,
    exports: class {
      constructor() {
        this.messages = {
          create: async (request, options) => {
            calls.push({ effort: request.output_config && request.output_config.effort, speed: request.speed, beta: options.headers['anthropic-beta'] });
            retries.push(options.maxRetries);
            const status = refusals[calls.length - 1];
            if (status) throw Object.assign(new Error('refused'), { status });
            return (async function* () { yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } }; })();
          }
        };
      }
    }
  };
  return calls;
}

function solve(speedOptions) {
  const { streamAnthropic } = require('../src/llm');
  return streamAnthropic({ apiKey: 'k', model: 'claude-opus-5-5', system: 's', turns: [{ role: 'user', text: 'q' }], maxTokens: 10, onToken: () => {}, speedOptions });
}

test('a refused fast mode keeps low effort before falling back to plain', async () => {
  const calls = fakeSdk([400]);
  assert.equal(await solve({ effort: 'low', fast: true }), 'ok');
  assert.deepEqual(calls, [
    { effort: 'low', speed: 'fast', beta: 'fast-mode-2026-02-01' },
    { effort: 'low', speed: undefined, beta: undefined }
  ]);
});

test('when effort is refused too, the plain request runs', async () => {
  const calls = fakeSdk([429, 400]);
  assert.equal(await solve({ effort: 'low', fast: true }), 'ok');
  assert.equal(calls.length, 3);
  assert.deepEqual(calls[2], { effort: undefined, speed: undefined, beta: undefined });
});

test('an error that is not a refusal is not retried', async () => {
  const calls = fakeSdk([500]);
  await assert.rejects(solve({ effort: 'low', fast: true }), /refused/);
  assert.equal(calls.length, 1);
});

test('stages with a fallback skip SDK retries; the last stage keeps them', async () => {
  fakeSdk([429, 429]);
  await solve({ effort: 'low', fast: true });
  assert.deepEqual(retries, [0, 0, undefined]);
});
