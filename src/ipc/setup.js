// IPC for Test my setup: real calls, one after another, each result sent as it
// lands. One run at a time, so a held-down click cannot spend in a loop.
const { runSetupChecks } = require('../setup-check');

function registerSetupIpc({ ipcMain, send, deps }) {
  let running = false;
  ipcMain.handle('setup:test', async () => {
    if (running) return { busy: true };
    running = true;
    try {
      return await runSetupChecks(deps(), (result) => send('setup:result', result));
    } finally {
      running = false;
    }
  });
}

module.exports = { registerSetupIpc };
