// IPC for job profiles and company research, both about the job being applied
// for. Main passes in what these need; the logic lives in src/profiles.js and
// src/company-research.js.
const Profiles = require('../profiles');
const CompanyResearch = require('../company-research');

function registerProfileIpc({ ipcMain, store, createLLM, quickAsk, onProfileChanged }) {
  // Every change goes through src/profiles.js and store.setProfileState.
  // info.deleted: the name of the profile a change removed.
  function applyProfileChange(change, info = {}) {
    try {
      const saved = store.setProfileState(change(store.getSettings()));
      onProfileChanged(saved, info);
      return { settings: store.redactForRenderer(saved) };
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  }
  ipcMain.handle('profile:switch', (_e, name) => applyProfileChange((s) => Profiles.switchTo(s, String(name || ''))));
  ipcMain.handle('profile:create', (_e, name) => applyProfileChange((s) => Profiles.create(s, String(name || ''))));
  ipcMain.handle('profile:delete-current', () => applyProfileChange((s) => Profiles.removeCurrent(s), { deleted: store.getSettings().activeProfile }));

  // Company research: notes and a Why-this-company draft for the renderer to put
  // in the form (saved with Done, like an import).
  ipcMain.handle('company:research', async (_e, rawUrl) => {
    try {
      const settings = store.getSettings();
      return await CompanyResearch.research({
        rawUrl,
        llm: createLLM({ ...settings, smart: true }),
        quickAsk,
        background: [settings.resumeText, settings.starStories].filter(Boolean).join('\n\n'),
        // Sites built with JavaScript are drawn in a hidden, locked-down window.
        render: (url) => require('../page-render').renderPage(url)
      });
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });
}

module.exports = { registerProfileIpc };
