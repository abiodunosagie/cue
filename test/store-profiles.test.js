// store.js requires electron for app.getPath('userData'); stubbed to a temp dir.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const Profiles = require('../src/profiles');

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
  return { store, file: path.join(dir, 'cue-data.json') };
}

test('an existing settings file keeps every field and gains one profile holding them', () => {
  const { store } = loadStore({ provider: 'anthropic', apiKeys: { anthropic: 'k' }, resumeText: 'My CV', jobDescription: 'Acme JD', starStories: 'Stories' });
  const s = store.getSettings();
  assert.equal(s.resumeText, 'My CV');
  assert.equal(s.apiKeys.anthropic, 'k');
  assert.equal(s.activeProfile, 'My profile');
  assert.equal(s.profiles['My profile'].jobDescription, 'Acme JD');
});

test('the renderer cannot overwrite profiles; a deleted profile does not come back', () => {
  const { store, file } = loadStore({ resumeText: 'CV', jobDescription: 'A' });
  store.setProfileState(Profiles.create(store.getSettings(), 'Globex'));
  const patch = store.stripRendererPatch({ profiles: { Evil: {} }, activeProfile: 'Evil', jobDescription: 'Globex JD' });
  store.setSettings(patch);
  assert.equal(store.getSettings().activeProfile, 'Globex');
  assert.equal(store.getSettings().profiles.Evil, undefined);
  store.setProfileState(Profiles.removeCurrent(store.getSettings()));
  const onDisk = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.deepEqual(Object.keys(onDisk.profiles), ['My profile']);
  assert.equal(onDisk.activeProfile, 'My profile');
  assert.equal(onDisk.jobDescription, 'A');
});

test('projects are main-owned: the Settings Save cannot overwrite them, setProjects cleans them', () => {
  const { store } = loadStore({ resumeText: 'CV' });
  store.setProjects([{ id: 'web/shop', name: 'Shop', summary: 'A shop.', use: true }, { id: 'web/shop' }, null]);
  assert.equal(store.getSettings().projects.length, 1);
  store.setSettings(store.stripRendererPatch({ projects: [], resumeText: 'New CV' }));
  assert.equal(store.getSettings().resumeText, 'New CV');
  assert.deepEqual(store.getSettings().projects.map((p) => p.id), ['web/shop']);
  // Switching job profiles keeps them: projects are about the candidate, not the job.
  store.setProfileState(Profiles.create(store.getSettings(), 'Globex'));
  assert.equal(store.getSettings().projects.length, 1);
});
