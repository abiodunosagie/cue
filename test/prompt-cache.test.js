const test = require('node:test');
const assert = require('node:assert/strict');
const { CACHE_BREAK, stripCacheBreak, anthropicSystemBlocks } = require('../src/prompt-cache');
const { buildInterviewContext } = require('../src/interview-context');
const { MODES } = require('../src/prompts');

const settings = {
  resumeText: 'Jane Doe\nSenior engineer.\n\nEXPERIENCE\nAcme, 2020 to now: built the payments API in Node.js and Postgres.',
  jobDescription: 'Full stack engineer. Node.js, TypeScript, Postgres.',
  companyNotes: 'Acme makes invoicing software.',
  starStories: 'Fixed a timezone bug on launch night.',
  workStyle: 'Calm, test first.'
};

test('the live answer prompt marks where its stable start ends, once', () => {
  const ctx = buildInterviewContext(settings, 'answerThis', [{ channel: 'them', text: 'Tell me about a time you fixed a hard bug.' }]);
  assert.equal(ctx.split(CACHE_BREAK).length, 2);
  const before = ctx.slice(0, ctx.indexOf(CACHE_BREAK));
  assert.match(before, /payments API/);
  assert.match(before, /invoicing software/);
  // Stories change with the question's category, so they sit after the mark.
  assert.doesNotMatch(before, /timezone bug/);
});

test('removing the mark gives the text exactly as it was before caching', () => {
  assert.equal(stripCacheBreak('A\n\n' + CACHE_BREAK + '\n\nB'), 'A\n\nB');
  assert.equal(stripCacheBreak('A\n\n' + CACHE_BREAK), 'A');
  assert.equal(stripCacheBreak('no mark'), 'no mark');
  assert.equal(stripCacheBreak(undefined), '');
});

test('Anthropic blocks: the stable start and the rest, both cached, joined they are the plain text', () => {
  const system = MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', []), 'Never mention AI tools.');
  const blocks = anthropicSystemBlocks(system);
  assert.equal(blocks.length, 2);
  for (const b of blocks) {
    assert.equal(b.type, 'text');
    assert.deepEqual(b.cache_control, { type: 'ephemeral' });
    assert.ok(!b.text.includes(CACHE_BREAK));
  }
  assert.equal(blocks.map((b) => b.text).join(''), stripCacheBreak(system));
  assert.match(blocks[0].text, /payments API/);
  assert.match(blocks[1].text, /Never mention AI tools/);
});

test('an unmarked prompt gets no cache blocks, so one-off calls pay no write premium', () => {
  assert.equal(anthropicSystemBlocks('Reply with the single word OK.'), null);
  assert.equal(anthropicSystemBlocks(''), null);
});

function mockModule(name, exportsValue) {
  const path = require.resolve(name);
  const saved = require.cache[path];
  require.cache[path] = { id: path, filename: path, loaded: true, exports: exportsValue };
  return () => { if (saved) require.cache[path] = saved; else delete require.cache[path]; };
}

test('createLLM: Anthropic gets cached blocks and logs usage; the mark never reaches the request', async (t) => {
  const requests = [];
  const restore = mockModule('@anthropic-ai/sdk', class {
    constructor() {
      this.messages = {
        create: async (request) => {
          requests.push(request);
          return (async function* () {
            yield { type: 'message_start', message: { usage: { input_tokens: 900, cache_read_input_tokens: 4100, cache_creation_input_tokens: 0 } } };
            yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } };
            yield { type: 'message_delta', usage: { output_tokens: 120, input_tokens: null, cache_read_input_tokens: null } };
          })();
        }
      };
    }
  });
  t.after(restore);
  const logs = [];
  t.mock.method(console, 'log', (line) => logs.push(String(line)));
  const { createLLM } = require('../src/llm');
  const llm = createLLM({ provider: 'anthropic', smart: true, apiKey: undefined, apiKeys: { anthropic: 'sk-ant-test-key-123456' }, models: { anthropic: { smart: 'claude-sonnet-5-5', fast: 'claude-haiku-4-5-20251001' } } });
  const system = MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', []), '');
  await llm.stream({ system, turns: [{ role: 'user', text: 'Why Node?' }], onToken: () => {} });
  assert.equal(requests.length, 1);
  assert.ok(Array.isArray(requests[0].system));
  assert.ok(!JSON.stringify(requests[0]).includes(CACHE_BREAK));
  const usage = logs.find((l) => l.startsWith('[usage]'));
  assert.equal(usage, '[usage] claude-sonnet-5-5: input 900, cache read 4100, cache write 0, output 120');
  assert.ok(!logs.some((l) => l.includes('sk-ant-test-key')));
});

test('createLLM: other providers get the plain text with the mark removed', async (t) => {
  const requests = [];
  const restore = mockModule('openai', class {
    constructor() {
      this.chat = { completions: { create: (request) => { requests.push(request); return Promise.resolve((async function* () { yield { choices: [{ delta: { content: 'ok' } }] }; })()); } } };
    }
  });
  t.after(restore);
  const { createLLM } = require('../src/llm');
  const llm = createLLM({ provider: 'openai', smart: true, apiKeys: { openai: 'sk-test-openai-key' }, models: { openai: { smart: 'gpt-4o', fast: 'gpt-4o-mini' } } });
  const system = MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', []), '');
  await llm.stream({ system, turns: [{ role: 'user', text: 'Why Node?' }], onToken: () => {} });
  assert.equal(requests[0].messages[0].content, stripCacheBreak(system));
  assert.ok(!JSON.stringify(requests[0]).includes(CACHE_BREAK));
});

test('a mark with nothing after it, or a context with no blocks, still gives the plain text', () => {
  assert.equal(stripCacheBreak('A\n\n' + CACHE_BREAK + '\nTailor it.'), 'A\nTailor it.');
  assert.deepEqual(anthropicSystemBlocks('A\n\n' + CACHE_BREAK).map((b) => b.text), ['A']);
  assert.equal(buildInterviewContext({}, 'answerThis', []), null);
});
