const test = require('node:test');
const assert = require('node:assert/strict');
const { followUpPrompt, createFollowUpBank } = require('../src/follow-ups');
const { findMatch, parseItems } = require('../src/prepared-answers');

test('the prompt carries the question and the answer as fenced data, and asks for JSON', () => {
  const p = followUpPrompt('How did you handle offline sync?', 'I queued writes locally.');
  assert.match(p, /<question>\nHow did you handle offline sync\?\n<\/question>/);
  assert.match(p, /<answer>\nI queued writes locally\.\n<\/answer>/);
  assert.match(p, /JSON only/);
  assert.match(p, /only the candidate's real stories/);
});

test('the bank keeps the newest follow-ups, matches them, and clears', () => {
  const bank = createFollowUpBank({ max: 3 });
  bank.add(parseItems('[{"question":"What would you do differently next time?","variants":["Looking back, what would you change?"],"answer":"A1"}]'));
  bank.add(parseItems('[{"question":"How did you measure the result?","variants":["How did you know it worked?"],"answer":"A2"},{"question":"Q3","answer":"A3"},{"question":"Q4","answer":"A4"}]'));
  assert.deepEqual(bank.items().map((i) => i.answer), ['A2', 'A3', 'A4']);
  assert.equal(findMatch(bank.items(), 'How did you know it worked').item.answer, 'A2');
  bank.clear();
  assert.deepEqual(bank.items(), []);
});
