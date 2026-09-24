const test = require('node:test');
const assert = require('node:assert/strict');
const { runSetupChecks } = require('../src/setup-check');

function deps(over = {}) {
  const ready = (model) => ({ ready: true, model });
  return {
    llmFor: (tier) => ready(tier + '-model'),
    quickAsk: async ({ system }) => (/single word OK/.test(system) ? 'OK' : 'NONE'),
    runOpener: async () => 'I start by measuring what the network really does.',
    preparedState: () => ({ canPrepare: true, count: 20, current: true, running: false, error: '' }),
    mediaStatus: () => 'granted',
    captureScreen: async () => ({ dataUrl: 'data:x' }),
    detectSystem: 'detect',
    elevenLabsKey: () => 'k',
    practiceVoice: () => 'george',
    synthesize: async () => Buffer.from('mp3'),
    ...over
  };
}

test('a working setup passes every check, reporting each as it lands', async () => {
  const seen = [];
  const results = await runSetupChecks(deps(), (r) => seen.push(r.name));
  assert.equal(results.length, 9);
  assert.deepEqual(results.filter((r) => r.status !== 'pass').map((r) => r.name), []);
  assert.deepEqual(seen, results.map((r) => r.name));
  assert.match(results.find((r) => r.name === 'Instant first line').detail, /measuring/);
});

test('failures carry a plain reason, a thrown error does not stop the rest, and missing parts are skipped', async () => {
  const results = await runSetupChecks(deps({
    llmFor: (tier) => (tier === 'coding' ? { ready: false, configurationError: 'Add your anthropic API key in Settings.' } : { ready: true, model: tier }),
    quickAsk: async ({ system }) => { if (/single word OK/.test(system)) return 'OK'; throw new Error('the model took too long'); },
    preparedState: () => ({ canPrepare: false }),
    mediaStatus: (type) => (type === 'screen' ? 'denied' : 'granted'),
    elevenLabsKey: () => ''
  }), () => {});
  const by = Object.fromEntries(results.map((r) => [r.name, r]));
  assert.equal(by['Coding model (⌘H)'].status, 'fail');
  assert.match(by['Coding model (⌘H)'].detail, /anthropic API key/);
  assert.equal(by['Prepared answers'].status, 'skip');
  assert.equal(by['Screen permission'].status, 'fail');
  assert.equal(by['Reading the screen'].status, 'skip');
  assert.equal(by['Practice voice (ElevenLabs)'].status, 'skip');
  assert.equal(by['Smart model'].status, 'pass');
});

test('a Fast model that cannot read images fails the screen check', async () => {
  const results = await runSetupChecks(deps({ quickAsk: async ({ system }) => (/single word OK/.test(system) ? 'OK' : 'I cannot see images.') }), () => {});
  assert.equal(results.find((r) => r.name === 'Reading the screen').status, 'fail');
});
