// Subtitles for Script > Record, from the script itself: the words are exactly
// what the candidate wrote, and each word's time is when the teleprompter lit
// it while they read. Pure functions, no DOM: the renderer uses
// window.CueSubtitles and node tests load it directly.
(function () {
  const MAX_LINE_CHARS = 42;   // one line, readable on a phone
  // A line may run this far past its even share of the sentence before it
  // breaks, so breaks fall between words rather than mid-phrase.
  const LINE_SLACK_CHARS = 4;
  const MAX_CUE_MS = 6000;     // a caption left longer reads as stuck
  const MIN_CUE_MS = 700;      // shorter than this flashes past unread
  const TAIL_MS = 1500;        // the last caption stays after the last word
  // The word is lit once speech recognition returns it, a little after it was
  // said; captions are moved this much earlier to sit on the voice.
  const HEARD_LAG_MS = 400;
  // Words said before the first one heard, or after the last one heard before
  // the take ended: placed this far apart, at speaking pace.
  const LEAD_WORD_MS = 300;
  // Recognition runs this far behind at most: words later than this after the
  // last one heard were not read before the take stopped.
  const TAIL_CATCHUP_MS = 3000;

  // When each word is on screen, in ms, or null when no word was heard.
  // Words between two heard words sit evenly between them; words before the
  // first heard word lead into it; words after the last heard word follow it at
  // speaking pace while they fit before the take ended and within recognition's
  // catch-up time (said but not yet heard when Done was pressed). Words past
  // that were not read and get no caption.
  function wordTimes(count, times, takeMs) {
    const heard = [];
    let last = -1;
    for (let i = 0; i < count; i++) {
      if (!Number.isFinite(times[i])) continue;
      // Words must not go back in time, even if recognition jumped around.
      const t = Math.max(0, times[i] - HEARD_LAG_MS, last);
      heard.push({ i, t });
      last = t;
    }
    if (!heard.length) return null;
    const at = [];
    for (let i = 0; i < heard[0].i; i++) at[i] = Math.max(0, heard[0].t - (heard[0].i - i) * LEAD_WORD_MS);
    for (let k = 0; k < heard.length; k++) {
      at[heard[k].i] = heard[k].t;
      const next = heard[k + 1];
      if (!next) {
        const lastT = heard[k].t;
        const limit = Math.min(lastT + TAIL_CATCHUP_MS, takeMs > 0 ? takeMs - HEARD_LAG_MS : Infinity);
        for (let i = heard[k].i + 1; i < count && lastT + (i - heard[k].i) * LEAD_WORD_MS <= limit; i++) at[i] = lastT + (i - heard[k].i) * LEAD_WORD_MS;
        break;
      }
      const gap = next.i - heard[k].i;
      for (let j = 1; j < gap; j++) at[heard[k].i + j] = heard[k].t + ((next.t - heard[k].t) * j) / gap;
    }
    return at;
  }

  // One sentence (word indexes) in lines of even length. A last word left on
  // its own joins the line before it, or, when that line would be too long to
  // read, the word before it moves down to join it.
  function splitSentence(sentence, tokens) {
    const text = (idx) => idx.map((i) => tokens[i]).join(' ');
    const lineCount = Math.max(1, Math.ceil(text(sentence).length / MAX_LINE_CHARS));
    const target = text(sentence).length / lineCount;
    const lines = [];
    let words = [];
    for (const i of sentence) {
      if (words.length && lines.length < lineCount - 1 && text(words).length + 1 + tokens[i].length > target + LINE_SLACK_CHARS) {
        lines.push(words);
        words = [];
      }
      words.push(i);
    }
    lines.push(words);
    if (lines.length > 1 && lines[lines.length - 1].length === 1) {
      const prev = lines[lines.length - 2];
      const tail = lines[lines.length - 1];
      if (text(prev.concat(tail)).length <= MAX_LINE_CHARS + LINE_SLACK_CHARS * 3) {
        lines[lines.length - 2] = prev.concat(tail);
        lines.pop();
      } else {
        // Too long to join: the word before it comes down to keep it company.
        while (tail.length === 1 && prev.length > 2 && text([prev[prev.length - 1]].concat(tail)).length <= MAX_LINE_CHARS + LINE_SLACK_CHARS) {
          tail.unshift(prev.pop());
        }
      }
    }
    return lines;
  }

  // tokens: the script's words in order; times: ms from the take's start for
  // each word lit, with holes for words not lit; takeMs: the take's length
  // (0 if unknown). Returns [{ start, end, text }] in ms, never overlapping,
  // or [] when nothing was heard.
  function buildCues(tokens, times, takeMs) {
    const at = wordTimes(tokens.length, times || [], takeMs || 0);
    if (!at) return [];
    // Sentences first, so a caption never runs across two.
    const sentences = [];
    let current = [];
    for (let i = 0; i < at.length; i++) {
      current.push(i);
      if (/[.!?]["')\]]*$/.test(tokens[i])) { sentences.push(current); current = []; }
    }
    if (current.length) sentences.push(current);
    const lines = sentences.flatMap((s) => splitSentence(s, tokens));
    const cues = lines.map((idx) => ({ start: at[idx[0]], lastAt: at[idx[idx.length - 1]], text: idx.map((i) => tokens[i]).join(' ') }));

    const takeEnd = Math.max(0, takeMs || 0);
    for (let k = 0; k < cues.length; k++) {
      const c = cues[k];
      const next = cues[k + 1];
      let stop = next ? next.start : c.lastAt + TAIL_MS;
      stop = Math.min(stop, c.start + MAX_CUE_MS);
      // Too short to read: it stays longer, and the next one waits for it.
      if (stop - c.start < MIN_CUE_MS) {
        stop = c.start + MIN_CUE_MS;
        if (next && next.start < stop) next.start = stop;
      }
      if (takeEnd) stop = Math.min(stop, takeEnd);
      c.end = Math.max(c.start + 1, stop);
    }
    return cues
      .filter((c) => !takeEnd || c.start < takeEnd)
      .map((c) => ({ start: c.start, end: c.end, text: c.text }));
  }

  function stamp(ms) {
    const t = Math.max(0, Math.round(ms));
    const pad = (n, w) => String(n).padStart(w, '0');
    return `${pad(Math.floor(t / 3600000), 2)}:${pad(Math.floor(t / 60000) % 60, 2)}:${pad(Math.floor(t / 1000) % 60, 2)},${pad(t % 1000, 3)}`;
  }

  // SubRip text, the format every player, editor and upload site reads.
  function toSrt(cues) {
    return cues.map((c, k) => `${k + 1}\n${stamp(c.start)} --> ${stamp(c.end)}\n${c.text}\n`).join('\n');
  }

  const api = { buildCues, toSrt, HEARD_LAG_MS, MAX_LINE_CHARS, LINE_SLACK_CHARS };
  if (typeof window !== 'undefined') window.CueSubtitles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
