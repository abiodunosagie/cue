// Picks how cue answers a question it heard from the interviewer. Pure, so node
// tests can load it. The renderer uses window.SpokenQuestion.
(function () {
  // Spoken questions that only make sense with the screen in view.
  const SCREEN_REFERENCE = /\b(on (the|your|my) screen|on screen|as you can see|take a look|have a look|look at (this|that|the)|this (code|function|slide|diagram|snippet|screen)|(i am|i'm) sharing)\b/i;

  // 'assist' reads the screen along with the conversation; 'answerThis'
  // answers the spoken question on its own.
  function modeForSpokenQuestion(text) {
    return SCREEN_REFERENCE.test(text || '') ? 'assist' : 'answerThis';
  }

  // A question about the code the candidate just wrote: explain it, walk
  // through it, why a choice in it, its complexity, testing or changing it.
  // Only used while a coding solve is recent, so "explain how you handle
  // offline sync" in a behavioral round is never read as one.
  const CODE_TERMS = 'code|solution|approach|logic|implementation|algorithm|function|method|class|loop|line|lines|variable|condition|recursion|map|list|array|set|sort|query|data structure';
  const EXPLAIN_PATTERNS = [
    new RegExp('\\bexplain\\b.{0,40}\\b(what you (just )?(did|wrote|built)|' + CODE_TERMS + '|this|that|it)\\b', 'i'),
    new RegExp('\\b(walk|talk|take) (me|us) through\\b.{0,30}\\b(' + CODE_TERMS + '|it|this|what you(\'re| are) doing|what you did)\\b', 'i'),
    new RegExp('\\bwhy did you\\b.{0,40}\\b(' + CODE_TERMS + ')\\b', 'i'),
    new RegExp('\\bwhat (does|is) (this|that|the|your) (' + CODE_TERMS + ')\\b.{0,20}\\b(do|doing|for)\\b', 'i'),
    /\bhow does (this|that|your|the) (code|solution|function|algorithm|approach) work\b/i,
    /\b(time|space) complexity\b|\bbig o\b/i,
    /\bcan you (optimi[sz]e|improve|refactor|speed up|simplify) (it|this|that|your)\b/i,
    /\bhow would you test (it|this|that|your)\b/i,
    /\b(what|which|any) edge cases?\b/i,
    /\bwhat (would|happens) (happen )?if (the|this|that|it|your|we)\b.{0,40}\b(input|list|array|empty|null|large|huge|negative|duplicate)/i
  ];
  function isExplainRequest(text) {
    const t = String(text || '');
    return t.trim().length >= 8 && EXPLAIN_PATTERNS.some((p) => p.test(t));
  }

  // The candidate asking for help with their own code during a coding task:
  // an error, something not found or not working. Answered by reading the
  // editor on screen (checkProgress), never guessed from the words alone.
  const FIX_PATTERNS = [
    /\b(error|errors|exception|crash(es|ed|ing)?|stack ?trace|red (line|underline|squiggle)s?)\b/i,
    /\b(can(no|')?t|could ?n[o']t|does ?n[o']?t|did ?n[o']?t|is ?n[o']?t|not) (find|found|resolve|import|compile|build|run|work)(s|ing)?\b/i,
    /\b(not (found|defined|working|compiling)|undefined|undeclared)\b/i,
    /\b(fix|debug)\b.{0,30}\b(it|this|that|my|the (code|error|issue|problem|bug))\b/i,
    /\bwhat('s| is) wrong\b/i
  ];
  function isFixRequest(text) {
    const t = String(text || '');
    return t.trim().length >= 6 && FIX_PATTERNS.some((p) => p.test(t));
  }

  const api = { modeForSpokenQuestion, isExplainRequest, isFixRequest };
  if (typeof window !== 'undefined') window.SpokenQuestion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
