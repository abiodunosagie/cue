const test = require('node:test');
const assert = require('node:assert/strict');
const { createPrepare } = require('../src/prepare');
const { createPreparedStore, profileHash } = require('../src/prepared-answers');

async function run(failActive) {
  const settings = { activeProfile: 'A', profiles: { A: { resumeText: 'cv', jobDescription: 'jd A' }, B: { resumeText: 'cv', jobDescription: 'jd B' } }, resumeText: 'cv', jobDescription: 'jd A', provider: 'anthropic' };
  const preparedStore = createPreparedStore({});
  const calls = [];
  const createLLM = (st) => ({ ready: true, stream: async () => {
    calls.push(st.jobDescription);
    if (failActive && st.jobDescription === 'jd A') throw new Error('down');
    return '[{"question":"q?","variants":[],"answer":"a"}]';
  } });
  const p = createPrepare({ store: { getSettings: () => settings }, createLLM, preparedStore, followUps: { items: () => [] }, projectMemory: { get: () => null },
    interviewMemory: { generation: () => 0 }, send: () => {}, recordEvent: () => {}, getTranscript: () => [], spokenAnswerTexts: () => [] });
  await p.prepareOtherProfiles();
  await new Promise((r) => setTimeout(r, 100));
  return { calls, activeCurrent: preparedStore.isCurrent(profileHash(settings)) };
}

test('the active profile gets its prepared answers before any other profile', async () => {
  const r = await run(false);
  assert.deepEqual(r.calls, ['jd A', 'jd B']);
  assert.equal(r.activeCurrent, true);
});

test('when the active profile cannot be prepared, it is tried once and the others still get theirs', async () => {
  const r = await run(true);
  assert.deepEqual(r.calls, ['jd A', 'jd B'], 'no retry loop');
  assert.equal(r.activeCurrent, false);
});
