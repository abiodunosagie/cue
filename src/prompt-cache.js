// Prompt caching for the live answer's system prompt. Every spoken answer sends
// the same resume, job description and company notes (about 3,150 tokens on the
// micro1 profile) before the parts that change with the
// question (projects picked for it, stories for its category). Measured on the
// 2026-10-04 interview: that stable start was identical on all 25 answers, and
// the whole system prompt was identical to the previous one 13 times in 24.
//
// buildInterviewContext marks where the stable start ends with CACHE_BREAK.
// createLLM (src/llm.js) is the one place that reads the mark: Anthropic gets
// the system prompt as two cached blocks, every other provider gets the plain
// text with the mark removed, so no provider ever sees it.
//
// Measured with count_tokens on the micro1 profile: about 3,150 tokens stable
// and 4,500 to 6,500 after the mark. Anthropic caches nothing shorter than the
// model's minimum (512 tokens on Sonnet 5.5, 4,096 on Haiku 4.5), silently;
// the [usage] log line in src/llm.js shows whether reads happen.

// Control characters, so no resume or notes text can contain it by accident.
const CACHE_BREAK = '\u0001cue-cache-break\u0001';
const SEPARATOR = '\n\n';

// The mark as buildInterviewContext writes it: a block of its own between two
// blocks joined by SEPARATOR. Removing SEPARATOR + mark gives the text exactly
// as it was before caching existed.
function stripCacheBreak(system) {
  return String(system == null ? '' : system).split(SEPARATOR + CACHE_BREAK).join('').split(CACHE_BREAK).join('');
}

// Anthropic system blocks for a marked prompt: the stable start, then the rest,
// each ending on a cache breakpoint (5-minute cache; answers come a minute or
// so apart, so each read keeps it warm). null when the prompt has no mark, so
// one-off calls (company research, project reviews) pay no cache-write premium.
function anthropicSystemBlocks(system) {
  const text = String(system == null ? '' : system);
  const at = text.indexOf(CACHE_BREAK);
  if (at < 0) return null;
  const stable = text.slice(0, at).replace(/\n+$/, '');
  const rest = stripCacheBreak(text.slice(at + CACHE_BREAK.length)).replace(/^\n+/, '');
  const blocks = [];
  if (stable) blocks.push({ type: 'text', text: stable, cache_control: { type: 'ephemeral' } });
  if (rest) blocks.push({ type: 'text', text: (stable ? SEPARATOR : '') + rest, cache_control: { type: 'ephemeral' } });
  return blocks.length ? blocks : null;
}

module.exports = { CACHE_BREAK, stripCacheBreak, anthropicSystemBlocks };
