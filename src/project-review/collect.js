// Reads a project for a code review: every source, test, config and backend
// file a reviewer would open, and nothing that is build output, generated,
// binary, or a secret. Unlike the "my projects" scanner (src/projects-scan.js),
// this reads file contents, because the candidate was asked to review this
// code. Secret-shaped values inside files are masked before any of it leaves
// the machine, and files that exist only to hold secrets are never opened.

const fs = require('fs');
const path = require('path');

// Folders that are build output, dependencies, tool caches or platform
// scaffolding a review never needs. Matched by name at any depth.
const SKIP_DIRS = new Set([
  '.git', '.hg', '.svn', '.dart_tool', '.idea', '.vscode', '.fvm', '.gradle', '.cxx', '.pub-cache', '.pub',
  'node_modules', 'build', 'dist', 'out', '.next', '.nuxt', '.turbo', '.vercel', '.expo', 'coverage', '.cache',
  'Pods', 'DerivedData', 'xcuserdata', '.symlinks', 'ephemeral', 'Flutter', 'vendor', '__pycache__', '.venv', 'venv',
  'target', '.terraform', 'tmp', '.tmp',
  // Platform assets a code review never reads (icons, launch images, Android drawables).
  'Assets.xcassets', 'xcshareddata', 'res', 'Base.lproj',
  // AI assistants' own notes and settings, not the team's code.
  '.claude', '.cursor', '.codex', '.aider', '.continue'
]);
// Generated sources: reviewing them reviews the generator, not the team.
// Translations past the default language are the same strings again.
const EXTRA_LOCALE_RE = /\.arb$/;
const DEFAULT_LOCALE_RE = /(^|[_-])en([_-][A-Z]{2})?\.arb$|intl_messages\.arb$/;
const GENERATED_RE = /\.(g|freezed|gr|mocks|config|pb|pbenum|pbjson|pbserver|chopper|reflectable)\.dart$|\.generated\.\w+$|\.min\.(js|css)$|(^|\/)(generated_plugin_registrant|GeneratedPluginRegistrant)\.\w+$|(^|\/)l10n\/app_localizations.*\.dart$/;
// Files that exist to hold secrets or signing material: never opened.
const SECRET_FILE_RE = /(^|\/)\.env(\..*)?$|\.(pem|key|p12|p8|pfx|jks|keystore|mobileprovision|cer|crt|der|ppk|asc|gpg)$|(^|\/)(google-services\.json|GoogleService-Info\.plist|key\.properties|keystore\.properties|signing\.properties|local\.properties|credentials\.json|client_secret.*\.json|service[-_]?account.*\.json|.*-firebase-adminsdk-.*\.json|\.npmrc|\.pypirc|\.netrc|\.git-credentials|id_(rsa|dsa|ecdsa|ed25519)(\..*)?|cue-data.*\.json|cue-.*\.json)$/i;
// A JSON file holding a private key (a service account downloaded under another name).
const PRIVATE_KEY_JSON_RE = /"private_key"\s*:|"type"\s*:\s*"service_account"/;
// Only text a reviewer reads. Lockfiles are huge and say nothing a review needs
// beyond the manifest next to them.
const TEXT_EXT = new Set([
  'dart', 'yaml', 'yml', 'json', 'md', 'kt', 'kts', 'java', 'swift', 'm', 'mm', 'h', 'gradle', 'xml', 'plist',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue', 'svelte', 'css', 'scss', 'html', 'py', 'go', 'rs', 'rb', 'php',
  'sql', 'sh', 'toml', 'graphql', 'gql', 'prisma', 'arb', 'properties', 'cfg', 'ini', 'txt'
]);
const SKIP_FILES = new Set(['pubspec.lock', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'Podfile.lock', 'Gemfile.lock', 'Cargo.lock', 'composer.lock', 'poetry.lock']);
// Files a reader starts from: listed first so a split review reads them early.
const ENTRY_RE = /^(pubspec\.yaml|package\.json|analysis_options\.yaml|README\.md|lib\/main\.dart|lib\/app\.dart|lib\/main_\w+\.dart|src\/main\.\w+|src\/index\.\w+|app\/layout\.\w+|tsconfig\.json)$/;

const MAX_FILE_CHARS = 60000;    // one very long file is cut, with a note, not dropped
const MAX_FILES = 4000;
const MAX_TOTAL_CHARS = 12000000; // about 3 million tokens: past that, the review says what it left out
const MAX_DEPTH = 20;
// Walking stops here: a folder this big is not one project (a Downloads or
// home folder picked by mistake), and walking all of it would take minutes.
const MAX_WALK_ENTRIES = 60000;

// Secret-shaped values in source, replaced by [hidden]:
//  - private key blocks (PEM), JWTs, and provider keys by their known prefixes;
//  - a password in a URL;
//  - any value assigned to a name that says key, secret, token or password,
//    quoted or not (Dart, JSON, YAML, .properties, shell, Dockerfile), when it
//    has no spaces: UI text such as "Enter your password" is kept, the review
//    needs it and it is not a secret;
//  - any quoted key-like string of 24+ characters mixing letters and digits,
//    whatever it is called, so a key nested in JSON under a plain name is
//    hidden too. Hashes and ids go with it; a review loses nothing by that.
const SECRET_NAME = '(?:[A-Za-z0-9_]*(?:key|secret|token|passw(?:or)?d|pwd|apikey|auth|credential|private|signature|salt)[A-Za-z0-9_]*)';
const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g, '[hidden private key]'],
  [/eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[hidden]'],
  [/\b(sk|pk|rk)_(live|test)_[A-Za-z0-9]{10,}/g, '[hidden]'],
  [/\b(sk-(ant-|proj-)?[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|xox[abpr]-[A-Za-z0-9-]{10,}|AKIA[0-9A-Z]{16}|SG\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,})/g, '[hidden]'],
  [/(:\/\/[^/\s:@'"]+:)[^@\s'"]+@/g, '$1[hidden]@'],
  // Also Groovy's space form: storePassword "x".
  [new RegExp(`(${SECRET_NAME}["']?\\s*(?:[:=]\\s*|\\s+)["'])(?=[^"'\\s]*\\d)[^"'\\s]{6,}(["'])`, 'gi'), '$1[hidden]$2'],
  [/(["'])(?=[A-Za-z0-9_\-+/=.]*\d)(?=[A-Za-z0-9_\-+/=.]*[A-Za-z])[A-Za-z0-9_\-+/=.]{24,}\1/g, '$1[hidden]$1']
];

// In config files a value is written without quotes (password: x, KEY=x,
// export KEY=x, ENV KEY=x); in source code the same shape is a variable
// passed along (apiKey: apiKey), so this rule is for config files only.
const CONFIG_FILE_RE = /\.(ya?ml|properties|sh|bash|zsh|toml|ini|cfg|conf|txt|gradle|kts)$|(^|\/)(Dockerfile|Makefile|Procfile)$|(^|\/)\.[^/]*rc$/i;
const UNQUOTED_SECRET_RE = new RegExp(`(^|[\\s{,(]|export\\s+|ENV\\s+)(${SECRET_NAME}\\s*[:=]\\s*)(?!["'\\s\\[{(]|\\$|null\\b|true\\b|false\\b|none\\b|nil\\b)[^\\s,;#]{6,}`, 'gim');

// rel: the file's path in the project, which decides the config-file rule;
// with none, text is treated as config too (the stricter choice).
function maskSecrets(text, rel = '') {
  let out = String(text);
  for (const [re, to] of SECRET_PATTERNS) out = out.replace(re, to);
  if (!rel || CONFIG_FILE_RE.test(rel)) out = out.replace(UNQUOTED_SECRET_RE, '$1$2[hidden]');
  return out;
}

const isBinary = (buf) => buf.subarray(0, 8000).includes(0);

// In a Flutter project, the desktop platform folders and Xcode's project files
// are generated scaffolding. android/ and ios/ stay: their manifests and
// Info.plist hold permissions and release settings a review must check.
const FLUTTER_SKIP_DIRS = new Set(['linux', 'windows', 'macos']);
const XCODE_DIR_RE = /\.(xcodeproj|xcworkspace)$/;

// Every file worth reading under root, never following a link:
// { files: [{ rel, text, chars, cut }], skipped: { reason: count }, totalChars, truncated }
function collectProject(root, { maxFileChars = MAX_FILE_CHARS, maxFiles = MAX_FILES, maxTotalChars = MAX_TOTAL_CHARS } = {}) {
  const flutter = fs.existsSync(path.join(root, 'pubspec.yaml'));
  const files = [];
  const skipped = {};
  const skip = (why) => { skipped[why] = (skipped[why] || 0) + 1; };
  const found = [];
  let walked = 0;
  const walk = (dir, depth) => {
    if (depth > MAX_DEPTH) { skip('folders nested too deep'); return; }
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { skip('folders that could not be read'); return; }
    for (const e of entries) {
      if (++walked > MAX_WALK_ENTRIES) { if (walked === MAX_WALK_ENTRIES + 1) skip('files past the size cap'); return; }
      const abs = path.join(dir, e.name);
      const rel = path.relative(root, abs).split(path.sep).join('/');
      if (e.isSymbolicLink()) { skip('links (not followed)'); continue; }
      if (e.isDirectory()) {
        if (SKIP_DIRS.has(e.name)) { skip('build, dependency and tool folders'); continue; }
        if (flutter && ((depth === 0 && FLUTTER_SKIP_DIRS.has(e.name)) || XCODE_DIR_RE.test(e.name))) { skip('desktop platform scaffolding and Xcode project files'); continue; }
        walk(abs, depth + 1);
      } else if (e.isFile()) {
        if (SECRET_FILE_RE.test(rel)) { skip('secret and signing files (never opened)'); continue; }
        if (SKIP_FILES.has(e.name)) { skip('lockfiles'); continue; }
        if (GENERATED_RE.test(rel)) { skip('generated files'); continue; }
        if (EXTRA_LOCALE_RE.test(rel) && !DEFAULT_LOCALE_RE.test(rel)) { skip('translations other than English'); continue; }
        const ext = path.extname(e.name).slice(1).toLowerCase();
        if (!TEXT_EXT.has(ext) && e.name !== 'Dockerfile' && e.name !== 'Podfile' && e.name !== 'Makefile') { skip('images, fonts and other non-text files'); continue; }
        found.push({ abs, rel });
      }
    }
  };
  walk(root, 0);
  // Entry points first, then the rest by folder, so a review split in passes
  // reads the project the way a person would.
  found.sort((a, b) => (ENTRY_RE.test(b.rel) - ENTRY_RE.test(a.rel)) || a.rel.localeCompare(b.rel));
  let totalChars = 0;
  let truncated = false;
  for (const f of found) {
    if (files.length >= maxFiles || totalChars >= maxTotalChars) { truncated = true; skip('files past the size cap'); continue; }
    let buf;
    try { buf = fs.readFileSync(f.abs); } catch { skip('files that could not be read'); continue; }
    if (isBinary(buf)) { skip('images, fonts and other non-text files'); continue; }
    if (f.rel.endsWith('.json') && PRIVATE_KEY_JSON_RE.test(buf.toString('utf8'))) { skip('secret and signing files (never opened)'); continue; }
    let text = maskSecrets(buf.toString('utf8'), f.rel);
    const cut = text.length > maxFileChars;
    if (cut) text = text.slice(0, maxFileChars) + `\n/* cue: the rest of this ${buf.length}-byte file was not read */`;
    totalChars += text.length;
    files.push({ rel: f.rel, text, chars: text.length, cut });
  }
  return { files, skipped, totalChars, truncated: truncated || walked > MAX_WALK_ENTRIES };
}

// The folder tree as indented text, for the map pass and follow-ups.
function treeOf(files) {
  const lines = [];
  let prev = [];
  for (const f of [...files].sort((a, b) => a.rel.localeCompare(b.rel))) {
    const parts = f.rel.split('/');
    let i = 0;
    while (i < parts.length - 1 && prev[i] === parts[i]) i++;
    for (; i < parts.length - 1; i++) lines.push('  '.repeat(i) + parts[i] + '/');
    lines.push('  '.repeat(parts.length - 1) + parts[parts.length - 1]);
    prev = parts;
  }
  return lines.join('\n');
}

// What kind of project it is, from its manifest files.
function kindOf(files) {
  const has = (re) => files.some((f) => re.test(f.rel));
  if (has(/^pubspec\.yaml$/)) return 'flutter';
  if (has(/^package\.json$/)) return 'node';
  if (has(/^(pyproject\.toml|requirements\.txt)$/)) return 'python';
  if (has(/^go\.mod$/)) return 'go';
  return 'other';
}

module.exports = { collectProject, maskSecrets, treeOf, kindOf, SECRET_FILE_RE };
