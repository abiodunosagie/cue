// Screen watch: while listening, notice when a question or coding task appears
// on screen without the interviewer saying it (a shared doc, a chat message, a
// coding platform). Every few seconds a small copy of the screen is compared
// with the last one on this Mac; only a big change costs a Fast model call,
// which reads out the question, if there is one.
//
// cue's own panel is blacked out of every capture first: its answer text
// changes and scrolls all the time, and must never be read as a question.

const { tokenize, countShared } = require('../renderer/reading-tracker');

const INTERVAL_MS = 10000;
// Share of thumbnail cells that must change before the model looks.
const CHANGE_THRESHOLD = 0.25;
// Brightness step (0 to 255) for a cell to count as changed; below it is
// video compression noise, a blinking cursor or a clock.
const CELL_DELTA = 24;
const THUMB_WIDTH = 48;
const THUMB_HEIGHT = 27;
// A spoken or screen question this recent, with mostly the same words, is the
// same question: never answer it twice.
const RECENT_MS = 90000;
const SAME_QUESTION_OVERLAP = 0.6;
const MAX_QUESTION_CHARS = 600;

// Fraction of cells whose brightness changed by more than CELL_DELTA between two
// same-size BGRA bitmaps. 1 when there is no previous image.
function changedShare(prev, next) {
  if (!prev || !next || prev.length !== next.length) return 1;
  let changed = 0;
  const cells = next.length / 4;
  for (let i = 0; i < next.length; i += 4) {
    const a = prev[i] * 0.114 + prev[i + 1] * 0.587 + prev[i + 2] * 0.299;
    const b = next[i] * 0.114 + next[i + 1] * 0.587 + next[i + 2] * 0.299;
    if (Math.abs(a - b) > CELL_DELTA) changed++;
  }
  return changed / cells;
}

// Black out a rectangle (pixel units of this bitmap) in a BGRA buffer, in place.
function maskRect(bitmap, width, height, rect) {
  if (!rect) return bitmap;
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(height, Math.ceil(rect.y + rect.height));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * 4;
      bitmap[i] = 0; bitmap[i + 1] = 0; bitmap[i + 2] = 0; bitmap[i + 3] = 255;
    }
  }
  return bitmap;
}

// Scale a window's screen rectangle (display points) to a bitmap of the display.
function scaleRect(bounds, display, bitmapWidth, bitmapHeight) {
  if (!bounds || !display) return null;
  const sx = bitmapWidth / display.width;
  const sy = bitmapHeight / display.height;
  return { x: (bounds.x - display.x) * sx, y: (bounds.y - display.y) * sy, width: bounds.width * sx, height: bounds.height * sy };
}

const DETECT_SYSTEM =
  'You look at a screenshot from a job interview. Parts of it may be blacked out; ignore those. ' +
  'Decide whether the screen shows a question or task the candidate is being asked right now: ' +
  'a coding problem or task, or a written interview question (in a chat, a document or a slide). ' +
  'Ignore menus, tab titles, names, video tiles, code the candidate is typing, and anything that is not addressed to the candidate.\n' +
  'Reply in exactly one of these forms and nothing else:\n' +
  'NONE\n' +
  'QUESTION: <the question, word for word>\n' +
  'CODING: <the task, in one short sentence>';

// Parse the detector's reply into { kind: 'question' | 'coding', text } or null.
function parseDetection(reply) {
  const text = String(reply || '').trim();
  const m = /^(QUESTION|CODING)\s*:\s*([\s\S]+)$/i.exec(text);
  if (!m) return null;
  const body = m[2].replace(/\s+/g, ' ').trim().slice(0, MAX_QUESTION_CHARS);
  if (body.length < 8) return null;
  return { kind: m[1].toUpperCase() === 'CODING' ? 'coding' : 'question', text: body };
}

// Same words, mostly: the interviewer said it too, or it is still on screen.
function isSameQuestion(a, b) {
  const x = new Set(tokenize(a));
  const y = new Set(tokenize(b));
  if (!x.size || !y.size) return false;
  return countShared(x, y) / Math.min(x.size, y.size) >= SAME_QUESTION_OVERLAP;
}

// True when this detection repeats something heard or seen in the last RECENT_MS.
function isRecent(detection, recent, now) {
  return recent.some((r) => now - r.ts <= RECENT_MS && isSameQuestion(detection.text, r.text));
}

// The watcher loop. capture() resolves { thumb, dataUrl } (thumb is the small
// BGRA bitmap, both already masked) or null; detect(dataUrl) resolves the
// model's reply; recentQuestions() gives { text, ts } for recent interviewer
// turns; onDetect(detection, dataUrl) acts on a new question, with the masked
// screenshot it was read from.
function createScreenWatcher({ capture, detect, isActive, recentQuestions, onDetect, now = Date.now, intervalMs = INTERVAL_MS, threshold = CHANGE_THRESHOLD }) {
  let timer = null;
  let lastThumb = null;
  let running = false;
  const seen = []; // detections acted on, { text, ts }

  async function tick() {
    if (running || !isActive()) return;
    running = true;
    try {
      const shot = await capture();
      if (!shot) return;
      const share = changedShare(lastThumb, shot.thumb);
      lastThumb = shot.thumb;
      if (share < threshold) return;
      const detection = parseDetection(await detect(shot.dataUrl));
      if (!detection || !isActive()) return;
      const t = now();
      // Anything already acted on stays done while it is on screen; a spoken
      // question counts only while it is recent.
      if (seen.some((s) => isSameQuestion(detection.text, s.text)) || isRecent(detection, recentQuestions(), t)) return;
      seen.push({ text: detection.text, ts: t });
      if (seen.length > 20) seen.shift();
      onDetect(detection, shot.dataUrl);
    } catch { /* a failed capture or model call just waits for the next tick */ } finally {
      running = false;
    }
  }

  return {
    start() { if (!timer) timer = setInterval(tick, intervalMs); },
    stop() { clearInterval(timer); timer = null; lastThumb = null; },
    tick
  };
}

module.exports = {
  createScreenWatcher, changedShare, maskRect, scaleRect, parseDetection, isSameQuestion,
  DETECT_SYSTEM, THUMB_WIDTH, THUMB_HEIGHT, INTERVAL_MS
};
