// Long question reading: a coding task taller than the screen is read page by
// page while the candidate scrolls, and solved with every page together.
//
// It keeps a screen as a new page only once the scroll stops on it (the view
// settled) and it looks different from the last page kept. A video call's
// camera tiles change every frame but cover a small part of the screen, so the
// same change threshold as the screen watcher keeps them from counting.
//
// Reading ends when nothing has moved for a moment (the candidate reached the
// end), at the page or time cap, or when finish() is called (Cmd+H again).

const { changedShare } = require('./screen-watch');

const TICK_MS = 700;
// Share of cells that must differ from the last page for a new page, and the
// most two ticks in a row may differ for the view to count as settled.
const PAGE_CHANGE = 0.25;
// Quiet time that ends reading: longer before the first scroll, so there is
// time to move the pointer to the page and start scrolling after Cmd+H.
const STILL_BEFORE_SCROLL_MS = 5000;
const STILL_AFTER_SCROLL_MS = 2500;
const MAX_PAGES = 8;
const MAX_READ_MS = 30000;

// capture() resolves { thumb, image } (see src/screen.js captureMaskedPage) or
// null; onPage(count) fires on each page kept. Returns the reader: done
// resolves the kept pages in scroll order; finish() ends reading now.
function readScrollPages({
  capture, onPage = () => {}, now = Date.now, wait = (ms) => new Promise((r) => setTimeout(r, ms)),
  tickMs = TICK_MS, pageChange = PAGE_CHANGE, stillBeforeScrollMs = STILL_BEFORE_SCROLL_MS,
  stillAfterScrollMs = STILL_AFTER_SCROLL_MS, maxPages = MAX_PAGES, maxReadMs = MAX_READ_MS
}) {
  let finished = false;
  let wake = null;
  const finish = () => { finished = true; if (wake) wake(); };
  // A wait that finish() cuts short, so Cmd+H again starts the solve at once.
  const pause = (ms) => new Promise((resolve) => {
    wake = resolve;
    wait(ms).then(resolve);
  });

  const done = (async () => {
    const pages = [];
    const startedAt = now();
    let previous = null;   // the last tick's thumb
    let lastMoveAt = startedAt;
    let scrolled = false;
    // A settled view is a new page unless it matches one already kept
    // (scrolling back up to reread must not send the same page twice).
    const keep = (shot) => {
      if (pages.length >= maxPages || pages.some((p) => changedShare(p.thumb, shot.thumb) < pageChange)) return;
      if (pages.length) scrolled = true;
      pages.push(shot);
      onPage(pages.length);
    };
    // The first capture failing is real (no permission): it fails the solve.
    // A later one failing only skips that tick.
    const grab = async () => {
      try { return await capture(); } catch (e) { if (!pages.length) throw e; return null; }
    };
    while (!finished) {
      const shot = await grab();
      // No screen at all on the first try: nothing to read, fail the solve now.
      if (!shot && !pages.length) return pages;
      if (shot) {
        const moved = changedShare(previous, shot.thumb) >= pageChange;
        previous = shot.thumb;
        if (moved) lastMoveAt = now();
        // The first page is the screen at Cmd+H; later ones only once settled.
        if (!pages.length || !moved) keep(shot);
      }
      const t = now();
      const stillFor = scrolled ? stillAfterScrollMs : stillBeforeScrollMs;
      if (pages.length >= maxPages || t - startedAt >= maxReadMs || (pages.length && t - lastMoveAt >= stillFor)) return pages;
      await pause(tickMs);
    }
    // Finished by key: keep the view the candidate stopped on.
    const shot = await grab();
    if (shot) keep(shot);
    return pages;
  })();

  return { done, finish };
}

// Encode the pages to fit one request: every page is kept, and all of them get
// smaller together until their data URLs fit the budget (src/screen.js
// MAX_DATA_URL_BYTES, the same budget one screenshot had). encode(image, opts)
// returns a data URL. The last step is used even if still over, never a page dropped.
const PAGE_STEPS = [
  { maxLongEdge: 1568, quality: 70 },
  { maxLongEdge: 1568, quality: 55 },
  { maxLongEdge: 1280, quality: 55 },
  { maxLongEdge: 1024, quality: 50 }
];

function fitPages(images, encode, budget) {
  let urls = [];
  for (const step of PAGE_STEPS) {
    urls = images.map((image) => encode(image, step));
    if (urls.reduce((sum, u) => sum + u.length, 0) <= budget) break;
  }
  return urls;
}

module.exports = { readScrollPages, fitPages, PAGE_STEPS, TICK_MS, MAX_PAGES };
