// The Project sheet: pick the codebase to review (a project open in the
// candidate's editors, a pasted folder path or a GitHub link) and start the
// review, which streams into the panel like an answer (src/ipc/project-review.js).
// Everything shown here is text from main, set with textContent.
(function () {
  const $ = (id) => document.getElementById(id);
  let picked = '';

  function status(text) { $('project-status').textContent = text || ''; }

  function shortPath(p) {
    const m = /^\/Users\/[^/]+\/(.*)$/.exec(p);
    return m ? '~/' + m[1] : p;
  }

  function when(ms) {
    if (!ms) return '';
    const mins = Math.round((Date.now() - ms) / 60000);
    if (mins < 60) return mins <= 1 ? 'just now' : `${mins} min ago`;
    const hours = Math.round(mins / 60);
    return hours < 36 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
  }

  function render(projects) {
    const list = $('project-list');
    list.replaceChildren();
    if (!projects.length) {
      const empty = document.createElement('div');
      empty.className = 'project-empty';
      empty.textContent = 'No recent projects found in IntelliJ, Android Studio or VS Code. Paste the folder path below.';
      list.append(empty);
      picked = '';
      return;
    }
    picked = projects[0].path;
    projects.forEach((p, i) => {
      const row = document.createElement('label');
      row.className = 'project-row' + (i === 0 ? ' on' : '');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'project-pick';
      radio.checked = i === 0;
      const text = document.createElement('span');
      text.className = 'p-text';
      const name = document.createElement('span');
      name.className = 'p-name';
      name.textContent = p.name;
      const meta = document.createElement('span');
      meta.className = 'p-meta';
      meta.textContent = [p.open ? `open in ${p.editor}` : `${p.editor}, ${when(p.at)}`, shortPath(p.path)].filter(Boolean).join(' · ');
      text.append(name, meta);
      row.append(radio, text);
      radio.addEventListener('change', () => {
        picked = p.path;
        $('project-path').value = '';
        list.querySelectorAll('.project-row').forEach((r) => r.classList.toggle('on', r === row));
      });
      list.append(row);
    });
  }

  function showLoaded(loaded) {
    $('project-loaded').classList.toggle('hidden', !loaded);
    if (loaded) $('project-loaded-text').textContent = `${loaded.name} was reviewed ${when(loaded.reviewedAt)}. Type questions about it: "fix issue 2", "where is login handled".`;
  }

  async function open() {
    $('project-scrim').classList.remove('hidden');
    status('');
    $('project-review').disabled = false;
    const res = await window.cue.reviewDetect().catch(() => null);
    render((res && res.projects) || []);
    showLoaded(res && res.loaded);
    if (res && res.error) status(res.error);
  }

  function close() { $('project-scrim').classList.add('hidden'); }

  async function start() {
    const typed = $('project-path').value.trim();
    const value = typed || picked;
    if (!value) { status('Pick a project or paste its folder path.'); return; }
    $('project-review').disabled = true;
    status('Starting...');
    const res = await window.cue.reviewStart({ value }).catch((e) => ({ error: e && e.message ? e.message : String(e) }));
    $('project-review').disabled = false;
    if (!res || res.error) { status((res && res.error) || 'The review could not start.'); return; }
    close();
  }

  function init() {
    if (!$('project-btn')) return;
    $('project-btn').addEventListener('click', open);
    $('project-close').addEventListener('click', close);
    $('project-review').addEventListener('click', start);
    $('project-path').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(); });
    $('project-path').addEventListener('input', () => {
      const typing = !!$('project-path').value.trim();
      document.querySelectorAll('.project-row').forEach((r) => r.classList.toggle('on', !typing && r.querySelector('input').checked));
    });
    $('project-forget').addEventListener('click', async () => { await window.cue.reviewClear(); showLoaded(null); });
    $('project-scrim').addEventListener('click', (e) => { if (e.target === $('project-scrim')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('project-scrim').classList.contains('hidden')) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
