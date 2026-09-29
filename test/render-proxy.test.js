const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const net = require('node:net');
const { createProxy } = require('../src/render-proxy');

test('the render proxy never opens a connection to this machine', async () => {
  let hits = 0;
  const local = http.createServer((_q, s) => { hits++; s.end('secret'); });
  await new Promise((r) => local.listen(0, '127.0.0.1', r));
  const port = local.address().port;
  const proxy = createProxy();
  await new Promise((r) => proxy.listen(0, '127.0.0.1', r));
  const pport = proxy.address().port;
  const viaHttp = await new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: pport, path: `http://localhost:${port}/` }, (res) => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
  const viaConnect = await new Promise((resolve) => {
    const s = net.connect(pport, '127.0.0.1', () => s.write('CONNECT localhost:443 HTTP/1.1\r\nHost: localhost:443\r\n\r\n'));
    s.once('data', (d) => { resolve(String(d).split('\r\n')[0]); s.destroy(); });
    s.on('error', () => resolve('error'));
  });
  const otherPort = await new Promise((resolve) => {
    const s = net.connect(pport, '127.0.0.1', () => s.write('CONNECT example.com:22 HTTP/1.1\r\n\r\n'));
    s.once('data', (d) => { resolve(String(d).split('\r\n')[0]); s.destroy(); });
  });
  proxy.close(); local.close();
  assert.equal(viaHttp, 403);
  assert.match(viaConnect, /403/);
  assert.match(otherPort, /403/, 'only https port 443 is tunnelled');
  assert.equal(hits, 0);
});
