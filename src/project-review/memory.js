// The project reviewed in this interview, kept for the rest of it: follow-up
// questions ("fix issue 3", "where is auth handled"), Fix my code and Check my
// progress all work from it. Unlike coding solves it survives New question;
// Clear interview or a new review replaces it. Text only (the folder, the tree,
// the file list and the report), saved next to cue-data.json (0600) so a
// restart mid-interview keeps it. Source files are re-read from disk when
// needed, never stored.

const fs = require('fs');
const { writeFileAtomic, removeFileAndTemp } = require('../atomic-file');

const MAX_REPORT_CHARS = 120000;
const MAX_TREE_CHARS = 60000;
const MAX_INDEX = 5000;

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
    reviewedAt: Number(m.reviewedAt) || 0
  };
}

function createProjectMemory({ file } = {}) {
  let current = null;
  return {
    load() {
      current = null;
      if (!file) return null;
      try { current = clean(JSON.parse(fs.readFileSync(file, 'utf8'))); } catch { /* none yet */ }
      return current;
    },
    set(m) {
      current = clean(m);
      if (file && current) writeFileAtomic(file, JSON.stringify(current));
      return current;
    },
    clear() {
      current = null;
      return file ? removeFileAndTemp(file) : true;
    },
    get: () => current,
    has: () => !!current
  };
}

module.exports = { createProjectMemory };
