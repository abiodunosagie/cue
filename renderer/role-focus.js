// Role focus: how answers present the candidate for the job in the active
// profile. A mobile role, a web front end role and a backend role want
// different emphasis from the same person, so each profile carries its own
// choice. auto reads the job description; the rest are set by hand.

(function () {
  const ROLE_FOCUS = ['auto', 'mobile', 'frontend', 'backend', 'fullstack'];
  const LABELS = { mobile: 'Mobile', frontend: 'Front end', backend: 'Back end', fullstack: 'Full stack' };
  // What answers do under each focus, for the note under the control.
  const SUMMARIES = {
    mobile: 'a mobile developer first',
    frontend: 'a front end engineer first',
    backend: 'a back end engineer first',
    fullstack: 'someone who builds the app and its backend'
  };

  // Saying "full stack" settles it, unless the posting says it is not one.
  // Otherwise it takes a strong server-side signal (building APIs, backend
  // development, a server framework) plus one more signal of either kind:
  // mobile postings often list a database or Docker as a nice-to-have, or
  // mention the backend team, without asking the candidate to build it.
  const FULL_STACK_RE = /\bfull[\s-]?stack\b/i;
  const NOT_FULL_STACK_RE = /\b(?:not|no|non)[\s-]+(?:an?\s+)?full[\s-]?stack\b/i;
  const STRONG_SIGNALS = [
    /\bback[\s-]?end (?:development|developer|engineer(?:ing)?)\b/i,
    /\bserver[\s-]side\b/i,
    /\b(?:build|design|develop|write|own)(?:s|ing)? (?:the |our )?(?:rest(?:ful)? |graphql )?apis?\b/i,
    /\bnode\.?js\b/i,
    /\bnest\.?js\b/i,
    /\bexpress\.?js\b/i,
    /\b(?:django|laravel|ruby on rails|spring boot|golang|\.net core)\b/i,
    /\bmicroservices?\b/i
  ];
  const WEAK_SIGNALS = [
    /\b(?:postgres(?:ql)?|mysql|mongodb|sql server)\b/i,
    /\b(?:docker|kubernetes)\b/i
  ];
  // A real mobile stack. The word "mobile" alone only counts when nothing
  // else does: web and backend postings say "mobile-first" or "our mobile app".
  const MOBILE_STACK_RE = /\b(?:flutter|dart|android|ios|swift|kotlin|react native)\b/i;
  const MOBILE_WORD_RE = /\bmobile\b/i;
  // Web front end work. React here means React for the web, never React Native.
  const FRONTEND_SIGNALS = [
    /\bfront[\s-]?end\b/i,
    /\breact\b(?![\s-]*native)/i,
    /\bnext\.?js\b/i,
    /\b(?:vue|angular|svelte|tailwind|css|html)\b/i,
    /\bweb app\b/i
  ];
  // The job title says what the role is, so it decides before words met in
  // passing ("our mobile app consumes your APIs", "tested on iOS Safari").
  const ROLE = '(?:software\\s+)?(?:developer|engineer|dev)\\b';
  const TITLES = {
    mobile: new RegExp('\\b(?:mobile|flutter|ios|android|react native|kotlin|swift)\\s+(?:app\\s+)?' + ROLE, 'i'),
    frontend: new RegExp('\\b(?:front[\\s-]?end|react|vue|angular|ui|web)\\s+' + ROLE, 'i'),
    backend: new RegExp('\\b(?:back[\\s-]?end|server[\\s-]side|api)\\s+' + ROLE, 'i')
  };

  function normalizeRoleFocus(value) {
    return ROLE_FOCUS.includes(value) ? value : 'auto';
  }

  // 'fullstack', 'backend', 'frontend', 'mobile', or null when the description
  // says none of them (or is empty).
  function detectRoleFocus(jobDescription) {
    const jd = String(jobDescription || '');
    if (!jd.trim()) return null;
    if (FULL_STACK_RE.test(jd) && !NOT_FULL_STACK_RE.test(jd)) return 'fullstack';
    const strong = STRONG_SIGNALS.filter((re) => re.test(jd)).length;
    const weak = WEAK_SIGNALS.filter((re) => re.test(jd)).length;
    const buildsServer = strong >= 1 && strong + weak >= 2;
    // One kind of title: that is the role. A mobile or web title that also
    // asks for real server work is full stack; a backend title stays backend.
    const titled = Object.keys(TITLES).filter((kind) => TITLES[kind].test(jd));
    if (titled.length === 1) {
      const kind = titled[0];
      return kind !== 'backend' && buildsServer ? 'fullstack' : kind;
    }
    // No title, or a mixed one: the stack words decide.
    const mobileStack = MOBILE_STACK_RE.test(jd);
    const web = FRONTEND_SIGNALS.some((re) => re.test(jd));
    if (buildsServer) return mobileStack || web ? 'fullstack' : 'backend';
    if (web && !mobileStack) return 'frontend';
    if (mobileStack || MOBILE_WORD_RE.test(jd)) return 'mobile';
    return null;
  }

  // The focus in force: the hand-set one, else what the job description says,
  // else null (answers get no focus line).
  function resolveRoleFocus(settings) {
    const chosen = normalizeRoleFocus(settings && settings.roleFocus);
    if (chosen !== 'auto') return chosen;
    return detectRoleFocus(settings && settings.jobDescription);
  }

  const FOCUS_RULES = {
    mobile: 'Role focus for this job: mobile. Present me as a mobile developer first: the app, its architecture, performance, releases and the people using it. ' +
      'Bring in backend work only when the interviewer asks about it or it clearly strengthens the answer, and then as the APIs and services my app works with.',
    frontend: 'Role focus for this job: front end. Present me as a front end engineer first: the web interface, its components and state, performance, accessibility and the people using it. ' +
      'Take examples from my web work when my background has it. Mobile app work counts as related experience building user interfaces, never the headline; bring in backend work only when the interviewer asks.',
    backend: 'Role focus for this job: back end. Present me as a back end engineer first: the APIs, data models, databases, security, reliability and deployment. ' +
      'Take examples from my server-side work; bring in the apps only as the clients my services serve, or when the interviewer asks.',
    fullstack: 'Role focus for this job: full stack. Present me as someone who builds the app and the backend it depends on. ' +
      'When the question allows, show both sides: the app, and the APIs, data and deployment behind it.'
  };

  const api = { ROLE_FOCUS, LABELS, SUMMARIES, FOCUS_RULES, normalizeRoleFocus, detectRoleFocus, resolveRoleFocus };
  // Main requires it through src/role-focus.js; the renderer reads window.RoleFocus.
  if (typeof window !== 'undefined') window.RoleFocus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
