// Who is talking right now, in a meeting at the user's job. The user clicks a
// colleague's button in the panel; every turn heard from the meeting after
// that is that colleague's until another button is clicked. Interview
// profiles never tag anything. Pure apart from its own state.

const Work = require('./work');

function createWorkSession() {
  let speakerId = '';

  // id '' = everyone (a group conversation, nobody in particular).
  function setSpeaker(settings, id) {
    const want = String(id || '');
    speakerId = want && Work.findColleague(settings, want) ? want : '';
    return speaker(settings);
  }

  // The selected colleague, or null for everyone. A colleague deleted in
  // Settings since the click no longer counts.
  function speaker(settings) {
    if (!Work.isWork(settings)) return null;
    return Work.findColleague(settings, speakerId);
  }

  // A heard meeting turn, tagged with who said it. Only 'them' turns: the
  // user's own words are theirs.
  function tag(turn, settings) {
    if (!turn || turn.channel !== 'them' || !Work.isWork(settings)) return turn;
    const c = speaker(settings);
    return c ? { ...turn, speakerId: c.id, who: c.name + ', ' + Work.roleLabel(c.role) } : turn;
  }

  function reset() { speakerId = ''; }

  return { setSpeaker, speaker, tag, reset };
}

module.exports = { createWorkSession };
