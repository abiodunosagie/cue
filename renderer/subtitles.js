// Subtitles for Script > Record, from the script itself: the words are exactly
// what the candidate wrote, and each word's time is when the teleprompter lit
// it while they read. Pure functions, no DOM: the renderer uses
// window.CueSubtitles and node tests load it directly.
(function () {
  const MAX_LINE_CHARS = 42;   // one line, readable on a phone
  const MAX_CUE_MS = 6000;     // a caption left longer reads as stuck
  const MIN_CUE_MS = 700;      // shorter than this flashes past unread
  const TAIL_MS = 1500;        // the last caption stays after the last word
  // The word is lit once speech recognition returns it, a little after it was
  // said; captions are moved this much earlier to sit on the voice.
  const HEARD_LAG_MS = 400;
  // Words said before the first one heard: placed this far apart just before it.
  const LEAD_WORD_MS = 300;

  // tokens: the script's words in order; times: ms from the take's start for
  // each word lit (holes for words skipped or never heard); endMs: the take's
  // length. Returns [{ start, end, text }] in ms, or [] when nothing was timed.
  function buildCues(tokens, times, endMs) {
    const timed = [];
    let last = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (!Number.isFinite(times[i])) continue;
      // Words must not go back in time, even if recognition jumped around.
      const t = Math.max(0, times[i] - HEARD_LAG_MS, last);
      timed.push({ i, t });
      last = t;
    }
    if (!timed.length) return [];
    // A word skipped between two timed words sits between them, evenly.
    const at = new Array(tokens.length);
    for (let k = 0; k < timed.length; k++) {
      at[timed[k].i] = timed[k].t;
      const next = timed[k + 1];
      if (!next) break;
      const gap = next.i - timed[k].i;
      for (let j = 1; j < gap; j++) at[timed[k].i + j] = timed[k].t + ((next.t - timed[k].t) * j) / gap;
    }
    // The script's opening words come first even when recognition caught up
    // only a few words in: they go just before the first word heard.
    for (let i = 0; i < timed[0].i; i++) at[i] = Math.max(0, timed[0].t - (timed[0].i - i) * LEAD_WORD_MS);
    const first = 0;
    const lastWord = timed[timed.length - 1].i;

    // Sentences first (a caption never runs across two), then each sentence in
    // lines of even length, so no word is left alone on a line of its own.
    const sentences = [];
    let current = [];
    for (let i = first; i <= lastWord; i++) {
      current.push(i);
      if (/[.!?]["')\]]*$/.test(tokens[i])) { sentences.push(current); current = []; }
    }
    if (current.length) sentences.push(current);
    const cues = [];
    for (const sentence of sentences) {
      const chars = sentence.map((i) => tokens[i]).join(' ').length;
      const lines = Math.max(1, Math.ceil(chars / MAX_LINE_CHARS));
      const target = chars / lines;
      let words = [];
      for (let n = 0; n < sentence.length; n++) {
        const i = sentence[n];
        const len = words.map((w) => tokens[w]).join(' ').length;
        const left = lines - cues.filter((c) => c.sentence === sentence).length;
        if (words.length && left > 1 && len + 1 + tokens[i].length > target + 4) {
          cues.push({ sentence, idx: words });
          words = [];
        }
        words.push(i);
      }
      if (words.length) cues.push({ sentence, idx: words });
    }
    for (const c of cues) {
      c.start = at[c.idx[0]];
      c.lastAt = at[c.idx[c.idx.length - 1]];
      c.text = c.idx.map((i) => tokens[i]).join(' ');
    }

    const end = Math.max(0, endMs || 0);
    for (let k = 0; k < cues.length; k++) {
      const next = cues[k + 1];
      let stop = next ? next.start : cues[k].lastAt + TAIL_MS;
      stop = Math.min(stop, cues[k].start + MAX_CUE_MS);
      if (stop - cues[k].start < MIN_CUE_MS) stop = cues[k].start + MIN_CUE_MS;
      if (end) stop = Math.min(stop, end);
      cues[k].end = Math.max(cues[k].start + 1, stop);
    }
    return cues.map(({ start, end: e, text }) => ({ start, end: e, text }));
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

  const api = { buildCues, toSrt, HEARD_LAG_MS };
  if (typeof window !== 'undefined') window.CueSubtitles = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
