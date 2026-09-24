const test = require('node:test');
const assert = require('node:assert/strict');
const { createPaceMonitor } = require('../renderer/reading-tracker');

const words = (n) => Array.from({ length: n }, () => 'word').join(' ');

test('no judgement before 8 seconds and two turns of speech', () => {
  const p = createPaceMonitor();
  p.add(words(40), 0);
  assert.equal(p.check(9000), null);          // one turn only
  p.add(words(40), 5000);
  assert.equal(p.check(6000), null);          // only 6s since the first turn ended
});

test('a normal reading pace is not flagged (turns are stamped when they end)', () => {
  const p = createPaceMonitor();
  p.add(words(12), 5000); p.add(words(12), 10000); p.add(words(12), 15000);
  // 24 words spoken in the 10s after the first turn ended: 144 wpm.
  assert.deepEqual(p.check(15000), { wpm: 144, fast: false });
});

test('fast reading warns, and the warning holds between the two limits', () => {
  const p = createPaceMonitor();
  p.add(words(20), 0); p.add(words(20), 4000); p.add(words(20), 8000);
  assert.deepEqual(p.check(8000), { wpm: 300, fast: true });   // 40 words in the 8s after the first turn
  p.add(words(3), 10000);
  assert.deepEqual(p.check(14000), { wpm: 184, fast: true });  // 43 words in 14s: under 185, still warned
  assert.deepEqual(p.check(15000), { wpm: 172, fast: true });  // between 160 and 185: holds, no flicker
  // At 16.5s the first turn leaves the 15s window: 23 words in 12.5s = 110 wpm, calm, cleared.
  assert.deepEqual(p.check(16500), { wpm: 110, fast: false });
});

test('reset clears the warning and old speech drops out of the window', () => {
  const p = createPaceMonitor();
  p.add(words(20), 0); p.add(words(20), 5000); p.add(words(20), 10000);
  assert.equal(p.check(10000).fast, true);
  p.reset();
  assert.equal(p.check(10000), null);
  p.add(words(10), 0); p.add(words(10), 6000); p.add(words(10), 12000);
  assert.equal(p.check(40000), null);         // everything is older than 15s
});
