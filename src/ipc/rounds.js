// IPC for interview rounds: what an interview taught is kept in the job
// profile it was for, so the next round with that company builds on it
// (src/rounds.js). Main passes in what these need.
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
    const notes = await summarizeRound({ llm, turns, companyNotes: settings.companyNotes });
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
    // The panel's copy of the settings is saved whole on Done: it must hold the new notes.
    const saved = store.getSettings();
    send('rounds:saved', { activeProfile: saved.activeProfile, roundNotes: saved.roundNotes });
    // The prepared answers now build on this round too.
    schedulePrepare();
    send('prepared:state', preparedState());
    return store.getSettings().roundNotes;
  }
  const sameInterview = (a, b) => !!a && a.startedAt === b.startedAt && a.turnCount === b.turnCount;
  const alreadySaved = (summary) => sameInterview(roundSaved, summary) || sameInterview(roundSaving, summary);

  ipcMain.handle('rounds:save', async () => {
    const summary = interviewMemory.summary();
    const turns = interviewMemory.turns();
    if (!canSummarize(turns)) return { error: 'This interview is too short to learn from yet.' };
    if (alreadySaved(summary)) return { error: 'This interview is already saved as a round.' };
    try {
      const roundNotes = await saveRound(turns, store.getSettings().activeProfile, summary);
      return { roundNotes };
    } catch (e) {
      return { error: e && e.message ? e.message : String(e) };
    }
  });

  // Clear interview: a real interview not saved yet is kept as a round of the
  // active profile first, in the background, so nothing it taught is lost.
  ipcMain.handle('transcript:clear', () => {
    const summary = interviewMemory.summary();
    const turns = interviewMemory.turns();
    const profileName = store.getSettings().activeProfile;
    if (canSummarize(turns) && !alreadySaved(summary)) {
      send('status', { message: `Saving what this interview taught to the ${profileName} profile...` });
      saveRound(turns, profileName, summary).then(
        () => send('status', { message: `Saved this interview as a round of the ${profileName} profile.` }),
        (e) => send('status', { message: 'This interview could not be saved as a round: ' + (e && e.message ? e.message : String(e)) }));
    }
    return clearInterview();
  });
}

module.exports = { registerRoundsIpc };
