// Instant first line: while the Smart model thinks, the Fast model writes one
// natural opening sentence the candidate can start saying at once. The Smart
// answer then continues from that sentence, so the two read as one answer.
// The opener names no company, project, number or story: it only frames the
// question, so it can never contradict the story the Smart model picks.

const OPENER_MODES = new Set(['say', 'answerThis', 'assist']);
// Wait this long for the Fast model's first word before giving up on the opener.
const FIRST_TOKEN_MS = 1000;
// Hard cap on the whole opener; the Smart answer must not wait longer.
const TOTAL_MS = 2500;
const OPENER_MAX_TOKENS = 40;

const OPENER_SYSTEM =
  'You write the first sentence a candidate says out loud when answering an interview question. ' +
  'One natural, calm, first-person sentence, under 15 words, that frames the answer to come. ' +
  'Do not name any company, product, project, person, number or result, and do not start a story. ' +
  'No filler like "Great question" or "Absolutely". No quotes, no markdown. Output only the sentence.';

// The question the opener frames: the heard question for answerThis, else the
// interviewer's newest turn. Empty when there is nothing to frame.
function openerQuestion(mode, userText, transcript) {
  if (!OPENER_MODES.has(mode)) return '';
  if (mode === 'answerThis') return String(userText || '').trim();
  const turns = transcript || [];
  for (let i = turns.length - 1; i >= 0; i--) {
    if (turns[i].channel === 'them' && String(turns[i].text || '').trim()) return String(turns[i].text).trim();
  }
  return '';
}

// Tells the Smart model the answer has already begun, so it continues instead
// of opening again.
function continuationNote(opener) {
  if (!opener) return '';
  return '\n\nThe candidate has already started the answer out loud with this sentence: "' + opener + '"\n' +
    'Continue straight on from it as the same spoken answer. Do not repeat or rephrase it and do not add another introduction.';
}

// Streams the opener through onToken and resolves with its text ('' when it
// was too slow or failed). Tokens after the cap are dropped, never shown.
function runOpener({ llm, question, onToken, firstTokenMs = FIRST_TOKEN_MS, totalMs = TOTAL_MS }) {
  return new Promise((resolve) => {
    let text = '';
    let settled = false;
    let firstTimer = null;
    let totalTimer = null;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(firstTimer); clearTimeout(totalTimer);
      resolve(tidy(text));
    };
    // No first word in time: the opener is dropped entirely, nothing was shown.
    firstTimer = setTimeout(() => { if (!text) finish(); }, firstTokenMs);
    totalTimer = setTimeout(finish, totalMs);
    llm.stream({
      system: OPENER_SYSTEM,
      turns: [{ role: 'user', text: 'Interview question: ' + question }],
      maxTokens: OPENER_MAX_TOKENS,
      onToken: (t) => { if (settled) return; text += t; onToken(t); }
    }).then(finish, finish);
  });
}

function tidy(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

module.exports = { OPENER_MODES, openerQuestion, continuationNote, runOpener, FIRST_TOKEN_MS, TOTAL_MS };
