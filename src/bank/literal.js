// A value as a source literal both Dart and TypeScript accept: [1, 2], "a", null.
// Dart reads $ in a string as interpolation, so it is escaped there.
function literal(value, lang) {
  if (Array.isArray(value)) return '[' + value.map((v) => literal(v, lang)).join(', ') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).map(([k, v]) => literal(k, lang) + ': ' + literal(v, lang)).join(', ') + '}';
  const json = JSON.stringify(value === undefined ? null : value);
  return lang === 'dart' && typeof value === 'string' ? json.replace(/\$/g, '\\$') : json;
}

module.exports = { literal };
