const test = require('node:test');
const assert = require('node:assert/strict');
const { createStreamSplitter } = require('../renderer/stream-blocks');

// Feed tokens, return the blocks as the renderer would group them.
function blocks(tokens) {
  const s = createStreamSplitter();
  const out = [''];
  for (const t of tokens) {
    for (const p of s.push(t)) {
      if (p.break) out.push('');
      else out[out.length - 1] += p.text;
    }
  }
  return out;
}
// Every chunking of the same text must give the same blocks.
function chunked(text, size) {
  const parts = [];
  for (let i = 0; i < text.length; i += size) parts.push(text.slice(i, i + size));
  return parts;
}

test('blank lines split paragraphs, even split across tokens', () => {
  const text = 'First para here.\n\nSecond para.';
  for (const size of [1, 2, 3, 50]) assert.deepEqual(blocks(chunked(text, size)), ['First para here.', 'Second para.'], 'size ' + size);
});

test('bullets and numbered items start blocks; hyphens, bold and years do not', () => {
  const text = 'Intro:\n- one\n- two\n1. step\n12) step\n-5 degrees\n**Say:** this\n2024 was busy';
  for (const size of [1, 3, 80]) {
    assert.deepEqual(blocks(chunked(text, size)), ['Intro:', '- one', '- two', '1. step', '12) step\n-5 degrees\n**Say:** this\n2024 was busy'], 'size ' + size);
  }
});

test('an opening code fence after a blank line is its own block, and blank lines inside it are not breaks', () => {
  const text = 'Here is the code.\n\n```js\nconst a = 1;\n\nconst b = 2;\n```\n\nThat is it.';
  const want = ['Here is the code.', '```js\nconst a = 1;\n\nconst b = 2;\n```', 'That is it.'];
  for (const size of [1, 2, 4, 200]) assert.deepEqual(blocks(chunked(text, size)), want, 'size ' + size);
  assert.deepEqual(blocks(['Here is the code.\n\n``', '`js\nconst a = 1;\n\nconst b = 2;\n``', '`\n\nThat is it.']), want);
});

test('the first line never opens with a break', () => {
  assert.deepEqual(blocks(['\n\n- first']), ['- first']);
});
