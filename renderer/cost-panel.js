// Settings > Cost: what today's answers cost, by tier and by model, and the
// last 7 days. The numbers come from main (src/usage-ledger.js); this only
// formats and draws them. Pure helpers are exported for node tests.
(function () {
  const TIER_NAMES = { smart: 'Smart answers', fast: 'Fast', coding: 'Coding' };
  const TIER_NOTES = {
    smart: 'Answers and preparation on the Smart model',
    fast: 'Quick checks, and answers when Smart is off',
    coding: 'Coding solves and project work'
  };

  // "claude-sonnet-5-5" -> "Sonnet 5.5", "claude-haiku-4-5-20251001" -> "Haiku 4.5".
  function modelName(id) {
    const m = /^claude-([a-z]+)-(\d+)(?:-(\d))?(?:-\d{8})?$/.exec(String(id || ''));
    if (!m) return String(id || 'Unknown model');
    return m[1].charAt(0).toUpperCase() + m[1].slice(1) + ' ' + m[2] + (m[3] ? '.' + m[3] : '');
  }

  // Small amounts keep a third decimal, so a $0.004 question does not read as $0.00.
  function money(dollars) {
    const v = Number(dollars) || 0;
    if (v === 0) return '$0.00';
    if (v < 0.001) return '<$0.001';
    return '$' + v.toFixed(v < 1 ? 3 : 2);
  }

  function tokens(n) {
    const v = Number(n) || 0;
    return v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1000 ? Math.round(v / 1000) + 'k' : String(v);
  }

  const plural = (n, word) => n + ' ' + word + (n === 1 ? '' : 's');

  function dayName(day, today) {
    if (day === today) return 'Today';
    const d = new Date(day + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function row(list, { name, detail, amount }) {
    const li = document.createElement('li');
    li.className = 'cost-row';
    const text = document.createElement('div');
    text.className = 'cost-text';
    const n = document.createElement('div');
    n.className = 'cost-name';
    n.textContent = name;
    text.appendChild(n);
    if (detail) {
      const d = document.createElement('div');
      d.className = 'cost-detail';
      d.textContent = detail;
      text.appendChild(d);
    }
    const a = document.createElement('div');
    a.className = 'cost-amount';
    a.textContent = amount;
    li.append(text, a);
    list.appendChild(li);
  }

  function empty(list, message) {
    const li = document.createElement('li');
    li.className = 'cost-empty';
    li.textContent = message;
    list.appendChild(li);
  }

  function render(summary) {
    const today = summary && summary.today;
    const $ = (id) => document.getElementById(id);
    const total = $('cost-total');
    if (!total || !today) return;
    total.textContent = money(today.total);
    $('cost-meta').textContent = plural(today.requests, 'request') + (today.unpriced ? ', ' + today.unpriced + ' without a known price' : '');

    const tiers = $('cost-by-tier');
    tiers.replaceChildren();
    // All three tiers every day, in cost order, so an unused one reads $0.00.
    const order = Object.keys(TIER_NAMES).map((tier) => today.byTier.find((t) => t.tier === tier) || { tier, cost: 0, requests: 0, models: [] });
    for (const t of order.sort((a, b) => b.cost - a.cost)) {
      row(tiers, {
        name: TIER_NAMES[t.tier] + (t.models.length ? ' (' + t.models.map(modelName).join(', ') + ')' : ''),
        detail: plural(t.requests, 'request') + '. ' + TIER_NOTES[t.tier],
        amount: money(t.cost)
      });
    }

    const models = $('cost-by-model');
    models.replaceChildren();
    if (!today.byModel.length) empty(models, 'Nothing spent yet today.');
    for (const m of today.byModel) {
      row(models, {
        name: modelName(m.model),
        detail: plural(m.requests, 'request') + ', ' + tokens(m.input + m.cacheWrite) + ' tokens in, ' + tokens(m.cacheRead) + ' from cache, ' + tokens(m.output) + ' out',
        amount: money(m.cost)
      });
    }

    const days = $('cost-days');
    days.replaceChildren();
    for (const d of summary.recentDays || []) {
      row(days, { name: dayName(d.day, today.day), detail: d.requests ? plural(d.requests, 'request') : 'No requests', amount: money(d.total) });
    }
  }

  async function refresh() {
    if (!window.cue || typeof window.cue.usageSummary !== 'function') return;
    try { render(await window.cue.usageSummary()); } catch (e) { if (window.cue.log) window.cue.log('[cost] could not load: ' + (e && e.message ? e.message : e)); }
  }

  const api = { modelName, money, tokens, refresh, render };
  if (typeof window !== 'undefined') window.CostPanel = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
