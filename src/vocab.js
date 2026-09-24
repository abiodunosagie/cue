// Words the speech service should expect: the user's own list of words cue
// mishears, then the tool and product names in their resume and the job
// description. One list feeds every provider in its own format: a prompt for
// Whisper (OpenAI, Groq, custom, local) and repeated keyterm parameters for
// Deepgram nova-3, which caps key terms at 500 tokens per request.

const MAX_TERMS = 40;
const MAX_TERM_CHARS = 40;
const MAX_PROMPT_CHARS = 850;
// Only when the user has no terms of their own: common interview tech words.
const FALLBACK_TERMS = ['REST API', 'CI/CD', 'GitHub', 'TypeScript', 'JavaScript', 'Python', 'PostgreSQL', 'Docker', 'AWS', 'microservices'];
// Capitalised because they start a sentence or a line, not because they are names.
const COMMON_CAPS = new Set(('The A An And Or But If In On At By For With From To Of As Is Are Was Were Be I We You He She They It This That ' +
  'These Those My Our Your Their Its Built Led Worked Work Working Designed Delivered Owned Set Ran Used Using Added Made Wrote Contributed ' +
  'Situation Task Action Result Lesson Summary Experience Skills Education Projects Languages Remote Present About Responsibilities Requirements ' +
  'January February March April May June July August September October November December Monday Tuesday Wednesday Thursday Friday').split(' '));

function splitList(text) {
  return String(text || '').split(/[,\n;]+/).map((w) => w.trim()).filter(Boolean);
}

// Tool and product names: CamelCase (GoRouter), inner capitals (iOS), acronyms
// (AWS), and capitalised words that are not sentence furniture (Riverpod).
function namesIn(text) {
  const found = String(text || '').match(/\b[A-Za-z][A-Za-z0-9+.#]*[A-Z][A-Za-z0-9+.#]*\b|\b[A-Z][a-zA-Z0-9+.#]{2,}\b/g) || [];
  return found.map((w) => w.replace(/\.+$/, '')).filter((w) => w.length >= 2 && !COMMON_CAPS.has(w));
}

function buildVocabTerms(settings) {
  const s = settings || {};
  const seen = new Set();
  const terms = [];
  const add = (w) => {
    const term = w.slice(0, MAX_TERM_CHARS);
    const key = term.toLowerCase();
    if (!term || seen.has(key) || terms.length >= MAX_TERMS) return;
    seen.add(key);
    terms.push(term);
  };
  splitList(s.sttWords).forEach(add);
  namesIn((s.resumeText || '') + ' ' + (s.jobDescription || '')).forEach(add);
  if (!terms.length) FALLBACK_TERMS.forEach(add);
  return terms;
}

// Whisper's prompt: the terms as a comma list, within its length budget.
function buildVocabPrompt(settings) {
  let prompt = '';
  for (const term of buildVocabTerms(settings)) {
    const next = prompt ? prompt + ', ' + term : term;
    if (next.length > MAX_PROMPT_CHARS) break;
    prompt = next;
  }
  return prompt;
}

module.exports = { buildVocabTerms, buildVocabPrompt, MAX_TERMS };
