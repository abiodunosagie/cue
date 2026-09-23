// Reading tracker: works out which paragraph of an answer the user is reading
// aloud, from what the mic transcribed. Pure functions, no DOM, so node tests
// can load it. The renderer uses window.ReadingTracker.
(function () {
  // Common words that appear in every paragraph and would make any block match.
  const STOPWORDS = new Set((
    'a an the and or but if so of to in on at by for with from as into onto about over under ' +
    'is am are was were be been being do does did done have has had having ' +
    'i me my mine we us our you your he him his she her it its they them their this that these those ' +
    'there here then than too very just also not no yes can could will would shall should may might must ' +
    'what which who whom whose when where why how all any some each such own same other more most ' +
    'up down out off again once only both few um uh like well okay ok really actually basically ' +
    'get got make made going gonna want wanted thing things kind sort lot'
  ).split(' '));

  // Light suffix strip so "building" matches "builds" and "built" stays itself.
  // A lone s after another s stays, so "process" and "processes" agree.
  function stem(word) {
    if (word.length <= 4) return word;
    return word.replace(/(ing|ed|es|(?<!s)s)$/, '');
  }

  // Text to content-word stems, in reading order.
  function tokenize(text) {
    if (!text) return [];
    const words = String(text).toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/);
    const out = [];
    for (const w of words) {
      if (!w || STOPWORDS.has(w)) continue;
      if (w.length < 2 && !/\d/.test(w)) continue;
      out.push(stem(w));
    }
    return out;
  }

  // How many recent spoken words to consider (the renderer buffers a few more,
  // see MAX_SPOKEN in renderer.js). Enough to span a sentence, short
  // enough that the paragraph before stops winning once the reader moves on.
  const WINDOW = 14;
  // Minimum evidence before moving: at least this many distinct spoken words
  // found in the block, and this weighted score.
  const MIN_DISTINCT = 2;
  const MIN_SCORE = 2;
  // Going back up needs to beat the best forward candidate by this factor.
  const BACKWARD_FACTOR = 1.6;

  function scoreBlock(block, spoken) {
    if (!block.length || !spoken.length) return { score: 0, distinct: 0, progress: 0 };
    const positions = new Map();
    block.forEach((w, i) => {
      if (!positions.has(w)) positions.set(w, []);
      positions.get(w).push(i);
    });
    const pairs = new Set();
    for (let i = 1; i < block.length; i++) pairs.add(block[i - 1] + ' ' + block[i]);

    const n = spoken.length;
    const seen = new Set();
    let score = 0;
    let lastPos = -1;
    for (let k = 0; k < n; k++) {
      const w = spoken[k];
      const at = positions.get(w);
      if (!at) continue;
      // Newer words say more about where the reader is right now.
      const weight = 0.5 + 0.5 * ((k + 1) / n);
      if (!seen.has(w)) { seen.add(w); score += weight; }
      // Consecutive pairs in the same order are strong evidence against a
      // common word that happens to appear in several paragraphs.
      if (k > 0 && pairs.has(spoken[k - 1] + ' ' + w)) score += weight;
      // Furthest point reached: first occurrence after the previous match,
      // else the last occurrence.
      const next = at.find((p) => p > lastPos);
      lastPos = next !== undefined ? next : at[at.length - 1];
    }
    const progress = block.length > 1 ? Math.max(0, lastPos) / (block.length - 1) : 1;
    return { score, distinct: seen.size, progress };
  }

  // blocks: token arrays, one per paragraph or bullet, in order.
  // spoken: token array of what the user said recently.
  // current: index already being followed, or -1.
  // Returns { index, progress } or null when the evidence is too weak.
  // progress is 0..1, how far into the block the latest spoken word falls.
  function locate(blocks, spoken, current) {
    if (!Array.isArray(blocks) || !blocks.length) return null;
    const recent = (spoken || []).slice(-WINDOW);
    if (recent.length < MIN_DISTINCT) return null;
    const from = Math.max(0, current);

    let bestFwd = null;
    let bestBack = null;
    for (let i = 0; i < blocks.length; i++) {
      const s = scoreBlock(blocks[i], recent);
      if (s.distinct < MIN_DISTINCT || s.score < MIN_SCORE) continue;
      // Summaries skip paragraphs, so jumping ahead is allowed, but a nearer
      // block wins a close call.
      const jump = i - from;
      const adjusted = jump > 1 ? s.score - 0.15 * (jump - 1) : s.score;
      const cand = { index: i, progress: s.progress, score: adjusted };
      if (i >= from) {
        if (!bestFwd || cand.score > bestFwd.score) bestFwd = cand;
      } else if (!bestBack || cand.score > bestBack.score) {
        bestBack = cand;
      }
    }
    // Right after moving on, the window still holds words from the block just
    // left, so going back needs clearly stronger evidence than going forward.
    let best = bestFwd;
    const backBar = Math.max(MIN_SCORE * 2, bestFwd ? bestFwd.score * BACKWARD_FACTOR : 0);
    if (bestBack && bestBack.score >= backBar) best = bestBack;
    return best ? { index: best.index, progress: best.progress } : null;
  }

  // Echo: the mic picking up the interviewer's voice from speakers. Most of what
  // it heard is in the interviewer's words, and enough of it that an answer
  // which merely reuses the topic ("so the deadline problem was tricky") is not.
  const ECHO_OVERLAP = 0.6;
  const ECHO_MIN_SHARED = 3;

  function isEcho(heard, reference) {
    const words = tokenize(heard);
    if (!words.length) return false;
    const ref = new Set(tokenize(reference));
    const shared = words.filter((w) => ref.has(w)).length;
    return shared >= ECHO_MIN_SHARED && shared / words.length >= ECHO_OVERLAP;
  }

  const api = { tokenize, locate, isEcho };
  if (typeof window !== 'undefined') window.ReadingTracker = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
