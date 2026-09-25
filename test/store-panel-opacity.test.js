// store.js requires electron for app.getPath('userData'); stubbed to a temp dir.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

const originalModuleLoad = Module._load;

function loadStore(fileContents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-store-'));
  if (fileContents !== undefined) fs.writeFileSync(path.join(dir, 'cue-data.json'), JSON.stringify(fileContents));
  Module._load = function loadWithElectronStub(request, parent, isMain) {
    if (request === 'electron') return { app: { getPath: () => dir } };
    return originalModuleLoad.call(this, request, parent, isMain);
  };
  const id = require.resolve('../src/store');
  delete require.cache[id];
  const store = require('../src/store');
  Module._load = originalModuleLoad;
  return store;
}

test('panel opacity defaults to 0.9 for a new or older settings file', () => {
  assert.equal(loadStore().getSettings().panelOpacity, 0.9);
  assert.equal(loadStore({ provider: 'anthropic' }).getSettings().panelOpacity, 0.9);
});

test('panel opacity is saved and clamped to the readable range', () => {
  const store = loadStore();
  assert.equal(store.setSettings({ panelOpacity: 0.55 }).panelOpacity, 0.55);
  assert.equal(store.setSettings({ panelOpacity: 0 }).panelOpacity, 0.3);
  assert.equal(store.setSettings({ panelOpacity: 5 }).panelOpacity, 0.97);
  assert.equal(store.setSettings({ panelOpacity: 'junk' }).panelOpacity, 0.9);
  assert.equal(store.setSettings({ panelOpacity: '0.456' }).panelOpacity, 0.46);
});

test('blur is full at the default and above, and fades to none at the floor', () => {
  const { blurFor, MIN, DEFAULT, MAX } = require('../renderer/panel-opacity');
  assert.equal(blurFor(DEFAULT), 24);
  assert.equal(blurFor(MAX), 24);
  assert.equal(blurFor(MIN), 0);
  assert.ok(blurFor(0.6) > 0 && blurFor(0.6) < 24);
});

test('reading while scrolling is on for a new file and for one saved with the old opt-in setting off', () => {
  assert.equal(loadStore().getSettings().scrollReading, true);
  assert.equal(loadStore({ provider: 'anthropic', longQuestion: false }).getSettings().scrollReading, true);
  assert.equal(loadStore({ provider: 'anthropic', scrollReading: false }).getSettings().scrollReading, false);
});
