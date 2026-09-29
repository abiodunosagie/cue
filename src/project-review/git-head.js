// Which commit a project's folder was at, to tell when a saved walkthrough is
// out of date. Read only, never blocks the main process, and scoped to the
// folder: in a monorepo, a commit elsewhere in the repository does not count.
const { execFile } = require('child_process');

const GIT_TIMEOUT_MS = 3000;

// The newest commit that touched the folder, or '' (not a repository, git missing, too slow).
function folderHead(root) {
  return new Promise((resolve) => {
    execFile('git', ['-C', root, 'log', '-1', '--format=%H', '--', '.'], { encoding: 'utf8', timeout: GIT_TIMEOUT_MS }, (error, stdout) => {
      resolve(error ? '' : String(stdout || '').trim());
    });
  });
}

// True when any app of a saved walkthrough has a newer commit than when it was read.
async function codeMovedOn(memory) {
  const heads = (memory && memory.heads) || [];
  const now = await Promise.all(heads.map((h) => (h.head ? folderHead(h.path) : Promise.resolve(h.head))));
  return heads.some((h, i) => h.head && now[i] && now[i] !== h.head);
}

module.exports = { folderHead, codeMovedOn };
