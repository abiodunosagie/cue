// The practice interview's flow: ask a question, wait for it to finish
// playing, publish it as the interviewer's turn, score the spoken answer, move
// on, and at the end show the report and clear the practice from memory.
// Everything outside (IPC, speech, memory, settings) comes in as functions, so
// the flow is testable without Electron.

const { pickQuestions, scoreAnswer, formatReport } = require('./practice');
const { isEcho } = require('../renderer/reading-tracker');

// The practice voice is also heard as meeting audio. The question is published
// as text instead, so the transcribed copy is dropped while it plays and briefly after.
const ECHO_MS = 3000;
// If the renderer never reports the question finished (speech engines can drop
// their end event), carry on as if it had.
const PLAY_TIMEOUT_MS = 45000;
const REPORT_WAIT_MS = 60000;

function createPracticeSession(deps) {
  const {
    send, publishQuestion, getSettings, synthesize, transcript, isCapturing, isBusy,
    memoryIsEmpty, clearInterview, preparedQuestions, markActive,
    now = Date.now, setTimer = setTimeout, clearTimer = clearTimeout
  } = deps;
  const s = { active: false, questions: [], index: -1, askedAt: 0, results: [], hearing: false, hideThemUntil: 0, token: 0 };
  let playTimer = null;

  function state() {
    return { active: s.active, index: s.index, total: s.questions.length, question: s.questions[s.index] || '', hearing: s.hearing };
  }

  // True for an interviewer turn that is really the practice voice.
  function hidesTurn(turn) {
    return s.active && turn.channel === 'them' && (s.hearing || now() < s.hideThemUntil);
  }

  function start() {
    if (s.active) return state();
    if (!isCapturing()) return { error: 'Start listening first, so cue can hear your answers.' };
    if (!memoryIsEmpty()) {
      return { error: 'Clear interview memory first (History). Practice starts empty and clears itself when it ends, so a real interview never sees practice questions.' };
    }
    Object.assign(s, { active: true, questions: pickQuestions(preparedQuestions()), index: -1, results: [], hearing: false, hideThemUntil: 0 });
    markActive(true);
    ask();
    return state();
  }

  // Each question gets a token; anything that resolves for an older question
  // (a slow voice clip, a late "played" report) is ignored.
  async function ask() {
    s.index++;
    if (s.index >= s.questions.length) { finish(); return; }
    const token = ++s.token;
    const question = s.questions[s.index];
    s.hearing = true;
    s.askedAt = now();
    send('practice:state', state());
    clearTimer(playTimer);
    playTimer = setTimer(() => played(token), PLAY_TIMEOUT_MS);
    const settings = getSettings();
    const apiKey = settings.apiKeys && settings.apiKeys.elevenlabs;
    if (apiKey) {
      try {
        const audio = await synthesize({ apiKey, voice: settings.practiceVoice, text: question });
        if (token !== s.token || !s.active) return;
        send('practice:play', { token, text: question, audio: audio.toString('base64') });
        return;
      } catch (e) {
        if (token !== s.token || !s.active) return;
        send('status', { message: (e && e.message ? e.message : 'The ElevenLabs voice failed.') + ' Using the system voice instead.' });
      }
    }
    if (token === s.token && s.active) send('practice:play', { token, text: question });
  }

  // The question finished playing: now it counts as asked.
  function played(token) {
    if (!s.active || !s.hearing || token !== s.token) return;
    clearTimer(playTimer);
    s.hearing = false;
    s.hideThemUntil = now() + ECHO_MS;
    s.askedAt = now();
    send('practice:state', state());
    publishQuestion(s.questions[s.index]);
  }

  // What the candidate said since the question was asked, minus any turn that
  // is the practice voice picked up by the mic.
  function score() {
    const question = s.questions[s.index];
    if (!question) return;
    const settings = getSettings();
    const answer = transcript()
      .filter((t) => t.channel === 'you' && t.ts >= s.askedAt && !isEcho(t.text, question))
      .map((t) => t.text).join(' ');
    const reference = [settings.resumeText, settings.jobDescription, settings.starStories, settings.workStyle].join('\n');
    s.results.push(scoreAnswer({ question, answer, reference, length: settings.answerLength }));
  }

  // Next while the question is still playing skips it without a score.
  function next() {
    if (!s.active) return state();
    if (!s.hearing) score();
    ask();
    return state();
  }

  function end() {
    if (!s.active) return state();
    if (!s.hearing) score();
    finish();
    return state();
  }

  function finish() {
    s.active = false;
    s.hearing = false;
    s.token++;
    clearTimer(playTimer);
    send('practice:state', state());
    const report = formatReport(s.results);
    const started = now();
    // Wait for an answer still streaming, so the report does not interleave with it.
    const show = () => {
      if (isBusy() && now() - started < REPORT_WAIT_MS) { setTimer(show, 500); return; }
      // The report reuses the answer channel so it renders like an answer.
      send('llm:start', { userBubble: 'Practice report', small: false });
      send('llm:token', { text: report });
      send('llm:done', {});
      send('practice:cleared', clearInterview());
      markActive(false);
    };
    show();
  }

  return { start, next, end, played, hidesTurn, state, isActive: () => s.active };
}

module.exports = { createPracticeSession, ECHO_MS, PLAY_TIMEOUT_MS };
