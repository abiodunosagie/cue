const test = require('node:test');
const assert = require('node:assert/strict');
const { openerQuestion, continuationNote, runOpener } = require('../src/opener');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// A fake Fast model that sends each word after a delay. Call arguments are
// recorded and checked in the test body: an assert thrown inside stream() would
// be swallowed by runOpener as a provider error.
function fakeLLM(words, { firstDelay = 0, gap = 0, fail = false } = {}) {
  const llm = {
    calls: [],
    async stream(args) {
      llm.calls.push(args);
      const { onToken } = args;
      await wait(firstDelay);
      for (const w of words) { onToken(w); await wait(gap); }
      if (fail) throw new Error('provider down');
      return words.join('');
    }
  };
  return llm;
}

test('opener question: heard question for answerThis, newest interviewer turn otherwise, none for other modes', () => {
  const transcript = [{ channel: 'them', text: 'First?' }, { channel: 'you', text: 'Me.' }, { channel: 'them', text: 'How do you test?' }, { channel: 'you', text: 'Um' }];
  assert.equal(openerQuestion('answerThis', ' Why Flutter? ', transcript), 'Why Flutter?');
  assert.equal(openerQuestion('say', '', transcript), 'How do you test?');
  assert.equal(openerQuestion('assist', '', transcript), 'How do you test?');
  assert.equal(openerQuestion('ask', 'x', transcript), '');
  assert.equal(openerQuestion('leetcode', 'x', transcript), '');
  assert.equal(openerQuestion('say', '', []), '');
});

test('continuation note tells the Smart model not to repeat the opener', () => {
  assert.equal(continuationNote(''), '');
  assert.match(continuationNote('I usually start with the data layer.'), /already started.*"I usually start with the data layer\."[\s\S]*Do not repeat/);
});

test('a fast opener streams every token and resolves with the tidy sentence', async () => {
  const shown = [];
  const llm = fakeLLM(['I usually ', 'start with\n', ' the data.']);
  const text = await runOpener({ llm, question: 'Why Flutter?', onToken: (t) => shown.push(t) });
  assert.equal(llm.calls.length, 1);
  assert.equal(llm.calls[0].maxTokens, 40);
  assert.match(llm.calls[0].system, /Do not name any company/);
  assert.equal(llm.calls[0].turns[0].text, 'Interview question: Why Flutter?');
  assert.equal(shown.join(''), 'I usually start with\n the data.');
  assert.equal(text, 'I usually start with the data.');
});

test('no first word in time: nothing is shown and the opener is dropped', async () => {
  const shown = [];
  const text = await runOpener({ llm: fakeLLM(['late'], { firstDelay: 60 }), question: 'q', onToken: (t) => shown.push(t), firstTokenMs: 20, totalMs: 200 });
  assert.equal(text, '');
  await wait(80);
  assert.deepEqual(shown, []);
});

test('the total cap stops a slow opener; later tokens are never shown', async () => {
  const shown = [];
  const text = await runOpener({ llm: fakeLLM(['One ', 'two ', 'three ', 'four'], { gap: 30 }), question: 'q', onToken: (t) => shown.push(t), firstTokenMs: 20, totalMs: 50 });
  await wait(150);
  assert.equal(shown.join('').trim(), text);
  assert.ok(text.length > 0 && !text.includes('four'));
});

test('a provider error keeps whatever was already said', async () => {
  const text = await runOpener({ llm: fakeLLM(['I would ', 'begin'], { fail: true }), question: 'q', onToken: () => {} });
  assert.equal(text, 'I would begin');
});
