const test = require('node:test');
const assert = require('node:assert/strict');
const { buildVocabTerms, buildVocabPrompt, MAX_TERMS } = require('../src/vocab');
const { DeepgramStreamingSTT } = require('../src/stt-streaming');
const { buildMultipartBody } = require('../src/whisper-server-session');

const resume = 'Built a Flutter app with Riverpod, GoRouter and fpdart on Supabase. Led the iOS release. Worked with Paystack. The team used AWS.';

test('own words come first, then tool names from the resume, without sentence furniture', () => {
  const terms = buildVocabTerms({ sttWords: 'fpdart, Beepex\nVotixCare', resumeText: resume });
  assert.deepEqual(terms.slice(0, 3), ['fpdart', 'Beepex', 'VotixCare']);
  for (const w of ['Flutter', 'Riverpod', 'GoRouter', 'Supabase', 'iOS', 'Paystack', 'AWS']) assert.ok(terms.includes(w), w);
  for (const w of ['Built', 'Led', 'Worked', 'The']) assert.ok(!terms.includes(w), w);
  assert.equal(terms.filter((t) => t.toLowerCase() === 'fpdart').length, 1);
});

test('the list is capped, and generic tech words fill in only when there is nothing of their own', () => {
  const many = Array.from({ length: 80 }, (_, i) => 'Tool' + i).join(' ');
  assert.equal(buildVocabTerms({ resumeText: many }).length, MAX_TERMS);
  assert.ok(buildVocabTerms({}).includes('REST API'));
  assert.ok(!buildVocabTerms({ resumeText: resume }).includes('REST API'));
  assert.ok(buildVocabPrompt({ resumeText: many }).length <= 850);
});

test('Deepgram gets each term as its own keyterm parameter', () => {
  const d = new DeepgramStreamingSTT('k', { keyterms: ['GoRouter', 'fpdart'] });
  const url = new URL(d._listenUrl());
  assert.deepEqual(url.searchParams.getAll('keyterm'), ['GoRouter', 'fpdart']);
  assert.equal(url.searchParams.get('model'), 'nova-3');
});

test('local Whisper gets the prompt as a form field that cannot break the form', () => {
  const body = buildMultipartBody(Buffer.from('wav'), 'Riverpod, GoRouter\r\nX-Evil: 1').body.toString();
  assert.match(body, /name="prompt"\r\n\r\nRiverpod, GoRouter X-Evil: 1\r\n/);
  assert.doesNotMatch(buildMultipartBody(Buffer.from('wav')).body.toString(), /name="prompt"/);
});
