const test = require('node:test');
const assert = require('node:assert/strict');
const { createWorkSession } = require('../src/work-session');
const { MODES } = require('../src/prompts');
const { createInterviewMemory } = require('../src/interview-memory');

const work = { profileKind: 'work', colleagues: [{ id: 'cada1', name: 'Ada', role: 'techlead' }, { id: 'cbola1', name: 'Bola', role: 'backend' }] };

test('a heard turn is tagged with the colleague clicked, the user\'s own words never', () => {
  const s = createWorkSession();
  assert.equal(s.setSpeaker(work, 'cada1').name, 'Ada');
  const them = s.tag({ channel: 'them', text: 'How is the ticket going?', ts: 1 }, work);
  assert.equal(them.who, 'Ada, Tech lead');
  assert.equal(them.speakerId, 'cada1');
  assert.equal(s.tag({ channel: 'you', text: 'Nearly done', ts: 2 }, work).who, undefined);
});

test('everyone, an unknown id, a deleted colleague and an interview profile tag nothing', () => {
  const s = createWorkSession();
  assert.equal(s.setSpeaker(work, ''), null);
  assert.equal(s.setSpeaker(work, 'nope'), null);
  s.setSpeaker(work, 'cbola1');
  const without = { ...work, colleagues: [work.colleagues[0]] };
  assert.equal(s.tag({ channel: 'them', text: 'x' }, without).who, undefined);
  assert.equal(s.tag({ channel: 'them', text: 'x' }, { ...work, profileKind: 'interview' }).who, undefined);
  s.reset();
  assert.equal(s.speaker(work), null);
});

test('prompts show who said a turn, and an untagged turn reads as before', () => {
  const built = MODES.say.build({ transcript: [{ channel: 'them', text: 'Can you own the cache?', who: 'Ada, Tech lead' }, { channel: 'them', text: 'Hello' }, { channel: 'you', text: 'Yes' }], userText: '' });
  assert.match(built, /Them \(Ada, Tech lead\): Can you own the cache\?/);
  assert.match(built, /\nThem: Hello\n/);
});

test('interview memory keeps who said a turn', () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-ws-'));
  const m = createInterviewMemory({ file: path.join(dir, 'm.json') });
  m.addTurn({ channel: 'them', text: 'Status?', ts: 5, who: 'Ada, Tech lead' });
  m.addTurn({ channel: 'them', text: 'Plain', ts: 6 });
  assert.equal(m.turns()[0].who, 'Ada, Tech lead');
  assert.equal(m.turns()[1].who, undefined);
});
