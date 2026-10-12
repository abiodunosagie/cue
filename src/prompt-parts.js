// The pieces every mode's prompt is built from, shared by src/prompts.js
// (interview modes) and src/work-modes.js (work modes).

const { appendAiRules } = require('./profile-context');

// How a transcript turn is labelled for the model: the user is "You", everyone
// else "Them", with the colleague's name and role when one was marked (work mode).
function turnLabel(t) {
  if (t.channel !== 'them') return 'You: ';
  return t.who ? 'Them (' + t.who + '): ' : 'Them: ';
}

function formatTranscript(turns, limit) {
  const recent = limit ? turns.slice(-limit) : turns;
  return recent.map((t) => turnLabel(t) + t.text).join('\n');
}

// The heard question is also the newest interviewer turn(s); answerThis leaves
// those out of the context so the model sees it once, as the thing to answer.
function withoutHeardQuestion(transcript, question) {
  const q = question || '';
  const turns = (transcript || []).slice();
  while (turns.length && turns[turns.length - 1].channel === 'them' && q.includes(turns[turns.length - 1].text.trim())) turns.pop();
  return turns;
}

function buildSystem(base, contextBlock) {
  if (!contextBlock) return base;
  return contextBlock + '\n\n' + base;
}

// Apply AI rules to a system prompt if the mode wants them. LeetCode returns
// the prompt unchanged: code answers should stay strict regardless of how the
// user wants the AI to chat.
function applyRules(prompt, aiRules, mode) {
  if (mode === 'leetcode') return prompt;
  return appendAiRules(prompt, aiRules);
}

module.exports = { turnLabel, formatTranscript, withoutHeardQuestion, buildSystem, applyRules };
