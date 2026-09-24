const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaceMonitor } = require('../renderer/reading-tracker');

const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

test('no judgement before 8 seconds and two turns of speech', () => {
  const p = createPaceMonitor();
  p.add(words(40), 0);
  assert.equal(p.check(9000), null);          // one turn only
  p.add(words(40), 5000);
  assert.equal(p.check(6000), null);          // only 6s of speech
});

test('fast reading warns, and the warning holds until the pace is clearly calm', () => {
  const p = createPaceMonitor();
  p.add(words(15), 0); p.add(words(15), 4000); p.add(words(15), 8000);
  const fast = p.check(9000);                 // 45 words in 9s = 300 wpm
  assert.equal(fast.fast, true);
  p.reset();
  p.add(words(12), 0); p.add(words(12), 8000); // 24 words in 9s = 160 wpm: between the two limits
  assert.equal(p.check(9000).fast, false);    // reset cleared the earlier warning
});

test('a calm pace does not warn and old speech drops out of the window', () => {
  const p = createPaceMonitor();
  p.add(words(10), 0); p.add(words(10), 6000); p.add(words(10), 12000);
  assert.equal(p.check(13000).fast, false);   // 30 words in 13s = about 138 wpm
  assert.equal(p.check(40000), null);         // everything is older than 15s
});
