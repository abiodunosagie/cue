const test = require('node:test');
const assert = require('node:assert/strict');
const { joinTextItems, cleanPdfText } = require('../src/resume');

const item = (str, x, y, width, size = 10) => ({ str, width, transform: [size, 0, 0, size, x, y] });

test('pieces on one line separated by a visible gap get a space', () => {
  // "Jordan Lee" and "Carter" drawn as two pieces with no space character.
  assert.equal(joinTextItems([item('Jordan Lee', 0, 700, 60), item('Carter', 64, 700, 30)]), 'Jordan Lee Carter');
});

test('pieces that touch stay one word, and a new line starts a new line', () => {
  assert.equal(joinTextItems([item('Flut', 0, 700, 20), item('ter', 20.5, 700, 15), item('Dart', 0, 680, 20)]), 'Flutter\nDart');
});

test('no double space when a piece already carries one', () => {
  assert.equal(joinTextItems([item('Riverpod ', 0, 700, 45), item('and', 50, 700, 15)]), 'Riverpod and');
});

test('icon-font bullets become plain dashes', () => {
  assert.equal(cleanPdfText('Skills\n Flutter\nDart\nend'), 'Skills\n- Flutter\n- Dart\nend');
});

test('plain text and Markdown files import as they are', async () => {
  const fs = require('node:fs'); const os = require('node:os'); const path = require('node:path');
  const { parseDocumentFile } = require('../src/resume');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-resume-'));
  fs.writeFileSync(path.join(dir, 'cv.txt'), '  Jordan Lee Carter\nFlutter developer\n');
  fs.writeFileSync(path.join(dir, 'cv.md'), '# Jordan Lee Carter\n');
  assert.equal(await parseDocumentFile(path.join(dir, 'cv.txt')), 'Jordan Lee Carter\nFlutter developer');
  assert.equal(await parseDocumentFile(path.join(dir, 'cv.md')), '# Jordan Lee Carter');
  await assert.rejects(parseDocumentFile(path.join(dir, 'cv.rtf')), /PDF, DOCX, TXT or Markdown/);
});
