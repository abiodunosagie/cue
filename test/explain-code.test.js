// isExplainRequest lives in renderer/spoken-question.js (its routing tests are in
// spoken-question.test.js); these cover the explain-code feature end to end.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isExplainRequest } = require('../renderer/spoken-question');
const { createInterviewMemory } = require('../src/interview-memory');
const { MODES } = require('../src/prompts');

test('questions about the code just written are recognised', () => {
  for (const q of ['Can you explain what you just did?', 'Walk me through your code.', 'Talk me through what you are doing.',
    'Why did you use a map here?', 'What does this line do?', 'How does your solution work?', 'What is the time complexity of this?',
    'Can you optimize it?', 'How would you test this?', 'What edge cases did you consider?', 'What happens if the input list is empty?']) {
    assert.equal(isExplainRequest(q), true, q);
  }
});

test('ordinary interview questions are not', () => {
  for (const q of ['Explain how you handle offline sync in your apps', 'Why did you choose Flutter over React Native?', 'Tell me about yourself',
    'Walk me through your background', 'Why did you leave your last job?', 'How do you manage state in a large Flutter app?', '', 'explain']) {
    assert.equal(isExplainRequest(q), false, q);
  }
});

test('a coding solve counts as recent only among the last few answers', () => {
  const m = createInterviewMemory({});
  assert.equal(m.recentCodingSolve(), '');
  m.addAnswer({ mode: 'leetcode', text: 'SOLVE' });
  m.addAnswer({ mode: 'answerThis', text: 'a' });
  assert.equal(m.recentCodingSolve(), 'SOLVE');
  for (let i = 0; i < 4; i++) m.addAnswer({ mode: 'answerThis', text: 'b' + i });
  assert.equal(m.recentCodingSolve(), '');   // the coding round is over
});

test('the explanation is built from the solution and the question, editor first', () => {
  const def = MODES.explainCode;
  assert.equal(def.needsScreen, true);
  assert.equal(def.skipMemory, true);
  const system = def.buildSystem('RESUME', '');
  assert.doesNotMatch(system, /RESUME/);
  assert.match(system, /\*\*Say this:\*\*/);
  assert.match(system, /the editor wins/);
  assert.match(system, /then \*\*Say:\*\* one to three plain sentences/);
  const built = def.build({ priorSolves: ['```dart\nmerge()\n```'], transcript: [{ channel: 'them', text: 'Why a sort?' }], userText: 'Why a sort?' });
  assert.match(built, /solution cue gave earlier[\s\S]*merge\(\)/);
  assert.match(built, /The interviewer asked: "Why a sort\?"/);
  assert.match(def.build({ priorSolves: [], transcript: [] }), /explain my code from the start/);
});

test('checking progress works from the plan and the editor, and is never stored as an answer', () => {
  const def = MODES.checkProgress;
  assert.equal(def.needsScreen, true);
  assert.equal(def.notAnswer, true);
  assert.equal(def.codingFollowUp, true);
  const system = def.buildSystem('', '');
  const order = ['**Where you are:**', '**Issues:**', '**Next:**'].map((p) => system.indexOf(p));
  assert.ok(order.every((i) => i >= 0));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.match(system, /None, it looks right\./);
  assert.match(system, /Never invent problems/);
  assert.match(def.build({ priorSolves: ['PLAN'] }), /The plan cue gave for this task:\n\nPLAN/);
  assert.match(def.build({ priorSolves: [] }), /no earlier plan/);
});

test('explaining the code does not end the coding round', () => {
  const m = createInterviewMemory({});
  m.addAnswer({ mode: 'leetcode', text: 'SOLVE' });
  for (let i = 0; i < 6; i++) m.addAnswer({ mode: 'explainCode', text: 'e' + i });
  assert.equal(m.recentCodingSolve(), 'SOLVE');
});

test('a long coding plan is kept whole, so a progress check sees its later steps', () => {
  const m = createInterviewMemory({});
  const plan = 'Step 1\n' + 'x'.repeat(20000) + '\nStep 9: Write lib/main.dart\nRun it: flutter run';
  m.addAnswer({ mode: 'leetcode', text: plan });
  assert.match(m.recentCodingSolve(), /Step 9: Write lib\/main\.dart\nRun it: flutter run$/);
  assert.match(m.codingHistory({ count: 1, maxChars: Infinity })[0], /Run it: flutter run$/);
  m.addAnswer({ mode: 'answerThis', text: 'y'.repeat(9000) });
  assert.equal(m.answers()[1].text.length, 6000);   // spoken answers keep their normal cap
});

test('typed help with an error is recognised; ordinary questions are not', () => {
  const { isFixRequest } = require('../renderer/spoken-question');
  for (const q of ['it cannot find ContactsRepository', 'I added the import and it did not work', 'help me figure out this error', 'fix this', 'what is wrong here', 'my name field shows undefined', 'the module is not resolving here', 'my tests are not running']) {
    assert.equal(isFixRequest(q), true, q);
  }
  for (const q of ['Tell me about yourself', 'how do I run it', 'why use a map', 'What is your biggest strength?',
    'what does undefined mean in JavaScript', "what's wrong with using a HashMap for this?",
    'Can you explain error handling patterns in Node.js?', 'What errors does this HTTP status code represent?',
    'Walk me through a time you debugged a production crash.', 'What is a stack trace?', 'What is undefined behavior in C++?']) {
    assert.equal(isFixRequest(q), false, q);
  }
});

test('a progress check carries what the candidate typed and looks for files never created', () => {
  const def = MODES.checkProgress;
  const prompt = def.build({ priorSolves: ['PLAN'], userText: 'it cannot find ContactsRepository' });
  assert.match(prompt, /What I am stuck on, in my words: it cannot find ContactsRepository/);
  assert.doesNotMatch(def.build({ priorSolves: ['PLAN'], userText: '' }), /stuck on/);
  assert.match(def.buildSystem('', ''), /never created: then the fix is to create it/);
});

test('a build task writes anything the task names but does not show', () => {
  assert.match(MODES.leetcode.buildSystem('', ''), /names but does not show[\s\S]*small working fake/);
});

test('a coding quick start asks only for the first part; the full solve continues from it', () => {
  const quick = MODES.leetcode.build({ priorSolves: [], quickStart: 'plan' });
  assert.match(quick, /QUICK START/);
  assert.match(quick, /BUILD TASK: only \*\*What it asks:\*\*.*\*\*Files to create:\*\*\. No steps/);
  const full = MODES.leetcode.build({ priorSolves: [], quickPlan: '**Files to create:** lib/data/contacts_repository.dart' });
  assert.match(full, /<quick_start>\n\*\*Files to create:\*\* lib\/data\/contacts_repository\.dart\n<\/quick_start>/);
  assert.match(full, /do not repeat any section it already has/);
  assert.doesNotMatch(MODES.leetcode.build({ priorSolves: [] }), /quick_start|QUICK START/);
});

test('fix my code reads the error on screen against the plan and gives whole files', () => {
  const def = MODES.fixCode;
  assert.equal(def.needsScreen, true);
  assert.equal(def.notAnswer, true);
  const prompt = def.build({ priorSolves: ['PLAN'], userText: 'it cannot find ContactsRepository' });
  assert.match(prompt, /The plan cue gave for this task:\n\nPLAN/);
  assert.match(prompt, /What I see, in my words: it cannot find ContactsRepository/);
  assert.match(def.buildSystem('', ''), /never created: then the fix is to create it/);
  assert.match(def.buildSystem('', ''), /the whole corrected file in one fenced block/);
});
