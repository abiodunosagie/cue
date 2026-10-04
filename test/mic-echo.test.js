const test = require('node:test');
const assert = require('node:assert/strict');
const { createMicEcho, createMicHold } = require('../src/mic-echo');

// Each case is a real pair from the 2026-10-04 interview (the mic copy as the
// transcriber wrote it), with the timing it had.
function setup() {
  let clock = 1000000;
  const echo = createMicEcho({ now: () => clock });
  return { echo, at: (t) => { clock = t; } };
}

test('a whole copy of the interviewer, landing just after their turn, is dropped', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Got it. TypeScript slash Node dot js with Postgres for about four years in production, plus Python for long-running services.');
  at(1000862);
  assert.deepEqual(echo.cleanFinal('Got it. TypeScript slash Node dot j s with Postgres for about four years in production, plus Python for long t', 1000062),
    { text: '', dropped: true, trimmed: false });
});

test('a copy that lands before the interviewer\'s own turn is dropped once that turn arrives', () => {
  const { echo, at } = setup();
  // Mic final at 0, interviewer final 131 ms later, judged after the hold.
  at(1000131); echo.noteThem('Thanks. Four years with TypeScript plus React slash Next.js including App Router, plus Flutter for mobile and some teaching experience.');
  at(1000800);
  assert.equal(echo.cleanFinal('Thanks. Four years with TypeScript plus React slash Next. J, s including App Router, plus Flutter for mobile and some teaching experience.', 1000000).dropped, true);
});

test('the interviewer\'s last words before the candidate\'s own start are cut, the candidate\'s words stay', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('10 scale?');
  at(1003591);
  assert.deepEqual(echo.cleanFinal('10 scale? I\'d say I\'m quite comfortable with', 1002791),
    { text: 'I\'d say I\'m quite comfortable with', dropped: false, trimmed: true });
});

test('the same interviewer speech spelled differently by the mic is dropped whole', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Thanks. Let\'s use the BGlory Rides ride-hailing system as the project you want to discuss. Where can I find a GitHub link, live URL, or service or app name in stores, and what was your role and scope on it?');
  at(1000967);
  assert.equal(echo.cleanFinal('Thanks. Let\'s use the RITO healing system bigliterates. As the project you want to discuss. Where can I find a GitHub link live URL, or service slash app name in stores, and what was your role and scope on it?', 1000167).dropped, true);
});

test('the candidate\'s answer survives the interviewer\'s recap of it that follows', () => {
  const { echo, at } = setup();
  const answer = 'Alright. So if I get it right, I\'ll say a left join keeps every row from the left table, and when there\'s no match on the right the right side columns come back as null. An inner join drops those rows completely.';
  at(1008800); echo.noteThem('Exactly right. A left join keeps every row from the left table and fills nulls, an inner join drops the unmatched rows.');
  // The recap is 8.8 s newer than the answer: never a reference for it.
  assert.deepEqual(echo.cleanFinal(answer, 1000000), { text: answer, dropped: false, trimmed: false });
});

test('a candidate restating the question keeps their answer', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('What\'s the difference between a primary key and a unique constraint in Postgres?');
  at(1012000);
  const said = 'So the difference between a primary key and a unique constraint is that a primary key never allows nulls and a table has only one, while unique constraints allow nulls and a table can have many.';
  const out = echo.cleanFinal(said, 1011200);
  assert.equal(out.dropped, false);
  assert.match(out.text, /never allows nulls and a table has only one/);
});

test('short replies: an echoed "Great." is dropped, the candidate\'s own "Okay." with nothing to copy is kept', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Great.');
  at(1000900);
  assert.equal(echo.cleanFinal('Great.', 1000100).dropped, true);
  at(1030000);
  assert.deepEqual(echo.cleanFinal('Okay.', 1029200), { text: 'Okay.', dropped: false, trimmed: false });
});

// The live words of both channels, as Deepgram sends them: the interviewer's
// interims while they talk, then their final; the mic's interims from when it
// first hears speech. talk(echo, at, text, startMs, endMs, finalLag)
function talkThem(echo, at, text, start, end, finalLag = 800) {
  const words = text.split(/\s+/);
  for (let t = start + 400; t <= end + 300; t += 500) { at(t); echo.noteThem(words.slice(0, Math.ceil((t - start) / 400)).join(' '), { final: false }); }
  at(end + finalLag); echo.noteThem(text);
}

test('interim mic words: the interviewer\'s words heard as they speak are hidden, the candidate\'s are not', () => {
  const { echo, at } = setup();
  at(1000400); echo.noteThem('How many years', { final: false });
  at(1000600); echo.noteYou('how many');
  at(1001500); echo.noteThem('How many years have you used React specifically', { final: false });
  at(1001700);
  assert.equal(echo.isEchoInterim('how many years have you used React'), true);
  at(1004000); echo.noteThem('How many years have you used React specifically?');
  echo.takeYouStart();
  // The candidate starts answering 0.6 s after the interviewer's last words.
  at(1004100); echo.noteYou('I have used React');
  at(1004400);
  assert.equal(echo.isEchoInterim('I have used React for four years'), false);
});

test('measured starts: a quick answer that reuses the question\'s words is kept, a copy of the question is dropped', () => {
  const { echo, at } = setup();
  // Interviewer speaks 1000000 to 1002000; final 0.8 s later.
  talkThem(echo, at, 'Do you use React and TypeScript?', 1000000, 1002000);
  // The candidate starts 0.3 s after they stop; first heard 0.4 s later.
  at(1002700); echo.noteYou('I use');
  at(1004300);
  const start = echo.takeYouStart();
  at(1005100);
  assert.deepEqual(echo.cleanFinal('I use React and TypeScript.', 1004300, start), { text: 'I use React and TypeScript.', dropped: false, trimmed: false });
  // The mic's copy of the next question starts with it.
  at(1010400); echo.noteYou('Would you');
  talkThem(echo, at, 'Would you use a hash map or an array for the lookup?', 1010000, 1013500);
  at(1014600);
  const copyStart = echo.takeYouStart();
  assert.equal(echo.cleanFinal('Would you use a hash map or an array for the lookup?', 1014400, copyStart).dropped, true);
});

test('measured starts: one-word answers that repeat a one-word question are kept ("Redux, yes.", "A closure.")', () => {
  const { echo, at } = setup();
  talkThem(echo, at, 'And Redux?', 1000000, 1000700);
  at(1001300); echo.noteYou('Redux');
  at(1002200);
  assert.equal(echo.cleanFinal('Redux, yes.', 1002200, echo.takeYouStart()).dropped, false);
  talkThem(echo, at, 'Is it a closure?', 1010000, 1010900);
  at(1011500); echo.noteYou('A closure');
  at(1012300);
  assert.equal(echo.cleanFinal('A closure.', 1012300, echo.takeYouStart()).dropped, false);
});

test('measured starts: late fragments of the interviewer are dropped however short', () => {
  const { echo, at } = setup();
  // The mic starts hearing the question as it is asked, but its final lands 3.5 s late.
  at(1000450); echo.noteYou('tell me');
  talkThem(echo, at, 'Tell me about your experience with React Navigation and Redux Toolkit', 1000000, 1004400);
  at(1008700);
  assert.equal(echo.cleanFinal('with React Navigation and Redux Toolkit', 1008700, echo.takeYouStart()).dropped, true);
  at(1020300); echo.noteYou('react');
  talkThem(echo, at, 'React Navigation then?', 1020000, 1021000);
  at(1022300);
  assert.equal(echo.cleanFinal('React Navigation', 1022300, echo.takeYouStart()).dropped, true);
});

test('one mic turn copying two interviewer turns in a row is dropped ("My day is going well too." "Thank you for asking.")', () => {
  const { echo, at } = setup();
  at(1000400); echo.noteYou('my day');
  talkThem(echo, at, 'My day is going well too.', 1000000, 1002000);
  talkThem(echo, at, 'Thank you for asking.', 1003000, 1004400);
  at(1005800);
  assert.equal(echo.cleanFinal('My day is going well too. Thank you for asking.', 1005800, echo.takeYouStart()).dropped, true);
});

test('the candidate answering with the question\'s own words is kept: an answer starts after the question ends', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Do you have experience with React Native and TypeScript?');
  // Said from about 1 s after the question, its final 4.5 s after it.
  at(1005300);
  assert.deepEqual(echo.cleanFinal('Yes I have experience with React Native and TypeScript.', 1004500),
    { text: 'Yes I have experience with React Native and TypeScript.', dropped: false, trimmed: false });
  // A fast talker: starts 0.5 s after the question, 9 words at 3 a second, final 0.3 s after.
  at(1012000); echo.noteThem('Would you use a hash map or an array for the lookup?');
  at(1016600);
  assert.equal(echo.cleanFinal('I would use a hash map for the lookup.', 1015800).dropped, false);
});

test('a one-word echo that lands late is still the interviewer\'s ("Great." 1.4 s after)', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Great.');
  at(1002210);
  assert.equal(echo.cleanFinal('Great.', 1001410).dropped, true);
  // The same word long after is the candidate's.
  at(1009000);
  assert.equal(echo.cleanFinal('Great.', 1008200).dropped, false);
});

function holdRig() {
  let clock = 1000000;
  const timers = [];
  const echo = createMicEcho({ now: () => clock });
  const out = [];
  let failNext = false;
  const hold = createMicHold({ echo, now: () => clock,
    setTimer: (fn, ms) => { const t = { fn, at: clock + ms, live: true }; timers.push(t); return t; }, clearTimer: (t) => { t.live = false; },
    publish: (turn, clean) => { if (failNext) { failNext = false; throw new Error('boom'); } out.push(clean.dropped ? 'dropped' : clean.text); } });
  const advance = (to) => { for (;;) { const due = timers.filter((t) => t.live && t.at <= to).sort((a, b) => a.at - b.at)[0]; if (!due) break; clock = due.at; due.live = false; due.fn(); } clock = to; };
  return { echo, hold, out, advance, at: (t) => { clock = t; }, failNext: () => { failNext = true; } };
}

test('hold: a mic copy that lands before the interviewer\'s turn is judged when that turn arrives, and nothing leaves out of order', () => {
  const r = holdRig();
  r.hold.push({ channel: 'you', text: 'Good morning, glad to be here.', ts: 1000000 });
  assert.deepEqual(r.out, []);
  r.advance(1000800);
  assert.deepEqual(r.out, ['Good morning, glad to be here.']);
  // The mic copy lands 131 ms before the interviewer's final.
  r.advance(1012000); r.hold.push({ channel: 'you', text: 'What front end languages slash frameworks slash libraries have you used?', ts: 1012000 });
  r.advance(1012131); r.echo.noteThem('What front end languages, frameworks or libraries have you used, and roughly how many years with each?'); r.hold.releaseAll();
  assert.deepEqual(r.out.slice(1), ['dropped']);
  r.advance(1016000); r.hold.push({ channel: 'you', text: 'Mostly TypeScript and React with Next.js for about four years.', ts: 1016000 });
  r.advance(1016800);
  assert.deepEqual(r.out.slice(1), ['dropped', 'Mostly TypeScript and React with Next.js for about four years.']);
});

test('hold: a publish that throws does not strand the turns behind it, and clear drops held turns', () => {
  const r = holdRig();
  r.hold.push({ channel: 'you', text: 'First thing I said here.', ts: 1000000 });
  r.hold.push({ channel: 'you', text: 'Second thing I said here.', ts: 1000100 });
  r.failNext();
  r.advance(1001000);
  assert.deepEqual(r.out, ['Second thing I said here.']);
  r.hold.push({ channel: 'you', text: 'Never published at all.', ts: 1001000 });
  r.hold.clear();
  r.advance(1003000);
  assert.deepEqual(r.out, ['Second thing I said here.']);
});

test('clear forgets the interviewer\'s words', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteThem('Tell me about yourself and your background.');
  echo.clear();
  at(1000900);
  assert.equal(echo.cleanFinal('Tell me about yourself and your background.', 1000100).dropped, false);
});

test('a cough with no final does not lend its start to the next mic turn', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteYou('uh');
  at(1000300); echo.noteYou(''); // Deepgram ends the turn with an empty interim, no final
  at(1020300); echo.noteYou('explain how');
  talkThem(echo, at, 'Explain how closures work in JavaScript', 1020000, 1022200);
  at(1024200);
  assert.equal(echo.cleanFinal('explain how closures work in JavaScript', 1024200, echo.takeYouStart()).dropped, true);
  // Even without the empty interim, a long quiet gap starts a new turn.
  at(1030000); echo.noteYou('hmm');
  talkThem(echo, at, 'Do you use React and TypeScript?', 1040000, 1042000);
  at(1042500); echo.noteYou('I use');
  at(1044000);
  assert.equal(echo.cleanFinal('I use React and TypeScript.', 1044000, echo.takeYouStart()).dropped, false);
});

test('an answer that starts right as the interviewer\'s last words are heard is kept', () => {
  const { echo, at } = setup();
  talkThem(echo, at, 'Do you use React and TypeScript?', 1000000, 1002000); // last interim at 1002200
  at(1002300); echo.noteYou('I use');
  at(1004000);
  assert.equal(echo.cleanFinal('I use React and TypeScript.', 1004000, echo.takeYouStart()).dropped, false);
});

test('talking over the interviewer: the candidate\'s own words are kept, an exact piece of the question is not', () => {
  const { echo, at } = setup();
  const q = 'Tell me about a time you used React with TypeScript on a large project and how you handled state management';
  at(1003000); echo.noteYou('React and');
  talkThem(echo, at, q, 1000000, 1007500);
  at(1009000);
  assert.equal(echo.cleanFinal('React and TypeScript, mostly state management', 1009000, echo.takeYouStart()).dropped, false);
  at(1020400); echo.noteYou('how you');
  talkThem(echo, at, 'And how you handled state management in it?', 1017000, 1021500);
  at(1023000);
  assert.equal(echo.cleanFinal('how you handled state management', 1023000, echo.takeYouStart()).dropped, true);
});

test('without interims (batch or local), a short answer restating the question is kept, a long copy is dropped', () => {
  const { echo, at } = setup();
  at(1003000); echo.noteThem('Do you use React and TypeScript?');
  at(1005800);
  assert.equal(echo.cleanFinal('I use React and TypeScript.', 1005000, null).dropped, false);
  at(1020000); echo.noteThem('What front end languages, frameworks or libraries have you used, and roughly how many years with each?');
  at(1020900);
  assert.equal(echo.cleanFinal('What front end languages slash frameworks slash libraries have you used and rough how many years with each?', 1020100, null).dropped, true);
});

test('the candidate talking when the interviewer asks: the question is cut from the end of their turn, their words stay (live test 2026-10-04)', () => {
  const { echo, at } = setup();
  at(1000000); echo.noteYou('In this job');
  talkThem(echo, at, 'Could you walk me through how you would design a rate limiter for a public API?', 1002500, 1006800);
  at(1007400);
  const out = echo.cleanFinal('In this job I would use it to keep environments for tests reproducible. Could you walk me through how you would design a rate limiter for a public API?', 1007400, echo.takeYouStart());
  assert.equal(out.dropped, false);
  assert.equal(out.trimmed, true);
  assert.match(out.text, /^In this job I would use it to keep environments for tests reproducible\./);
  assert.doesNotMatch(out.text, /rate limiter/);
});
