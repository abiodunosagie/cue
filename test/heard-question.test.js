const test = require('node:test');
const assert = require('node:assert/strict');
const { answeredQuestion } = require('../src/heard-question');

test('answered question: heard question for answerThis, newest interviewer turn otherwise, none for other modes', () => {
  const transcript = [{ channel: 'them', text: 'Why Flutter?' }, { channel: 'you', text: 'I like it.' }, { channel: 'them', text: 'How do you test?' }];
  assert.equal(answeredQuestion('answerThis', ' Why Flutter? ', transcript), 'Why Flutter?');
  assert.equal(answeredQuestion('say', '', transcript), 'How do you test?');
  assert.equal(answeredQuestion('assist', '', transcript), 'How do you test?');
  assert.equal(answeredQuestion('ask', 'x', transcript), '');
  assert.equal(answeredQuestion('leetcode', 'x', transcript), '');
  assert.equal(answeredQuestion('say', '', []), '');
});
