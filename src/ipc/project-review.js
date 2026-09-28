// IPC for the Project sheet: the projects the candidate's editors have open,
// and a review of one of them (or of a pasted folder or GitHub link) streamed
// into the panel like an answer. The review itself is src/project-review/.
const path = require('path');
const { detectProjects, resolveFolder, parseGitHub, cloneGitHub } = require('../project-review/locate');
const { collectProject, treeOf, kindOf } = require('../project-review/collect');
const { runTools } = require('../project-review/tools');
const { review } = require('../project-review/review');

function registerProjectReviewIpc({ ipcMain, createLLM, getSettings, send, state, projectMemory, cloneDir, log = console.log }) {
  // The folder to review, from the sheet's choice. Throws with a message to show.
  async function folderFor(source) {
    const value = source && typeof source.value === 'string' ? source.value.trim() : '';
    if (parseGitHub(value)) {
      send('status', { message: 'Downloading the repository from GitHub...' });
      return cloneGitHub(value, cloneDir);
    }
    return resolveFolder(value);
  }

  ipcMain.handle('review:detect', () => {
    try {
      const current = projectMemory.get();
      return { projects: detectProjects(), loaded: current ? { name: current.name, reviewedAt: current.reviewedAt } : null };
    } catch (e) {
      return { projects: [], error: e && e.message ? e.message : String(e) };
    }
  });

  ipcMain.handle('review:clear', () => { projectMemory.clear(); return { ok: true }; });

  // Starts the review and resolves at once; the report streams into the panel.
  ipcMain.handle('review:start', async (_e, source) => {
    if (state.busy) return { error: 'cue is answering something. Try again when it is done.' };
    const llm = createLLM(getSettings(), { tier: 'coding' });
    if (!llm.ready) return { error: llm.configurationError || 'Set up the Coding model in Settings > Keys first.' };
    let root;
    try { root = await folderFor(source); } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
    if (state.busy) return { error: 'cue is answering something. Try again when it is done.' };
    state.busy = true;
    run(llm, root).finally(() => { state.busy = false; });
    return { ok: true, name: path.basename(root) };
  });

  async function run(llm, root) {
    const name = path.basename(root);
    const startedAt = Date.now();
    let firstWord = false;
    // Each step also goes to the wait note, and a beat every minute keeps the
    // panel from giving up on a long, quiet read.
    const status = (message) => { send('status', { message }); if (!firstWord) send('llm:thinking', { text: '\n' + message + '\n' }); };
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
      projectMemory.set({ root, name, kind, tree, index: collected.files.map((f) => f.rel), report: String(report || ''), reviewedAt: Date.now() });
      send('status', { message: `Review done in ${Math.round((Date.now() - startedAt) / 1000)}s. Ask about it any time: "fix issue 2", "where is login handled".` });
      log(`[timing] review: done after ${Date.now() - startedAt}ms`);
    } catch (e) {
      log(`[timing] review: failed after ${Date.now() - startedAt}ms: ${e && e.message ? e.message : String(e)}`);
      send('llm:error', { message: 'The review stopped: ' + (e && e.message ? e.message : String(e)) });
    } finally {
      clearInterval(beat);
    }
  }
}

module.exports = { registerProjectReviewIpc };
