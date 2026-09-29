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

test('screen questions during a walkthrough point at what is shown, not at a story', () => {
  const { isScreenQuestion } = require('../renderer/spoken-question');
  const screen = [
    'Why did you use this notifier?', 'What happens when I tap that button?', 'why do you do it here?',
    'Can you show me where payments happen?', 'Where is the fare calculated?', 'What am I looking at?',
    'What does this widget do', 'Can you walk me through this?', 'Where in the code do you check the wallet balance?'
  ];
  const spoken = [
    'Tell me about yourself', 'Why did you choose Riverpod over Bloc?', 'How do you handle offline?',
    'Tell me about a time this happened', 'What was that like for you?', 'Why do you want to work here?',
    'What brings you here today?', 'How long have you been here?', 'Where do you see yourself in five years?',
    'Where did you study?', 'Tell me about that part of your job you liked', 'Why did you leave that service?',
    'Explain your approach to state management', 'What is the time complexity of a hash map lookup?', ''
  ];
  for (const t of screen) assert.equal(isScreenQuestion(t), true, t);
  for (const t of spoken) assert.equal(isScreenQuestion(t), false, t);
});
