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
