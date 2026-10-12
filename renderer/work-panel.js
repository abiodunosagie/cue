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

  function showKind() {
    document.querySelectorAll('#profile-kind-seg button').forEach((b) => b.classList.toggle('on', b.dataset.profileKind === kind));
    $('#work-section').classList.toggle('hidden', kind !== 'work');
    $('#profile-kind-note').textContent = kind === 'work'
      ? 'cue helps you in meetings at this job: pick who is talking in the panel and it answers in the way that person expects. Every meeting is kept on this Mac as this company\'s memory.'
      : 'cue helps you get this job: answers present you to the interviewer.';
  }

  function showLevel() {
    document.querySelectorAll('#work-level-seg button').forEach((b) => b.classList.toggle('on', b.dataset.workLevel === level));
  }

  function field(tag, attrs) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v);
    }
    return el;
  }

  function renderList() {
    const host = $('#colleague-list');
    host.replaceChildren();
    if (!colleagues.length) {
      host.append(field('div', { class: 'colleague-empty', text: 'No colleagues yet. Add the people you meet: your tech lead, the back end developer, your PM.' }));
      return;
    }
    colleagues.forEach((c, i) => {
      const row = field('div', { class: 'colleague-row' });
      const head = field('div', { class: 'colleague-head' });
      const name = field('input', { type: 'text', maxlength: '40', placeholder: 'Name', 'aria-label': 'Colleague name', autocomplete: 'off' });
      name.value = c.name;
      name.addEventListener('input', () => { c.name = name.value; });
      const role = field('select', { class: 's-select compact', 'aria-label': 'Role' });
      for (const [key, r] of Object.entries(Work.ROLES)) {
        const o = field('option', { value: key, text: r.label });
        role.append(o);
      }
      role.value = c.role || 'other';
      role.addEventListener('change', () => { c.role = role.value; });
      const remove = field('button', { class: 's-action danger', type: 'button', text: 'Remove', 'aria-label': 'Remove ' + (c.name || 'colleague') });
      remove.addEventListener('click', () => { colleagues.splice(i, 1); renderList(); });
      head.append(name, role, remove);
      const owns = field('input', { type: 'text', maxlength: '200', placeholder: 'What they own, for example payments API, design system', 'aria-label': 'What they own', autocomplete: 'off' });
      owns.value = c.owns;
      owns.addEventListener('input', () => { c.owns = owns.value; });
      const notes = field('input', { type: 'text', maxlength: '400', placeholder: 'How they like to work, for example wants short status, cares about tests', 'aria-label': 'Notes about them', autocomplete: 'off' });
      notes.value = c.notes;
      notes.addEventListener('input', () => { c.notes = notes.value; });
      row.append(head, owns, notes);
      host.append(row);
    });
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
    renderList();
    const inputs = document.querySelectorAll('#colleague-list .colleague-row input');
    const last = inputs[inputs.length - 3];
    if (last) last.focus();
  });

  window.WorkPanel = { fill, collect };
})();
