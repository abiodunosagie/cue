// Short / medium / long spoken answers, switched mid-interview with one key.
// Medium is the prompts' own length rules, unchanged; short and long override
// them for the next answers, so a quick "tell me more" gets a quick answer.

const LENGTHS = ['short', 'medium', 'long'];
const DEFAULT_LENGTH = 'medium';
const LABELS = { short: 'Short', medium: 'Medium', long: 'Long' };

const RULES = {
  short: 'LENGTH: SHORT. One or two sentences, under 35 words: the core point only, no example. This overrides every other length rule, including the intro.',
  medium: '',
  long: 'LENGTH: LONG. Five to eight sentences, about 120 to 170 words: the point, one concrete example from the candidate\'s real material, and its result. This overrides every other length rule.'
};

function normalizeLength(value) {
  return LENGTHS.includes(value) ? value : DEFAULT_LENGTH;
}

function nextLength(value) {
  const i = LENGTHS.indexOf(normalizeLength(value));
  return LENGTHS[(i + 1) % LENGTHS.length];
}

// Appended to the user turn of spoken modes; '' for medium.
function lengthRule(value) {
  const rule = RULES[normalizeLength(value)];
  return rule ? '\n\n' + rule : '';
}

module.exports = { LENGTHS, DEFAULT_LENGTH, LABELS, normalizeLength, nextLength, lengthRule };
