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
    /\b(can(no|')?t|could ?n[o']t|does ?n[o']?t|did ?n[o']?t|is ?n[o']?t|not) (find|finding|found|resolve|resolving|import|importing|compile|compiling|build|building|run|running|work|working)s?\b/i,
    /\b(not (found|defined|working|compiling)|(is|was|shows|says|returns|gets|got) (undefined|undeclared|null))\b/i,
    /\b(fix|debug)\b.{0,30}\b(it|this|that|my|the (code|error|issue|problem|bug))\b/i,
    /\bwhat('s| is) wrong (here|with (it|this|my|the code))\b/i
  ];
  // A fix request is about the candidate's own code, not error handling as a
  // topic ("what is a stack trace?" is a conceptual question): it speaks in the
  // first person, asks for help or a fix, or says what "it" or "this" does.
  const OWN_CODE_ANCHORS = [
    /\b(i|i'm|im|i've|my|mine)\b/i,
    /\b(help me|fix (it|this|that)|debug (it|this|that))\b/i,
    /\bhere\b/i,
    /\b(it|this|that)('s| is| keeps| won'?t| does ?n[o']?t| did ?n[o']?t| can(no|')?t| is ?n[o']?t| says| shows| gives| throws)\b/i
  ];
  function isFixRequest(text) {
    const t = String(text || '');
    return t.trim().length >= 6 && FIX_PATTERNS.some((p) => p.test(t)) && OWN_CODE_ANCHORS.some((p) => p.test(t));
  }

  // While the candidate shows their own project: a question about what is on
  // screen. Only used with a walkthrough loaded (main.js), and still narrow,
  // because a normal question must keep its spoken answer with the CV behind it:
  // "why do you want to work here?", "where do you see yourself?", "explain
  // your approach to testing" and "that part of your job" are not screen questions.
  //  - this, that, these or those before a thing in code or on an app screen;
  //  - "explain this", "walk me through that";
  //  - it or this done "here" ("why do you do it here?");
  //  - where something is handled, stored or defined in the app;
  //  - what a tap or click does, "show me where", "what am I looking at".
  const SCREEN_THING = '(?:widget|screen|page|file|folder|component|class|function|method|provider|notifier|bloc|cubit|controller|repository|button|sheet|dialog|form|field|route|router|query|table|layout|code|line|endpoint|migration|test)(?:e?s)?';
  const SCREEN_QUESTION_PATTERNS = [
    new RegExp('\\b(this|that|these|those) ' + SCREEN_THING + '\\b', 'i'),
    /\b(explain|walk (me|us) through|talk (me|us) through) (this|that)\b/i,
    /\b(why|what|how)\b.{0,40}\b(it|this|that)\b.{0,20}\b(right |in |over )?here\b/i,
    /\bwhere (is|are|does|do you|did you)\b.{0,40}\b(handled|calculated|computed|stored|saved|kept|defined|called|done|set up|happen|happens|live|lives|come from|comes from)\b/i,
    /\bwhere in (the|this|your) (code|app|project|codebase)\b/i,
    /\bwhat (happens|would happen|did you do) (when|if) (i|you|we|the user|a user|someone) (tap|taps|click|clicks|press|presses|open|opens|scroll|scrolls|swipe|swipes)\b/i,
    /\b(show|point) (me|us) (where|how|the|that|this)\b/i,
    /\bwhat am i (looking at|seeing)\b/i
  ];
  function isScreenQuestion(text) {
    const t = String(text || '');
    return t.trim().length >= 6 && SCREEN_QUESTION_PATTERNS.some((p) => p.test(t));
  }
  // A heard question that points at the screen, either way cue knows of.
  function refersToScreen(text) {
    return SCREEN_REFERENCE.test(text || '') || isScreenQuestion(text);
  }

  const api = { modeForSpokenQuestion, isExplainRequest, isFixRequest, isScreenQuestion, refersToScreen };
  if (typeof window !== 'undefined') window.SpokenQuestion = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
