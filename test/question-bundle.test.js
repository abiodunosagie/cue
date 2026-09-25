// The question bundle: every tab of one coding question, read together.
const test = require('node:test');
const assert = require('node:assert/strict');
const { createQuestionBundle } = require('../src/question-bundle');
const { createInterviewMemory } = require('../src/interview-memory');
const { MODES } = require('../src/prompts');

// Ten-cell thumbs: ids 1 to 5 differ in every cell; `typed` flips one cell
// (the editor after some typing: the same tab).
const screen = (id, typed = 0) => {
  const thumb = Buffer.alloc(10 * 4, id * 40);
  for (let c = 0; c < typed; c++) thumb.fill(255, c * 4, c * 4 + 4);
  return { thumb, image: `tab${id}` + (typed ? `+${typed}` : '') };
};

test('views are labelled in the order seen, with the newest marked on screen now', () => {
  const b = createQuestionBundle();
  b.add([screen(1), screen(2)]);   // instructions, scrolled: 2 pages
  b.add([screen(3)]);              // tests tab
  assert.deepEqual(b.labelled().map((s) => [s.image, s.label]), [
    ['tab1', 'View 1 of 2, page 1 of 2'],
    ['tab2', 'View 1 of 2, page 2 of 2'],
    ['tab3', 'View 2 of 2, on screen now']
  ]);
  assert.equal(b.count(), 3);
  assert.equal(b.viewCount(), 2);
});

test('the same tab seen again replaces its old copy in place: the editor after typing', () => {
  const b = createQuestionBundle();
  b.add([screen(1)]);
  b.add([screen(4)]);              // the editor
  b.add([screen(1)]);              // back to the instructions: nothing new
  const r = b.add([screen(4, 1)]); // the editor again, one line typed
  assert.deepEqual(r, { ok: true, added: 0, replaced: 1 });
  assert.deepEqual(b.labelled().map((s) => [s.image, s.label]), [
    ['tab1', 'View 1 of 2'],
    ['tab4+1', 'View 2 of 2, on screen now']
  ]);
});

test('two new pages like one kept screen: the first replaces it, the second is kept too', () => {
  const b = createQuestionBundle();
  b.add([screen(4)]);
  // Each differs from the kept editor in one cell, from each other in two.
  const lastCell = screen(4);
  lastCell.thumb.fill(255, 9 * 4, 10 * 4);
  const r = b.add([screen(4, 1), { ...lastCell, image: 'tab4-scrolled' }]);
  assert.deepEqual(r, { ok: true, added: 1, replaced: 1 });
  assert.deepEqual(b.labelled().map((s) => s.image), ['tab4+1', 'tab4-scrolled']);
});

test('a tab switch that changes a fifth of the screen (a narrow pane) is a new tab, not a replacement', () => {
  const b = createQuestionBundle();
  b.add([screen(1)]);
  b.add([screen(1, 2)]); // 2 of 10 cells differ: another tab in the same pane
  assert.deepEqual(b.labelled().map((s) => s.image), ['tab1', 'tab1+2']);
});

test('a view that would pass the cap is refused whole, and clear() empties it', () => {
  const b = createQuestionBundle({ maxScreens: 3 });
  assert.equal(b.add([screen(1), screen(2)]).ok, true);
  assert.deepEqual(b.add([screen(3), screen(4)]), { ok: false, added: 0, replaced: 0 });
  assert.equal(b.count(), 2);
  // Refused pages still reach the model, as the last view, on screen now.
  assert.deepEqual(b.labelled([screen(3), screen(4)]).map((s) => [s.image, s.label]), [
    ['tab1', 'View 1 of 2, page 1 of 2'],
    ['tab2', 'View 1 of 2, page 2 of 2'],
    ['tab3', 'View 2 of 2, page 1 of 2, on screen now'],
    ['tab4', 'View 2 of 2, page 2 of 2, on screen now']
  ]);
  // A tab already kept still updates at the cap.
  assert.equal(b.add([screen(2, 1)]).ok, true);
  b.clear();
  assert.equal(b.count(), 0);
  assert.deepEqual(b.labelled(), []);
});

test('labels reach the model: a named screen keeps its label, unnamed ones get page numbers', () => {
  const { _test } = require('../src/llm');
  const url = (b) => 'data:image/jpeg;base64,' + b;
  const named = _test.turnImages(null, [{ url: url('AA'), label: 'View 1 of 2' }, { url: url('BB'), label: 'View 2 of 2, on screen now' }]);
  assert.deepEqual(named.map((i) => [i.b64, i.label]), [['AA', 'View 1 of 2:'], ['BB', 'View 2 of 2, on screen now:']]);
  const parts = _test.openAIContent('Solve it', named);
  assert.deepEqual(parts.map((p) => p.type === 'text' ? p.text : p.image_url.url), ['Solve it', 'View 1 of 2:', url('AA'), 'View 2 of 2, on screen now:', url('BB')]);
});

test('Next question: earlier coding solves stop reaching coding prompts, the interview stays', () => {
  let t = 1000;
  const memory = createInterviewMemory({ now: () => t });
  memory.addAnswer({ mode: 'leetcode', text: 'question 1 solution' });
  t = 2000;
  memory.markNewQuestion();
  assert.deepEqual(memory.codingHistory(), []);
  assert.equal(memory.recentCodingSolve(), '');
  assert.equal(memory.answers().length, 1);
  t = 3000;
  memory.addAnswer({ mode: 'leetcode', text: 'question 2 solution' });
  assert.deepEqual(memory.codingHistory(), ['question 2 solution']);
  assert.equal(memory.recentCodingSolve(), 'question 2 solution');
  // A solve asked for before the next Next question but finished after it
  // belongs to the question it started on.
  t = 5000;
  memory.markNewQuestion();
  t = 9000;
  memory.addAnswer({ mode: 'leetcode', text: 'late question 2 solution', ts: 4000 });
  assert.deepEqual(memory.codingHistory(), []);
});

test('coding prompt: gathered views read as one question; every answer says where the code goes', () => {
  const gathered = MODES.leetcode.build({ pages: 3, views: 2 });
  assert.match(gathered, /3 screenshots in 2 views of the SAME question/);
  assert.match(gathered, /the tests are the specification/);
  assert.doesNotMatch(gathered, /taller than the screen/);
  assert.match(MODES.leetcode.build({ pages: 3, views: 1 }), /taller than the screen/);
  const system = MODES.leetcode.buildSystem(null);
  assert.match(system, /Always say WHERE each piece of code goes/);
  assert.match(system, /\*\*Where it goes:\*\*/);
  assert.match(system, /Run tests button/);
  assert.match(MODES.leetcode.build({ quickStart: 'plan' }), /\*\*Where it goes:\*\*/);
  assert.match(MODES.checkProgress.buildSystem('', ''), /starting with where it goes/);
});
