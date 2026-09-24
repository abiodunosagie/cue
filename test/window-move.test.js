const test = require('node:test');
const assert = require('node:assert/strict');
const { nudge } = require('../src/window-move');

const area = { x: 0, y: 25, width: 1440, height: 875 };
const win = { x: 400, y: 200, width: 700, height: 600 };

test('each arrow moves the window one step that way', () => {
  assert.deepEqual(nudge(win, area, 'left'), { x: 320, y: 200 });
  assert.deepEqual(nudge(win, area, 'right'), { x: 480, y: 200 });
  assert.deepEqual(nudge(win, area, 'up'), { x: 400, y: 120 });
  assert.deepEqual(nudge(win, area, 'down'), { x: 400, y: 280 });
});

test('the window never leaves the screen, even on a second display', () => {
  assert.deepEqual(nudge({ ...win, x: 30 }, area, 'left'), { x: 0, y: 200 });
  assert.deepEqual(nudge({ ...win, y: 280 }, area, 'down'), { x: 400, y: 300 });
  assert.deepEqual(nudge({ ...win, y: 60 }, area, 'up'), { x: 400, y: 25 });
  const second = { x: 1440, y: 0, width: 1920, height: 1080 };
  assert.deepEqual(nudge({ ...win, x: 1450 }, second, 'left'), { x: 1440, y: 200 });
  assert.deepEqual(nudge(win, area, 'sideways'), { x: 400, y: 200 });
});
