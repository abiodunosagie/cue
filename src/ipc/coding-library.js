// IPC for Settings > Interview prep > Coding library: the coding questions cue
// has solved and saved (src/coding-library.js). The renderer can read and
// delete entries, never write one: only a real solve fills the library.
function registerCodingLibraryIpc({ ipcMain, codingLibrary }) {
  ipcMain.handle('codingLibrary:get', () => {
    try { return { items: codingLibrary.list() }; } catch (e) { return { error: e && e.message ? e.message : String(e) }; }
  });

  ipcMain.handle('codingLibrary:delete', (_e, id) => {
    try {
      if (typeof id !== 'string' || !id) return { error: 'Nothing to delete.' };
      if (!codingLibrary.remove(id)) return { error: 'Could not save the library. Try again.', items: codingLibrary.list() };
      return { items: codingLibrary.list() };
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });
}

module.exports = { registerCodingLibraryIpc };
