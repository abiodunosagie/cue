// For company websites built as single-page apps (the HTML is an empty shell
// and the words arrive with JavaScript): open the page in a hidden, locked-down
// window, let it render, and read the text a visitor sees plus its links.
// Main process only. The window has no preload, no Node, a sandbox and its own
// throwaway session; it cannot download, ask for any permission or send WebRTC
// traffic of its own; and every request it makes goes through cue's loopback
// proxy (src/render-proxy.js), which resolves each name once and connects only
// to a public address, so the page cannot reach this machine or the local network.

const { BrowserWindow, session } = require('electron');
const { isPrivateAddress } = require('./company-research');
const { proxyPort } = require('./render-proxy');

const RENDER_TIMEOUT_MS = 20000;
const SETTLE_MS = 2500; // after load, for content the app fetches and draws
const MAX_TEXT_CHARS = 6000;

let partitionCount = 0;
// The windows drawing a company page, so main's navigation guard lets them follow the site.
const renderContents = new WeakSet();
const isRenderContents = (contents) => renderContents.has(contents);

// A request host that is this machine or a private network, by name or literal address.
function isLocalHost(hostname) {
  const h = String(hostname || '').toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.') && !h.includes(':')) return true;
  if (/^[\d.]+$/.test(h) || h.includes(':')) return isPrivateAddress(h);
  return false;
}

// { text, links } of the rendered page; rejects on timeout or a failed load.
async function renderPage(url) {
  const port = await proxyPort();
  const ses = session.fromPartition('cue-render-' + (++partitionCount), { cache: false });
  // Everything through the proxy, loopback included (<-loopback> removes Chromium's implicit bypass).
  await ses.setProxy({ proxyRules: `http=127.0.0.1:${port};https=127.0.0.1:${port}`, proxyBypassRules: '<-loopback>' });
  // Early and cheap: other schemes, and names or literal addresses that are plainly local.
  ses.webRequest.onBeforeRequest((details, callback) => {
    let host = '';
    try { host = new URL(details.url).hostname; } catch { return callback({ cancel: true }); }
    const scheme = details.url.split(':')[0];
    if (!['https', 'http', 'data', 'blob'].includes(scheme)) return callback({ cancel: true });
    callback({ cancel: (scheme === 'https' || scheme === 'http') && isLocalHost(host) });
  });
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);
  ses.on('will-download', (event) => event.preventDefault());
  const win = new BrowserWindow({
    show: false, width: 1280, height: 900,
    webPreferences: { session: ses, sandbox: true, contextIsolation: true, nodeIntegration: false, javascript: true, images: false, webSecurity: true }
  });
  renderContents.add(win.webContents);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.setAudioMuted(true);
  win.webContents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp');
  const done = () => { if (!win.isDestroyed()) win.destroy(); ses.clearStorageData().catch(() => {}); };
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { done(); reject(new Error('The website took too long to show its content.')); }, RENDER_TIMEOUT_MS);
    // Only the page itself failing counts: an ad, a tracker or a frame that
    // fails (or a load the page cancels itself, code -3) leaves the page readable.
    const onFail = (_e, code, description, _url, isMainFrame) => {
      if (!isMainFrame || code === -3) return;
      win.webContents.removeListener('did-fail-load', onFail);
      clearTimeout(timer); done(); reject(new Error('Could not load that website (' + description + ').'));
    };
    win.webContents.on('did-fail-load', onFail);
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          const got = await win.webContents.executeJavaScript(
            '({ text: document.body ? document.body.innerText.slice(0, ' + MAX_TEXT_CHARS * 2 + ') : "", links: [...document.querySelectorAll("a[href]")].slice(0, 400).map((a) => String(a.href).slice(0, 500)) })', true);
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

module.exports = { renderPage, isLocalHost, isRenderContents };
