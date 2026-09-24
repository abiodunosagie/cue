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

// Settings from before profiles: the flat fields become the first profile.
// Returns null when nothing needs to change.
function migrate(settings) {
  const profiles = settings && settings.profiles && typeof settings.profiles === 'object' ? settings.profiles : {};
  if (settings && settings.activeProfile && profiles[settings.activeProfile]) return null;
  const name = Object.keys(profiles)[0] || DEFAULT_NAME;
  return { profiles: { ...profiles, [name]: profiles[name] || snapshot(settings) }, activeProfile: name };
}

function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
}

// The profiles with the active one brought up to date from the flat fields.
function saved(settings) {
  return { ...(settings.profiles || {}), [settings.activeProfile]: snapshot(settings) };
}

function switchTo(settings, name) {
  const profiles = saved(settings);
  if (!profiles[name]) throw new Error('There is no profile called ' + name + '.');
  return { profiles, activeProfile: name, fields: { ...snapshot({}), ...profiles[name] } };
}

function create(settings, rawName) {
  const name = cleanName(rawName);
  if (!name) throw new Error('Give the new profile a name, for example the company.');
  const profiles = saved(settings);
  if (profiles[name]) throw new Error('A profile called ' + name + ' already exists.');
  if (Object.keys(profiles).length >= MAX_PROFILES) throw new Error('Delete an old profile first; cue keeps up to ' + MAX_PROFILES + '.');
  const fields = snapshot(settings);
  for (const k of JOB_FIELDS) fields[k] = '';
  return { profiles: { ...profiles, [name]: fields }, activeProfile: name, fields };
}

function remove(settings, name) {
  if (name === settings.activeProfile) throw new Error('Switch to another profile before deleting this one.');
  const profiles = saved(settings);
  if (!profiles[name]) throw new Error('There is no profile called ' + name + '.');
  delete profiles[name];
  return { profiles, activeProfile: settings.activeProfile, fields: snapshot(settings) };
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

module.exports = { migrate, switchTo, create, remove, removeCurrent, names, snapshot, PROFILE_FIELDS, JOB_FIELDS, DEFAULT_NAME };
