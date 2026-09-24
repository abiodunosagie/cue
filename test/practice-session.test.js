const test = require('node:test');
const assert = require('node:assert/strict');
const { createPracticeSession } = require('../src/practice-session');

// A practice session with fake app parts. Timers run by hand; time moves by hand.
function setup({ capturing = true, empty = true, key = '', synth } = {}) {
  let t = 1000;
  const sent = [];
  const published = [];
  const transcript = [];
  const timers = [];
  let cleared = 0;
  const marks = [];
  const session = createPracticeSession({
    send: (channel, data) => sent.push({ channel, data }),
    publishQuestion: (text) => { published.push(text); transcript.push({ channel: 'them', text, ts: t }); },
    getSettings: () => ({ apiKeys: { elevenlabs: key }, practiceVoice: 'george', resumeText: 'Flutter developer at Acme', answerLength: 'medium' }),
    synthesize: synth || (async () => Buffer.from('mp3')),
    transcript: () => transcript,
    isCapturing: () => capturing,
    isBusy: () => false,
    memoryIsEmpty: () => empty,
    clearInterview: () => { cleared++; return { ok: true }; },
    preparedQuestions: () => [{ question: 'Tell me about yourself.' }, { question: 'Why this role?' }],
    markActive: (on) => marks.push(on),
    now: () => t,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: () => {}
  });
  const plays = () => sent.filter((m) => m.channel === 'practice:play').map((m) => m.data);
  return { session, sent, published, transcript, plays, advance: (ms) => { t += ms; }, cleared: () => cleared, marks, timers, now: () => t };
}
const flush = () => new Promise((r) => setImmediate(r));

test('practice refuses to start without listening or with a remembered interview', () => {
  assert.match(setup({ capturing: false }).session.start().error, /Start listening first/);
  assert.match(setup({ empty: false }).session.start().error, /Clear interview memory first/);
});

test('a question is published only after it has played, and its echo is hidden meanwhile and just after', async () => {
  const h = setup();
  h.session.start();
  await flush();
  const play = h.plays()[0];
  assert.equal(play.text, 'Tell me about yourself.');
  assert.equal(h.session.hidesTurn({ channel: 'them', text: 'tell me about yourself' }), true);
  assert.equal(h.session.hidesTurn({ channel: 'you', text: 'hello' }), false);
  h.session.played(play.token);
  assert.deepEqual(h.published, ['Tell me about yourself.']);
  assert.equal(h.session.hidesTurn({ channel: 'them', text: 'x' }), true);
  h.advance(3001);
  assert.equal(h.session.hidesTurn({ channel: 'them', text: 'a real follow-up' }), false);
});

test('a late played report or voice clip for an older question is ignored', async () => {
  let resolveFirst;
  const clips = [new Promise((r) => { resolveFirst = r; }), Promise.resolve(Buffer.from('b'))];
  const h = setup({ key: 'k', synth: () => clips.shift() });
  h.session.start();                 // question 1 synthesizing
  h.session.next();                  // skipped while playing, question 2 asked
  await flush();
  resolveFirst(Buffer.from('a'));    // question 1's clip arrives late
  await flush();
  const plays = h.plays();
  assert.equal(plays.length, 1);
  assert.equal(plays[0].text, 'Why this role?');
  h.session.played(plays[0].token - 1);
  assert.deepEqual(h.published, []);
});

test('Next while the question plays skips it without a score; answers are scored without the voice echo', async () => {
  const h = setup();
  h.session.start();
  await flush();
  h.session.next();                  // still playing question 1: skipped, not scored
  await flush();
  const play = h.plays()[1];
  h.session.played(play.token);
  h.advance(500);
  h.transcript.push({ channel: 'you', text: 'why this role', ts: h.now() });                    // mic echo of the voice
  h.transcript.push({ channel: 'you', text: 'I build Flutter apps at Acme and this team ships the kind of product I want to work on every day, with users who depend on it.', ts: h.now() });
  h.session.end();
  const report = h.sent.filter((m) => m.channel === 'llm:token').map((m) => m.data.text).join('');
  assert.match(report, /1 of 1 answers|0 of 1 answers/);
  assert.doesNotMatch(report, /Tell me about yourself/);
  assert.match(report, /Why this role\?/);
});

test('ending clears the practice from memory, drops the marker, and a timeout covers a lost played event', async () => {
  const h = setup();
  h.session.start();
  await flush();
  assert.deepEqual(h.marks, [true]);
  const timeout = h.timers.find((x) => x.ms === 45000);
  timeout.fn();                      // the renderer never reported the end of playback
  assert.deepEqual(h.published, ['Tell me about yourself.']);
  h.session.end();
  assert.equal(h.cleared(), 1);
  assert.deepEqual(h.marks, [true, false]);
  assert.equal(h.session.isActive(), false);
  assert.ok(h.sent.some((m) => m.channel === 'practice:cleared'));
});
