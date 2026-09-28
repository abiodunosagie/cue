// IPC for the Project sheet: the projects the candidate's editors have open,
// and a review of one of them (or of a pasted folder or GitHub link) streamed
// into the panel like an answer. The review itself is src/project-review/.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detectProjects, resolveFolder, parseGitHub, cloneGitHub } = require('../project-review/locate');
const { collectProject, treeOf, kindOf } = require('../project-review/collect');
const { runTools } = require('../project-review/tools');
const { review } = require('../project-review/review');

const message = (e) => (e && e.message ? e.message : String(e));
const BUSY = 'cue is answering something. Try again when it is done.';

// The folder as the candidate knows it, never an absolute path with their user name.
function shown(p, home = os.homedir()) {
  return p === home || p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p;
}

// userDataDir: cue's own data (API keys); never reviewable. cloneDir: where
// GitHub links are downloaded, inside it.
function registerProjectReviewIpc({ ipcMain, createLLM, getSettings, send, state, projectMemory, userDataDir, cloneDir, log = console.log }) {
  // The folder to review. Throws with a message to show.
  async function folderFor(value) {
    if (parseGitHub(value)) {
      send('status', { message: 'Downloading the repository from GitHub...' });
      return cloneGitHub(value, cloneDir);
    }
    return resolveFolder(value, { protected: [userDataDir], allowed: [cloneDir] });
  }

  ipcMain.handle('project:detect', () => {
    try {
      const current = projectMemory.get();
      return {
        projects: detectProjects().map((p) => ({ ...p, shown: shown(p.path) })),
        loaded: current ? { name: current.name, reviewedAt: current.reviewedAt } : null
      };
    } catch (e) {
      return { projects: [], error: message(e) };
    }
  });

  ipcMain.handle('project:clear', () => { projectMemory.clear(); return { ok: true }; });

  // Starts the review and resolves at once; the report streams into the panel.
  // cue is busy from the first step (a GitHub download can take a minute), so
  // nothing else starts meanwhile.
  ipcMain.handle('project:start', async (_e, source) => {
    const value = source && typeof source.value === 'string' ? source.value.trim().slice(0, 2000) : '';
    if (state.busy) return { error: BUSY };
    const llm = createLLM(getSettings(), { tier: 'coding' });
    if (!llm.ready) return { error: llm.configurationError || 'Set up the Coding model in Settings > Keys first.' };
    state.busy = true;
    let root;
    try {
      root = await folderFor(value);
    } catch (e) {
      state.busy = false;
      return { error: message(e) };
    }
    run(llm, root).finally(() => { state.busy = false; });
    return { ok: true, name: path.basename(root) };
  });

  async function run(llm, root) {
    const name = path.basename(root);
    const startedAt = Date.now();
    const generation = projectMemory.generation();
    let firstWord = false;
    // Each step also goes to the wait note, and a beat every minute keeps the
    // panel from giving up on a long, quiet read.
    const status = (text) => { send('status', { message: text }); if (!firstWord) send('llm:thinking', { text: '\n' + text + '\n' }); };
    const beat = setInterval(() => { if (!firstWord) send('llm:thinking', { text: '' }); }, 60000);
    send('llm:start', { userBubble: `Review the ${name} codebase`, small: false, coding: true, showWait: true });
    try {
      status(`Reading ${name}...`);
      const collected = collectProject(root);
      if (!collected.files.length) throw new Error('No source files were found in that folder.');
      const kind = kindOf(collected.files);
      const tree = treeOf(collected.files);
      log(`[timing] review: read ${collected.files.length} files (${collected.totalChars} chars) after ${Date.now() - startedAt}ms`);
      const analyzer = await runTools(root, kind, { onStatus: status });
      log(`[timing] review: ${analyzer.tool || 'no analyzer'} ${analyzer.findings.length} findings after ${Date.now() - startedAt}ms`);
      const report = await review({
        llm,
        project: { name, kind, tree, files: collected.files, skipped: collected.skipped, truncated: collected.truncated },
        analyzer,
        log,
        onStatus: status,
        onThinking: (text) => { if (!firstWord) send('llm:thinking', { text }); },
        onToken: (text) => {
          if (!firstWord) { firstWord = true; log(`[timing] review: first word after ${Date.now() - startedAt}ms (${llm.model})`); }
          send('llm:token', { text });
        }
      });
      send('llm:done', {});
      // Cleared or replaced while it ran: the review is shown but not kept.
      if (projectMemory.generation() !== generation) return;
      projectMemory.set({ root, name, kind, tree, index: collected.files.map((f) => f.rel), report: String(report || ''), reviewedAt: Date.now() });
      send('status', { message: `Review done in ${Math.round((Date.now() - startedAt) / 1000)}s. Type questions about it in the ask box.` });
      log(`[timing] review: done after ${Date.now() - startedAt}ms`);
    } catch (e) {
      log(`[timing] review: failed after ${Date.now() - startedAt}ms: ${message(e)}`);
      send('llm:error', { message: 'The review stopped: ' + message(e) });
      // A download nobody will review goes too.
      const base = path.resolve(cloneDir) + path.sep;
      if (root.startsWith(base) && (!projectMemory.get() || projectMemory.get().root !== root)) fs.rmSync(path.dirname(root), { recursive: true, force: true });
    } finally {
      clearInterval(beat);
    }
  }
}

module.exports = { registerProjectReviewIpc };
