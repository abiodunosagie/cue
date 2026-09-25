// Saved scripts for the teleprompter (the Script button): what the candidate
// reads aloud in a recorded video, such as a 60 second intro on a freelance
// profile. Kept in settings.scripts, cleaned here on every save.

const MAX_SCRIPTS = 20;
const MAX_TITLE_CHARS = 80;
// A spoken intro runs 150 to 300 words; this leaves room for a long pitch.
const MAX_SCRIPT_CHARS = 6000;

// The list as it may be stored: at most MAX_SCRIPTS entries with string
// fields in bounds and unique ids; anything else is dropped.
function normalizeScripts(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const id = String(item.id || '').slice(0, 40);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      title: String(item.title || '').trim().slice(0, MAX_TITLE_CHARS) || 'Untitled script',
      text: String(item.text || '').slice(0, MAX_SCRIPT_CHARS),
      updatedAt: Number.isFinite(item.updatedAt) ? item.updatedAt : 0
    });
    if (out.length >= MAX_SCRIPTS) break;
  }
  return out;
}

module.exports = { normalizeScripts, MAX_SCRIPTS, MAX_SCRIPT_CHARS };
