// Practice interview: a voice asks the likely questions one at a time, cue
// answers them as in a real interview, the candidate says the answer out loud,
// and each spoken answer is scored here on this Mac: length, filler, words that
// sound like AI, hedging, and names or numbers that are not in his own resume,
// job description or stories (the thing an interviewer's follow-up exposes).

const QUESTION_COUNT = 8;

// Used when there is no prepared bank for this profile yet.
const DEFAULT_QUESTIONS = [
  'Hi, thanks for joining us today. To start, can you tell me a little about yourself and your background?',
  'What made you interested in this role, and why do you want to work with our company?',
  'Tell me about a challenging project you worked on. What was your role, and how did you handle it?',
  'Describe a time you disagreed with a teammate or a manager. How did you resolve it?',
  'How do you manage state in a large Flutter application, and why do you prefer that approach?',
  'Walk me through how you would make a mobile app feel fast on a slow network.',
  'Tell me about a time you made a mistake in production. What happened and what did you learn?',
  'What are your salary expectations for this role?'
];

// ElevenLabs premade voices: the same ids on every account.
const VOICES = {
  george: { id: 'JBFqnCBsd6RMkjVDRZzb', label: 'George, British male' },
  alice: { id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice, British female' },
  brian: { id: 'nPczCjzI2devNBz1zQrb', label: 'Brian, American male' },
  sarah: { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah, American female' }
};
const DEFAULT_VOICE = 'george';
const TTS_MODEL = 'eleven_multilingual_v2';
const TTS_TIMEOUT_MS = 20000;

// Spoken-length targets per answer length (words). The intro has its own rule.
const WORD_TARGETS = { short: [15, 45], medium: [40, 110], long: [100, 190] };
const INTRO_TARGET = [80, 130];

const FILLERS = ['um', 'uh', 'erm', 'like', 'you know', 'basically', 'actually', 'kind of', 'sort of', 'i mean'];
const HEDGES = ['i think', 'i guess', 'maybe', 'probably', 'i feel like', 'i believe'];
// Words interviewers now hear as generated text rather than a person talking.
const AI_WORDS = ['delve', 'leverage', 'leveraging', 'synergy', 'robust', 'seamless', 'seamlessly', 'cutting-edge', 'cutting edge',
  'spearheaded', 'utilize', 'utilized', 'furthermore', 'moreover', 'tapestry', 'landscape', 'game-changer', 'game changer',
  'holistic', 'paradigm', 'passionate about', 'in today\'s', 'fast-paced', 'dynamic environment', 'at the end of the day', 'navigate the complexities'];

// The questions for one practice run: prepared ones when the bank matches the
// profile (the intro first), else the defaults.
function pickQuestions(preparedItems, count = QUESTION_COUNT) {
  const items = (preparedItems || []).map((i) => i.question).filter(Boolean);
  if (!items.length) return DEFAULT_QUESTIONS.slice(0, count);
  const intro = items.findIndex((q) => /yourself|your background|walk me through your/i.test(q));
  const ordered = intro > 0 ? [items[intro], ...items.slice(0, intro), ...items.slice(intro + 1)] : items;
  return ordered.slice(0, count);
}

function countPhrases(text, phrases) {
  const lower = ' ' + text.toLowerCase().replace(/[^a-z0-9'\s-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const found = [];
  for (const p of phrases) {
    const n = lower.split(' ' + p + ' ').length - 1;
    if (n > 0) found.push(n > 1 ? p + ' x' + n : p);
  }
  return found;
}

// Names (capitalised words not starting a sentence) and numbers in the answer
// that appear nowhere in the candidate's own material.
function unsupportedDetails(answer, reference) {
  const ref = ' ' + String(reference || '').toLowerCase() + ' ';
  const out = new Set();
  const sentences = String(answer || '').split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    const words = s.split(/\s+/);
    words.forEach((raw, i) => {
      const w = raw.replace(/^[^\w£$€]+|[^\w%]+$/g, '');
      if (!w) return;
      const isNumber = /\d/.test(w);
      // Capitalised mid-sentence, with lower case after: a name. All-caps words
      // (PIN, API, SQL) are technical terms, not people or companies.
      const isName = i > 0 && /^[A-Z][a-z][a-zA-Z]+$/.test(w);
      if (!isNumber && !isName) return;
      const plain = w.toLowerCase().replace(/[£$€,]/g, '');
      if (!ref.includes(plain)) out.add(w);
    });
  }
  return [...out];
}

function scoreAnswer({ question, answer, reference, length = 'medium' }) {
  const text = String(answer || '').trim();
  const words = text ? text.split(/\s+/).length : 0;
  const intro = /yourself|your background/i.test(question || '');
  const [min, max] = intro ? INTRO_TARGET : (WORD_TARGETS[length] || WORD_TARGETS.medium);
  const notes = [];
  if (!words) notes.push('No spoken answer was heard.');
  else if (words < min) notes.push(`Short: ${words} words, aim for ${min} to ${max}.`);
  else if (words > max) notes.push(`Long: ${words} words, aim for ${min} to ${max}.`);
  const fillers = countPhrases(text, FILLERS);
  const hedges = countPhrases(text, HEDGES);
  const aiWords = countPhrases(text, AI_WORDS);
  const unsupported = unsupportedDetails(text, reference);
  if (fillers.length) notes.push('Filler: ' + fillers.join(', ') + '.');
  if (hedges.length) notes.push('Hedging: ' + hedges.join(', ') + '.');
  if (aiWords.length) notes.push('Sounds written, not spoken: ' + aiWords.join(', ') + '.');
  if (unsupported.length) notes.push('Not in your resume or stories, be ready to back it up or drop it: ' + unsupported.join(', ') + '.');
  return { question, words, fillers, hedges, aiWords, unsupported, notes, clean: words > 0 && notes.length === 0 };
}

function formatReport(results) {
  if (!results.length) return 'Practice ended before any question was answered.';
  const clean = results.filter((r) => r.clean).length;
  const lines = [`**Practice report:** ${clean} of ${results.length} answers had nothing to fix.`, ''];
  results.forEach((r, i) => {
    lines.push(`**${i + 1}. ${r.question}**`);
    if (r.clean) lines.push(`- Good: ${r.words} words, nothing to fix.`);
    else r.notes.forEach((n) => lines.push('- ' + n));
    lines.push('');
  });
  return lines.join('\n').trim();
}

// ElevenLabs text to speech: MP3 bytes, or throws with a message safe to show.
async function synthesize({ apiKey, voice, text, fetchImpl = fetch }) {
  const voiceId = (VOICES[voice] || VOICES[DEFAULT_VOICE]).id;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TTS_TIMEOUT_MS);
  try {
    const res = await fetchImpl(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: TTS_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true } }),
      signal: controller.signal
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error('ElevenLabs rejected the API key.');
      if (res.status === 429) throw new Error('ElevenLabs rate limit or quota reached.');
      throw new Error('ElevenLabs could not make the voice (HTTP ' + res.status + ').');
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (e && e.name === 'AbortError') throw new Error('ElevenLabs took too long to answer.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  pickQuestions, scoreAnswer, unsupportedDetails, formatReport, synthesize,
  DEFAULT_QUESTIONS, VOICES, DEFAULT_VOICE, QUESTION_COUNT
};
