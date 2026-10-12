// Text cue puts into a prompt from outside (a website, pasted docs, heard
// speech, model-written notes) goes inside a named tag and is marked as data.
// unfence strips any lookalike of that tag from the text first, so the text
// cannot close its fence early and pose as instructions.

// Removing one lookalike can join the text around it into another
// ("</proj</project_docs>ect_docs>"), so this repeats until nothing changes.
// tagPattern is a regex source for the tag name, such as 'guide' or '(review|guide)\\b'.
function stripTags(text, tagPattern) {
  const re = new RegExp('<\\/?' + tagPattern + '[^>]*>', 'gi');
  let out = String(text || '');
  for (let prev = null; out !== prev;) { prev = out; out = out.replace(re, ''); }
  return out;
}

const unfence = (text, tag) => stripTags(String(text || '').trim(), tag);

// Cut to limit characters, marking the cut.
function clip(text, limit) {
  if (!text) return '';
  if (text.length <= limit) return text;
  return text.slice(0, limit).trimEnd() + '…';
}

// '<tag>\ntext\n</tag>', the text unfenced and clipped.
const fenced = (tag, text, limit = Infinity) => '<' + tag + '>\n' + clip(unfence(text, tag), limit) + '\n</' + tag + '>';

module.exports = { stripTags, unfence, clip, fenced };
