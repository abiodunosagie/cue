// Prepared answers: before the interview, the Smart model answers the questions
// this job is most likely to bring, from the candidate's own resume, job
// description and stories. When the interviewer asks one of them, the answer is
// on screen at once, with no model wait, and it is the answer he practised.
// Kept in cue-prepared.json next to cue-data.json (0600), rebuilt whenever the
// profile it was made from changes.

const fs = require('fs');
const crypto = require('crypto');
const { writeFileAtomic, removeFileAndTemp } = require('./atomic-file');
const { tokenize, countShared } = require('../renderer/reading-tracker');
const { quickAsk } = require('./quick-ask');

const MAX_ITEMS = 40;
const MAX_ANSWER_CHARS = 2000;
// Word overlap (shared distinct content words over all of them) cannot tell
// "how do you manage state in Flutter" from "how do you test state management
// in Flutter" (0.6 against 0.67 for a true paraphrase). So only a near-identical
// question is used directly; a close one is a candidate the Fast model confirms.
// A wrong prepared answer read aloud is worse than a normal answer.
const DIRECT_MATCH = 0.85;
const CANDIDATE_MIN = 0.4;
const MIN_SHARED_WORDS = 2;
// Measured 0.8 to 1.7 s on the Fast model at effort low: a confirmed prepared
// answer still shows sooner than a live answer (2 to 4 s to its first word).
const CONFIRM_TIMEOUT_MS = 2500;
// Same idea, different word, after stemming.
// Keys are stemmed forms: tokenize turns "repositories" into "repositori".
const SYNONYMS = { application: 'app', program: 'app', codebase: 'project', repo: 'project', repository: 'project', repositori: 'project' };
// Room for about 30 questions with 3 or 4 phrasings and a spoken answer each.
const PREPARE_MAX_TOKENS = 12000;

// Everything a prepared answer is built from (not the same list as the fields a
// job profile carries, src/profiles.js). A change to any of it makes the bank stale.
const { normalizeRoleFocus } = require('../renderer/role-focus');

const BANK_INPUTS = ['resumeText', 'jobDescription', 'companyNotes', 'roundNotes', 'starStories', 'whyCompany', 'whyLeaving', 'workStyle', 'salaryTarget', 'aiRules', 'roleFocus'];

function profileHash(settings) {
  const h = crypto.createHash('sha256');
  for (const k of BANK_INPUTS) {
    // '' and 'auto' are the same choice; only a real change makes the bank stale.
    const value = k === 'roleFocus' ? normalizeRoleFocus(settings && settings[k]) : String((settings && settings[k]) || '');
    h.update(k + '\0' + value + '\0');
  }
  return h.digest('hex');
}

// Enough profile to write real answers: a resume and a job description.
// A job the user already has (work mode) needs no interview answers.
function canPrepare(settings) {
  if (settings && settings.profileKind === 'work') return false;
  return !!(settings && String(settings.resumeText || '').trim() && String(settings.jobDescription || '').trim());
}

const PREPARE_INSTRUCTIONS =
  'This time there is no single question to answer. Apply every rule above about voice, length and using only the candidate\'s real stories to each answer below.\n\n' +
  'List the 30 questions this interviewer is most likely to ask for this role, and write the answer the candidate should say out loud to each. ' +
  'Cover: the intro ("tell me about yourself"), why this role and company, the main technical topics in the job description, ' +
  'the behavioral questions the stories answer, strengths and weaknesses, questions about this company when company notes are given, salary if a target is given, ' +
  'and the questions interviewers ask about any project on a CV: the project you are proudest of, the hardest bug or problem you solved, why you chose its architecture and state management, ' +
  'how you tested it, how it handles bad networks and errors, how it would scale, and what you would do differently. ' +
  'When notes from earlier interview rounds with this company are given, include every question they asked before with a better answer than last time, ' +
  'the follow-ups those answers are likely to bring, and what the next round is likely to cover; build on what they told the candidate about the company and the role.\n\n' +
  'For each question also give 3 or 4 other ways an interviewer might phrase it.\n\n' +
  'Reply with JSON only, no prose and no code fence: an array of objects {"question": string, "variants": [string], "answer": string}.';

// Pull the JSON array out of the model's reply, tolerating a stray code fence
// or sentence around it. Invalid items are dropped, never guessed at.
// The complete top-level {...} objects in the text of a JSON array, in order,
// stopping at the first one that was cut off.
function wholeObjects(text) {
  const out = [];
  let depth = 0; let from = -1; let inString = false; let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') inString = false; continue; }
    if (c === '"') inString = true;
    else if (c === '{') { if (depth === 0) from = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && from >= 0) { try { out.push(JSON.parse(text.slice(from, i + 1))); } catch { /* skip one bad object */ } from = -1; } }
    else if (c === ']' && depth === 0) break;
  }
  return out;
}

function parseItems(text) {
  const raw = String(text || '');
  const start = raw.indexOf('[');
  if (start < 0) return [];
  const end = raw.lastIndexOf(']');
  let parsed = null;
  if (end > start) { try { parsed = JSON.parse(raw.slice(start, end + 1)); } catch { parsed = null; } }
  // A reply cut off at its token limit is not valid JSON: keep every object that came whole.
  if (!Array.isArray(parsed)) parsed = wholeObjects(raw.slice(start + 1));
  const items = [];
  for (const it of parsed) {
    if (!it || typeof it.question !== 'string' || typeof it.answer !== 'string') continue;
    const question = it.question.trim();
    const answer = it.answer.trim().slice(0, MAX_ANSWER_CHARS);
    if (!question || !answer) continue;
    const variants = Array.isArray(it.variants) ? it.variants.filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim()).slice(0, 6) : [];
    items.push({ question, variants, answer });
    if (items.length >= MAX_ITEMS) break;
  }
  return items;
}

// The reading tracker's stems are made for following speech, not for comparing
// questions: "decide" and "decided" come out as decide and decid. A trailing e
// is dropped too, so both forms meet.
const canonical = (w) => { const s = SYNONYMS[w] || w; return s.length > 3 ? s.replace(/e$/, '') : s; };

function words(text) {
  return new Set(tokenize(text).map(canonical));
}

function similarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return { score: 0, shared: 0 };
  const shared = countShared(x, y);
  return { score: shared / (x.size + y.size - shared), shared };
}

// The closest prepared items to the heard question, best first, one entry per
// item: [{ item, score, shared, phrase, direct }]. direct when near-identical.
// minScore: how close a wording must be to count as a candidate at all.
function findMatches(items, heard, limit = 1, minScore = CANDIDATE_MIN) {
  const best = new Map();
  const heardWords = words(heard).size;
  for (const item of items || []) {
    for (const q of [item.question, ...(item.variants || [])]) {
      const { score, shared } = similarity(heard, q);
      // A short question ("what does this app do?" is one content word) needs
      // every word it has; longer ones need at least MIN_SHARED_WORDS.
      if (shared < Math.min(MIN_SHARED_WORDS, heardWords) || score < minScore) continue;
      // phrase: the wording that matched, the one to confirm against.
      const seen = best.get(item);
      if (!seen || score > seen.score) best.set(item, { item, score, shared, phrase: q });
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    // One shared word is never proof enough ("Tell me about Flutter" and "Why Flutter?"): confirm first.
    .map((m) => ({ ...m, direct: m.score >= DIRECT_MATCH && m.shared >= MIN_SHARED_WORDS }));
}

// The closest prepared item to the heard question: { item, score, direct },
// or null when nothing is even close.
function findMatch(items, heard) {
  return findMatches(items, heard, 1)[0] || null;
}

const PICK_SYSTEM =
  'You decide which prepared interview question, if any, asks for the same answer as the question heard. Differences in wording do not matter; ' +
  'a different topic, a different technology, a different angle (testing versus building, strength versus weakness) or a narrower scope does. ' +
  'Reply with only the number of the one prepared question that asks for the same answer, or NONE.';

// With several close candidates, the Fast model picks the one that is the same
// question: resolves its index, or -1 on NONE, an unclear reply, an error or the
// timeout, so doubt always falls back to a normal answer.
function pickSameQuestion({ llm, heard, prepared, timeoutMs = CONFIRM_TIMEOUT_MS }) {
  const list = prepared.map((q, i) => (i + 1) + '. ' + q).join('\n');
  return quickAsk({ llm, system: PICK_SYSTEM, text: 'Question heard: ' + heard + '\nPrepared questions:\n' + list, maxTokens: 5, timeoutMs })
    .then((reply) => {
      const m = /^\s*(\d+)\b/.exec(reply);
      const n = m ? Number(m[1]) : 0;
      return n >= 1 && n <= prepared.length ? n - 1 : -1;
    }, () => -1);
}

// Banks for the last few profiles, keyed by the hash of the profile each was
// made from, so switching back to another job's profile needs no rebuild.
// Up to MAX_PROFILES in src/profiles.js, with room for stale banks of edited
// profiles, so a live profile's bank is never pushed out.
const MAX_BANKS = 30;

function readItems(list) {
  return parseItems(JSON.stringify(Array.isArray(list) ? list : []));
}

function createPreparedStore({ file } = {}) {
  let banks = []; // { hash, createdAt, items }, newest first

  function load() {
    banks = [];
    if (!file) return banks;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      // Before banks per profile the file held one bank; it still loads.
      const list = parsed && Array.isArray(parsed.banks) ? parsed.banks : (parsed && typeof parsed.hash === 'string' ? [parsed] : []);
      banks = list
        .filter((b) => b && typeof b.hash === 'string')
        .map((b) => ({ hash: b.hash, createdAt: Number(b.createdAt) || 0, items: readItems(b.items) }))
        .filter((b) => b.items.length)
        .slice(0, MAX_BANKS);
    } catch { /* no banks yet, or unreadable: prepare again */ }
    return banks;
  }

  const bankFor = (hash) => banks.find((b) => b.hash === hash) || null;

  // Returns false when the banks could not be written; they are still used in memory.
  function replace(hash, items, now = Date.now()) {
    banks = [{ hash, createdAt: now, items }, ...banks.filter((b) => b.hash !== hash)].slice(0, MAX_BANKS);
    return file ? writeFileAtomic(file, JSON.stringify({ banks })) : true;
  }

  function clear() {
    banks = [];
    return file ? removeFileAndTemp(file) : true;
  }

  return {
    load,
    replace,
    clear,
    isCurrent(hash) { const b = bankFor(hash); return !!(b && b.items.length); },
    match(heard, hash) { const b = bankFor(hash); return b ? findMatch(b.items, heard) : null; },
    matches(heard, hash, limit) { const b = bankFor(hash); return b ? findMatches(b.items, heard, limit) : []; },
    items(hash) { const b = bankFor(hash); return b ? b.items.slice() : []; },
    summary(hash) { const b = bankFor(hash); return { count: b ? b.items.length : 0, createdAt: b ? b.createdAt : 0 }; }
  };
}

module.exports = {
  createPreparedStore, profileHash, canPrepare, parseItems, findMatch, findMatches, pickSameQuestion,
  PREPARE_INSTRUCTIONS, PREPARE_MAX_TOKENS
};
