// Script blocks: a pasted script cut into the paragraphs the teleprompter
// follows. The reading tracker moves between blocks, so one long pasted
// paragraph is cut after every few sentences; a blank line always starts a
// new block. Pure, so node tests can load it; the renderer uses
// window.ScriptBlocks.
(function () {
  // About two or three spoken sentences: enough words for the tracker to
  // match, short enough that the highlight and scroll move often.
  const MAX_BLOCK_WORDS = 45;

  const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

  function splitScript(text) {
    const paragraphs = String(text || '').replace(/\r\n?/g, '\n').split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
    const blocks = [];
    for (const para of paragraphs) {
      const sentences = para.split(/(?<=[.!?]["')\]]?)\s+/).filter(Boolean);
      let current = '';
      for (const sentence of sentences) {
        if (current && words(current) + words(sentence) > MAX_BLOCK_WORDS) {
          blocks.push(current);
          current = '';
        }
        current = current ? current + ' ' + sentence : sentence;
      }
      if (current) blocks.push(current);
    }
    return blocks;
  }

  const api = { splitScript, MAX_BLOCK_WORDS };
  if (typeof window !== 'undefined') window.ScriptBlocks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
