const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUrl, htmlToText, fetchPageText, researchPrompt, parseResearch } = require('../src/company-research');

test('only public http(s) addresses are accepted; a bare domain gets https', () => {
  assert.equal(normalizeUrl('acme.com'), 'https://acme.com/');
  assert.equal(normalizeUrl(' https://acme.com/about '), 'https://acme.com/about');
  assert.throws(() => normalizeUrl(''), /Paste the company website/);
  assert.throws(() => normalizeUrl('file:///etc/passwd'), /https:\/\//);
  assert.throws(() => normalizeUrl('http://localhost:3000'), /public web address/);
});

test('page text drops scripts, styles, tags and entities', () => {
  const html = '<html><head><style>.a{}</style><script>alert(1)</script></head><body><h1>Acme &amp; Co</h1><p>We build&nbsp;payments &#8212; fast.</p><!-- hidden --></body></html>';
  assert.equal(htmlToText(html), 'Acme & Co We build payments — fast.');
});

const page = (body, { status = 200, type = 'text/html' } = {}) => async () => ({ ok: status < 400, status, headers: { get: () => type }, text: async () => body });

test('fetching turns failures into plain messages', async () => {
  const long = '<p>' + 'Acme builds payment tools for small shops across Africa. '.repeat(10) + '</p>';
  assert.match(await fetchPageText({ url: 'https://acme.com', fetchImpl: page(long) }), /^Acme builds payment tools/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: page('', { status: 404 }) }), /HTTP 404/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: page(long, { type: 'application/pdf' }) }), /not a web page/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: page('<p>Hi</p>') }), /almost no readable text/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: async () => { throw new TypeError('fetch failed'); } }), /Could not reach that website/);
});

test('the page goes to the model fenced as data, and the reply is parsed strictly', () => {
  const p = researchPrompt('Acme builds payments.', 'https://acme.com/', 'Flutter developer');
  assert.match(p, /<website>\nAcme builds payments\.\n<\/website>/);
  assert.match(p, /Candidate background:\nFlutter developer/);
  assert.deepEqual(parseResearch('```json\n{"notes":"Acme builds payments.","whyCompany":"I like payments — a lot."}\n```'), { notes: 'Acme builds payments.', whyCompany: 'I like payments, a lot.' });
  assert.throws(() => parseResearch('no json'), /did not return company notes/);
  assert.throws(() => parseResearch('{"whyCompany":"x"}'), /did not return company notes/);
});
