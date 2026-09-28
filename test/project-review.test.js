const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseJetBrains, parseVsCode, detectProjects, resolveFolder, parseGitHub } = require('../src/project-review/locate');
const { collectProject, maskSecrets, treeOf, kindOf } = require('../src/project-review/collect');
const { parseDartMachine, parseTsc } = require('../src/project-review/tools');
const { planParts, inputBudget, isProjectQuestion, filesForQuestion, askTurn } = require('../src/project-review/review');
const { createProjectMemory } = require('../src/project-review/memory');
const { MODES } = require('../src/prompts');

const tmp = () => fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cue-review-')));
const write = (root, rel, text) => { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), text); };

// Shape of the owner's IntelliJ IDEA 2026.2 recentProjects.xml, names changed.
const JETBRAINS_XML = `<application>
  <component name="RecentProjectsManager">
    <option name="additionalInfo">
      <map>
        <entry key="$USER_HOME$/Projects/mobile/app-one">
          <value>
            <RecentProjectMetaInfo frameTitle="app-one – router.dart" projectWorkspaceId="x">
              <option name="activationTimestamp" value="1790321475347" />
              <option name="projectOpenTimestamp" value="1790321105662" />
            </RecentProjectMetaInfo>
          </value>
        </entry>
        <entry key="$USER_HOME$/Projects/mobile/app-two">
          <value>
            <RecentProjectMetaInfo opened="true" frameTitle="app-two – main.dart" projectWorkspaceId="y">
              <option name="activationTimestamp" value="1790323821538" />
            </RecentProjectMetaInfo>
          </value>
        </entry>
      </map>
    </option>
    <option name="lastOpenedProject" value="$USER_HOME$/Projects/mobile/app-two" />
  </component>
</application>`;

test('JetBrains and VS Code state files give the projects, their time and whether they are open', () => {
  const jb = parseJetBrains(JETBRAINS_XML, { home: '/Users/me' });
  assert.deepEqual(jb, [
    { path: '/Users/me/Projects/mobile/app-one', at: 1790321475347, open: false, editor: 'IntelliJ' },
    { path: '/Users/me/Projects/mobile/app-two', at: 1790323821538, open: true, editor: 'IntelliJ' }
  ]);
  const vs = parseVsCode(JSON.stringify({ windowsState: { lastActiveWindow: { folder: 'file:///Users/me/Projects/web/site%20one' }, openedWindows: [{ folder: 'file:///Users/me/x' }] } }), { mtime: 5 });
  assert.deepEqual(vs.map((p) => [p.path, p.open]), [['/Users/me/Projects/web/site one', false], ['/Users/me/x', true]]);
  assert.deepEqual(parseVsCode('not json'), []);
});

test('an open flag counts only while that editor runs, and missing folders are dropped', () => {
  const home = tmp();
  const dir = path.join(home, 'Library', 'Application Support', 'JetBrains', 'IntelliJIdea2026.2', 'options');
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(path.join(home, 'Projects', 'mobile', 'app-one'), { recursive: true });
  fs.mkdirSync(path.join(home, 'Projects', 'mobile', 'app-two'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'recentProjects.xml'), JETBRAINS_XML.replace(/\$USER_HOME\$/g, '$USER_HOME$'));
  const closed = detectProjects({ home, running: new Set() });
  assert.deepEqual(closed.map((p) => [p.name, p.open]), [['app-two', false], ['app-one', false]]);
  const running = detectProjects({ home, running: new Set(['IntelliJ IDEA']) });
  assert.equal(running[0].name, 'app-two');
  assert.equal(running[0].open, true);
  fs.rmSync(path.join(home, 'Projects', 'mobile', 'app-two'), { recursive: true });
  assert.deepEqual(detectProjects({ home, running: new Set() }).map((p) => p.name), ['app-one']);
});

test('a pasted path must be a real project folder, never the disk, the system or home', () => {
  const home = tmp();
  const proj = path.join(home, 'their-app');
  fs.mkdirSync(proj);
  assert.equal(resolveFolder('~/their-app', { home }), proj);
  assert.equal(resolveFolder('file://' + proj, { home }), proj);
  assert.throws(() => resolveFolder('', { home }), /Paste/);
  assert.throws(() => resolveFolder('their-app', { home }), /full path/);
  assert.throws(() => resolveFolder('~/missing', { home }), /does not exist/);
  assert.throws(() => resolveFolder('/', { home }), /not a whole disk/);
  assert.throws(() => resolveFolder('~', { home }), /not a whole disk/);
  write(home, 'file.txt', 'x');
  assert.throws(() => resolveFolder('~/file.txt', { home }), /a file/);
});

test('only plain github.com repository links are cloned', () => {
  assert.deepEqual(parseGitHub('https://github.com/acme/app'), { owner: 'acme', repo: 'app' });
  assert.deepEqual(parseGitHub('https://github.com/acme/app.git'), { owner: 'acme', repo: 'app' });
  assert.deepEqual(parseGitHub('https://github.com/acme/app/tree/main/lib'), { owner: 'acme', repo: 'app' });
  for (const bad of ['http://github.com/a/b', 'https://gitlab.com/a/b', 'https://github.com/a', 'https://github.com/a/..', 'git@github.com:a/b.git', 'https://github.com/a/b;rm -rf']) {
    assert.equal(parseGitHub(bad), null, bad);
  }
});

test('the reader takes source, tests and backend, never secrets, build output, generated files or links', () => {
  const root = tmp();
  write(root, 'pubspec.yaml', 'name: demo');
  write(root, 'lib/main.dart', 'void main() {}');
  write(root, 'lib/models/user.g.dart', '// generated');
  write(root, 'lib/l10n/app_en.arb', '{"hello": "Hello"}');
  write(root, 'lib/l10n/app_fr.arb', '{"hello": "Bonjour"}');
  write(root, 'test/user_test.dart', 'void main() {}');
  write(root, 'supabase/functions/pay/index.ts', 'export {}');
  write(root, '.env', 'KEY=abc');
  write(root, 'android/app/google-services.json', '{}');
  write(root, 'android/key.properties', 'storePassword=x');
  write(root, 'build/app.js', 'x');
  write(root, '.dart_tool/x.json', '{}');
  write(root, 'pubspec.lock', 'x');
  write(root, 'assets/logo.png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 1, 2]));
  write(root, 'lib/big.dart', 'a'.repeat(100));
  fs.symlinkSync('/etc', path.join(root, 'lib', 'etc-link'));
  const r = collectProject(root, { maxFileChars: 50 });
  assert.deepEqual(r.files.map((f) => f.rel), ['lib/main.dart', 'pubspec.yaml', 'lib/big.dart', 'lib/l10n/app_en.arb', 'supabase/functions/pay/index.ts', 'test/user_test.dart']);
  assert.equal(r.files.find((f) => f.rel === 'lib/big.dart').cut, true);
  assert.equal(r.skipped['secret and signing files (never opened)'], 3);
  assert.equal(r.skipped['generated files'], 1);
  assert.equal(r.skipped['translations other than English'], 1);
  assert.equal(r.skipped['links (not followed)'], 1);
  assert.equal(kindOf(r.files), 'flutter');
  assert.match(treeOf(r.files), /^lib\/\n  big\.dart\n  l10n\/\n    app_en\.arb\n  main\.dart/);
});

test('real secrets are hidden and ordinary text is kept', () => {
  const src = [
    "const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.abcdefghijklmnop';",
    "apiKey: 'AIzaSyD1234567890abcdefghijklmnopqrstu',",
    "final stripe = 'sk_live_51Habcdefghijklmnop';",
    "const url = 'postgres://admin:hunter2@db.example.com/app';",
    "const token = 'a1b2c3d4e5f6g7h8i9j0';",
    '"passwordHint": "Enter your password",',
    "const secretLabel = 'Secret Santa';"
  ].join('\n');
  const out = maskSecrets(src);
  assert.doesNotMatch(out, /eyJhbGci|AIzaSy|sk_live|hunter2|a1b2c3d4e5/);
  assert.match(out, /"passwordHint": "Enter your password"/);
  assert.match(out, /'Secret Santa'/);
  assert.match(out, /postgres:\/\/admin:\[hidden\]@db\.example\.com/);
});

test('analyzer output is parsed from the real machine format and the TypeScript format', () => {
  const root = '/p/demo';
  const text = [
    'WARNING|STATIC_WARNING|UNUSED_LOCAL_VARIABLE|/p/demo/lib/a.dart|4|7|6|The value of the local variable \'unused\' isn\'t used.',
    'ERROR|COMPILE_TIME_ERROR|UNDEFINED_IDENTIFIER|/p/demo/lib/a.dart|5|9|1|Undefined name \'y\'.',
    'INFO|LINT|PREFER_CONST|/p/demo/lib/b.dart|1|1|1|Use const \\| or not.',
    'Analyzing demo...'
  ].join('\n');
  const f = parseDartMachine(text, root);
  assert.deepEqual(f.map((x) => [x.severity, x.file, x.line, x.rule]), [['error', 'lib/a.dart', 5, 'undefined_identifier'], ['warning', 'lib/a.dart', 4, 'unused_local_variable'], ['info', 'lib/b.dart', 1, 'prefer_const']]);
  assert.equal(f[2].message, 'Use const | or not.');
  assert.deepEqual(parseTsc("src/a.ts(12,5): error TS2322: Type 'string' is not assignable to type 'number'.")[0], { severity: 'error', rule: 'TS2322', file: 'src/a.ts', line: 12, column: 5, message: "Type 'string' is not assignable to type 'number'." });
});

test('a project too big for one read is split in order, and the budget follows the model', () => {
  const files = [1, 2, 3, 4, 5].map((i) => ({ rel: 'f' + i, chars: 40 }));
  assert.deepEqual(planParts(files, 100).map((p) => p.map((f) => f.rel)), [['f1', 'f2'], ['f3', 'f4'], ['f5']]);
  assert.deepEqual(planParts(files, 1000).length, 1);
  assert.equal(inputBudget({ provider: 'anthropic', model: 'claude-opus-5-5' }), 600000);
  assert.equal(inputBudget({ provider: 'anthropic', model: 'claude-haiku-4-5-20251001' }), 140000);
  assert.equal(inputBudget({ provider: 'openai', model: 'gpt-5' }), 90000);
});

test('follow-ups about the project are recognised and find their files', () => {
  const index = ['lib/main.dart', 'lib/services/auth_service.dart', 'lib/screens/login_screen.dart', 'pubspec.yaml'];
  const report = '**1. Tokens stored in plain prefs**\n**Where:** lib/services/auth_service.dart:40\n**2. Login screen rebuilds**\n**Where:** lib/screens/login_screen.dart:12\n**Keeping what works working:**';
  for (const q of ['fix issue 2', 'where is login handled?', 'what does AuthService do', 'is the architecture ok', 'improve performance of the app']) {
    assert.equal(isProjectQuestion(q, index), true, q);
  }
  for (const q of ['Tell me about yourself', 'what is a closure in Dart']) assert.equal(isProjectQuestion(q, index), false, q);
  assert.deepEqual(filesForQuestion('what does AuthService do', index, report), ['lib/services/auth_service.dart']);
  assert.deepEqual(filesForQuestion('fix issue 2', index, report), ['lib/screens/login_screen.dart']);
  assert.deepEqual(filesForQuestion('look at login_screen.dart', index, report), ['lib/screens/login_screen.dart']);
});

test('a follow-up re-reads its files from disk, masked, and never outside the project', () => {
  const root = tmp();
  write(root, 'lib/services/auth_service.dart', "const key = 'sk_live_51Habcdefghijklmnop';\nclass AuthService {}");
  write(root, '.env', 'SECRET=1');
  const outside = tmp();
  write(outside, 'secret.dart', 'outside');
  fs.symlinkSync(path.join(outside, 'secret.dart'), path.join(root, 'lib', 'secret.dart'));
  const memory = { root, name: 'demo', tree: 'lib/', index: ['lib/services/auth_service.dart', 'lib/secret.dart', '.env'], report: 'R' };
  const turn = askTurn({ memory, question: 'fix AuthService and secret.dart and .env' });
  assert.match(turn, /<file path="lib\/services\/auth_service\.dart">/);
  assert.match(turn, /\[hidden\]/);
  assert.doesNotMatch(turn, /sk_live|outside|SECRET=1/);
  assert.match(turn, /The question: fix AuthService/);
});

test('the review memory keeps text only, survives a restart and clears', () => {
  const file = path.join(tmp(), 'review.json');
  const m = createProjectMemory({ file });
  assert.equal(m.set({ root: '/p', name: 'demo', kind: 'flutter', tree: 't', index: ['a', 7], report: 'REPORT', reviewedAt: 5 }).index.length, 1);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  const again = createProjectMemory({ file });
  assert.equal(again.load().report, 'REPORT');
  assert.equal(again.set({ root: '/p', report: '' }), null, 'an empty report is not a review');
  again.clear();
  assert.equal(createProjectMemory({ file }).load(), null);
});

test('follow-ups, fixes and progress checks carry the review', () => {
  assert.equal(MODES.projectAsk.tier, 'coding');
  assert.equal(MODES.projectAsk.build({ projectTurn: 'TURN' }), 'TURN');
  assert.match(MODES.fixCode.build({ priorSolves: [], projectReport: 'REVIEW' }), /done earlier in the interview[\s\S]*REVIEW/);
  assert.doesNotMatch(MODES.fixCode.build({ priorSolves: [] }), /done earlier/);
});
