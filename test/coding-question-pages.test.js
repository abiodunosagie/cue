// A coding question's pages, read while scrolling, reach every provider in
// scroll order, and the coding prompt reads them as one task.
const test = require('node:test');
const assert = require('node:assert/strict');
const { MODES } = require('../src/prompts');

const png = (b64) => 'data:image/jpeg;base64,' + b64;

test('turnImages: the pages in order with labels, or one unlabeled screenshot', () => {
  const { _test } = require('../src/llm');
  const pages = _test.turnImages(null, [png('AA'), png('BB')]);
  assert.deepEqual(pages.map((p) => [p.b64, p.label]), [['AA', 'Page 1 of 2:'], ['BB', 'Page 2 of 2:']]);
  const one = _test.turnImages(png('CC'), null);
  assert.deepEqual(one.map((p) => [p.b64, p.mime, p.label]), [['CC', 'image/jpeg', '']]);
  assert.deepEqual(_test.turnImages(null, []), []);
  assert.deepEqual(_test.turnImages('not a data url', null), []);
});

test('providers with a documented image limit get the newest screens only', () => {
  const { _test } = require('../src/llm');
  const five = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(_test.capImages('groq', five), ['c', 'd', 'e']);
  assert.equal(_test.capImages('anthropic', five), five);
  assert.equal(_test.capImages('azure', five), five);
  assert.equal(_test.capImages('groq', undefined), undefined);
});

test('OpenAI-style content: the request, then each page after its label', () => {
  const { _test } = require('../src/llm');
  const parts = _test.openAIContent('Solve it', _test.turnImages(null, [png('AA'), png('BB')]));
  assert.deepEqual(parts.map((p) => p.type === 'text' ? p.text : p.image_url.url), ['Solve it', 'Page 1 of 2:', png('AA'), 'Page 2 of 2:', png('BB')]);
});

test('Anthropic gets one image block per page, in scroll order, before the request', async () => {
  const path = require.resolve('@anthropic-ai/sdk');
  const saved = require.cache[path];
  let sent = null;
  require.cache[path] = {
    id: path, filename: path, loaded: true,
    exports: class {
      constructor() {
        this.messages = {
          create: async (request) => {
            sent = request;
            return (async function* () { yield { type: 'content_block_delta', delta: { type: 'text_delta', text: 'ok' } }; })();
          }
        };
      }
    }
  };
  try {
    const { streamAnthropic } = require('../src/llm');
    await streamAnthropic({ apiKey: 'k', model: 'claude-opus-5-5', system: 's', turns: [{ role: 'user', text: 'Solve it' }], imageDataUrls: [png('AA'), png('BB'), png('CC')], maxTokens: 10, onToken: () => {} });
  } finally {
    if (saved) require.cache[path] = saved; else delete require.cache[path];
  }
  const content = sent.messages[0].content;
  assert.deepEqual(content.map((c) => c.type === 'image' ? c.source.data : c.text),
    ['Page 1 of 3:', 'AA', 'Page 2 of 3:', 'BB', 'Page 3 of 3:', 'CC', 'Solve it']);
});

test('Gemini gets each page as inline data after its label, after the request', async () => {
  const path = require.resolve('@google/genai');
  const saved = require.cache[path];
  let sent = null;
  require.cache[path] = {
    id: path, filename: path, loaded: true,
    exports: { GoogleGenAI: class {
      constructor() {
        this.models = { generateContentStream: async (request) => { sent = request; return (async function* () { yield { text: 'ok' }; })(); } };
      }
    } }
  };
  try {
    const { _test } = require('../src/llm');
    await _test.streamGemini({ apiKey: 'k', model: 'm', system: 's', turns: [{ role: 'user', text: 'Solve it' }], imageDataUrls: [png('AA'), png('BB')], maxTokens: 10, onToken: () => {} });
  } finally {
    if (saved) require.cache[path] = saved; else delete require.cache[path];
  }
  assert.deepEqual(sent.contents[0].parts.map((p) => p.text || p.inlineData.data), ['Solve it', 'Page 1 of 2:', 'AA', 'Page 2 of 2:', 'BB']);
});

test('Ollama gets every page in scroll order on the last user message', async () => {
  const { _test } = require('../src/llm');
  const realFetch = global.fetch;
  let body = null;
  // Record the request, then fail it: only the request shape matters here.
  global.fetch = async (_url, init) => { body = JSON.parse(init.body); throw new Error('stop'); };
  try {
    await assert.rejects(_test.streamOllama({ apiKey: '', model: 'm', system: 's', turns: [{ role: 'user', text: 'Solve it' }], imageDataUrls: [png('AA'), png('BB')], maxTokens: 10, onToken: () => {} }), /stop/);
  } finally {
    global.fetch = realFetch;
  }
  assert.deepEqual(body.messages[1], { role: 'user', content: 'Solve it', images: ['AA', 'BB'] });
});

test('coding prompt: pages are one task read across screenshots; one page reads as before', () => {
  const one = MODES.leetcode.build({ pages: 1 });
  assert.match(one, /Solve the coding problem shown in the screenshot\.$/);
  assert.doesNotMatch(one, /screenshots of ONE question/);
  const three = MODES.leetcode.build({ pages: 3 });
  assert.match(three, /comes as 3 screenshots of ONE question/);
  assert.match(three, /switched between its tabs/);
  assert.doesNotMatch(three, /on screen now/);
  assert.match(three, /Solve the coding problem shown across these screenshots\.$/);
  const quick = MODES.leetcode.build({ pages: 2, quickStart: 'plan' });
  assert.match(quick, /QUICK START[\s\S]*Solve the coding problem shown across these screenshots\.$/);
  const full = MODES.leetcode.build({ pages: 2, quickPlan: 'plan text' });
  assert.match(full, /<quick_start>[\s\S]*2 screenshots[\s\S]*across these screenshots\.$/);
  assert.match(MODES.leetcode.buildSystem(null), /spread over tabs, comes as several screenshots/);
});
