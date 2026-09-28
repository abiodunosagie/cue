const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCodingLibrary, parseIdentified, identifyTask, confirmSameTask, MAX_ITEMS } = require('../src/coding-library');

const TWO_SUM = {
  title: 'Two Sum',
  statement: 'Given an array of integers nums and an integer target, return the indices of the two numbers that add up to target. ' +
    'Function twoSum(nums, target). Exactly one solution exists; the same element may not be used twice. Example: nums [2,7,11,15], target 9 gives [0,1].',
  language: 'python'
};
const MERGE = {
  title: 'Merge Intervals',
  statement: 'Given a list of intervals, merge all overlapping intervals and return the merged list sorted by start. Function merge(intervals). Example [[1,3],[2,6]] gives [[1,6]].',
  language: 'python'
};

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-lib-')), 'lib.json');
}

test('the identify reply is read only when it names a coding task', () => {
  assert.deepEqual(parseIdentified('```json\n{"coding": true, "title": "Two Sum", "statement": "find two", "language": "Python"}\n```'),
    { title: 'Two Sum', statement: 'find two', language: 'python' });
  assert.equal(parseIdentified('{"coding": false, "title": "", "statement": "", "language": ""}'), null);
  assert.equal(parseIdentified('{"coding": true, "title": "x", "statement": "", "language": ""}'), null);
  assert.equal(parseIdentified('not json'), null);
  assert.equal(parseIdentified('{"coding": true, "statement": "s"'), null);
  assert.equal(parseIdentified('{"coding": true, "statement": "just the statement"}').title, 'just the statement');
});

test('identify and confirm fall back to a fresh solve on any failure', async () => {
  const failing = { stream: async () => { throw new Error('down'); } };
  assert.equal(await identifyTask({ llm: failing, imageDataUrl: 'data:x' }), null);
  assert.deepEqual(await confirmSameTask({ llm: failing, now: TWO_SUM, saved: TWO_SUM }), { same: false, reason: '' });
  const reply = (text) => ({ stream: async () => text });
  assert.deepEqual(await confirmSameTask({ llm: reply('SAME'), now: TWO_SUM, saved: TWO_SUM }), { same: true, reason: '' });
  assert.deepEqual(await confirmSameTask({ llm: reply('DIFFERENT: the target is now a range.'), now: TWO_SUM, saved: TWO_SUM }), { same: false, reason: 'the target is now a range.' });
  assert.equal((await confirmSameTask({ llm: reply('Maybe the same'), now: TWO_SUM, saved: TWO_SUM })).same, false);
});

test('a saved task is found again in other words, never across languages or for another task', () => {
  const lib = createCodingLibrary({});
  lib.save({ ...TWO_SUM, solution: 'def twoSum(nums, target): ...' });
  lib.save({ ...MERGE, solution: 'def merge(intervals): ...' });
  const reread = { title: 'Two Sum', language: 'python', statement: 'Return indices of the two numbers in nums that add up to the target. twoSum(nums, target). One solution exists, no element used twice. nums [2,7,11,15] target 9 -> [0,1].' };
  assert.equal(lib.candidate(reread).item.title, 'Two Sum');
  assert.equal(lib.candidate({ ...reread, language: 'javascript' }), null);
  assert.equal(lib.candidate({ ...reread, language: '' }).item.title, 'Two Sum');
  assert.equal(lib.candidate({ title: 'Reverse a string', language: 'python', statement: 'Reverse the characters of a string s in place and return it.' }), null);
});

test('saving replaces by id, flags stick until the next save, and the file survives a reload', () => {
  const file = tmpFile();
  let t = 1000;
  const lib = createCodingLibrary({ file, now: () => t });
  const first = lib.save({ ...TWO_SUM, solution: 'OLD' });
  lib.markUsed(first.id);
  assert.equal(lib.flag(first.id, 'misses the empty array'), true);
  assert.equal(lib.get(first.id).flagged, 'misses the empty array');
  t = 2000;
  const fixed = lib.save({ ...TWO_SUM, id: first.id, solution: 'NEW' });
  assert.equal(fixed.id, first.id);
  assert.equal(fixed.createdAt, 1000);
  assert.equal(fixed.updatedAt, 2000);
  assert.equal(fixed.uses, 1);
  assert.equal(fixed.flagged, '');
  assert.equal(lib.count(), 1);
  assert.equal((fs.statSync(file).mode & 0o777), 0o600);

  const again = createCodingLibrary({ file });
  again.load();
  assert.equal(again.get(first.id).solution, 'NEW');
  assert.equal(again.remove(first.id), true);
  assert.equal(again.count(), 0);
});

test('the library keeps the newest items up to its cap and drops malformed ones on load', () => {
  const lib = createCodingLibrary({});
  for (let i = 0; i < MAX_ITEMS + 5; i++) lib.save({ title: 'T' + i, statement: 'task number ' + i, language: '', solution: 'S' });
  assert.equal(lib.count(), MAX_ITEMS);
  assert.equal(lib.list()[0].title, 'T' + (MAX_ITEMS + 4));

  const file = tmpFile();
  fs.writeFileSync(file, JSON.stringify({ items: [{ id: 'a', title: 'ok', statement: 's', solution: 'x' }, { id: 'b', title: 'no solution', statement: 's' }, null, 'junk'] }));
  const loaded = createCodingLibrary({ file });
  assert.equal(loaded.load().length, 1);
  assert.equal(createCodingLibrary({ file: tmpFile() }).load().length, 0);
  assert.equal(lib.save({ title: '', statement: '', solution: '' }), null);
});
