// Without headphones the candidate's mic also hears the interviewer, so the
// "you" channel carries the interviewer's words: a whole copy of their turn, a
// fragment of it, or their last words with the candidate's own start ("10
// scale? I'd say I'm quite comfortable"). Kept as the candidate's speech, that
// tells the model the candidate said the question, can clear the heard
// question from the box, and moves the reading follow.
//
// Words alone cannot tell an echo from an answer: answers reuse the question's
// words ("Do you use React and TypeScript?" "I use React and TypeScript.").
// When the speech STARTED can: the mic copy starts when the interviewer starts
// (both hear the same sound), or while they are still talking; an answer starts
// after they stop. Start and stop come from the live interim words of each
// channel (Deepgram sends them every few hundred ms). Without interims (batch
// or local transcription) they are estimated from word counts, more loosely.
//
// Measured on the 2026-10-04 interview (59 mic turns): 20 copies, landing from
// 0.6 s before to 3.5 s after the interviewer's own turn.
//
// Pure: main.js feeds it both channels and asks it about the mic's turns.

const { tokenize, isEcho } = require('../renderer/reading-tracker');

// With measured starts: the mic copy and the interviewer's own words start
// within this of each other (two streams, separate latencies)...
const ALIGN_MS = 500;
// ...or the mic started clearly inside the interviewer's turn: at least this
// long before their last heard words. Interim timing jitters by a few hundred
// ms on each stream, so a quick answer at the very end is never taken for this.
const INSIDE_MARGIN_MS = 300;
// A turn (either channel) whose interims stopped this long ago without a final
// (a cough, a dropped hallucination) is over: the next words start a new one.
const QUIET_GAP_MS = 2500;
// Without measured starts, a mic turn is only judged a copy when it is long
// enough that an answer restating the question is not mistaken for one
// ("I use React and TypeScript." is 2 to 5 content words).
const MIN_ESTIMATED_TOKENS = 6;
// Without measured starts: the mic turn's start is estimated at a fast pace
// (never too early) and the interviewer's end at their final, so the window
// after it is wider.
const MS_PER_WORD_FAST = 300;
const MS_PER_WORD_THEM = 400;
const ESTIMATED_SLACK_MS = 700;
// The interviewer's final can land this long after the mic copy of it.
const NEWER_SLACK_MS = 1000;
// A mic turn that is the interviewer's exact words (stop words included) this
// recent is a copy whatever the timing: one-word echoes ("Great.") landed 1.4
// to 1.7 s late. Exact, so "Redux, yes." never matches "And Redux?".
const EXACT_COPY_MS = 3000;
const MAX_REACH_MS = 30000;
const KEEP_MS = MAX_REACH_MS + 5000;
// Runs shorter than this are normal speech overlap ("the primary key and").
const MIN_RUN = 4;
// A whole short interviewer turn ("10 scale?") the mic text starts with.
const SHORT_TURN_WORDS = 3;
// Less than this left after removing the echo is not the candidate talking.
const MIN_LEFT = 3;
// Echo found and it is most of the turn: the rest is the same interviewer
// speech transcribed differently by the mic ("RITO healing system" for
// "BGlory Rides"), not the candidate.
const MOSTLY_ECHO = 0.5;

const spokenWords = (text) => String(text || '').toLowerCase().replace(/[’']/g, '').split(/[^a-z0-9]+/).filter(Boolean);
const wordCount = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length;
// a appears in b side by side.
function contiguous(a, b) {
  for (let i = 0; i + a.length <= b.length; i++) if (a.every((t, k) => b[i + k] === t)) return true;
  return false;
}
// a appears in b in the same order (not necessarily side by side).
function inOrder(a, b) {
  let j = 0;
  for (const t of a) { while (j < b.length && b[j] !== t) j++; if (j === b.length) return false; j++; }
  return true;
}

function createMicEcho({ now = Date.now } = {}) {
  let finals = [];       // { tokens, raw, text, ts, start, last, measured }
  let themSpan = null;   // the interviewer's turn in progress: { start, last, text }
  let youStart = null;   // when the mic's current turn was first heard
  let youLast = null;    // its newest interim

  function noteThem(text, { final = true } = {}) {
    const t = now();
    const words = String(text || '').trim();
    if (!final) {
      // An empty interim ends the turn (after its final, or after one that was dropped).
      if (!words) { themSpan = null; return; }
      themSpan = themSpan && t - themSpan.last <= QUIET_GAP_MS ? { ...themSpan, last: t, text: words } : { start: t, last: t, text: words };
      return;
    }
    const span = themSpan;
    themSpan = null;
    finals.push({
      tokens: tokenize(words), raw: spokenWords(words).join(' '), text: words, ts: t,
      start: span ? span.start : t - wordCount(words) * MS_PER_WORD_THEM,
      last: span ? span.last : t,
      measured: !!span
    });
    finals = finals.filter((f) => f.ts >= t - KEEP_MS);
  }

  // The mic's interim words: the first one of a turn marks when it started. An
  // empty one ends the turn, final or not; so does a quiet gap.
  function noteYou(text) {
    const t = now();
    if (!String(text || '').trim()) { youStart = null; youLast = null; return; }
    if (youStart === null || t - youLast > QUIET_GAP_MS) youStart = t;
    youLast = t;
  }
  // At the mic's final: when that turn started (null when no interim was heard).
  function takeYouStart() {
    const s = youStart;
    youStart = null;
    youLast = null;
    return s;
  }
  // An interviewer turn that was not published (practice or script took it): its span ends.
  function closeThem() { themSpan = null; }

  // The interviewer turns a mic turn may be copying: it started as they
  // started, or while they were talking.
  function references(youTs, text, start) {
    const measuredStart = Number.isFinite(start);
    const began = measuredStart ? start : youTs - wordCount(text) * MS_PER_WORD_FAST;
    const spans = finals.slice();
    if (themSpan) spans.push({ tokens: tokenize(themSpan.text), text: themSpan.text, ts: themSpan.last, start: themSpan.start, last: themSpan.last, measured: true });
    const inWindow = (r) => r.ts <= youTs + NEWER_SLACK_MS && r.ts >= youTs - MAX_REACH_MS;
    // aligned: started with the interviewer (a copy of the whole turn may follow);
    // inside: started part way through it (only a contiguous piece of it can be a copy);
    // during: the candidate was already talking when the interviewer spoke, so the
    // mic turn holds both (only their word-for-word runs are cut, never the turn).
    const matched = [];
    for (const r of spans) {
      if (!inWindow(r)) continue;
      if (measuredStart && r.measured) {
        if (Math.abs(began - r.start) <= ALIGN_MS) matched.push({ ...r, how: 'aligned' });
        else if (began >= r.start && began <= r.last - INSIDE_MARGIN_MS) matched.push({ ...r, how: 'inside' });
        else if (began < r.start && r.start <= youTs) matched.push({ ...r, how: 'during' });
      } else if (began >= r.start - ALIGN_MS && began <= r.last + ESTIMATED_SLACK_MS) matched.push({ ...r, how: 'estimated' });
    }
    if (!matched.length) return matched;
    // The mic hears straight through the interviewer's short pauses, so one mic
    // turn can copy several of their turns ("My day is going well too." "Thank
    // you for asking."): those turns, joined from the first it matched, are one
    // more reference.
    const first = matched.reduce((a, r) => (r.start < a.start ? r : a));
    if (first.how === 'inside' || first.how === 'during') return matched;
    const chain = spans.filter((r) => inWindow(r) && r.start >= first.start && r.start <= youTs).sort((a, b) => a.start - b.start);
    if (chain.length > 1) {
      matched.push({ tokens: chain.flatMap((r) => r.tokens), text: chain.map((r) => r.text).join(' '), ts: chain[chain.length - 1].ts, start: first.start, last: chain[chain.length - 1].last, how: first.how });
    }
    return matched;
  }

  // Only the interviewer's words, heard in their time: nothing of the candidate's.
  // Started with them: their words in order, or mostly theirs (the mic mishears).
  // Started part way through: a side-by-side piece of what they said, exactly,
  // since a candidate talking over them uses their own words in between.
  function allEcho(own, r) {
    if (!own.length || r.how === 'during') return false;
    if (r.how === 'inside') return contiguous(own, r.tokens);
    if (r.how === 'estimated' && own.length < MIN_ESTIMATED_TOKENS) return false;
    return inOrder(own, r.tokens) || isEcho(own.join(' '), r.tokens.join(' '));
  }

  // A mic interim (partial words) that is only the interviewer: true to hide it.
  function isEchoInterim(text) {
    const own = tokenize(text);
    return references(now(), text, youStart).some((r) => allEcho(own, r));
  }

  // A final mic turn: { text, dropped, trimmed }. text is what the candidate
  // said ('' when it was all echo); trimmed when echo words were cut from it.
  // start: when the turn was first heard (takeYouStart), or null.
  function cleanFinal(text, youTs, start = null) {
    const original = String(text || '').trim();
    const keep = { text: original, dropped: false, trimmed: false };
    const drop = { text: '', dropped: true, trimmed: false };
    if (!original) return keep;
    const raw = spokenWords(original).join(' ');
    if (raw && finals.some((f) => f.ts >= youTs - EXACT_COPY_MS && f.ts <= youTs + NEWER_SLACK_MS && f.raw === raw)) return drop;
    const refs = references(youTs, original, start);
    if (!refs.length) return keep;
    const own = tokenize(original);
    if (refs.some((r) => allEcho(own, r))) return drop;
    // Estimated timing cannot tell a short answer from a short copy: keep it.
    if (own.length < MIN_ESTIMATED_TOKENS && refs.every((r) => r.how === 'estimated')) return keep;

    // Content words with the spoken word each came from, so cuts keep the
    // candidate's own wording and punctuation.
    const words = original.split(/\s+/);
    const tokens = [];
    words.forEach((w, i) => { for (const t of tokenize(w)) tokens.push({ t, word: i }); });
    if (!tokens.length) return keep;
    const cut = new Array(words.length).fill(false);
    const cutTokens = (from, to) => { for (let w = tokens[from].word; w <= tokens[to].word; w++) cut[w] = true; };

    for (const r of refs) {
      // A whole short turn at the start: "10 scale? I'd say ..."
      const n = r.tokens.length;
      // Only with the candidate's own words after it: alone, it is their answer.
      if (r.how !== 'during' && n && n <= SHORT_TURN_WORDS && tokens.length > n && r.tokens.every((t, k) => tokens[k].t === t)) cutTokens(0, n - 1);
      // Runs of MIN_RUN or more content words in the same order as the interviewer said them.
      for (let i = 0; i < tokens.length; i++) {
        for (let j = 0; j < n; j++) {
          let len = 0;
          while (i + len < tokens.length && j + len < n && tokens[i + len].t === r.tokens[j + len]) len++;
          if (len >= MIN_RUN) cutTokens(i, i + len - 1);
        }
      }
    }
    if (!cut.some(Boolean)) return keep;
    const left = words.filter((_w, i) => !cut[i]).join(' ').replace(/^[\s?!.,;:]+/, '').trim();
    const cutShare = tokens.filter((tk) => cut[tk.word]).length / tokens.length;
    // When the candidate was talking first, what is left is theirs, however much was cut.
    const mostlyEchoCounts = refs.some((r) => r.how !== 'during');
    if (tokenize(left).length < MIN_LEFT || (mostlyEchoCounts && cutShare >= MOSTLY_ECHO)) return drop;
    return { text: left, dropped: false, trimmed: true };
  }

  function clear() { finals = []; themSpan = null; youStart = null; youLast = null; }

  return { noteThem, noteYou, takeYouStart, closeThem, isEchoInterim, cleanFinal, clear };
}

// The two channels finish in any order (the mic copy landed up to 0.6 s first
// on 2026-10-04), so every mic turn waits holdMs for the interviewer's turn
// before it is judged. Always, not only while the interviewer is heard talking:
// batch and local transcription send no interim words to tell. The mic turns
// only drive the soft clear, the reading follow and memory, none of which needs
// them sooner. Turns always leave in order.
// publish(turn, clean): clean is echo.cleanFinal's verdict for it.
function createMicHold({ echo, publish, holdMs = 800, now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let held = [];
  let timer = null;
  // A publish that throws must not strand the turns behind it.
  const judge = (turn) => {
    try { publish(turn, echo.cleanFinal(turn.text, turn.ts, turn.start)); } catch (e) { console.log(`[echo] could not publish a mic turn: ${e && e.message ? e.message : e}`); }
  };
  function release() {
    timer = null;
    while (held.length && now() - held[0].ts >= holdMs) judge(held.shift());
    if (held.length) timer = setTimer(release, Math.max(0, holdMs - (now() - held[0].ts)));
  }
  return {
    push(turn) {
      held.push(turn);
      if (!timer) timer = setTimer(release, holdMs);
    },
    // The interviewer's turn just arrived: judge every held mic turn now, so they
    // keep their place before it (and it is already a reference for them).
    releaseAll() { if (timer) clearTimer(timer); timer = null; while (held.length) judge(held.shift()); },
    clear() { held = []; if (timer) clearTimer(timer); timer = null; }
  };
}

module.exports = { createMicEcho, createMicHold };
