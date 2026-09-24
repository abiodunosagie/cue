// Minimal, safe markdown for answers: fenced code, bullets, inline code, bold,
// paragraphs. Pure functions, no DOM, so node tests can load it. The renderer
// uses window.CueMarkdown.
(function () {
  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function formatText(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  }

  // Backslash pairs: \\ is a literal backslash and \` a literal backtick. Reading them
  // two characters at a time keeps parity, so `C:\\Users\\` still closes on its last tick.
  function isEscape(s, i) { return s[i] === '\\' && (s[i + 1] === '`' || s[i + 1] === '\\'); }

  function unescapeTicks(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
      if (isEscape(s, i)) { out += s[i + 1] === '`' ? '`' : '\\\\'; i++; continue; }
      out += s[i];
    }
    return out;
  }

  // Length of the backtick run starting at i.
  function tickRun(s, i) {
    let n = 0;
    while (s[i + n] === '`') n++;
    return n;
  }

  // Index where a code span opened by `ticks` backticks at `start` closes, or -1.
  // A single-backtick span skips \` so a model writing JSX like
  // `{name ? \`Hello, ${name}!\` : "Hi"}` keeps its template literal. Without
  // this the escaped backticks closed the span and the answer showed
  // \Hello, ${name}!\ instead of the code the model wrote.
  function findClose(s, start, ticks) {
    let i = start;
    while (i < s.length) {
      if (ticks === 1 && isEscape(s, i)) { i += 2; continue; }
      if (s[i] === '`') {
        const run = tickRun(s, i);
        if (run === ticks) return i;
        i += run;
        continue;
      }
      i++;
    }
    return -1;
  }

  function codeSpan(content, ticks) {
    let code = ticks === 1 ? unescapeTicks(content) : content;
    // CommonMark: `` `x` `` strips one space each side so a span can hold backticks at its edges.
    if (code.length > 2 && code[0] === ' ' && code[code.length - 1] === ' ' && code.trim()) code = code.slice(1, -1);
    return '<code>' + esc(code) + '</code>';
  }

  function inline(s) {
    let html = '', text = '', i = 0;
    while (i < s.length) {
      if (isEscape(s, i)) { text += s[i + 1] === '`' ? '`' : '\\\\'; i += 2; continue; }
      if (s[i] !== '`') { text += s[i]; i++; continue; }
      const ticks = tickRun(s, i);
      const close = findClose(s, i + ticks, ticks);
      if (close === -1) { text += s.slice(i, i + ticks); i += ticks; continue; }
      html += formatText(text) + codeSpan(s.slice(i + ticks, close), ticks);
      text = '';
      i = close + ticks;
    }
    return html + formatText(text);
  }

  function renderMarkdown(text) {
    const lines = text.split('\n');
    // inList is the open list's tag ('ul' or 'ol') or '' when none is open.
    let html = '', inCode = false, inList = '', buf = [];
    const flushP = () => { if (buf.length) { html += '<p>' + inline(buf.join(' ')) + '</p>'; buf = []; } };
    const closeList = () => { if (inList) { html += '</' + inList + '>'; inList = ''; } };
    const listItem = (tag, content) => {
      flushP();
      if (inList !== tag) { closeList(); html += '<' + tag + '>'; inList = tag; }
      html += '<li>' + inline(content) + '</li>';
    };
    for (const line of lines) {
      const fence = /^```\s*([\w+#.-]*)/.exec(line.trim());
      if (fence) {
        // The language tag rides along as data-lang, so a plain-text block
        // (a folder tree) can keep its spacing instead of wrapping like code.
        if (!inCode) { flushP(); closeList(); html += '<pre' + (fence[1] ? ' data-lang="' + esc(fence[1].toLowerCase()) + '"' : '') + '><code>'; inCode = true; }
        else { html += '</code></pre>'; inCode = false; }
        continue;
      }
      if (inCode) { html += esc(line) + '\n'; continue; }
      if (/^\s*[-*]\s+/.test(line)) { listItem('ul', line.replace(/^\s*[-*]\s+/, '')); continue; }
      if (/^\s*\d+[.)]\s+/.test(line)) { listItem('ol', line.replace(/^\s*\d+[.)]\s+/, '')); continue; }
      if (line.trim() === '') { flushP(); closeList(); continue; }
      buf.push(line.trim());
    }
    flushP(); closeList(); if (inCode) html += '</code></pre>';
    return html;
  }

  const api = { renderMarkdown };
  if (typeof window !== 'undefined') window.CueMarkdown = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
