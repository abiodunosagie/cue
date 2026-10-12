// The Project sheet: pick a codebase (a project open in the candidate's
// editors, a pasted folder path or a GitHub link) and start a review of it or a
// walkthrough of it, which streams into the panel like an answer
// (src/ipc/project-review.js).
// Everything shown here is text from main, set with textContent.
(function () {
  const $ = (id) => document.getElementById(id);
  // The ticked projects' folders: one for a review, up to three apps of one
  // system (a rider app and a driver app) for a walkthrough.
  let picked = [];
  // The active profile is a job (work mode): Learn it is offered and comes first.
  let atWork = false;

  function status(text) { $('project-status').textContent = text || ''; }

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
      empty.className = 'proj-empty';
      empty.textContent = 'No recent projects found in your editors (IntelliJ, Android Studio, PyCharm, WebStorm, VS Code, Cursor). Paste the folder path below.';
      list.append(empty);
      picked = [];
      return;
    }
    picked = [projects[0].path];
    projects.forEach((p, i) => {
      const row = document.createElement('label');
      row.className = 'project-row' + (i === 0 ? ' on' : '');
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.name = 'project-pick';
      box.checked = i === 0;
      const text = document.createElement('span');
      text.className = 'p-text';
      const name = document.createElement('span');
      name.className = 'p-name';
      name.textContent = p.name;
      const meta = document.createElement('span');
      meta.className = 'p-meta';
      meta.textContent = [p.open ? `open in ${p.editor}` : `${p.editor}, ${when(p.at)}`, p.shown || p.path].filter(Boolean).join(' · ');
      text.append(name, meta);
      row.append(box, text);
      box.addEventListener('change', () => {
        picked = box.checked ? [...picked.filter((x) => x !== p.path), p.path] : picked.filter((x) => x !== p.path);
        $('project-path').value = '';
        row.classList.toggle('on', box.checked);
      });
      list.append(row);
    });
  }

  // What the sheet says about what is loaded, by kind of read.
  const LOADED_TEXT = {
    onboarding: (l) => `Guide to ${l.name} ready${l.reviewedAt ? ' (' + when(l.reviewedAt) + ')' : ''}. Every reply at your job uses it. Type questions about the code: "where is the invoice total worked out", "how do I add a field to the payment form".` +
      (l.changed ? ' The code has new commits since: press Learn it again to bring the guide up to date.' : ''),
    walkthrough: (l) => `Walkthrough of ${l.name} ready (${when(l.reviewedAt)}).` +
      (l.questions ? ` ${l.questions} likely questions are answered already and show at once.` : '') +
      ' In the interview, press Cmd+Shift+E on any file or app screen. Answers to questions you hear or type use it too. It stays until you press Forget it.' +
      (l.changed ? ' The code has new commits since it was made: press Walk through it again to bring it up to date.' : ''),
    review: (l) => `${l.name} was reviewed ${when(l.reviewedAt)}. Type questions about it: "fix issue 2", "what does AuthService do", "where is login handled in the project".`
  };
  const WHAT = { walkthrough: 'The walkthrough', onboarding: 'The guide', review: 'The review' };

  function showLoaded(loaded) {
    $('project-loaded').classList.toggle('hidden', !loaded);
    if (!loaded) return;
    $('project-loaded-text').textContent = (LOADED_TEXT[loaded.purpose] || LOADED_TEXT.review)(loaded);
  }

  const starters = () => [$('project-review'), $('project-walk'), $('project-learn')];

  // Learn it only for a job profile; there it is the main button.
  function showWork(work) {
    atWork = !!work;
    $('project-learn').classList.toggle('hidden', !atWork);
    $('project-learn-advice').classList.toggle('hidden', !atWork);
    $('project-review').className = atWork ? 's-action' : 'ob-primary';
    $('project-title').textContent = atWork ? 'Learn, review or walk through a project' : 'Review or walk through a project';
  }
  let starting = false; // one read at a time, Enter or either button

  async function open() {
    $('project-scrim').classList.remove('hidden');
    status('');
    starters().forEach((b) => { b.disabled = false; });
    const res = await window.cue.projectDetect().catch(() => null);
    showWork(res && res.work);
    render((res && res.projects) || []);
    showLoaded(res && res.loaded);
    if (res && res.error) status(res.error);
  }

  function close() { $('project-scrim').classList.add('hidden'); }

  // purpose: 'review', 'walkthrough' or 'onboarding' (Learn it).
  async function start(purpose) {
    if (starting) return;
    const typed = $('project-path').value.trim();
    // A review reads one codebase, so a pasted path is taken whole; a walkthrough or a guide reads several folders, pasted with commas between.
    const values = typed ? (purpose !== 'review' ? typed.split(',').map((t) => t.trim()).filter(Boolean) : [typed]) : picked;
    if (!values.length) { status('Pick a project or paste its folder path.'); return; }
    if (purpose === 'review' && values.length > 1) { status('Review it reads one project. Untick the others, or press Walk through it to read them together.'); return; }
    starting = true;
    starters().forEach((b) => { b.disabled = true; });
    status('Starting...');
    const res = await window.cue.projectStart({ values, purpose }).catch((e) => ({ error: e && e.message ? e.message : String(e) }));
    starting = false;
    starters().forEach((b) => { b.disabled = false; });
    const what = WHAT[purpose] || WHAT.review;
    if (!res || res.error) { status((res && res.error) || `${what} could not start.`); return; }
    close();
  }

  async function show() {
    const res = await window.cue.projectShow().catch((e) => ({ error: e && e.message ? e.message : String(e) }));
    if (!res || res.error) { status((res && res.error) || 'The saved text could not be shown.'); return; }
    close();
  }

  function init() {
    if (!$('project-btn')) return;
    $('project-btn').addEventListener('click', open);
    $('project-close').addEventListener('click', close);
    $('project-review').addEventListener('click', () => start('review'));
    $('project-walk').addEventListener('click', () => start('walkthrough'));
    $('project-learn').addEventListener('click', () => start('onboarding'));
    $('project-show').addEventListener('click', show);
    $('project-path').addEventListener('keydown', (e) => { if (e.key === 'Enter') start(atWork ? 'onboarding' : 'review'); });
    $('project-path').addEventListener('input', () => {
      const typing = !!$('project-path').value.trim();
      document.querySelectorAll('.project-row').forEach((r) => r.classList.toggle('on', !typing && r.querySelector('input').checked));
    });
    $('project-forget').addEventListener('click', async () => { await window.cue.projectClear(); showLoaded(null); });
    $('project-scrim').addEventListener('click', (e) => { if (e.target === $('project-scrim')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('project-scrim').classList.contains('hidden')) close(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
