// The Dart analyzer, run in the background before the AI reads a line: its
// findings are real (file, line, rule), not a model's guess, and they arrive in
// seconds. It runs from the Flutter SDK on this Mac, never from the project,
// with no window and a bare environment. Other kinds of project get no tool
// run: a project's own tool (its node_modules/.bin/tsc, say) is its code.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const ANALYZE_TIMEOUT_MS = 240000;
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
      const found = String(out || '').trim().split('\n').pop();
      let bin = '';
      try { if (!err && path.isAbsolute(found)) bin = path.dirname(fs.realpathSync(found)); } catch { bin = ''; }
      resolve(bin && executable(path.join(bin, 'dart')) ? bin : '');
    });
  });
}

// env is the child's whole environment: cue's own (with its keys and tokens) is never passed on.
function run(cmd, args, { cwd, timeout, env }) {
  return new Promise((resolve) => {
    execFile(cmd, args, { cwd, timeout, maxBuffer: MAX_OUTPUT, env }, (err, stdout, stderr) => {
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

// An analyzer plugin is a package the analyzer loads and runs: in a project
// someone else wrote, that is their code running on this Mac. Projects that
// declare one (new style: a top-level plugins: key; old style: analyzer:
// plugins:), in analysis_options.yaml or any file it includes, are not
// analyzed. An include that cannot be followed counts as a plugin: unknown is
// not safe.
function declaresAnalyzerPlugins(root) {
  let packages = null;
  const packagePath = (name) => {
    if (!packages) {
      try {
        const cfg = JSON.parse(fs.readFileSync(path.join(root, '.dart_tool', 'package_config.json'), 'utf8'));
        packages = new Map((cfg.packages || []).map((p) => [p.name, new URL(p.rootUri + (p.rootUri.endsWith('/') ? '' : '/'), 'file://' + path.join(root, '.dart_tool') + '/')]));
      } catch { packages = new Map(); }
    }
    return packages.get(name);
  };
  const seen = new Set();
  const check = (file, depth) => {
    if (depth > 5 || seen.has(file)) return false;
    seen.add(file);
    let text;
    try { text = fs.readFileSync(file, 'utf8'); } catch { return depth > 0; }
    if (/^\s*plugins\s*:/m.test(text)) return true;
    for (const m of text.matchAll(/^\s*include\s*:\s*["']?([^"'\s#]+)/gm)) {
      const ref = m[1];
      let next = '';
      const pkg = /^package:([a-z0-9_]+)\/(.+)$/.exec(ref);
      if (pkg) {
        const base = packagePath(pkg[1]);
        if (!base) return true;
        next = path.join(decodeURIComponent(base.pathname), 'lib', pkg[2]);
      } else next = path.resolve(path.dirname(file), ref);
      if (check(next, depth + 1)) return true;
    }
    return false;
  };
  return check(path.join(root, 'analysis_options.yaml'), 0);
}

// Runs the analyzer for this project. onStatus(text) reports each step.
// Resolves { tool, findings, note }: tool '' when none ran, and note says why
// in plain words. Never runs a program from inside the project, never fetches
// its packages or writes into it: the project is someone else's.
async function runTools(root, kind, { onStatus = () => {}, home = os.homedir() } = {}) {
  if (kind !== 'flutter') return { tool: '', findings: [], note: 'cue runs the Dart analyzer on Flutter and Dart projects only; this review is the AI\'s reading alone.' };
  const bin = await findFlutterBin({ home });
  if (!bin) return { tool: '', findings: [], note: 'Flutter is not installed on this Mac, so the review is the AI\'s reading alone.' };
  if (!fs.existsSync(path.join(root, '.dart_tool', 'package_config.json'))) {
    return { tool: '', findings: [], note: 'The project\'s packages have not been fetched (no .dart_tool folder), so the analyzer was skipped rather than change their project. Opening it in the IDE, or flutter pub get, fixes that.' };
  }
  if (declaresAnalyzerPlugins(root)) {
    return { tool: '', findings: [], note: 'The project declares analyzer plugins, which would run its own code on this Mac, so the analyzer was skipped.' };
  }
  onStatus('Running the Dart analyzer...');
  // A bare environment: nothing of the candidate's (tokens, keys) reaches the tool.
  const env = { PATH: `${bin}:/usr/bin:/bin`, HOME: home, FLUTTER_SUPPRESS_ANALYTICS: 'true' };
  const res = await run(path.join(bin, 'dart'), ['analyze', '--format=machine'], { cwd: root, timeout: ANALYZE_TIMEOUT_MS, env });
  if (res.killed) return { tool: 'dart analyze', findings: [], note: 'The analyzer took too long and was stopped.' };
  return { tool: 'dart analyze', findings: parseDartMachine(res.stdout + '\n' + res.stderr, fs.realpathSync(root)), note: '' };
}

// The findings as the lines a prompt and the report show.
function formatFindings(findings, limit = 150) {
  return findings.slice(0, limit).map((f) => `${f.severity} ${f.file}:${f.line} ${f.message} (${f.rule})`).join('\n');
}

module.exports = { parseDartMachine, declaresAnalyzerPlugins, runTools, formatFindings };
