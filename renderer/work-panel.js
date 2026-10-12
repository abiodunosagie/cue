// Settings > Profile, work part: whether the profile is for an interview or for
// a job the user has, and for a job: the title, the real level, the colleagues
// and the project notes. The form edits a copy; Save (renderer.js
// saveSettings) asks collect() for it, and main cleans it (src/work.js).
(function () {
  const Work = window.WorkProfile;
  const $ = (sel) => document.querySelector(sel);
  let kind = 'interview';
  let level = '';
  let colleagues = [];

  const CONFIRM_MS = 3000; // the second click of Forget it must come this soon

  function press(button, on) {
    button.classList.toggle('on', on);
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }

  function showKind() {
    document.querySelectorAll('#profile-kind-seg button').forEach((b) => press(b, b.dataset.profileKind === kind));
    $('#work-section').classList.toggle('hidden', kind !== 'work');
    $('#profile-kind-note').textContent = kind === 'work'
      ? 'cue helps you in meetings at this job: pick who is talking in the panel and it answers in the way that person expects. Every meeting is kept on this Mac as this company\'s memory.'
      : 'cue helps you get this job: answers present you to the interviewer.';
  }

  function showLevel() {
    document.querySelectorAll('#work-level-seg button').forEach((b) => press(b, b.dataset.workLevel === level));
  }

  function field(tag, attrs) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    return el;
  }

  // Returns the rows' name inputs, so a new row's can take the focus.
  function renderList() {
    const host = $('#colleague-list');
    host.replaceChildren();
    if (!colleagues.length) {
      host.append(field('div', { class: 'colleague-empty', text: 'No colleagues yet. Add the people you meet: your tech lead, the back end developer, your PM.' }));
      return [];
    }
    const names = [];
    colleagues.forEach((c, i) => {
      // Each row's labels carry its number, so a screen reader can tell the rows apart.
      const n = ' ' + (i + 1);
      const row = field('div', { class: 'colleague-row', role: 'group', 'aria-label': 'Colleague' + n });
      const head = field('div', { class: 'colleague-head' });
      const name = field('input', { type: 'text', maxlength: '40', placeholder: 'Name', 'aria-label': 'Colleague' + n + ' name', autocomplete: 'off' });
      name.value = c.name;
      const role = field('select', { class: 's-select compact', 'aria-label': 'Colleague' + n + ' role' });
      for (const [key, r] of Object.entries(Work.ROLES)) {
        const o = field('option', { value: key, text: r.label });
        role.append(o);
      }
      role.value = c.role || 'other';
      role.addEventListener('change', () => { c.role = role.value; });
      const remove = field('button', { class: 's-action danger', type: 'button', text: 'Remove' });
      const removeLabel = () => remove.setAttribute('aria-label', 'Remove ' + (c.name.trim() || 'colleague' + n));
      removeLabel();
      name.addEventListener('input', () => { c.name = name.value; removeLabel(); });
      remove.addEventListener('click', () => { colleagues.splice(i, 1); renderList(); });
      head.append(name, role, remove);
      const owns = field('input', { type: 'text', maxlength: '200', placeholder: 'What they own, for example payments API, design system', 'aria-label': 'Colleague' + n + ': what they own', autocomplete: 'off' });
      owns.value = c.owns;
      owns.addEventListener('input', () => { c.owns = owns.value; });
      const notes = field('input', { type: 'text', maxlength: '400', placeholder: 'How they like to work, for example wants short status, cares about tests', 'aria-label': 'Colleague' + n + ': notes about them', autocomplete: 'off' });
      notes.value = c.notes;
      notes.addEventListener('input', () => { c.notes = notes.value; });
      row.append(head, owns, notes);
      host.append(row);
      names.push(name);
    });
    return names;
  }

  // Company memory: how much is kept for this job, read from main.
  async function showMemory() {
    const el = $('#work-memory-status');
    if (kind !== 'work') { el.textContent = ''; return; }
    let st = null;
    try { st = await window.cue.workMemoryState(); } catch (_) { st = null; }
    if (!st || !st.meetings) { el.textContent = 'Nothing kept yet'; return; }
    const last = st.lastAt ? new Date(st.lastAt).toLocaleDateString([], { day: 'numeric', month: 'short' }) : '';
    el.textContent = st.meetings + (st.meetings === 1 ? ' meeting' : ' meetings') + ', ' + st.noted + ' with notes' + (last ? ', last on ' + last : '');
  }

  function fill(settings) {
    kind = Work.normalizeKind(settings.profileKind);
    level = Work.normalizeLevel(settings.workLevel);
    colleagues = Work.normalizeColleagues(settings.colleagues).map((c) => ({ ...c }));
    $('#work-title').value = settings.workTitle || '';
    $('#work-docs').value = settings.workDocs || '';
    showKind();
    showLevel();
    renderList();
    void showMemory();
  }

  // The form's values, ready for settings:set. A colleague with no name yet is
  // left out, as main would drop it.
  function collect() {
    return {
      profileKind: kind,
      workTitle: $('#work-title').value.trim(),
      workLevel: level,
      colleagues: Work.normalizeColleagues(colleagues),
      workDocs: $('#work-docs').value.trim()
    };
  }

  document.querySelectorAll('#profile-kind-seg button').forEach((b) => b.addEventListener('click', () => { kind = b.dataset.profileKind; showKind(); }));
  document.querySelectorAll('#work-level-seg button').forEach((b) => b.addEventListener('click', () => { level = level === b.dataset.workLevel ? '' : b.dataset.workLevel; showLevel(); }));
  $('#colleague-add-btn').addEventListener('click', () => {
    if (colleagues.length >= Work.MAX_COLLEAGUES) return;
    colleagues.push({ id: Work.newId(), name: '', role: 'techlead', owns: '', notes: '' });
    const names = renderList();
    if (names.length) names[names.length - 1].focus();
  });

  $('#work-memory-show').addEventListener('click', async () => {
    // The notes show in the panel, under Settings: close it first (Done saves).
    $('#s-close').click();
    const res = await window.cue.workMemoryShow().catch(() => null);
    if (res && res.error && window.cue.log) window.cue.log('[company memory] ' + res.error);
  });
  // Forgetting deletes the file, so it takes a second click within CONFIRM_MS.
  let clearArmed = null;
  $('#work-memory-clear').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    if (!clearArmed) {
      btn.textContent = 'Click again to forget every meeting';
      $('#work-memory-status').textContent = 'Click Forget it again within 3 seconds to delete every meeting kept for this job.';
      clearArmed = setTimeout(() => { clearArmed = null; btn.textContent = 'Forget it'; void showMemory(); }, CONFIRM_MS);
      return;
    }
    clearTimeout(clearArmed); clearArmed = null;
    btn.textContent = 'Forget it';
    const res = await window.cue.workMemoryClear().catch(() => null);
    $('#work-memory-status').textContent = res && res.ok ? 'Forgotten' : ((res && res.error) || 'Could not forget it');
  });

  window.WorkPanel = { fill, collect };
})();
