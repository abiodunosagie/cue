// The teleprompter follows the speaker word by word: never ahead, still when
// they stop, back on a restart, forward again after a skipped line.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createFollower } = require('../renderer/script-follow');
const { splitScript } = require('../renderer/script-blocks');

const SCRIPT = "Hi, I'm Abiodun Osagie, a Flutter developer from Lagos. For five years I have built mobile apps " +
  "for startups and banks. My last app, a full-stack wallet, now serves 40,000 users every month. " +
  "I care about clean code and clear communication. I would love to help you ship your next product.";

// The tokens a follower is on after hearing `said`, as display text.
const at = (f) => f.tokens[f.state().token];

test('a steady reader moves one word per word, interim results included', () => {
  const f = createFollower(SCRIPT);
  assert.equal(f.state().pos, -1);
  f.hear('hi', false);
  assert.equal(at(f), 'Hi,');
  f.hear("hi I'm Abiodun", false);
  assert.equal(at(f), 'Abiodun');
  f.hear("hi I'm Abiodun Osagie a Flutter developer", true);
  assert.equal(at(f), 'developer');
  f.hear('from Lagos', true);
  assert.equal(at(f), 'Lagos.');
});

test('it never runs ahead: words not yet said stay unread, and silence holds still', () => {
  const f = createFollower(SCRIPT);
  f.hear('hi I am', false);
  const before = f.state().pos;
  // A pause: the same interim again, then nothing.
  f.hear('hi I am', false);
  assert.equal(f.state().pos, before);
  assert.ok(f.tokens[f.state().token] !== 'Osagie,');
});

test('a dropped or misheard word does not stop it', () => {
  const f = createFollower(SCRIPT);
  f.hear("hi I'm Abiodun Osage a flutter developer from Lagos", true); // "Osagie" misheard
  assert.equal(at(f), 'Lagos.');
  f.hear('for 5 years I built mobile apps', true); // "have" dropped, "five" as a digit
  assert.equal(at(f), 'apps');
});

test('an ad-lib that is not in the script does not move it', () => {
  const f = createFollower(SCRIPT);
  f.hear("hi I'm Abiodun Osagie", true);
  const before = f.state().pos;
  f.hear('sorry let me get some water real quick', true);
  assert.equal(f.state().pos, before);
});

test('skipping a sentence: it finds the speaker again further on', () => {
  const f = createFollower(SCRIPT);
  f.hear("hi I'm Abiodun Osagie a Flutter developer from Lagos", true);
  f.hear('my last app a full stack wallet now serves', true); // skipped "For five years ... banks."
  assert.equal(at(f), 'serves');
});

test('restarting a sentence goes back to where it starts', () => {
  const f = createFollower(SCRIPT);
  f.hear('I care about clean code and clear', true);
  const later = f.state().pos;
  assert.ok(later > 0, 'found the sentence by resyncing');
  f.hear('I care about clean code and clear communication', true);
  assert.equal(at(f), 'communication.');
});

test('the end of the script is reported', () => {
  const f = createFollower('Thank you for watching.');
  f.hear('thank you for watching', true);
  assert.equal(f.state().done, true);
});

test('a pasted script is cut into short blocks; blank lines always start a new one', () => {
  const long = Array.from({ length: 8 }, (_, i) => `This is sentence number ${i + 1} of the intro I will read.`).join(' ');
  const blocks = splitScript(long + '\n\nSecond part.');
  assert.ok(blocks.length >= 3);
  assert.equal(blocks[blocks.length - 1], 'Second part.');
  assert.ok(blocks.every((b) => b.split(/\s+/).length <= 45));
  assert.deepEqual(splitScript('  \n\n '), []);
});

test('built from the paragraphs as the panel builds it: tokens, paragraphs and a lone dash line up', () => {
  const text = 'Hi, I am Ada - a full-stack developer.\n\nThanks for watching.';
  const f = createFollower(splitScript(text));
  assert.deepEqual(f.tokens, ['Hi,', 'I', 'am', 'Ada', '-', 'a', 'full-stack', 'developer.', 'Thanks', 'for', 'watching.']);
  assert.deepEqual(f.tokenBlocks, [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1]);
  f.hear('hi I am Ada a full stack developer', true);
  assert.equal(f.tokens[f.state().token], 'developer.');
  f.hear('thanks for watching', true);
  assert.equal(f.state().done, true);
});

test('a phrase the script says twice carries on forward, word by word, and never jumps back', () => {
  const f = createFollower('Thank you so much for having me today. Now let me tell you about myself. Thank you so much for the opportunity to speak with you.');
  f.hear('thank you so much for having me today now let me tell you about myself', true);
  assert.equal(f.tokens[f.state().token], 'myself.');
  const trail = [];
  const third = 'thank you so much for the opportunity to speak'.split(' ');
  for (let n = 1; n <= third.length; n++) { f.hear(third.slice(0, n).join(' '), n === third.length); trail.push(f.state().token); }
  // Monotonic, one word per word, inside the third sentence.
  assert.deepEqual(trail, [15, 16, 17, 18, 19, 20, 21, 22, 23]);
});
