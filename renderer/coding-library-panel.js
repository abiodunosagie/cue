// Settings > Interview prep > Coding library: the coding questions cue has
// solved and saved (src/coding-library.js). Read and delete only; a solve is
// the only thing that adds to it. Everything is shown as text, never as HTML.
(function () {
  const CONFIRM_MS = 3000;
  let items = [];

  const $ = (sel) => document.querySelector(sel);
  const status = (text) => { const el = $('#lib-status'); if (el) el.textContent = text || ''; };

  function countText() {
    if (!items.length) return 'Nothing saved yet. Every coding question cue solves is saved here.';
    const flagged = items.filter((it) => it.flagged).length;
    return `${items.length} question${items.length === 1 ? '' : 's'} saved` + (flagged ? `, ${flagged} marked wrong and solved fresh next time.` : '.');
  }

  function apply(res) {
    if (!res) { status('Something went wrong.'); return; }
    if (Array.isArray(res.items)) items = res.items;
    status(res.error || countText());
  }

  function metaLine(it) {
    const date = new Date(it.updatedAt || it.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    const bits = [it.language || 'language not shown', 'saved ' + date];
    if (it.uses) bits.push(`used ${it.uses} time${it.uses === 1 ? '' : 's'}`);
    return bits.join(' · ');
  }

  function textBlock(summaryText, body) {
    const d = document.createElement('details');
    const s = document.createElement('summary');
    s.textContent = summaryText;
    const pre = document.createElement('pre');
    pre.textContent = body;
    d.append(s, pre);
    return d;
  }

  function rowFor(it) {
    const row = document.createElement('div');
    row.className = 'proj-row lib-row';

    const head = document.createElement('div');
    head.className = 'proj-head';
    const name = document.createElement('span');
    name.className = 'proj-name';
    name.style.flex = '1';
    name.textContent = it.title;
    const del = document.createElement('button');
    del.className = 's-action danger';
    del.textContent = 'Delete';
    // Two presses, no dialog: the first arms it for a few seconds.
    let armed = null;
    del.addEventListener('click', async () => {
      if (!armed) {
        del.textContent = 'Press again to delete';
        armed = setTimeout(() => { armed = null; del.textContent = 'Delete'; }, CONFIRM_MS);
        return;
      }
      clearTimeout(armed);
      armed = null;
      del.disabled = true;
      try { apply(await window.cue.codingLibraryDelete(it.id)); } catch { status('Could not delete. Try again.'); }
      render();
    });
    head.append(name, del);

    const meta = document.createElement('div');
    meta.className = 'proj-meta';
    meta.textContent = metaLine(it);
    row.append(head, meta);

    if (it.flagged) {
      const flag = document.createElement('div');
      flag.className = 'lib-flag';
      flag.textContent = 'Marked wrong by a progress check: ' + it.flagged;
      row.append(flag);
    }
    row.append(textBlock('The question', it.statement), textBlock('The solution', it.solution));
    return row;
  }

  function render() {
    const list = $('#lib-list');
    if (!list) return;
    const q = ($('#lib-search').value || '').trim().toLowerCase();
    const visible = q ? items.filter((it) => [it.title, it.language, it.statement].join(' ').toLowerCase().includes(q)) : items;
    list.replaceChildren();
    if (items.length && !visible.length) {
      const empty = document.createElement('div');
      empty.className = 'proj-empty';
      empty.textContent = 'Nothing matches.';
      list.append(empty);
      return;
    }
    for (const it of visible) list.append(rowFor(it));
  }

  async function load() {
    try { apply(await window.cue.codingLibraryGet()); } catch { status('Could not load the coding library.'); }
    render();
  }

  function init() {
    if (!$('#lib-list')) return;
    $('#lib-search').addEventListener('input', render);
    const tab = document.querySelector('.s-tab[data-tab="prep"]');
    if (tab) tab.addEventListener('click', load);
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
