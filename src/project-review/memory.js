// The project reviewed in this interview, kept for the rest of it: follow-up
// questions ("fix issue 3", "where is auth handled"), Fix my code and Check my
// progress all work from it. Unlike coding solves it survives New question;
// Clear interview or a new review replaces it; a walkthrough of the
// candidate's own project is prepared before the interview, so only a new
// read or Forget it replaces that. Text only (the folder, the tree,
// the file list and the report), saved next to cue-data.json (0600) so a
// restart mid-interview keeps it. Source files are re-read from disk when
// needed, never stored.

const fs = require('fs');
const path = require('path');
const { writeFileAtomic, removeFileAndTemp } = require('../atomic-file');
const { parseItems } = require('../prepared-answers');

const MAX_REPORT_CHARS = 120000;
const MAX_TREE_CHARS = 60000;
// Room for every file of three apps read together for one walkthrough (collect.js MAX_FILES each).
const MAX_INDEX = 12000;

function clean(m) {
  if (!m || typeof m !== 'object' || typeof m.root !== 'string' || !m.root) return null;
  const report = String(m.report || '').slice(0, MAX_REPORT_CHARS);
  if (!report.trim()) return null;
  return {
    root: m.root,
    name: String(m.name || '').slice(0, 200),
    kind: String(m.kind || 'other').slice(0, 20),
    tree: String(m.tree || '').slice(0, MAX_TREE_CHARS),
    index: (Array.isArray(m.index) ? m.index : []).filter((x) => typeof x === 'string').slice(0, MAX_INDEX),
    report,
    // A review of a codebase the candidate was handed, a walkthrough of their own,
    // or a guide to the codebase at the user's job (work mode).
    purpose: m.purpose === 'walkthrough' || m.purpose === 'onboarding' ? m.purpose : 'review',
    // A walkthrough's likely questions with their answers (src/project-review/qa.js).
    qa: parseItems(JSON.stringify(Array.isArray(m.qa) ? m.qa : [])),
    // Each app's git commit when it was read, to tell when the code moved on.
    heads: (Array.isArray(m.heads) ? m.heads : [])
      .filter((h) => h && typeof h.path === 'string' && typeof h.head === 'string')
      .slice(0, 3).map((h) => ({ path: h.path, head: h.head.slice(0, 64) })), // one per app, up to MAX_WALK_APPS
    reviewedAt: Number(m.reviewedAt) || 0,
    // A guide belongs to the job profile it was read for.
    profile: typeof m.profile === 'string' ? m.profile.slice(0, 80) : ''
  };
}

// cloneDir: where GitHub links are downloaded; a review of one is deleted
// with it, so a third party's code does not stay on the disk.
function createProjectMemory({ file, cloneDir = '' } = {}) {
  let current = null;
  let generation = 0;
  const dropClone = (m) => {
    if (!m || !cloneDir) return;
    // Resolved first, so a stored root like <cloneDir>/../x can never point the delete outside it.
    const base = path.resolve(cloneDir) + path.sep;
    const clone = path.dirname(path.resolve(m.root));
    if (clone.startsWith(base)) fs.rmSync(clone, { recursive: true, force: true });
  };
  return {
    load() {
      current = null;
      if (!file) return null;
      // None yet, or unreadable: the interview goes on without a review.
      try { current = clean(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { current = null; }
      return current;
    },
    set(m) {
      const next = clean(m);
      if (current && next && current.root !== next.root) dropClone(current);
      generation++;
      current = next;
      if (file && current) writeFileAtomic(file, JSON.stringify(current));
      return current;
    },
    clear() {
      dropClone(current);
      generation++;
      current = null;
      return file ? removeFileAndTemp(file) : true;
    },
    get: () => current,
    // Moves on every set and clear: a review that finishes after the interview
    // was cleared (or another review replaced it) is not kept.
    generation: () => generation,
    has: () => !!current
  };
}

module.exports = { createProjectMemory };
