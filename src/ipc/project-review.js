// IPC for the Project sheet: the projects the candidate's editors have open,
// and a review of one of them (or of a pasted folder or GitHub link) streamed
// into the panel like an answer. The review itself is src/project-review/.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detectProjects, resolveFolder, parseGitHub, cloneGitHub } = require('../project-review/locate');
const { collectProject, collectProjects, treeOf, kindOf, walkthroughWorthy } = require('../project-review/collect');
const { projectQuestions } = require('../project-review/qa');
const { folderHead, codeMovedOn } = require('../project-review/git-head');
const { runTools } = require('../project-review/tools');
const { review } = require('../project-review/review');

const message = (e) => (e && e.message ? e.message : String(e));
// The Explain key main.js registers (fixed, not in Settings), as the owner reads it.
const EXPLAIN_KEY = 'Cmd+Shift+E';
// Apps read together for one walkthrough (a rider app and a driver app).
const MAX_WALK_APPS = 3;
// With several apps the walkthrough may run longer than for one.
const SEVERAL_APPS_TOUR_STOPS = 14;
const SEVERAL_APPS_QUESTIONS = 16;

// What the model is told when the walkthrough covers several apps.
function severalAppsNote(names) {
  return `These are ${names.length} apps of one system, each under its own folder: ${names.join(', ')}. ` +
    'Write one walkthrough covering all of them: name the app in every demo step, tour stop and flow, show how the apps talk to each other through the backend, ' +
    `and allow up to ${SEVERAL_APPS_TOUR_STOPS} code tour stops and ${SEVERAL_APPS_QUESTIONS} likely questions.`;
}

// Several folders for one walkthrough must be separate apps under one parent:
// never one inside another (read twice), never with only the disk in common.
function checkSeveralApps(roots) {
  if (roots.length < 2) return '';
  const inside = (a, b) => a !== b && (a + path.sep).startsWith(b + path.sep);
  if (roots.some((a) => roots.some((b) => inside(a, b)))) return 'One of those folders is inside another. Pick each app folder once.';
  const parts = roots.map((r) => r.split(path.sep));
  if (!parts.every((p) => p[1] && p[1] === parts[0][1])) return 'Those apps are in very different places on this Mac. Pick apps that sit in the same parent folder.';
  return '';
}
const BUSY = 'cue is answering something. Try again when it is done.';

// The folder as the candidate knows it, never an absolute path with their user name.
function shown(p, home = os.homedir()) {
  return p === home || p.startsWith(home + path.sep) ? '~' + p.slice(home.length) : p;
}

// userDataDir: cue's own data (API keys); never reviewable. cloneDir: where
// GitHub links are downloaded, inside it.
// answerSystem(): the live answer's system prompt for the active profile, for the walkthrough's likely questions.
function registerProjectReviewIpc({ ipcMain, createLLM, getSettings, send, state, projectMemory, userDataDir, cloneDir, answerSystem, log = console.log }) {
  // The folder to review. Throws with a message to show.
  async function folderFor(value) {
    if (parseGitHub(value)) {
      send('status', { message: 'Downloading the repository from GitHub...' });
      return cloneGitHub(value, cloneDir);
    }
    return resolveFolder(value, { protected: [userDataDir], allowed: [cloneDir] });
  }

  ipcMain.handle('project:detect', async () => {
    try {
      const current = projectMemory.get();
      return {
        projects: detectProjects().map((p) => ({ ...p, shown: shown(p.path) })),
        loaded: current ? { name: current.name, reviewedAt: current.reviewedAt, purpose: current.purpose, questions: current.qa.length, changed: await codeMovedOn(current) } : null
      };
    } catch (e) {
      return { projects: [], error: message(e) };
    }
  });

  ipcMain.handle('project:clear', () => { projectMemory.clear(); return { ok: true }; });

  // Shows the saved walkthrough or review again, as an answer in the panel.
  // A review renders like it first streamed (code blocks, no read-aloud follow);
  // a walkthrough is read aloud, so the panel follows the voice through it.
  ipcMain.handle('project:show', () => {
    const current = projectMemory.get();
    if (!current) return { error: 'Nothing is loaded yet.' };
    if (state.busy) return { error: BUSY };
    send('llm:start', { userBubble: `${current.purpose === 'walkthrough' ? 'Walkthrough of' : 'Review of'} ${current.name}`, small: false, coding: current.purpose !== 'walkthrough', follow: current.purpose === 'walkthrough' });
    // A walkthrough's likely questions follow it, so the owner can read and check them before the interview.
    const qa = current.qa.length
      ? '\n\n**Likely questions, answered at once when asked:**\n\n' + current.qa.map((q, i) => `**${i + 1}. ${q.question}**\n${q.answer}`).join('\n\n')
      : '';
    send('llm:token', { text: current.report + qa });
    send('llm:done', {});
    return { ok: true };
  });

  // Starts the review and resolves at once; the report streams into the panel.
  // cue is busy from the first step (a GitHub download can take a minute), so
  // nothing else starts meanwhile.
  ipcMain.handle('project:start', async (_e, source) => {
    const purpose = source && source.purpose === 'walkthrough' ? 'walkthrough' : 'review';
    // One folder, or for a walkthrough up to MAX_WALK_APPS folders read as one system.
    const values = (source && Array.isArray(source.values) ? source.values : [source && source.value])
      .filter((v) => typeof v === 'string' && v.trim()).map((v) => v.trim().slice(0, 2000));
    const unique = [...new Set(values)];
    if (!unique.length) return { error: 'Pick a project or paste its folder path.' };
    if (unique.length > 1 && purpose !== 'walkthrough') return { error: 'A review reads one codebase. Pick one project.' };
    if (unique.length > MAX_WALK_APPS) return { error: `A walkthrough reads up to ${MAX_WALK_APPS} apps at once.` };
    if (unique.length > 1 && unique.some((v) => parseGitHub(v))) return { error: 'To walk through several apps, pick folders on this Mac.' };
    if (state.busy) return { error: BUSY };
    const llm = createLLM(getSettings(), { tier: 'coding' });
    if (!llm.ready) return { error: llm.configurationError || 'Set up the Coding model in Settings > Keys first.' };
    state.busy = true;
    const roots = [];
    try {
      for (const v of unique) roots.push(await folderFor(v));
    } catch (e) {
      state.busy = false;
      return { error: message(e) };
    }
    const invalid = checkSeveralApps([...new Set(roots)]);
    if (invalid) { state.busy = false; return { error: invalid }; }
    // run() may hand busy back early (a walkthrough frees cue while its likely
    // questions are written); then another answer owns it, and this must not clear it.
    const owner = { released: false };
    run(llm, [...new Set(roots)], purpose, owner).finally(() => { if (!owner.released) state.busy = false; });
    return { ok: true, name: roots.map((r) => path.basename(r)).join(' + ') };
  });

  // The walkthrough's likely questions with their answers, on the Smart model in
  // the active profile's voice; [] when that fails, the walkthrough works without.
  async function likelyQuestions(name, report, startedAt) {
    const llm = createLLM({ ...getSettings(), smart: true });
    if (!llm.ready) return [];
    try {
      const qa = await projectQuestions({ llm, system: answerSystem(), name, report });
      log(`[timing] walkthrough: ${qa.length} likely questions after ${Date.now() - startedAt}ms`);
      return qa;
    } catch (e) {
      log(`[timing] walkthrough: likely questions failed: ${message(e)}`);
      return [];
    }
  }

  async function run(llm, roots, purpose, owner = { released: false }) {
    const several = roots.length > 1;
    const root = several ? null : roots[0];
    const name = roots.map((r) => path.basename(r)).join(' + ');
    const walk = purpose === 'walkthrough';
    const label = walk ? 'walkthrough' : 'review';
    const startedAt = Date.now();
    const generation = projectMemory.generation();
    let firstWord = false;
    // Each step also goes to the wait note, and a beat every minute keeps the
    // panel from giving up on a long, quiet read.
    const status = (text) => { send('status', { message: text }); if (!firstWord) send('llm:thinking', { text: '\n' + text + '\n' }); };
    const beat = setInterval(() => { if (!firstWord) send('llm:thinking', { text: '' }); }, 60000);
    send('llm:start', { userBubble: walk ? `Walk through ${name}` : `Review the ${name} codebase`, small: false, coding: true, showWait: true });
    try {
      status(`Reading ${name}...`);
      // Each app's commit when its files are read, so a later commit shows as new.
      const heads = walk ? await Promise.all(roots.map(async (r) => ({ path: r, head: await folderHead(r) }))) : [];
      const keep = walk ? walkthroughWorthy : null;
      const collected = several ? collectProjects(roots, { keep }) : { ...collectProject(root, { keep }), root };
      if (!collected.files.length) throw new Error('No source files were found in that folder.');
      const kind = several ? collected.kind : kindOf(collected.files);
      const tree = treeOf(collected.files);
      log(`[timing] ${label}: read ${collected.files.length} files (${collected.totalChars} chars) after ${Date.now() - startedAt}ms`);
      // A walkthrough shows what the code does, not what an analyzer flags.
      const analyzer = walk ? null : await runTools(collected.root, kind, { onStatus: status });
      if (analyzer) log(`[timing] review: ${analyzer.tool || 'no analyzer'} ${analyzer.findings.length} findings after ${Date.now() - startedAt}ms`);
      const report = await review({
        llm,
        project: {
          name, kind, tree, files: collected.files, skipped: collected.skipped, truncated: collected.truncated,
          note: several ? severalAppsNote(roots.map((r) => path.basename(r))) : ''
        },
        analyzer,
        purpose,
        log,
        onStatus: status,
        onThinking: (text) => { if (!firstWord) send('llm:thinking', { text }); },
        onToken: (text) => {
          if (!firstWord) { firstWord = true; log(`[timing] ${label}: first word after ${Date.now() - startedAt}ms (${llm.model})`); }
          send('llm:token', { text });
        }
      });
      send('llm:done', {});
      // Cleared or replaced while it ran: the review is shown but not kept.
      if (projectMemory.generation() !== generation) return;
      const saved = {
        root: collected.root, name, kind, tree, index: collected.files.map((f) => f.rel), report: String(report || ''), purpose, qa: [], heads,
        reviewedAt: Date.now()
      };
      projectMemory.set(saved);
      const secs = Math.round((Date.now() - startedAt) / 1000);
      if (!walk) { send('status', { message: `Review done in ${secs}s. Type questions about it in the ask box.` }); return; }
      // The walkthrough works now; cue is free again while its likely questions
      // are answered in the background, so they show at once in the interview.
      state.busy = false;
      owner.released = true;
      send('status', { message: `Walkthrough ready in ${secs}s. Now answering its likely questions in the background, about a minute. In the interview, press ${EXPLAIN_KEY} on any file or app screen.` });
      const qa = await likelyQuestions(name, saved.report, startedAt);
      // Cleared or replaced meanwhile (the save above moved the generation once).
      if (projectMemory.generation() !== generation + 1) return;
      if (qa.length) projectMemory.set({ ...saved, qa });
      send('status', { message: qa.length
        ? `${qa.length} likely questions about ${name} are answered and will show at once.`
        : 'The likely questions could not be answered this time; the walkthrough still works, and questions are answered live.' });
      log(`[timing] ${label}: done after ${Date.now() - startedAt}ms`);
    } catch (e) {
      log(`[timing] ${label}: failed after ${Date.now() - startedAt}ms: ${message(e)}`);
      send('llm:error', { message: `The ${label} stopped: ` + message(e) });
      // A download nobody will review goes too.
      const base = path.resolve(cloneDir) + path.sep;
      if (root && root.startsWith(base) && (!projectMemory.get() || projectMemory.get().root !== root)) fs.rmSync(path.dirname(root), { recursive: true, force: true });
    } finally {
      clearInterval(beat);
    }
  }
}

module.exports = { registerProjectReviewIpc, checkSeveralApps };
