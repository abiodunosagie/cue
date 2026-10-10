const test = require('node:test');
const assert = require('node:assert/strict');
const { runSetupChecks } = require('../src/setup-check');

function deps(over = {}) {
  const ready = (model) => ({ ready: true, model });
  return {
    llmFor: (tier) => ready(tier + '-model'),
    quickAsk: async ({ system }) => (/single word OK/.test(system) ? 'OK' : 'NONE'),
    preparedState: () => ({ canPrepare: true, count: 20, current: true, running: false, error: '' }),
    mediaStatus: () => 'granted',
    captureScreen: async () => ({ dataUrl: 'data:x' }),
    detectSystem: 'detect',
    elevenLabsKey: () => 'k',
    practiceVoice: () => 'george',
    codingShortcut: '⌘H',
    synthesize: async () => Buffer.from('mp3'),
    sttProvider: () => 'deepgram',
    probeDeepgram: async () => ({ ok: true, detail: 'Connected to Deepgram live transcription.' }),
    meetingAudio: () => ({ capturing: true, lastChunkAt: Date.now(), lastSoundAt: Date.now() }),
    ...over
  };
}

test('a working setup passes every check, reporting each as it lands', async () => {
  const seen = [];
  const results = await runSetupChecks(deps(), (r) => seen.push(r.name));
  assert.equal(results.length, 10);
  assert.deepEqual(results.filter((r) => r.status !== 'pass').map((r) => r.name), []);
  assert.deepEqual(seen, results.map((r) => r.name));
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

test('live transcription: Deepgram is probed, a refused key fails, other providers are skipped', async () => {
  const run = async (over) => Object.fromEntries((await runSetupChecks(deps(over), () => {})).map((r) => [r.name, r]))['Live transcription'];
  assert.equal((await run({})).status, 'pass');
  const refused = await run({ probeDeepgram: async () => ({ ok: false, detail: 'Deepgram refused the key (401). Check it in Settings > Keys.' }) });
  assert.equal(refused.status, 'fail');
  assert.match(refused.detail, /401/);
  assert.equal((await run({ sttProvider: () => 'OpenAI' })).status, 'skip');
  assert.match((await run({ sttProvider: () => 'none' })).detail, /No transcription key/);
});

test('meeting audio reports what arrived, never a guess', async () => {
  const run = async (audio) => Object.fromEntries((await runSetupChecks(deps({ meetingAudio: () => audio }), () => {})).map((r) => [r.name, r]))['Meeting audio'];
  const now = Date.now();
  assert.equal((await run({ capturing: true, lastChunkAt: now, lastSoundAt: now - 1000 })).status, 'pass');
  // Heard a minute ago, listening since stopped: still proof it works.
  assert.equal((await run({ capturing: false, lastChunkAt: now - 60000, lastSoundAt: now - 60000 })).status, 'pass');
  assert.equal((await run({ capturing: false, lastChunkAt: 0, lastSoundAt: 0 })).status, 'skip');
  const silent = await run({ capturing: true, lastChunkAt: now, lastSoundAt: 0 });
  assert.equal(silent.status, 'fail');
  assert.match(silent.detail, /silent/);
  const none = await run({ capturing: true, lastChunkAt: 0, lastSoundAt: 0 });
  assert.equal(none.status, 'fail');
  assert.match(none.detail, /14\.4/);
  // Old sound does not count.
  assert.equal((await run({ capturing: false, lastChunkAt: now - 600000, lastSoundAt: now - 600000 })).status, 'skip');
});
