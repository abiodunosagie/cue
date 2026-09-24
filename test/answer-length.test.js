const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeLength, nextLength, lengthRule } = require('../src/answer-length');

test('unknown or missing lengths fall back to medium', () => {
  assert.equal(normalizeLength(undefined), 'medium');
  assert.equal(normalizeLength('huge'), 'medium');
  assert.equal(normalizeLength('short'), 'short');
});

test('the shortcut cycles short, medium, long and back', () => {
  assert.equal(nextLength('short'), 'medium');
  assert.equal(nextLength('medium'), 'long');
  assert.equal(nextLength('long'), 'short');
  assert.equal(nextLength('bogus'), 'long');
});

test('medium keeps the prompts unchanged; short and long override the length rules', () => {
  assert.equal(lengthRule('medium'), '');
  assert.equal(lengthRule(undefined), '');
  assert.match(lengthRule('short'), /^\n\nLENGTH: SHORT\. One or two sentences, under 35 words.*overrides/);
  assert.match(lengthRule('long'), /^\n\nLENGTH: LONG\..*120 to 170 words.*real material/);
});
