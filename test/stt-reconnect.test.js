const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const { EventEmitter } = require('node:events');

// A fake 'ws': each new socket is kept so a test can open, fail or close it.
const sockets = [];
class FakeSocket extends EventEmitter {
  constructor(url, opts) { super(); this.url = url; this.opts = opts; this.readyState = 0; this.sent = []; sockets.push(this); }
  send(data) { this.sent.push(data); }
  close(code) { this.readyState = 3; this.emit('close', code); }
  open() { this.readyState = 1; this.emit('open'); }
  fail(message, code = 1006) { this.emit('error', new Error(message)); this.readyState = 3; this.emit('close', code); }
}
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'ws') return FakeSocket;
  return originalLoad.call(this, request, parent, isMain);
};

const { createReconnectPolicy, handshakeStatus, isAuthRefusal, pushPending, RECONNECT_DELAYS_MS, DeepgramStreamingSTT, OpenAIRealtimeSTT } = require('../src/stt-streaming');

test('backoff grows, then holds at 30 s, until the five minute budget is spent', () => {
  let t = 0;
  const policy = createReconnectPolicy({ now: () => t });
  const seen = [];
  for (let i = 0; i < 8; i++) seen.push(policy.next());
  assert.deepEqual(seen, [1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  t = 5 * 60 * 1000;
  assert.equal(policy.next(), null);
  policy.reset();
  assert.equal(policy.next(), RECONNECT_DELAYS_MS[0]);
});

test('handshake status and key refusals', () => {
  assert.equal(handshakeStatus(new Error('Unexpected server response: 401')), 401);
  assert.equal(handshakeStatus(new Error('getaddrinfo ENOTFOUND api.deepgram.com')), null);
  assert.equal(isAuthRefusal(401), true);
  assert.equal(isAuthRefusal(403), true);
  assert.equal(isAuthRefusal(429), false);
  assert.equal(isAuthRefusal(null), false);
});

test('pending audio keeps the newest bytes under the cap', () => {
  const q = { chunks: [], bytes: 0 };
  for (let i = 0; i < 10; i++) pushPending(q, Buffer.alloc(100, i), 350);
  assert.ok(q.bytes <= 350);
  assert.equal(q.chunks[q.chunks.length - 1][0], 9);
});

function deepgram(t, extra = {}) {
  const errors = [];
  const statuses = [];
  const stt = new DeepgramStreamingSTT('dg-key', {
    onError: (e) => errors.push(e),
    onStatusChange: (s) => statuses.push(s),
    reconnect: { delays: [5, 5], budgetMs: 1000, now: () => t.now },
    ...extra
  });
  return { stt, errors, statuses };
}

test('Deepgram: a network blip reconnects instead of ending listening', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const { stt, errors, statuses } = deepgram(t);
  await stt.connect();
  sockets[0].open();
  sockets[0].fail('read ECONNRESET');
  assert.deepEqual(errors, []);
  assert.ok(statuses.includes('reconnecting'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sockets.length, 2);
  sockets[1].open();
  assert.equal(statuses[statuses.length - 1], 'connected');
  stt.disconnect();
});

test('Deepgram: audio sent while the socket is down is replayed on reconnect', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const { stt } = deepgram(t);
  await stt.connect();
  sockets[0].open();
  sockets[0].fail('socket hang up');
  stt.sendAudio(Buffer.from([1, 2, 3]));
  await new Promise((r) => setTimeout(r, 20));
  sockets[1].open();
  assert.deepEqual([...sockets[1].sent[0]], [1, 2, 3]);
  stt.disconnect();
});

test('Deepgram: a refused key stops at once with a clear message, no retry loop', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const { stt, errors, statuses } = deepgram(t);
  await stt.connect();
  sockets[0].fail('Unexpected server response: 401');
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /refused the key \(401\)/);
  assert.ok(!statuses.includes('reconnecting'));
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sockets.length, 1);
  stt.disconnect();
});

test('Deepgram: after the budget the caller is told, so it can fall back', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const { stt, errors } = deepgram(t);
  await stt.connect();
  sockets[0].fail('ENOTFOUND');
  t.now = 2000;
  await new Promise((r) => setTimeout(r, 20));
  sockets[1].fail('ENOTFOUND');
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /five minutes/);
  stt.disconnect();
});

test('Deepgram: stopping during a pending retry never reconnects later', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const { stt, errors } = deepgram(t);
  await stt.connect();
  sockets[0].open();
  sockets[0].fail('ECONNRESET');
  stt.disconnect();
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sockets.length, 1);
  assert.deepEqual(errors, []);
});

test('OpenAI realtime: a blip reconnects, a refused key stops', async () => {
  sockets.length = 0;
  const t = { now: 0 };
  const errors = [];
  const stt = new OpenAIRealtimeSTT('sk-test', { onError: (e) => errors.push(e), reconnect: { delays: [5], budgetMs: 1000, now: () => t.now } });
  await stt.connect();
  sockets[0].open();
  sockets[0].fail('ECONNRESET');
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(sockets.length, 2);
  assert.deepEqual(errors, []);
  sockets[1].fail('Unexpected server response: 401');
  assert.equal(errors.length, 1);
  stt.disconnect();
});
