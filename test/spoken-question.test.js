const test = require('node:test');
const assert = require('node:assert');
const { modeForSpokenQuestion } = require('../renderer/spoken-question');

test('questions about the shared screen read the screen', () => {
  for (const q of [
    'Can you take a look at this code and tell me what it does?',
    "I'm sharing my screen now, what would you change here?",
    'As you can see, the query is slow. How would you fix it?',
    'Walk me through this function.',
    'What is on the screen right now?'
  ]) assert.strictEqual(modeForSpokenQuestion(q), 'assist', q);
});

test('ordinary interview questions answer without a screenshot', () => {
  for (const q of [
    'Tell me about a challenging project you worked on?',
    'How do you look after your mental health under pressure?',
    'What would you look for in a new team?',
    'Where do you see yourself in five years?',
    'Can you share an example of a conflict you resolved?',
    'What are your salary expectations?',
    "Let's move on to this question: what is a hash table?",
    'What would you do in this problem if the array is empty?'
  ]) assert.strictEqual(modeForSpokenQuestion(q), 'answerThis', q);
});

test('empty input falls back to answering the text', () => {
  assert.strictEqual(modeForSpokenQuestion(''), 'answerThis');
  assert.strictEqual(modeForSpokenQuestion(undefined), 'answerThis');
});
