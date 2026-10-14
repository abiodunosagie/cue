const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createQuestionBank, readDir, readQa, readCoding, renderSolution } = require('../src/question-bank');
const { findMatches, pickSameQuestion } = require('../src/prepared-answers');
const { createPrepare } = require('../src/prepare');
const { createPreparedStore, profileHash } = require('../src/prepared-answers');
const { createCodingLibrary } = require('../src/coding-library');

const LONG_DASH = String.fromCharCode(0x2014);
const rawQa = readDir('qa', { strict: true });
const rawCoding = readDir('coding', { strict: true });
const qa = rawQa.map(readQa);

// ---- the shipped bank: shape ------------------------------------------------

test('every bank question is complete, unique and free of long dashes', () => {
  assert.ok(rawQa.length > 0);
  qa.forEach((it, i) => assert.ok(it, `item ${i} (${rawQa[i] && rawQa[i].id}) is incomplete`));
  const ids = qa.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const it of rawQa) {
    assert.ok(!JSON.stringify(it).includes(LONG_DASH), `${it.id} has a long dash`);
    assert.ok(it.variants.length >= 3, `${it.id} needs at least 3 variants`);
    const words = it.answer.split(/\s+/).length;
    assert.ok(words >= 60 && words <= 260, `${it.id} answer is ${words} words`);
    assert.ok(['junior', 'mid', 'senior'].includes(it.level), `${it.id} level`);
  }
});

test('every bank coding problem renders for both languages with no step marks left', () => {
  assert.ok(rawCoding.length > 0);
  const ids = rawCoding.map((it) => it.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate ids');
  for (const it of rawCoding) {
    const items = readCoding(it);
    assert.ok(items.length >= 1, `${it.id} must render in at least one language`);
    assert.equal(items.length, Object.keys(it.code).length, `${it.id} has code in an unsupported language`);
    for (const item of items) {
      assert.ok(!item.solution.includes('//@step'), `${item.id} leaks a step mark`);
      assert.match(item.solution, /\*\*Full code to paste:\*\*/);
      assert.equal((item.solution.match(/\*\*Step \d+:/g) || []).length, it.steps.length);
    }
  }
});

// ---- the shipped bank: matching ---------------------------------------------

test('every bank question and phrasing finds its own item first, and never another item outright', () => {
  const problems = [];
  for (const it of qa) {
    for (const phrase of [it.question, ...it.variants]) {
      const [top] = findMatches(qa, phrase, 1);
      if (!top) problems.push(`${it.id}: "${phrase}" matches nothing`);
      else if (top.item.id !== it.id) problems.push(`${it.id}: "${phrase}" matched ${top.item.id}`);
      const [other] = findMatches(qa.filter((o) => o !== it), phrase, 1);
      if (other && other.direct) problems.push(`${it.id}: "${phrase}" directly matches ${other.item.id}`);
    }
  }
  assert.deepEqual(problems, []);
});

// ---- role scope ---------------------------------------------------------------

const bank = createQuestionBank({
  qa: [
    { id: 'f', roles: ['mobile'], anchors: ['flutter'], level: 'mid', question: 'How do you manage state in a large app?', variants: [], answer: 'Flutter answer' },
    { id: 'w', roles: ['frontend'], anchors: ['react'], level: 'mid', question: 'How do you manage state in a large web app?', variants: [], answer: 'React answer' },
    { id: 'g', roles: ['all'], level: 'mid', question: 'How do you review a pull request?', variants: [], answer: 'General answer' },
    { id: 'c', roles: ['cms'], anchors: ['wordpress'], level: 'mid', question: 'How do you make a slow site fast?', variants: [], answer: 'CMS answer' }
  ],
  coding: []
});

test('a question only matches items for the role focus, unless it names their technology', () => {
  const ids = (heard, role) => bank.matches(heard, role).map((m) => m.item.id);
  assert.deepEqual(ids('How do you manage state in a large app?', 'frontend'), ['w']);
  assert.ok(ids('How do you manage state in a large Flutter app?', 'frontend').includes('f'));
  assert.ok(!ids('How do you manage state in a large app?', 'mobile').includes('w'));
  assert.ok(ids('How do you manage state in a large app?', null).includes('f'), 'no focus: every item');
  assert.deepEqual(ids('How do you review a pull request?', 'backend'), ['g']);
});

test('cms items reach only a CMS interview, which also draws on front end and general items', () => {
  const ids = (heard, role) => bank.matches(heard, role).map((m) => m.item.id);
  assert.deepEqual(ids('How do you make a slow site fast?', 'cms'), ['c']);
  for (const role of ['frontend', 'fullstack', 'backend', 'mobile']) assert.ok(!ids('How do you make a slow site fast?', role).includes('c'), role);
  assert.ok(ids('How do you make a slow WordPress site fast?', 'frontend').includes('c'), 'named technology still matches');
  assert.ok(ids('How do you manage state in a large web app?', 'cms').includes('w'));
  assert.ok(!ids('How do you manage state in a large app?', 'cms').includes('f'));
});

test('the shipped CMS answers stay out of other interviews on generic words', () => {
  const shipped = createQuestionBank();
  const cmsIds = new Set(rawQa.filter((it) => it.roles.includes('cms') || it.roles.includes('named')).map((it) => it.id));
  const leaks = [];
  const heard = { mobile: ['How do you handle plugin updates?', 'How would you handle a CMS for the app content?'],
    backend: ['How do you schedule a cron job?', 'How do you design a REST API?', 'What is in the request payload?', 'How do you run a database migration?'],
    frontend: ['How do you handle SEO?', 'How do you secure a form with a nonce?', 'How do you use git in your team?'] };
  for (const [role, list] of Object.entries(heard)) {
    for (const q of list) for (const m of shipped.matches(q, role)) if (cmsIds.has(m.item.id)) leaks.push(role + ': ' + q + ' -> ' + m.item.id);
  }
  assert.deepEqual(leaks, []);
});

test('AEM questions find their AEM answer whatever the role focus', () => {
  const shipped = createQuestionBank();
  const top = (heard, role) => (shipped.matches(heard, role)[0] || {}).item || {};
  assert.equal(top('How do you write a Sling Model?', 'fullstack').id, 'aem-sling-models');
  assert.equal(top('Have you worked with AEM?', 'backend').id, 'aem-experience');
  assert.equal(top('Any A.E.M. in your background?', 'mobile').id, 'aem-experience', 'speech to text spelling');
  // A shortlist the Fast model picks from: the dispatcher answer must be on it.
  assert.ok(shipped.matches('How does the AEM dispatcher cache work?', 'frontend').some((m) => m.item.id === 'aem-dispatcher'));
});

test('AEM answers never come up on words that also mean something else', () => {
  const shipped = createQuestionBank();
  const aemIds = new Set(rawQa.filter((it) => it.id.startsWith('aem-')).map((it) => it.id));
  const leaks = [];
  const generic = ['How do you cache API responses?', 'How do you structure a Maven project?', 'How do you test a model class?',
    'How do you deploy with a CI/CD pipeline?', 'How do you reuse a header across pages?', 'Tell me about your experience as a manager.',
    'How do you run a background daemon?', 'How do you cache with a dispatcher in Node?', 'Which cloud service do you deploy to?',
    'What are the core components of Flutter?', 'What is a proxy component pattern?', 'What is the run mode of your app, debug or release?',
    'What is a live copy of a database?', 'How do you handle a cloud manager role?', 'How do you render a content fragment in a web page?',
    'Does your team use an experience manager?', 'How do you generate a project from a Maven archetype?', 'How does the Flux dispatcher work?',
    'How do you publish a client library to npm?'];
  for (const role of ['fullstack', 'backend', 'frontend', 'cms', 'mobile']) {
    for (const q of generic) for (const m of shipped.matches(q, role)) if (aemIds.has(m.item.id)) leaks.push(role + ': ' + q + ' -> ' + m.item.id);
  }
  assert.deepEqual(leaks, []);
});

// ---- prepared answer lookup ---------------------------------------------------

function prepareWith({ personal = [], reply = 'NONE' } = {}) {
  const settings = { provider: 'anthropic', answerLength: 'medium', resumeText: 'cv', jobDescription: 'Flutter mobile developer', roleFocus: 'mobile' };
  const preparedStore = createPreparedStore({});
  if (personal.length) preparedStore.replace(profileHash(settings), personal);
  const asked = [];
  const createLLM = () => ({ ready: true, stream: async ({ turns }) => { asked.push(turns[0].text); return reply; } });
  const p = createPrepare({ store: { getSettings: () => settings }, createLLM, preparedStore, questionBank: bank,
    projectMemory: { get: () => null }, send: () => {}, recordEvent: () => {}, spokenAnswerTexts: () => [] });
  return { find: (q) => p.findPreparedAnswer('answerThis', q, settings), asked };
}

test('a near-identical bank question is answered from the bank without asking the model', async () => {
  const { find, asked } = prepareWith();
  const item = await find('How do you manage state in a large app?');
  assert.equal(item.answer, 'Flutter answer');
  assert.equal(asked.length, 0);
});

test('on an equal score the candidate\'s own prepared answer wins over the bank', async () => {
  const { find } = prepareWith({ personal: [{ question: 'How do you manage state in a large app?', variants: [], answer: 'My own answer' }] });
  assert.equal((await find('How do you manage state in a large app?')).answer, 'My own answer');
});

test('a close question goes to the Fast model with the shortlist, and NONE means a normal answer', async () => {
  const none = prepareWith({ reply: 'NONE' });
  assert.equal(await none.find('How would you manage the state of a growing app with many screens?'), null);
  assert.match(none.asked[0], /^Question heard: .*\nPrepared questions:\n1\. /);
  const picked = prepareWith({ reply: '1' });
  assert.equal((await picked.find('How would you manage the state of a growing app with many screens?')).answer, 'Flutter answer');
});

test('pickSameQuestion reads a number in range and treats anything else as none', async () => {
  const llm = (reply) => ({ stream: async () => reply });
  const ask = (reply) => pickSameQuestion({ llm: llm(reply), heard: 'h', prepared: ['a', 'b'] });
  assert.equal(await ask('2'), 1);
  assert.equal(await ask(' 1.'), 0);
  assert.equal(await ask('3'), -1);
  assert.equal(await ask('NONE'), -1);
  assert.equal(await ask('maybe 1'), -1);
  assert.equal(await pickSameQuestion({ llm: { stream: async () => { throw new Error('down'); } }, heard: 'h', prepared: ['a'] }), -1);
});

// ---- coding: bank solutions next to the candidate's library -----------------

const twoSum = rawCoding.find((it) => it.id === 'two-sum');
const bankItems = readCoding(twoSum);
const task = { title: 'Two Sum', statement: twoSum.statement, language: 'dart' };

test('a coding task on screen finds the bank solution in its own language', () => {
  const lib = createCodingLibrary({});
  const found = lib.candidate(task, bankItems);
  assert.equal(found.item.id, 'bank:two-sum:dart');
  assert.match(found.item.solution, /```dart\n/);
  assert.equal(lib.candidate({ ...task, language: 'typescript' }, bankItems).item.id, 'bank:two-sum:typescript');
  assert.equal(lib.candidate({ ...task, language: 'python' }, bankItems), null);
});

test('a coding screen with no language shown never gets a bank solution', () => {
  const lib = createCodingLibrary({});
  assert.equal(lib.candidate({ ...task, language: '' }, bankItems), null);
  const own = lib.save({ title: 'Two Sum', statement: bankItems[0].statement, language: '', solution: 'mine' });
  assert.equal(lib.candidate({ ...task, language: '' }, bankItems).item.id, own.id);
});

test('the candidate\'s own solve of the same task comes before the bank', () => {
  const lib = createCodingLibrary({});
  const own = lib.save({ title: 'Two Sum', statement: bankItems[0].statement, language: 'dart', solution: 'mine' });
  assert.equal(lib.candidate(task, bankItems).item.id, own.id);
});

test('a bank solution a progress check flags is skipped from then on, and the flag is kept on disk', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-lib-')), 'lib.json');
  const lib = createCodingLibrary({ file });
  assert.equal(lib.flag('bank:two-sum:dart', 'off by one'), true);
  assert.equal(lib.candidate(task, bankItems), null);
  const again = createCodingLibrary({ file });
  again.load();
  assert.equal(again.candidate(task, bankItems), null);
  assert.equal(again.flag('not-a-bank-id', 'x'), false);
});

test('renderSolution builds the steps, full code and Run it from the item', () => {
  const text = renderSolution(twoSum, 'typescript');
  assert.match(text, /^\*\*What it asks:\*\*/);
  assert.match(text, /\*\*Run it:\*\*\n```typescript\nconsole\.log\(twoSum\(\[2, 7, 11, 15\], 9\)\); \/\/ \[0,1\]/);
});

test('an answer about a product the candidate never volunteers matches only when the question names it', () => {
  const named = createQuestionBank({
    qa: [{ id: 'n', roles: ['named'], anchors: ['supabase'], level: 'mid', question: 'How do you secure tables with row level security?', variants: [], answer: 'Supabase answer' }],
    coding: []
  });
  assert.equal(named.matches('How do you secure tables with row level security?', 'backend').length, 0);
  assert.equal(named.matches('How do you secure tables with row level security?', null).length, 0);
  assert.equal(named.matches('How do you secure tables with row level security in Supabase?', 'mobile').length, 1);
});
