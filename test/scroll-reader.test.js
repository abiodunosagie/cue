const test = require('node:test');
const assert = require('node:assert/strict');
const { readScrollPages, fitPages, PAGE_STEPS } = require('../src/scroll-reader');

// A 10-cell thumb: ids 1 to 5 differ from each other in every cell, the same
// id is the same view; `noise` cells flicker (a camera tile).
const thumb = (id, noise = 0) => {
  const t = Buffer.alloc(10 * 4, (id * 40) % 256);
  for (let c = 0; c < noise; c++) t.fill(((id * 40) + 128) % 256, c * 4, c * 4 + 4);
  return t;
};

// A fake clock and screen: frames[i] is the view at tick i (a number is a
// page id, null a failed capture); the last frame repeats.
function run(frames, opts = {}) {
  let t = 0;
  let tick = 0;
  const pages = [];
  const reader = readScrollPages({
    capture: async () => {
      const f = frames[Math.min(tick, frames.length - 1)];
      tick++;
      if (f instanceof Error) throw f;
      return f === null ? null : { thumb: typeof f === 'object' ? f : thumb(f), image: 'img' + (typeof f === 'object' ? 'x' : f) };
    },
    onPage: (n) => pages.push(n),
    now: () => t,
    wait: async (ms) => { t += ms; },
    ...opts
  });
  return { reader, pages, ticks: () => tick };
}

test('keeps the first screen, then each settled new view, and ends when still', async () => {
  // Page 1, scrolling (2 changes tick to tick), settle on page 3, scroll, settle on 5.
  const { reader, pages } = run([1, 2, 3, 3, 4, 5, 5]);
  const got = await reader.done;
  assert.deepEqual(got.map((p) => p.image), ['img1', 'img3', 'img5']);
  assert.deepEqual(pages, [1, 2, 3]);
});

test('a view that is still mid-scroll is never kept', async () => {
  const { reader } = run([1, 2, 3, 4, 4]);
  assert.deepEqual((await reader.done).map((p) => p.image), ['img1', 'img4']);
});

test('camera-tile noise below the change share is neither movement nor a page', async () => {
  // Same view with 2 of 10 cells flickering (0.2 < 0.25), then nothing else.
  const frames = [thumb(1), thumb(1, 2), thumb(1), thumb(1, 2)];
  const { reader } = run(frames, { stillBeforeScrollMs: 2000, tickMs: 700 });
  const got = await reader.done;
  assert.equal(got.length, 1);
});

test('before any scroll it waits longer, after a scroll it ends sooner', async () => {
  const before = run([1], { stillBeforeScrollMs: 5000, stillAfterScrollMs: 2000, tickMs: 1000 });
  await before.reader.done;
  const after = run([1, 2, 2], { stillBeforeScrollMs: 5000, stillAfterScrollMs: 2000, tickMs: 1000 });
  await after.reader.done;
  // Before: ticks at 0..5s. After: page 2 kept at 2s counts as movement, still by 4s.
  assert.equal(before.ticks(), 6);
  assert.equal(after.ticks(), 5);
});

test('a slow, smooth scroll still reads every page and does not end early', async () => {
  // Each tick changes 2 of 10 cells (under the 0.25 movement share), so no
  // single tick counts as movement; every page kept must keep reading alive.
  const slow = (step) => {
    const t = Buffer.alloc(10 * 4, 40);
    for (let c = 0; c < Math.min(10, step * 2); c++) t.fill(200, c * 4, c * 4 + 4);
    return t;
  };
  const frames = [0, 1, 2, 3, 4, 5, 5, 5, 5, 5, 5].map(slow);
  const { reader } = run(frames, { stillBeforeScrollMs: 2500, stillAfterScrollMs: 2500, tickMs: 1000 });
  const got = await reader.done;
  // Pages at steps 0, 2 (4 cells from page 1) and 4 (4 more): all read.
  assert.equal(got.length, 3);
});

test('with the defaults, switching tabs and scrolling keeps every stop, and a forgotten second Cmd+H ends it after 10s still', async () => {
  // Instructions (1), scroll to 2, switch to Tests (3), scroll to 4, switch to Solution (5), then stillness.
  const frames = [1, 1, 2, 2, 3, 3, 4, 4, 5];
  const { reader, ticks } = run(frames, { tickMs: 1000 });
  const got = await reader.done;
  assert.deepEqual(got.map((p) => p.image), ['img1', 'img2', 'img3', 'img4', 'img5']);
  // Page 5 settles at 9s: reading continues through 10s of stillness, so it ends at 19s.
  assert.equal(ticks(), 20);
});

test('scrolling back to a page already read does not keep it twice', async () => {
  const { reader } = run([1, 2, 2, 1, 1]);
  assert.deepEqual((await reader.done).map((p) => p.image), ['img1', 'img2']);
});

test('stops at the page cap and the time cap', async () => {
  const pagesCap = run([1, 1, 2, 2, 3, 3, 4, 4], { maxPages: 3 });
  assert.equal((await pagesCap.reader.done).length, 3);
  const frames = [];
  for (let i = 1; i < 200; i++) frames.push(i); // always moving
  const timeCap = run(frames, { maxReadMs: 5000, tickMs: 1000 });
  await timeCap.reader.done;
  assert.equal(timeCap.ticks(), 6);
});

test('finish() ends reading and keeps the view the candidate stopped on', async () => {
  let t = 0;
  let view = 1;
  let release;
  const reader = readScrollPages({
    capture: async () => ({ thumb: thumb(view), image: 'img' + view }),
    now: () => t,
    // A real wait that only finish() cuts short.
    wait: () => new Promise((r) => { release = r; }),
    tickMs: 700
  });
  await new Promise((r) => setImmediate(r));
  view = 3; // scrolled to the end, then Cmd+H again
  reader.finish();
  assert.deepEqual((await reader.done).map((p) => p.image), ['img1', 'img3']);
  release();
});

test('no screen on the first capture returns no pages at once; a failing first capture fails', async () => {
  const none = run([null, 1]);
  assert.deepEqual(await none.reader.done, []);
  assert.equal(none.ticks(), 1);
  const denied = run([new Error('no permission')]);
  await assert.rejects(denied.reader.done, /no permission/);
});

test('a capture failing after the first page only skips that tick', async () => {
  const { reader } = run([1, new Error('blip'), 2, 2]);
  assert.deepEqual((await reader.done).map((p) => p.image), ['img1', 'img2']);
});

test('fitPages keeps every page and steps all of them down together until they fit', () => {
  const sizes = { 70: 1000, 55: 600, '55@1280': 400, 50: 200 };
  const encode = (image, step) => image + ':' + 'x'.repeat(step.maxLongEdge === 1280 ? sizes['55@1280'] : sizes[step.quality]);
  assert.deepEqual(fitPages(['a', 'b'], encode, 5000).map((u) => u.length), [1002, 1002]);
  assert.deepEqual(fitPages(['a', 'b'], encode, 1300).map((u) => u.length), [602, 602]);
  assert.deepEqual(fitPages(['a', 'b', 'c'], encode, 1300).map((u) => u.length), [402, 402, 402]);
  // Still over at the smallest step: every page is still sent.
  assert.equal(fitPages(['a', 'b', 'c', 'd', 'e', 'f', 'g'], encode, 100).length, 7);
  assert.equal(PAGE_STEPS[0].maxLongEdge, 1568);
});
