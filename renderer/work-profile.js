(function () {
// Work mode: a profile for a job the user already has. It holds the title they
// were hired at, the level they really work at, and the colleagues they meet,
// so cue can pitch each reply to the person asking (a tech lead hears
// trade-offs, a PM hears scope and dates). Pure: the store and the renderer
// both clean what they keep through here.


const KINDS = ['interview', 'work'];
const LEVELS = ['junior', 'mid', 'senior'];

// What each role usually wants from the user in a meeting. The prompt uses it
// to choose the angle of a reply; the user's own notes on a colleague win.
const ROLES = {
  techlead: { label: 'Tech lead', wants: 'architecture, trade-offs, risks, how a change fits the codebase and its conventions, and honest status on technical work' },
  manager: { label: 'Engineering manager', wants: 'progress, blockers, delivery dates, risks to the plan, and what help is needed' },
  backend: { label: 'Back end', wants: 'API contracts: endpoints, request and response shapes, errors, auth, pagination and who owns which side' },
  frontend: { label: 'Front end', wants: 'components, state, data fetching, UI edge cases and shared patterns in the front end' },
  mobile: { label: 'Mobile', wants: 'app architecture, state, releases, platform differences and API needs of the app' },
  fullstack: { label: 'Full stack', wants: 'how a feature works end to end, from the API to the screen' },
  product: { label: 'Product manager', wants: 'scope, user impact, dates, trade-offs between scope and time, and clear yes or no answers' },
  design: { label: 'Designer', wants: 'how the design is built, what is feasible, states (loading, empty, error) and questions about the spec' },
  qa: { label: 'QA', wants: 'how to reproduce, expected versus actual behaviour, test coverage and what changed in a fix' },
  devops: { label: 'DevOps', wants: 'environments, deploys, configuration, logs and what a change needs to run' },
  data: { label: 'Data', wants: 'what data is tracked, where it lives, its shape and how it is used' },
  other: { label: 'Other', wants: 'a clear, direct answer in plain words' }
};

const MAX_COLLEAGUES = 30;
const MAX_NAME = 40;
const MAX_OWNS = 200;
const MAX_NOTES = 400;
const MAX_TITLE = 80;
const MAX_DOCS = 20000;
const MAX_GUIDE = 60000;

const clip = (v, max) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, max);

function normalizeKind(kind) {
  return KINDS.includes(kind) ? kind : 'interview';
}

function normalizeLevel(level) {
  return LEVELS.includes(level) ? level : '';
}

// A colleague keeps its id across edits, so the button chosen in a meeting
// still points at the same person after the list is edited.
function newId() {
  return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function normalizeColleagues(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const name = clip(raw.name, MAX_NAME);
    if (!name) continue;
    let id = /^[a-z0-9]{4,24}$/.test(String(raw.id || '')) ? String(raw.id) : newId();
    while (seen.has(id)) id = newId();
    seen.add(id);
    out.push({
      id,
      name,
      role: Object.prototype.hasOwnProperty.call(ROLES, raw.role) ? raw.role : 'other',
      owns: clip(raw.owns, MAX_OWNS),
      notes: clip(raw.notes, MAX_NOTES)
    });
    if (out.length >= MAX_COLLEAGUES) break;
  }
  return out;
}

function isWork(settings) {
  return !!settings && normalizeKind(settings.profileKind) === 'work';
}

function findColleague(settings, id) {
  if (!id) return null;
  return normalizeColleagues(settings && settings.colleagues).find((c) => c.id === id) || null;
}

function roleLabel(role) {
  return (ROLES[role] || ROLES.other).label;
}

const api = {
  KINDS,
  LEVELS,
  ROLES,
  MAX_COLLEAGUES,
  MAX_TITLE,
  MAX_DOCS,
  MAX_GUIDE,
  normalizeKind,
  normalizeLevel,
  normalizeColleagues,
  newId,
  isWork,
  findColleague,
  roleLabel,
  clip
};
// Main requires it through src/work.js; the renderer reads window.WorkProfile.
if (typeof window !== 'undefined') window.WorkProfile = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
