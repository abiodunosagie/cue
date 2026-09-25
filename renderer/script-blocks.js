// Script blocks: a pasted script cut into the paragraphs the teleprompter
// shows. Short paragraphs keep the eye's jumps small as the view scrolls, so
// one long pasted paragraph is cut after every few sentences; a blank line
// always starts a new block. The word-level following is script-follow.js.
// Also the reading time shown in the Script window. Pure, so node tests and
// the main process can load it; the renderer uses window.ScriptBlocks.
(function () {
  // About two or three spoken sentences per paragraph.
  const MAX_BLOCK_WORDS = 45;
  // A calm, clear reading pace for a recorded video.
  const READING_WPM = 140;

  const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

  // { words, seconds } for the script at READING_WPM.
  function readingTime(text) {
    const n = words(text);
    return { words: n, seconds: Math.round((n / READING_WPM) * 60) };
  }

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

  const api = { splitScript, readingTime, MAX_BLOCK_WORDS, READING_WPM };
  if (typeof window !== 'undefined') window.ScriptBlocks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
