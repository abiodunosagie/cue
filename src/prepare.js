// Prepared answers: the job's likely questions answered before the interview,
// for every profile, and the follow-ups of this interview's answers, so a heard
// question that matches one shows its answer at once (src/prepared-answers.js,
// src/follow-ups.js). Main passes in its stores and helpers.
const Profiles = require('./profiles');
const { MODES } = require('./prompts');
const { buildInterviewContext } = require('./interview-context');
const { rulesWithFocus } = require('./role-focus');
const { quickAsk } = require('./quick-ask');
const { normalizeLength } = require('../renderer/answer-length');
const { profileHash, canPrepare, parseItems, findMatch, confirmSameQuestion, PREPARE_INSTRUCTIONS, PREPARE_MAX_TOKENS } = require('./prepared-answers');
const { followUpPrompt, FOLLOW_UP_TIMEOUT_MS, FOLLOW_UP_MAX_TOKENS } = require('./follow-ups');

const PREPARE_TIMEOUT_MS = 180000;
const PREPARE_DEBOUNCE_MS = 3000;

// getTranscript(): the live transcript; spokenAnswerTexts(): the answers given, for the "already used" note.
function createPrepare({ store, createLLM, preparedStore, followUps, projectMemory, interviewMemory, send, recordEvent, getTranscript, spokenAnswerTexts }) {
  const preparing = { running: false, error: '' };
  let prepareTimer = null;

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

  // Questions with spoken answers, written with the candidate's context in the
  // system prompt exactly as for a live answer, so they follow the same voice,
  // length and no-invented-stories rules. Used for the prepared bank and follow-ups.
  async function askForItems({ llm, settings, turns, prompt, maxTokens, timeoutMs }) {
    const system = MODES.answerThis.buildSystem(buildInterviewContext(settings, 'answerThis', turns, { answerTexts: spokenAnswerTexts() }), rulesWithFocus(settings));
    return parseItems(await quickAsk({ llm, system, text: prompt, maxTokens, timeoutMs }));
  }

  // One Smart call writes the likely questions and their spoken answers, with the
  // same context and rules as a live answer. Skipped when the bank already matches
  // the profile, unless forced from Settings.
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
      const items = await bankItems(llm, settings);
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

  // The likely questions and answers for one profile's settings; throws when the
  // model gave nothing usable.
  async function bankItems(llm, settings) {
    const items = await askForItems({ llm, settings, turns: [], prompt: PREPARE_INSTRUCTIONS, maxTokens: PREPARE_MAX_TOKENS, timeoutMs: PREPARE_TIMEOUT_MS });
    if (!items.length) throw new Error('the model did not return usable answers');
    return items;
  }

  // Every other job profile gets its bank too, one at a time after the active
  // one, so switching profile right before an interview finds answers ready.
  // Shares the running flag with prepareAnswers, so only one bank is built at a
  // time; a profile that fails is tried again at the next launch.
  // activeTried: the active profile's bank was just attempted; if it still is
  // not current (the model failed), carry on with the others instead of retrying it.
  async function prepareOtherProfiles({ activeTried = false } = {}) {
    if (preparing.running) return;
    preparing.running = true;
    let stoppedForActive = false;
    try {
      for (const name of Profiles.names(store.getSettings())) {
        const current = store.getSettings();
        // The active profile comes first: when it needs a bank (it was edited, or
        // just switched to), stop here; the finally below builds it at once.
        if (!activeTried && canPrepare(current) && !preparedStore.isCurrent(profileHash(current))) { stoppedForActive = true; break; }
        if (name === current.activeProfile) continue;
        let settings;
        try { settings = { ...current, ...Profiles.switchTo(current, name).fields }; } catch { continue; }
        const hash = profileHash(settings);
        if (!canPrepare(settings) || preparedStore.isCurrent(hash)) continue;
        const llm = createLLM({ ...settings, smart: true });
        if (!llm.ready) return;
        try {
          const items = await bankItems(llm, settings);
          preparedStore.replace(hash, items);
          console.log(`[prepared] ${items.length} answers ready for the ${name} profile`);
        } catch (e) {
          recordEvent({ level: 'error', event: 'prepare_failed', msg: e && e.message ? e.message : String(e), frame: 'prepareOtherProfiles', context: { provider: settings.provider } });
        }
      }
    } finally {
      preparing.running = false;
      // The active profile needs its bank (edited meanwhile, or the loop stopped
      // for it): build it now, then carry on with the others.
      if (stoppedForActive) prepareAnswers({ force: false }).then(() => prepareOtherProfiles({ activeTried: true }), () => {});
      else if (!preparedStore.isCurrent(profileHash(store.getSettings()))) schedulePrepare();
    }
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
    const screen = mode === 'walkthroughAnswer';
    if ((mode !== 'answerThis' && !screen) || normalizeLength(settings.answerLength) !== 'medium') return null;
    // The job's prepared bank, the walkthrough's likely questions and this
    // interview's follow-ups: the closest match wins.
    const project = projectMemory.get();
    const candidates = [
      preparedStore.match(userText || '', profileHash(settings)),
      project && project.purpose === 'walkthrough' ? findMatch(project.qa, userText || '') : null,
      findMatch(followUps.items(), userText || '')
    ].filter(Boolean);
    const match = candidates.reduce((best, m) => (!best || m.score > best.score ? m : best), null);
    if (!match) return null;
    if (match.direct) return match.item;
    // A question about the screen that is only close to a saved one is answered
    // from the screen: the saved answer may be about another file.
    if (screen) return null;
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
      const items = await askForItems({ llm, settings, turns: getTranscript(), prompt: followUpPrompt(question, answer), maxTokens: FOLLOW_UP_MAX_TOKENS, timeoutMs: FOLLOW_UP_TIMEOUT_MS });
      if (items.length && generation === interviewMemory.generation()) followUps.add(items);
    } catch (e) {
      recordEvent({ level: 'warn', event: 'follow_ups_failed', msg: e && e.message ? e.message : String(e), frame: 'prepareFollowUps', context: {} });
    }
  }

  return { preparedState, prepareAnswers, prepareOtherProfiles, schedulePrepare, findPreparedAnswer, prepareFollowUps };
}

module.exports = { createPrepare };
