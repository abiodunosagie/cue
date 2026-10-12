const test = require('node:test');
const assert = require('node:assert/strict');
const Work = require('../src/work');
const { migrate, switchTo, create } = require('../src/profiles');

const apply = (s, r) => ({ ...s, ...r.fields, profiles: r.profiles, activeProfile: r.activeProfile });

test('colleagues are cleaned: no name means no colleague, unknown roles become other, text is capped', () => {
  const list = Work.normalizeColleagues([
    { name: '  Ada   Obi ', role: 'techlead', owns: 'architecture', notes: 'likes short answers' },
    { name: '   ' },
    null,
    'Bola',
    { name: 'Chidi', role: 'ceo', owns: 'x'.repeat(500) }
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual([list[0].name, list[0].role, list[0].owns], ['Ada Obi', 'techlead', 'architecture']);
  assert.equal(list[1].role, 'other');
  assert.equal(list[1].owns.length, 200);
  assert.match(list[0].id, /^[a-z0-9]{4,24}$/);
  assert.deepEqual(Work.normalizeColleagues('not a list'), []);
});

test('a colleague keeps its id across edits, and duplicate ids get a new one', () => {
  const [a] = Work.normalizeColleagues([{ name: 'Ada', role: 'backend' }]);
  const again = Work.normalizeColleagues([{ ...a, notes: 'owns payments' }, { ...a, name: 'Copy' }]);
  assert.equal(again[0].id, a.id);
  assert.notEqual(again[1].id, a.id);
});

test('the colleague list stops at its cap', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ name: 'P' + i }));
  assert.equal(Work.normalizeColleagues(many).length, Work.MAX_COLLEAGUES);
});

test('kind and level fall back safely', () => {
  assert.equal(Work.normalizeKind('work'), 'work');
  assert.equal(Work.normalizeKind('boss'), 'interview');
  assert.equal(Work.normalizeLevel('junior'), 'junior');
  assert.equal(Work.normalizeLevel('staff'), '');
  assert.equal(Work.isWork({ profileKind: 'work' }), true);
  assert.equal(Work.isWork({}), false);
});

test('a work profile keeps its colleagues across a switch, and a new profile starts as an interview with none', () => {
  const flat = { resumeText: 'CV', jobDescription: 'JD', profiles: {}, activeProfile: '' };
  let s = apply(flat, { ...migrate(flat), fields: {} });
  s = apply(s, create(s, 'Acme job'));
  s = { ...s, profileKind: 'work', workTitle: 'Senior Front-end Engineer', workLevel: 'junior', colleagues: [{ name: 'Ada', role: 'techlead' }] };
  s = apply(s, switchTo(s, 'My profile'));
  assert.equal(Work.isWork(s), false);
  assert.deepEqual(s.colleagues, []);
  s = apply(s, switchTo(s, 'Acme job'));
  assert.equal(s.profileKind, 'work');
  assert.equal(s.workTitle, 'Senior Front-end Engineer');
  assert.equal(s.colleagues.length, 1);
  assert.equal(s.colleagues[0].name, 'Ada');
  const fresh = create(s, 'Globex');
  assert.equal(fresh.fields.profileKind, '');
  assert.deepEqual(fresh.fields.colleagues, []);
  assert.equal(fresh.fields.resumeText, 'CV');
});

test('a colleague list saved damaged on disk is cleaned when the profile is opened', () => {
  const s = { resumeText: '', activeProfile: 'A', profiles: { A: {}, B: { profileKind: 'work', colleagues: [{ name: 'Ada' }, { bad: true }, 7] } } };
  const r = switchTo(s, 'B');
  assert.equal(r.fields.colleagues.length, 1);
  assert.equal(r.fields.colleagues[0].name, 'Ada');
});

test('the role names every colleague role has a label and a want', () => {
  for (const [key, role] of Object.entries(Work.ROLES)) {
    assert.ok(role.label, key);
    assert.ok(role.wants, key);
  }
  assert.equal(Work.roleLabel('nope'), 'Other');
});
