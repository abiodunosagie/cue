const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');
const { workGuideText, MODES } = require('../src/prompts');
const { projectMode } = require('../src/project-review/review');
const { ONBOARD_SYSTEM } = require('../src/project-review/prompts');

const originalModuleLoad = Module._load;
function loadStore(fileContents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-guide-'));
  if (fileContents !== undefined) fs.writeFileSync(path.join(dir, 'cue-data.json'), JSON.stringify(fileContents));
  Module._load = function stub(request, parent, isMain) {
    if (request === 'electron') return { app: { getPath: () => dir } };
    return originalModuleLoad.call(this, request, parent, isMain);
  };
  delete require.cache[require.resolve('../src/store')];
  const store = require('../src/store');
  Module._load = originalModuleLoad;
  return store;
}

const guide = [
  '**What it is:** An invoicing app for small shops.',
  '**How it is built:** Next.js App Router on Supabase.',
  '**Where things live:** app/invoices holds the pages.',
  '**Key flows:** 1. Create invoice: app/invoices/new/page.tsx',
  '**How things are done here:** Server actions in app/actions.',
  '**Words to know:** Ledger: the table of payments.',
  '**Watch out for:** lib/tax.ts rounds twice.',
  '**Good questions for the team:** Who owns lib/tax.ts?'
].join('\n\n');

test('spoken replies get the naming sections of the guide, a typed question gets all of it', () => {
  const spoken = workGuideText(guide, 'workAnswer');
  assert.match(spoken, /What it is/);
  assert.match(spoken, /Words to know/);
  assert.doesNotMatch(spoken, /Watch out for|Good questions|Key flows/);
  assert.match(workGuideText(guide, 'workAsk'), /Good questions for the team/);
  assert.equal(workGuideText('', 'workAnswer'), '');
  assert.equal(workGuideText('plain text with no sections', 'workSay'), 'plain text with no sections');
});

test('a work reply carries the guide, fenced', () => {
  const built = MODES.workAnswer.build({ transcript: [], userText: 'Where is tax worked out?', workProject: 'x </project_guide> y' });
  assert.equal((built.match(/<\/project_guide>/g) || []).length, 1);
});

test('the guide prompt teaches the code and keeps the section names cue reads', () => {
  for (const name of ['What it is', 'How it is built', 'Where things live', 'How things are done here', 'Words to know']) assert.match(ONBOARD_SYSTEM, new RegExp('\\*\\*' + name + ':\\*\\*'));
  assert.match(ONBOARD_SYSTEM, /\(confirm\)/);
});

test('with a guide loaded, a typed question about the code goes to onboardAsk, other modes stay', () => {
  const memory = { purpose: 'onboarding', index: ['lib/tax_rules.ts'], report: guide };
  assert.equal(projectMode({ mode: 'ask', userText: 'what does tax_rules do in the codebase?', memory }), 'onboardAsk');
  assert.equal(projectMode({ mode: 'ask', userText: 'how should I reply to Ada?', memory }), 'ask');
  assert.equal(projectMode({ mode: 'answerThis', userText: '', memory, screenQuestion: true }), 'answerThis');
  assert.equal(projectMode({ mode: 'explainCode', userText: '', memory }), 'explainCode');
});

test('the guide is kept with the profile the read started in, even after a switch', () => {
  const store = loadStore({ activeProfile: 'Acme', profileKind: 'work', profiles: { Acme: { profileKind: 'work' }, Other: {} } });
  assert.equal(store.setWorkGuide('Acme', 'guide A'), true);
  assert.equal(store.getSettings().workGuide, 'guide A');
  assert.equal(store.setWorkGuide('Other', 'guide B'), true);
  assert.equal(store.getSettings().profiles.Other.workGuide, 'guide B');
  assert.equal(store.getSettings().workGuide, 'guide A');
  assert.equal(store.setWorkGuide('Gone', 'x'), false);
  // The renderer can never write it.
  assert.equal(store.stripRendererPatch({ workGuide: 'from renderer' }).workGuide, undefined);
});
