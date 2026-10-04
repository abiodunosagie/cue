// The question a spoken answer replies to: the heard question for answerThis,
// else the interviewer's newest turn (say and assist read the conversation).
// Used to route a heard question and to write the follow-ups to an answer.
//
// Do not bring back a first line from the Fast model ahead of the answer: it
// knows nothing about the candidate, so its first-person sentence claimed
// experience the Smart answer then took back ("I've built several production
// serverless architectures... Not on AWS itself", interview of 2026-10-04).

const SPOKEN_ANSWER_MODES = new Set(['say', 'answerThis', 'assist']);

// Empty when there is nothing to answer or the mode is not a spoken answer.
function answeredQuestion(mode, userText, transcript) {
  if (!SPOKEN_ANSWER_MODES.has(mode)) return '';
  if (mode === 'answerThis') return String(userText || '').trim();
  const turns = transcript || [];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].channel === 'them' && String(turns[i].text || '').trim()) return String(turns[i].text).trim();
  }
  return '';
}

module.exports = { answeredQuestion };
