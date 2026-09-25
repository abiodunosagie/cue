// Reads the candidate's own projects folder (~/Projects by default) so cue can
// talk about real work instead of the two or three projects a resume names.
//
// PRIVACY: what the scanner returns can end up in a prompt sent to the user's
// AI provider, so it reads a short, fixed list of files and nothing else:
//   README.md (the first part only), package.json and pubspec.yaml (name,
//   description, dependency names), the public metadata description of a
//   Next.js site's root layout, git history (dates and author emails,
//   which stay on this machine), top-level folder names, and whether a
//   requirements.txt / pyproject.toml exists (never its contents).
// It also reads the opening description of the project's SESSION_GUIDE.md
// (see guideIntro) and the NAMES of its pages, routes, screens and state files
// (see structureOf). It never opens a source file's contents, docs, .env files,
// database or backend folders, and never follows a symlink. The owner's ~/project-guides/_PROJECTS_INDEX.md
// is read by src/ipc/projects.js for the git identity per repo; like the author
// emails, it only feeds the commit counts. Author emails are used only to
// count the candidate's own commits and are never put in a card.

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const MAX_PROJECTS = 200;
const README_MAX_CHARS = 3000;
const README_EXCERPT_CHARS = 1200;
const MAX_TOP_DIRS = 20;
const GIT_TIMEOUT_MS = 8000;
const GIT_MAX_BUFFER = 8 * 1024 * 1024;

// Dependency names worth saying out loud in an interview, mapped to how a
// person would say them. Anything not listed is ignored: a list of 60 package
// names reads as noise, not experience.
const NPM_STACK = [
  [/^next$/, 'Next.js'], [/^react$/, 'React'], [/^react-native$/, 'React Native'], [/^expo$/, 'Expo'],
  [/^electron$/, 'Electron'], [/^vue$/, 'Vue'], [/^nuxt$/, 'Nuxt'], [/^svelte$/, 'Svelte'], [/^@angular\/core$/, 'Angular'],
  [/^vite$/, 'Vite'], [/^typescript$/, 'TypeScript'], [/^tailwindcss$/, 'Tailwind CSS'], [/^framer-motion$|^motion$/, 'Framer Motion'],
  [/^gsap$/, 'GSAP'], [/^three$/, 'Three.js'], [/^express$/, 'Express'], [/^@nestjs\/core$/, 'NestJS'], [/^hono$/, 'Hono'],
  [/^@supabase\/supabase-js$/, 'Supabase'], [/^firebase$|^firebase-admin$/, 'Firebase'], [/^prisma$|^@prisma\/client$/, 'Prisma'],
  [/^drizzle-orm$/, 'Drizzle'], [/^mongoose$|^mongodb$/, 'MongoDB'], [/^pg$|^postgres$/, 'PostgreSQL'], [/^mysql2?$/, 'MySQL'],
  [/paystack/, 'Paystack'], [/^stripe$|^@stripe\//, 'Stripe'], [/flutterwave/, 'Flutterwave'], [/^resend$/, 'Resend'],
  [/^@tanstack\/react-query$/, 'React Query'], [/^zustand$/, 'Zustand'], [/^@reduxjs\/toolkit$|^redux$/, 'Redux'],
  [/^zod$/, 'Zod'], [/^recharts$/, 'Recharts'], [/^socket\.io/, 'Socket.IO'], [/^@anthropic-ai\/sdk$/, 'Claude API'],
  [/^openai$/, 'OpenAI API'], [/^ai$/, 'Vercel AI SDK'], [/^leaflet$|^react-leaflet$|mapbox/, 'Maps'],
  [/^@sentry\//, 'Sentry'], [/^jest$|^vitest$/, 'Unit tests'], [/^@playwright\/test$|^cypress$/, 'E2E tests'],
  [/^wrangler$|^@opennextjs\/cloudflare$/, 'Cloudflare Workers'], [/^@vercel\//, 'Vercel']
];
const DART_STACK = [
  [/^flutter_riverpod$|^riverpod$|^hooks_riverpod$/, 'Riverpod'], [/^provider$/, 'Provider'], [/^flutter_bloc$|^bloc$/, 'Bloc'],
  [/^get$/, 'GetX'], [/^go_router$/, 'GoRouter'], [/^dio$/, 'Dio'], [/^fpdart$/, 'fpdart'], [/^freezed$/, 'Freezed'],
  [/^supabase_flutter$/, 'Supabase'], [/^firebase_core$/, 'Firebase'], [/^cloud_firestore$/, 'Firestore'],
  [/^firebase_messaging$/, 'Push notifications (FCM)'], [/^google_maps_flutter$/, 'Google Maps'], [/^geolocator$/, 'Location'],
  [/^stream_chat_flutter/, 'Stream Chat'], [/paystack/, 'Paystack'], [/flutterwave/, 'Flutterwave'], [/^purchases_flutter$/, 'RevenueCat'],
  [/^amplify_flutter$|^amplify_/, 'AWS Amplify'], [/^hive$|^hive_flutter$/, 'Hive'], [/^sqflite$|^drift$/, 'Local database'],
  [/^flutter_localizations$|^intl$/, 'Localization'], [/^local_auth$/, 'Biometrics'], [/^camera$|^image_picker$/, 'Camera'],
  [/^tflite|^google_mlkit/, 'On-device ML'], [/^ffi$/, 'dart:ffi'], [/^web_socket_channel$/, 'WebSockets'],
  [/^flutter_test$|^mockito$|^mocktail$/, 'Tests']
];

const SKIP_DIRS = new Set(['node_modules', 'build', 'dist', 'out', 'coverage', 'android', 'ios', 'macos', 'linux', 'windows', 'web', '.dart_tool', 'vendor', 'tmp']);

// In table order, so the framework comes first ("Next.js, React, Supabase"),
// not whichever package happens to be listed first.
function mapStack(names, table) {
  const out = [];
  for (const [re, label] of table) {
    if (!out.includes(label) && names.some((name) => re.test(name))) out.push(label);
  }
  return out;
}

// package.json: name, description and the stack its dependencies name.
function parsePackageJson(text) {
  let pkg;
  try { pkg = JSON.parse(text); } catch { return null; }
  if (!pkg || typeof pkg !== 'object') return null;
  const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
  return {
    name: typeof pkg.name === 'string' ? pkg.name : '',
    description: typeof pkg.description === 'string' ? pkg.description.trim() : '',
    stack: mapStack(deps, NPM_STACK)
  };
}

// pubspec.yaml, read line by line (no YAML library): the top-level name and
// description, and the package names under dependencies / dev_dependencies.
function parsePubspec(text) {
  const lines = String(text || '').split(/\r?\n/);
  let name = '';
  let description = '';
  let section = '';
  const deps = [];
  for (const line of lines) {
    const top = line.match(/^([a-z_]+):\s*(.*)$/);
    if (top) {
      section = top[1];
      const value = top[2].replace(/^["']|["']$/g, '').trim();
      if (section === 'name') name = value;
      if (section === 'description') description = value;
      continue;
    }
    const dep = line.match(/^ {2}([a-z0-9_]+):/);
    if (dep && (section === 'dependencies' || section === 'dev_dependencies')) deps.push(dep[1]);
  }
  const stack = ['Flutter', 'Dart', ...mapStack(deps, DART_STACK)];
  // Flutter's template description says nothing about the app.
  if (/^A new Flutter (project|application|package)\.?$/i.test(description)) description = '';
  return { name, description, stack };
}

// Templates the frameworks generate; a README that is only one of these says
// nothing about the project.
const BOILERPLATE = [
  /bootstrapped with \[?`?create-next-app/i, /bootstrapped with \[?`?create-react-app/i,
  /This project is a starting point for a Flutter application/i, /^A new Flutter project\.?$/i,
  /This template provides a minimal setup to get React working in Vite/i, /Welcome to your Expo app/i,
  /^First, run the development server/i, /A few resources to get you started if this is your first Flutter project/i,
  /^This is a \[?Next\.js\]? project/i, /^Getting Started\s*$/i
];

// Phrases only the stock Next.js / Flutter / Vite README paragraphs contain.
const TEMPLATE_PHRASES = [
  'localhost:3000', 'localhost:5173', 'next/font', 'vercel platform', 'create-next-app', 'next.js documentation',
  'docs.flutter.dev', 'flutter.dev/docs', 'first flutter project', 'flutter development, view the', 'you can start editing the page',
  'learn next.js', 'deploy on vercel', 'expand the eslint configuration', 'to learn more about next.js',
  'next.js github repository', 'next.js deployment documentation'
];

// A paragraph that points at the owner's machine or private notes is dropped
// whole: it can end up in a prompt sent to the AI provider.
const PRIVATE_RE = /~\/|\/Users\/|\/home\/|session guide|session_guide|\.env\b|api[_ -]?key|secret|passw|token|credential|private key/i;
// Secret-shaped text whatever it is called: an env line (NAME=value), a JWT,
// a URL with a password in it, or a long run of key-like characters.
const SECRET_SHAPE_RE = /(^|\s)[A-Z][A-Z0-9_]{2,}=\S|eyJ[A-Za-z0-9_-]{20,}|:\/\/[^/\s:@]+:[^@\s]+@|[A-Za-z0-9+/_-]{40,}/;
const isPrivate = (text) => PRIVATE_RE.test(text) || SECRET_SHAPE_RE.test(text);
// A line of in-page links ("[Features](#features) • [Setup](#setup)").
const LINK_ROW_RE = /^(\[[^\]]+\]\(#[^)]*\)\s*[•|·-]?\s*)+$/;

// The first real paragraph of a README: skips headings, badges, images, code
// fences, link lists and framework boilerplate.
function readmeExcerpt(text, limit = README_EXCERPT_CHARS) {
  const lines = String(text || '').slice(0, README_MAX_CHARS).split(/\r?\n/);
  const paragraphs = [];
  let current = [];
  let inFence = false;
  const flush = () => { if (current.length) { paragraphs.push(current.join(' ').trim()); current = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('```')) { inFence = !inFence; flush(); continue; }
    if (inFence) continue;
    // Headings, badges, images, HTML, tables, rules and box-drawing banners.
    if (!line || line.startsWith('#') || /^!\[|^\[!\[|^<|^---+$|^\||^[\u2500-\u257f]/.test(line)) { flush(); continue; }
    current.push(line.replace(/^[-*]\s+/, ''));
  }
  flush();
  const useful = paragraphs.filter((p) => p.length >= 25 && !BOILERPLATE.some((re) => re.test(p)) &&
    !TEMPLATE_PHRASES.some((phrase) => p.toLowerCase().includes(phrase)) && !isPrivate(p) && !LINK_ROW_RE.test(p));
  const out = useful.slice(0, 3).join('\n\n');
  return out.length > limit ? out.slice(0, limit).trimEnd() + '…' : out;
}

// The public description a Next.js site gives search engines, from the root
// layout's metadata: text every visitor's browser already receives. Only the
// first quoted description string is taken; nothing else in the file is used.
function siteDescription(text) {
  const m = String(text || '').match(/description:\s*(['"`])([^'"`\n]{15,300})\1/);
  if (!m) return '';
  const d = m[2].trim();
  return /generated by create next app/i.test(d) ? '' : d;
}

// ── The project's own session guide: what it is ─────────────────────────────
// Only the opening description of its "0." section ("What this is" in older
// guides): the rest of a guide is accounts, deploy steps and task logs. Any
// sentence carrying an email, a long id, a commit hash, a task number or
// anything secret-shaped is dropped before the text can reach a prompt.
const GUIDE_INTRO_CHARS = 900;
const GUIDE_SECTION_RE = /^##\s+(0\.|section 0\b|what this is\b)/i;
const RISKY_SENTENCE_RE = /@|\b\d{7,}\b|\b[0-9a-f]{7,40}\b|\bT\d{3}\b|\b(verify|verified|deploy|deployed|pushed|commit|tip|account|keychain|login|owner owes)\b/i;

function guideIntro(text, limit = GUIDE_INTRO_CHARS) {
  const lines = String(text || '').split(/\r?\n/);
  const start = lines.findIndex((l) => GUIDE_SECTION_RE.test(l.trim()));
  if (start < 0) return '';
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (/^#{1,3}\s/.test(line.trim()) || /^---+$/.test(line.trim())) break;
    body.push(line);
  }
  const paragraphs = body.join('\n').split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const out = [];
  let used = 0;
  // The first paragraph describes the project; a second one only when the
  // first is a single short line and the second is not a status update.
  const STATUS_RE = /^(current|status|now|next|recent|history|tell the client|note|todo|blocked)\b/i;
  const chosen = paragraphs[0] && paragraphs[0].length < 200 && paragraphs[1] && !STATUS_RE.test(paragraphs[1])
    ? paragraphs.slice(0, 2) : paragraphs.slice(0, 1);
  for (const para of chosen) {
    // A sentence ends at . ! or ? followed by a space and a capital (or the
    // end), so "com.beepexapp" or "Next.js" does not split one.
    const sentences = para.match(/[\s\S]+?[.!?](?=\s+[A-Z("]|\s*$)|[\s\S]+$/g) || [];
    for (const raw of sentences) {
      const sentence = raw.replace(/\*\*|`/g, '').trim();
      // A fragment left by a dropped sentence, such as a lone ")".
      if (!/[a-z]{3}/i.test(sentence) || /^\(/.test(sentence)) continue;
      if (isPrivate(sentence) || RISKY_SENTENCE_RE.test(sentence) || /https?:\/\//.test(sentence)) continue;
      if (used + sentence.length + 1 > limit) return out.join(' ');
      out.push(sentence);
      used += sentence.length + 1;
    }
  }
  return out.join(' ');
}

// ── How it was built: names only, never file contents ──────────────────────
// Screens and pages, API route paths, component folders, and for Flutter the
// feature folders and the state-management files (providers, notifiers,
// blocs, controllers). Database, migrations and backend folders are skipped:
// the candidate keeps that side private.
const STRUCTURE_CHARS = 5000;
const WALK_MAX_ENTRIES = 1500;
const WALK_MAX_DEPTH = 8;
const PRIVATE_DIRS = new Set(['supabase', 'prisma', 'migrations', 'migration', 'db', 'database', 'sql', 'seed', 'seeds', 'secrets', 'keys', 'certs', 'server', 'backend', 'functions']);
const WALK_SKIP = new Set([...SKIP_DIRS, ...PRIVATE_DIRS, 'test', 'tests', '__tests__', 'assets', 'public', 'fonts', 'l10n', 'generated', 'gen']);

// Every file under dir as a path relative to it, depth and count capped,
// never entering a skipped, hidden or symlinked folder.
function walk(dir) {
  const out = [];
  const visit = (abs, rel, depth) => {
    if (depth > WALK_MAX_DEPTH || out.length >= WALK_MAX_ENTRIES) return;
    let entries;
    try { entries = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (out.length >= WALK_MAX_ENTRIES) return;
      if (e.name.startsWith('.') || e.isSymbolicLink()) continue;
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!WALK_SKIP.has(e.name.toLowerCase())) visit(path.join(abs, e.name), r, depth + 1); }
      else out.push(r);
    }
  };
  visit(dir, '', 0);
  return out;
}

const cleanName = (name) => !isPrivate(name) && !/\.(env|pem|key|p12|jks|keystore)$/i.test(name) && !/secret|credential|password|token/i.test(name);
const cap = (list, n) => list.filter(cleanName).slice(0, n);

// Next.js / React: routes from app/ (page files) and pages/, API routes, and
// the component folders.
function webStructure(files) {
  const routes = new Set();
  const api = new Set();
  for (const f of files) {
    const m = f.match(/^(?:src\/)?app\/(.*?)(?:^|\/)?(page|route)\.(tsx?|jsx?)$/);
    if (m) {
      const p = '/' + m[1].split('/').filter((seg) => seg && !/^\(.*\)$/.test(seg) && !seg.startsWith('@')).join('/');
      const clean = p.replace(/\/$/, '') || '/';
      (m[2] === 'route' || clean.startsWith('/api') ? api : routes).add(clean);
      continue;
    }
    const pg = f.match(/^(?:src\/)?pages\/(.*)\.(tsx?|jsx?)$/);
    if (pg && !/^_/.test(path.basename(pg[1]))) {
      const clean = '/' + pg[1].replace(/(^|\/)index$/, '').replace(/\/$/, '');
      (clean.startsWith('/api') ? api : routes).add(clean || '/');
    }
  }
  const components = [...new Set(files
    .map((f) => f.match(/^(?:src\/)?components\/([^/]+?)(?:\.(tsx?|jsx?))?(?:\/|$)/))
    .filter(Boolean).map((m) => m[1]))];
  const parts = [];
  if (routes.size) parts.push('Pages: ' + cap([...routes].sort(), 80).join(', '));
  if (api.size) parts.push('API routes: ' + cap([...api].sort(), 60).join(', '));
  if (components.length) parts.push('Component folders: ' + cap(components.sort(), 50).join(', '));
  return parts;
}

// Flutter: the lib/ folder layout, the screens, and the state management.
function flutterStructure(files) {
  const lib = files.filter((f) => f.startsWith('lib/') && f.endsWith('.dart'));
  const base = (f) => path.basename(f, '.dart');
  const screens = lib.filter((f) => /_(screen|page|view)$/.test(base(f))).map(base);
  const state = lib.filter((f) => /_(provider|providers|notifier|controller|bloc|cubit|viewmodel|view_model|store|state)$/.test(base(f))).map(base);
  const dirs = [...new Set(lib.map((f) => f.split('/').slice(1, 4).slice(0, -1).join('/')).filter(Boolean))];
  const features = [...new Set(lib.map((f) => f.match(/^lib\/features?\/([^/]+)\//)).filter(Boolean).map((m) => m[1]))];
  const layered = features.length && lib.some((f) => /^lib\/features?\/[^/]+\/(data|domain|presentation)\//.test(f));
  const parts = [];
  if (layered) parts.push('Architecture: feature-first, each feature split into data, domain and presentation layers');
  if (features.length) parts.push('Features: ' + cap(features.sort(), 60).join(', '));
  if (screens.length) parts.push('Screens: ' + cap([...new Set(screens)].sort(), 90).join(', '));
  if (state.length) parts.push('State management files: ' + cap([...new Set(state)].sort(), 70).join(', '));
  if (dirs.length) parts.push('lib folders: ' + cap(dirs.sort(), 60).join(', '));
  return parts;
}

// The structure note for one project, or '' when there is nothing to show.
function structureOf(dir, stack) {
  const files = walk(dir);
  const parts = stack.includes('Flutter') ? flutterStructure(files) : webStructure(files);
  const text = parts.join('\n');
  return text.length > STRUCTURE_CHARS ? text.slice(0, STRUCTURE_CHARS).replace(/,[^,]*$/, '') + ' …' : text;
}

// "email<TAB>unix time" lines from git log: commit counts per author and the
// first and last commit dates.
function parseGitLog(text) {
  const authors = new Map();
  let first = 0;
  let last = 0;
  for (const line of String(text || '').split('\n')) {
    const [email, at] = line.split('\t');
    const ts = Number(at);
    if (!email || !Number.isFinite(ts)) continue;
    const key = email.trim().toLowerCase();
    authors.set(key, (authors.get(key) || 0) + 1);
    if (!first || ts < first) first = ts;
    if (ts > last) last = ts;
  }
  const total = [...authors.values()].reduce((a, b) => a + b, 0);
  return { authors, total, first: first * 1000, last: last * 1000 };
}

// The candidate's commits: those made under any of their own emails. Shown
// as information only; the candidate says what their role was.
function ownershipOf(git, ownEmails) {
  if (!git || !git.total) return { mine: 0, total: 0 };
  let mine = 0;
  for (const [email, count] of git.authors) if (ownEmails.has(email)) mine += count;
  return { mine, total: git.total };
}

// _PROJECTS_INDEX.md table rows: `~/Projects/...` path and the git identity
// the owner commits under for that repo (client identities count as theirs).
function parseProjectsIndex(text, home) {
  const map = new Map();
  for (const line of String(text || '').split('\n')) {
    const repo = line.match(/`(~\/[^`]+)`/);
    const email = line.match(/<([^>\s]+@[^>\s]+)>/);
    if (!repo || !email) continue;
    map.set(path.resolve(repo[1].replace(/^~/, home)), email[1].toLowerCase());
  }
  return map;
}

function yearsLabel(first, last) {
  if (!first || !last) return '';
  const a = new Date(first).getFullYear();
  const b = new Date(last).getFullYear();
  return a === b ? String(a) : `${a} to ${b}`;
}

// Title Case from a folder name: "votixcare-admin" -> "Votixcare Admin".
function prettyName(folder) {
  return String(folder).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

// A symlink is never followed: a README.md pointing at .env must read as nothing.
function readSmall(file, max) {
  try {
    if (fs.lstatSync(file).isSymbolicLink()) return '';
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(max);
      const n = fs.readSync(fd, buf, 0, max, 0);
      return buf.slice(0, n).toString('utf8');
    } finally { fs.closeSync(fd); }
  } catch { return ''; }
}

function exists(file) { try { fs.accessSync(file); return true; } catch { return false; } }

function gitLog(dir) {
  return new Promise((resolve) => {
    execFile('git', ['-C', dir, 'log', '--all', '--format=%ae%x09%at'],
      { timeout: GIT_TIMEOUT_MS, maxBuffer: GIT_MAX_BUFFER },
      (err, stdout) => resolve(err ? '' : stdout));
  });
}

function topDirs(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.') && !SKIP_DIRS.has(d.name))
      .map((d) => d.name).sort().slice(0, MAX_TOP_DIRS);
  } catch { return []; }
}

async function scanOne(dir, root, ownEmails) {
  const rel = path.relative(root, dir);
  const hasGit = exists(path.join(dir, '.git'));
  const pkgText = readSmall(path.join(dir, 'package.json'), 200000);
  const pubText = readSmall(path.join(dir, 'pubspec.yaml'), 100000);
  if (!hasGit && !pkgText && !pubText) return null;

  const pkg = pkgText ? parsePackageJson(pkgText) : null;
  const pub = pubText ? parsePubspec(pubText) : null;
  const stack = [...(pub ? pub.stack : []), ...(pkg ? pkg.stack : [])].filter((v, i, a) => a.indexOf(v) === i);
  if (!stack.length && (exists(path.join(dir, 'requirements.txt')) || exists(path.join(dir, 'pyproject.toml')))) stack.push('Python');

  let site = '';
  if (pkg && pkg.stack.includes('Next.js')) {
    for (const f of ['src/app/layout.tsx', 'app/layout.tsx', 'src/app/layout.jsx', 'app/layout.jsx']) {
      site = siteDescription(readSmall(path.join(dir, f), 20000));
      if (site) break;
    }
  }
  const git = hasGit ? parseGitLog(await gitLog(dir)) : null;
  const own = ownershipOf(git, ownEmails(dir));
  return {
    id: rel,
    name: prettyName(path.basename(dir)),
    category: rel.split(path.sep)[0],
    stack,
    // The same privacy rule as the README: a description naming a path or a secret is dropped.
    description: [pub && pub.description, pkg && pkg.description, site].find((d) => d && !isPrivate(d)) || '',
    readme: readmeExcerpt(readSmall(path.join(dir, 'README.md'), README_MAX_CHARS)),
    // Kept in the main process for drafting only; never stored as-is.
    // Read whole (locally) to find section 0, which can sit deep in a long guide.
    guide: guideIntro(readSmall(path.join(dir, 'SESSION_GUIDE.md'), 600000)),
    structure: structureOf(dir, stack),
    folders: topDirs(dir),
    years: git ? yearsLabel(git.first, git.last) : '',
    lastCommit: git ? git.last : 0,
    commits: own.total,
    myCommits: own.mine
  };
}

// Every project one or two levels under root (~/Projects/web/foo, or
// ~/Projects/foo when it is a project itself), newest work first.
async function scanProjects({ root, home, ownEmails = [], indexText = '' }) {
  const base = new Set(ownEmails.map((e) => String(e).toLowerCase()));
  const index = parseProjectsIndex(indexText, home);
  const emailsFor = (dir) => {
    const set = new Set(base);
    const extra = index.get(path.resolve(dir));
    if (extra) set.add(extra);
    return set;
  };
  const dirs = [];
  let top;
  try { top = fs.readdirSync(root, { withFileTypes: true }); } catch { throw new Error('Could not open ' + root + '.'); }
  for (const entry of top) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const dir = path.join(root, entry.name);
    const isProject = ['.git', 'package.json', 'pubspec.yaml'].some((f) => exists(path.join(dir, f)));
    if (isProject) { dirs.push(dir); continue; }
    try {
      for (const sub of fs.readdirSync(dir, { withFileTypes: true })) {
        if (sub.isDirectory() && !sub.name.startsWith('.')) dirs.push(path.join(dir, sub.name));
      }
    } catch { /* unreadable folder: skip */ }
  }
  const found = [];
  for (const dir of dirs.slice(0, MAX_PROJECTS * 2)) {
    const p = await scanOne(dir, root, emailsFor);
    if (p) found.push(p);
  }
  found.sort((a, b) => b.lastCommit - a.lastCommit);
  return found.slice(0, MAX_PROJECTS);
}

module.exports = {
  scanProjects,
  parsePackageJson,
  parsePubspec,
  readmeExcerpt,
  siteDescription,
  guideIntro,
  structureOf,
  webStructure,
  flutterStructure,
  parseGitLog,
  ownershipOf,
  parseProjectsIndex,
  yearsLabel,
  prettyName,
  MAX_PROJECTS
};
