// Minimal, safe markdown for answers: fenced code, bullets, inline code, bold,
// paragraphs. Pure functions, no DOM, so node tests can load it. The renderer
// uses window.CueMarkdown.
(function () {
  function esc(s) { return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function formatText(s) {
    return esc(s.replace(/\\`/g, '`')).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
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
      if (ticks === 1 && s[i] === '\\' && s[i + 1] === '`') { i += 2; continue; }
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
    let code = ticks === 1 ? content.replace(/\\`/g, '`') : content;
    // CommonMark: `` `x` `` strips one space each side so a span can hold backticks at its edges.
    if (code.length > 2 && code[0] === ' ' && code[code.length - 1] === ' ' && code.trim()) code = code.slice(1, -1);
    return '<code>' + esc(code) + '</code>';
  }

  function inline(s) {
    let html = '', text = '', i = 0;
    while (i < s.length) {
      if (s[i] === '\\' && s[i + 1] === '`') { text += '\\`'; i += 2; continue; }
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
    let html = '', inCode = false, inList = false, buf = [];
    const flushP = () => { if (buf.length) { html += '<p>' + inline(buf.join(' ')) + '</p>'; buf = []; } };
    for (const line of lines) {
      if (/^```/.test(line.trim())) {
        if (!inCode) { flushP(); if (inList) { html += '</ul>'; inList = false; } html += '<pre><code>'; inCode = true; }
        else { html += '</code></pre>'; inCode = false; }
        continue;
      }
      if (inCode) { html += esc(line) + '\n'; continue; }
      if (/^\s*[-*]\s+/.test(line)) { flushP(); if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(line.replace(/^\s*[-*]\s+/, '')) + '</li>'; continue; }
      if (line.trim() === '') { flushP(); if (inList) { html += '</ul>'; inList = false; } continue; }
      buf.push(line.trim());
    }
    flushP(); if (inList) html += '</ul>'; if (inCode) html += '</code></pre>';
    return html;
  }

  const api = { renderMarkdown };
  if (typeof window !== 'undefined') window.CueMarkdown = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
