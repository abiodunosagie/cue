// Where the project to review is, without anything appearing on screen: the
// folders the candidate's editors have open (read from the editors' own
// state files, no picker, no drag), a path they paste, or a GitHub link cloned
// into a private folder under cue's app data.
//
// Formats read on the owner's Mac (2026-09-28):
//   JetBrains (IntelliJ IDEA, Android Studio, PyCharm):
//     <product>/options/recentProjects.xml, one
//     <entry key="$USER_HOME$/path"> per project with an activationTimestamp
//     (ms) and, while the IDE runs, opened="true" on its RecentProjectMetaInfo.
//   VS Code: User/globalStorage/storage.json, windowsState.lastActiveWindow.folder
//     and windowsState.openedWindows[].folder as file:// URLs.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');

const MAX_CANDIDATES = 6;
const CLONE_TIMEOUT_MS = 120000;

function readText(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return ''; }
}

function listDirs(dir, re) {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && re.test(d.name)).map((d) => path.join(dir, d.name)); } catch { return []; }
}

const unescapeXml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// JetBrains recentProjects.xml text: [{ path, at, open, editor }].
function parseJetBrains(xml, { home = os.homedir(), editor = 'IntelliJ' } = {}) {
  const out = [];
  const entryRe = /<entry key="([^"]+)">([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const key = unescapeXml(m[1]).replace(/\$USER_HOME\$/g, home);
    if (!path.isAbsolute(key)) continue;
    const body = m[2];
    const at = Number((/name="activationTimestamp" value="(\d+)"/.exec(body) || [])[1]) || 0;
    const open = /<RecentProjectMetaInfo\b[^>]*\bopened="true"/.test(body);
    out.push({ path: key, at, open, editor });
  }
  return out;
}

// VS Code storage.json text: [{ path, at, open, editor }]; `mtime` stands in for
// the time, VS Code keeps none per folder.
function parseVsCode(json, { mtime = 0 } = {}) {
  let data;
  try { data = JSON.parse(json); } catch { return []; }
  const ws = (data && data.windowsState) || {};
  const toPath = (u) => { try { return u && u.startsWith('file://') ? decodeURIComponent(new URL(u).pathname) : ''; } catch { return ''; } };
  const out = [];
  const last = toPath(ws.lastActiveWindow && ws.lastActiveWindow.folder);
  if (last) out.push({ path: last, at: mtime, open: false, editor: 'VS Code' });
  for (const w of Array.isArray(ws.openedWindows) ? ws.openedWindows : []) {
    const p = toPath(w && w.folder);
    if (p && p !== last) out.push({ path: p, at: mtime - 1, open: true, editor: 'VS Code' });
  }
  return out;
}

// Which editors are running, by their app bundle in the process list: an
// "opened" flag in a closed editor's file is left over from a crash or an
// older version and means nothing.
function runningEditors() {
  let out = '';
  try { out = require('child_process').execFileSync('ps', ['-Ao', 'comm'], { encoding: 'utf8', timeout: 3000 }); } catch { return new Set(); }
  const on = new Set();
  if (/IntelliJ IDEA[^/]*\.app\//.test(out)) on.add('IntelliJ IDEA');
  if (/Android Studio[^/]*\.app\//.test(out)) on.add('Android Studio');
  if (/PyCharm[^/]*\.app\//.test(out)) on.add('PyCharm');
  if (/WebStorm[^/]*\.app\//.test(out)) on.add('WebStorm');
  if (/Visual Studio Code[^/]*\.app\//.test(out)) on.add('VS Code');
  if (/Cursor\.app\//.test(out)) on.add('Cursor');
  return on;
}

// The projects the candidate most likely means, open ones in a running editor
// first, then the most recently used; only folders that still exist.
// [{ path, name, editor, open, at }]
function detectProjects({ home = os.homedir(), running = runningEditors() } = {}) {
  const support = path.join(home, 'Library', 'Application Support');
  const found = [];
  const jetbrains = [
    ...listDirs(path.join(support, 'JetBrains'), /^(IntelliJIdea|IdeaIC|AndroidStudio|PyCharm|WebStorm|GoLand)/),
    ...listDirs(path.join(support, 'Google'), /^AndroidStudio/)
  ];
  for (const dir of jetbrains) {
    const editor = /AndroidStudio/.test(dir) ? 'Android Studio' : /PyCharm/.test(dir) ? 'PyCharm' : /WebStorm/.test(dir) ? 'WebStorm' : 'IntelliJ IDEA';
    found.push(...parseJetBrains(readText(path.join(dir, 'options', 'recentProjects.xml')), { home, editor }));
  }
  for (const app of ['Code', 'Cursor']) {
    const file = path.join(support, app, 'User', 'globalStorage', 'storage.json');
    let mtime = 0;
    try { mtime = fs.statSync(file).mtimeMs; } catch { continue; }
    found.push(...parseVsCode(readText(file), { mtime }).map((p) => ({ ...p, editor: app === 'Cursor' ? 'Cursor' : 'VS Code' })));
  }
  const best = new Map();
  for (const f of found) {
    const p = { ...f, open: f.open && running.has(f.editor) };
    const prev = best.get(p.path);
    if (!prev || (p.open && !prev.open) || (p.open === prev.open && p.at > prev.at)) best.set(p.path, p);
  }
  return [...best.values()]
    .filter((p) => { try { return fs.statSync(p.path).isDirectory(); } catch { return false; } })
    .sort((a, b) => (b.open - a.open) || (b.at - a.at))
    .slice(0, MAX_CANDIDATES)
    .map((p) => ({ ...p, name: path.basename(p.path) }));
}

// A pasted folder path: resolved, existing, and never the whole disk, the
// system, or the home folder itself. Resolves the real path or throws.
function resolveFolder(input, { home = os.homedir() } = {}) {
  const raw = String(input || '').trim().replace(/^file:\/\//, '');
  if (!raw) throw new Error('Paste a folder path or a GitHub link.');
  const expanded = raw === '~' || raw.startsWith('~/') ? path.join(home, raw.slice(1)) : raw;
  if (!path.isAbsolute(expanded)) throw new Error('Use the full path, for example ~/Downloads/their-app.');
  let real;
  try { real = fs.realpathSync(expanded); } catch { throw new Error('That folder does not exist.'); }
  if (!fs.statSync(real).isDirectory()) throw new Error('That is a file, not a folder.');
  const blocked = ['/', '/System', '/Library', '/Applications', '/Users', '/private', '/usr', '/bin', '/etc', fs.realpathSync(home)];
  if (blocked.includes(real)) throw new Error('Pick the project folder itself, not a whole disk or home folder.');
  return real;
}

// https://github.com/owner/repo (optionally .git or a trailing path): { owner, repo } or null.
function parseGitHub(input) {
  const m = /^https:\/\/github\.com\/([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:\/.*)?$/.exec(String(input || '').trim());
  if (!m || m[2] === '.' || m[2] === '..') return null;
  return { owner: m[1], repo: m[2] };
}

// A shallow clone into dir/<hash>, replacing an older clone of the same repo.
// Public repos only: git never asks for a password (it would show a prompt).
function cloneGitHub(input, dir) {
  const gh = parseGitHub(input);
  if (!gh) return Promise.reject(new Error('Only github.com links like https://github.com/owner/repo are supported.'));
  const url = `https://github.com/${gh.owner}/${gh.repo}.git`;
  const dest = path.join(dir, crypto.createHash('sha256').update(url).digest('hex').slice(0, 16), gh.repo);
  fs.rmSync(path.dirname(dest), { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  return new Promise((resolve, reject) => {
    execFile('git', ['clone', '--depth', '1', '--no-tags', '--', url, dest], {
      timeout: CLONE_TIMEOUT_MS,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_ASKPASS: '/usr/bin/true' }
    }, (err, _out, stderr) => {
      if (!err) { resolve(dest); return; }
      const why = /not found|Repository not found|could not read Username|Authentication/i.test(String(stderr))
        ? 'the repository is private or does not exist; clone it yourself and paste the folder path'
        : err.killed ? 'it took too long' : 'git failed';
      reject(new Error('Could not download it: ' + why + '.'));
    });
  });
}

module.exports = { parseJetBrains, parseVsCode, detectProjects, runningEditors, resolveFolder, parseGitHub, cloneGitHub };
