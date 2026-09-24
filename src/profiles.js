// Job profiles: one set of interview material per application. The active
// profile always lives in the flat settings fields every feature already reads
// (resumeText, jobDescription, ...); the others wait in settings.profiles.
// Switching writes the flat fields back into the profile being left, then
// loads the chosen one into them. Pure: the store applies what these return.

const PROFILE_FIELDS = ['resumeText', 'jobDescription', 'companyNotes', 'starStories', 'whyCompany', 'whyLeaving', 'workStyle', 'salaryTarget', 'questionsToAsk'];
// A new profile is for another job with the same person: the CV, stories and
// work style carry over; everything about the job starts empty.
const JOB_FIELDS = ['jobDescription', 'companyNotes', 'whyCompany', 'salaryTarget', 'questionsToAsk'];
const DEFAULT_NAME = 'My profile';
const MAX_NAME = 40;
const MAX_PROFILES = 20;

function snapshot(settings) {
  const out = {};
  for (const k of PROFILE_FIELDS) out[k] = String((settings && settings[k]) || '');
  return out;
}

function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

// Own keys only: a name like "__proto__" or "constructor" must not match
// something inherited from Object.
const has = (profiles, name) => Object.prototype.hasOwnProperty.call(profiles || {}, name);

// Settings from before profiles, or an active profile that is missing from the
// list: the flat fields are what the user sees and edits, so they become the
// active profile (under its own name when it has one). Returns null when
// nothing needs to change.
function migrate(settings) {
  const profiles = settings && settings.profiles && typeof settings.profiles === 'object' ? settings.profiles : {};
  if (settings && settings.activeProfile && has(profiles, settings.activeProfile)) return null;
  const name = cleanName(settings && settings.activeProfile) || (has(profiles, DEFAULT_NAME) ? DEFAULT_NAME + ' (current)' : DEFAULT_NAME);
  return { profiles: { ...profiles, [name]: snapshot(settings) }, activeProfile: name };
}

// The profiles with the active one brought up to date from the flat fields.
function saved(settings) {
  return { ...(settings.profiles || {}), [settings.activeProfile]: snapshot(settings) };
}

function switchTo(settings, name) {
  const profiles = saved(settings);
  if (!has(profiles, name)) throw new Error('There is no profile called ' + name + '.');
  return { profiles, activeProfile: name, fields: { ...snapshot({}), ...profiles[name] } };
}

function create(settings, rawName) {
  const name = cleanName(rawName);
  if (!name) throw new Error('Give the new profile a name, for example the company.');
  const profiles = saved(settings);
  if (has(profiles, name)) throw new Error('A profile called ' + name + ' already exists.');
  if (name === '__proto__') throw new Error('Choose another name for the profile.');
  if (Object.keys(profiles).length >= MAX_PROFILES) throw new Error('Delete an old profile first; cue keeps up to ' + MAX_PROFILES + '.');
  const fields = snapshot(settings);
  for (const k of JOB_FIELDS) fields[k] = '';
  return { profiles: { ...profiles, [name]: fields }, activeProfile: name, fields };
}

// Delete the profile in use: switch to another one first, then remove it.
function removeCurrent(settings) {
  const current = settings.activeProfile;
  const next = Object.keys(settings.profiles || {}).find((n) => n !== current);
  if (!next) throw new Error('This is your only profile. Create another before deleting it.');
  const switched = switchTo(settings, next);
  const profiles = { ...switched.profiles };
  delete profiles[current];
  return { ...switched, profiles };
}

function names(settings) {
  return Object.keys((settings && settings.profiles) || {});
}

module.exports = { migrate, switchTo, create, removeCurrent, names, snapshot, PROFILE_FIELDS, JOB_FIELDS, DEFAULT_NAME };
