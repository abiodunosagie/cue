const { app, BrowserWindow, ipcMain, globalShortcut, screen, session, desktopCapturer, shell, dialog, systemPreferences, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const store = require('./src/store');
const readingTracker = require('./renderer/reading-tracker');
const { isExplainRequest } = require('./renderer/spoken-question');
const { captureScreenshot, captureMaskedScreen } = require('./src/screen');
const { nudge } = require('./src/window-move');
const { createScreenWatcher, DETECT_SYSTEM } = require('./src/screen-watch');
const { synthesize } = require('./src/practice');
const { createPracticeSession } = require('./src/practice-session');
const { registerSetupIpc } = require('./src/ipc/setup');
const { registerProfileIpc } = require('./src/ipc/profiles');
const { createSTT } = require('./src/stt');
const { buildVocabPrompt } = require('./src/vocab');
const { parseDocumentFile } = require('./src/resume');
const { createLLM } = require('./src/llm');
const { MODES, turnsSentByBuild } = require('./src/prompts');
const { OPENER_MODES, openerQuestion, continuationNote, runOpener } = require('./src/opener');
const { LENGTH_MODES, nextLength, lengthRule, normalizeLength } = require('./renderer/answer-length');
const { createPreparedStore, profileHash, canPrepare, parseItems, findMatch, confirmSameQuestion, PREPARE_INSTRUCTIONS, PREPARE_MAX_TOKENS } = require('./src/prepared-answers');
const { followUpPrompt, createFollowUpBank, FOLLOW_UP_TIMEOUT_MS, FOLLOW_UP_MAX_TOKENS } = require('./src/follow-ups');
const { quickAsk } = require('./src/quick-ask');
const { rms16 } = require('./src/wav');
const { createStreamingSTT } = require('./src/stt-streaming');
const { AdaptiveVAD, AudioRingBuffer } = require('./src/vad');
const { buildInterviewContext, detectCategory } = require('./src/interview-context');
const { startAppLink, stopAppLink, recordEvent, appLinkConsentState, revokeAppLinkCaller } = require('./src/applink');
const publik = require('./src/publik');
// The app token release.yml baked into src/publik-build.json (empty in a dev
// checkout → the publik option is simply absent from the provider picker).
const publikBuild = publik.loadBuildConfig();

// macOS system-audio loopback (the "them" channel via getDisplayMedia) does not
// start on Electron 31–38 unless these Chromium features are enabled; without
// them getDisplayMedia rejects with "Error starting capture" and meeting audio
// silently never works. Electron 39+ wires this up itself, where this is a
// harmless no-op. Must run before app is ready.
if (process.platform === 'darwin') {
  app.commandLine.appendSwitch('enable-features', 'MacLoopbackAudioForScreenShare,MacSckSystemAudioLoopbackOverride');
}
const { WhisperModelManager } = require('./src/whisper-model-manager');
const { requireWhisperModel } = require('./src/whisper-model-catalog');
const { locateWhisperRuntime } = require('./src/whisper-runtime');
const { LocalWhisperTranscriber } = require('./src/local-whisper-transcriber');
const { createInterviewMemory, MAX_TURNS: MEMORY_MAX_TURNS } = require('./src/interview-memory');

let win = null;
// Which global shortcuts cue actually holds. `globalShortcut.register` returns
// false when another application already owns the combination, and nothing used
// to look at that — so the only symptom was a key that did nothing. Iris reads
// this and can say which key is taken instead of guessing from a screenshot.
const shortcutState = { assist: false, say: false, leetcode: false, quit: false, length: false, buyTime: false, explainCode: false, checkProgress: false, moveWindow: false, scrollAnswer: false, copyCode: false, hide: false, hideAlt: false };
const isMac = process.platform === 'darwin';
const isWindows = process.platform === 'win32';

// -------- Windows version helpers --------
// WDA_EXCLUDEFROMCAPTURE (setContentProtection) requires Windows 10 build 19041+.
// os.release() returns the NT kernel version e.g. "10.0.19041" or "10.0.22000" (Win11).
function getWindowsBuild() {
  if (!isWindows) return 0;
  const parts = os.release().split('.').map(Number);
  return parts[2] || 0; // third segment is the build number
}
const WIN_BUILD = getWindowsBuild();
const WIN_SUPPORTS_CONTENT_PROTECTION = !isWindows || WIN_BUILD >= 19041;

// WDA_EXCLUDEFROMCAPTURE (win.setContentProtection(true)) is documented to
// exclude a window's content from third-party capture surfaces (BitBlt,
// PrintWindow, DXGI Desktop Duplication, screen recording / screen share)
// WITHOUT touching the live composited image on an ordinary, physically
// scanned-out desktop session — the user still sees the window fine. But on
// a Windows session whose own visible surface is ITSELF a remoted or
// composited pipeline — a Remote Desktop (RDP) connection, a Windows 365 /
// Cloud PC session, most VM consoles, a CI runner's virtual desktop — the
// same flag has been observed to make the window render nothing at all, to
// the user as much as to any capture tool (see
// cue-windows-overlay-not-visible-for-mic-grant: PrintWindow(PW_RENDERFULLCONTENT)
// sampled zero color variance, and a full-desktop screenshot showed the
// always-on-top window occluding nothing, only ever reproduced with
// protection on and never with it off). Windows sets the SESSIONNAME
// environment variable to exactly "Console" for a locally-attached
// interactive session; every remoted session gets a different value
// (e.g. "RDP-Tcp#3"), and a non-interactive/service context has none at
// all. Anything other than a confirmed local console session is treated as
// unsafe to protect: a window the user can see (even if a screen-share
// viewer also could) is strictly better than a window that is invisible to
// everyone, including the user trying to grant it microphone access.
const WIN_IS_LOCAL_CONSOLE_SESSION = !isWindows || process.env.SESSIONNAME === 'Console';

let permWin = null;
// Windows never blocks startup on an unresolved permission (see app.whenReady()
// below), so launchApp() can already have run once by the time the user grants
// access and clicks Continue in the gate window (permissions:continue also
// calls launchApp()). Without this guard the second call re-creates the main
// BrowserWindow (createWindow() has no existing-window check), re-registers
// global shortcuts and re-starts the applink server -- a real, reachable
// regression, not a hypothetical.
let appLaunched = false;

// -------- capture / transcript state --------
const state = { capturing: false, busy: false, transcribing: { you: false, them: false } };
let sttDisabled = false; // set when the key can't reach any speech model (stops retry spam)
const buffers = { you: [], them: [] };
// The whole current interview on disk (cue-interview.json next to cue-data.json),
// so a restart mid-interview keeps the conversation. Cleared by Clear History.
const interviewMemory = createInterviewMemory({ file: path.join(app.getPath('userData'), 'cue-interview.json') });
interviewMemory.load();
// Answers to the likely questions, made before the interview (cue-prepared.json).
const preparedStore = createPreparedStore({ file: path.join(app.getPath('userData'), 'cue-prepared.json') });
preparedStore.load();
const preparing = { running: false, error: '' };
// Answers to the likely follow-ups of this interview's last few answers (src/follow-ups.js).
const followUps = createFollowUpBank();
const PREPARE_TIMEOUT_MS = 180000;
const PREPARE_DEBOUNCE_MS = 3000;
let prepareTimer = null;
const MAX_TRANSCRIPT_TURNS = MEMORY_MAX_TURNS; // ~90 minutes of conversation
const transcript = interviewMemory.turns().slice(-MAX_TRANSCRIPT_TURNS); // { channel, text, ts }
const FLUSH_MS = 900;
const STREAM_INACTIVITY_MS = 25000; // abort a stalled LLM stream so state.busy can't wedge forever
// The strongest model reading a screenshot can take ~10s to its first token.
const CODING_STREAM_INACTIVITY_MS = 45000;
// The coding model reads a screenshot and a long format before its first word,
// so the first word gets longer than the gap between words. Most careful (high
// effort, no fast mode) thinks the longest; the fast settings, or their plain
// fallback (measured 35s), fit in a minute.
const CODING_FIRST_TOKEN_MS = { careful: 120000, other: 60000 };
const MIN_BYTES = Math.floor(16000 * 2 * 0.12); // ~0.12s
const RMS_GATE = 180;
let flushTimer = null;
let whisperModelManager = null;
let localWhisperTranscriber = null;
let activeWhisperModelId = null;
let desiredCaptureState = false;
let captureTransition = Promise.resolve(false);

// -------- streaming STT state --------
let streamingSTT = { you: null, them: null }; // streaming STT instances per channel
let streamingMode = false; // true when using WebSocket streaming STT
const vad = {
  you: new AdaptiveVAD({
    onsetThreshold: 220,
    offsetThreshold: 130,
    silenceFrames: 18,       // ~540ms silence before end
    onSpeechStart: () => send('vad:state', { channel: 'you', speaking: true }),
    onSpeechEnd: (dur) => send('vad:state', { channel: 'you', speaking: false, durationMs: dur })
  }),
  them: new AdaptiveVAD({
    onsetThreshold: 200,
    offsetThreshold: 120,
    silenceFrames: 20,       // ~600ms for remote audio (more forgiving)
    onSpeechStart: () => send('vad:state', { channel: 'them', speaking: true }),
    onSpeechEnd: (dur) => send('vad:state', { channel: 'them', speaking: false, durationMs: dur })
  })
};
// Pre-speech ring buffers (300ms) so we never clip the start of a word
const ringBuffers = {
  you: new AudioRingBuffer(300, 16000),
  them: new AudioRingBuffer(300, 16000)
};

// Without headphones the mic transcribes the interviewer too. Keeping that as a
// "You:" turn would tell the model the candidate said the interviewer's words.
const ECHO_WINDOW_MS = 15000;
function isMicEcho(turn) {
  if (turn.channel !== 'you') return false;
  for (let i = transcript.length - 1; i >= 0; i--) {
    const prev = transcript[i];
    if (turn.ts - prev.ts > ECHO_WINDOW_MS) return false;
    if (prev.channel === 'them') return readingTracker.isEcho(turn.text, prev.text);
  }
  return false;
}

function pushTranscript(turn) {
  if (isMicEcho(turn)) return;
  transcript.push(turn);
  if (transcript.length > MAX_TRANSCRIPT_TURNS) transcript.splice(0, transcript.length - MAX_TRANSCRIPT_TURNS);
  interviewMemory.addTurn(turn);
}

// -------- practice interview --------
// src/practice-session.js runs the flow; this wires it to the app. Practice runs
// on an empty interview memory and clears it when it ends, so a real interview
// never sees practice questions. A marker file notes a practice in progress, so
// a crash mid-practice is cleaned up at the next launch.
const PRACTICE_MARKER = path.join(app.getPath('userData'), 'cue-practice-active');
const practice = createPracticeSession({
  send: (channel, data) => send(channel, data),
  publishQuestion: (text) => publishTranscript('them', text, { fromPractice: true }),
  getSettings: () => store.getSettings(),
  synthesize,
  transcript: () => transcript,
  isCapturing: () => state.capturing,
  isBusy: () => state.busy,
  memoryIsEmpty: () => interviewMemory.summary().turnCount === 0,
  clearInterview: () => clearInterview(),
  preparedQuestions: () => preparedStore.items(profileHash(store.getSettings())),
  markActive: (on) => {
    try { if (on) fs.writeFileSync(PRACTICE_MARKER, '', { mode: 0o600 }); else fs.unlinkSync(PRACTICE_MARKER); } catch { /* best effort */ }
  }
});
if (fs.existsSync(PRACTICE_MARKER)) {
  // The last practice never finished: its turns are in memory, not a real interview's.
  clearInterview();
  try { fs.unlinkSync(PRACTICE_MARKER); } catch { /* best effort */ }
}

// Forget the current interview: the live transcript, its follow-ups and the file on disk.
function clearInterview() {
  transcript.splice(0, transcript.length);
  followUps.clear();
  return interviewMemory.clear();
}

function send(channel, data) { if (win && !win.isDestroyed()) win.webContents.send(channel, data); }

function getWhisperRuntime() {
  return locateWhisperRuntime({
    isPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    appPath: app.getAppPath(),
    platform: process.platform,
    architecture: process.arch,
    environment: process.env
  });
}

// fromPractice: the practice question itself, which the practice echo gate must let through.
function publishTranscript(channel, text, { fromPractice = false } = {}) {
  if (!text || !text.trim()) return;
  const turn = { channel, text: text.trim(), ts: Date.now() };
  if (!fromPractice && practice.hidesTurn(turn)) return;
  pushTranscript(turn);
  send('transcript', turn);
  send('stt:final', { channel, text: turn.text });
}

async function startLocalWhisper(settings) {
  if (!whisperModelManager) throw new Error('The local Whisper model manager is not ready.');
  const localSettings = settings.localWhisper || {};
  const model = requireWhisperModel(localSettings.modelId || 'base.en');
  const runtime = getWhisperRuntime();
  if (!runtime.available) throw new Error(runtime.message);
  activeWhisperModelId = model.id;
  let transcriber = null;
  try {
    const modelPath = await whisperModelManager.verifyInstalledModel(model.id).catch((error) => {
      if (error.code === 'ENOENT') {
        throw new Error(`Download the ${model.id} model in Settings → Audio before listening.`);
      }
      throw error;
    });

    transcriber = new LocalWhisperTranscriber({
      sessionOptions: {
        executablePath: runtime.executablePath,
        runtimeDirectory: runtime.runtimeDirectory,
        modelPath,
        language: model.englishOnly ? 'en' : (localSettings.language || 'auto'),
        threads: Number(localSettings.threads) || 0,
        tinydiarize: model.tinydiarize,
        prompt: buildVocabPrompt(settings)
      },
      onTranscript: publishTranscript,
      onSpeechState: (channel, speaking, durationMs) => {
        send('vad:state', { channel, speaking, durationMs });
      },
      onStatus: (status) => send('stt:status', { provider: 'local', ...status }),
      onError: (error) => {
        sttDisabled = true;
        console.log('[local-whisper] error', error && error.message);
        send('stt:status', { provider: 'local', status: 'error' });
        send('status', { message: `Local transcription error: ${error.message}. Audio was not sent to a cloud fallback.` });
      }
    });

    localWhisperTranscriber = transcriber;
    await transcriber.start();
  } catch (error) {
    if (localWhisperTranscriber === transcriber) localWhisperTranscriber = null;
    activeWhisperModelId = null;
    if (transcriber) await transcriber.forceStop().catch(() => {});
    throw error;
  }
}

async function getWhisperOverview() {
  if (!whisperModelManager) throw new Error('The local Whisper model manager is not ready.');
  const runtime = getWhisperRuntime();
  const models = await whisperModelManager.listModels();
  return {
    runtime: {
      available: runtime.available,
      version: runtime.version,
      target: runtime.target,
      message: runtime.message || null
    },
    models
  };
}

// -------- window --------
function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const W = 700, H = 600;

  const savedSettings = store.getSettings();
  let startX = Math.round(workArea.x + (workArea.width - W) / 2);
  let startY = workArea.y + 6;

  if (savedSettings.windowX !== null && savedSettings.windowY !== null) {
    const clampedX = Math.max(workArea.x - W + 100, Math.min(savedSettings.windowX, workArea.x + workArea.width - 100));
    const clampedY = Math.max(workArea.y, Math.min(savedSettings.windowY, workArea.y + workArea.height - 40));
    startX = clampedX;
    startY = clampedY;
  }

  const winOptions = {
    width: W,
    height: H,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    fullscreenable: false,
    // cue is never the focused app during a call. Without this, macOS spends the
    // first click on an inactive window just activating it, so X, Stop or Assist
    // looked dead until clicked twice.
    acceptFirstMouse: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  };

  // Fix 1: On Windows, set type:'toolbar' which sets WS_EX_TOOLWINDOW.
  // This removes the window from Alt+Tab AND the taskbar entirely.
  // On macOS, this is not needed (dock hiding + Mission Control handle it).
  if (isWindows) {
    winOptions.type = 'toolbar';
  }

  win = new BrowserWindow(winOptions);

  // Fix 2: Only call setContentProtection if the OS supports it, and only on
  // a session where it will not blank the window out for the user themself
  // (see WIN_IS_LOCAL_CONSOLE_SESSION above — RDP/VM/Cloud-PC-style sessions
  // render a WDA_EXCLUDEFROMCAPTURE window fully invisible, not just hidden
  // from capture). On older builds, or a non-local-console Windows session,
  // we skip it silently and send a warning to the renderer instead.
  const shouldProtect = !process.env.CUE_NO_PROTECT && WIN_IS_LOCAL_CONSOLE_SESSION;
  if (shouldProtect) {
    if (WIN_SUPPORTS_CONTENT_PROTECTION) {
      win.setContentProtection(true);
    } else {
      // Will notify the renderer after it loads
      console.log(`[cue] Windows build ${WIN_BUILD} < 19041 — setContentProtection not supported. Window may appear in screen shares.`);
    }
  } else if (isWindows && !WIN_IS_LOCAL_CONSOLE_SESSION && !process.env.CUE_NO_PROTECT) {
    console.log(`[cue] Windows session is not a local console session (SESSIONNAME=${process.env.SESSIONNAME}) — skipping setContentProtection so the window stays visible to you. Window may appear in screen shares.`);
  }

  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (isMac && typeof win.setHiddenInMissionControl === 'function') win.setHiddenInMissionControl(true);

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  let moveSaveTimer = null;
  win.on('moved', () => {
    clearTimeout(moveSaveTimer);
    moveSaveTimer = setTimeout(() => {
      if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        store.setSettings({ windowX: x, windowY: y });
      }
    }, 500);
  });

  win.setTitle('Microsoft Edge Update'); // set before load

  win.webContents.on('did-finish-load', () => {
    win.showInactive();
    win.setTitle('Microsoft Edge Update');
    // Warn about missing content protection on old Windows builds
    if (isWindows && shouldProtect && !WIN_SUPPORTS_CONTENT_PROTECTION) {
      send('status', {
        message: `Heads up: your Windows version (build ${WIN_BUILD}) does not support screen-share hiding. Upgrade to Windows 10 build 19041+ or Windows 11 to enable invisibility in screen shares.`
      });
    }
    // Warn when protection was skipped because this is not a local console
    // session (RDP / Cloud PC / VM console) — see WIN_IS_LOCAL_CONSOLE_SESSION.
    if (isWindows && !process.env.CUE_NO_PROTECT && !WIN_IS_LOCAL_CONSOLE_SESSION) {
      send('status', {
        message: 'Heads up: screen-share hiding is off for this session (remote desktop / cloud PC / VM sessions can render the window invisible to you as well when it is on). The window will be visible in screen shares here.'
      });
    }
  });
  win.webContents.on('render-process-gone', (_e, d) => {
    console.log('[cue] renderer gone', JSON.stringify(d));
    recordEvent({ level: 'fatal', event: 'renderer_gone', code: d && d.reason, msg: 'renderer process ended: ' + JSON.stringify(d), frame: 'BrowserWindow' });
  });
}

// -------- STT flushing (batch mode fallback) --------
async function flushChannel(channel) {
  if (state.transcribing[channel]) return;
  const chunks = buffers[channel];
  if (!chunks.length) return;
  const pcm = Buffer.concat(chunks);
  buffers[channel] = [];
  if (pcm.length < MIN_BYTES) return;
  if (rms16(pcm) < RMS_GATE) return; // silence gate

  state.transcribing[channel] = true;
  try {
    const settings = store.getSettings();
    const stt = createSTT(settings);
    if (!stt.available) {
      if (!sttDisabled) { sttDisabled = true; send('status', { message: 'No transcription key set. Add an OpenAI (Whisper), Deepgram, or Gemini key in Settings to enable listening. Screen/LeetCode features work without it.' }); }
      return;
    }
    const res = await stt.transcribe(pcm);
    if (res.error) {
      handleSttError(res.error, settings);
      return;
    }
    if (res.text && res.text.trim() && res.text.trim().length > 1 && !/^[?!.,;:\-…]+$/.test(res.text.trim())) {
      const turn = { channel, text: res.text.trim(), ts: Date.now() };
      if (practice.hidesTurn(turn)) return;
      pushTranscript(turn);
      send('transcript', turn);
    }
  } catch (e) {
    console.log('[stt] error', e && e.message);
    recordEvent({ level: 'error', event: 'stt_failed', msg: e && e.message ? e.message : String(e), frame: 'flushChannel', context: { channel } });
  } finally {
    state.transcribing[channel] = false;
  }
}

function handleSttError(err, settings) {
  console.log('[stt] error', err.provider, err.status, err.code, err.message);
  // Recorded before the early return, because the second and hundredth
  // occurrence still tell you the state cue is stuck in.
  recordEvent({
    level: 'error',
    event: 'stt_rejected',
    code: err.code || (err.status ? 'http_' + err.status : null),
    msg: err.message,
    frame: 'handleSttError',
    context: { provider: err.provider, status: err.status || null, alreadyDisabled: sttDisabled },
  });
  if (sttDisabled) return;
  const isQuota = err.status === 429 || err.code === 'RESOURCE_EXHAUSTED' || (err.message && err.message.includes('Quota exceeded'));
  const noAccess = err.status === 403 || err.status === 401 || err.code === 'model_not_found' || isQuota;
  sttDisabled = true; // stop hammering the API every few seconds
  if (noAccess) {
    send('status', { message: `Transcription off: your ${err.provider} key was rejected or hit a quota limit. Update your key in Settings to resume.` });
  } else {
    send('status', { message: 'Transcription error (' + err.provider + '): ' + err.message });
  }
}

function startFlushLoop() {
  if (flushTimer) return;
  flushTimer = setInterval(() => { flushChannel('you'); flushChannel('them'); }, FLUSH_MS);
}
function stopFlushLoop() { if (flushTimer) { clearInterval(flushTimer); flushTimer = null; } }

// -------- streaming STT setup --------
function initStreamingSTT() {
  const settings = store.getSettings();
  streamingMode = false;

  ['you', 'them'].forEach((channel) => {
    const sttInstance = createStreamingSTT(settings, channel, {
      onTranscript: (ch, text) => {
        const turn = { channel: ch, text, ts: Date.now() };
        if (practice.hidesTurn(turn)) return;
        pushTranscript(turn);
        send('transcript', turn);
        send('stt:final', { channel: ch, text });
      },
      onInterim: (ch, text) => {
        send('stt:interim', { channel: ch, text });
      },
      onError: (err) => {
        console.log('[streaming-stt] error', err.provider, err.message);
        const batchFallbackAvailable = createSTT(settings).available;
        stopStreamingSTT(); // close WebSockets and clear keep-alive intervals
        if (batchFallbackAvailable) {
          send('status', { message: `Streaming transcription (${err.provider}) error: ${err.message}. Falling back to batch mode.` });
          startFlushLoop();
        } else if (!sttDisabled) {
          sttDisabled = true;
          send('status', { message: `Transcription stopped (${err.provider}): ${err.message}. The selected provider has no batch fallback.` });
        }
        streamingMode = false;
      },
      onStatusChange: (ch, status) => {
        send('stt:status', { channel: ch, status });
        if (status === 'connected') {
          console.log(`[streaming-stt] ${ch} channel connected`);
        }
      }
    });

    if (sttInstance.type === 'streaming' && sttInstance.instance) {
      streamingMode = true;
      streamingSTT[channel] = sttInstance.instance;
      sttInstance.instance.connect();
    }
  });

  return streamingMode;
}

function stopStreamingSTT() {
  ['you', 'them'].forEach((channel) => {
    if (streamingSTT[channel]) {
      streamingSTT[channel].disconnect();
      streamingSTT[channel] = null;
    }
  });
  streamingMode = false;
}

// -------- audio routing (streaming or batch) --------
function routeAudio(channel, pcmBuffer) {
  const buf = Buffer.from(pcmBuffer);

  if (localWhisperTranscriber) {
    localWhisperTranscriber.push(channel, buf);
    return;
  }

  // Always run through VAD for speech state detection
  vad[channel].processChunk(buf);

  // Keep pre-speech buffer
  ringBuffers[channel].write(buf);

  if (streamingMode && streamingSTT[channel]) {
    // Streaming mode: send raw PCM directly to the WebSocket
    streamingSTT[channel].sendAudio(pcmBuffer);
  } else {
    // Batch mode: accumulate in buffers for periodic flush
    buffers[channel].push(buf);
  }
}

// -------- capture toggle --------
// Mic + system audio are both captured in the RENDERER (getUserMedia for the mic,
// getDisplayMedia loopback for system audio) so they run inside cue's own process
// and use cue's own Screen-Recording grant — no separate helper binary to authorize.
async function setCapturing(active) {
  if (active === state.capturing) return state.capturing;
  // Practice cannot hear answers without listening: end it with its report.
  if (!active && practice.isActive()) practice.end();

  if (active) {
    sttDisabled = false; // reset on re-enable
    const settings = store.getSettings();
    if ((settings.sttProvider || 'auto') === 'local') {
      try {
        await startLocalWhisper(settings);
        state.capturing = true;
        console.log('[cue] capture started, mode: local');
        send('capture:state', { active: true, streaming: false, mode: 'local' });
        return true;
      } catch (error) {
        state.capturing = false;
        desiredCaptureState = false;
        if (error.code === 'STARTUP_CANCELLED') {
          send('stt:status', { provider: 'local', status: 'off' });
          send('capture:state', { active: false, streaming: false, mode: 'local' });
          return false;
        }
        send('stt:status', { provider: 'local', status: 'error' });
        send('status', { message: `Local transcription could not start: ${error.message} No audio was sent to a cloud provider.` });
        send('capture:state', { active: false, streaming: false, mode: 'local' });
        return false;
      }
    }

    state.capturing = true;
    // Try streaming first, fall back to batch
    const streaming = initStreamingSTT();
    if (!streaming) {
      startFlushLoop();
    }
    console.log('[cue] capture started, mode:', streaming ? 'streaming' : 'batch');
    send('capture:state', { active: true, streaming: streamingMode, mode: streaming ? 'streaming' : 'batch' });
    return true;
  }

  state.capturing = false;
  stopFlushLoop();
  stopStreamingSTT();
  buffers.you = []; buffers.them = [];
  vad.you.reset(); vad.them.reset();
  ringBuffers.you.clear(); ringBuffers.them.clear();
  const stoppingLocalTranscriber = localWhisperTranscriber;
  localWhisperTranscriber = null;
  send('capture:state', { active: false, streaming: false, mode: stoppingLocalTranscriber ? 'local' : 'off' });
  if (stoppingLocalTranscriber) {
    send('stt:status', { provider: 'local', status: 'stopping' });
    try {
      await stoppingLocalTranscriber.stop();
    } catch (error) {
      console.log('[local-whisper] stop error', error && error.message);
    } finally {
      activeWhisperModelId = null;
    }
  }
  return false;
}

// -------- feature runner --------
function preparedState() {
  const settings = store.getSettings();
  return {
    ...preparedStore.summary(profileHash(settings)),
    current: preparedStore.isCurrent(profileHash(settings)),
    canPrepare: canPrepare(settings),
    running: preparing.running,
    error: preparing.error
  };
}

// One Smart call writes the likely questions and their spoken answers, with the
// same context and rules as a live answer. Skipped when the bank already matches
// the profile, unless forced from Settings.
// Questions with spoken answers, written with the candidate's context in the
// system prompt exactly as for a live answer, so they follow the same voice,
// length and no-invented-stories rules. Used for the prepared bank and follow-ups.
async function askForItems({ llm, settings, turns, prompt, maxTokens, timeoutMs }) {
  const system = MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', turns), settings.aiRules || '');
  return parseItems(await quickAsk({ llm, system, text: prompt, maxTokens, timeoutMs }));
}

async function prepareAnswers({ force }) {
  const settings = store.getSettings();
  const hash = profileHash(settings);
  if (preparing.running || !canPrepare(settings)) return preparedState();
  if (!force && preparedStore.isCurrent(hash)) return preparedState();
  const llm = createLLM({ ...settings, smart: true });
  if (!llm.ready) return preparedState();
  preparing.running = true; preparing.error = '';
  send('prepared:state', preparedState());
  try {
    const items = await askForItems({ llm, settings, turns: [], prompt: PREPARE_INSTRUCTIONS, maxTokens: PREPARE_MAX_TOKENS, timeoutMs: PREPARE_TIMEOUT_MS });
    if (!items.length) throw new Error('the model did not return usable answers');
    // The profile may have changed while this ran; then this bank is already stale.
    if (profileHash(store.getSettings()) === hash) preparedStore.replace(hash, items);
    else schedulePrepare();
  } catch (e) {
    preparing.error = 'Could not prepare answers: ' + (e && e.message ? e.message : String(e));
    recordEvent({ level: 'error', event: 'prepare_failed', msg: e && e.message ? e.message : String(e), frame: 'prepareAnswers', context: { provider: settings.provider } });
  } finally {
    preparing.running = false;
    send('prepared:state', preparedState());
  }
  return preparedState();
}

// Profile edits come in bursts (typing, then Save); prepare once they settle.
function schedulePrepare() {
  clearTimeout(prepareTimer);
  prepareTimer = setTimeout(() => prepareAnswers({ force: false }), PREPARE_DEBOUNCE_MS);
}

// The prepared answer for a heard question, or null. Only for answerThis at the
// default length (prepared answers are written at that length) and only from a
// bank made from the current profile. A close but not near-identical question
// is confirmed by the Fast model first.
async function findPreparedAnswer(mode, userText, settings) {
  if (mode !== 'answerThis' || normalizeLength(settings.answerLength) !== 'medium') return null;
  // The job's prepared bank and this interview's follow-ups: the closer match wins.
  const fromBank = preparedStore.match(userText || '', profileHash(settings));
  const fromFollowUps = findMatch(followUps.items(), userText || '');
  const match = !fromBank ? fromFollowUps : !fromFollowUps ? fromBank : (fromFollowUps.score > fromBank.score ? fromFollowUps : fromBank);
  if (!match) return null;
  if (match.direct) return match.item;
  const fast = createLLM({ ...settings, smart: false });
  if (!fast.ready) return null;
  return (await confirmSameQuestion({ llm: fast, heard: userText, prepared: match.item.question })) ? match.item : null;
}

// In the background after a spoken answer: the two likely follow-ups and their
// answers, with the same context and rules as a live answer. Dropped if the
// interview was cleared meanwhile; a failure only means no follow-ups this time.
async function prepareFollowUps(question, answer, generation) {
  if (!question || !answer) return;
  const settings = store.getSettings();
  const llm = createLLM({ ...settings, smart: true });
  if (!llm.ready) return;
  try {
    const items = await askForItems({ llm, settings, turns: transcript, prompt: followUpPrompt(question, answer), maxTokens: FOLLOW_UP_MAX_TOKENS, timeoutMs: FOLLOW_UP_TIMEOUT_MS });
    if (items.length && generation === interviewMemory.generation()) followUps.add(items);
  } catch (e) {
    recordEvent({ level: 'warn', event: 'follow_ups_failed', msg: e && e.message ? e.message : String(e), frame: 'prepareFollowUps', context: {} });
  }
}

// The earlier coding solves a mode builds on: the last two for a new solve,
// and for explainCode and checkProgress the one being explained or checked
// (the newest, even after the round).
function priorSolvesFor(def, mode) {
  if (def.tier === 'coding') return interviewMemory.codingHistory();
  // The whole solve: a progress check needs the plan's later steps, not its first few thousand characters.
  if (mode === 'explainCode' || mode === 'checkProgress') return [interviewMemory.recentCodingSolve() || interviewMemory.codingHistory({ count: 1, maxChars: Infinity })[0] || ''];
  return [];
}

// options.imageDataUrl: a screenshot already taken (the screen watcher's, with
// cue's own panel blacked out), used instead of a fresh capture.
async function runFeature(mode, userText, options = {}) {
  if (state.busy) return;
  // A question about the code just written ("walk me through your code", "why
  // a map here?") is answered from that code, not from the resume.
  if ((mode === 'answerThis' || mode === 'assist') && interviewMemory.recentCodingSolve()) {
    // The text that was sent; the interviewer's newest turn only when none was (a bare Assist key press).
    const heard = userText || openerQuestion(mode, '', transcript);
    if (isExplainRequest(heard)) { mode = 'explainCode'; userText = heard; }
  }
  const def = MODES[mode];
  if (!def) return;
  state.busy = true;
  // An answer that started before Clear must not write the old interview back.
  const memoryGeneration = interviewMemory.generation();
  // Timing, for the log: how long until the first word shows, and from where.
  const startedAt = Date.now();
  let firstShown = false;
  let modelInUse = '';
  const firstWord = (source) => {
    if (firstShown) return;
    firstShown = true;
    console.log(`[timing] ${mode}: first word after ${Date.now() - startedAt}ms (${source})`);
  };
  let opener = ''; // already shown and possibly said aloud, so kept even if the answer fails
  let streamSettled = false; // drop stray tokens from a stream we've already abandoned
  try {
    const settings = store.getSettings();
    // Coding solves use the Coding model whatever the Smart toggle says: a
    // fast model gets code wrong, and a wrong solve fails the interview.
    const llm = createLLM(settings, { tier: def.tier });
    modelInUse = llm.provider + '/' + llm.model;
    const userBubble = def.userBubble !== null
      ? def.userBubble
      : (mode === 'ask' ? userText : mode === 'answerThis' ? `"${(userText || '').slice(0, 60)}${userText && userText.length > 60 ? '…' : ''}"` : null);
    const category = mode !== 'leetcode' ? detectCategory(transcript) : null;
    send('llm:start', { userBubble, small: !!def.small, category, coding: def.tier === 'coding' || !!def.codingFollowUp, slowStart: def.tier === 'coding' });

    if (!llm.ready) {
      const message = llm.configurationError || ('Complete the ' + settings.provider + ' provider settings. Model: ' + (llm.model || 'unset') + '.');
      if (settings.provider === publik.PUBLIK_PROVIDER) {
        // No key yet: either the disclosure was never accepted (open it — the
        // mint happens only on "Continue"), or the install was revoked or the
        // last mint failed (offer Reconnect). The app never silently spends.
        const action = !settings.publik.disclosureAccepted
          ? { kind: 'disclosure' }
          : { kind: 'reconnect', label: 'Reconnect' };
        send('llm:error', { message, action });
        return;
      }
      send('llm:error', { message });
      return;
    }
    // Never a silent starter (CONTRACT §12.4): the first-run card — balance,
    // justification, "Link this computer & pick a plan" / "Later" — is shown
    // at least once before any starter usage is spent. Normally it appears
    // right after provisioning; this gate catches a card that was never
    // acknowledged (e.g. an install provisioned by an earlier release).
    if (settings.provider === publik.PUBLIK_PROVIDER && settings.apiKeys.publik && !settings.publik.cardShown) {
      send('llm:error', { message: 'publik API is set up. Take a look at the card, then ask again.', action: { kind: 'card' } });
      return;
    }

    // A prepared answer is shown at once, with no model wait and no opener.
    const prepared = await findPreparedAnswer(mode, userText, settings);
    if (prepared) {
      firstWord('prepared answer');
      send('llm:tag', { label: 'Prepared' });
      for (const chunk of prepared.answer.match(/\S+\s*/g) || []) send('llm:token', { text: chunk });
      send('llm:done', {});
      interviewMemory.addAnswer({ mode, text: prepared.answer, generation: memoryGeneration });
      prepareFollowUps(userText, prepared.answer, memoryGeneration);
      return;
    }

    // Instant first line: with Smart on, the Fast model starts a one-sentence
    // opener now (in parallel with any screenshot), and the Smart answer then
    // continues from it. Skipped when there is no separate, ready Fast model.
    let openerPromise = null;
    const question = settings.smart && OPENER_MODES.has(mode) ? openerQuestion(mode, userText, transcript) : '';
    if (question) {
      const fast = createLLM({ ...settings, smart: false });
      if (fast.ready && fast.model !== llm.model) {
        openerPromise = runOpener({ llm: fast, question, onToken: (t) => { firstWord('instant first line'); send('llm:token', { text: t }); } });
      }
    }

    let imageDataUrl = options.imageDataUrl || null;
    if (def.needsScreen && !imageDataUrl) {
      try {
        imageDataUrl = await captureScreenshot();
        if (!imageDataUrl) throw new Error('No screen source was available.');
      }
      catch (e) {
        recordEvent({ level: 'error', event: 'screen_capture_failed', msg: e && e.message ? e.message : String(e), frame: 'captureScreenshot', context: { mode } });
        const message = process.platform === 'darwin'
          ? 'Screen capture needs permission — grant Screen Recording to cue in System Settings.'
          : process.platform === 'win32'
            ? 'Screen capture failed. Make sure cue is not blocked by Windows privacy or security software, then try again.'
            : 'Screen capture failed. Check your desktop capture permissions, then try again.';
        send('status', { message });
      }
    }

    const settingsForPrompt = store.getSettings();
    // Modes that read the whole interview themselves skip the digest; coding memory
    // goes in build() so the coding system prompt stays free of personal context.
    // The digest skips the turns build() already sends, so nothing goes twice.
    // It is heard speech, so it rides in the user turn, fenced as data, never in
    // the system prompt where an interviewer's words could read as instructions.
    const memoryBlock = def.tier === 'coding' || def.skipMemory
      ? ''
      : interviewMemory.digest({ skipRecent: turnsSentByBuild(mode, { transcript, userText: userText || '' }) });
    const contextBlock = buildInterviewContext(settingsForPrompt, mode, transcript);
    const system = def.buildSystem ? def.buildSystem(contextBlock, settingsForPrompt.aiRules || '') : (def.system || '');
    opener = openerPromise ? await openerPromise : '';
    const built = (memoryBlock ? '<interview_memory>\n' + memoryBlock + '\n</interview_memory>\n\n' : '') + def.build({
      transcript,
      userText: userText || '',
      answers: mode === 'report' ? interviewMemory.answers() : [],
      architecture: settingsForPrompt.codeArchitecture,
      priorSolves: priorSolvesFor(def, mode)
    }) + (LENGTH_MODES.has(mode) ? lengthRule(settingsForPrompt.answerLength) : '') + continuationNote(opener);
    // The continuation starts after a space so the two read as one paragraph.
    if (opener) send('llm:token', { text: ' ' });

    // Watchdog: a provider that stalls mid-stream would otherwise hang the await forever,
    // leaving state.busy = true and wedging every later question until an app restart.
    let watchdog = null;
    let rearm = () => {};
    let streamedAny = false;
    const stalled = new Promise((_res, reject) => {
      rearm = () => {
        clearTimeout(watchdog);
        const limit = def.tier !== 'coding' ? STREAM_INACTIVITY_MS
          : streamedAny ? CODING_STREAM_INACTIVITY_MS
          : settingsForPrompt.codingSpeed === 'careful' ? CODING_FIRST_TOKEN_MS.careful : CODING_FIRST_TOKEN_MS.other;
        watchdog = setTimeout(() => reject(new Error('the model stopped responding (timed out). Please try again.')), limit);
      };
      rearm();
    });
    let answer = '';
    try {
      answer = await Promise.race([
        llm.stream({
          system,
          turns: [{ role: 'user', text: built }],
          imageDataUrl,
          onToken: (t) => { if (streamSettled) return; firstWord(llm.model); streamedAny = true; rearm(); send('llm:token', { text: t }); },
          onResponse: settings.provider === publik.PUBLIK_PROVIDER ? (res) => publikNoteHeaders(res && res.headers) : undefined
        }),
        stalled
      ]);
    } finally {
      streamSettled = true;
      clearTimeout(watchdog);
    }
    send('llm:done', {});
    if (!def.notAnswer) interviewMemory.addAnswer({ mode, text: opener ? opener + ' ' + answer : answer, generation: memoryGeneration });
    // The question a spoken answer replied to: the heard one, else the interviewer's newest turn.
    if (LENGTH_MODES.has(mode)) prepareFollowUps(openerQuestion(mode, userText, transcript), (opener ? opener + ' ' : '') + answer, memoryGeneration);
    // Streams settle after their headers, so the charge is reconciled from
    // GET /wallet shortly after the answer — one request per answer, debounced.
    if (settings.provider === publik.PUBLIK_PROVIDER) publikScheduleWalletRefresh();
  } catch (e) {
    if (opener) interviewMemory.addAnswer({ mode, text: opener, generation: memoryGeneration });
    // Timing, for the log: which model failed and after how long (never keys or text).
    console.log(`[timing] ${mode}: failed after ${Date.now() - startedAt}ms (${modelInUse || 'no model'}${firstShown ? ', after the first word' : ', before any word'}): ${e && e.message ? e.message : String(e)}`);
    recordEvent({ level: 'error', event: 'llm_failed', msg: e && e.message ? e.message : String(e), frame: 'runFeature', context: { mode, provider: store.getSettings().provider } });
    const action = e && e.action ? e.action : null;
    send('llm:error', { message: e && e.message ? e.message : String(e), action });
    if (action) publikHandleErrorAction(action);
  } finally {
    streamSettled = true;
    state.busy = false;
  }
}

// -------- IPC --------
// Redact on the way out, strip on the way in: the publik key never enters the
// renderer, and the renderer's whole-object Save can never clobber it.
ipcMain.handle('settings:get', () => store.redactForRenderer(store.getSettings()));
ipcMain.handle('settings:set', (_e, patch) => {
  sttDisabled = false;
  const saved = store.setSettings(store.stripRendererPatch(patch));
  if (!preparedStore.isCurrent(profileHash(saved))) schedulePrepare();
  return store.redactForRenderer(saved);
});
ipcMain.handle('prepared:state', () => preparedState());
registerSetupIpc({
  ipcMain,
  send,
  deps: () => {
    const settings = () => store.getSettings();
    return {
      llmFor: (tier) => (tier === 'coding' ? createLLM(settings(), { tier: 'coding' }) : createLLM({ ...settings(), smart: tier === 'smart' })),
      quickAsk,
      runOpener,
      preparedState,
      mediaStatus: (type) => (isMac ? systemPreferences.getMediaAccessStatus(type) : 'granted'),
      captureScreen: () => captureMaskedScreen(cueWindowBounds()),
      detectSystem: DETECT_SYSTEM,
      elevenLabsKey: () => (settings().apiKeys || {}).elevenlabs || '',
      practiceVoice: () => settings().practiceVoice,
      codingShortcut: isMac ? '⌘H' : 'Ctrl+H',
      synthesize
    };
  }
});
// A new profile's prepared answers are reused if cached, else built shortly.
registerProfileIpc({
  ipcMain,
  store,
  createLLM,
  quickAsk,
  onProfileChanged: (saved) => {
    if (!preparedStore.isCurrent(profileHash(saved))) schedulePrepare();
    send('prepared:state', preparedState());
  }
});
ipcMain.handle('practice:start', () => practice.start());
ipcMain.handle('practice:next', () => practice.next());
ipcMain.handle('practice:end', () => practice.end());
ipcMain.on('practice:played', (_e, token) => practice.played(token));
ipcMain.handle('prepared:run', () => prepareAnswers({ force: true }));

// -------- publik API --------
// Contract: ~/publik-api-research/CONTRACT.md. The key is minted only after
// the disclosure is accepted (publik:accept-disclosure); the balance line is
// fed by the x-publik-* headers on every answer and reconciled from GET /wallet.
let publikWalletTimer = null;
let publikProvisioning = null;

function publikDevice() {
  let deviceName = '';
  try { deviceName = os.hostname(); } catch { /* optional */ }
  return { appVersion: app.getVersion(), platform: process.platform, osVersion: os.release(), arch: process.arch, deviceName };
}

function publikState() {
  const s = store.getSettings();
  const p = s.publik || {};
  const connected = !!s.apiKeys.publik;
  const wallet = p.wallet || null;
  const claimState = (wallet && wallet.claimState) || p.claimState || 'anonymous';
  const view = {
    available: publikBuild.available,
    selected: s.provider === publik.PUBLIK_PROVIDER,
    connected,
    revoked: !!p.revoked,
    disconnected: !!p.disconnected,
    keyId: p.keyId || '',
    claimState,
    claimUrl: p.claimUrl || (wallet && wallet.claimUrl) || '',
    addCreditUrl: (wallet && wallet.addCreditUrl) || '',
    topUpUrl: (wallet && wallet.topUpUrl) || p.claimUrl || '',
    starterMicros: p.starterMicros || 0,
    balanceMicros: p.balanceMicros,
    balanceAt: p.balanceAt || 0,
    balanceLabel: publik.formatMicros(p.balanceMicros),
    wallet,
    disclosureAccepted: p.disclosureAccepted || 0,
    disclosureVersion: publikBuild.disclosureVersion,
    lastError: p.lastError || '',
    cardShown: !!p.cardShown,
    copy: publik.COPY,
    links: publik.LINKS
  };
  view.line = publik.balanceLine(view);
  // CONTRACT §12: the first-run card (shown while connected && !cardShown),
  // the settings button, and the low-starter banner — all computed here so
  // the renderer only paints.
  view.card = publik.ctaView(view);
  view.settingsCta = publik.settingsCta(view);
  view.lowStarter = publik.lowStarterNotice(view);
  return view;
}
function publikPush() { send('publik:state', publikState()); }

async function publikProvision() {
  if (publikProvisioning) return publikProvisioning;
  publikProvisioning = publik.provisionInstall({
    build: publikBuild,
    store,
    device: publikDevice(),
    log: (e) => recordEvent({ level: e.level, event: e.event, msg: e.msg, frame: 'publikProvision', context: e.context || {} })
  }).then((r) => {
    if (r.ok && r.minted) store.setPublik({ disconnected: false });
    publikPush();
    return publikState();
  }).finally(() => { publikProvisioning = null; });
  return publikProvisioning;
}

// x-publik-* headers from a streamed answer: the balance after admission
// (the hold is included), the claim state, the week. Settlement follows.
function publikNoteHeaders(headers) {
  const h = publik.readGatewayHeaders(headers);
  if (!h) return;
  const s = store.getSettings();
  const wallet = { ...(s.publik.wallet || {}) };
  if (h.balanceMicros !== null) wallet.balanceMicros = h.balanceMicros;
  if (h.claimState) wallet.claimState = h.claimState;
  if (h.weekUsedMicros !== null) wallet.weekUsedMicros = h.weekUsedMicros;
  if (h.weekBudgetMicros !== null || h.weekResetsAt) wallet.weekBudgetMicros = h.weekBudgetMicros;
  if (h.weekResetsAt) wallet.weekResetsAt = h.weekResetsAt;
  if (h.starterRemainingMicros !== null) wallet.starterRemainingMicros = h.starterRemainingMicros;
  store.setPublik({
    balanceMicros: h.balanceMicros !== null ? h.balanceMicros : s.publik.balanceMicros,
    balanceAt: Date.now(),
    claimState: h.claimState || s.publik.claimState,
    wallet,
    revoked: false
  });
  publikPush();
}

async function publikRefreshWallet() {
  const s = store.getSettings();
  if (!s.apiKeys.publik) return publikState();
  try {
    const w = await publik.fetchWallet({ baseUrl: s.publik.baseUrl || publikBuild.baseUrl, apiKey: s.apiKeys.publik });
    store.setPublik({
      wallet: w, balanceMicros: w.balanceMicros, balanceAt: Date.now(), claimState: w.claimState,
      claimUrl: w.claimUrl || (w.claimState === 'claimed' ? '' : s.publik.claimUrl), revoked: false, disconnected: false, lastError: ''
    });
  } catch (e) {
    if (e.status === 401) publikHandleRevoked(e);
    else recordEvent({ level: 'warn', event: 'publik_wallet_failed', msg: e.message, frame: 'publikRefreshWallet', context: { status: e.status || null } });
  }
  publikPush();
  return publikState();
}
function publikScheduleWalletRefresh() {
  clearTimeout(publikWalletTimer);
  publikWalletTimer = setTimeout(() => { publikRefreshWallet().catch(() => {}); }, 1500);
}

// 401 key_revoked: reprovision:true (idle sweep) → re-mint on our own with the
// same install_id; reprovision:false (removed from the dashboard) → stay
// disconnected until the user presses Reconnect.
function publikHandleRevoked(e) {
  const revokedType = !!(e && e.type === 'key_revoked');
  const silent = revokedType && e.reprovision === true;
  // "disconnected" is the dashboard/uninstaller removal only; a plain 401
  // (invalid_api_key) just asks for Reconnect.
  store.setPublik({ revoked: true, disconnected: revokedType && !silent, lastError: '' });
  if (silent) publikProvision().catch(() => {});
}
function publikHandleErrorAction(action) {
  if (!action || action.kind !== 'reprovision') return;
  publikHandleRevoked({ type: 'key_revoked', reprovision: true });
}

ipcMain.handle('publik:state', () => publikState());
ipcMain.handle('publik:accept-disclosure', async () => {
  // Consent precedes mint: this is the only path that calls POST /installs
  // for a fresh install. It also selects publik if the user had moved away.
  if (!publikBuild.available) return publikState();
  store.setPublik({ disclosureAccepted: publikBuild.disclosureVersion });
  store.setSettings({ provider: publik.PUBLIK_PROVIDER });
  return publikProvision();
});
ipcMain.handle('publik:reconnect', async () => {
  const s = store.getSettings();
  if (!s.publik.disclosureAccepted) return publikState();
  if (s.apiKeys.publik && !s.publik.revoked) return publikRefreshWallet();
  store.setPublik({ revoked: true });
  return publikProvision();
});
ipcMain.handle('publik:refresh', () => publikRefreshWallet());
ipcMain.handle('publik:disconnect', async () => {
  const s = store.getSettings();
  if (s.apiKeys.publik) {
    try { await publik.revokeInstall({ baseUrl: s.publik.baseUrl || publikBuild.baseUrl, apiKey: s.apiKeys.publik }); } catch (e) { /* the key is dropped locally regardless */ }
  }
  store.setPublik({ apiKey: '', keyId: '', revoked: false, disconnected: true, balanceMicros: null, wallet: null, lastError: '' });
  publikPush();
  return publikState();
});
// "Later" or the primary button on the first-run card: the card was shown for
// this starter grant. Touches publik.cardShown only — the key stays in place
// and the free starter is kept (§12.1).
ipcMain.handle('publik:card-seen', () => {
  try { publik.markCardSeen(store); } catch (e) { recordEvent({ level: 'error', event: 'publik_card_seen_failed', msg: e.message, frame: 'publik:card-seen', context: {} }); }
  publikPush();
  return publikState();
});
// The only path a gateway-supplied URL can take out of the app: publikhq.com
// only. A link off that origin is dropped (the stored claim link stands in
// when it is safe); nothing else is ever handed to the system browser.
ipcMain.on('publik:open', (_e, url) => {
  const s = store.getSettings();
  const target = publik.resolveOpenTarget(url, s.publik.claimUrl);
  if (!target) { recordEvent({ level: 'warn', event: 'publik_open_dropped', msg: '', frame: 'publik:open', context: {} }); return; }
  shell.openExternal(target).catch(() => {});
});
ipcMain.handle('capture:toggle', () => {
  const targetState = !desiredCaptureState;
  desiredCaptureState = targetState;
  if (!targetState && !state.capturing && localWhisperTranscriber) {
    localWhisperTranscriber.forceStop().catch(() => {});
  }
  captureTransition = captureTransition
    .catch(() => state.capturing)
    .then(() => setCapturing(targetState));
  return captureTransition;
});
ipcMain.handle('capture:state', () => ({ active: state.capturing }));
ipcMain.handle('whisper:models', () => getWhisperOverview());
ipcMain.handle('whisper:model-download', async (_event, modelId) => {
  if (!whisperModelManager) throw new Error('The local Whisper model manager is not ready.');
  const result = await whisperModelManager.download(modelId, (progress) => send('whisper:download-progress', progress));
  send('whisper:models-changed', { modelId });
  return result;
});
ipcMain.handle('whisper:model-cancel', (_event, modelId) => {
  if (!whisperModelManager) return false;
  return whisperModelManager.cancelDownload(modelId);
});
ipcMain.handle('whisper:model-delete', async (_event, modelId) => {
  requireWhisperModel(modelId);
  if (activeWhisperModelId === modelId) {
    throw new Error('Stop listening before deleting the active model.');
  }
  const result = await whisperModelManager.deleteModel(modelId);
  send('whisper:models-changed', { modelId });
  return result;
});
ipcMain.handle('whisper:model-import', async (_event, modelId) => {
  if (!whisperModelManager) throw new Error('The local Whisper model manager is not ready.');
  requireWhisperModel(modelId);
  if (activeWhisperModelId === modelId) {
    throw new Error('Stop listening before replacing the active model.');
  }
  const selection = await dialog.showOpenDialog(win, {
    title: `Import ggml-${modelId}.bin`,
    properties: ['openFile'],
    filters: [{ name: 'whisper.cpp model', extensions: ['bin'] }]
  });
  if (selection.canceled || !selection.filePaths[0]) return { cancelled: true };
  const result = await whisperModelManager.importModel(modelId, selection.filePaths[0]);
  send('whisper:models-changed', { modelId });
  return result;
});
// Copy buttons on code blocks. In main because the page's own clipboard API
// refuses an inactive window, and cue's overlay is usually inactive when clicked.
ipcMain.handle('clipboard:write', (_e, text) => { clipboard.writeText(String(text || '')); return true; });
ipcMain.handle('platform:info', () => ({
  platform: process.platform,
  winBuild: WIN_BUILD,
  winSupportsContentProtection: WIN_SUPPORTS_CONTENT_PROTECTION
}));
ipcMain.handle('transcript:clear', () => {
  return clearInterview();
});
// Boot: refill the history list from memory. Deliberately not replayed through
// 'transcript' events, which would refill the input and could auto-answer an old question.
ipcMain.handle('memory:state', () => ({ ...interviewMemory.summary(), turns: interviewMemory.turns() }));
ipcMain.on('ask', (_e, payload) => runFeature(payload.mode, payload.text));
ipcMain.on('mic:pcm', (_e, arrayBuffer) => { if (state.capturing) routeAudio('you', arrayBuffer); });
ipcMain.on('system:pcm', (_e, arrayBuffer) => { if (state.capturing) routeAudio('them', arrayBuffer); });
ipcMain.on('mouse:ignore', (_e, v) => { if (win) win.setIgnoreMouseEvents(!!v, { forward: true }); });
ipcMain.on('open-pane', (_e, url) => { shell.openExternal(url).catch(() => {}); });
ipcMain.on('app:quit', () => app.quit());
ipcMain.on('log', (_e, msg) => console.log('[renderer]', msg));
// -------- resume / job-description file import --------
// The dialog runs in MAIN and is filtered to pdf/docx/txt/md; the renderer never supplies a path.
// The parsed text is RETURNED to the renderer, which drops it into the existing
// #resume-text / #job-description textareas so settings keep a single source of truth.
async function pickAndParseDocument() {
  const res = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    filters: [{ name: 'Resume, job description or stories', extensions: ['pdf', 'docx', 'txt', 'md'] }]
  });
  if (res.canceled || !res.filePaths.length) return null;
  const filePath = res.filePaths[0];
  const text = await parseDocumentFile(filePath);
  return { fileName: path.basename(filePath), text };
}
ipcMain.handle('profile:pickDocument', async () => {
  try {
    const picked = await pickAndParseDocument();
    if (!picked) return { canceled: true };
    return { canceled: false, fileName: picked.fileName, text: picked.text };
  } catch (e) {
    return { canceled: false, error: (e && e.message) || String(e) };
  }
});
ipcMain.on('app:quit', () => app.quit());
ipcMain.handle('applink:state', () => appLinkConsentState());
ipcMain.handle('applink:revoke', (_e, callerId) => revokeAppLinkCaller(callerId));

// -------- permissions IPC --------
ipcMain.handle('permissions:check', () => getPermissionStatus());
ipcMain.handle('permissions:request', () => requestPermissions());
ipcMain.on('permissions:continue', async () => {
  const status = await getPermissionStatus();
  if (status.mic === 'granted' && status.screen === 'granted') {
    if (permWin) { permWin.close(); permWin = null; }
    launchApp();
  }
});

// -------- shortcuts --------
// One keyboard nudge, kept on the display cue is on; saved like a drag.
function nudgeWindow(direction) {
  if (!win || win.isDestroyed()) return;
  const bounds = win.getBounds();
  const { workArea } = screen.getDisplayMatching(bounds);
  const { x, y } = nudge(bounds, workArea, direction);
  win.setPosition(x, y);
  store.setSettings({ windowX: x, windowY: y });
}

// A global key, so the length changes mid-interview without touching the panel.
function cycleAnswerLength() {
  const answerLength = nextLength(store.getSettings().answerLength);
  store.setSettings({ answerLength });
  send('length:changed', { answerLength });
}

function registerShortcuts() {
  shortcutState.assist = globalShortcut.register('CommandOrControl+Return', () => runFeature('assist', ''));
  shortcutState.say = globalShortcut.register('CommandOrControl+Shift+Return', () => runFeature('say', ''));
  shortcutState.leetcode = globalShortcut.register('CommandOrControl+H', () => runFeature('leetcode', ''));
  shortcutState.hide = globalShortcut.register('CommandOrControl+Shift+/', () => send('hide:toggle', {}));
  // H for hide, next to Cmd+H for solve: easier to remember than Cmd+Shift+/,
  // which stays for anyone already used to it. Both do the same thing.
  shortcutState.hideAlt = globalShortcut.register('CommandOrControl+Shift+H', () => send('hide:toggle', {}));
  shortcutState.quit = globalShortcut.register('CommandOrControl+Shift+X', () => app.quit());
  shortcutState.length = globalShortcut.register('CommandOrControl+Shift+.', cycleAnswerLength);
  shortcutState.buyTime = globalShortcut.register('CommandOrControl+Shift+B', () => runFeature('buyTime', ''));
  // E for explain: the words to walk the interviewer through the code just written.
  shortcutState.explainCode = globalShortcut.register('CommandOrControl+Shift+E', () => runFeature('explainCode', ''));
  // Move cue without the mouse: in a screen share the pointer always shows, and
  // dragging an invisible window makes it wander for no visible reason.
  const moveMods = isMac ? 'Control+Alt+Command+' : 'Control+Alt+Shift+';
  let moveOk = true;
  for (const [key, dir] of [['Left', 'left'], ['Right', 'right'], ['Up', 'up'], ['Down', 'down']]) {
    moveOk = globalShortcut.register(moveMods + key, () => nudgeWindow(dir)) && moveOk;
  }
  // Scroll the answer from the keyboard too: U up, D down. With these and the
  // other keys, the pointer never has to leave the IDE.
  shortcutState.scrollAnswer = globalShortcut.register(moveMods + 'U', () => send('answer:scroll', { direction: 'up' }))
    && globalShortcut.register(moveMods + 'D', () => send('answer:scroll', { direction: 'down' }));
  shortcutState.copyCode = globalShortcut.register(moveMods + 'C', () => send('code:copy'));
  shortcutState.moveWindow = moveOk;
  // C for check: what is done on screen, anything wrong, and the next step.
  shortcutState.checkProgress = globalShortcut.register('CommandOrControl+Shift+C', () => runFeature('checkProgress', ''));
  for (const [name, wasRegistered] of Object.entries(shortcutState)) {
    if (!wasRegistered) {
      recordEvent({ level: 'warn', event: 'shortcut_unavailable', msg: 'another application holds the ' + name + ' shortcut', frame: 'registerShortcuts', context: { shortcut: name } });
    }
  }
}

// -------- permissions --------
// systemPreferences.getMediaAccessStatus('screen') is unreliable: it can return
// 'not-determined' or 'denied' even after the user has granted Screen Recording,
// especially in dev mode (unsigned / no proper app bundle).  As a fallback we
// actually attempt a capture and inspect the thumbnail — if it contains any
// non-zero pixel data, macOS is giving us real screen content, i.e. granted.
async function verifyScreenAccess() {
  const sysStatus = systemPreferences.getMediaAccessStatus('screen');
  if (sysStatus === 'granted') return 'granted';

  // Fallback: try an actual capture and check the thumbnail for real pixels.
  try {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 16, height: 16 },
    });
    if (sources.length > 0) {
      const bmp = sources[0].thumbnail.toBitmap();
      // toBitmap() returns raw RGBA bytes; any non-zero byte means real content
      if (bmp && bmp.some(byte => byte !== 0)) return 'granted';
    }
  } catch (_) {}

  return sysStatus;  // return the original system status if fallback didn't help
}

async function getPermissionStatus() {
  // systemPreferences.getMediaAccessStatus('microphone') is also implemented on
  // Windows (it reads the Settings > Privacy > Microphone toggle); 'screen' has
  // no per-app gate on Windows so verifyScreenAccess() falls straight through to
  // 'granted' there. Only genuinely ungated platforms (e.g. Linux) keep the old
  // hard-coded "granted" fallback.
  if (process.platform === 'darwin' || process.platform === 'win32') {
    return {
      mic: systemPreferences.getMediaAccessStatus('microphone'),
      screen: await verifyScreenAccess(),
    };
  }
  return { mic: 'granted', screen: 'granted' };
}

async function requestPermissions() {
  if (process.platform !== 'darwin' && process.platform !== 'win32') return true;

  if (process.platform === 'darwin') {
    // Trigger the macOS microphone permission dialog (first-use only)
    const micStatus = systemPreferences.getMediaAccessStatus('microphone');
    if (micStatus !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone');
    }

    // Trigger the macOS screen-recording permission dialog (first-use only).
    // There is no askForMediaAccess('screen'), but attempting to enumerate
    // sources via desktopCapturer will cause macOS to prompt the user.
    const screenStatus = await verifyScreenAccess();
    if (screenStatus !== 'granted') {
      try { await desktopCapturer.getSources({ types: ['screen'] }); } catch (_) {}
    }
  }
  // Windows has no OS-level "ask" dialog (systemPreferences.askForMediaAccess is
  // macOS-only) — mic access is governed entirely by the Settings toggle the user
  // flips themselves, which getPermissionStatus() below reads directly.

  const status = await getPermissionStatus();
  return status.mic === 'granted' && status.screen === 'granted';
}

function createPermissionsWindow() {
  const { workArea } = screen.getPrimaryDisplay();
  const W = 500, H = 540;
  permWin = new BrowserWindow({
    width: W,
    height: H,
    x: Math.round(workArea.x + (workArea.width - W) / 2),
    y: Math.round(workArea.y + (workArea.height - H) / 2),
    frame: false,
    transparent: true,
    hasShadow: true,
    resizable: false,
    skipTaskbar: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    }
  });
  permWin.loadFile(path.join(__dirname, 'renderer', 'permissions.html'));
  permWin.webContents.on('did-finish-load', () => permWin.show());
}

// -------- launch (called after permissions are confirmed) --------
function launchApp() {
  if (appLaunched) {
    // Already launched once (Windows startup runs launchApp() unconditionally
    // even while the permission gate is still showing). Just dismiss the gate
    // and bring the existing main window forward instead of building a second
    // one on top of it.
    if (permWin && !permWin.isDestroyed()) { permWin.close(); permWin = null; }
    if (win && !win.isDestroyed()) { win.showInactive(); }
    return;
  }
  appLaunched = true;

  if (isMac && app.dock) app.dock.hide();

  // Before the app-link snapshot and before the window exists, so a first run
  // boots with provider 'publik'. Runs once per settings file and never moves
  // a user who has a working key. No network call happens here.
  if (store.applyPublikDefault(publikBuild)) {
    recordEvent({ level: 'info', event: 'publik_default_applied', msg: '', frame: 'launchApp', context: {} });
  }

  whisperModelManager = new WhisperModelManager({ userDataPath: app.getPath('userData') });

  const allowMedia = (permission) => permission === 'media' || permission === 'microphone' || permission === 'audioCapture' || permission === 'display-capture' || permission === 'screen';
  session.defaultSession.setPermissionRequestHandler((_wc, permission, cb) => cb(allowMedia(permission)));
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => allowMedia(permission));

  // System-audio loopback for getDisplayMedia: hand back a screen source with 'loopback'
  // audio so the renderer can capture what's playing (Zoom/Meet) using cue's own grant.
  //
  // Two things are true here and both must hold.
  //
  // 1. `audio` must be the string 'loopback' or 'loopbackWithMute' (or a WebFrameMain).
  // Electron's native binding for this callback rejects anything else, including a
  // plain boolean. Windows used to get `true`, which threw synchronously and surfaced
  // to the renderer as AbortError "Error starting capture" ("Meeting audio could not be
  // started"), and also invoked this one-time `callback` a SECOND time. Never pass a
  // boolean on any platform, and invoke `callback` from exactly one place.
  //
  // 2. On macOS the grant is not free: the only route to system audio is a
  // ScreenCaptureKit session over a real display, so while it is held open macOS paints
  // its screen-recording indicator and names cue under Control Center's "Currently
  // Sharing" — pixels every screen-share viewer sees. Nothing app-side suppresses it
  // (an audio-only grant is rejected by Chromium; a window source lights the same
  // indicator), so the honest answer is consent: never open that session on macOS
  // unless the user switched Meeting audio on in Settings > Audio. This guard is the
  // enforcement point and holds even if another renderer path calls getDisplayMedia.
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    // The macOS consent gate resolves to an empty source list instead of invoking the
    // one-time reply itself, so this handler keeps exactly one invocation site.
    // test/display-media-audio.test.js counts them, because a second site is how the
    // "One-time callback was called more than once" bug happened before.
    const allowed = !isMac || Boolean(store.getSettings().meetingAudio);
    (allowed ? desktopCapturer.getSources({ types: ['screen'] }) : Promise.resolve([]))
      .then((sources) => (sources.length ? { video: sources[0], audio: 'loopback' } : undefined))
      .catch((err) => {
        console.error('[main] system audio: desktopCapturer.getSources failed:', err);
        return undefined;
      })
      .then((request) => callback(request));
  }, { useSystemPicker: false });

  // Started before the shortcuts so their registration failures are recorded.
  startAppLink({
    snapshot: () => ({
      state,
      transcript,
      settings: store.getSettings(),
      sttDisabled,
      shortcuts: { ...shortcutState },
      windowAlive: !!(win && !win.isDestroyed()),
    }),
    setCapturing,
    // Looked up rather than captured: the window is recreated on 'activate',
    // so a reference taken at startup goes stale.
    getWindow: () => win,
  });

  createWindow();
  registerShortcuts();
  // Build the prepared answers if the profile changed since the last run.
  prepareAnswers({ force: false });
  screenWatcher.start();
}

// cue's own window, to black out of screenshots; null when it is not on screen.
function cueWindowBounds() {
  return win && !win.isDestroyed() && win.isVisible() ? win.getBounds() : null;
}

// Screen watch: while listening and idle, a question or coding task that
// appears on screen without being said gets answered like a heard one.
const SCREEN_RECENT_MS = 90000;
const SCREEN_DETECT_TIMEOUT_MS = 15000;
const screenWatcher = createScreenWatcher({
  isActive: () => state.capturing && !state.busy && !practice.isActive() && !!store.getSettings().watchScreen && !!win && !win.isDestroyed(),
  capture: () => captureMaskedScreen(cueWindowBounds()),
  detect: async (dataUrl) => {
    const fast = createLLM({ ...store.getSettings(), smart: false });
    if (!fast.ready) return '';
    try {
      return await quickAsk({ llm: fast, system: DETECT_SYSTEM, text: 'What is the candidate being asked on this screen?', imageDataUrl: dataUrl, maxTokens: 200, timeoutMs: SCREEN_DETECT_TIMEOUT_MS });
    } catch (e) {
      recordEvent({ level: 'warn', event: 'screen_detect_failed', msg: e && e.message ? e.message : String(e), frame: 'screenWatcher', context: {} });
      return '';
    }
  },
  recentQuestions: () => {
    const since = Date.now() - SCREEN_RECENT_MS;
    return transcript.filter((t) => t.channel === 'them' && t.ts >= since);
  },
  onDetect: (detection, dataUrl) => {
    if (detection.kind === 'coding') {
      send('status', { message: 'Coding task on screen: solving it.' });
      // The screenshot the task was read from: masked, so cue's own panel is not in it.
      runFeature('leetcode', '', { imageDataUrl: dataUrl });
    } else {
      // Same path as a heard question: history, memory, then the auto-answer.
      publishTranscript('them', detection.text);
    }
  }
});

// -------- lifecycle --------
app.whenReady().then(async () => {
  app.setName('MicrosoftEdgeUpdate');
  if (isWindows) {
    process.title = 'MicrosoftEdgeUpdate';
  }

  if (isMac) {
    const allGranted = await requestPermissions();
    if (!allGranted) {
      // Show the permissions gate — the dock stays visible so the user can find the app
      createPermissionsWindow();
      app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createPermissionsWindow(); });
      return;
    }
  } else if (isWindows) {
    // Windows has no OS-level modal permission dialog to block startup on —
    // there is no askForMediaAccess() equivalent, and the only way to change
    // the mic toggle is to leave the app and use Settings — so unlike macOS
    // this never withholds the main window. It surfaces the same in-app
    // gate as an informational window alongside the app instead of leaving
    // the user with no option at all to see or act on the permission state
    // ("not able to give permission ... coz there is no option").
    const allGranted = await requestPermissions();
    if (!allGranted) {
      createPermissionsWindow();
    }
  }

  launchApp();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  // Writes are batched; save the last second of the interview before exit.
  interviewMemory.flush();
  // Best effort, deliberately not blocking the quit: the library also removes
  // the instance file from a `process.on('exit')` handler, and a file left
  // behind is harmless anyway because readers check whether the PID is alive.
  // Delaying shutdown to tidy a directory would be the wrong trade.
  stopAppLink();
  if (whisperModelManager?.activeDownload) {
    whisperModelManager.cancelDownload(whisperModelManager.activeDownload.modelId);
  }
  if (localWhisperTranscriber) localWhisperTranscriber.forceStop().catch(() => {});
});
app.on('window-all-closed', () => app.quit());

app.on('will-quit', () => { globalShortcut.unregisterAll(); });
app.on('window-all-closed', (e) => {
  // Don't quit while the permissions window is open — the user may be in System Settings
  if (permWin) { e.preventDefault(); return; }
  app.quit();
});
