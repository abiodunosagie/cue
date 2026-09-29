const test = require('node:test');
const assert = require('node:assert/strict');
const { migrate, switchTo, create, removeCurrent, names } = require('../src/profiles');

const flat = { resumeText: 'CV', jobDescription: 'JD Acme', starStories: 'S', whyCompany: 'Acme mission', whyLeaving: 'Growth', workStyle: 'W', salaryTarget: '90k', questionsToAsk: 'Q', aiRules: 'keep', profiles: {}, activeProfile: '' };
const apply = (s, r) => ({ ...s, ...r.fields, profiles: r.profiles, activeProfile: r.activeProfile });

test('settings from before profiles become the first profile, untouched', () => {
  const m = migrate(flat);
  assert.equal(m.activeProfile, 'My profile');
  assert.equal(m.profiles['My profile'].jobDescription, 'JD Acme');
  assert.equal(m.profiles['My profile'].resumeText, 'CV');
  assert.equal(migrate(apply(flat, { ...m, fields: {} })), null);
});

test('a new profile keeps the CV, stories and work style and starts the job fields empty', () => {
  const s = apply(flat, { ...migrate(flat), fields: {} });
  const r = create(s, '  Globex  ');
  assert.equal(r.activeProfile, 'Globex');
  assert.deepEqual([r.fields.resumeText, r.fields.starStories, r.fields.workStyle, r.fields.whyLeaving], ['CV', 'S', 'W', 'Growth']);
  assert.deepEqual([r.fields.jobDescription, r.fields.whyCompany, r.fields.salaryTarget, r.fields.questionsToAsk], ['', '', '', '']);
  assert.equal(r.profiles['My profile'].jobDescription, 'JD Acme');
  assert.throws(() => create(s, ''), /Give the new profile a name/);
  assert.throws(() => create(s, 'My profile'), /already exists/);
});

test('switching saves what was typed into the profile being left and loads the other', () => {
  let s = apply(flat, { ...migrate(flat), fields: {} });
  s = apply(s, create(s, 'Globex'));
  s = { ...s, jobDescription: 'JD Globex typed just now' };
  const back = switchTo(s, 'My profile');
  assert.equal(back.fields.jobDescription, 'JD Acme');
  assert.equal(back.profiles.Globex.jobDescription, 'JD Globex typed just now');
  s = apply(s, back);
  assert.equal(s.aiRules, 'keep');
  assert.equal(switchTo(s, 'Globex').fields.jobDescription, 'JD Globex typed just now');
  assert.throws(() => switchTo(s, 'Nope'), /no profile called Nope/);
});

test('an active profile missing from the list keeps the fields the user sees, not old stored ones', () => {
  const s = { ...flat, resumeText: 'NEW CV typed just now', profiles: { 'Old Co': { resumeText: 'STALE' } }, activeProfile: 'Gone' };
  const m = migrate(s);
  assert.equal(m.activeProfile, 'Gone');
  assert.equal(m.profiles.Gone.resumeText, 'NEW CV typed just now');
  assert.equal(m.profiles['Old Co'].resumeText, 'STALE');
});

test('names that exist on every object are not mistaken for profiles', () => {
  const s = apply(flat, { ...migrate(flat), fields: {} });
  assert.throws(() => create(s, '__proto__'), /Choose another name/);
  assert.equal(create(s, 'constructor').activeProfile, 'constructor');
  assert.throws(() => switchTo(s, 'toString'), /no profile called toString/);
});

test('deleting the profile in use switches to another first, and the last one cannot go', () => {
  let s = apply(flat, { ...migrate(flat), fields: {} });
  assert.throws(() => removeCurrent(s), /only profile/);
  s = apply(s, create(s, 'Globex'));
  const r = removeCurrent(s);
  assert.equal(r.activeProfile, 'My profile');
  assert.equal(r.fields.jobDescription, 'JD Acme');
  assert.deepEqual(Object.keys(r.profiles), ['My profile']);
});

test('AI rules and role focus belong to each profile', () => {
  let s = apply(flat, { ...migrate(flat), fields: {} });
  s = { ...s, roleFocus: 'fullstack' };
  const r = create(s, 'Globex');
  assert.equal(r.fields.aiRules, 'keep');        // carried over like the CV
  assert.equal(r.fields.roleFocus, '');           // a new job reads its own description
  s = apply(s, r);
  s = { ...s, aiRules: 'Globex rules', roleFocus: 'mobile' };
  const back = switchTo(s, 'My profile');
  assert.equal(back.profiles.Globex.aiRules, 'Globex rules');
  assert.equal(back.profiles.Globex.roleFocus, 'mobile');
  assert.equal(back.fields.aiRules, 'keep');
  assert.equal(back.fields.roleFocus, 'fullstack');
});

test('a profile saved before AI rules were per profile keeps the rules in use', () => {
  const old = { ...flat, aiRules: 'current rules', activeProfile: 'New', profiles: { Old: { resumeText: 'CV', jobDescription: 'JD old' }, New: {} } };
  const r = switchTo(old, 'Old');
  assert.equal(r.fields.aiRules, 'current rules');
  assert.equal(r.fields.roleFocus, '');
  const withRules = { ...old, profiles: { ...old.profiles, Old: { ...old.profiles.Old, aiRules: '' } } };
  assert.equal(switchTo(withRules, 'Old').fields.aiRules, '');  // a saved empty value is kept as empty
});
