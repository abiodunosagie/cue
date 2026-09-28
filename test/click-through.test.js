const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('every sheet that takes pointer events in CSS also stops click-through', () => {
  const css = read('renderer/styles.css');
  const rule = /^([^{}\n]*#panel-wrap[^{}\n]*)\{\s*pointer-events:\s*auto;/m.exec(css);
  assert.ok(rule, 'the pointer-events rule for the UI parts');
  const cssIds = rule[1].match(/#[\w-]+/g);
  const js = read('renderer/renderer.js');
  const selector = /const UI_SELECTOR = '([^']+)'/.exec(js);
  assert.ok(selector, 'UI_SELECTOR in renderer.js');
  const jsIds = new Set(selector[1].match(/#[\w-]+/g));
  for (const id of cssIds) assert.ok(jsIds.has(id), id + ' takes clicks in CSS but the mouse passes through it');
  // The Script window: its clicks and pastes went to the app behind it.
  assert.ok(jsIds.has('#script-scrim'));
});

test('the question bundle exists before a crashed practice is cleared at launch', () => {
  const main = read('main.js');
  const declared = main.indexOf('const questionBundle = createQuestionBundle();');
  const launchClear = main.indexOf('if (fs.existsSync(PRACTICE_MARKER)) {');
  assert.ok(declared > 0 && launchClear > 0);
  assert.ok(declared < launchClear, 'clearInterview() at launch would hit questionBundle before it is declared');
  assert.ok(main.indexOf('let currentLibraryId = null;') < launchClear);
});
