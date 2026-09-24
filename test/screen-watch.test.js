const test = require('node:test');
const assert = require('node:assert/strict');
const { createScreenWatcher, changedShare, maskRect, scaleRect, parseDetection, isSameQuestion } = require('../src/screen-watch');

const bitmap = (w, h, v) => Buffer.alloc(w * h * 4, v);

test('changed share counts cells whose brightness moved past the noise step', () => {
  const a = bitmap(4, 1, 10);
  const b = Buffer.from(a);
  assert.equal(changedShare(a, b), 0);
  b.fill(200, 0, 8); // two of four cells
  assert.equal(changedShare(a, b), 0.5);
  const c = Buffer.from(a); c.fill(20, 0, 16); // +10: noise
  assert.equal(changedShare(a, c), 0);
  assert.equal(changedShare(null, b), 1);
});

test('the mask blacks out only the panel rectangle, clamped to the image', () => {
  const img = bitmap(4, 2, 255);
  maskRect(img, 4, 2, { x: 2, y: 1, width: 10, height: 10 });
  const px = (x, y) => img[(y * 4 + x) * 4];
  assert.equal(px(0, 0), 255); assert.equal(px(3, 0), 255); assert.equal(px(1, 1), 255);
  assert.equal(px(2, 1), 0); assert.equal(px(3, 1), 0);
  assert.deepEqual(scaleRect({ x: 100, y: 50, width: 200, height: 100 }, { x: 0, y: 0, width: 1000, height: 500 }, 500, 250), { x: 50, y: 25, width: 100, height: 50 });
});

test('detector replies are parsed strictly', () => {
  assert.deepEqual(parseDetection('QUESTION: How would you design an offline-first notes app?'), { kind: 'question', text: 'How would you design an offline-first notes app?' });
  assert.deepEqual(parseDetection('coding:  Reverse a linked list\n in place.'), { kind: 'coding', text: 'Reverse a linked list in place.' });
  assert.equal(parseDetection('NONE'), null);
  assert.equal(parseDetection('I think there is a question here'), null);
  assert.equal(parseDetection('QUESTION: ok'), null);
});

test('same question: most words shared either way', () => {
  assert.equal(isSameQuestion('How would you design an offline first notes app?', 'so how would you design an offline notes app'), true);
  assert.equal(isSameQuestion('How would you design an offline first notes app?', 'Tell me about yourself'), false);
});

function harness({ replies, thumbs, recent = [] }) {
  let t = 0;
  const detected = [];
  let calls = 0;
  const w = createScreenWatcher({
    capture: async () => ({ thumb: thumbs.shift(), dataUrl: 'data:x' }),
    detect: async () => { calls++; return replies.shift(); },
    isActive: () => true,
    recentQuestions: () => recent,
    onDetect: (d) => detected.push(d),
    now: () => (t += 1000)
  });
  return { w, detected, calls: () => calls };
}

test('only a big screen change asks the model, and a question is acted on once', async () => {
  const same = bitmap(10, 10, 10);
  const changed = bitmap(10, 10, 200);
  const h = harness({ replies: ['QUESTION: How do you handle offline sync on mobile?', 'QUESTION: How do you handle offline sync on mobile?'], thumbs: [same, same, changed, same] });
  await h.w.tick();                     // first look: counts as a change
  assert.equal(h.detected.length, 1);
  await h.w.tick();                     // unchanged: no model call
  assert.equal(h.calls(), 1);
  await h.w.tick();                     // changed, same question still there: ignored
  assert.equal(h.calls(), 2);
  assert.equal(h.detected.length, 1);
});

test('a question the interviewer just said out loud is not answered again from the screen', async () => {
  const h = harness({ replies: ['QUESTION: How do you handle offline sync on mobile?'], thumbs: [bitmap(2, 2, 1)], recent: [{ text: 'how do you handle offline sync on mobile', ts: 500 }] });
  await h.w.tick();
  assert.equal(h.detected.length, 0);
});

test('nothing runs while inactive, and a failed capture waits for the next tick', async () => {
  let active = false;
  const detected = [];
  const w = createScreenWatcher({
    capture: async () => { throw new Error('no permission'); },
    detect: async () => 'QUESTION: never asked',
    isActive: () => active,
    recentQuestions: () => [],
    onDetect: (d) => detected.push(d)
  });
  await w.tick();
  active = true;
  await w.tick();
  assert.equal(detected.length, 0);
});

test('a spoken question older than the recent window no longer blocks the same question on screen', async () => {
  const h = harness({ replies: ['QUESTION: How do you handle offline sync on mobile?'], thumbs: [bitmap(2, 2, 1)], recent: [{ text: 'how do you handle offline sync on mobile', ts: 1000 - 91000 }] });
  await h.w.tick();
  assert.equal(h.detected.length, 1);
});
