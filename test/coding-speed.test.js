const test = require('node:test');
const assert = require('node:assert/strict');
const { codingSpeedOptions, _test } = require('../src/llm');

test.beforeEach(() => _test.resetFastMode());

test('Fastest uses low effort and fast mode on Opus 5.5', () => {
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'fastest'), { effort: 'low', summarize: true, fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', undefined), { effort: 'low', summarize: true, fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'balanced'), { effort: 'medium', summarize: true, fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'careful'), { effort: 'high', summarize: true });
});

test('only models that support them get effort or fast mode', () => {
  assert.deepEqual(codingSpeedOptions('claude-sonnet-5', 'fastest'), { effort: 'low', summarize: true });   // no fast mode
  assert.equal(codingSpeedOptions('claude-haiku-4-5', 'fastest'), null);                  // neither
  assert.equal(codingSpeedOptions('claude-sonnet-4-5-20250929', 'fastest'), null);
  assert.equal(codingSpeedOptions('gpt-5', 'fastest'), null);
});

// A stand-in for the Anthropic SDK: refuses requests until `refuseUntil`
// requests were made, and records what each request asked for.
const retries = [];
const thinking = [];
function fakeSdk(refusals) {
  const calls = [];
  retries.length = 0;
  thinking.length = 0;
  const path = require.resolve('@anthropic-ai/sdk');
  require.cache[path] = {
    id: path, filename: path, loaded: true,
    exports: class {
      constructor() {
        this.messages = {
          create: async (request, options) => {
            calls.push({ effort: request.output_config && request.output_config.effort, speed: request.speed, beta: options.headers['anthropic-beta'] });
            thinking.push(request.thinking && request.thinking.display);
            retries.push(options.maxRetries);
            const status = refusals[calls.length - 1];
            if (status) throw Object.assign(new Error(typeof status === 'object' ? status.message : 'refused'), { status: typeof status === 'object' ? status.status : status });
            return (async function* () {
              yield { type: 'message_start' };
              yield { type: 'content_block_delta', delta: { type: 'thinking_delta', thinking: 'Planning.' } };
              yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
            })();
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

test('an overload before the first word moves to the next stage', async () => {
  const calls = fakeSdk([529]);
  assert.equal(await solve({ effort: 'low', fast: true }), 'ok');
  assert.equal(calls.length, 2);
  fakeSdk([529, 529]);
  assert.equal(await solve({ effort: 'low', fast: true }), 'ok');
  assert.deepEqual(retries, [0, 0, undefined]);
});

test('a failure on the last stage is the real error', async () => {
  const calls = fakeSdk([500]);
  await assert.rejects(solve(null), /refused/);
  assert.equal(calls.length, 1);
  fakeSdk([500, 500, 500]);
  await assert.rejects(solve({ effort: 'low', fast: true }), /refused/);
});

test('stages with a fallback skip SDK retries; the last stage keeps them', async () => {
  fakeSdk([429, 429]);
  await solve({ effort: 'low', fast: true });
  assert.deepEqual(retries, [0, 0, undefined]);
});

test('a fast mode refusal turns fast mode off for the session', async () => {
  fakeSdk([429]);
  await solve({ effort: 'low', summarize: true, fast: true });
  assert.deepEqual(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k'), { effort: 'low', summarize: true });
  // Another key (a new one in Settings) still gets fast mode.
  assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'other').fast, true);
});

test('an overload does not turn fast mode off', async () => {
  fakeSdk([529]);
  await solve({ effort: 'low', summarize: true, fast: true });
  assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k').fast, true);
});

test('summarized thinking is kept when fast mode drops, and the plain request has none', async () => {
  fakeSdk([429, 400]);
  await solve({ effort: 'low', summarize: true, fast: true });
  assert.deepEqual(thinking, ['summarized', 'summarized', undefined]);
});

test('every stream event counts as activity and thinking text is passed on', async () => {
  fakeSdk([]);
  const { streamAnthropic } = require('../src/llm');
  let activity = 0;
  const thoughts = [];
  const text = await streamAnthropic({ apiKey: 'k', model: 'claude-opus-5-5', system: 's', turns: [{ role: 'user', text: 'q' }], maxTokens: 10,
    onToken: () => {}, onActivity: () => { activity++; }, onThinking: (t) => thoughts.push(t), speedOptions: { effort: 'low', summarize: true } });
  assert.equal(text, 'ok');
  assert.equal(activity, 3);
  assert.deepEqual(thoughts, ['Planning.']);
});

test('a 429 pauses fast mode for a while; a 403 turns it off', async () => {
  const realNow = Date.now;
  try {
    fakeSdk([429]);
    await solve({ effort: 'low', summarize: true, fast: true });
    assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k').fast, undefined);
    Date.now = () => realNow() + 11 * 60 * 1000;
    assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k').fast, true);
    Date.now = realNow;
    fakeSdk([403]);
    await solve({ effort: 'low', summarize: true, fast: true });
    Date.now = () => realNow() + 24 * 60 * 60 * 1000;
    assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k').fast, undefined);
  } finally {
    Date.now = realNow;
  }
});

test('the thinking summary is only asked of models that take adaptive thinking', () => {
  assert.deepEqual(codingSpeedOptions('claude-opus-4-5', 'fastest'), { effort: 'low' });
});

test('a 429 saying the fast mode limit is 0 turns fast mode off like a 403', async () => {
  const realNow = Date.now;
  try {
    fakeSdk([{ status: 429, message: "429 This request would exceed your organization's rate limit of 0 fast mode input tokens per minute" }]);
    await solve({ effort: 'low', summarize: true, fast: true });
    Date.now = () => realNow() + 24 * 60 * 60 * 1000;
    assert.equal(codingSpeedOptions('claude-opus-5-5', 'fastest', 'k').fast, undefined);
  } finally {
    Date.now = realNow;
  }
});

test('spoken and screen answers skip the silent thinking on models that take effort', () => {
  const { answerSpeedOptions } = require('../src/llm');
  assert.deepEqual(answerSpeedOptions('claude-sonnet-5-5'), { effort: 'low' });
  assert.deepEqual(answerSpeedOptions('claude-opus-5-5'), { effort: 'low' });
  assert.deepEqual(answerSpeedOptions('claude-haiku-5-5'), { effort: 'low' }, 'Haiku 5.5 thinks by default and takes effort');
  assert.equal(answerSpeedOptions('claude-haiku-4-5-20251001'), null, 'Haiku 4.5 takes no effort field');
  assert.equal(answerSpeedOptions(''), null);
});
