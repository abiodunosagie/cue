const { app, BrowserWindow, ipcMain, globalShortcut, screen, session, desktopCapturer, shell, dialog, systemPreferences, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const store = require('./src/store');
const readingTracker = require('./renderer/reading-tracker');
const { isExplainRequest, isFixRequest, refersToScreen } = require('./renderer/spoken-question');
const { captureScreenshot, captureMaskedScreen, captureMaskedPage, encodeScreenshot, MAX_DATA_URL_BYTES } = require('./src/screen');
const { readScrollPages, fitPages } = require('./src/scroll-reader');
const { createQuestionBundle } = require('./src/question-bundle');
const { reviewScript } = require('./src/script-review');
const { MAX_SCRIPT_CHARS } = require('./src/scripts');
const { nudge } = require('./src/window-move');
const { createScreenWatcher, DETECT_SYSTEM } = require('./src/screen-watch');
const { synthesize } = require('./src/practice');
const { createPracticeSession } = require('./src/practice-session');
const { registerSetupIpc } = require('./src/ipc/setup');
const { registerProfileIpc } = require('./src/ipc/profiles');
const { registerProjectsIpc } = require('./src/ipc/projects');
const { createSTT } = require('./src/stt');
const { buildVocabPrompt } = require('./src/vocab');
const { parseDocumentFile } = require('./src/resume');
const { createLLM, imageLimit } = require('./src/llm');
const { MODES, turnsSentByBuild } = require('./src/prompts');
const { answeredQuestion } = require('./src/heard-question');
const { LENGTH_MODES, nextLength, lengthRule } = require('./renderer/answer-length');
const { createCodingLibrary, identifyTask, confirmSameTask, checkVerdict } = require('./src/coding-library');
const { createQuestionBank } = require('./src/question-bank');
const { registerCodingLibraryIpc } = require('./src/ipc/coding-library');
const { registerRecordingIpc } = require('./src/ipc/recording');
const { registerProjectReviewIpc } = require('./src/ipc/project-review');
const { createProjectMemory } = require('./src/project-review/memory');
const { projectMode, askTurn } = require('./src/project-review/review');
const { createPreparedStore, profileHash } = require('./src/prepared-answers');
const { createPrepare } = require('./src/prepare');
const { createFollowUpBank } = require('./src/follow-ups');
const { quickAsk } = require('./src/quick-ask');
const { checkTurn, noAnswer } = require('./src/turn-check');
const { checkContinuation, wholeQuestion } = require('./src/continuation-check');
const { registerRoundsIpc } = require('./src/ipc/rounds');
const { registerPublikIpc } = require('./src/ipc/publik');
const { isRenderContents } = require('./src/page-render');
const { getPermissionStatus, requestPermissions } = require('./src/permissions');
const { rms16 } = require('./src/wav');
const { createStreamingSTT } = require('./src/stt-streaming');
const { AdaptiveVAD, AudioRingBuffer } = require('./src/vad');
const { buildInterviewContext, detectCategory } = require('./src/interview-context');
const { rulesWithFocus } = require('./src/role-focus');
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
const shortcutState = { assist: false, say: false, leetcode: false, quit: false, length: false, buyTime: false, explainCode: false, checkProgress: false, screenQuestions: false, moveLeft: false, moveRight: false, moveUp: false, moveDown: false, scrollUp: false, scrollDown: false, copyCode: false, fixCode: false, followAnswer: false, hide: false, hideAlt: false };
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
// cue's own answers this interview, minus coding solves (long, and never
// about the candidate's projects), for the "already used" projects note.
const spokenAnswerTexts = () => interviewMemory.answers().filter((a) => a.mode !== 'leetcode').map((a) => a.text);
interviewMemory.load();
// Answers to the likely questions, made before the interview (cue-prepared.json).
const questionBank = createQuestionBank();
console.log(`[bank] ${questionBank.counts().qa} questions, ${questionBank.counts().coding} coding solutions`);
const preparedStore = createPreparedStore({ file: path.join(app.getPath('userData'), 'cue-prepared.json') });
preparedStore.load();
// Every coding question solved with Cmd+H, so the same one later shows its
// saved solution instead of a new Coding model solve (src/coding-library.js).
const codingLibrary = createCodingLibrary({ file: path.join(app.getPath('userData'), 'cue-coding-library.json') });
codingLibrary.load();
// The library entry behind the question in front of the candidate (the saved
// solution shown, or the one just saved), so a progress check that finds it
// wrong can flag it. Cleared with the question. Declared up here because
// clearInterview() can run while this file is still loading.
let currentLibraryId = null;
// The codebase reviewed in this interview (src/project-review/memory.js):
// kept across New question, cleared with the interview.
const projectMemory = createProjectMemory({
  file: path.join(app.getPath('userData'), 'cue-project-review.json'),
  cloneDir: path.join(app.getPath('userData'), 'cue-projects')
});
projectMemory.load();
// The coding question in front of the candidate, across its tabs: every view
// read by Cmd+H or by the gather key, until Next question (src/question-bundle.js).
// Up here too: a practice that crashed is cleared (clearInterview) while this
// file is still loading, and a const declared below that call is not usable yet.
const questionBundle = createQuestionBundle();
// Answers to the likely follow-ups of this interview's last few answers (src/follow-ups.js).
const followUps = createFollowUpBank();
const MAX_TRANSCRIPT_TURNS = MEMORY_MAX_TURNS; // ~90 minutes of conversation
const transcript = interviewMemory.turns().slice(-MAX_TRANSCRIPT_TURNS); // { channel, text, ts }
const FLUSH_MS = 900;
const STREAM_INACTIVITY_MS = 25000; // abort a stalled LLM stream so state.busy can't wedge forever
// The coding tier's watchdog counts any stream event as alive, thinking
// included (the thinking summary streams while the model works), so these are
// gaps of total silence, not deadlines. Once words flow, the longest pause
// between events; before the first word, a longer one, because the plain
// fallback request thinks with no events at all.
const CODING_STREAM_INACTIVITY_MS = 45000;
const CODING_FIRST_WORD_SILENCE_MS = 120000;
// The quick start is only worth having within seconds: a Smart model that is
// this slow gives way to the full solution instead of holding it back.
const QUICK_START_FIRST_WORD_MS = 30000;
const QUICK_START_INACTIVITY_MS = 20000;
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

// Teleprompter (the Script button): while a script is read aloud, speech only
// moves the highlight. Nothing reaches the interview transcript, memory,
// history or auto-answer, and the other side (a recording tool playing the
// speaker back) is dropped. True when the turn was taken.
let scriptActive = false;
function scriptTakesTurn(turn) {
  if (!scriptActive) return false;
  if (turn.channel === 'you') send('script:heard', { text: turn.text });
  return true;
}

function pushTranscript(turn) {
  if (isMicEcho(turn)) return;
  transcript.push(turn);
  if (transcript.length > MAX_TRANSCRIPT_TURNS) transcript.splice(0, transcript.length - MAX_TRANSCRIPT_TURNS);
  interviewMemory.addTurn(turn, { profile: store.getSettings().activeProfile });
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
  questionBundle.clear();
  currentLibraryId = null;
  // A walkthrough of the candidate's own project is prepared before the
  // interview, so Clear keeps it; a review belongs to this interview only.
  const loaded = projectMemory.get();
  if (!loaded || loaded.purpose !== 'walkthrough') projectMemory.clear();
  announceQuestion();
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
  if (!fromPractice && scriptTakesTurn(turn)) return;
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
      console.log(`[cue] Windows build ${WIN_BUILD} < 19041: setContentProtection not supported. Window may appear in screen shares.`);
    }
  } else if (isWindows && !WIN_IS_LOCAL_CONSOLE_SESSION && !process.env.CUE_NO_PROTECT) {
    console.log(`[cue] Windows session is not a local console session (SESSIONNAME=${process.env.SESSIONNAME}): skipping setContentProtection so the window stays visible to you. Window may appear in screen shares.`);
  }

  win.setAlwaysOnTop(true, 'screen-saver', 1);
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  if (isMac && typeof win.setHiddenInMissionControl === 'function') win.setHiddenInMissionControl(true);

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  let moveSaveTimer = null;
  win.on('moved', () => {
    // Under the camera for a recording: not where the candidate keeps cue.
    if (recording.isPlaced()) return;
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
    // A reloaded panel shows the question cue still holds, and has no script
    // running: never keep dropping interview speech for one.
    announceQuestion();
    scriptActive = false;
    recording.reset();
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
      if (scriptTakesTurn(turn)) return;
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
        if (scriptTakesTurn(turn)) return;
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
// -------- prepared answers (src/prepare.js) --------
const { preparedState, prepareAnswers, prepareOtherProfiles, schedulePrepare, findPreparedAnswer, prepareFollowUps } = createPrepare({
  store, createLLM, preparedStore, questionBank, followUps, projectMemory, interviewMemory, send, recordEvent, spokenAnswerTexts,
  getTranscript: () => transcript
});

// The earlier coding solves a mode builds on: the last two for a new solve,
// and for explainCode and checkProgress the one being explained or checked
// (the newest, even after the round).
// The model for a coding quick start: the Smart model, run as a coding solve
// (so it gets the coding speed options), or null when there is no separate,
// ready Smart model or the setting is off. Only Cmd+H solves get one.
function quickStartLlm(mode, settings, codingLlm) {
  if (mode !== 'leetcode' || settings.codingQuickStart === false) return null;
  const smart = createLLM({ ...settings, smart: true });
  if (!smart.ready || !smart.model || smart.model === codingLlm.model) return null;
  const models = settings.models || {};
  const quick = createLLM({ ...settings, models: { ...models, [settings.provider]: { ...(models[settings.provider] || {}), coding: smart.model } } }, { tier: 'coding' });
  return quick.ready ? quick : null;
}

function priorSolvesFor(def, mode) {
  // The whole solve: a progress check needs the plan's later steps, not its first few thousand characters.
  // Checked before the tier: a progress check runs on the Coding model too.
  if (mode === 'explainCode' || mode === 'checkProgress' || mode === 'fixCode') return [interviewMemory.recentCodingSolve() || interviewMemory.codingHistory({ count: 1, maxChars: Infinity })[0] || ''];
  if (def.tier === 'coding') return interviewMemory.codingHistory();
  return [];
}

// Reading while scrolling (Settings > Answer style, default On): Cmd+H starts
// reading, the candidate scrolls and switches tabs, Cmd+H again solves.
let scrollReader = null;
// 'questions' while the questions key reads a page: that key ends only its own
// reading, so a coding question is never answered as a form by mistake.
let scrollReaderPurpose = null;
const cmdH = isMac ? '⌘H' : 'Ctrl+H';
const noMouseKey = (letter) => (isMac ? 'Ctrl+Option+⌘' : 'Ctrl+Alt+Shift+') + letter;
const questionsKey = noMouseKey('A');

// The gather in progress (a promise), so a Cmd+H solve waits for it instead of
// reading the screen at the same time; and questionEpoch, which Next question
// moves on, so a read that started before it never lands in the new question.
let gathering = null;
let questionEpoch = 0;

// Which saved coding task, if any, is the one on screen: the Fast model reads
// the screens, the closest saved task in the same language is the candidate,
// and the Fast model must call the two the same task before its solution is
// used. Resolves { task, hit, replaceId }: task is null when the screen could
// not be read (nothing is saved then); hit is the saved item to show;
// replaceId is a saved item this solve replaces (a flagged one). Never throws.
// resolvingId: this question was already solved (or shown) since Next question,
// so another Cmd+H means "solve it again with what I show you now": the
// library is not searched, and the fresh solve replaces that entry.
async function lookUpCodingLibrary({ settings, imageDataUrl, imageDataUrls, startedAt, resolvingId }) {
  const fast = createLLM({ ...settings, smart: false });
  if (!fast.ready) return { task: null };
  const task = await identifyTask({ llm: fast, imageDataUrl, imageDataUrls });
  console.log(`[timing] library: ${task ? 'read the task' : 'no task read'} after ${Date.now() - startedAt}ms (${fast.model})`);
  if (!task) return { task: null };
  if (resolvingId) return { task, replaceId: resolvingId };
  const found = codingLibrary.candidate(task, questionBank.codingItems());
  if (!found) return { task };
  const check = await confirmSameTask({ llm: fast, now: task, saved: found.item });
  console.log(`[timing] library: ${check.same ? 'same task' : 'different task'} (overlap ${found.score.toFixed(2)}) after ${Date.now() - startedAt}ms`);
  if (!check.same) {
    if (check.reason) send('status', { message: `A saved solution was close, but this question differs: ${check.reason} Solving it fresh.` });
    return { task };
  }
  if (found.item.flagged) {
    send('status', { message: 'The saved solution for this question was found wrong in a progress check. Solving it fresh.' });
    return { task, replaceId: found.item.id };
  }
  return { task, hit: found.item };
}

function savedSolutionLabel(item) {
  if (item.bank) return 'Prepared solution';
  const date = new Date(item.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `Saved solution, from ${date}`;
}

// The screens of one view, unencoded ({ thumb, image }): read while the
// candidate scrolls and switches tabs when reading is on, else the screen as it is.
// purpose: 'solve', 'gather' or 'questions', for the status line and the timing log.
// oneShot: the screen as it is, whatever the setting (a solve cue started on
// its own, when the candidate is not showing it anything).
async function readView(startedAt, purpose, { oneShot = false } = {}) {
  const capture = () => captureMaskedPage(cueWindowBounds(), { keepPanel: true });
  // Scrolling is the whole point of the questions key, so it reads whatever the setting.
  if (oneShot || (purpose !== 'questions' && !store.getSettings().scrollReading)) {
    const shot = await capture();
    return shot ? [shot] : [];
  }
  const key = purpose === 'questions' ? questionsKey : cmdH;
  const finishes = purpose === 'gather' ? 'to stop reading' : purpose === 'questions' ? 'to answer them' : 'to solve';
  const showing = purpose === 'questions' ? 'scrolled past every question' : 'shown everything';
  const reader = readScrollPages({
    capture,
    onPage: (count) => send('status', { message: count === 1
      ? `Reading. Scroll and switch tabs until you have ${showing}, then ${key} ${finishes}.`
      : `${count} screens read. Keep going, or ${key} ${finishes}.` })
  });
  scrollReader = reader;
  scrollReaderPurpose = purpose;
  let pages;
  try { pages = await reader.done; } finally { scrollReader = null; scrollReaderPurpose = null; }
  console.log(`[timing] ${purpose}: ${pages.length} page${pages.length === 1 ? '' : 's'} read after ${Date.now() - startedAt}ms`);
  return pages;
}

// The images for a Cmd+H solve: this view added to the question bundle, then
// every gathered screen, labelled, sized together to fit one request. With
// only one screen it is a plain screenshot, as before.
async function solveScreens(startedAt, { oneShot = false } = {}) {
  if (gathering) await gathering;
  const epoch = questionEpoch;
  const pages = await readView(startedAt, 'solve', { oneShot });
  if (!pages.length) throw new Error('No screen source was available.');
  // Next question pressed while reading: these pages are the old question's,
  // so they are solved on their own and kept out of the new bundle.
  const bundle = epoch === questionEpoch ? questionBundle : createQuestionBundle();
  const added = bundle.add(pages);
  announceQuestion();
  // A full bundle keeps what it has; the screen now still goes to the model.
  const screens = bundle.labelled(added.ok ? [] : pages);
  const urls = fitPages(screens.map((x) => x.image), encodeScreenshot, MAX_DATA_URL_BYTES);
  const views = added.ok ? bundle.viewCount() : bundle.viewCount() + 1;
  if (!added.ok) send('status', { message: `This question already holds ${bundle.count()} screens, the most cue keeps. Solving with them and the screen now; ${noMouseKey('N')} starts a new question.` });
  else if (views > 1) send('status', { message: `Solving with ${views} views (${screens.length} screens) of this question.` });
  else if (urls.length > 1) send('status', { message: `Read ${urls.length} pages. Solving the whole question.` });
  // Also replaces "then Cmd+H to solve": a later press would only say it is already answering.
  else send('status', { message: 'Read the screen. Solving it now.' });
  return { urls: urls.map((url, i) => ({ url, label: screens[i].label })), views };
}

// The images for the questions key: the page as the candidate scrolled it,
// in scroll order, labelled. Never the coding question bundle: a form is not
// a coding task, and it must not leak into the next Cmd+H solve.
async function questionScreens(startedAt) {
  if (gathering) await gathering;
  const pages = await readView(startedAt, 'questions');
  if (!pages.length) throw new Error('No screen source was available.');
  const urls = fitPages(pages.map((p) => p.image), encodeScreenshot, MAX_DATA_URL_BYTES);
  // A provider that takes fewer images keeps the last ones (src/llm.js capImages),
  // so the first questions would be missing from an answer that looks complete.
  const { provider } = store.getSettings();
  const limit = imageLimit(provider);
  send('status', { message: urls.length > limit
    ? `Read ${urls.length} screens, but ${provider} takes only ${limit} images: the first ${urls.length - limit} are left out. Use another provider for long pages.`
    : urls.length > 1 ? `Read ${urls.length} screens. Answering every question on them, in order.` : 'Read the screen. Answering every question on it.' });
  return urls.map((url, i) => ({ url, label: `Screen ${i + 1} of ${urls.length}` }));
}

// Gather key: read this view into the question bundle without solving, so the
// next Cmd+H knows every tab (instructions, tests, the file to edit).
async function gatherView() {
  // One view at a time: a gather or a solve already reading the screen goes first.
  if (gathering || scrollReader) {
    send('status', { message: scrollReader
      ? `Still reading the last view. Stop scrolling, or press ${cmdH} to finish it, then add this one.`
      : 'Still adding the last view. Press again in a moment.' });
    return;
  }
  const run = (async () => {
    const epoch = questionEpoch;
    try {
      const pages = await readView(Date.now(), 'gather');
      if (!pages.length) throw new Error('No screen source was available.');
      if (epoch !== questionEpoch) return; // Next question was pressed meanwhile
      const added = questionBundle.add(pages);
      announceQuestion();
      send('status', { message: added.ok
        ? `Gathered: ${questionBundle.viewCount()} view${questionBundle.viewCount() === 1 ? '' : 's'}, ${questionBundle.count()} screen${questionBundle.count() === 1 ? '' : 's'}. ${cmdH} solves with all of them; ${noMouseKey('N')} starts a new question.`
        : `This question already holds ${questionBundle.count()} screens, the most cue keeps. ${cmdH} solves with them; ${noMouseKey('N')} starts a new question.` });
    } catch (e) {
      reportCaptureFailure(e, 'gatherView', {});
    }
  })();
  gathering = run;
  try { await run; } finally { gathering = null; }
}

// Next question: the gathered screens and the earlier coding solves belong to
// the last question, so none of them reach the next solve.
function nextQuestion() {
  questionEpoch++;
  currentLibraryId = null;
  questionBundle.clear();
  announceQuestion();
  interviewMemory.markNewQuestion();
  send('status', { message: `New question. The last question's screens and code are forgotten; ${cmdH} or ${noMouseKey('G')} starts reading this one.` });
}

// The panel's "This question" line and its New question button.
function announceQuestion() {
  send('question:changed', { views: questionBundle.viewCount(), screens: questionBundle.count() });
}


function reportCaptureFailure(e, frame, context) {
  recordEvent({ level: 'error', event: 'screen_capture_failed', msg: e && e.message ? e.message : String(e), frame, context });
  send('status', { message: captureFailedMessage() });
}

function captureFailedMessage() {
  return process.platform === 'darwin'
    ? 'Screen capture needs permission. Grant Screen Recording to cue in System Settings.'
    : process.platform === 'win32'
      ? 'Screen capture failed. Make sure cue is not blocked by Windows privacy or security software, then try again.'
      : 'Screen capture failed. Check your desktop capture permissions, then try again.';
}

function toggleScrollReading() {
  const scrollReading = !store.getSettings().scrollReading;
  store.setSettings({ scrollReading });
  send('scrollReading:changed', { scrollReading });
}

// A heard question as its bubble: quoted, cut to one line.
function quotedQuestion(text) {
  const t = text || '';
  return `"${t.slice(0, 60)}${t.length > 60 ? '…' : ''}"`;
}

// options.oneShot: read one screen, never wait for scrolling (see readView).
async function runFeature(mode, userText, options = {}) {
  if (state.busy) {
    // A request from the panel is never dropped silently: the panel marked itself
    // busy for it and waits for an answer that would never come.
    if (options.fromPanel) send('llm:busy', { message: 'cue is busy with something else. Try again in a moment.' });
    return;
  }
  // A question about the code just written ("walk me through your code", "why
  // a map here?") is answered from that code, not from the resume.
  // The text that was sent; the interviewer's newest turn only when none was (a bare Assist key press).
  const heard = mode === 'answerThis' || mode === 'assist' ? userText || answeredQuestion(mode, '', transcript) : '';
  if ((mode === 'answerThis' || mode === 'assist') && interviewMemory.recentCodingSolve()) {
    if (isExplainRequest(heard)) { mode = 'explainCode'; userText = heard; }
  }
  // The candidate typing about an error in the code they are writing: read the
  // editor and the error on screen against the plan, instead of guessing.
  if (mode === 'ask' && userText && interviewMemory.recentCodingSolve() && isFixRequest(userText)) mode = 'fixCode';
  // A loaded project (a review, or a walkthrough of the candidate's own) can
  // take typed questions about it and the Explain key (src/project-review/review.js projectMode).
  const reviewed = projectMemory.get();
  const walkthrough = reviewed && reviewed.purpose === 'walkthrough' ? reviewed : null;
  // A coding round in progress: its code is what Explain and heard questions are about.
  // Once it is a few answers back, a walkthrough takes over again.
  const hasCodingSolve = !!interviewMemory.recentCodingSolve();
  // The whole heard turn counts: the screen is often named before the question ("look at this screen, why a provider here?").
  mode = projectMode({ mode, userText, screenQuestion: refersToScreen(heard) || refersToScreen(options.heard || ''), memory: reviewed, hasCodingSolve });
  // During a walkthrough, a heard question about what is on screen ("why this
  // class?", "what happens when I tap that?") is answered from the screen; the
  // answer's prompt and bubble need the question itself.
  if (mode === 'walkthroughAnswer') userText = heard;
  const def = MODES[mode];
  if (!def) return;
  state.busy = true;
  // Next question pressed during this answer: it no longer belongs to the question on screen.
  const epochAtStart = questionEpoch;
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
  let streamSettled = false; // drop stray tokens from a stream we've already abandoned
  try {
    const settings = store.getSettings();
    // Coding solves use the Coding model whatever the Smart toggle says: a
    // fast model gets code wrong, and a wrong solve fails the interview.
    const llm = createLLM(settings, { tier: def.tier });
    modelInUse = llm.provider + '/' + llm.model;
    const userBubble = def.userBubble !== null
      ? def.userBubble
      : (mode === 'ask' || mode === 'projectAsk' || mode === 'walkthroughAsk' ? userText
        : mode === 'answerThis' || mode === 'walkthroughAnswer' ? quotedQuestion(userText) : null);
    // A page of written questions mixes every kind, so no one category fits it.
    const category = mode !== 'leetcode' && mode !== 'screenQuestions' ? detectCategory(transcript) : null;
    send('llm:start', { userBubble, small: !!def.small, category, coding: def.tier === 'coding' || !!def.codingFollowUp, follow: !!def.follow, showWait: def.tier === 'coding' });

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

    // A prepared answer is shown at once, with no model wait.
    const prepared = await findPreparedAnswer(mode, userText, settings);
    if (prepared) {
      firstWord('prepared answer');
      send('llm:tag', { label: 'Prepared' });
      for (const chunk of prepared.answer.match(/\S+\s*/g) || []) send('llm:token', { text: chunk });
      send('llm:done', {});
      interviewMemory.addAnswer({ mode, text: prepared.answer, generation: memoryGeneration, ts: startedAt });
      prepareFollowUps(userText, prepared.answer, memoryGeneration);
      return;
    }

    let imageDataUrl = null;
    // Several screens, each { url, label }: the pages read this time, or
    // every view gathered for this question (Cmd+H only).
    let imageDataUrls = null;
    let views = 1;
    if (def.needsScreen && !imageDataUrl) {
      try {
        if (mode === 'leetcode') {
          const screens = await solveScreens(startedAt, { oneShot: !!options.oneShot });
          views = screens.views;
          if (screens.urls.length > 1) imageDataUrls = screens.urls;
          else imageDataUrl = screens.urls[0].url;
        } else if (mode === 'screenQuestions') {
          const screens = await questionScreens(startedAt);
          if (screens.length > 1) imageDataUrls = screens;
          else imageDataUrl = screens[0].url;
        } else if (mode === 'checkProgress' && questionBundle.count()) {
          // The question's screens as cue read them, then the editor now, so
          // the check can test cue's solution against the question itself.
          const editor = await captureMaskedPage(cueWindowBounds(), { keepPanel: true });
          if (editor) {
            const screens = questionBundle.labelledWithScreenNow(editor);
            const urls = fitPages(screens.map((x) => x.image), encodeScreenshot, MAX_DATA_URL_BYTES);
            imageDataUrls = urls.map((url, i) => ({ url, label: screens[i].label }));
          }
        } else {
          // Showing a project, the candidate works on the display under the pointer
          // (the IDE or the simulator may be on a second monitor).
          imageDataUrl = await captureScreenshot({ atCursor: !!def.walkthroughScreen });
        }
        if (!imageDataUrl && !imageDataUrls) throw new Error('No screen source was available.');
      }
      catch (e) {
        reportCaptureFailure(e, 'captureScreenshot', { mode });
      }
    }

    // Cmd+H: is this question in the coding library? Read alongside the quick
    // start. With nothing saved there is nothing to find, so the solve never
    // waits for it and the reading only files the solution afterwards.
    // A second Cmd+H on the same question is a fresh solve that replaces its entry.
    const resolvingId = questionEpoch === epochAtStart ? currentLibraryId : null;
    const libraryLookup = mode === 'leetcode' && (imageDataUrl || imageDataUrls)
      ? lookUpCodingLibrary({ settings, imageDataUrl, imageDataUrls, startedAt, resolvingId })
      : null;
    const libraryFirst = !!libraryLookup && !resolvingId && codingLibrary.count() + questionBank.counts().coding > 0;

    const settingsForPrompt = store.getSettings();
    // Modes that read the whole interview themselves skip the digest; coding memory
    // goes in build() so the coding system prompt stays free of personal context.
    // The digest skips the turns build() already sends, so nothing goes twice.
    // It is heard speech, so it rides in the user turn, fenced as data, never in
    // the system prompt where an interviewer's words could read as instructions.
    const memoryBlock = def.tier === 'coding' || def.skipMemory
      ? ''
      : interviewMemory.digest({ skipRecent: turnsSentByBuild(mode, { transcript, userText: userText || '' }) });
    const contextBlock = buildInterviewContext(settingsForPrompt, mode, transcript, { answerTexts: spokenAnswerTexts() });
    const system = def.buildSystem ? def.buildSystem(contextBlock, rulesWithFocus(settingsForPrompt)) : (def.system || '');
    // One user turn builder for the answer, the quick start and the full
    // solution, so none of them can miss the memory or length parts.
    const buildArgs = {
      transcript,
      userText: userText || '',
      answers: mode === 'report' ? interviewMemory.answers() : [],
      architecture: settingsForPrompt.codeArchitecture,
      priorSolves: priorSolvesFor(def, mode),
      projectReport: (mode === 'fixCode' || mode === 'checkProgress') && reviewed && !walkthrough ? reviewed.report : '',
      projectTurn: mode === 'projectAsk' || mode === 'walkthroughAsk' ? askTurn({ memory: reviewed, question: userText || '' }) : '',
      walkthrough,
      pages: imageDataUrls ? imageDataUrls.length : 1,
      views
    };
    const buildTurn = (extra) => (memoryBlock ? '<interview_memory>\n' + memoryBlock + '\n</interview_memory>\n\n' : '') +
      def.build({ ...buildArgs, ...extra }) +
      (LENGTH_MODES.has(mode) ? lengthRule(settingsForPrompt.answerLength) : '');
    const built = buildTurn();

    // One model stream under its own watchdog: a provider that stalls would
    // otherwise hang the await forever, leaving state.busy = true and wedging
    // every later question until an app restart. `stage` names it in the log.
    // On failure the error carries `partial`: the text already on screen.
    const runStream = async (streamLlm, streamSystem, userTurn, stage) => {
      let watchdog = null;
      let rearm = () => {};
      let settled = false;
      let streamedAny = false;
      let streamed = '';
      let thinkingShown = false;
      const isQuick = stage === 'quick start';
      const stalled = new Promise((_res, reject) => {
        rearm = () => {
          clearTimeout(watchdog);
          const limit = isQuick ? (streamedAny ? QUICK_START_INACTIVITY_MS : QUICK_START_FIRST_WORD_MS)
            : def.tier !== 'coding' ? STREAM_INACTIVITY_MS
              : streamedAny ? CODING_STREAM_INACTIVITY_MS : CODING_FIRST_WORD_SILENCE_MS;
          watchdog = setTimeout(() => reject(new Error('the model stopped responding (timed out). Please try again.')), limit);
        };
        rearm();
      });
      const live = () => !settled && !streamSettled;
      try {
        return await Promise.race([
          streamLlm.stream({
            system: streamSystem,
            turns: [{ role: 'user', text: userTurn }],
            imageDataUrl,
            imageDataUrls,
            // Only a mode that sets its own limit; otherwise the tier's stays.
            ...(def.maxTokens ? { maxTokens: def.maxTokens } : {}),
            onToken: (t) => {
              if (!live()) return;
              if (!streamedAny && stage) console.log(`[timing] ${mode}: ${stage} first word after ${Date.now() - startedAt}ms (${streamLlm.model})`);
              firstWord(streamLlm.model); streamedAny = true; streamed += t; rearm(); send('llm:token', { text: t });
            },
            // Anthropic only: any stream event (thinking included) keeps the watchdog
            // from killing a request that is working; the thinking summary shows in the wait note.
            onActivity: () => { if (live()) rearm(); },
            onThinking: (t) => {
              if (!live() || streamedAny) return;
              if (!thinkingShown) { thinkingShown = true; console.log(`[timing] ${mode}: ${stage ? stage + ' ' : ''}thinking started after ${Date.now() - startedAt}ms (${streamLlm.model})`); }
              send('llm:thinking', { text: t });
            },
            onResponse: settings.provider === publik.PUBLIK_PROVIDER ? (res) => publikNoteHeaders(res && res.headers) : undefined
          }),
          stalled
        ]);
      } catch (e) {
        if (e && typeof e === 'object') e.partial = streamed;
        throw e;
      } finally {
        settled = true;
        clearTimeout(watchdog);
      }
    };

    // Quick start (Cmd+H only): the Smart model writes the first part of the
    // answer in seconds, then the Coding model continues below it with the same
    // names, so what the candidate already read or typed stays true.
    let quickPlan = '';
    const quick = quickStartLlm(mode, settings, llm);
    if (quick) {
      const quickBuilt = buildTurn({ quickStart: 'plan' });
      try {
        quickPlan = (await runStream(quick, system, quickBuilt, 'quick start')).trim();
      } catch (e) {
        // The full answer still comes; the quick start is only a head start.
        // Words already shown stay the quick part, so the full solution goes
        // below them in its own section instead of running on from a cut-off line.
        quickPlan = String((e && e.partial) || '').trim();
        console.log(`[timing] ${mode}: quick start failed after ${Date.now() - startedAt}ms (${quick.model})${quickPlan ? ', keeping the part shown' : ''}: ${e && e.message ? e.message : String(e)}`);
      }
      if (quickPlan && !libraryFirst) send('llm:section', { label: 'Full solution' });
    }
    // A saved solution the Fast model called the same task replaces the Coding model solve.
    const library = libraryFirst ? await libraryLookup : null;
    const saved = library && library.hit;
    if (quickPlan && libraryFirst) send('llm:section', { label: saved ? savedSolutionLabel(saved) : 'Full solution' });
    else if (saved) send('llm:tag', { label: savedSolutionLabel(saved) });
    let answer = '';
    if (saved) {
      firstWord('saved solution');
      for (const chunk of saved.solution.match(/\S+\s*/g) || []) send('llm:token', { text: chunk });
      answer = saved.solution;
      codingLibrary.markUsed(saved.id);
      if (questionEpoch === epochAtStart) currentLibraryId = saved.id;
    } else {
      const fullBuilt = quickPlan ? buildTurn({ quickPlan }) : built;
      try {
        answer = await runStream(llm, system, fullBuilt, quick ? 'full solution' : '');
      } catch (e) {
        // The quick start is on screen and may already be typed: keep it for Check and Explain.
        if (quickPlan && !def.notAnswer) interviewMemory.addAnswer({ mode, text: quickPlan, generation: memoryGeneration, ts: startedAt });
        throw e;
      }
    }
    send('llm:done', {});
    // A progress check that found cue's saved solution wrong: solve it fresh next time.
    if (mode === 'checkProgress' && currentLibraryId && questionEpoch === epochAtStart) {
      const verdict = checkVerdict(answer);
      if (verdict.wrong) codingLibrary.flag(currentLibraryId, verdict.reason);
      // The model drifted from the verdict wording: say so, or a wrong saved solution is reused unnoticed.
      else if (!verdict.found) console.log('[library] progress check: no verdict line found, saved solution not judged');
    }
    // Quick start and full solution are one plan to later progress checks.
    if (quickPlan) answer = quickPlan + '\n\n' + answer;
    // A fresh solve is filed, whole (quick start included), for the next time this question comes.
    // Not awaited: the answer is done, and waiting for the Fast model's reading
    // here would keep cue busy (every key ignored) for up to its timeout.
    if (libraryLookup && !saved) {
      const solution = answer;
      Promise.resolve(library || libraryLookup).then((found) => {
        const item = found.task ? codingLibrary.save({ ...found.task, id: found.replaceId, solution }) : null;
        if (item && questionEpoch === epochAtStart) currentLibraryId = item.id;
      }).catch((e) => console.log(`[library] could not save the solve: ${e && e.message ? e.message : String(e)}`));
    }
    if (!def.notAnswer) interviewMemory.addAnswer({ mode, text: answer, generation: memoryGeneration, ts: startedAt });
    // The question a spoken answer replied to: the heard one, else the interviewer's newest turn.
    if (LENGTH_MODES.has(mode)) prepareFollowUps(answeredQuestion(mode, userText, transcript), answer, memoryGeneration);
    // Streams settle after their headers, so the charge is reconciled from
    // GET /wallet shortly after the answer — one request per answer, debounced.
    if (settings.provider === publik.PUBLIK_PROVIDER) publikScheduleWalletRefresh();
  } catch (e) {
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
// A long interviewer turn that ends on a statement: is a question in it waiting
// for an answer? (renderer.js finalizeQuestion, src/turn-check.js)
ipcMain.handle('turn:check', async (_e, text) => {
  if (typeof text !== 'string' || !text.trim()) return noAnswer();
  const llm = createLLM({ ...store.getSettings(), smart: false });
  if (!llm.ready) return noAnswer();
  const startedAt = Date.now();
  const verdict = await checkTurn({ llm, text });
  console.log(`[timing] turn check: ${verdict.answer ? 'answer' : 'wait'} after ${Date.now() - startedAt}ms`);
  return verdict;
});
// The interviewer went on right after cue answered: do the added words ask for
// anything that answer did not cover? (renderer.js answerContinuation, src/continuation-check.js)
// The renderer sends the answer it showed for `asked` ('' when it failed), so
// the check never compares against another question's answer.
ipcMain.handle('turn:continuation', async (_e, payload) => {
  const field = (key) => (payload && typeof payload[key] === 'string' ? payload[key] : '');
  const asked = field('asked');
  const added = field('added');
  if (!added.trim()) return { answer: false, question: '' };
  const llm = createLLM({ ...store.getSettings(), smart: false });
  if (!llm.ready) return { answer: true, question: wholeQuestion(asked, added) };
  const startedAt = Date.now();
  const verdict = await checkContinuation({ llm, asked, added, answer: field('answer') });
  console.log(`[timing] continuation check: ${verdict.answer ? 'answer again' : 'already covered'} after ${Date.now() - startedAt}ms`);
  return verdict;
});
registerSetupIpc({
  ipcMain,
  send,
  deps: () => {
    const settings = () => store.getSettings();
    return {
      llmFor: (tier) => (tier === 'coding' ? createLLM(settings(), { tier: 'coding' }) : createLLM({ ...settings(), smart: tier === 'smart' })),
      quickAsk,
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
registerProjectsIpc({ ipcMain, store, createLLM, quickAsk, send });
registerCodingLibraryIpc({ ipcMain, codingLibrary });
const recording = registerRecordingIpc({ ipcMain, store, dialog, shell, screen, getWin: () => win });
registerProjectReviewIpc({
  ipcMain, createLLM, getSettings: () => store.getSettings(), send, state, projectMemory,
  answerSystem: () => {
    const settings = store.getSettings();
    return MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', [], { answerTexts: spokenAnswerTexts() }), rulesWithFocus(settings));
  },
  userDataDir: app.getPath('userData'),
  cloneDir: path.join(app.getPath('userData'), 'cue-projects')
});
ipcMain.handle('practice:start', () => practice.start());
ipcMain.handle('practice:next', () => practice.next());
ipcMain.handle('practice:end', () => practice.end());
ipcMain.on('practice:played', (_e, token) => practice.played(token));
ipcMain.handle('prepared:run', () => prepareAnswers({ force: true }));

// -------- publik API (src/ipc/publik.js) --------
const { publikNoteHeaders, publikScheduleWalletRefresh, publikHandleErrorAction } =
  registerPublikIpc({ ipcMain, app, shell, store, send, recordEvent, publikBuild });

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
const rounds = registerRoundsIpc({
  ipcMain, store, createLLM, interviewMemory, send,
  schedulePrepare, preparedState, clearInterview
});
// Boot: refill the history list from memory. Deliberately not replayed through
// 'transcript' events, which would refill the input and could auto-answer an old question.
ipcMain.handle('memory:state', () => ({ ...interviewMemory.summary(), turns: interviewMemory.turns() }));
ipcMain.on('ask', (_e, payload) => runFeature(payload.mode, payload.text, { fromPanel: true, heard: typeof payload.heard === 'string' ? payload.heard.slice(0, 8000) : '' }));
ipcMain.on('question:next', () => nextQuestion());
ipcMain.on('script:active', (_e, on) => { scriptActive = !!on; });
// Check it: the Smart model reviews a teleprompter script (src/script-review.js).
ipcMain.handle('script:review', async (_e, script) => {
  try {
    const settings = store.getSettings();
    return await reviewScript({
      script: String(script || '').slice(0, MAX_SCRIPT_CHARS),
      background: [settings.resumeText, settings.starStories].filter(Boolean).join('\n\n'),
      llm: createLLM({ ...settings, smart: true }),
      quickAsk
    });
  } catch (e) {
    return { error: e && e.message ? e.message : String(e) };
  }
});
ipcMain.on('mic:pcm', (_e, arrayBuffer) => { if (state.capturing) routeAudio('you', arrayBuffer); });
ipcMain.on('system:pcm', (_e, arrayBuffer) => { if (state.capturing) routeAudio('them', arrayBuffer); });
ipcMain.on('mouse:ignore', (_e, v) => { if (win) win.setIgnoreMouseEvents(!!v, { forward: true }); });
// Only the system settings panes cue links to (Screen Recording, Microphone):
// a renderer string never reaches the OS as any other kind of address.
const SETTINGS_PANE_RE = /^(x-apple\.systempreferences:com\.apple\.preference\.[a-z.]+(\?[A-Za-z_]+)?|ms-settings:[a-z-]+)$/;
ipcMain.on('open-pane', (_e, url) => {
  if (typeof url !== 'string' || !SETTINGS_PANE_RE.test(url)) return;
  shell.openExternal(url).catch(() => {});
});
ipcMain.on('app:quit', () => app.quit());
// Renderer log lines, cut to one short line so the log cannot be flooded or forged.
ipcMain.on('log', (_e, msg) => console.log('[renderer]', String(msg).replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, 2000)));
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
  // While a coding question is being read, Cmd+H again stops reading and solves.
  // Pressed again after reading ended on its own, it says so instead of doing nothing.
  shortcutState.leetcode = globalShortcut.register('CommandOrControl+H', () => {
    if (scrollReader) scrollReader.finish();
    else if (state.busy) send('status', { message: 'Already answering. It shows here in a moment.' });
    else runFeature('leetcode', '');
  });
  shortcutState.hide = globalShortcut.register('CommandOrControl+Shift+/', () => send('hide:toggle', {}));
  // H for hide, next to Cmd+H for solve: easier to remember than Cmd+Shift+/,
  // which stays for anyone already used to it. Both do the same thing.
  shortcutState.hideAlt = globalShortcut.register('CommandOrControl+Shift+H', () => send('hide:toggle', {}));
  shortcutState.quit = globalShortcut.register('CommandOrControl+Shift+X', () => app.quit());
  shortcutState.length = globalShortcut.register('CommandOrControl+Shift+.', cycleAnswerLength);
  shortcutState.buyTime = globalShortcut.register('CommandOrControl+Shift+B', () => runFeature('buyTime', ''));
  // E for explain: the words to walk the interviewer through the code just written.
  shortcutState.explainCode = globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (state.busy) send('status', { message: 'Already answering. Press it again when this answer is done.' });
    else runFeature('explainCode', '');
  });
  // Move cue without the mouse: in a screen share the pointer always shows, and
  // dragging an invisible window makes it wander for no visible reason.
  const moveMods = isMac ? 'Control+Alt+Command+' : 'Control+Alt+Shift+';
  // One entry per key, so a report names the exact key another app holds.
  for (const [key, dir] of [['Left', 'left'], ['Right', 'right'], ['Up', 'up'], ['Down', 'down']]) {
    shortcutState['move' + key] = globalShortcut.register(moveMods + key, () => nudgeWindow(dir));
  }
  // Scroll the answer from the keyboard too: U up, D down; C copies the code in
  // view. With these, the pointer never has to leave the IDE.
  shortcutState.scrollUp = globalShortcut.register(moveMods + 'U', () => send('answer:scroll', { direction: 'up' }));
  shortcutState.scrollDown = globalShortcut.register(moveMods + 'D', () => send('answer:scroll', { direction: 'down' }));
  shortcutState.copyCode = globalShortcut.register(moveMods + 'C', () => send('code:copy'));
  // F for fix: read the error on screen and give the fixed file at once.
  shortcutState.fixCode = globalShortcut.register(moveMods + 'F', () => runFeature('fixCode', ''));
  // L: reading while scrolling on or off (the Settings switch is the taught way).
  shortcutState.scrollReading = globalShortcut.register(moveMods + 'L', toggleScrollReading);
  // H: the panel follows the voice through the answer on screen, or stops (any answer, code too).
  shortcutState.followAnswer = globalShortcut.register(moveMods + 'H', () => send('follow:toggle'));
  // G for gather: add this tab of the question without solving. N for next
  // question: forget the last question's screens and code.
  shortcutState.gather = globalShortcut.register(moveMods + 'G', gatherView);
  shortcutState.nextQuestion = globalShortcut.register(moveMods + 'N', nextQuestion);
  // A for answer all: read a page of written questions while the candidate
  // scrolls it (an application form, a recorded-video page), press again to
  // answer every one in order. Ends only its own reading, never a Cmd+H one.
  shortcutState.screenQuestions = globalShortcut.register(moveMods + 'A', () => {
    if (scrollReader && scrollReaderPurpose === 'questions') scrollReader.finish();
    else if (scrollReader) send('status', { message: `Still reading a coding question. Press ${cmdH} to finish it first.` });
    else if (gathering) send('status', { message: 'Still adding the last view. Press again in a moment.' });
    else if (state.busy) send('status', { message: 'Already answering. It shows here in a moment.' });
    else runFeature('screenQuestions', '');
  });
  // C for check: what is done on screen, anything wrong, and the next step.
  shortcutState.checkProgress = globalShortcut.register('CommandOrControl+Shift+C', () => runFeature('checkProgress', ''));
  for (const [name, wasRegistered] of Object.entries(shortcutState)) {
    if (!wasRegistered) {
      recordEvent({ level: 'warn', event: 'shortcut_unavailable', msg: 'another application holds the ' + name + ' shortcut', frame: 'registerShortcuts', context: { shortcut: name } });
    }
  }
}

// -------- permissions window (the checks are in src/permissions.js) --------
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
  // Build the prepared answers if the profile changed since the last run, then
  // any other profile's that are missing.
  prepareAnswers({ force: false }).then(prepareOtherProfiles, prepareOtherProfiles);
  // An interview left open too long to continue is kept as a round of its profile.
  // After the window loads, so the status line that reports it is there to show.
  const staleInterview = interviewMemory.takeStale();
  if (staleInterview) win.webContents.once('did-finish-load', () => rounds.saveStaleRound(staleInterview));
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
  isActive: () => state.capturing && !state.busy && !gathering && !scriptActive && !practice.isActive() && !!store.getSettings().watchScreen && !!win && !win.isDestroyed(),
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
  onDetect: (detection) => {
    if (detection.kind === 'coding') {
      send('status', { message: 'Coding task on screen: solving it.' });
      // Like Cmd+H: a fresh read of the screen joins the question bundle, so
      // the solve also sees every tab gathered for this question. One screen:
      // the candidate did not press anything, so nobody is scrolling for cue.
      runFeature('leetcode', '', { oneShot: true });
    } else {
      // Same path as a heard question: history, memory, then the auto-answer.
      publishTranscript('them', detection.text);
    }
  }
});

// -------- lifecycle --------
// cue's windows only ever show its own pages: nothing in them may navigate
// away or open a new window, whatever text a model or a website put in them.
app.on('web-contents-created', (_e, contents) => {
  // A company page drawn for research may move itself to its own next page;
  // its window is sandboxed and can only reach the internet through the proxy.
  contents.on('will-navigate', (event) => { if (!isRenderContents(contents)) event.preventDefault(); });
  contents.setWindowOpenHandler(() => ({ action: 'deny' }));
});

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

app.on('will-quit', () => { globalShortcut.unregisterAll(); recording.reset(); });
app.on('window-all-closed', (e) => {
  // Don't quit while the permissions window is open — the user may be in System Settings
  if (permWin) { e.preventDefault(); return; }
  app.quit();
});
