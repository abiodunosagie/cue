// Script follow: the teleprompter's engine. It knows the exact text the
// speaker is reading and works out which WORD they just said, from what the
// mic transcribed, so the highlight moves at the speed of their voice:
// never ahead of it, slower when they slow down, still when they stop.
//
// Unlike the reading tracker (which finds the paragraph of a loosely read
// answer), every word counts here, "the" and "I" included, and the position
// only moves forward, except for a clear restart of a sentence already read.
// Pure, so node tests can load it; the renderer uses window.ScriptFollow.
(function () {
  const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
    'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  // Short, very common words: easy to mishear and found everywhere, so they
  // may only match the next word or the one after, never further ahead.
  const SMALL = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'by', 'for', 'with', 'is', 'am', 'are',
    'was', 'be', 'i', 'im', 'me', 'my', 'we', 'you', 'it', 'its', 'that', 'this', 'so', 'as', 'do', 'if', 'up', 'uh', 'um']);
  // How far past the current word a spoken word may match: a reader skips a
  // word or two, or the transcriber drops one.
  const LOOKAHEAD = 5;
  const SMALL_LOOKAHEAD = 2;
  // Lost (the speaker skipped a line or ad-libbed): after this many spoken
  // words in a row that match nothing nearby, look further ahead for a run
  // of RESYNC_RUN words in the same order.
  const LOST_AFTER = 3;
  const RESYNC_AHEAD = 60;
  const RESYNC_RUN = 3;
  // Restarting a sentence: a final result whose first words match this many
  // words in a row, somewhere in the last RESTART_BACK words already read.
  const RESTART_BACK = 25;
  const RESTART_RUN = 4;

  function stem(w) {
    if (w.length <= 4) return w;
    return w.replace(/(ing|ed|es|(?<!s)s)$/, '');
  }

  // One word to its matching form: lowercase letters and digits only, number
  // words as digits (a transcriber writes "5" for "five" and back).
  function norm(word) {
    const w = String(word).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]/g, '');
    const n = NUMBER_WORDS.indexOf(w);
    return n >= 0 ? String(n) : w;
  }

  // Text to matching words. "full-stack" is two words, as a transcriber writes it.
  function words(text) {
    return String(text || '').split(/[\s\-–/]+/).map(norm).filter(Boolean);
  }

  function editDistanceAtMostOne(a, b) {
    if (Math.abs(a.length - b.length) > 1) return false;
    let i = 0; let j = 0; let edits = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++edits > 1) return false;
      if (a.length > b.length) i++;
      else if (b.length > a.length) j++;
      else { i++; j++; }
    }
    return edits + (a.length - i) + (b.length - j) <= 1;
  }

  // Same word, allowing an ending ("build" and "builds") and, for longer
  // words, one letter of mishearing ("Osagie" and "Osage").
  function same(a, b) {
    if (a === b) return true;
    if (stem(a) === stem(b)) return true;
    return a.length >= 5 && b.length >= 5 && editDistanceAtMostOne(a, b);
  }

  // The script as display tokens (what the renderer shows, split on spaces)
  // and matching words, each word pointing at the token it came from.
  function prepare(script) {
    const tokens = String(script || '').split(/\s+/).filter(Boolean);
    const list = [];
    tokens.forEach((token, t) => {
      for (const w of words(token)) list.push({ w, token: t });
    });
    return { tokens, words: list };
  }

  // Walk the spoken words forward from `from` (the index of the last word
  // already read, -1 before the start). Returns the index of the last script
  // word they reach. It only ever moves when a spoken word matches, so it
  // cannot run ahead of the speaker.
  function walk(list, spoken, from) {
    let pos = from;
    let lost = 0;
    for (let k = 0; k < spoken.length; k++) {
      const s = spoken[k];
      const reach = SMALL.has(s) ? SMALL_LOOKAHEAD : LOOKAHEAD;
      let hit = -1;
      for (let i = pos + 1; i <= Math.min(list.length - 1, pos + reach); i++) {
        if (same(list[i].w, s)) { hit = i; break; }
      }
      if (hit >= 0) { pos = hit; lost = 0; continue; }
      if (++lost < LOST_AFTER) continue;
      // Lost: find where these last few spoken words appear in order further on.
      const run = spoken.slice(Math.max(0, k - RESYNC_RUN + 1), k + 1);
      const found = findRun(list, run, pos + 1, pos + RESYNC_AHEAD);
      if (found >= 0) { pos = found; lost = 0; }
    }
    return pos;
  }

  // Index of the last word of the first place in [start, end] where `run`
  // appears word after word, or -1. Small words alone are no evidence.
  function findRun(list, run, start, end) {
    if (run.length < RESYNC_RUN || run.every((w) => SMALL.has(w))) return -1;
    for (let i = Math.max(0, start); i + run.length - 1 <= Math.min(list.length - 1, end); i++) {
      let ok = true;
      for (let j = 0; j < run.length; j++) if (!same(list[i + j].w, run[j])) { ok = false; break; }
      if (ok) return i + run.length - 1;
    }
    return -1;
  }

  // The follower for one script. Each speech result is the whole current
  // utterance (an interim grows, then a final replaces it), so it is walked
  // from the position the last final left (the anchor): a transcriber that
  // changes its mind mid-utterance never leaves the highlight in a wrong place.
  function createFollower(script) {
    const prepared = prepare(script);
    const list = prepared.words;
    let anchor = -1; // last word confirmed by a final result
    let pos = -1;    // last word said, interim included

    function hear(text, isFinal) {
      const spoken = words(text);
      let from = anchor;
      // A restart: the utterance opens with words already read.
      if (isFinal || spoken.length >= RESTART_RUN) {
        const opening = spoken.slice(0, RESTART_RUN);
        const back = findRun(list, opening, anchor - RESTART_BACK, anchor);
        if (back >= 0 && back <= anchor && opening.length === RESTART_RUN) from = back - RESTART_RUN;
      }
      const next = walk(list, spoken, from);
      // Interim results can go back when the transcriber rewrites the
      // utterance; the highlight never moves back without a restart.
      pos = from < anchor ? next : Math.max(anchor, next);
      if (isFinal) anchor = pos;
      return state();
    }

    function state() {
      const word = pos >= 0 ? list[pos] : null;
      return { pos, token: word ? word.token : -1, done: list.length > 0 && pos >= list.length - 1 };
    }

    function reset() { anchor = -1; pos = -1; }

    return { tokens: prepared.tokens, wordCount: list.length, hear, state, reset };
  }

  const api = { createFollower, words, same, prepare };
  if (typeof window !== 'undefined') window.ScriptFollow = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
