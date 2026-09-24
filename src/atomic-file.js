// Write a private file safely: a temp file created fresh ('wx', so nothing
// already sitting at the temp path is written through), chmod 0600 whatever the
// umask, then a rename, so a crash mid-write never leaves half a file.
// Returns true on success; the caller decides whether to retry.
const fs = require('fs');

function writeFileAtomic(file, text) {
  const tmp = file + '.tmp';
  try {
    try { fs.unlinkSync(tmp); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    fs.writeFileSync(tmp, text, { mode: 0o600, flag: 'wx' });
    fs.chmodSync(tmp, 0o600);
    fs.renameSync(tmp, file);
    return true;
  } catch {
    try { fs.unlinkSync(tmp); } catch { /* nothing to tidy */ }
    return false;
  }
}

// Delete a file and its leftover temp file. ok is false only when one exists
// and could not be removed.
function removeFileAndTemp(file) {
  let ok = true;
  for (const f of [file + '.tmp', file]) {
    try { fs.unlinkSync(f); } catch (e) { if (e.code !== 'ENOENT') ok = false; }
  }
  return ok;
}

module.exports = { writeFileAtomic, removeFileAndTemp };
