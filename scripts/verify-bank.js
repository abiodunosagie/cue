#!/usr/bin/env node
// Runs every coding solution in src/bank/coding/*.js against its tests, in Dart
// (dart run) and TypeScript (node, which runs .ts by stripping the types), and
// checks that each answer's Run it block runs too. A bank answer is read out
// in a live interview, so nothing goes in untested.
// Usage: node scripts/verify-bank.js [id ...]   (no ids: every item)
// Slow (a Dart compile per item), so it is not part of npm test; the fast
// shape and matching checks are, in test/question-bank.test.js.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { readCoding, runBlock, literal, LANGUAGES, STEP_MARK } = require('../src/question-bank');

const DIR = path.join(__dirname, '..', 'src', 'bank', 'coding');
const PARALLEL = 4;
const TIMEOUT_MS = 60000;
// The owner bans this dash from all copy; built from its code point so this file holds none.
const LONG_DASH = String.fromCharCode(0x2014);

function run(cmd, args, cwd) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout: TIMEOUT_MS, maxBuffer: 8 * 1024 * 1024 }, (error, stdout, stderr) => {
      resolve({ ok: !error, stdout: String(stdout), stderr: String(stderr || (error && error.message) || '') });
    });
  });
}

const byJson = (a, b) => { const x = JSON.stringify(a); const y = JSON.stringify(b); return x < y ? -1 : x > y ? 1 : 0; };

// Results compared as JSON, after the item's compare rule: 'sorted' ignores the
// order of the outer list, 'nested' also the order inside each inner list.
function normalize(value, compare) {
  if (!Array.isArray(value) || !compare || compare === 'exact') return value;
  const list = compare === 'nested' ? value.map((v) => (Array.isArray(v) ? [...v].sort(byJson) : v)) : value;
  return [...list].sort(byJson);
}

function same(actual, expected, compare) {
  return JSON.stringify(normalize(actual, compare)) === JSON.stringify(normalize(expected, compare));
}

// The program that prints one JSON line per test: the item's own verify code,
// else a call of item.fn on each test's args.
function testProgram(item, lang, code) {
  const custom = item.verify && item.verify[lang];
  const args = (t) => t.args.map((a) => literal(a, lang)).join(', ');
  if (lang === 'dart') {
    const body = custom || ('void main() {\n  final s = Solution();\n' +
      item.tests.map((t) => '  print(__c.jsonEncode(s.' + item.fn + '(' + args(t) + ')));').join('\n') + '\n}');
    return "import 'dart:convert' as __c;\n" + code + '\n\n' + body + '\n';
  }
  const body = custom || item.tests.map((t) => 'console.log(JSON.stringify(' + item.fn + '(' + args(t) + ')));').join('\n');
  return code + '\n\n' + body + '\n';
}

async function checkLanguage(item, lang, workDir) {
  const problems = [];
  const code = item.code[lang];
  const segments = code.split(STEP_MARK).filter((s) => s.trim());
  if (segments.length !== item.steps.length) problems.push(`${lang}: ${segments.length} code steps for ${item.steps.length} step lines`);
  const full = code.replace(STEP_MARK, '');
  const ext = lang === 'dart' ? 'dart' : 'ts';
  const exec = (file) => (lang === 'dart' ? run('dart', ['run', file], workDir) : run('node', ['--no-warnings', file], workDir));

  const testFile = path.join(workDir, 'test.' + ext);
  fs.writeFileSync(testFile, testProgram(item, lang, full));
  const res = await exec(testFile);
  if (!res.ok) problems.push(`${lang}: tests did not run: ${res.stderr.trim().split('\n').slice(0, 6).join(' | ')}`);
  else {
    const lines = res.stdout.trim().split('\n').filter((l) => l.trim());
    if (lines.length !== item.tests.length) problems.push(`${lang}: ${lines.length} results for ${item.tests.length} tests`);
    item.tests.forEach((t, i) => {
      let actual;
      try { actual = JSON.parse(lines[i]); } catch { actual = lines[i]; }
      if (!same(actual, t.expected, item.compare)) problems.push(`${lang}: test ${i + 1} gave ${lines[i]}, expected ${JSON.stringify(t.expected)}`);
    });
  }

  // The Run it block the candidate pastes must run as well.
  const runFile = path.join(workDir, 'run.' + ext);
  fs.writeFileSync(runFile, full + '\n\n' + runBlock(item, lang) + '\n');
  const ran = await exec(runFile);
  if (!ran.ok) problems.push(`${lang}: Run it block failed: ${ran.stderr.trim().split('\n').slice(0, 4).join(' | ')}`);
  return problems;
}

async function checkItem(item) {
  if (!readCoding(item).length) return ['incomplete item (missing a required field)'];
  const problems = [];
  if (JSON.stringify(item).includes(LONG_DASH)) problems.push('contains a long dash');
  // Language-specific problems (a browser utility in TypeScript, a Dart idiom)
  // carry one language only.
  for (const lang of LANGUAGES) {
    if (!item.code[lang]) continue;
    const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-bank-'));
    try { problems.push(...await checkLanguage(item, lang, workDir)); } finally { fs.rmSync(workDir, { recursive: true, force: true }); }
  }
  return problems;
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const items = [];
  for (const name of fs.readdirSync(DIR).filter((n) => n.endsWith('.js')).sort()) {
    for (const it of require(path.join(DIR, name))) items.push({ ...it, _file: name });
  }
  const ids = new Set();
  const dupes = items.filter((it) => (ids.has(it.id) ? true : (ids.add(it.id), false))).map((it) => it.id);
  if (dupes.length) console.log('Duplicate ids: ' + dupes.join(', '));
  const todo = only.size ? items.filter((it) => only.has(it.id)) : items;
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < todo.length) {
      const item = todo[next++];
      const problems = await checkItem(item);
      if (problems.length) { failed++; console.log(`FAIL ${item._file} ${item.id}\n  ` + problems.join('\n  ')); }
      else console.log(`ok   ${item._file} ${item.id}`);
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  console.log(`\n${todo.length - failed} of ${todo.length} passed`);
  process.exit(failed || dupes.length ? 1 : 0);
}

main();
