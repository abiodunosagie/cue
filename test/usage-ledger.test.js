const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createUsageLedger, costOf, priceFor, localDay } = require('../src/usage-ledger');
const { modelName, money, tokens } = require('../renderer/cost-panel');

test('prices: Sonnet 5.5 with a cache read, Haiku with a dated id, Opus 5.5 fast mode doubles, unknown models have none', () => {
  // The first live answer of 2026-10-04 after caching: 4,572 in, 3,144 read, 4,656 written, 147 out.
  assert.ok(Math.abs(costOf({ model: 'claude-sonnet-5-5', input: 4572, cacheRead: 3144, cacheWrite: 4656, output: 147 }) - 0.0229) < 0.0001);
  assert.equal(costOf({ model: 'claude-haiku-4-5-20251001', input: 1e6 }), 1);
  assert.equal(costOf({ model: 'claude-opus-5-5', output: 1e6, fast: true }), 40);
  assert.equal(priceFor('claude-opus-5-5').input, 4);
  assert.equal(priceFor('claude-opus-5').input, 5);
  assert.equal(costOf({ model: 'gpt-4o', input: 1000 }), null);
});

function ledgerAt(file, clock) {
  return createUsageLedger({ file, now: () => clock.t, setTimer: () => 0 });
}

test('today splits by tier and model, older days stay separate, and it survives a restart', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-usage-'));
  const file = path.join(dir, 'cue-usage.json');
  const clock = { t: new Date(2026, 9, 3, 15, 0).getTime() };
  let ledger = ledgerAt(file, clock);
  ledger.record({ model: 'claude-opus-5-5', tier: 'coding', input: 1e6, output: 0 });
  clock.t = new Date(2026, 9, 4, 11, 0).getTime();
  ledger.record({ model: 'claude-sonnet-5-5', tier: 'smart', input: 1e6, output: 1e5 });
  ledger.record({ model: 'claude-sonnet-5-5', tier: 'smart', cacheRead: 1e6 });
  ledger.record({ model: 'claude-haiku-4-5-20251001', tier: 'fast', input: 2e5, output: 1e4 });
  ledger.record({ model: 'mystery-model', tier: 'fast', input: 10 });
  ledger.flush();
  ledger = ledgerAt(file, clock);
  const s = ledger.summary();
  assert.equal(s.today.day, localDay(clock.t));
  assert.equal(s.today.requests, 4);
  assert.equal(s.today.unpriced, 1);
  assert.ok(Math.abs(s.today.total - (3.2 + 0.25)) < 1e-9);
  assert.deepEqual(s.today.byTier.map((t) => [t.tier, Math.round(t.cost * 100) / 100, t.requests]), [['smart', 3.2, 2], ['fast', 0.25, 2]]);
  assert.deepEqual(s.today.byModel[0].model, 'claude-sonnet-5-5');
  assert.equal(s.recentDays.length, 7);
  assert.equal(s.recentDays[1].total, 4);
  // Counts only on disk: nothing that looks like words.
  const saved = fs.readFileSync(file, 'utf8');
  assert.ok(!/text|prompt|answer/.test(saved));
  assert.equal((fs.statSync(file).mode & 0o777).toString(8), '600');
});

test('a damaged file starts a fresh count instead of failing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-usage-'));
  const file = path.join(dir, 'cue-usage.json');
  fs.writeFileSync(file, '{not json');
  const ledger = ledgerAt(file, { t: Date.now() });
  assert.equal(ledger.summary().today.total, 0);
});

test('cost panel formatting: model names, small amounts keep a third decimal, token counts', () => {
  assert.equal(modelName('claude-sonnet-5-5'), 'Sonnet 5.5');
  assert.equal(modelName('claude-haiku-4-5-20251001'), 'Haiku 4.5');
  assert.equal(modelName('claude-opus-5'), 'Opus 5');
  assert.equal(modelName('gpt-4o'), 'gpt-4o');
  assert.equal(money(0), '$0.00');
  assert.equal(money(0.0234), '$0.023');
  assert.equal(money(0.0004), '<$0.001');
  assert.equal(money(26.219), '$26.22');
  assert.equal(tokens(7926), '8k');
  assert.equal(tokens(2500000), '2.5M');
});

test('a model id that names Object.prototype is stored as unknown, and a hand-edited file keeps only well-formed counts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cue-usage-'));
  const file = path.join(dir, 'cue-usage.json');
  fs.writeFileSync(file, JSON.stringify({ days: {
    '2026-10-04': { 'claude-sonnet-5-5': { smart: { requests: 2, input: 'lots', cost: 0.5 }, weird: { cost: 9 } }, __proto__: { smart: { cost: 1 } } },
    'not-a-day': { x: { smart: { cost: 5 } } }
  } }));
  const clock = { t: new Date(2026, 9, 4, 10, 0).getTime() };
  const ledger = createUsageLedger({ file, now: () => clock.t, setTimer: () => 0 });
  ledger.record({ model: '__proto__', tier: 'fast', input: 10 });
  assert.equal({}.fast, undefined);
  const today = ledger.summary().today;
  assert.equal(today.requests, 3);
  assert.equal(Math.round(today.total * 100) / 100, 0.5);
  assert.deepEqual(today.byModel.map((m) => m.model).sort(), ['claude-sonnet-5-5', 'unknown']);
});
