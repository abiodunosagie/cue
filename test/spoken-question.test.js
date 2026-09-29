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

test('a heard question counts as whole past a leading filler, and a short one only when it ends on a real word', () => {
  const { isLikelyCompleteQuestion } = require('../renderer/spoken-question');
  const whole = ['and why Riverpod here', 'so what does this notifier do', 'okay, how do you test it?', 'Tell me about yourself', 'How do you handle state in a large app', 'why this notifier and not bloc'];
  const notYet = ['how do you', 'what is the', 'okay nice', 'and that is all for now', 'so um', ''];
  for (const t of whole) assert.equal(isLikelyCompleteQuestion(t), true, t);
  for (const t of notYet) assert.equal(isLikelyCompleteQuestion(t), false, t);
});

test('the question in a long interviewer turn is found by its last sentence, never an explanation', () => {
  const { questionToAnswer } = require('../renderer/spoken-question');
  const cases = [
    ['So what we do at Acme is logistics. We have forty engineers.', 'statement', ''],
    ['What does that mean? It means we move goods across Lagos every day.', 'statement', ''],
    ['and that is the platform we are building. Does that make sense?', 'checkin', ''],
    ['How would you handle offline sync? Our drivers are in rural areas with bad signal.', 'statement', ''],
    ['We use Riverpod everywhere. Why did you choose it over Bloc?', 'question', 'We use Riverpod everywhere. Why did you choose it over Bloc?'],
    ['Our app has a lot of screens and heavy maps. How would you approach that?', 'question', 'Our app has a lot of screens and heavy maps. How would you approach that?'],
    ['So basically we are a small team, five people, remote. I would love to hear about your experience with payments.', 'question', 'I would love to hear about your experience with payments.'],
    ['What you will be doing is building the driver app', 'statement', ''],
    ['We are hiring for a senior role, right?', 'checkin', ''],
    ['Is that something you have done, right?', 'question', 'Is that something you have done, right?'],
    ['Tell me about yourself.', 'question', 'Tell me about yourself.'],
    ['', 'statement', '']
  ];
  const tails = [
    ['Tell me about a time you led a team. Take your time.', 'question', 'Tell me about a time you led a team.'],
    ['What is your biggest weakness? Be honest.', 'question', 'What is your biggest weakness?'],
    ['We use tools e.g. Riverpod and Bloc. How would you compare them?', 'question', 'We use tools e.g. Riverpod and Bloc. How would you compare them?'],
    ['so we are a company that moves goods and we started in lagos and then we raised money and we have forty engineers and we want someone who can tell us how they handle things', 'statement', ''],
    ['Okay. Right. Does that make sense?', 'checkin', '']
  ];
  cases.push(...tails);
  for (const [text, state, question] of cases) {
    assert.deepEqual(questionToAnswer(text), { state, question }, text);
  }
});

test('a question asked again right after its answer is recognised, a different one is not', () => {
  const { isSameQuestion, asksEarlier } = require('../renderer/spoken-question');
  assert.equal(isSameQuestion('Why did you choose Riverpod over Bloc?', 'So again, why did you choose Riverpod over Bloc?'), true);
  assert.equal(isSameQuestion('How do you test it?', 'How do you deploy it?'), false);
  assert.equal(isSameQuestion('', 'x'), false);
  assert.equal(asksEarlier('How would you handle offline sync? Our drivers are in rural areas.'), true, 'the turn check looks at this one');
  assert.equal(asksEarlier('We are a logistics company. We have forty engineers.'), false);
});

test('a question the interviewer paused in the middle of waits for the rest', () => {
  const { questionToAnswer } = require('../renderer/spoken-question');
  for (const t of ['Tell me about a time when', 'Can you tell me about', 'Walk me through', 'How would you', 'Why did you choose', 'Have you ever', 'Describe a time', 'Tell me about your', 'What are your biggest', 'How would you approach designing the']) {
    assert.notEqual(questionToAnswer(t).state, 'question', t);
  }
  for (const t of ['so what does this notifier do', 'which state library do you use', 'why did you do that', 'Have you ever led a team']) assert.equal(questionToAnswer(t).state, 'question', t);
  assert.equal(questionToAnswer('Can you hear me okay?').state, 'checkin');
});
