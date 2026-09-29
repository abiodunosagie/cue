const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

test('a drawn page may only reach the public internet', () => {
  const load = Module._load;
  Module._load = function (request, ...rest) { return request === 'electron' ? {} : load.call(this, request, ...rest); };
  const { isLocalHost } = require('../src/page-render');
  Module._load = load;
  for (const h of ['localhost', 'app.localhost', '127.0.0.1', '10.0.0.4', '192.168.1.5', 'router.local', 'metadata.internal', '[::1]', 'intranet', '169.254.169.254']) assert.equal(isLocalHost(h), true, h);
  for (const h of ['www.indexride.com', 'api.indexride.com', '8.8.8.8']) assert.equal(isLocalHost(h), false, h);
});
