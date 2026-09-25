// Settings > Projects: the list the candidate approves. Scan fills it from
// the projects folder, Draft asks the Smart model for notes, every edit is
// saved through projects:save (main owns the list, see src/ipc/projects.js).
(function () {
  const SAVE_DEBOUNCE_MS = 600;
  let projects = [];
  let info = {};          // per id: commit counts from the last scan, shown only
  let saveTimer = null;
  let busy = false;

  const $ = (sel) => document.querySelector(sel);
  const status = (text) => { const el = $('#proj-status'); if (el) el.textContent = text || ''; };

  function fitsText(fits) {
    if (!fits || !fits.approved) return 'No projects ticked yet. Tick the ones you want cue to talk about and give each a summary.';
    return fits.fit < fits.approved
      ? `${fits.approved} ticked, ${fits.fit} fit in an answer. Untick older or smaller projects so the rest are used.`
      : `${fits.approved} ticked, all used in answers.`;
  }

  function apply(result) {
    if (!result || result.error) { status(result && result.error ? result.error : 'Something went wrong.'); return false; }
    projects = result.projects || [];
    if (result.info) info = result.info;
    if (result.root) $('#proj-root').textContent = 'from ' + result.root.replace(/^\/Users\/[^/]+/, '~');
    status(fitsText(result.fits));
    return true;
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      saveTimer = null;
      const res = await window.cue.projectsSave(projects);
      if (res && !res.error) status(fitsText(res.fits));
      else status(res && res.error ? res.error : 'Could not save.');
    }, SAVE_DEBOUNCE_MS);
  }

  function metaLine(p) {
    const i = info[p.id];
    const bits = [p.stack.slice(0, 5).join(', '), p.years];
    if (i && i.commits) bits.push(`${i.commits} commits, ${i.myCommits} under your git emails`);
    if (i && !i.hasText) bits.push('no description found, write the summary yourself');
    return bits.filter(Boolean).join(' · ');
  }

  function field(tag, cls, value, attrs) {
    const el = document.createElement(tag);
    el.className = cls;
    el.value = value || '';
    for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v);
    return el;
  }

  function rowFor(p) {
    const row = document.createElement('div');
    row.className = 'proj-row' + (p.use ? ' on' : '');

    const head = document.createElement('div');
    head.className = 'proj-head';
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = p.use;
    const name = document.createElement('span');
    name.className = 'proj-name';
    name.textContent = p.name;
    label.append(box, name);
    const draft = document.createElement('button');
    draft.className = 's-action';
    draft.textContent = 'Draft';
    draft.title = 'Draft this project\'s notes with the Smart model';
    head.append(label, draft);

    const meta = document.createElement('div');
    meta.className = 'proj-meta';
    meta.textContent = metaLine(p);

    const summaryLabel = document.createElement('div');
    summaryLabel.className = 'proj-field-label';
    summaryLabel.textContent = 'What it is (one sentence)';
    const summary = field('textarea', 'proj-summary', p.summary, { rows: '2', spellcheck: 'true', 'aria-label': p.name + ' summary', maxlength: '300' });
    const detailsLabel = document.createElement('div');
    detailsLabel.className = 'proj-field-label';
    detailsLabel.textContent = 'Details cue can use when asked about it';
    const details = field('textarea', 'proj-details', p.details, { rows: '3', spellcheck: 'true', 'aria-label': p.name + ' details', maxlength: '1200' });
    const role = field('input', 'proj-role', p.role, { type: 'text', placeholder: 'My role, e.g. built the whole Flutter app, or built the admin dashboard', 'aria-label': p.name + ' role', maxlength: '300' });

    box.addEventListener('change', () => { p.use = box.checked; row.classList.toggle('on', p.use); scheduleSave(); });
    summary.addEventListener('input', () => { p.summary = summary.value; scheduleSave(); });
    details.addEventListener('input', () => { p.details = details.value; scheduleSave(); });
    role.addEventListener('input', () => { p.role = role.value; scheduleSave(); });
    draft.addEventListener('click', () => runDraft([p.id]));

    row.append(head, meta, summaryLabel, summary, detailsLabel, details, role);
    return row;
  }

  function render() {
    const list = $('#proj-list');
    if (!list) return;
    const q = ($('#proj-search').value || '').trim().toLowerCase();
    const show = $('#proj-show').value;
    const visible = projects.filter((p) => {
      if (show === 'ticked' && !p.use) return false;
      if (show === 'unticked' && p.use) return false;
      if (show === 'empty' && !(p.use && !p.summary.trim())) return false;
      if (!q) return true;
      return [p.name, p.id, p.summary, p.stack.join(' ')].join(' ').toLowerCase().includes(q);
    });
    list.replaceChildren();
    if (!projects.length) {
      const empty = document.createElement('div');
      empty.className = 'proj-empty';
      empty.textContent = 'No projects yet. Press "Scan my projects folder".';
      list.append(empty);
      return;
    }
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'proj-empty';
      empty.textContent = 'Nothing matches.';
      list.append(empty);
      return;
    }
    let group = null;
    for (const p of [...visible].sort((a, b) => (a.category || '').localeCompare(b.category || ''))) {
      if (p.category !== group) {
        group = p.category;
        const h = document.createElement('div');
        h.className = 'proj-group';
        h.textContent = group || 'Other';
        list.append(h);
      }
      list.append(rowFor(p));
    }
  }

  function setBusy(on) {
    busy = on;
    for (const id of ['#proj-scan', '#proj-draft']) { const b = $(id); if (b) b.disabled = on; }
    document.querySelectorAll('.proj-row button').forEach((b) => { b.disabled = on; });
  }

  async function flushSave() {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
    await window.cue.projectsSave(projects);
  }

  async function runScan() {
    if (busy) return;
    setBusy(true);
    status('Scanning your projects folder…');
    try {
      await flushSave();
      if (apply(await window.cue.projectsScan())) render();
    } finally { setBusy(false); }
  }

  // Drafts fill empty fields only, so nothing the candidate wrote is lost;
  // a single-project Draft replaces that project's notes on purpose.
  async function runDraft(ids) {
    if (busy) return;
    const single = ids.length === 1;
    if (!ids.length) { status('Tick the projects you want notes for first. Projects that already have a summary are skipped.'); return; }
    setBusy(true);
    status(`Drafting notes for ${ids.length} project${ids.length === 1 ? '' : 's'}…`);
    try {
      await flushSave();
      const res = await window.cue.projectsDraft(ids);
      if (!res || res.error) { status(res && res.error ? res.error : 'Could not draft.'); return; }
      let filled = 0;
      for (const p of projects) {
        const d = res.drafts && res.drafts[p.id];
        if (!d) continue;
        if (single || !p.summary.trim()) p.summary = d.summary;
        if (single || !p.details.trim()) p.details = d.details;
        filled += 1;
      }
      const saved = await window.cue.projectsSave(projects);
      apply(saved);
      render();
      status(`Drafted ${filled} of ${ids.length}. Read each one and fix anything that is not true.` +
        (res.failed ? ` ${res.failed} could not be drafted, press Draft on them to retry.` : ''));
    } finally { setBusy(false); }
  }

  async function load() {
    const res = await window.cue.projectsGet();
    if (apply(res)) render();
  }

  function init() {
    if (!$('#proj-list')) return;
    $('#proj-scan').addEventListener('click', runScan);
    $('#proj-draft').addEventListener('click', () => runDraft(projects.filter((p) => p.use && !p.summary.trim()).map((p) => p.id)));
    $('#proj-search').addEventListener('input', render);
    $('#proj-show').addEventListener('change', render);
    window.cue.on('projects:draft-progress', (p) => { if (busy && p) status(`Drafting notes… ${p.done} of ${p.total}`); });
    const tab = document.querySelector('.s-tab[data-tab="projects"]');
    if (tab) tab.addEventListener('click', load);
    load();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.ProjectsPanel = { load, flushSave };
})();
