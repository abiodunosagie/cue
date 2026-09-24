// Follow-ups ready: after each spoken answer, one background Smart call writes
// the two follow-up questions this interviewer is most likely to ask next
// ("what would you do differently?", "how did you measure that?") with the
// spoken answer to each. When one is asked, its answer is on screen at once,
// like a prepared answer. Session only: never written to disk, dropped when
// the interview memory is cleared.

const MAX_ITEMS = 6;           // the follow-ups to the last three answers
const FOLLOW_UP_TIMEOUT_MS = 60000;
const FOLLOW_UP_MAX_TOKENS = 1500;

function followUpPrompt(question, answer) {
  return 'This time there is no new question to answer. Apply every rule above about voice, length and using only the candidate\'s real stories.\n\n' +
    'The interviewer asked:\n<question>\n' + question + '\n</question>\n\n' +
    'The candidate answered out loud:\n<answer>\n' + answer + '\n</answer>\n\n' +
    'Write the 2 follow-up questions this interviewer is most likely to ask next about that answer, 3 other ways each might be phrased, ' +
    'and the answer the candidate should say to each, consistent with what they just said.\n\n' +
    'Reply with JSON only, no prose and no code fence: an array of objects {"question": string, "variants": [string], "answer": string}.';
}

function createFollowUpBank({ max = MAX_ITEMS } = {}) {
  let items = [];
  return {
    // Newest first; items made for an interview that has since been cleared
    // (generation changed) are dropped by the caller before this.
    add(newItems) { items = [...newItems, ...items].slice(0, max); },
    items() { return items.slice(); },
    clear() { items = []; }
  };
}

module.exports = { followUpPrompt, createFollowUpBank, FOLLOW_UP_TIMEOUT_MS, FOLLOW_UP_MAX_TOKENS };
