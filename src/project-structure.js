// What a project is and how it was built, for the Projects notes:
//  - guideIntro: the opening description of the project's own SESSION_GUIDE.md;
//  - structureOf: the NAMES of its pages, API routes, component folders, and for
//    Flutter its features, screens and state-management files.
// Only names and one description paragraph; never a file's contents, never a
// database, migrations or backend folder, never a symlink.

const fs = require('fs');
const path = require('path');
const { isPrivate, INFRA_RE, PERSONAL_RE } = require('./private-text');

// ── The project's own session guide: what it is ─────────────────────────────
// Only the opening description of its "0." section ("What this is" in older
// guides): the rest of a guide is accounts, deploy steps and task logs. The
// first sentence must read like a description ("X is a ... app"), or nothing
// is taken: a section 0 that is only status notes says nothing about the
// product. Any sentence carrying an email, an id, a hash, a date, a status
// word, a person or anything secret-shaped is dropped before a prompt sees it.
const GUIDE_INTRO_CHARS = 900;
const GUIDE_SECTION_RE = /^##\s+(0\.|section 0\b|what this is\b)/i;
const RISKY_SENTENCE_RE = /@|\b\d{7,}\b|\b[0-9a-f]{7,40}\b|\bT\d{3}\b|\b(verify|verified|deploy|deployed|pushed|commit|tip|account|keychain|login|owner owes)\b/i;
// "next" alone would catch "Next.js", so only "next step" / "next up" count.
const STATUS_WORD_RE = /\b(current|currently|now|next step|next up|recent|recently|today|focus|priority|blocked|bug|bugs|fix|fixed|invoice|invoiced|deliver|delivery|deadline|due|review|reviews|feedback|shipped|embarrass\w*|to-?dos?|remaining|pending|ask|tell the client|phase)\b/i;
const DESCRIPTION_RE = /\b(is|are)\s+(a|an|the|our)\b|\bbuilt\b|\b(app|site|website|dashboard|platform|portal|system|store|storefront|tool|bot|library|course|portfolio|back office|landing page|marketing site)\b/i;
const STATUS_PARAGRAPH_RE = /^(current|status|now|next|recent|history|tell the client|note|todo|blocked)\b/i;

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
  // The first paragraph describes the project; a second one only when the
  // first is a single short line and the second is not a status update.
  const chosen = paragraphs[0] && paragraphs[0].length < 200 && paragraphs[1] && !STATUS_PARAGRAPH_RE.test(paragraphs[1])
    ? paragraphs.slice(0, 2) : paragraphs.slice(0, 1);
  const out = [];
  let used = 0;
  for (const para of chosen) {
    // A sentence ends at . ! or ? followed by a space and a capital (or the
    // end), so "com.beepexapp" or "Next.js" does not split one.
    const sentences = para.match(/[\s\S]+?[.!?](?=\s+[A-Z("]|\s*$)|[\s\S]+$/g) || [];
    for (const raw of sentences) {
      const sentence = raw.replace(/\*\*|`/g, '').trim();
      // A fragment left by a dropped sentence, such as a lone ")".
      if (!/[a-z]{3}/i.test(sentence) || /^\(/.test(sentence)) continue;
      if (isPrivate(sentence) || RISKY_SENTENCE_RE.test(sentence) || INFRA_RE.test(sentence) ||
        PERSONAL_RE.test(sentence) || STATUS_WORD_RE.test(sentence) || /https?:\/\//.test(sentence)) continue;
      if (!out.length && !DESCRIPTION_RE.test(sentence)) return '';
      if (used + sentence.length + 1 > limit) return out.join(' ');
      out.push(sentence);
      used += sentence.length + 1;
    }
  }
  return out.join(' ');
}

// ── How it was built: names only, never file contents ──────────────────────
const STRUCTURE_CHARS = 5000;
const WALK_MAX_ENTRIES = 3000;
const WALK_MAX_DEPTH = 8;
const BUILD_DIRS = ['node_modules', 'build', 'dist', 'out', 'coverage', 'android', 'ios', 'macos', 'linux', 'windows', 'web', 'vendor', 'tmp'];
// The candidate keeps the database and backend side private.
const PRIVATE_DIRS = ['supabase', 'prisma', 'migrations', 'migration', 'db', 'database', 'sql', 'seed', 'seeds', 'secrets', 'keys', 'certs', 'server', 'backend', 'functions'];
const WALK_SKIP = new Set([...BUILD_DIRS, ...PRIVATE_DIRS, 'test', 'tests', '__tests__', 'assets', 'public', 'fonts', 'l10n', 'generated', 'gen']);

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

// A route, screen or folder name is kept unless one of its path segments looks
// like a key or a credential file. Ordinary words ("users", "token",
// "forgot-password") are real features and stay: this is a name check, not
// the prose filter.
const KEYLIKE_SEGMENT_RE = /^[A-Za-z0-9_-]{32,}$|^[0-9a-f]{24,}$|^eyJ/;
const CREDENTIAL_NAME_RE = /\.(env|pem|key|p12|jks|keystore)$|secret|credential|api[_-]?key|private[_-]?key|service[_-]?account/i;
const cleanName = (name) => !CREDENTIAL_NAME_RE.test(name) && !String(name).split('/').some((seg) => KEYLIKE_SEGMENT_RE.test(seg));

// "Label: a, b, c" with at most n items, saying how many more there are, or
// nothing when the filtered list is empty.
function listLine(label, list, n) {
  const clean = list.filter(cleanName);
  if (!clean.length) return null;
  const more = clean.length > n ? `, and ${clean.length - n} more` : '';
  return `${label}: ${clean.slice(0, n).join(', ')}${more}`;
}

// Next.js / React: routes from app/ (page and route files) and pages/, API
// routes, and the component folders.
function webStructure(files) {
  const routes = new Set();
  const api = new Set();
  for (const f of files) {
    // The file must be exactly page.* or route.*: "login-page.tsx" is a component.
    const m = f.match(/^(?:src\/)?app\/(?:(.*)\/)?(page|route)\.(tsx?|jsx?)$/);
    if (m) {
      const p = '/' + (m[1] || '').split('/').filter((seg) => seg && !/^\(.*\)$/.test(seg) && !seg.startsWith('@')).join('/');
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
  return [
    listLine('Pages', [...routes].sort(), 100),
    listLine('API routes', [...api].sort(), 100),
    listLine('Component folders', components.sort(), 50)
  ].filter(Boolean);
}

// Flutter: the lib/ folder layout, the screens, and the state management.
function flutterStructure(files) {
  const lib = files.filter((f) => f.startsWith('lib/') && f.endsWith('.dart'));
  const base = (f) => path.basename(f, '.dart');
  const screens = [...new Set(lib.filter((f) => /_(screen|page|view)$/.test(base(f))).map(base))];
  const state = [...new Set(lib.filter((f) => /_(provider|providers|notifier|controller|bloc|cubit|viewmodel|view_model|store|state)$/.test(base(f))).map(base))];
  const dirs = [...new Set(lib.map((f) => f.split('/').slice(1, 4).slice(0, -1).join('/')).filter(Boolean))];
  const features = [...new Set(lib.map((f) => f.match(/^lib\/features?\/([^/]+)\//)).filter(Boolean).map((m) => m[1]))];
  const layered = features.length && lib.some((f) => /^lib\/features?\/[^/]+\/(data|domain|presentation)\//.test(f));
  return [
    layered ? 'Architecture: feature-first, each feature split into data, domain and presentation layers' : null,
    listLine('Features', features.sort(), 60),
    listLine('Screens', screens.sort(), 100),
    listLine('State management files', state.sort(), 80),
    listLine('lib folders', dirs.sort(), 60)
  ].filter(Boolean);
}

// The structure note for one project, or '' when there is nothing to show.
function structureOf(dir, stack) {
  const files = walk(dir);
  const parts = stack.includes('Flutter') ? flutterStructure(files) : webStructure(files);
  const text = parts.join('\n');
  return text.length > STRUCTURE_CHARS ? text.slice(0, STRUCTURE_CHARS).replace(/,[^,]*$/, '') + ', and more' : text;
}

module.exports = { guideIntro, structureOf, webStructure, flutterStructure, walk };
