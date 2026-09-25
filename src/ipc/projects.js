// IPC for Settings > Projects: scan the projects folder, draft notes with the
// Smart model, save the candidate's edits. The saved list is main-owned (in
// store RENDERER_READ_ONLY), so the Settings Save button can never write back
// a stale copy over these edits.
const os = require('os');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { scanProjects } = require('../projects-scan');
const { mergeScan, normalizeProjects, digestFits } = require('../projects');
const { draftProjects } = require('../project-draft');

const ROOT = path.join(os.homedir(), 'Projects');
// The owner's registry of repos and the git identity used in each one.
const INDEX_FILE = path.join(os.homedir(), 'project-guides', '_PROJECTS_INDEX.md');

function globalGitEmail() {
  return new Promise((resolve) => {
    execFile('git', ['config', '--global', 'user.email'], { timeout: 4000 }, (err, out) => resolve(err ? '' : String(out).trim()));
  });
}

function registerProjectsIpc({ ipcMain, store, createLLM, quickAsk, send }) {
  // The last scan's README excerpts and folder names, kept in memory for
  // drafting only. Never stored, never sent to the renderer.
  let lastScan = new Map();

  // The folder as the candidate knows it, never an absolute path with their user name.
  const shownRoot = '~' + path.sep + path.relative(os.homedir(), ROOT);
  const view = (settings) => ({ projects: settings.projects, fits: digestFits(settings.projects), root: shownRoot });

  async function scan() {
    let indexText = '';
    try { indexText = fs.readFileSync(INDEX_FILE, 'utf8'); } catch { /* no registry: own email only */ }
    const email = await globalGitEmail();
    const found = await scanProjects({ root: ROOT, home: os.homedir(), ownEmails: email ? [email] : [], indexText });
    lastScan = new Map(found.map((p) => [p.id, p]));
    const saved = store.setProjects(mergeScan(store.getSettings().projects, found));
    // Commit counts are shown, not stored; author emails stay in this process.
    const info = {};
    for (const p of found) info[p.id] = { commits: p.commits, myCommits: p.myCommits, hasText: !!(p.readme || p.description) };
    return { ...view(saved), info };
  }

  ipcMain.handle('projects:get', () => view(store.getSettings()));

  ipcMain.handle('projects:scan', async () => {
    try { return await scan(); } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
  });

  ipcMain.handle('projects:save', (_e, list) => {
    try { return view(store.setProjects(normalizeProjects(list))); } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
  });

  // Drafts for the given ids (the ticked ones without notes, or one project).
  // Resolves the drafts for the renderer to put in the fields. When a scan was
  // needed first (none this session, or a project moved since), its result
  // comes back too, so the renderer adopts the fresh list before saving and
  // cannot write the older one back over it.
  ipcMain.handle('projects:draft', async (_e, ids) => {
    try {
      const wanted = (Array.isArray(ids) ? ids : []).map(String);
      let scanned = null;
      if (!wanted.every((id) => lastScan.has(id))) scanned = await scan();
      const projects = wanted.map((id) => lastScan.get(id)).filter(Boolean);
      if (!projects.length) return { error: 'These projects are no longer in your projects folder.', scanned };
      const settings = store.getSettings();
      const result = await draftProjects({
        projects,
        llm: createLLM({ ...settings, smart: true }),
        quickAsk,
        onProgress: (p) => send('projects:draft-progress', p)
      });
      return { ...result, scanned };
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });
}

module.exports = { registerProjectsIpc, ROOT };
