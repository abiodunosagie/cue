const test = require('node:test');
const assert = require('node:assert');
const { renderMarkdown } = require('../renderer/markdown');

// What the reader sees: tags dropped, entities decoded.
function visible(html) {
  return html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
}

test('escaped backticks inside inline code stay as backticks (JSX template literal)', () => {
  const answer = 'Use `<div>{name ? \\`Hello, ${name}!\\` : "Hello there!"}</div>`';
  const html = renderMarkdown(answer);
  assert.equal(visible(html), 'Use <div>{name ? `Hello, ${name}!` : "Hello there!"}</div>');
  assert.equal((html.match(/<code>/g) || []).length, 1);
});

test('double-backtick spans hold single backticks', () => {
  const html = renderMarkdown('Write `` `Hello, ${name}!` `` in JSX.');
  assert.equal(visible(html), 'Write `Hello, ${name}!` in JSX.');
  assert.match(html, /<code>`Hello, \$\{name\}!`<\/code>/);
});

test('escaped backtick outside code renders as a plain backtick', () => {
  assert.equal(visible(renderMarkdown('a \\` b')), 'a ` b');
});

test('a span ending in a backslash still closes (Windows path, no lost characters)', () => {
  const html = renderMarkdown('Use `C:\\\\Users\\\\` for the path.');
  assert.equal(html, '<p>Use <code>C:\\\\Users\\\\</code> for the path.</p>');
  assert.equal(visible(renderMarkdown('Split on `\\\\` then `x`.')), 'Split on \\\\ then x.');
});

test('an unmatched backtick is kept as text', () => {
  assert.equal(visible(renderMarkdown('use the ` key')), 'use the ` key');
});

test('plain inline code and bold still render', () => {
  assert.equal(renderMarkdown('Call `foo()` then **bar**.'), '<p>Call <code>foo()</code> then <strong>bar</strong>.</p>');
});

test('fenced code keeps template literals and escapes html', () => {
  const src = '```jsx\nexport default ({ name }) =>\n  <div>{name ? `Hello, ${name}!` : "Hello there!"}</div>;\n```';
  const html = renderMarkdown(src);
  assert.ok(html.startsWith('<pre><code>'));
  assert.ok(html.includes('{name ? `Hello, ${name}!` : &quot;Hello there!&quot;}'));
  assert.ok(!html.includes('<div>'));
});

test('bullets and paragraphs', () => {
  assert.equal(renderMarkdown('One\ntwo\n\n- a\n- `b`'), '<p>One two</p><ul><li>a</li><li><code>b</code></li></ul>');
});

test('model html is escaped, never injected', () => {
  const html = renderMarkdown('<img src=x onerror=alert(1)> `<script>`');
  assert.ok(!/<img|<script/.test(html));
});
