// Show it: a walkthrough is read aloud, so the panel follows the voice through
// it; a review is worked through like code and never followed.
const test = require('node:test');
const assert = require('node:assert');
const { registerProjectReviewIpc } = require('../src/ipc/project-review');

async function showWith(purpose) {
  const handlers = {};
  const sent = [];
  const memory = { root: '/x', name: 'app', report: 'Say first: hello', purpose, qa: [] };
  registerProjectReviewIpc({
    ipcMain: { handle: (name, fn) => { handlers[name] = fn; } },
    createLLM: () => ({ ready: false }),
    getSettings: () => ({}),
    send: (channel, payload) => sent.push([channel, payload]),
    state: { busy: false },
    projectMemory: { get: () => memory, set() {}, generation: () => 0 },
    userDataDir: '/nowhere', cloneDir: '/nowhere/clones', answerSystem: () => ''
  });
  await handlers['project:show']();
  return sent.find(([c]) => c === 'llm:start')[1];
}

test('Show it follows the voice through a walkthrough', async () => {
  const start = await showWith('walkthrough');
  assert.strictEqual(start.follow, true);
  assert.strictEqual(start.coding, false);
});

test('Show it keeps a review as a code answer, not followed', async () => {
  const start = await showWith('review');
  assert.strictEqual(start.follow, false);
  assert.strictEqual(start.coding, true);
});
