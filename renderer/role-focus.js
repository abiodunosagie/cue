// Role focus: how answers present the candidate for the job in the active
// profile. A mobile-only role and a mobile full stack role want different
// emphasis from the same person, so each profile carries its own choice.
// auto reads the job description; mobile and fullstack are set by hand.

(function () {
  const ROLE_FOCUS = ['auto', 'mobile', 'fullstack'];
  const LABELS = { mobile: 'Mobile', fullstack: 'Full stack' };

  // Saying "full stack" settles it. Otherwise it takes two different server-side
  // signals: a mobile posting often names one ("work with our Node.js team")
  // without asking the candidate to build the backend.
  const FULL_STACK_RE = /\bfull[\s-]?stack\b/i;
  const SERVER_SIGNALS = [
    /\bback[\s-]?end (?:development|developer|engineer(?:ing)?|services|systems)\b/i,
    /\bserver[\s-]side\b/i,
    /\b(?:build|design|develop|write|own)(?:s|ing)? (?:the |our )?(?:rest(?:ful)? |graphql )?apis?\b/i,
    /\bnode(?:\.?js)?\b/i,
    /\bnest(?:\.?js)?\b/i,
    /\bexpress(?:\.js)?\b/i,
    /\b(?:django|laravel|rails|spring boot|golang|\.net core)\b/i,
    /\b(?:postgres(?:ql)?|mysql|mongodb|sql server)\b/i,
    /\bmicroservices?\b/i,
    /\b(?:docker|kubernetes)\b/i
  ];
  const MOBILE_RE = /\b(?:flutter|dart|mobile|android|ios|swift|kotlin|react native)\b/i;

  function normalizeRoleFocus(value) {
    return ROLE_FOCUS.includes(value) ? value : 'auto';
  }

  // 'fullstack', 'mobile', or null when the description says neither (or is empty).
  function detectRoleFocus(jobDescription) {
    const jd = String(jobDescription || '');
    if (!jd.trim()) return null;
    if (FULL_STACK_RE.test(jd)) return 'fullstack';
    if (SERVER_SIGNALS.filter((re) => re.test(jd)).length >= 2) return 'fullstack';
    if (MOBILE_RE.test(jd)) return 'mobile';
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
    fullstack: 'Role focus for this job: mobile full stack. Present me as someone who builds the mobile app and the backend it depends on. ' +
      'When the question allows, show both sides: the app, and the APIs, data and deployment behind it.'
  };

  const api = { ROLE_FOCUS, LABELS, FOCUS_RULES, normalizeRoleFocus, detectRoleFocus, resolveRoleFocus };
  // Main requires it through src/role-focus.js; the renderer reads window.RoleFocus.
  if (typeof window !== 'undefined') window.RoleFocus = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
