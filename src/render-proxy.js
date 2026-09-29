// The only way out for pages cue draws in a hidden window (src/page-render.js):
// a proxy on this machine's loopback that resolves each name once, refuses any
// that points at this machine or a private network, and connects to exactly
// the address it checked. The page never resolves names itself, so a site
// cannot answer a check with a public address and the connection with a
// private one. Main process only; started on first use, one for the app.
const http = require('http');
const net = require('net');
const { checkedLookup } = require('./company-research');

let started = null;

// host -> the public address to connect to, or throws.
function resolvePublic(host) {
  return new Promise((resolve, reject) => {
    const bare = String(host || '').replace(/^\[|\]$/g, '').replace(/\.$/, '');
    checkedLookup(bare, {}, (error, address) => (error ? reject(error) : resolve(address)));
  });
}

function refuse(socket, code = '403 Forbidden') {
  try { socket.end(`HTTP/1.1 ${code}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`); } catch { /* gone */ }
}

function createProxy() {
  const server = http.createServer((req, res) => {
    // A plain http:// request, with an absolute URL.
    let target;
    try { target = new URL(req.url); } catch { res.writeHead(400); return res.end(); }
    if (target.protocol !== 'http:') { res.writeHead(403); return res.end(); }
    resolvePublic(target.hostname).then((address) => {
      const upstream = http.request({
        host: address, port: target.port || 80, method: req.method, path: target.pathname + target.search,
        headers: { ...req.headers, host: target.host }, timeout: 20000
      }, (up) => { res.writeHead(up.statusCode || 502, up.headers); up.pipe(res); });
      upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
      upstream.on('timeout', () => upstream.destroy());
      req.pipe(upstream);
    }, () => { res.writeHead(403); res.end(); });
  });
  // https:// goes through CONNECT: the tunnel opens only to a checked public address.
  server.on('connect', (req, client, head) => {
    const m = /^(\[[^\]]+\]|[^:]+):(\d+)$/.exec(String(req.url || ''));
    if (!m || m[2] !== '443') return refuse(client);
    resolvePublic(m[1]).then((address) => {
      const upstream = net.connect({ host: address, port: 443, timeout: 20000 }, () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head && head.length) upstream.write(head);
        upstream.pipe(client); client.pipe(upstream);
      });
      const close = () => { upstream.destroy(); client.destroy(); };
      upstream.on('error', close); upstream.on('timeout', close); client.on('error', close);
    }, () => refuse(client));
  });
  server.on('clientError', (_e, socket) => refuse(socket, '400 Bad Request'));
  return server;
}

// The proxy's port on 127.0.0.1, starting it the first time.
function proxyPort() {
  if (!started) {
    started = new Promise((resolve, reject) => {
      const server = createProxy();
      server.once('error', (e) => { started = null; reject(e); });
      server.listen(0, '127.0.0.1', () => resolve(server.address().port));
    });
  }
  return started;
}

module.exports = { proxyPort, createProxy, resolvePublic };
