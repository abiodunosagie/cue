// Streaming block splitter: decides, token by token, where a streaming answer
// starts a new paragraph or list item, the same places the final markdown will.
// Pure (no DOM) and stateful across tokens, because a blank line, a list marker
// or a code fence often arrives split over two tokens. The renderer uses
// window.StreamBlocks; node tests require it.
(function () {
  function createStreamSplitter() {
    let ws = '';         // whitespace seen since the last visible character
    let held = '';       // a possible list marker at a line start, waiting for the next character
    let heldWs = '';     // the whitespace that came before the held marker
    let ticks = 0;       // backticks in a row, across tokens
    let inFence = false;
    let started = false; // any visible text yet in this answer

    // Called once per visible character. Returns the pieces to emit.
    function visible(ch, out) {
      if (held) return resolveHeld(ch, out);
      const newlines = (ws.match(/\n/g) || []).length;
      // Decide on the state before this character: an opening fence after a
      // blank line is a new block, and nothing inside a fence ever is.
      if (!inFence && started && newlines >= 2) {
        out.push({ break: true });
      } else if (!inFence && started && newlines === 1 && /[-*•\d]/.test(ch)) {
        held = ch; heldWs = ws; ws = '';
        return;
      } else if (ws && started) {
        out.push({ text: ws });
      }
      ws = '';
      emit(ch, out);
    }

    // A line starting with "-", "*", "•" or a number is a list item only when
    // the marker is followed by a space ("- x", "1. x"), not "-5" or "**Say:**" or "2024".
    function resolveHeld(ch, out) {
      if (/\d/.test(held[held.length - 1]) && /\d/.test(ch)) { held += ch; return; }
      const numbered = /^\d+$/.test(held);
      const isItem = numbered ? (ch === '.' || ch === ')') : false;
      const bullet = !numbered && ch === ' ';
      const text = held;
      held = '';
      if (isItem || bullet) out.push({ break: true });
      else out.push({ text: heldWs });
      heldWs = '';
      for (const c of text) emit(c, out);
      if (/\s/.test(ch)) { ws += ch; return; }
      emit(ch, out);
    }

    function emit(ch, out) {
      started = true;
      if (ch === '`') {
        ticks++;
        if (ticks === 3) { inFence = !inFence; ticks = 0; }
      } else {
        ticks = 0;
      }
      const last = out[out.length - 1];
      if (last && last.text !== undefined) last.text += ch;
      else out.push({ text: ch });
    }

    // Feed one streamed token. Returns [{ text }, { break: true }, ...] in order.
    function push(token) {
      const out = [];
      for (const ch of String(token || '')) {
        if (/\s/.test(ch)) {
          if (held) { resolveHeld(ch, out); continue; }
          ws += ch;
          continue;
        }
        visible(ch, out);
      }
      return out.filter((p) => p.break || p.text);
    }

    return { push };
  }

  const api = { createStreamSplitter };
  if (typeof window !== 'undefined') window.StreamBlocks = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
