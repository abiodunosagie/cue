const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUrl, htmlToText, fetchPageText, researchPrompt, parseResearch, research, isPrivateAddress } = require('../src/company-research');

const publicDns = async () => [{ address: '93.184.216.34', family: 4 }];

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

const page = (body, { status = 200, type = 'text/html' } = {}) => async () => ({ ok: status < 400, status, headers: { get: (h) => (h === 'content-type' ? type : null) }, text: async () => body });

test('fetching turns failures into plain messages', async () => {
  const long = '<p>' + 'Acme builds payment tools for small shops across Africa. '.repeat(10) + '</p>';
  assert.match(await fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: page(long) }), /^Acme builds payment tools/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: page('', { status: 404 }) }), /HTTP 404/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: page(long, { type: 'application/pdf' }) }), /not a web page/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: page('<p>Hi</p>') }), /almost no readable text/);
  await assert.rejects(fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: async () => { throw new TypeError('fetch failed'); } }), /Could not reach that website/);
});

test('the page goes to the model fenced as data, and the reply is parsed strictly', () => {
  const p = researchPrompt('Acme builds payments.', 'https://acme.com/', 'Flutter developer');
  assert.match(p, /<website>\nAcme builds payments\.\n<\/website>/);
  assert.match(p, /Candidate background:\nFlutter developer/);
  assert.deepEqual(parseResearch('```json\n{"notes":"Acme builds payments.","whyCompany":"I like payments — a lot."}\n```'), { notes: 'Acme builds payments.', whyCompany: 'I like payments, a lot.' });
  assert.throws(() => parseResearch('no json'), /did not return company notes/);
  assert.throws(() => parseResearch('{"whyCompany":"x"}'), /did not return company notes/);
});

test('private, loopback, link-local and metadata addresses are never fetched', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    assert.equal(isPrivateAddress(ip), true, ip);
  }
  for (const ip of ['93.184.216.34', '8.8.8.8', '2606:4700::1111']) assert.equal(isPrivateAddress(ip), false, ip);
  let called = false;
  const spy = async () => { called = true; return { ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => '' }; };
  await assert.rejects(fetchPageText({ url: 'http://169.254.169.254/latest/', fetchImpl: spy }), /not a public website/);
  await assert.rejects(fetchPageText({ url: 'https://intranet.acme.com', fetchImpl: spy, lookup: async () => [{ address: '10.0.0.5' }] }), /not a public website/);
  assert.equal(called, false);
});

test('a redirect is checked before it is followed', async () => {
  const hops = [];
  const redirecting = async (url) => {
    hops.push(url);
    return { ok: false, status: 302, headers: { get: (h) => (h === 'location' ? 'http://127.0.0.1:11434/api/tags' : null) } };
  };
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: redirecting, lookup: publicDns }), /not a public website/);
  assert.deepEqual(hops, ['https://acme.com']);
  const loop = async () => ({ ok: false, status: 301, headers: { get: (h) => (h === 'location' ? '/again' : null) } });
  await assert.rejects(fetchPageText({ url: 'https://acme.com', fetchImpl: loop, lookup: publicDns }), /redirects too many times/);
});

test('a page without a content type is refused, and bad character codes do not throw', async () => {
  const long = '<p>' + 'Acme builds payment tools. '.repeat(20) + '</p>';
  await assert.rejects(fetchPageText({ url: 'https://acme.com', lookup: publicDns, fetchImpl: page(long, { type: '' }) }), /not a web page/);
  assert.equal(htmlToText('Hello &#99999999; &#x110000; world'), 'Hello world');
});

test('research runs the whole step and needs a ready Smart model', async () => {
  const long = '<p>' + 'Acme builds payment tools for small shops. '.repeat(10) + '</p>';
  const out = await research({ rawUrl: 'acme.com', llm: { ready: true }, background: 'CV', lookup: publicDns, fetchImpl: page(long),
    quickAsk: async ({ text }) => { assert.match(text, /<website>/); return '{"notes":"Acme builds payment tools.","whyCompany":"I like it."}'; } });
  assert.deepEqual(out, { url: 'https://acme.com/', pages: 1, notes: 'Acme builds payment tools.', whyCompany: 'I like it.' });
  await assert.rejects(research({ rawUrl: 'acme.com', llm: { ready: false }, quickAsk: async () => '' }), /Smart model/);
});

test('research reads the company\'s own useful pages too, never another site or a file', async () => {
  const { pageLinks, fetchSiteText } = require('../src/company-research');
  const home = '<a href="/about">About</a><a href="https://www.acme.com/services/">Services</a><a href="https://evil.com/about">x</a>' +
    '<a href="/brochure.pdf">pdf</a><a href="/blog/post-1">blog</a><a href="/about#team">again</a><a href="mailto:a@acme.com">mail</a>' +
    '<p>' + 'Acme builds payment tools for small shops. '.repeat(10) + '</p>';
  assert.deepEqual(pageLinks(home, 'https://acme.com/'), ['https://acme.com/about', 'https://www.acme.com/services']);
  const pages = { 'https://acme.com/': home, 'https://acme.com/about': '<p>' + 'Founded in Lagos in 2019, Acme serves 400 shops. '.repeat(8) + '</p>' };
  const fetchImpl = async (u) => {
    const body = pages[u];
    if (!body) return { ok: false, status: 404, headers: { get: () => 'text/html' } };
    return { ok: true, status: 200, headers: { get: (h) => (h === 'content-type' ? 'text/html' : null) }, text: async () => body };
  };
  const site = await fetchSiteText({ url: 'https://acme.com/', fetchImpl, lookup: publicDns });
  assert.equal(site.pages, 2, 'the page that failed is left out');
  assert.match(site.text, /Page: https:\/\/acme\.com\/about\nFounded in Lagos/);
});

test('IPv4 hidden inside IPv6 is checked like IPv4, and unreadable addresses are refused', () => {
  const { isPrivateAddress } = require('../src/company-research');
  for (const a of ['::ffff:7f00:1', '::ffff:a9fe:a9fe', '64:ff9b::7f00:1', '2002:7f00:1::', '::7f00:1', '::ffff:127.0.0.1', 'fe80::1', '::1', '::', 'fc00::1', 'nonsense']) assert.equal(isPrivateAddress(a), true, a);
  for (const a of ['2606:4700:4700::1111', '::ffff:8.8.8.8', '8.8.8.8']) assert.equal(isPrivateAddress(a), false, a);
});
