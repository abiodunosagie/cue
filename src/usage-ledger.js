// What cue spends on the model, by day, for Settings > Cost. Every Anthropic
// request reports its token counts (src/llm.js); this prices them at
// Anthropic's list prices and keeps a running total per day, model and tier.
// Counts and dollars only: no prompt, answer or heard words are ever stored.
//
// The Claude Console bill is the final word: it is in UTC days and includes
// anything else on the key. Days here are the computer's local days.

const fs = require('fs');
const path = require('path');

// US dollars per million tokens (list prices, 2026-09-25; the Haiku 5.5 row
// added 2026-10-08). Cache reads and 5-minute cache writes are priced per
// model. Fast mode costs `fast` times every rate. Matched by prefix, so dated
// ids (claude-haiku-4-5-20251001) fit.
const PRICES = [
  ['claude-fable-5-1', { input: 10, output: 50, cacheRead: 0.25, cacheWrite: 12.5 }],
  ['claude-fable-5', { input: 10, output: 50, cacheRead: 1, cacheWrite: 12.5 }],
  ['claude-opus-5-5', { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5, fast: 2 }],
  ['claude-opus-5', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, fast: 2 }],
  ['claude-opus-4-8', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25, fast: 2 }],
  ['claude-opus-4-7', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }],
  ['claude-opus-4-6', { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 }],
  ['claude-sonnet-5-5', { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }],
  ['claude-sonnet-5', { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }],
  ['claude-sonnet-4-6', { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 }],
  // Haiku 5.5 bills 5 times this above 100K prompt tokens; cue's Fast prompts
  // stay far below that, so the short-prompt card is the one that applies.
  ['claude-haiku-5-5', { input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 }],
  ['claude-haiku-4-5', { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 }]
];

// Longest prefix first, so claude-opus-5-5 never matches claude-opus-5.
const SORTED_PRICES = PRICES.slice().sort((a, b) => b[0].length - a[0].length);
function priceFor(model) {
  const id = String(model || '');
  const hit = SORTED_PRICES.find(([prefix]) => id === prefix || id.startsWith(prefix + '-'));
  return hit ? hit[1] : null;
}

const COUNT_KEYS = ['input', 'cacheRead', 'cacheWrite', 'output'];
const num = (v) => (Number.isFinite(v) && v > 0 ? v : 0);

// Dollars for one request, or null when the model has no known price.
function costOf({ model, input, cacheRead, cacheWrite, output, fast }) {
  const p = priceFor(model);
  if (!p) return null;
  const times = fast && p.fast ? p.fast : 1;
  return times * (num(input) * p.input + num(cacheRead) * p.cacheRead + num(cacheWrite) * p.cacheWrite + num(output) * p.output) / 1e6;
}

const KEEP_DAYS = 62;
const SAVE_DELAY_MS = 1500;

function localDay(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

const TIERS = ['fast', 'smart', 'coding'];
// Model ids become object keys: never one that reaches Object.prototype.
function safeKey(model) {
  const id = String(model || 'unknown').slice(0, 80);
  return id === '__proto__' || id === 'constructor' || id === 'prototype' ? 'unknown' : id;
}

// A file from disk, kept only where it has the shape this module writes:
// day -> model -> tier -> numeric counts. Anything else is left out.
function cleanDays(raw) {
  const out = {};
  const days = raw && raw.days && typeof raw.days === 'object' ? raw.days : {};
  for (const [day, models] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !models || typeof models !== 'object') continue;
    for (const [model, tiers] of Object.entries(models)) {
      if (safeKey(model) !== model || !tiers || typeof tiers !== 'object') continue;
      for (const tier of TIERS) {
        const b = tiers[tier];
        if (!b || typeof b !== 'object') continue;
        const bucket = emptyBucket();
        for (const k of Object.keys(bucket)) bucket[k] = num(b[k]);
        ((out[day] = out[day] || {})[model] = out[day][model] || {})[tier] = bucket;
      }
    }
  }
  return out;
}

function emptyBucket() { return { requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0, unpriced: 0 }; }

function createUsageLedger({ file, now = Date.now, fsImpl = fs, setTimer = setTimeout } = {}) {
  let days = {};
  try {
    days = cleanDays(JSON.parse(fsImpl.readFileSync(file, 'utf8')));
  } catch { /* first run, or a damaged file: start counting from now */ }

  let saveTimer = null;
  let savePending = false;
  function save() {
    savePending = false;
    try {
      const tmp = file + '.tmp';
      fsImpl.mkdirSync(path.dirname(file), { recursive: true });
      fsImpl.writeFileSync(tmp, JSON.stringify({ days }), { mode: 0o600 });
      // A .tmp left by a crash keeps its old mode through writeFileSync.
      fsImpl.chmodSync(tmp, 0o600);
      fsImpl.renameSync(tmp, file);
    } catch (e) {
      console.log(`[usage] could not save the cost ledger: ${e && e.message ? e.message : e}`);
    }
  }

  // entry: { model, tier, input, cacheRead, cacheWrite, output, fast }
  function record(entry) {
    const day = localDay(now());
    const tier = TIERS.includes(entry.tier) ? entry.tier : 'smart';
    const model = safeKey(entry.model);
    const byModel = (days[day] = days[day] || {});
    const bucket = ((byModel[model] = byModel[model] || {})[tier] = byModel[model][tier] || emptyBucket());
    bucket.requests++;
    for (const k of COUNT_KEYS) bucket[k] += num(entry[k]);
    const cost = costOf({ ...entry, model });
    if (cost === null) bucket.unpriced++; else bucket.cost += cost;
    // Old days go; the newest KEEP_DAYS stay.
    const keys = Object.keys(days).sort();
    for (const k of keys.slice(0, Math.max(0, keys.length - KEEP_DAYS))) delete days[k];
    if (!savePending) { savePending = true; saveTimer = setTimer(save, SAVE_DELAY_MS); }
  }

  // One day: the total, and the same spend split by tier and by model.
  function daySummary(day) {
    const byTier = {};
    const byModelOut = {};
    let total = 0;
    let requests = 0;
    let unpriced = 0;
    for (const [model, tiers] of Object.entries(days[day] || {})) {
      for (const [tier, b] of Object.entries(tiers)) {
        total += b.cost; requests += b.requests; unpriced += b.unpriced;
        const t = (byTier[tier] = byTier[tier] || { tier, cost: 0, requests: 0, models: [] });
        t.cost += b.cost; t.requests += b.requests;
        if (!t.models.includes(model)) t.models.push(model);
        const m = (byModelOut[model] = byModelOut[model] || { model, cost: 0, requests: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
        m.cost += b.cost; m.requests += b.requests;
        for (const k of COUNT_KEYS) m[k] += b[k];
      }
    }
    const byCost = (a, b) => b.cost - a.cost;
    return { day, total, requests, unpriced, byTier: Object.values(byTier).sort(byCost), byModel: Object.values(byModelOut).sort(byCost) };
  }

  function summary({ recent = 7 } = {}) {
    const today = localDay(now());
    const recentDays = [];
    const t = new Date(now());
    for (let i = 0; i < recent; i++) {
      // Calendar days back, not 24-hour steps: a clock change must not skip or repeat a day.
      const day = localDay(new Date(t.getFullYear(), t.getMonth(), t.getDate() - i, 12).getTime());
      const s = daySummary(day);
      recentDays.push({ day, total: s.total, requests: s.requests });
    }
    return { today: daySummary(today), recentDays };
  }

  function flush() { if (savePending) { clearTimeout(saveTimer); save(); } }

  return { record, summary, flush };
}

module.exports = { createUsageLedger, costOf, priceFor, localDay };
