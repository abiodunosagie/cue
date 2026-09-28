// Runs a project review with the Coding model: the whole project in one pass
// when it fits the model's input, else part by part (notes from each) and one
// final report from all the notes. Only the final report is streamed to the
// panel; the parts show as status lines, so a long review never looks stuck.

const fs = require('fs');
const path = require('path');
const { REVIEW_SYSTEM, NOTES_SYSTEM, MERGE_SYSTEM, ASK_SYSTEM, mapBlock, filesBlock } = require('./prompts');
const { maskSecrets, SECRET_FILE_RE } = require('./collect');
const { formatFindings } = require('./tools');

// Code runs about 3.5 characters per token; the estimate errs large.
const CHARS_PER_TOKEN = 3.3;
// Input per request, in tokens, leaving room for the report and thinking.
// Anthropic's Opus, Sonnet and Fable models take 1M tokens and Haiku 4.5 200K
// (Anthropic's model table, 2026-06). Other providers' limits vary by model,
// so they get a size every current large model takes.
function inputBudget(llm) {
  const model = String(llm.model || '').toLowerCase();
  if (llm.provider === 'anthropic' || llm.provider === 'publik') {
    if (/haiku/.test(model)) return 140000;
    if (/opus|sonnet|fable|mythos/.test(model)) return 600000;
  }
  return 90000;
}
const REPORT_MAX_TOKENS = 20000;
const NOTES_MAX_TOKENS = 6000;
const IDLE_LIMIT_MS = 180000; // no sign of life this long: the request is dead

// Parts of at most budgetChars each, in the files' order (entry points first).
function planParts(files, budgetChars) {
  const parts = [];
  let current = [];
  let size = 0;
  for (const f of files) {
    if (current.length && size + f.chars > budgetChars) { parts.push(current); current = []; size = 0; }
    current.push(f);
    size += f.chars;
  }
  if (current.length) parts.push(current);
  return parts;
}

// One model call that fails rather than hangs: rejects after IDLE_LIMIT_MS with
// no token, thinking or other stream event.
function streamGuarded(llm, params) {
  let timer = null;
  let fail = () => {};
  const idle = new Promise((_resolve, reject) => { fail = reject; });
  const rearm = () => { clearTimeout(timer); timer = setTimeout(() => fail(new Error('the model stopped responding. Try the review again.')), IDLE_LIMIT_MS); };
  rearm();
  const wrap = (fn) => (x) => { rearm(); if (fn) fn(x); };
  const call = llm.stream({ ...params, onToken: wrap(params.onToken), onThinking: wrap(params.onThinking), onActivity: wrap(params.onActivity) });
  return Promise.race([call, idle]).finally(() => clearTimeout(timer));
}

function skippedNote(skipped) {
  const parts = Object.entries(skipped || {}).map(([why, n]) => `${n} ${why}`);
  return parts.join('; ');
}

// review({ llm, project, analyzer, onStatus, onToken, onThinking }) -> report text.
// project: { name, kind, tree, files, skipped, truncated }.
// analyzer: { tool, findings, note } from tools.runTools.
// budgetTokens: input per request; the model's own size unless given.
async function review({ llm, project, analyzer, onStatus = () => {}, onToken = () => {}, onThinking = () => {}, log = () => {}, budgetTokens = inputBudget(llm) }) {
  const budgetChars = Math.floor(budgetTokens * CHARS_PER_TOKEN);
  const analyzerInfo = analyzer && analyzer.tool ? { tool: analyzer.tool, count: analyzer.findings.length, text: formatFindings(analyzer.findings) } : null;
  const notSaid = [analyzer && analyzer.note, project.truncated ? 'the project passed cue\'s size cap and its last files were not read' : ''].filter(Boolean).join(' ');
  const map = mapBlock({ name: project.name, kind: project.kind, tree: project.tree, analyzer: analyzerInfo, note: notSaid, skippedNote: skippedNote(project.skipped) });
  const parts = planParts(project.files, Math.max(20000, budgetChars - map.length));
  log(`[timing] review: ${project.files.length} files, ${parts.length} part${parts.length === 1 ? '' : 's'}, budget ${budgetChars} chars (${llm.model})`);

  if (parts.length === 1) {
    onStatus(`Reading all ${project.files.length} files of ${project.name}...`);
    return streamGuarded(llm, {
      system: REVIEW_SYSTEM,
      turns: [{ role: 'user', text: map + 'The files:\n\n' + filesBlock(parts[0]) + '\n\nReview this codebase now.' }],
      maxTokens: REPORT_MAX_TOKENS,
      onToken, onThinking
    });
  }

  const notes = [];
  for (let i = 0; i < parts.length; i++) {
    const folders = [...new Set(parts[i].map((f) => f.rel.split('/').slice(0, 2).join('/')))].slice(0, 4).join(', ');
    onStatus(`Reading part ${i + 1} of ${parts.length} (${parts[i].length} files: ${folders})...`);
    const started = Date.now();
    const text = await streamGuarded(llm, {
      system: NOTES_SYSTEM,
      turns: [{ role: 'user', text: map + `Part ${i + 1} of ${parts.length}. The files:\n\n` + filesBlock(parts[i]) + '\n\nWrite the notes for this part.' }],
      maxTokens: NOTES_MAX_TOKENS,
      // Notes are not shown; the model's thinking is, so the wait note moves.
      onToken: () => {}, onThinking
    });
    log(`[timing] review: part ${i + 1}/${parts.length} took ${Date.now() - started}ms`);
    notes.push(`--- Part ${i + 1} of ${parts.length} ---\n${String(text || '').trim()}`);
  }
  onStatus(`Read all ${parts.length} parts. Writing the report...`);
  return streamGuarded(llm, {
    system: MERGE_SYSTEM,
    turns: [{ role: 'user', text: map + 'Notes from every part:\n\n' + notes.join('\n\n') + '\n\nWrite the report now.' }],
    maxTokens: REPORT_MAX_TOKENS,
    onToken, onThinking
  });
}

// ---- follow-up questions -----------------------------------------------

const PROJECT_WORD_RE = /\b(issue|problem|point|number|item|fix)\s*#?\s*\d{1,2}\b|\b(codebase|code base|the project|this project|the repo|this repo|the app|this app|the review|your review|refactor|performance|architecture)\b|\bwhere (is|are|do|does)\b|\bhow (is|are|does|do) .* (handled|done|built|work)/i;

const words = (s) => String(s || '').toLowerCase();
const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();

// The files a question is about: named by file name, by class name
// (AuthService -> auth_service.dart), or by an issue number from the review.
function filesForQuestion(question, index, report) {
  const q = String(question || '');
  const byBase = new Map(index.map((rel) => [path.basename(rel).replace(/\.\w+$/, '').toLowerCase(), rel]));
  const hits = new Set();
  for (const token of q.match(/[A-Za-z_][A-Za-z0-9_.]{2,}/g) || []) {
    const base = token.replace(/\.\w+$/, '');
    const rel = byBase.get(base.toLowerCase()) || byBase.get(snake(base));
    if (rel) hits.add(rel);
  }
  const issue = /\b(?:issue|problem|point|number|item|fix)\s*#?\s*(\d{1,2})\b/i.exec(q);
  if (issue && report) {
    const n = Number(issue[1]);
    const block = new RegExp(`\\*\\*${n}[.)][\\s\\S]*?(?=\\n\\*\\*${n + 1}[.)]|\\n\\*\\*Keeping|$)`).exec(report);
    for (const m of (block ? block[0] : '').matchAll(/([A-Za-z0-9_\-/]+\.[a-z]{1,5})(?::\d+)?/g)) {
      if (index.includes(m[1])) hits.add(m[1]);
    }
  }
  return [...hits].slice(0, 12);
}

// Whether a typed question is about the loaded project.
function isProjectQuestion(question, index) {
  if (PROJECT_WORD_RE.test(question)) return true;
  const q = words(question);
  // Class names too: AuthService is auth_service.dart.
  const named = new Set((String(question).match(/[A-Za-z_][A-Za-z0-9_]{3,}/g) || []).map(snake));
  return index.some((rel) => {
    const base = path.basename(rel).replace(/\.\w+$/, '').toLowerCase();
    return base.length > 3 && (named.has(base) || q.includes(base) || q.replace(/\s+/g, '_').includes(base));
  });
}

const ASK_FILE_CHARS = 200000;

// The user turn for a follow-up: the review, the map, and the named files read
// from disk now (masked, never a secret file, never outside the project).
function askTurn({ memory, question }) {
  const rels = filesForQuestion(question, memory.index, memory.report);
  const root = fs.realpathSync(memory.root);
  const parts = [];
  let size = 0;
  for (const rel of rels) {
    if (SECRET_FILE_RE.test(rel)) continue;
    let real;
    try { real = fs.realpathSync(path.join(root, rel)); } catch { continue; }
    if (!real.startsWith(root + path.sep)) continue;
    let text;
    try { text = maskSecrets(fs.readFileSync(real, 'utf8')); } catch { continue; }
    if (size + text.length > ASK_FILE_CHARS) break;
    size += text.length;
    parts.push({ rel, text });
  }
  return `Project: ${memory.name}\n\nFolder tree:\n${memory.tree}\n\nThe review from earlier:\n${memory.report}\n\n` +
    (parts.length ? 'Files the question is about, as they are on disk now:\n\n' + filesBlock(parts) + '\n\n' : '') +
    `The question: ${question}`;
}

module.exports = { review, inputBudget, planParts, isProjectQuestion, filesForQuestion, askTurn, ASK_SYSTEM, CHARS_PER_TOKEN };
