// The question bank: interview questions with senior answers written before
// any interview, shipped with the app and the same for every profile. Two parts:
// - qa: technical questions (Flutter, web front end, back end, system design)
//   with the answer to say. A heard question that matches one is answered at
//   once, with no model wait, through the same path as prepared answers.
// - coding: classic coding problems with tested solutions in Dart and
//   TypeScript, in cue's coding answer format. A task on screen that the Fast
//   model calls the same task is answered from here, like the coding library.
// Never shown in the app: it exists for cue to answer from, not to read.
// Behavioral questions are not here: those come from the candidate's own
// stories (prepared answers), never from a shared bank.
// Every coding solution is run against its tests by scripts/verify-bank.js.

const fs = require('fs');
const path = require('path');
const { findMatches } = require('./prepared-answers');

const DIR = path.join(__dirname, 'bank');
const ROLES = ['mobile', 'frontend', 'backend', 'all'];
// What each resolved role focus may draw on without the question naming the
// technology. A null focus (nothing set, nothing detected) draws on everything.
const ROLE_SCOPE = {
  mobile: ['mobile', 'all'],
  frontend: ['frontend', 'all'],
  backend: ['backend', 'all'],
  fullstack: ['frontend', 'backend', 'all']
};
// Looser than a prepared answer's 0.4: an interviewer words a general question
// many ways, and every candidate under the near-identical line still goes to
// the Fast model, which says NONE when it is not the same question.
const CANDIDATE_MIN = 0.3;
const LANGUAGES = ['dart', 'typescript'];
const STEP_MARK = /^[ \t]*\/\/@step[^\n]*\n?/gm;
const FENCE = '```';

// Each topic is a module exporting an array of items (template literals keep
// code and answers readable in the source).
function readDir(sub) {
  const dir = path.join(DIR, sub);
  let names = [];
  try { names = fs.readdirSync(dir).filter((n) => n.endsWith('.js')).sort(); } catch { return []; }
  const out = [];
  for (const name of names) {
    try {
      const list = require(path.join(dir, name));
      if (Array.isArray(list)) out.push(...list);
    } catch (e) {
      console.log(`[bank] skipped ${sub}/${name}: ${e && e.message ? e.message : String(e)}`);
    }
  }
  return out;
}

const str = (v) => (typeof v === 'string' ? v.trim() : '');

function readQa(it) {
  if (!it || typeof it !== 'object') return null;
  const question = str(it.question);
  const answer = str(it.answer);
  if (!str(it.id) || !question || !answer) return null;
  const roles = Array.isArray(it.roles) ? it.roles.filter((r) => ROLES.includes(r)) : [];
  return {
    id: str(it.id),
    question,
    variants: Array.isArray(it.variants) ? it.variants.map(str).filter(Boolean) : [],
    answer,
    roles: roles.length ? roles : ['all'],
    anchors: Array.isArray(it.anchors) ? it.anchors.map((a) => str(a).toLowerCase()).filter(Boolean) : []
  };
}

// An item outside the role's scope still matches when the heard question names
// its technology ("in Flutter, how do you..." during a web interview).
function inScope(item, role, heardLower) {
  const scope = ROLE_SCOPE[role];
  if (!scope || item.roles.some((r) => scope.includes(r))) return true;
  return item.anchors.some((a) => new RegExp('\\b' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(heardLower));
}

// A value as a source literal both Dart and TypeScript accept: [1, 2], "a", null.
// Dart reads $ in a string as interpolation, so it is escaped there.
function literal(value, lang) {
  if (Array.isArray(value)) return '[' + value.map((v) => literal(v, lang)).join(', ') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k, v]) => literal(k, lang) + ': ' + literal(v, lang)).join(', ') + '}';
  const json = JSON.stringify(value === undefined ? null : value);
  return lang === 'dart' && typeof value === 'string' ? json.replace(/\$/g, '\\$') : json;
}

function runBlock(item, lang) {
  const custom = item.run && str(item.run[lang]);
  if (custom) return custom;
  const call = (t) => (lang === 'dart' ? 's.' : '') + item.fn + '(' + t.args.map((a) => literal(a, lang)).join(', ') + ')';
  const lines = item.tests.map((t) => (lang === 'dart' ? '  print(' : 'console.log(') + call(t) + '); // ' + JSON.stringify(t.expected));
  return lang === 'dart' ? 'void main() {\n  final s = Solution();\n' + lines.join('\n') + '\n}' : lines.join('\n');
}

const RUN_WHERE = {
  dart: 'Paste it below the full code and run it with the editor\'s Run button, or dart run main.dart, or in DartPad.',
  typescript: 'Paste it below the full code and run it with the editor\'s Run button, or npx tsx main.ts.'
};

// The answer for one language in the coding answer format (src/prompts.js
// leetcode, SMALL TASK), built from the item's parts and its code's //@step marks.
function renderSolution(item, lang) {
  const code = item.code[lang];
  const segments = code.split(STEP_MARK).map((s) => s.replace(/\s+$/, '')).filter((s) => s.trim());
  const full = code.replace(STEP_MARK, '').replace(/\s+$/, '');
  const parts = [
    '**What it asks:** ' + item.asks,
    '**The idea:** ' + item.idea,
    '**Where it goes:** ' + (str(item.where && item.where[lang]) || 'the solution file, replacing the starter code.')
  ];
  item.steps.forEach((step, i) => {
    parts.push('**Step ' + (i + 1) + ': ' + step.what + '**\n' + FENCE + lang + '\n' + (segments[i] || '') + '\n' + FENCE + '\n**Say:** ' + step.say);
  });
  parts.push('**Check it on the example:** ' + item.check);
  parts.push('**Full code to paste:**\n' + FENCE + lang + '\n' + full + '\n' + FENCE);
  parts.push('**Time and space:** ' + item.complexity);
  parts.push('**Run it:**\n' + FENCE + lang + '\n' + runBlock(item, lang) + '\n' + FENCE + '\n' + RUN_WHERE[lang]);
  return parts.join('\n\n');
}

// One coding item as the coding library's items look, one per language, or [].
function readCoding(it) {
  if (!it || typeof it !== 'object' || !str(it.id) || !str(it.title) || !str(it.statement)) return [];
  if (!Array.isArray(it.steps) || !it.steps.length || !it.code || !Array.isArray(it.tests)) return [];
  if (!str(it.asks) || !str(it.idea) || !str(it.check) || !str(it.complexity)) return [];
  if (!it.fn && !it.run) return [];
  const out = [];
  for (const lang of LANGUAGES) {
    if (!str(it.code[lang])) continue;
    const signature = str(it.signature && it.signature[lang]);
    out.push({
      id: 'bank:' + str(it.id) + ':' + lang,
      title: str(it.title),
      statement: str(it.statement) + (signature ? '\nSignature: ' + signature : ''),
      language: lang,
      solution: renderSolution(it, lang),
      createdAt: 0,
      updatedAt: 0,
      uses: 0,
      flagged: '',
      bank: true
    });
  }
  return out;
}

function createQuestionBank({ qa, coding } = {}) {
  const qaItems = (qa || readDir('qa')).map(readQa).filter(Boolean);
  const codingItems = (coding || readDir('coding')).flatMap(readCoding);
  return {
    // The closest bank questions to the heard one for this role focus, best first.
    matches(heard, role, limit = 3) {
      const lower = String(heard || '').toLowerCase();
      return findMatches(qaItems.filter((it) => inScope(it, role, lower)), heard, limit, CANDIDATE_MIN);
    },
    codingItems: () => codingItems,
    counts: () => ({ qa: qaItems.length, coding: codingItems.length })
  };
}

module.exports = { createQuestionBank, readDir, renderSolution, readCoding, readQa, literal, runBlock, LANGUAGES, STEP_MARK };
