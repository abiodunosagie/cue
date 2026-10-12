// Work mode: one button per colleague in the panel. Clicking one tells main
// that this colleague is the one talking (src/work-session.js), so replies are
// pitched to them; clicking it again, or Everyone, goes back to the group.
(function () {
  const Work = window.WorkProfile;
  let selected = '';
  let current = [];

  const bar = () => document.getElementById('colleague-bar');

  function paint() {
    const host = bar();
    if (!host) return;
    host.querySelectorAll('button').forEach((b) => {
      const on = b.dataset.colleague === selected;
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  async function choose(id) {
    const want = id === selected ? '' : id;
    try {
      const res = await window.cue.workSpeaker(want);
      selected = (res && res.id) || '';
    } catch (_) {
      selected = '';
    }
    paint();
  }

  function button(id, name, role) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'colleague-chip';
    b.dataset.colleague = id;
    const n = document.createElement('span');
    n.className = 'colleague-chip-name';
    n.textContent = name;
    b.append(n);
    if (role) {
      const r = document.createElement('span');
      r.className = 'colleague-chip-role';
      r.textContent = role;
      b.append(r);
    }
    b.title = id ? 'Click while ' + name + ' is talking' : 'Nobody in particular: the whole group';
    b.addEventListener('click', () => { void choose(id); });
    return b;
  }

  // settings: the full settings the renderer holds. Shown only for a job
  // profile with colleagues.
  function render(settings) {
    const host = bar();
    if (!host) return;
    current = Work.isWork(settings) ? Work.normalizeColleagues(settings.colleagues) : [];
    // The colleague selected is gone (deleted, or the profile is no longer a
    // job): main must stop tagging turns with them too.
    if (selected && !current.some((c) => c.id === selected)) {
      selected = '';
      void window.cue.workSpeaker('').catch(() => {});
    }
    host.replaceChildren();
    host.classList.toggle('hidden', !current.length);
    if (!current.length) return;
    const label = document.createElement('span');
    label.className = 'colleague-bar-label';
    label.textContent = 'Talking';
    host.append(label, button('', 'Everyone', ''));
    for (const c of current) host.append(button(c.id, c.name, Work.roleLabel(c.role)));
    paint();
  }

  // Main resets the choice when the profile changes.
  window.cue.on('work:speaker', (data) => { selected = (data && data.id) || ''; paint(); });

  window.ColleagueBar = { render, selected: () => selected };
})();
