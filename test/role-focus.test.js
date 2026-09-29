const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRoleFocus, resolveRoleFocus, rulesWithFocus, normalizeRoleFocus, FOCUS_RULES } = require('../src/role-focus');
const { MAX_AI_RULES_CHARS } = require('../src/profile-context');

test('a Flutter posting reads as mobile, a full stack one as full stack', () => {
  assert.equal(detectRoleFocus('Mobile Developer (Flutter), IndexRide Technologies Limited, Lagos. The role is Flutter mobile development.'), 'mobile');
  assert.equal(detectRoleFocus('Mobile Full Stack Developer, Out of the Box Systems. Flutter and Rust.'), 'fullstack');
  assert.equal(detectRoleFocus('We need a full-stack engineer'), 'fullstack');
});

test('one server word in a mobile posting stays mobile; two make it full stack', () => {
  assert.equal(detectRoleFocus('Flutter developer. You will work with our Node.js team and integrate REST APIs.'), 'mobile');
  assert.equal(detectRoleFocus('Flutter developer who will also build the REST APIs in Node.js.'), 'fullstack');
  assert.equal(detectRoleFocus('Android engineer. Backend development with PostgreSQL is part of the job.'), 'fullstack');
});

test('an empty or unrelated description gives no focus', () => {
  assert.equal(detectRoleFocus(''), null);
  assert.equal(detectRoleFocus('   '), null);
  assert.equal(detectRoleFocus(undefined), null);
  assert.equal(detectRoleFocus('Accountant, Port Harcourt'), null);
});

test('a hand-set focus wins over the job description; unknown values mean auto', () => {
  assert.equal(resolveRoleFocus({ roleFocus: 'mobile', jobDescription: 'Full stack engineer' }), 'mobile');
  assert.equal(resolveRoleFocus({ roleFocus: 'fullstack', jobDescription: 'Flutter developer' }), 'fullstack');
  assert.equal(resolveRoleFocus({ roleFocus: 'auto', jobDescription: 'Flutter developer' }), 'mobile');
  assert.equal(resolveRoleFocus({ roleFocus: '', jobDescription: 'Flutter developer' }), 'mobile');
  assert.equal(normalizeRoleFocus('backend'), 'auto');
  assert.equal(resolveRoleFocus({}), null);
});

test('the focus line follows the rules, even when the rules use the whole limit', () => {
  assert.equal(rulesWithFocus({ aiRules: ' Be brief. ', jobDescription: '' }), 'Be brief.');
  assert.equal(rulesWithFocus({ aiRules: '', roleFocus: 'mobile' }), FOCUS_RULES.mobile);
  assert.equal(rulesWithFocus({ aiRules: 'Be brief.', roleFocus: 'fullstack' }), 'Be brief.\n' + FOCUS_RULES.fullstack);
  const full = rulesWithFocus({ aiRules: 'x'.repeat(MAX_AI_RULES_CHARS + 50), roleFocus: 'mobile' });
  assert.ok(full.endsWith(FOCUS_RULES.mobile));
  assert.ok(full.startsWith('x'.repeat(MAX_AI_RULES_CHARS) + '\n'));
  assert.equal(rulesWithFocus(null), '');
});
