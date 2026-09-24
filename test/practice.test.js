const test = require('node:test');
const assert = require('node:assert/strict');
const { pickQuestions, scoreAnswer, unsupportedDetails, formatReport, synthesize, DEFAULT_QUESTIONS, VOICES } = require('../src/practice');

const reference = 'Smith Abiodun Osagie. Flutter developer. Beepex fintech app, Paystack, Reloadly, Supabase. VotixCare healthcare. Numd, about 95 commits. 1.3.0 release.';

test('questions come from the prepared bank with the intro first, else the defaults', () => {
  assert.deepEqual(pickQuestions([]), DEFAULT_QUESTIONS.slice(0, 8));
  const bank = [{ question: 'Why this role?' }, { question: 'How do you test?' }, { question: 'Tell me about yourself.' }];
  assert.deepEqual(pickQuestions(bank, 3), ['Tell me about yourself.', 'Why this role?', 'How do you test?']);
});

test('names and numbers not in the candidate material are flagged; ones in it are not', () => {
  const answer = 'At Beepex I cut failed payments by 40 percent with Paystack. Later at Google I led 12 engineers. Numd has about 95 commits.';
  assert.deepEqual(unsupportedDetails(answer, reference), ['40', 'Google', '12']);
});

test('a clean medium answer passes; filler, hedging, AI words and length are reported', () => {
  const clean = scoreAnswer({ question: 'How do you handle payments?', answer: 'Every debit at Beepex goes through a server function that checks the PIN, locks the wallet row and records a unique reference, so a retried request can never charge twice, and refunds only go through an audited path that someone can check later. That keeps the money logic in the database, where the app cannot get it wrong.', reference });
  assert.equal(clean.clean, true, clean.notes.join(' '));
  const messy = scoreAnswer({ question: 'How do you handle payments?', answer: 'Um, I think we basically leverage a robust, seamless flow, you know.', reference });
  assert.equal(messy.clean, false);
  assert.ok(messy.notes.some((n) => /^Short: 12 words/.test(n)));
  assert.ok(messy.notes.some((n) => /Filler: um, you know, basically/.test(n)));
  assert.ok(messy.notes.some((n) => /Hedging: i think/.test(n)));
  assert.ok(messy.notes.some((n) => /leverage, robust, seamless/.test(n)));
  assert.deepEqual(scoreAnswer({ question: 'q', answer: '', reference }).notes, ['No spoken answer was heard.']);
});

test('the intro has its own length target', () => {
  const words = Array.from({ length: 120 }, () => 'work').join(' ');
  assert.equal(scoreAnswer({ question: 'Tell me about yourself', answer: words, reference: '' }).notes.length, 0);
  assert.match(scoreAnswer({ question: 'How do you test?', answer: words, reference: '' }).notes[0], /^Long: 120 words, aim for 40 to 110/);
});

test('the report lists each question with its notes', () => {
  const report = formatReport([
    { question: 'Q1', words: 60, notes: [], clean: true },
    { question: 'Q2', words: 5, notes: ['Short: 5 words, aim for 40 to 110.'], clean: false }
  ]);
  assert.match(report, /1 of 2 answers had nothing to fix/);
  assert.match(report, /\*\*2\. Q2\*\*\n- Short: 5 words/);
  assert.equal(formatReport([]), 'Practice ended before any question was answered.');
});

test('text to speech sends the voice, model and key, and turns HTTP errors into plain messages', async () => {
  let call = null;
  const ok = async (url, opts) => { call = { url, opts }; return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer }; };
  const bytes = await synthesize({ apiKey: 'k', voice: 'alice', text: 'Hello', fetchImpl: ok });
  assert.deepEqual([...bytes], [1, 2, 3]);
  assert.match(call.url, new RegExp('/v1/text-to-speech/' + VOICES.alice.id + '\\?output_format=mp3_44100_128$'));
  assert.equal(call.opts.headers['xi-api-key'], 'k');
  assert.equal(JSON.parse(call.opts.body).text, 'Hello');
  await assert.rejects(synthesize({ apiKey: 'bad', voice: 'x', text: 't', fetchImpl: async () => ({ ok: false, status: 401 }) }), /rejected the API key/);
  await assert.rejects(synthesize({ apiKey: 'k', voice: 'x', text: 't', fetchImpl: async () => ({ ok: false, status: 500 }) }), /HTTP 500/);
});
