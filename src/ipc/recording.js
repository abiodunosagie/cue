// IPC for Script > Record: the take's file (src/recording.js), the folder it
// goes in, showing a finished video in Finder, and moving cue's window to the
// top centre of the screen, just under the camera, while the script is read.
const fs = require('fs');
const path = require('path');
const { createRecorderFiles, defaultFolder, PRESETS } = require('../recording');

function registerRecordingIpc({ ipcMain, store, dialog, shell, screen, getWin }) {
  const folder = () => store.getSettings().recordingFolder || defaultFolder();
  const files = createRecorderFiles({ folder });
  // Only videos cue saved this run can be shown in Finder: the renderer never
  // gets to point Finder at an arbitrary path.
  const saved = new Set();
  let placedFrom = null; // the window's position before it moved under the camera

  const shownFolder = () => {
    const f = folder();
    const home = require('os').homedir();
    return f.startsWith(home + path.sep) ? '~' + f.slice(home.length) : f;
  };

  ipcMain.handle('record:info', () => ({ presets: PRESETS, folder: shownFolder(), ffmpeg: files.hasFfmpeg() }));

  ipcMain.handle('record:begin', (_e, opts) => {
    try {
      const o = opts && typeof opts === 'object' ? opts : {};
      return files.begin({ scriptName: String(o.scriptName || ''), preset: String(o.preset || ''), take: Math.max(1, Math.floor(Number(o.take) || 1)) });
    } catch (e) {
      return { error: 'The video file could not be created in ' + shownFolder() + ': ' + (e && e.message ? e.message : String(e)) };
    }
  });

  ipcMain.handle('record:chunk', (_e, id, data) => {
    if (typeof id !== 'string' || !(data instanceof ArrayBuffer || ArrayBuffer.isView(data))) return { ok: false, error: 'Bad chunk.' };
    return files.chunk(id, data);
  });

  ipcMain.handle('record:end', async (_e, id) => {
    try {
      const res = await files.end(String(id || ''));
      if (res && res.path) {
        saved.add(res.path);
        return { ...res, file: path.basename(res.path), folder: shownFolder() };
      }
      return res;
    } catch (e) {
      return { error: 'The video could not be finished: ' + (e && e.message ? e.message : String(e)) };
    }
  });

  ipcMain.handle('record:reveal', (_e, p) => {
    if (typeof p !== 'string' || !saved.has(p) || !fs.existsSync(p)) return { error: 'That video is no longer there.' };
    shell.showItemInFolder(p);
    return { ok: true };
  });

  // A take the candidate threw away: to the Trash, so a wrong press can be undone.
  ipcMain.handle('record:discard', async (_e, p) => {
    if (typeof p !== 'string' || !saved.has(p) || !fs.existsSync(p)) return { error: 'That video is no longer there.' };
    try {
      await shell.trashItem(p);
      saved.delete(p);
      return { ok: true };
    } catch (e) {
      return { error: 'Could not move it to the Trash: ' + (e && e.message ? e.message : String(e)) };
    }
  });

  ipcMain.handle('record:choose-folder', async () => {
    const win = getWin();
    const res = await dialog.showOpenDialog(win, { title: 'Where should cue save videos?', defaultPath: folder(), properties: ['openDirectory', 'createDirectory'] });
    if (res.canceled || !res.filePaths[0]) return { folder: shownFolder() };
    store.setSettings({ recordingFolder: res.filePaths[0] });
    return { folder: shownFolder() };
  });

  // on: under the camera (top centre of the screen cue is on); off: back.
  ipcMain.handle('record:place', (_e, on) => {
    const win = getWin();
    if (!win || win.isDestroyed()) return { ok: false };
    if (on) {
      const b = win.getBounds();
      if (!placedFrom) placedFrom = { x: b.x, y: b.y };
      const { workArea } = screen.getDisplayMatching(b);
      win.setPosition(Math.round(workArea.x + (workArea.width - b.width) / 2), workArea.y);
    } else if (placedFrom) {
      win.setPosition(placedFrom.x, placedFrom.y);
      placedFrom = null;
    }
    return { ok: true };
  });

  return {
    // The page reloaded or cue is quitting: keep what was recorded, move back.
    reset() {
      files.abort();
      const win = getWin();
      if (placedFrom && win && !win.isDestroyed()) win.setPosition(placedFrom.x, placedFrom.y);
      placedFrom = null;
    },
    // While cue sits under the camera, a move is not the candidate's choice to remember.
    isPlaced: () => !!placedFrom
  };
}

module.exports = { registerRecordingIpc };
