// Prepared answers: before the interview, the Smart model answers the questions
// this job is most likely to bring, from the candidate's own resume, job
// description and stories. When the interviewer asks one of them, the answer is
// on screen at once, with no model wait, and it is the answer he practised.
// Kept in cue-prepared.json next to cue-data.json (0600), rebuilt whenever the
// profile it was made from changes.

const fs = require('fs');
const crypto = require('crypto');
const { writeFileAtomic, removeFileAndTemp } = require('./atomic-file');
const { tokenize } = require('../renderer/reading-tracker');

const MAX_ITEMS = 30;
const MAX_ANSWER_CHARS = 2000;
// Word overlap (shared distinct content words over all of them) cannot tell
// "how do you manage state in Flutter" from "how do you test state management
// in Flutter" (0.6 against 0.67 for a true paraphrase). So only a near-identical
// question is used directly; a close one is a candidate the Fast model confirms.
// A wrong prepared answer read aloud is worse than a normal answer.
const DIRECT_MATCH = 0.85;
const CANDIDATE_MIN = 0.4;
const MIN_SHARED_WORDS = 2;
const CONFIRM_TIMEOUT_MS = 1500;
// Same idea, different word, after stemming.
const SYNONYMS = { application: 'app', program: 'app', codebase: 'project', repo: 'project', repository: 'project' };
// Room for about 20 questions with 3 or 4 phrasings and a spoken answer each.
const PREPARE_MAX_TOKENS = 8000;

// Everything an answer is built from. A change to any of it makes the bank stale.
const PROFILE_FIELDS = ['resumeText', 'jobDescription', 'starStories', 'whyCompany', 'whyLeaving', 'workStyle', 'salaryTarget', 'aiRules'];

function profileHash(settings) {
  const h = crypto.createHash('sha256');
  for (const k of PROFILE_FIELDS) h.update(k + '\0' + String((settings && settings[k]) || '') + '\0');
  return h.digest('hex');
}

// Enough profile to write real answers: a resume and a job description.
function canPrepare(settings) {
  return !!(settings && String(settings.resumeText || '').trim() && String(settings.jobDescription || '').trim());
}

const PREPARE_INSTRUCTIONS =
  'This time there is no single question to answer. Apply every rule above about voice, length and using only the candidate\'s real stories to each answer below.\n\n' +
  'List the 20 questions this interviewer is most likely to ask for this role, and write the answer the candidate should say out loud to each. ' +
  'Cover: the intro ("tell me about yourself"), why this role and company, the main technical topics in the job description, ' +
  'the behavioral questions the stories answer, strengths and weaknesses, and salary if a target is given.\n\n' +
  'For each question also give 3 or 4 other ways an interviewer might phrase it.\n\n' +
  'Reply with JSON only, no prose and no code fence: an array of objects {"question": string, "variants": [string], "answer": string}.';

// The candidate's context goes in the system prompt exactly as for a live
// answer (buildSystem from the answerThis mode), so prepared answers follow the
// same voice, length and no-invented-stories rules.
function preparePrompt() {
  return PREPARE_INSTRUCTIONS;
}

// Pull the JSON array out of the model's reply, tolerating a stray code fence
// or sentence around it. Invalid items are dropped, never guessed at.
function parseItems(text) {
  const raw = String(text || '');
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start < 0 || end <= start) return [];
  let parsed;
  try { parsed = JSON.parse(raw.slice(start, end + 1)); } catch { return []; }
  if (!Array.isArray(parsed)) return [];
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

function words(text) {
  return new Set(tokenize(text).map((w) => SYNONYMS[w] || w));
}

function similarity(a, b) {
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return { score: 0, shared: 0 };
  let shared = 0;
  for (const w of x) if (y.has(w)) shared++;
  return { score: shared / (x.size + y.size - shared), shared };
}

// The closest prepared item to the heard question: { item, score, direct },
// direct when it is near-identical, or null when nothing is even close.
function findMatch(items, heard) {
  let best = null;
  for (const item of items || []) {
    for (const q of [item.question, ...(item.variants || [])]) {
      const { score, shared } = similarity(heard, q);
      if (shared < MIN_SHARED_WORDS || score < CANDIDATE_MIN) continue;
      if (!best || score > best.score) best = { item, score };
    }
  }
  if (best) best.direct = best.score >= DIRECT_MATCH;
  return best;
}

const CONFIRM_SYSTEM =
  'You decide whether two interview questions ask for the same answer. Differences in wording do not matter; ' +
  'a different topic, a different angle (testing versus building, strength versus weakness) or a narrower scope does. ' +
  'Reply with exactly YES or NO.';

// Ask the Fast model whether a close candidate is really the same question.
// Resolves false on NO, on any error, and after the timeout, so doubt always
// falls back to a normal answer.
function confirmSameQuestion({ llm, heard, prepared, timeoutMs = CONFIRM_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    let reply = '';
    let settled = false;
    let timer = null;
    const finish = (value) => { if (settled) return; settled = true; clearTimeout(timer); resolve(value); };
    timer = setTimeout(() => finish(false), timeoutMs);
    llm.stream({
      system: CONFIRM_SYSTEM,
      turns: [{ role: 'user', text: 'Question heard: ' + heard + '\nPrepared question: ' + prepared }],
      maxTokens: 5,
      onToken: (t) => { reply += t; }
    }).then(() => finish(/^\s*yes\b/i.test(reply)), () => finish(false));
  });
}

function createPreparedStore({ file } = {}) {
  let bank = { hash: '', createdAt: 0, items: [] };

  function load() {
    if (!file) return bank;
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (parsed && typeof parsed.hash === 'string' && Array.isArray(parsed.items)) {
        bank = { hash: parsed.hash, createdAt: Number(parsed.createdAt) || 0, items: parseItems(JSON.stringify(parsed.items)) };
      }
    } catch { /* no bank yet, or unreadable: prepare again */ }
    return bank;
  }

  // Returns false when the bank could not be written; it is still used in memory.
  function replace(hash, items, now = Date.now()) {
    bank = { hash, createdAt: now, items };
    return file ? writeFileAtomic(file, JSON.stringify(bank)) : true;
  }

  function clear() {
    bank = { hash: '', createdAt: 0, items: [] };
    return file ? removeFileAndTemp(file) : true;
  }

  return {
    load,
    replace,
    clear,
    isCurrent(hash) { return !!bank.items.length && bank.hash === hash; },
    match(heard) { return findMatch(bank.items, heard); },
    items() { return bank.items.slice(); },
    summary() { return { count: bank.items.length, createdAt: bank.createdAt }; }
  };
}

module.exports = {
  createPreparedStore, profileHash, canPrepare, preparePrompt, parseItems, findMatch, confirmSameQuestion,
  DIRECT_MATCH, PREPARE_MAX_TOKENS
};
