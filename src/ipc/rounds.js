// IPC for interview rounds: what an interview taught is kept in the job
// profile it was for, so the next round with that company builds on it
// (src/rounds.js). Also the Clear interview handler, which saves the round
// first, then clears. Main passes in what these need.
const { summarizeRound, appendRound, canSummarize } = require('../rounds');

function registerRoundsIpc({ ipcMain, store, createLLM, interviewMemory, send, schedulePrepare, preparedState, clearInterview }) {
  // roundSaved marks the interview already saved, so Clear does not save it twice.
  let roundSaved = { startedAt: 0, turnCount: 0 };
  // The interview being saved right now, so Save and then Clear cannot save it twice.
  let roundSaving = null;
  async function saveRound(turns, profileName, summary) {
    roundSaving = { startedAt: summary.startedAt, turnCount: summary.turnCount };
    try { return await writeRound(turns, profileName, summary); } finally { roundSaving = null; }
  }
  async function writeRound(turns, profileName, summary) {
    const settings = store.getSettings();
    const llm = createLLM({ ...settings, smart: true });
    // What is known about that interview's company, which is not the active profile's when they differ.
    const target = settings.activeProfile === profileName ? settings : ((settings.profiles || {})[profileName] || {});
    const notes = await summarizeRound({ llm, turns, companyNotes: target.companyNotes });
    const now = store.getSettings();
    if (now.activeProfile === profileName) {
      store.setSettings({ roundNotes: appendRound(now.roundNotes, notes) });
    } else if (now.profiles && Object.prototype.hasOwnProperty.call(now.profiles, profileName)) {
      // The profile was switched while the notes were written: they go to the one the interview was for.
      const profile = now.profiles[profileName];
      store.setProfileState({ profiles: { ...now.profiles, [profileName]: { ...profile, roundNotes: appendRound(profile.roundNotes, notes) } }, activeProfile: now.activeProfile, fields: {} });
    } else {
      throw new Error('The profile ' + profileName + ' is gone, so this round was not kept.');
    }
    roundSaved = { startedAt: summary.startedAt, turnCount: summary.turnCount };
    interviewMemory.markRoundSaved(summary.startedAt);
    // The panel's copy of the settings is saved whole on Done: it must hold the new notes.
    const saved = store.getSettings();
    send('rounds:saved', { activeProfile: saved.activeProfile, roundNotes: saved.roundNotes });
    // The prepared answers now build on this round too.
    schedulePrepare();
    send('prepared:state', preparedState());
    return store.getSettings().roundNotes;
  }
  const sameInterview = (a, b) => !!a && a.startedAt === b.startedAt && a.turnCount === b.turnCount;
  const alreadySaved = (summary) => !!summary.roundSaved || sameInterview(roundSaved, summary) || sameInterview(roundSaving, summary);
  // The profile an interview belongs to: the one in use when it started, else the active one.
  const profileOf = (summary) => summary.profile || store.getSettings().activeProfile;
  // In the background, with the outcome on the status line.
  function saveInBackground(turns, profileName, summary, lead) {
    send('status', { message: `${lead}Saving what the interview taught to the ${profileName} profile...` });
    return saveRound(turns, profileName, summary).then(
      () => send('status', { message: `Saved the interview as a round of the ${profileName} profile.` }),
      (e) => send('status', { message: 'The interview could not be saved as a round: ' + (e && e.message ? e.message : String(e)) }));
  }

  ipcMain.handle('rounds:save', async () => {
    const summary = interviewMemory.summary();
    const turns = interviewMemory.turns();
    if (!canSummarize(turns)) return { error: 'This interview is too short to learn from yet.' };
    if (alreadySaved(summary)) return { error: 'This interview is already saved as a round.' };
    try {
      const roundNotes = await saveRound(turns, profileOf(summary), summary);
      return { roundNotes };
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });

  // Clear interview: a real interview not saved yet is kept as a round of its
  // own profile first, in the background, so nothing it taught is lost.
  ipcMain.handle('transcript:clear', () => {
    const summary = interviewMemory.summary();
    const turns = interviewMemory.turns();
    if (canSummarize(turns) && !alreadySaved(summary)) saveInBackground(turns, profileOf(summary), summary, '');
    return clearInterview();
  });

  // At launch: an interview left too old to continue (src/interview-memory.js)
  // is kept as a round of the profile it was recorded under, not dropped. One
  // from before interviews knew their profile is left alone: its profile is unknown.
  function saveStaleRound(record) {
    if (!record || record.roundSaved || !record.profile || !canSummarize(record.turns)) return null;
    const summary = { startedAt: record.startedAt, turnCount: record.turns.length, profile: record.profile, roundSaved: false };
    return saveInBackground(record.turns, record.profile, summary, 'Your last interview was left open. ');
  }

  return { saveStaleRound };
}

module.exports = { registerRoundsIpc };
