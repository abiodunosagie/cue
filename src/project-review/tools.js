// The project's own tools, run in the background before the AI reads a line:
// the Dart analyzer for Flutter and Dart projects, the TypeScript compiler for
// TypeScript ones. Their findings are real (file, line, rule), not a model's
// guess, and they arrive in seconds. Nothing here opens a window: every tool
// runs as a child process with no terminal.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const ANALYZE_TIMEOUT_MS = 240000;
const PUB_GET_TIMEOUT_MS = 240000;
const MAX_FINDINGS = 400;
const MAX_OUTPUT = 32 * 1024 * 1024;

function executable(p) {
  try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; }
}

// The Flutter SDK's bin folder: a packaged app starts with a bare PATH, so the
// usual install places are checked, then the login shell's PATH.
function findFlutterBin({ home = os.homedir(), shell = true } = {}) {
  const guesses = [
    path.join(home, 'flutter', 'flutter', 'bin'), path.join(home, 'flutter', 'bin'), path.join(home, 'development', 'flutter', 'bin'),
    path.join(home, 'fvm', 'default', 'bin'), path.join(home, '.fvm', 'default', 'bin'), '/opt/homebrew/bin', '/usr/local/bin'
  ];
  const hit = guesses.find((d) => executable(path.join(d, 'flutter')) && executable(path.join(d, 'dart')));
  if (hit || !shell) return Promise.resolve(hit || '');
  return new Promise((resolve) => {
    execFile('/bin/zsh', ['-lc', 'command -v flutter'], { timeout: 8000 }, (err, out) => {
      const bin = !err && String(out).trim() ? path.dirname(fs.realpathSync(String(out).trim())) : '';
      resolve(bin && executable(path.join(bin, 'dart')) ? bin : '');
    });
  });
}

function run(cmd, args, { cwd, timeout, env }) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout, maxBuffer: MAX_OUTPUT, env: { ...process.env, ...env } }, (err, stdout, stderr) => {
      resolve({ ok: !err, code: err && typeof err.code === 'number' ? err.code : 0, killed: !!(err && err.killed), stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

// `dart analyze --format=machine` lines, captured from a real run:
//   ERROR|COMPILE_TIME_ERROR|UNDEFINED_IDENTIFIER|/abs/lib/a.dart|5|9|1|Undefined name 'y'.
// SEVERITY|TYPE|CODE|FILE|LINE|COLUMN|LENGTH|MESSAGE; a | inside the message is escaped as \|.
function parseDartMachine(text, root) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const parts = line.split(/(?<!\\)\|/);
    if (parts.length < 8 || !/^(ERROR|WARNING|INFO)$/.test(parts[0])) continue;
    const file = parts[3];
    out.push({
      severity: parts[0].toLowerCase(),
      rule: parts[2].toLowerCase(),
      file: root && file.startsWith(root + path.sep) ? file.slice(root.length + 1).split(path.sep).join('/') : path.basename(file),
      line: Number(parts[4]) || 0,
      column: Number(parts[5]) || 0,
      message: parts.slice(7).join('|').replace(/\\\|/g, '|').trim()
    });
  }
  const rank = { error: 0, warning: 1, info: 2 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, MAX_FINDINGS);
}

// `tsc --noEmit --pretty false` lines: src/a.ts(12,5): error TS2322: Type ... .
function parseTsc(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^(.+?)\((\d+),(\d+)\): (error|warning) (TS\d+): (.+)$/.exec(line.trim());
    if (m) out.push({ severity: m[4], rule: m[5], file: m[1], line: Number(m[2]), column: Number(m[3]), message: m[6] });
  }
  return out.slice(0, MAX_FINDINGS);
}

// Runs the analyzer for this project. onStatus(text) reports each step.
// Resolves { tool, findings, note }: tool '' when none could run, and note
// says why in plain words.
async function runTools(root, kind, { onStatus = () => {}, home = os.homedir() } = {}) {
  if (kind === 'flutter') {
    const bin = await findFlutterBin({ home });
    if (!bin) return { tool: '', findings: [], note: 'Flutter is not installed on this Mac, so the review is the AI\'s reading alone.' };
    const flutter = path.join(bin, 'flutter');
    const dart = path.join(bin, 'dart');
    const env = { PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, FLUTTER_SUPPRESS_ANALYTICS: 'true', PUB_ENVIRONMENT: 'cue' };
    let note = '';
    // The analyzer needs the packages; they are fetched once, the way the IDE would.
    if (!fs.existsSync(path.join(root, '.dart_tool', 'package_config.json'))) {
      onStatus('Getting the project\'s packages (flutter pub get)...');
      const got = await run(flutter, ['pub', 'get'], { cwd: root, timeout: PUB_GET_TIMEOUT_MS, env });
      if (!got.ok) note = 'flutter pub get failed, so some findings may only be missing packages. ';
    }
    onStatus('Running the Dart analyzer...');
    const res = await run(dart, ['analyze', '--format=machine'], { cwd: root, timeout: ANALYZE_TIMEOUT_MS, env });
    if (res.killed) return { tool: 'dart analyze', findings: [], note: note + 'The analyzer took too long and was stopped.' };
    const findings = parseDartMachine(res.stdout + '\n' + res.stderr, fs.realpathSync(root));
    return { tool: 'dart analyze', findings, note: note.trim() };
  }
  if (kind === 'node') {
    const tsc = path.join(root, 'node_modules', '.bin', 'tsc');
    if (!fs.existsSync(path.join(root, 'tsconfig.json'))) return { tool: '', findings: [], note: 'No TypeScript config, so the review is the AI\'s reading alone.' };
    if (!executable(tsc)) return { tool: '', findings: [], note: 'The project\'s packages are not installed (no node_modules), so the TypeScript check was skipped.' };
    onStatus('Running the TypeScript compiler check...');
    const res = await run(tsc, ['--noEmit', '--pretty', 'false'], { cwd: root, timeout: ANALYZE_TIMEOUT_MS, env: {} });
    if (res.killed) return { tool: 'tsc', findings: [], note: 'The TypeScript check took too long and was stopped.' };
    return { tool: 'tsc', findings: parseTsc(res.stdout), note: '' };
  }
  return { tool: '', findings: [], note: 'No analyzer for this kind of project, so the review is the AI\'s reading alone.' };
}

// The findings as the lines a prompt and the report show.
function formatFindings(findings, limit = 150) {
  return findings.slice(0, limit).map((f) => `${f.severity} ${f.file}:${f.line} ${f.message} (${f.rule})`).join('\n');
}

module.exports = { findFlutterBin, parseDartMachine, parseTsc, runTools, formatFindings };
