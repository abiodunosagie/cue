// For company websites built as single-page apps (the HTML is an empty shell
// and the words arrive with JavaScript): open the page in a hidden, locked-down
// window, let it render, and read the text a visitor sees plus its links.
// Main process only. The window has no preload, no Node, a sandbox, its own
// throwaway session, and every request to this machine or the local network is
// blocked, so the page can only talk to the public internet.

const { BrowserWindow, session } = require('electron');
const { isPrivateAddress } = require('./company-research');

const RENDER_TIMEOUT_MS = 20000;
const SETTLE_MS = 2500; // after load, for content the app fetches and draws
const MAX_TEXT_CHARS = 6000;

let partitionCount = 0;

// A request host that is this machine or a private network, by name or literal address.
function isLocalHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.') && !h.includes(':')) return true;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return isPrivateAddress(h);
  return false;
}

// { text, links } of the rendered page; rejects on timeout or a failed load.
function renderPage(url) {
  const ses = session.fromPartition('cue-render-' + (++partitionCount), { cache: false });
  ses.webRequest.onBeforeRequest((details, callback) => {
    let host = '';
    try { host = new URL(details.url).hostname; } catch { return callback({ cancel: true }); }
    const scheme = details.url.split(':')[0];
    callback({ cancel: !['https', 'http', 'data', 'blob'].includes(scheme) || ((scheme === 'https' || scheme === 'http') && isLocalHost(host)) });
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900,
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: true, images: false, webSecurity: true }
  });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.setAudioMuted(true);
  const done = () => { if (!win.isDestroyed()) win.destroy(); ses.clearStorageData().catch(() => {}); };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { done(); reject(new Error('The website took too long to show its content.')); }, RENDER_TIMEOUT_MS);
    win.webContents.once('did-fail-load', (_e, code, description) => { clearTimeout(timer); done(); reject(new Error('Could not load that website (' + description + ').')); });
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const got = await win.webContents.executeJavaScript(
            '({ text: document.body ? document.body.innerText : "", links: [...document.querySelectorAll("a[href]")].map((a) => a.href) })', true);
          clearTimeout(timer); done();
          resolve({ text: String((got && got.text) || '').replace(/\s+\n/g, '\n').slice(0, MAX_TEXT_CHARS), links: Array.isArray(got && got.links) ? got.links.slice(0, 400).map(String) : [] });
        } catch (e) {
          clearTimeout(timer); done(); reject(new Error('Could not read that website.'));
        }
      }, SETTLE_MS);
    });
    win.loadURL(url).catch(() => {});
  });
}

module.exports = { renderPage, isLocalHost };
