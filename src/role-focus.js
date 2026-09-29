// The job profile's role focus (renderer/role-focus.js) turned into a line of
// the AI rules every spoken answer is written with.

const { MAX_AI_RULES_CHARS } = require('./profile-context');
const RoleFocus = require('../renderer/role-focus');

// The profile's AI rules with the role focus line after them, so the focus is
// read as one of the user's own rules. Empty when there is neither.
function rulesWithFocus(settings) {
  const rules = String((settings && settings.aiRules) || '').trim().slice(0, MAX_AI_RULES_CHARS);
  const focus = RoleFocus.resolveRoleFocus(settings);
  const line = focus ? RoleFocus.FOCUS_RULES[focus] : '';
  return [rules, line].filter(Boolean).join('\n');
}

module.exports = { ...RoleFocus, rulesWithFocus };
