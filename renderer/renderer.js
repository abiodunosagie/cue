/* cue renderer — UI state, mic capture, IPC, streaming render. */
(function () {
  const { icon } = window.ICONS;
  const cue = window.cue; // exposed by preload
  const $ = (s) => document.querySelector(s);
  const isWindows = cue.platform === 'win32';
  const isMac = cue.platform === 'darwin';

  // Exiting must work before settings or provider setup has completed.
  const quitButton = $('#quit-btn');
  quitButton.addEventListener('click', () => cue.quit());
  quitButton.title = isMac ? 'Quit cue (⌘⇧X)' : 'Quit cue (Ctrl+Shift+X)';
  $('#hide-btn').title = isMac ? 'Hide or show the answers (⌘⇧H)' : 'Hide or show the answers (Ctrl+Shift+H)';
  // The key shows on the button itself: a tooltip never appears on a window that is not focused.
  $('#hide-kbd').textContent = isMac ? '⌘⇧H' : 'Ctrl+Shift+H';
  // Keyboard moves keep the mouse pointer still, which matters when the screen is shared.
  $('.drag-pill').title = isMac
    ? 'Drag to move. Without the mouse: Ctrl+Option+⌘ with the arrow keys moves cue, with U or D scrolls the answer, with C copies the code in view'
    : 'Drag to move. Without the mouse: Ctrl+Alt+Shift with the arrow keys moves cue, with U or D scrolls the answer, with C copies the code in view';

  // ---- paint icons -------------------------------------------------------
  $('#logo-btn').innerHTML = icon('logo', { size: 18 });
  $('.tb-hide .chev').innerHTML = icon('chevron-down', { size: 14 });
  // Two icons, CSS shows one: a dot to start listening, a red square to stop.
  $('#stop-btn').innerHTML = '<span class="ic-start">' + icon('record', { size: 12 }) + '</span>' +
    '<span class="ic-stop">' + icon('stop-square', { size: 14 }) + '</span>';
  $('#quit-btn').innerHTML = icon('x', { size: 14 });
  document.querySelector('.act[data-mode="assist"] .ic').innerHTML = icon('sparkles', { size: 16 });
  document.querySelector('.act[data-mode="say"] .ic').innerHTML = icon('wand-sparkles', { size: 16 });
  document.querySelector('.act[data-mode="followup"] .ic').innerHTML = icon('message-circle', { size: 16 });
  document.querySelector('.act[data-mode="recap"] .ic').innerHTML = icon('refresh-cw', { size: 16 });
  $('#script-btn .ic').innerHTML = icon('scroll-text', { size: 16 });
  $('#smart-toggle .ic').innerHTML = icon('zap', { size: 14 });
  $('#more-btn').innerHTML = icon('more-horizontal', { size: 18 });
  $('#send-btn').innerHTML = icon('play', { size: 15 });
  const clearIC = document.querySelector('#clear-transcript-btn .ic');
  if (clearIC) clearIC.innerHTML = icon('trash-2', { size: 15 });

  // ---- state -------------------------------------------------------------
  let settings = null;
  // Redacted view of the publik API state (never the key), from main via
  // cue.publikState() at boot and the publik:state push thereafter.
  let publikState = null;
  let whisperOverview = null;
  let busy = false;
  let aiEl = null;       // current streaming <div class="ai-text">
  let caretEl = null;
  // While an answer streams, its text is grouped into .w-para blocks split where
  // the final markdown will split it (window.StreamBlocks), so reading follow can
  // track the user from the first sentence. finalizeAi swaps in the rendered markdown.
  let streamPara = null;
  let splitter = null;
  let responseCount = 0;
  const MAX_RESPONSES = 20;

  const messages = $('#messages');

  const { renderMarkdown } = window.CueMarkdown;

  function fillModelFields() {
    const m = settings.models[settings.provider] || {};
    $('#model-fast').value = m.fast || '';
    $('#model-smart').value = m.smart || '';
    $('#model-coding').value = m.coding || '';
  }

  // At low tint a soft shadow keeps white text legible over a white page.
  function applyPanelOpacity(value) {
    const alpha = window.PanelOpacity.normalize(value);
    const root = document.documentElement.style;
    root.setProperty('--panel-alpha', String(alpha));
    root.setProperty('--panel-blur', window.PanelOpacity.blurFor(alpha) + 'px');
    root.setProperty('--panel-text-shadow', alpha < 0.75 ? '0 1px 3px rgba(0,0,0,0.85)' : 'none');
    const out = document.getElementById('panel-opacity-value');
    if (out) out.textContent = Math.round(alpha * 100) + '%';
  }

  // Copy a code block exactly as the model wrote it, so nothing is retyped by hand.
  messages.addEventListener('click', (e) => {
    const b = e.target.closest('.copy-code');
    // renderMarkdown always emits <pre><code>, the only place these buttons go.
    if (b) copyCodeBlock(b.parentElement);
  });

  async function copyCodeBlock(pre) {
    const code = pre.querySelector('code');
    const b = pre.querySelector('.copy-code');
    if (!code) return;
    try {
      await cue.copyText(code.textContent.replace(/\n$/, ''));
    } catch (err) {
      cue.log('copy failed: ' + (err && err.message ? err.message : String(err)));
      showToast('Could not copy', 1600);
      return;
    }
    if (b) {
      b.innerHTML = icon('check', { size: 14 });
      b.classList.add('done');
      clearTimeout(b._revert);
      b._revert = setTimeout(() => { b.innerHTML = icon('copy', { size: 14 }); b.classList.remove('done'); }, 1400);
    }
    showToast('Copied', 1200);
  }

  // The copy key (Ctrl+Option+Cmd+C): copy the topmost code block in view, so
  // working down a step-by-step answer never needs the mouse.
  function copyCodeInView() {
    const top = messages.getBoundingClientRect().top;
    const pre = [...messages.querySelectorAll('pre')].find((p) => p.getBoundingClientRect().bottom > top + 8);
    // A block in the answer still streaming may be half written: copy it only when done.
    if (pre && aiEl && aiEl.contains(pre)) showToast('Still writing this code', 1400);
    else if (pre) copyCodeBlock(pre);
    else showToast('No code on screen', 1400);
  }

  function clearMessages() { messages.innerHTML = ''; aiEl = null; caretEl = null; streamPara = null; splitter = null; readingFollow.reset(); }

  function addUserBubble(text) {
    const b = document.createElement('div');
    b.className = 'user-bubble';
    b.textContent = text;
    messages.appendChild(b);
  }

  function startAi(small, parent = messages) {
    streamPara = null;
    splitter = window.StreamBlocks.createStreamSplitter();
    aiEl = document.createElement('div');
    aiEl.className = 'ai-text' + (small ? ' small' : '');
    aiEl.dataset.raw = '';
    caretEl = document.createElement('span');
    caretEl.className = 'ai-caret';
    aiEl.appendChild(caretEl);
    parent.appendChild(aiEl);
  }

  function currentStreamPara() {
    if (!streamPara || streamPara.parentNode !== aiEl) {
      streamPara = document.createElement('div');
      streamPara.className = 'w-para';
      aiEl.appendChild(streamPara);
      if (caretEl) streamPara.appendChild(caretEl); // the caret follows the newest text
    }
    return streamPara;
  }

  // Once an answer contains code, it is shown as rendered markdown while it
  // streams (refreshed once a frame), so code reads as code from its first
  // line instead of as raw text until the answer ends. An open code fence is
  // closed for the preview only.
  let markdownFrame = 0;
  function renderStreamingMarkdown() {
    markdownFrame = 0;
    if (!aiEl || aiEl.dataset.md !== '1') return;
    const raw = aiEl.dataset.raw || '';
    const openFence = ((raw.match(/```/g) || []).length % 2) === 1;
    aiEl.innerHTML = renderMarkdown(openFence ? raw + '\n```' : raw);
    pairCodeWithSay(aiEl);
    streamPara = null;
    // The caret follows the newest text: after a code/Say pair it goes in the
    // Say box, never loose in the pair's grid (where it would drop to its own row).
    const last = aiEl.lastElementChild;
    const home = !last || last.tagName === 'PRE' ? aiEl : last.classList.contains('step-pair') ? (last.lastElementChild || aiEl) : last;
    if (caretEl) home.appendChild(caretEl);
  }

  // The coding model thinks before its first word. Until that word, show how
  // long it has been working and the newest line of its thinking summary, so a
  // long wait is visibly alive. The first word removes the note.
  function showWaitNote(target) {
    const wait = document.createElement('div');
    wait.className = 'ai-wait';
    const head = document.createElement('div');
    head.className = 'ai-wait-head';
    const thought = document.createElement('div');
    thought.className = 'ai-wait-thought';
    wait.append(head, thought);
    target.insertBefore(wait, caretEl && caretEl.parentNode === target ? caretEl : null);
    const started = Date.now();
    const tick = () => {
      // Stop once the note is gone: first word, finish, error or Clear. (parentNode,
      // not isConnected: the answer is added to the page just after this runs.)
      if (!wait.parentNode || target !== aiEl) { clearInterval(timer); return; }
      head.textContent = 'Working on the solution, ' + Math.round((Date.now() - started) / 1000) + 's';
    };
    const timer = setInterval(tick, 1000);
    tick();
  }

  // The newest complete line of the thinking summary, without markdown marks.
  function latestThought(summary) {
    const lines = summary.split('\n').map((l) => l.replace(/[*_#`]/g, '').trim()).filter(Boolean);
    const line = lines.length > 1 && !/[.!?:]$/.test(lines[lines.length - 1]) ? lines[lines.length - 2] : lines[lines.length - 1];
    return line ? (line.length > 160 ? line.slice(0, 157) + '...' : line) : '';
  }

  function appendThinking(t) {
    const wait = aiEl && aiEl.querySelector('.ai-wait');
    if (!wait) return;
    // Only the tail matters (the newest line), so the kept text stays short.
    wait.dataset.summary = ((wait.dataset.summary || '') + t).slice(-2000);
    wait.querySelector('.ai-wait-thought').textContent = latestThought(wait.dataset.summary);
  }

  function appendToken(t) {
    if (!aiEl) startAi(false);
    if (aiEl.dataset.section === 'full' && !aiEl.dataset.raw) showToast(isMac ? 'Full solution is here, below the quick start (Ctrl+Option+⌘D scrolls)' : 'Full solution is here, below the quick start (Ctrl+Alt+Shift+D scrolls)', 3200);
    const wait = aiEl.querySelector('.ai-wait');
    if (wait) wait.remove();
    aiEl.dataset.raw += t;
    if (aiEl.dataset.md === '1' || aiEl.dataset.raw.includes('```')) {
      aiEl.dataset.md = '1';
      aiEl.dataset.noFollow = '1'; // an answer with code is worked through, not read aloud
      if (!markdownFrame) markdownFrame = requestAnimationFrame(renderStreamingMarkdown);
      return;
    }
    for (const piece of splitter.push(t)) {
      if (piece.break) { streamPara = null; continue; }
      const span = document.createElement('span');
      span.className = 'w';
      span.textContent = piece.text;
      const para = currentStreamPara();
      para.insertBefore(span, caretEl && caretEl.parentNode === para ? caretEl : null);
    }
  }

  // In a coding answer, each code block and the Say line right after it sit
  // side by side, code on the left and the words to say on the right, so the
  // user can type and talk from one glance. Nothing else in the answer moves.
  function pairCodeWithSay(el) {
    for (const pre of Array.from(el.querySelectorAll(':scope > pre'))) {
      const say = pre.nextElementSibling;
      const first = say && say.tagName === 'P' ? say.firstElementChild : null;
      if (!first || first.tagName !== 'STRONG' || !/^Say:?$/i.test(first.textContent.trim())) continue;
      const pair = document.createElement('div');
      pair.className = 'step-pair';
      el.insertBefore(pair, pre);
      pair.appendChild(pre);
      pair.appendChild(say);
    }
  }

  // Wrap each sentence of a finished paragraph in <span class="sent">, so the
  // one being read aloud can be highlighted. Inline markup (bold, code) moves
  // into the span whole and the text itself is unchanged, so matching is too.
  function wrapSentences(block) {
    const spans = [];
    let span = document.createElement('span');
    span.className = 'sent';
    const close = () => {
      if (span.textContent.trim()) spans.push(span);
      else if (spans.length) while (span.firstChild) spans[spans.length - 1].appendChild(span.firstChild);
      span = document.createElement('span');
      span.className = 'sent';
    };
    for (const node of Array.from(block.childNodes)) {
      if (node.nodeType !== Node.TEXT_NODE) { span.appendChild(node); continue; }
      // Keep the space after a sentence with that sentence.
      const parts = node.textContent.split(/(?<=[.!?]["')\]]?\s+)/);
      parts.forEach((part) => {
        span.appendChild(document.createTextNode(part));
        if (/[.!?]["')\]]?\s+$/.test(part)) close();
      });
    }
    close();
    block.replaceChildren(...spans);
  }

  function finalizeAi() {
    if (!aiEl) return;
    const raw = aiEl.dataset.raw || '';
    if (markdownFrame) { cancelAnimationFrame(markdownFrame); markdownFrame = 0; }
    aiEl.innerHTML = renderMarkdown(raw);
    // Pair before wrapping sentences: pairing looks for the bold Say label as
    // the paragraph's first element, which sentence spans would hide.
    if (aiEl.dataset.md === '1') pairCodeWithSay(aiEl);
    aiEl.querySelectorAll(':scope > p, :scope > ul > li, :scope > ol > li').forEach(wrapSentences);
    aiEl.dataset.final = '1';
    streamPara = null; splitter = null;
    // Icon only, so the reading tracker (which reads each <pre>'s text) gains no words.
    aiEl.querySelectorAll('pre').forEach((pre) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-code';
      b.title = 'Copy code';
      b.setAttribute('aria-label', 'Copy code');
      b.innerHTML = icon('copy', { size: 14 });
      pre.appendChild(b);
    });
    aiEl = null; caretEl = null;
  }

  // Under a coding answer that finished (never one cut short by an error: that
  // one was not saved, so these would work from an older solve): one click to
  // explain the code, or to check the progress on screen against the plan.
  function addCodingButtons(el) {
    if (!el || el.dataset.coding !== '1' || el.dataset.error) return;
    const row = document.createElement('div');
    row.className = 'coding-actions';
    const key = (letter) => (isWindows ? 'Ctrl+Shift+' + letter : '⌘⇧' + letter);
    const fixKey = isMac ? 'Ctrl+Option+⌘F' : 'Ctrl+Alt+Shift+F';
    for (const [label, shortcut, mode] of [['Explain this code', key('E'), 'explainCode'], ['Check my progress', key('C'), 'checkProgress'], ['Fix my code', fixKey, 'fixCode']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'coding-action';
      b.textContent = label + ' (' + shortcut + ')';
      b.addEventListener('click', () => runMode(mode));
      row.appendChild(b);
    }
    el.appendChild(row);
  }

  // Failsafe: main's stream watchdog (25s between tokens; for coding solves 45s,
  // or 120s of silence before the first word) always sends llm:done/llm:error, but
  // if a terminal event is ever lost the whole UI stays frozen. Rearmed on every
  // token, thinking and status line, and longer than main's longest silence (a
  // silent 30s quick start, then 120s before the full solution's first word, after
  // the "Solving it now" status), so a solve that is still working never unlocks
  // the UI while main is still busy and would drop the next question.
  const BUSY_FAILSAFE_MS = 200000;
  let busyFailsafe = null;
  function armBusyFailsafe() {
    clearTimeout(busyFailsafe);
    busyFailsafe = setTimeout(() => { busy = false; $('#send-btn').classList.toggle('busy', false); }, BUSY_FAILSAFE_MS);
  }
  function setBusy(v) {
    busy = v;
    $('#send-btn').classList.toggle('busy', v);
    clearTimeout(busyFailsafe);
    if (v) armBusyFailsafe();
  }

  // Without headphones the mic also hears the interviewer; that is not the user talking.
  function isInterviewerEcho(channel, text) {
    return channel === 'you' && inputFromSTT && window.ReadingTracker.isEcho(text, input.value);
  }

  // ---- reading follow ----------------------------------------------------
  // While the user reads an answer aloud, their mic transcript is matched to
  // the answer's paragraphs and #messages scrolls so the line being read sits
  // near the top, with what comes next visible below it.
  const readingFollow = (() => {
    const { tokenize, locate } = window.ReadingTracker;
    const MAX_SPOKEN = 40;      // buffer; locate() only weighs the newest WINDOW words
    const READ_LINE = 0.3;      // reading point sits this far down the view
    const MIN_STEP_PX = 24;     // ignore moves smaller than about a line
    const MANUAL_PAUSE_MS = 4000;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let committed = [];
    let interim = [];
    let trackedEl = null;
    let blocks = [];
    let tokens = [];
    let current = -1;
    let pausedUntil = 0;
    let pendingFrame = 0;

    // The line being read: the sentence when the answer has finished (its
    // sentences are wrapped), else the whole paragraph while it streams.
    let highlighted = null;
    function highlight(found) {
      const block = blocks[found.index];
      let target = block;
      const sentences = block && block.querySelectorAll ? block.querySelectorAll(':scope > .sent') : [];
      if (sentences.length) {
        // Place the reading point by the share of the paragraph's words already read.
        const counts = Array.from(sentences, (s) => Math.max(1, tokenize(s.textContent).length));
        const total = counts.reduce((a, b) => a + b, 0);
        let reach = found.progress * total;
        target = sentences[sentences.length - 1];
        for (let i = 0; i < sentences.length; i++) {
          if (reach <= counts[i]) { target = sentences[i]; break; }
          reach -= counts[i];
        }
      }
      if (target === highlighted) return;
      if (highlighted) highlighted.classList.remove('reading');
      if (target && target !== trackedEl) target.classList.add('reading');
      highlighted = target !== trackedEl ? target : null;
    }
    function clearHighlight() {
      if (highlighted) highlighted.classList.remove('reading');
      highlighted = null;
    }

    function reset() {
      if (pendingFrame) { cancelAnimationFrame(pendingFrame); pendingFrame = 0; }
      clearHighlight();
      committed = []; interim = [];
      trackedEl = null; trackedFinal = false; trackedLen = -1; trackedRendered = false; blocks = []; tokens = []; current = -1;
    }

    // The newest answer, streaming or finished, when it is one to follow.
    // Error bubbles are skipped so a failed follow-up does not steal focus, and
    // code answers are never followed: their steps are worked through, and
    // reading one Say line aloud would jump to a later step.
    function latestAnswer() {
      const all = messages.querySelectorAll('.ai-text:not([data-error])');
      const el = all[all.length - 1] || null;
      return el && el.dataset.noFollow === '1' ? null : el;
    }

    // Point the tracker at the newest answer. False when there is none.
    // While it streams, blocks are its .w-para groups and are re-read as text
    // arrives; when it finishes, finalizeAi swaps them for rendered paragraphs
    // on the same element, so the finished flag is part of the identity check.
    let trackedFinal = false;
    let trackedLen = -1;          // streamed text length the blocks were read at
    let trackedRendered = false;  // blocks already read from the finished render
    function syncAnswer() {
      const el = latestAnswer();
      if (!el) return false;
      const final = el.dataset.final === '1';
      if (el !== trackedEl || final !== trackedFinal) {
        trackedEl = el; trackedFinal = final; trackedLen = -1; trackedRendered = false;
        current = -1;
        clearHighlight();
      }
      if (!final) {
        const len = (el.dataset.raw || '').length;
        if (len !== trackedLen) {
          trackedLen = len;
          blocks = Array.from(el.querySelectorAll(el.dataset.md === '1' ? ':scope > p, :scope > ul > li, :scope > ol > li, :scope > pre' : ':scope > .w-para'));
          tokens = blocks.map((b) => tokenize(b.textContent));
        }
        if (!blocks.length) return false;
      } else if (!trackedRendered) {
        trackedRendered = true;
        blocks = Array.from(el.querySelectorAll(':scope > p, :scope > ul > li, :scope > ol > li, :scope > pre'));
        if (!blocks.length) blocks = [el];
        tokens = blocks.map((b) => tokenize(b.textContent));
      }
      return true;
    }

    // One log line per finished spoken sentence saying what the tracker did.
    // Counts and positions only, never the words, so the log holds nothing private.
    let logPending = false;
    function note(outcome) {
      if (!logPending) return;
      logPending = false;
      cue.log(`[follow] ${outcome} blocks=${blocks.length} at=${current} spoken=${committed.length + interim.length} ` +
        `scroll=${Math.round(messages.scrollTop)}/${Math.max(0, messages.scrollHeight - messages.clientHeight)} view=${messages.clientHeight}`);
    }

    function update() {
      if (!syncAnswer()) return note('no-finished-answer');
      if (Date.now() < pausedUntil) return note('paused-by-manual-scroll');
      const found = locate(tokens, committed.concat(interim), current);
      if (!found) return note('no-match');
      current = found.index;
      highlight(found);
      const block = blocks[found.index];
      const viewTop = messages.getBoundingClientRect().top;
      const rect = block.getBoundingClientRect();
      const readingY = messages.scrollTop + (rect.top - viewTop) + rect.height * found.progress;
      const target = Math.max(0, readingY - messages.clientHeight * READ_LINE);
      if (Math.abs(target - messages.scrollTop) < MIN_STEP_PX) return note('in-place');
      note(`scroll-to-${Math.round(target)}`);
      messages.scrollTo({ top: target, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    function onSpeech(text, isFinal) {
      const words = tokenize(text);
      if (isFinal) {
        committed = committed.concat(words).slice(-MAX_SPOKEN);
        interim = [];
        logPending = true;
      } else {
        interim = words;
      }
      // Interim results can arrive several times a second; match once per frame.
      if (!pendingFrame) pendingFrame = requestAnimationFrame(() => { pendingFrame = 0; update(); });
    }

    // Any manual scroll wins for a few seconds, so auto-scroll never fights the user.
    const pause = () => { pausedUntil = Date.now() + MANUAL_PAUSE_MS; };
    messages.addEventListener('wheel', pause, { passive: true });
    messages.addEventListener('touchmove', pause, { passive: true });
    messages.addEventListener('mousedown', pause);

    // True when this speech matches the answer on screen: the user is reading
    // it out, not answering something new.
    function isReading(text) {
      return syncAnswer() && locate(tokens, tokenize(text), -1) !== null;
    }

    return { reset, update, onSpeech, isReading };
  })();

  // Reading pace: while the user reads an answer aloud, a small "Slow down"
  // hint shows when they go fast enough to sound scripted.
  const paceHint = (() => {
    const monitor = window.ReadingTracker.createPaceMonitor();
    let hideTimer = null;
    function show(fast) {
      const el = document.getElementById('pace-hint');
      if (!el) return;
      el.classList.toggle('show', fast);
    }
    return {
      onSpeech(text) {
        if (!readingFollow.isReading(text)) return; // answering in their own words: no pace check
        const now = Date.now();
        monitor.add(text, now);
        const result = monitor.check(now);
        if (result) show(result.fast);
        // Silence ends the warning: they paused, which is the point.
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => { monitor.reset(); show(false); }, 6000);
      },
      reset() { monitor.reset(); show(false); clearTimeout(hideTimer); }
    };
  })();

  // ---- teleprompter (the Script button) -----------------------------------
  // The candidate reads a script they wrote, for example an intro video. The
  // words move with their voice (window.ScriptFollow): the word just said is
  // lit, words read are dimmed, and the view scrolls only as far as they have
  // read. Silence holds it still. Speech during a script never reaches the
  // interview (main drops it from the transcript and memory).
  const teleprompter = (() => {
    const COUNTDOWN_S = 5;
    const READ_LINE = 0.35;       // the word being said sits this far down the view
    // Recording: the word being said sits at the top, just under the lens,
    // so reading it looks like looking into the camera.
    const RECORD_READ_LINE = 0.04;
    const MANUAL_PAUSE_MS = 3000; // a manual scroll wins for a moment
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const bar = document.getElementById('script-bar');
    const label = document.getElementById('script-label');
    let text = '';
    let follower = null;
    let spans = [];
    let view = null;
    let countEl = null;
    let active = false;
    let counting = false;
    let startedListening = false;
    let lastToken = -1;
    let pausedUntil = 0;
    let countTimer = null;
    let record = null;       // { preset, scriptName } while recording, else null
    let take = 0;
    let taking = null;       // the take being started or finished (a promise)
    let recTimer = null;
    const recBadge = document.getElementById('rec-badge');
    const recTime = document.getElementById('rec-time');
    const films = () => !!(record && record.preset !== 'prompter');

    // The script as blocks of word spans, one span per display token, in the
    // follower's token order.
    function render() {
      view = document.createElement('div');
      view.className = 'script-view';
      countEl = document.createElement('div');
      countEl.className = 'script-count';
      countEl.setAttribute('aria-live', 'assertive');
      view.appendChild(countEl);
      // The follower's own tokens are what is shown, so span i is always token i.
      follower = window.ScriptFollow.createFollower(window.ScriptBlocks.splitScript(text));
      spans = [];
      let p = null;
      follower.tokens.forEach((token, i) => {
        if (!p || follower.tokenBlocks[i] !== follower.tokenBlocks[i - 1]) {
          p = document.createElement('p');
          view.appendChild(p);
        } else {
          p.appendChild(document.createTextNode(' '));
        }
        const span = document.createElement('span');
        span.className = 'sw';
        span.textContent = token;
        p.appendChild(span);
        spans.push(span);
      });
      messages.appendChild(view);
      messages.classList.add('script-mode');
    }

    // Words before `token` read (dimmed), `token` lit (the word just said; the
    // first word before any speech, so the eye knows where to start), and the
    // lit word brought to the reading line.
    function paint(token) {
      const lit = Math.max(0, token);
      spans.forEach((span, i) => {
        span.classList.toggle('said', i < lit);
        span.classList.toggle('now', i === lit);
      });
      lastToken = token;
      scrollTo(spans[lit]);
    }

    function scrollTo(span) {
      if (!span || Date.now() < pausedUntil) return;
      const viewTop = messages.getBoundingClientRect().top;
      const line = record ? RECORD_READ_LINE : READ_LINE;
      const target = Math.max(0, messages.scrollTop + (span.getBoundingClientRect().top - viewTop) - messages.clientHeight * line);
      if (Math.abs(target - messages.scrollTop) < 8) return;
      messages.scrollTo({ top: target, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    }

    // 5, 4, 3, 2, 1: time to press record and look at the camera.
    function countdown() {
      clearInterval(countTimer);
      counting = true;
      let left = COUNTDOWN_S;
      label.textContent = films() ? 'Recording starts after the count. Look at the camera.' : 'Start recording now';
      countEl.textContent = String(left);
      countTimer = setInterval(() => {
        left -= 1;
        if (left > 0) { countEl.textContent = String(left); return; }
        clearInterval(countTimer);
        countEl.textContent = '';
        counting = false;
        label.textContent = 'Reading: it follows your voice';
        if (films()) beginTake();
      }, 1000);
    }

    // One take: a new file, the REC badge and its clock.
    function beginTake() {
      take += 1;
      const started = Date.now();
      taking = window.CueRecorder.start({ scriptName: record.scriptName, preset: record.preset, take })
        .then(() => {
          recBadge.classList.remove('hidden');
          recTime.textContent = '0:00';
          clearInterval(recTimer);
          recTimer = setInterval(() => {
            const s = Math.floor((Date.now() - started) / 1000);
            recTime.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
          }, 500);
        })
        .catch((e) => { showStatus('Recording did not start: ' + (e && e.message ? e.message : String(e))); });
      return taking;
    }

    // Ends the take in progress, if any, and says where the video went.
    async function finishTake() {
      if (taking) await taking.catch(() => {});
      clearInterval(recTimer);
      recBadge.classList.add('hidden');
      if (!window.CueRecorder.recording()) return;
      const res = await window.CueRecorder.stop();
      if (res) showSaved(res);
    }

    // A line under the answers: the file and a Show in Finder button.
    function showSaved(res) {
      const box = document.createElement('div');
      box.className = 'rec-saved' + (res.error ? ' failed' : '');
      const text = document.createElement('span');
      if (res.error) text.textContent = res.error;
      else {
        const mb = res.bytes ? ` (${Math.max(1, Math.round(res.bytes / 1048576))} MB)` : '';
        text.textContent = `Saved ${res.file}${mb} in ${res.folder}.` + (res.remuxed ? '' : ' Install ffmpeg (brew install ffmpeg) for files that stream and show their length everywhere.') + (res.warning ? ' Part of it may be missing: ' + res.warning : '');
      }
      box.appendChild(text);
      if (res.path) {
        const btn = document.createElement('button');
        btn.className = 's-action';
        btn.textContent = 'Show in Finder';
        btn.addEventListener('click', async () => { const r = await cue.recordReveal(res.path); if (r && r.error) text.textContent = r.error; });
        box.appendChild(btn);
      }
      messages.appendChild(box);
      if (!active) messages.scrollTop = messages.scrollHeight;
    }

    // opts.record: { preset, scriptName } to film the reading (Script > Record).
    async function start(scriptText, opts = {}) {
      if (active) stop();
      text = scriptText;
      active = true;
      record = opts.record || null;
      take = 0;
      if (record) {
        document.body.classList.add('record-mode');
        cue.recordPlace(true);
      }
      cue.scriptActive(true);
      try {
        // It follows the mic, so listening must be on; it is turned off again at Done.
        const listening = await cue.captureState();
        startedListening = false;
        if (!(listening && listening.active)) {
          startedListening = !!(await cue.captureToggle());
          if (!startedListening) showStatus('Listening could not start, so the script cannot follow your voice. Check the microphone in Settings > Audio.');
        }
        render();
        lastToken = -1;
        paint(-1);
        bar.classList.remove('hidden');
        document.getElementById('panel-main').classList.add('scripting');
        messages.scrollTop = 0;
        countdown();
      } catch (e) {
        // Never leave main dropping interview speech for a script that is not on screen.
        stop();
        showStatus('The script could not start. Try again.');
      }
    }

    // Start over: while filming, the take so far is saved and a new one starts after the count.
    async function restart() {
      if (!active) return;
      if (films()) await finishTake();
      if (!active) return;
      follower.reset();
      spans.forEach((s) => s.classList.remove('said', 'now'));
      lastToken = -1;
      pausedUntil = 0;
      paint(-1);
      messages.scrollTop = 0;
      countdown();
    }

    function stop() {
      if (!active) return;
      active = false;
      counting = false;
      clearInterval(countTimer);
      if (record) {
        record = null;
        // The camera goes off once the last take is on disk.
        finishTake().finally(() => { window.CueRecorder.close(); });
        document.body.classList.remove('record-mode');
        cue.recordPlace(false);
      }
      cue.scriptActive(false);
      if (startedListening) cue.captureToggle();
      startedListening = false;
      if (view) view.remove();
      view = null; spans = []; follower = null;
      messages.classList.remove('script-mode');
      document.getElementById('panel-main').classList.remove('scripting');
      bar.classList.add('hidden');
      messages.scrollTop = messages.scrollHeight;
    }

    function hear(said, isFinal) {
      if (!active || counting || !follower) return;
      const st = follower.hear(said, isFinal);
      if (st.token !== lastToken) paint(st.token);
      if (st.done) label.textContent = films() ? 'End of script. Press Done to save the video.' : 'End of script. Stop recording, then press Done.';
    }

    messages.addEventListener('wheel', () => { if (active) pausedUntil = Date.now() + MANUAL_PAUSE_MS; }, { passive: true });
    document.getElementById('script-restart-btn').addEventListener('click', restart);
    document.getElementById('script-done-btn').addEventListener('click', stop);
    cue.on('script:heard', ({ text: said }) => hear(said, true));

    return { start, stop, hear, isActive: () => active };
  })();

  // The Script window: saved scripts, the text, Check it, and Start.
  (() => {
    const scrim = document.getElementById('script-scrim');
    const pick = document.getElementById('script-pick');
    const name = document.getElementById('script-name');
    const area = document.getElementById('script-text');
    const meta = document.getElementById('script-meta');
    const status = document.getElementById('script-status');
    const review = document.getElementById('script-review');
    const checkBtn = document.getElementById('script-check');
    const deleteBtn = document.getElementById('script-delete');
    let currentId = '';
    let saveTimer = null;
    let revised = '';
    let deleteArmed = null;

    const scripts = () => (settings && Array.isArray(settings.scripts) ? settings.scripts : []);
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    function showMeta() {
      const { words, seconds } = window.ScriptBlocks.readingTime(area.value);
      meta.textContent = words ? `${words} words, about ${seconds < 60 ? seconds + ' seconds' : Math.floor(seconds / 60) + ' min ' + (seconds % 60) + ' s'} at a calm pace` : '0 words';
    }

    function fillPicker() {
      pick.replaceChildren(...scripts().map((s) => {
        const o = document.createElement('option');
        o.value = s.id; o.textContent = s.title;
        return o;
      }));
      pick.disabled = !scripts().length;
      if (currentId) pick.value = currentId;
    }

    function disarmDelete() {
      clearTimeout(deleteArmed); deleteArmed = null;
      deleteBtn.textContent = 'Delete';
    }

    function load(id) {
      disarmDelete();
      const s = scripts().find((x) => x.id === id);
      currentId = s ? s.id : '';
      name.value = s ? s.title : '';
      area.value = s ? s.text : '';
      review.classList.add('hidden');
      status.textContent = '';
      showMeta();
      fillPicker();
    }

    // Saved as you type: into settings.scripts, cleaned by main (src/scripts.js).
    async function save() {
      clearTimeout(saveTimer);
      if (!settings) return;
      if (!area.value.trim() && !name.value.trim() && !currentId) return;
      const title = name.value.trim() || area.value.trim().split(/\s+/).slice(0, 5).join(' ') || 'Untitled script';
      const list = scripts().filter((s) => s.id !== currentId);
      if (!currentId) currentId = newId();
      list.unshift({ id: currentId, title, text: area.value, updatedAt: Date.now() });
      await saveScripts(list);
      fillPicker();
    }
    // Main cleans the list (src/scripts.js): keep what it saved, not what was sent.
    async function saveScripts(list) {
      const saved = await cue.settingsSet({ scripts: list });
      settings.scripts = saved && Array.isArray(saved.scripts) ? saved.scripts : list;
    }
    const saveSoon = () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 600); };

    // ---- Record: camera, microphone, video shape and the framing preview ----
    const recOn = document.getElementById('rec-on');
    const recOptions = document.getElementById('rec-options');
    const recPreset = document.getElementById('rec-preset');
    const recCamera = document.getElementById('rec-camera');
    const recMic = document.getElementById('rec-mic');
    const recPreview = document.getElementById('rec-preview');
    const recFrame = document.getElementById('rec-frame');
    const recSize = document.getElementById('rec-size');
    const recAdvice = document.getElementById('rec-advice');
    const recFolder = document.getElementById('rec-folder');
    const Presets = window.CueRecordPresets;
    const recPrefs = () => ({ cameraId: '', micId: '', on: false, preset: Presets.DEFAULT_PRESET, ...((settings && settings.recording) || {}) });
    let previewSeq = 0;

    function fillSelect(sel, items, value) {
      sel.replaceChildren(...items.map((it) => { const o = document.createElement('option'); o.value = it.id; o.textContent = it.label; return o; }));
      if (items.some((it) => it.id === value)) sel.value = value;
    }

    async function saveRecPrefs(patch) {
      const next = { ...recPrefs(), ...patch };
      const saved = await cue.settingsSet({ recording: next });
      settings.recording = (saved && saved.recording) || next;
    }

    // Shows the camera for framing (and fills the device lists: their names
    // appear only once the camera may be used). Off: the camera light goes out.
    async function refreshRecord() {
      const seq = ++previewSeq;
      const prefs = recPrefs();
      recOn.checked = prefs.on;
      recOptions.classList.toggle('hidden', !prefs.on);
      document.getElementById('script-start').textContent = prefs.on && prefs.preset !== 'prompter' ? 'Start recording' : 'Start';
      if (!recPreset.options.length) {
        fillSelect(recPreset, Presets.PRESET_IDS.map((id) => ({ id, label: Presets.PRESETS[id].label })), prefs.preset);
      }
      recPreset.value = prefs.preset;
      const p = Presets.PRESETS[prefs.preset];
      recAdvice.textContent = p.usual + ' ' + p.camera;
      if (!prefs.on) { window.CueRecorder.close(); recPreview.srcObject = null; return; }
      const info = await cue.recordInfo().catch(() => null);
      if (info && info.folder) recFolder.textContent = 'Saves to ' + info.folder;
      const films = !!p.request;
      recFrame.classList.toggle('hidden', !films);
      recCamera.disabled = !films; recMic.disabled = !films;
      if (!films) { window.CueRecorder.close(); recPreview.srcObject = null; recSize.textContent = 'Nothing is recorded in this mode.'; return; }
      recSize.textContent = 'Turning the camera on...';
      try {
        const got = await window.CueRecorder.preview(recPreview, prefs);
        if (seq !== previewSeq) return;
        const { cameras, mics } = await window.CueRecorder.devices();
        fillSelect(recCamera, cameras, prefs.cameraId);
        fillSelect(recMic, mics, prefs.micId);
        recSize.textContent = got
          ? `Records ${got.width}x${got.height} at ${got.fps} fps` + (got.cropped ? ', cut from this camera\'s wider picture.' : ', the camera\'s own picture.') + ' Line your eyes up with the dashed line.'
          : '';
      } catch (e) {
        if (seq !== previewSeq) return;
        recSize.textContent = e && e.name === 'NotAllowedError'
          ? 'cue may not use the camera. Allow it in System Settings > Privacy & Security > Camera, then open Script again.'
          : 'The camera did not start: ' + (e && e.message ? e.message : String(e));
      }
    }

    recOn.addEventListener('change', async () => { await saveRecPrefs({ on: recOn.checked }); refreshRecord(); });
    recPreset.addEventListener('change', async () => { await saveRecPrefs({ preset: recPreset.value }); refreshRecord(); });
    recCamera.addEventListener('change', async () => { await saveRecPrefs({ cameraId: recCamera.value }); refreshRecord(); });
    recMic.addEventListener('change', async () => { await saveRecPrefs({ micId: recMic.value }); refreshRecord(); });
    document.getElementById('rec-folder-btn').addEventListener('click', async () => {
      const res = await cue.recordChooseFolder().catch(() => null);
      if (res && res.folder) recFolder.textContent = 'Saves to ' + res.folder;
    });

    function open() {
      if (!settings) return;
      scrim.classList.remove('hidden');
      const newest = [...scripts()].sort((a, b) => b.updatedAt - a.updatedAt)[0];
      load(currentId || (newest ? newest.id : ''));
      area.focus();
      refreshRecord();
    }
    // keepCamera: Start is taking the camera into the recording.
    async function close(keepCamera = false) {
      await save();
      scrim.classList.add('hidden');
      previewSeq++;
      recPreview.srcObject = null;
      if (!keepCamera) window.CueRecorder.close();
    }

    area.addEventListener('input', () => { showMeta(); saveSoon(); });
    name.addEventListener('input', saveSoon);
    // The choice is read first: saving rebuilds the list, which puts the old one back in the box.
    pick.addEventListener('change', async () => { const chosen = pick.value; await save(); load(chosen); });
    document.getElementById('script-new').addEventListener('click', async () => { await save(); load(''); area.focus(); });
    // Two clicks: no native dialog (cue hides its dock icon, so one never comes forward).
    deleteBtn.addEventListener('click', async () => {
      if (!currentId) { load(''); return; }
      if (!deleteArmed) {
        deleteBtn.textContent = 'Delete? Click again';
        deleteArmed = setTimeout(() => { deleteArmed = null; deleteBtn.textContent = 'Delete'; }, 3000);
        return;
      }
      disarmDelete();
      await saveScripts(scripts().filter((s) => s.id !== currentId));
      currentId = '';
      load(scripts()[0] ? scripts()[0].id : '');
    });

    checkBtn.addEventListener('click', async () => {
      if (!area.value.trim()) { status.textContent = 'Write or paste your script first.'; return; }
      checkBtn.disabled = true;
      status.textContent = 'Checking your script...';
      review.classList.add('hidden');
      const res = await cue.scriptReview(area.value);
      checkBtn.disabled = false;
      if (!res || res.error) { status.textContent = (res && res.error) || 'The check did not work. Try again.'; return; }
      status.textContent = '';
      revised = res.revised;
      document.getElementById('script-verdict').textContent = res.verdict;
      document.getElementById('script-suggestions').replaceChildren(...res.suggestions.map((s) => {
        const li = document.createElement('li');
        li.textContent = s.what + ' ';
        if (s.why) { const why = document.createElement('span'); why.className = 'why'; why.textContent = s.why; li.appendChild(why); }
        return li;
      }));
      document.getElementById('script-revised').textContent = revised;
      review.classList.remove('hidden');
    });
    document.getElementById('script-use').addEventListener('click', async () => {
      area.value = revised;
      review.classList.add('hidden');
      showMeta();
      await save();
      status.textContent = 'Using the better version.';
    });
    document.getElementById('script-keep').addEventListener('click', () => review.classList.add('hidden'));

    document.getElementById('script-start').addEventListener('click', async () => {
      if (!area.value.trim()) { status.textContent = 'Write or paste your script first.'; return; }
      const prefs = recPrefs();
      const record = prefs.on ? { preset: prefs.preset, scriptName: name.value.trim() || 'cue recording' } : null;
      await close(!!record);
      teleprompter.start(area.value, { record });
    });
    document.getElementById('script-close').addEventListener('click', () => close());
    // Like Settings: Escape anywhere, or a click on the dimmed backdrop, closes it.
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scrim.classList.contains('hidden')) close(); });
    scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
    document.getElementById('script-btn').addEventListener('click', open);
  })();

  // ---- transcript helpers ------------------------------------------------
  // NOTE: The old transcript-list element was renamed to ts-list.
  // These helpers are now deprecated but kept for compatibility.
  // The main sidebar uses appendTranscriptHistoryTurn() instead.
  let transcriptInterimEl = null;

  // FIX #1: Updated to use ts-list instead of non-existent transcript-list

  function clearTranscriptInterim() {
    if (transcriptInterimEl) {
      transcriptInterimEl.remove();
      transcriptInterimEl = null;
    }
  }

  // ---- toast helper ------------------------------------------------------
  // FIX #7: Toast queue system — ensures latest toast wins cleanly without stacking
  let toastTimer = null;
  let toastFadeTimer = null;
  function showToast(message, ms) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.getElementById('app').appendChild(el);
    }
    // Clear any pending timers to prevent overlap
    clearTimeout(toastTimer);
    clearTimeout(toastFadeTimer);
    // Immediately update content (no stacking)
    el.textContent = message;
    el.classList.add('show');
    toastTimer = setTimeout(() => {
      el.classList.remove('show');
    }, ms);
  }

  // ---- actions -----------------------------------------------------------
  function runMode(mode, text) {
    if (busy) return;
    setBusy(true);
    cue.ask({ mode, text: text || '' });
  }

  document.querySelectorAll('.act[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => runMode(btn.dataset.mode, ''));
  });

  const input = $('#input');
  const placeholder = $('#placeholder');
  const composer = $('#composer');

  // ========== SMART AUTO-FILL SYSTEM ==========
  // Track whether the current input text came from STT auto-fill (Them channel)
  let inputFromSTT = false;
  let sttFillTimer = null;
  let questionFinalizeTimer = null;
  let softClearTimer = null;
  let userSpeechStart = null;

  // Question history for undo (Ctrl+Z)
  const questionHistory = [];
  const MAX_QUESTION_HISTORY = 10;

  // ---- Question completeness detection ----
  const QUESTION_SETTLE_MS = 600;
  const STATEMENT_SETTLE_MS = 1100;
  let heardAt = 0;

  function isLikelyCompleteQuestion(text) {
    const trimmed = (text || '').trim();
    
    // Must be substantial (not just filler words)
    if (trimmed.length < 12) return false;
    
    // High confidence: ends with question mark
    if (/\?$/.test(trimmed)) return true;
    
    // High confidence: behavioral interview patterns (these are complete even without ?)
    const behavioralPatterns = [
      /tell me about a time/i,
      /give me an example/i,
      /describe a (situation|time|project|challenge)/i,
      /walk me through/i,
      /can you (tell|describe|explain|share)/i,
      /what (was|were|is|are) your/i,
      /how (did|do|would) you/i,
      /why (did|do|are|should)/i,
      /what (did|do|would) you/i,
      /tell me about yourself/i,
      /tell me about your/i,
      /what.{1,30}(biggest|greatest|most|hardest|proudest)/i,
      /have you ever/i
    ];
    if (behavioralPatterns.some(p => p.test(trimmed))) return true;
    
    // Medium confidence: question starters with substantial content
    const questionStarters = /^(what|how|why|when|where|who|which|tell|describe|explain|can|could|would|should|have|did|do|is|are|was|were)/i;
    if (questionStarters.test(trimmed) && trimmed.length > 25) return true;
    
    // Medium confidence: ends with common question endings
    if (/(about that|for us|to us|with you|for you|about it|to share|you handle|you approach|your experience|your background)\s*$/i.test(trimmed)) return true;
    
    return false;
  }

  // ---- Get question confidence level ----
  function getQuestionConfidence(text) {
    const trimmed = (text || '').trim();
    if (trimmed.length < 8) return 'low';
    if (/\?$/.test(trimmed)) return 'high';
    if (isLikelyCompleteQuestion(trimmed)) return 'medium';
    if (trimmed.length > 20) return 'accumulating';
    return 'low';
  }

  // ---- Update visual state based on question readiness ----
  // FIX #8: Batch class updates to avoid flicker
  function updateQuestionReadyState() {
    const text = input.value;
    const confidence = getQuestionConfidence(text);
    
    // Batch the class changes to minimize repaints
    const shouldBeReady = confidence === 'high' || confidence === 'medium';
    const shouldBeAccumulating = confidence === 'accumulating';
    
    // Only update if state actually changed
    const isReady = composer.classList.contains('stt-ready');
    const isAccumulating = composer.classList.contains('stt-accumulating');
    
    if (shouldBeReady !== isReady || shouldBeAccumulating !== isAccumulating) {
      composer.classList.remove('stt-ready', 'stt-accumulating');
      if (shouldBeReady) {
        composer.classList.add('stt-ready');
      } else if (shouldBeAccumulating) {
        composer.classList.add('stt-accumulating');
      }
    }
    
    updateSendButtonState(); // FIX #9: Keep send button in sync
  }
  
  // FIX #9: Send button visual "ready" state
  function updateSendButtonState() {
    const sendBtn = document.getElementById('send-btn');
    if (!sendBtn) return;
    
    const hasText = input.value.trim().length > 0;
    const isReady = composer.classList.contains('stt-ready');
    
    sendBtn.classList.toggle('ready', hasText && isReady);
    sendBtn.classList.toggle('has-text', hasText);
  }

  // ---- Save question to history for undo ----
  function saveToQuestionHistory(text) {
    if (!text || text.trim().length < 5) return;
    
    // Don't save duplicates
    const last = questionHistory[questionHistory.length - 1];
    if (last && last.text === text.trim()) return;
    
    questionHistory.push({
      text: text.trim(),
      timestamp: Date.now()
    });
    
    // Keep only recent history
    while (questionHistory.length > MAX_QUESTION_HISTORY) {
      questionHistory.shift();
    }
    
    updateHistoryBadge(); // FIX #14: Update badge when history changes
  }
  
  // FIX #14: History button badge showing count
  function updateHistoryBadge() {
    const historyBtn = document.getElementById('history-btn');
    if (!historyBtn) return;
    
    // Remove existing badge if any
    let badge = historyBtn.querySelector('.history-badge');
    
    const count = questionHistory.length;
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'history-badge';
        historyBtn.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = '';
    } else if (badge) {
      badge.style.display = 'none';
    }
  }

  // ---- Restore last question from history (Ctrl+Z) ----
  function restoreLastQuestion() {
    const last = questionHistory.pop();
    if (last) {
      input.value = last.text;
      inputFromSTT = true;
      lastSTTValue = last.text; // FIX #8: Track restored value for edit detection
      composer.classList.add('stt-filling');
      updateQuestionReadyState();
      syncPlaceholder();
      updateHistoryBadge(); // Update badge after removing from history
      showToast('Question restored', 1500);
      return true;
    }
    showToast('No question to restore', 1500);
    return false;
  }

  // ---- Auto-fill the input box with transcribed speech from interviewer ----
  function autoFillInputFromSTT(text) {
    // If user has manually typed something different, don't overwrite
    if (!inputFromSTT && input.value.trim().length > 0) return;

    // Cancel any pending soft-clear (interviewer is still talking)
    clearTimeout(softClearTimer);
    composer.classList.remove('stt-dimmed');

    const current = input.value.trim();
    const newText = current ? current + ' ' + text : text;
    input.value = newText;
    inputFromSTT = true;
    lastSTTValue = newText; // FIX #6: Track the STT value for edit detection
    syncPlaceholder();

    // Show filling state
    composer.classList.add('stt-filling');
    updateQuestionReadyState();
    updateSendButtonState(); // FIX #9: Update send button state

    // Wait for the interviewer to stop, then check the question is complete. A
    // question mark from the transcriber means they finished: answer fast. A
    // complete-looking question without one gets a little longer, in case they
    // are still going. (This used to be a flat 1.8s, the biggest fixed delay.)
    clearTimeout(questionFinalizeTimer);
    const settleMs = /\?\s*$/.test(input.value.trim()) ? QUESTION_SETTLE_MS : STATEMENT_SETTLE_MS;
    heardAt = Date.now();
    questionFinalizeTimer = setTimeout(function finalizeQuestion() {
      if (!isLikelyCompleteQuestion(input.value)) return;
      // If the user edited the heard question, leave sending to them (Enter).
      const untouched = input.value.trim() === (lastSTTValue || '').trim();
      if (settings && settings.autoAnswer !== false && untouched) {
        // Still streaming the previous answer: wait for it instead of dropping this question.
        // New interviewer words or the user answering clear this timer; setBusy's
        // failsafe bounds it if an answer never finishes.
        if (busy) { questionFinalizeTimer = setTimeout(finalizeQuestion, 700); return; }
        if (inputFromSTT) { cue.log(`[timing] auto-answer sent ${Date.now() - heardAt}ms after the last words`); send(); }
        return;
      }
      composer.classList.add('stt-ready');
      updateSendButtonState(); // FIX #9: Update send button when ready
      // Subtle notification that question is ready
      showToast('Press Enter to answer', 2500);
    }, settleMs);

    // After 8s of no new words, save to history and keep stable
    clearTimeout(sttFillTimer);
    sttFillTimer = setTimeout(() => {
      saveToQuestionHistory(input.value);
      composer.classList.remove('stt-filling');
      // Keep stt-ready if applicable
      updateQuestionReadyState();
      updateSendButtonState(); // FIX #9
    }, 8000);
  }

  // ---- Soft clear: don't immediately wipe question when user speaks ----
  function softClearSTTFill(text) {
    // When the user speaks (You channel), don't immediately clear
    // Instead, dim the input and wait — they might just be acknowledging
    if (!inputFromSTT) return;
    
    // FIX #3: Reset userSpeechStart at the beginning before setting new timestamp
    // This ensures we always track from fresh when a new soft-clear cycle begins
    const now = Date.now();
    if (!userSpeechStart) {
      userSpeechStart = now;
    }

    // Dim the input to show it's in "pending clear" state
    composer.classList.add('stt-dimmed');

    // A real sentence means the user is answering on their own, so hold the
    // auto-answer. "mm-hm" or "okay" is under three content words and leaves it armed.
    if (window.ReadingTracker.tokenize(text).length >= 3) clearTimeout(questionFinalizeTimer);

    // Re-armed on every 'you' final, so this fires ~800ms after the user stops.
    // The 2s test below is measured from the FIRST final of this cycle, so a brief
    // acknowledgement ("mm-hm") leaves the question on screen while a sustained
    // answer clears it. Firing at 2.5s instead would make that test always true.
    clearTimeout(softClearTimer);
    softClearTimer = setTimeout(() => {
      const speechDuration = userSpeechStart ? Date.now() - userSpeechStart : 0;
      if (speechDuration > 2000) {
        // User has been speaking for a while, so they are answering: clear the box
        // and drop the pending auto-answer. A short "mm-hm" leaves both alone.
        clearTimeout(questionFinalizeTimer);
        saveToQuestionHistory(input.value);
        input.value = '';
        inputFromSTT = false;
        composer.classList.remove('stt-filling', 'stt-dimmed', 'stt-ready', 'stt-accumulating');
        syncPlaceholder();
        updateSendButtonState(); // FIX #9: Update send button state
        userSpeechStart = null;
      }
    }, 800);
  }

  // ---- Hard clear (called when user explicitly clears or types) ----
  // FIX #10: Add option to show toast when clearing
  function hardClearSTTFill(showUndoHint = false) {
    const hadContent = input.value.trim().length > 0;
    saveToQuestionHistory(input.value);
    input.value = '';
    inputFromSTT = false;
    lastSTTValue = ''; // FIX #6: Clear the tracked STT value
    userSpeechStart = null;
    composer.classList.remove('stt-filling', 'stt-dimmed', 'stt-ready', 'stt-accumulating');
    clearTimeout(softClearTimer);
    clearTimeout(questionFinalizeTimer);
    clearTimeout(sttFillTimer);
    clearInputInterim(); // FIX #5: Clear interim when clearing input
    syncPlaceholder();
    updateSendButtonState(); // FIX #9
    updateHistoryBadge(); // FIX #14
    
    // FIX #10: Show undo hint when explicitly cleared
    if (showUndoHint && hadContent) {
      const undoHint = isWindows ? 'Ctrl+Z to undo' : '⌘Z to undo';
      showToast(`Cleared · ${undoHint}`, 2000);
    }
  }

  // ---- Reset soft-clear state (interviewer spoke again) ----
  // FIX #16: Reset userSpeechStart properly when cancelSoftClear is called
  function cancelSoftClear() {
    userSpeechStart = null; // Reset timestamp so next soft-clear starts fresh
    clearTimeout(softClearTimer);
    composer.classList.remove('stt-dimmed');
  }

  function syncPlaceholder() {
    placeholder.classList.toggle('hidden', input.value.length > 0 || document.activeElement === input);
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  }
  
  // FIX #6: Track last STT value to detect substantial edits vs minor corrections
  let lastSTTValue = '';
  
  input.addEventListener('input', () => {
    const currentValue = input.value;
    
    // FIX #5: Clear interim text when user starts typing
    clearInputInterim();
    
    // FIX #6: Only detach from STT mode if edit is substantial
    // Minor corrections (typo fixes, small additions) should keep STT mode
    if (inputFromSTT && lastSTTValue) {
      const lengthDiff = Math.abs(currentValue.length - lastSTTValue.length);
      const isCleared = currentValue.trim().length === 0;
      const isSubstantialChange = lengthDiff > lastSTTValue.length * 0.3 || isCleared;
      
      if (isSubstantialChange) {
        // User made a major change — detach from STT mode
        saveToQuestionHistory(lastSTTValue);
        inputFromSTT = false;
        lastSTTValue = '';
        composer.classList.remove('stt-filling', 'stt-dimmed', 'stt-ready', 'stt-accumulating');
        clearTimeout(softClearTimer);
        clearTimeout(questionFinalizeTimer);
      }
      // Minor edits: keep inputFromSTT = true, just update visual state
    } else if (!inputFromSTT) {
      // User typing from scratch — standard behavior
      composer.classList.remove('stt-filling', 'stt-dimmed', 'stt-ready', 'stt-accumulating');
    }
    
    syncPlaceholder();
    updateSendButtonState(); // FIX #9: Update send button on input change
  });
  input.addEventListener('focus', () => { composer.classList.add('focused'); placeholder.classList.add('hidden'); });
  input.addEventListener('blur', () => { composer.classList.remove('focused'); syncPlaceholder(); });
  $('#input-area').addEventListener('click', () => input.focus());

  function send() {
    const text = input.value.trim();
    if (!text) { runMode('assist', ''); return; }
    const wasFromSTT = inputFromSTT;
    
    // Save to history before clearing (in case user wants to redo)
    saveToQuestionHistory(text);
    
    input.value = '';
    inputFromSTT = false;
    lastSTTValue = ''; // FIX #6: Clear tracked STT value
    userSpeechStart = null;
    composer.classList.remove('stt-filling', 'stt-dimmed', 'stt-ready', 'stt-accumulating');
    clearTimeout(softClearTimer);
    clearTimeout(questionFinalizeTimer);
    clearTimeout(sttFillTimer);
    syncPlaceholder();
    updateSendButtonState(); // FIX #9
    
    // If text came from STT (interviewer question), use answerThis mode, or
    // assist (which reads the screen) when the question points at the screen.
    // Otherwise use ask mode (user typed their own question)
    const mode = wasFromSTT ? window.SpokenQuestion.modeForSpokenQuestion(text) : 'ask';
    runMode(mode, text);
  }
  $('#send-btn').addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    // Ctrl+Z / Cmd+Z: restore last question if input is empty
    if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !input.value.trim()) {
      e.preventDefault();
      restoreLastQuestion();
      return;
    }
    // Escape: clear the input (with undo hint)
    if (e.key === 'Escape' && input.value.trim()) {
      e.preventDefault();
      hardClearSTTFill(true); // FIX #10: Show undo hint
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) { e.preventDefault(); send(); }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); runMode('assist', ''); }
  });
  
  // FIX #13: Global keyboard shortcut for force-answer (Ctrl+Shift+A / Cmd+Shift+A)
  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A / Cmd+Shift+A: Force answer current question immediately
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      if (input.value.trim()) {
        send();
      } else if (inputFromSTT || composer.classList.contains('stt-filling')) {
        // Even if question seems incomplete, force send
        send();
      } else {
        showToast('No question to answer', 1500);
      }
    }
  });
  
  // FIX #4: Add tooltip with keyboard shortcuts to send button
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) {
    const forceKey = isWindows ? 'Ctrl+Shift+A' : '⌘⇧A';
    sendBtn.title = `Send · ${forceKey} to force answer`;
  }

  // Smart toggle
  const smartBtn = $('#smart-toggle');
  smartBtn.addEventListener('click', async () => {
    settings.smart = !settings.smart;
    smartBtn.classList.toggle('on', settings.smart);
    await cue.settingsSet({ smart: settings.smart });
  });

  // Answer length: short, medium, long (renderer/answer-length.js, shared with
  // main). The global shortcut cycles it in main and reports back with length:changed.
  const { normalizeLength, nextLength, LABELS: LENGTH_LABELS, DEFAULT_LENGTH } = window.AnswerLength;
  const lengthBtn = $('#length-toggle');
  function showLength(value, announce) {
    const v = normalizeLength(value);
    const label = LENGTH_LABELS[v];
    lengthBtn.querySelector('span').textContent = label;
    lengthBtn.classList.toggle('on', v !== DEFAULT_LENGTH);
    lengthBtn.title = 'Answer length: ' + label + (isWindows ? ' (Ctrl+Shift+.)' : ' (⌘⇧.)');
    if (announce) showToast(label + ' answers', 1400);
  }
  lengthBtn.addEventListener('click', async () => {
    if (!settings) return;
    settings.answerLength = nextLength(settings.answerLength);
    showLength(settings.answerLength, true);
    await cue.settingsSet({ answerLength: settings.answerLength });
  });
  cue.on('length:changed', ({ answerLength }) => {
    if (settings) settings.answerLength = answerLength;
    showLength(answerLength, true);
  });

  // Read while scrolling: the Settings switch, and Ctrl+Option+Cmd+L in main,
  // which reports back here so a later Settings save keeps what the key set.
  if (!isMac) {
    const hint = document.getElementById('scroll-reading-hint');
    if (hint) hint.textContent = 'Ctrl+H starts reading. Scroll and switch tabs, then Ctrl+H again to solve. Off: Ctrl+H solves from one screen';
  }
  function showScrollReading(on) {
    document.querySelectorAll('#scroll-reading-seg button').forEach((button) => {
      button.classList.toggle('on', (button.dataset.scrollReading === 'on') === on);
    });
  }
  cue.on('scrollReading:changed', ({ scrollReading }) => {
    if (settings) settings.scrollReading = scrollReading;
    showScrollReading(scrollReading);
    const solve = isWindows ? 'Ctrl+H' : '⌘H';
    showToast(scrollReading
      ? 'Read while scrolling on: ' + solve + ' starts, ' + solve + ' again solves'
      : 'Read while scrolling off: ' + solve + ' solves from one screen', 2600);
  });

  // This question: how much of the current coding question cue holds, and the
  // button that forgets it when the candidate moves to the next one. Always
  // shown, so the button is where the owner expects it before the first Cmd+H.
  const solveKey = isWindows ? 'Ctrl+H' : '⌘H';
  const questionLabel = document.getElementById('question-label');
  function showQuestion(views, screens) {
    questionLabel.textContent = screens
      ? 'This question: ' + screens + ' screen' + (screens === 1 ? '' : 's') + (views > 1 ? ', ' + views + ' views' : '')
      : 'Coding question: press ' + solveKey + ' to start reading';
  }
  showQuestion(0, 0);
  cue.on('question:changed', ({ views, screens }) => showQuestion(views, screens));
  document.getElementById('question-next-btn').addEventListener('click', () => cue.nextQuestion());

  // Hide / collapse
  function toggleHide() {
    const collapsed = $('#panel').classList.toggle('collapsed');
    $('#hide-btn').classList.toggle('collapsed', collapsed);
    $('#live-dot').style.display = collapsed ? 'none' : '';
  }
  $('#hide-btn').addEventListener('click', toggleHide);
  cue.on('hide:toggle', toggleHide);
  // Keyboard scrolling of the answers (Ctrl+Option+Cmd with U or D): most of a
  // screen at a time, keeping a line of the old view for context.
  cue.on('code:copy', copyCodeInView);
  cue.on('llm:thinking', ({ text }) => { if (busy) armBusyFailsafe(); appendThinking(text); });
  cue.on('answer:scroll', ({ direction }) => {
    const step = Math.max(80, messages.clientHeight * 0.8) * (direction === 'up' ? -1 : 1);
    messages.scrollBy({ top: step, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  // Stop = start/stop listening. Kick off system-audio capture straight from the click so
  // the user-gesture is fresh for getDisplayMedia (loopback capture needs it).
  $('#stop-btn').addEventListener('click', async () => {
    const turningOn = !$('#stop-btn').classList.contains('active');
    if (turningOn) {
      // startSystemAudio may fail (user cancels, no permission) — that's OK,
      // mic will still work and capture will toggle regardless
      try { await startSystemAudio(); } catch (_) { /* handled inside startSystemAudio */ }
    }
    const active = await cue.captureToggle();
    if (turningOn && !active) stopSystemAudio();
  });

  // Transcript toggle removed — sidebar now auto-opens with listening

  // After the interview: a report built from the whole remembered interview.
  document.getElementById('interview-report-btn').addEventListener('click', () => runMode('report'));

  // Clear transcript
  const clearTranscriptBtn = document.getElementById('clear-transcript-btn');
  if (clearTranscriptBtn) {
    clearTranscriptBtn.addEventListener('click', async () => {
      // Save current input to history before clearing (for undo)
      saveToQuestionHistory(input.value);
      
      const res = await cue.clearTranscript();
      clearMessages();
      // Also clear the floating interim bar
      if (interimEl) { interimEl.textContent = ''; interimEl.classList.remove('show'); }
      // FIX #1: Use ts-list instead of non-existent transcript-list
      const list = document.getElementById('ts-list');
      if (list) list.innerHTML = '<div class="ts-placeholder">Conversation history will appear here when listening.</div>';
      transcriptInterimEl = null;
      clearTranscriptSidebar(); // clear the history sidebar too
      hardClearSTTFill(); // clear the input box too
      
      // Irreversible: the memory file is deleted, so no undo hint here. cue has
      // already forgotten it either way; only the disk copy can fail to go.
      showToast(res && res.ok ? 'Interview memory cleared' : 'Interview memory could not be deleted from this computer. Try again.', 3500);
    });
  }

  // ---- capture: mic (renderer side) — uses AudioWorklet (modern, off-main-thread) ----
  let audioCtx = null, micStream = null, micWorklet = null;
  async function startMic() {
    if (micStream) return;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      // getUserMedia can resolve with a stream that has no usable audio track
      // (e.g. a virtual/placeholder device, or a device that was unplugged
      // between permission grant and capture start). Fail loudly here instead
      // of silently wiring up an AudioWorklet to nothing — that produces the
      // "cue never hears me, no error shown" symptom with no diagnostic at all.
      const [track] = micStream.getAudioTracks();
      if (!track) {
        micStream.getTracks().forEach((t) => t.stop());
        micStream = null;
        showStatus('No microphone audio track was available. Check Windows Sound settings for a working default input device, then try again.');
        return;
      }
      cue.log('mic stream started: track=' + (track.label || '(no label — permission may be stale)') + ' muted=' + track.muted);
      audioCtx = new AudioContext({ sampleRate: 16000 });

      // Use AudioWorklet for low-latency, off-main-thread processing
      try {
        await audioCtx.audioWorklet.addModule('audio-worklet-processor.js');
        const source = audioCtx.createMediaStreamSource(micStream);
        micWorklet = new AudioWorkletNode(audioCtx, 'cue-audio-processor');
        micWorklet.port.onmessage = (e) => {
          cue.micPcm(e.data);
        };
        source.connect(micWorklet);
        // Don't connect to destination — we just capture, don't play
        cue.log('mic AudioWorklet processor attached');
      } catch (workletErr) {
        // Fallback to ScriptProcessor if AudioWorklet fails (shouldn't happen in Electron 33+)
        cue.log('AudioWorklet failed, falling back to ScriptProcessor: ' + workletErr.message);
        const micNode = audioCtx.createMediaStreamSource(micStream);
        const micProc = audioCtx.createScriptProcessor(4096, 1, 1);
        const sink = audioCtx.createGain(); sink.gain.value = 0;
        micNode.connect(micProc); micProc.connect(sink); sink.connect(audioCtx.destination);
        micProc.onaudioprocess = (e) => {
          const f = e.inputBuffer.getChannelData(0);
          const out = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          cue.micPcm(out.buffer);
        };
        micWorklet = { _legacy: true, proc: micProc, node: micNode, sink };
      }
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      const name = err && err.name;
      cue.log('mic error: ' + name + ' — ' + message);
      // getUserMedia's DOMException.name is the reliable signal here — the
      // .message text varies by Chromium version and isn't meant for users.
      // Distinguishing "no device" from "denied" from "in use elsewhere"
      // turns one generic dead end into three different next actions.
      if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        showStatus('No microphone was found. Plug one in, or pick a default input device in your OS sound settings, then try again.');
      } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
        showStatus(isWindows
          ? 'Microphone permission was denied. Settings → Privacy & security → Microphone → allow cue, then try again.'
          : 'Microphone permission was denied. System Settings → Privacy & Security → Microphone → allow cue, then try again.');
      } else if (name === 'NotReadableError' || name === 'TrackStartError') {
        showStatus('The microphone could not be started. Another application may be using it exclusively. Close other apps using the mic and try again.');
      } else {
        showStatus('Microphone capture could not be started. Check your mic permissions and try again.');
      }
    }
  }
  function stopMic() {
    if (micWorklet) {
      if (micWorklet._legacy) {
        micWorklet.proc.disconnect(); micWorklet.proc.onaudioprocess = null;
        micWorklet.node.disconnect(); micWorklet.sink.disconnect();
      } else {
        micWorklet.disconnect();
      }
      micWorklet = null;
    }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    if (micStream) { micStream.getTracks().forEach((t) => t.stop()); micStream = null; }
  }

  // ---- capture: system/meeting audio (getDisplayMedia loopback, in cue's process) ----
  let sysStream = null, sysCtx = null, sysWorklet = null, sysStarting = false;
  async function startSystemAudio() {
    // Called both from the stop-btn click (fresh user gesture for getDisplayMedia) and from the
    // capture:state handler. getDisplayMedia is async, so `if (sysStream) return` alone loses the
    // race and can open a second loopback stream that is then orphaned.
    if (sysStream || sysStarting) return;
    // macOS: asking for meeting audio means asking for a display-capture session, and
    // that session puts the OS screen-recording indicator on the menu bar for the whole
    // call. Default to staying invisible; the user opts in in Settings > Audio.
    if (isMac && !(settings && settings.meetingAudio)) {
      cue.log('system audio: meeting audio is off on macOS -- no display-capture session opened');
      showStatus('Meeting audio is off, so cue stays invisible. macOS shows a screen-recording indicator whenever an app captures system audio; turn Meeting audio on in Settings \u203a Audio if you want the other side transcribed.');
      return;
    }
    sysStarting = true;
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getDisplayMedia !== 'function') {
      cue.log('system audio unavailable: getDisplayMedia not supported');
      showStatus('Meeting audio capture is not available on this device build.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });

      stream.getVideoTracks().forEach((t) => t.stop()); // we only want the audio
      const tracks = stream.getAudioTracks();
      if (!tracks.length) {
        cue.log('system audio: no loopback track on this platform');
        stream.getTracks().forEach((t) => t.stop());
        showStatus(cue.platform === 'win32'
          ? 'No system-audio loopback track detected. Make sure "Share audio" is checked in the screen share dialog, and that your audio device is not in exclusive mode.'
          : 'No system-audio loopback track detected. Meeting audio needs macOS 14.4 or later. Your screen and microphone still work.');
        return;
      }
      sysStream = stream;
      sysCtx = new AudioContext({ sampleRate: 16000 });

      // Use AudioWorklet for system audio too
      try {
        await sysCtx.audioWorklet.addModule('audio-worklet-processor.js');
        const source = sysCtx.createMediaStreamSource(new MediaStream(tracks));
        sysWorklet = new AudioWorkletNode(sysCtx, 'cue-audio-processor');
        sysWorklet.port.onmessage = (e) => {
          cue.systemPcm(e.data);
        };
        source.connect(sysWorklet);
        cue.log('system audio: AudioWorklet capturing loopback');
      } catch (workletErr) {
        // Fallback to ScriptProcessor
        cue.log('system audio AudioWorklet failed, using ScriptProcessor: ' + workletErr.message);
        const sysNode = sysCtx.createMediaStreamSource(new MediaStream(tracks));
        const sysProc = sysCtx.createScriptProcessor(4096, 1, 1);
        const sink = sysCtx.createGain(); sink.gain.value = 0;
        sysNode.connect(sysProc); sysProc.connect(sink); sink.connect(sysCtx.destination);
        sysProc.onaudioprocess = (e) => {
          const f = e.inputBuffer.getChannelData(0);
          const out = new Int16Array(f.length);
          for (let i = 0; i < f.length; i++) { const s = Math.max(-1, Math.min(1, f[i])); out[i] = s < 0 ? s * 0x8000 : s * 0x7fff; }
          cue.systemPcm(out.buffer);
        };
        sysWorklet = { _legacy: true, proc: sysProc, node: sysNode, sink };
      }
    } catch (err) {
      const message = err && err.message ? err.message : String(err);
      cue.log('system audio error: ' + message);
      showStatus('Meeting audio could not be started. Grant screen/audio access to cue and try again.');
    } finally {
      sysStarting = false;
    }
  }
  function stopSystemAudio() {
    if (sysWorklet) {
      if (sysWorklet._legacy) {
        sysWorklet.proc.disconnect(); sysWorklet.proc.onaudioprocess = null;
        sysWorklet.node.disconnect(); sysWorklet.sink.disconnect();
      } else {
        sysWorklet.disconnect();
      }
      sysWorklet = null;
    }
    if (sysCtx) { sysCtx.close(); sysCtx = null; }
    if (sysStream) { sysStream.getTracks().forEach((t) => t.stop()); sysStream = null; }
  }

  // ---- STT / VAD status helpers ------------------------------------------
  // Live dot states: 'off' | 'idle' | 'speaking' | 'transcribing'
  // Who is speaking: the interviewer wins when both channels hear voice, since
  // without headphones the mic also picks up the interviewer. Held briefly
  // after speech ends so the label does not flicker between words.
  const speakerLabel = (() => {
    const HOLD_MS = 600;
    const speaking = { you: false, them: false };
    let hideTimer = null;
    function render() {
      const el = document.getElementById('speaker-label');
      if (!el) return;
      const who = speaking.them ? 'them' : speaking.you ? 'you' : null;
      if (!who) {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => el.classList.remove('show'), HOLD_MS);
        return;
      }
      clearTimeout(hideTimer);
      el.textContent = who === 'them' ? 'Interviewer speaking' : 'You are speaking';
      el.classList.toggle('them', who === 'them');
      el.classList.toggle('you', who === 'you');
      el.classList.add('show');
    }
    return {
      update(channel, isSpeaking) { if (channel in speaking) { speaking[channel] = !!isSpeaking; render(); } },
      reset() { speaking.you = false; speaking.them = false; render(); }
    };
  })();

  function setLiveDotState(dotState) {
    const dot = document.getElementById('live-dot');
    if (!dot) return;
    dot.classList.remove('off', 'idle', 'speaking', 'transcribing');
    dot.classList.add(dotState);
    const labels = {
      off:          'Not listening',
      idle:         'Listening, silence detected',
      speaking:     'Speech detected',
      transcribing: 'Transcribing…'
    };
    dot.title = labels[dotState] || '';
  }

  let sttState = 'disconnected';

  function updateSttStatus({ active, streaming } = {}) {
    const label = document.getElementById('stt-status');
    if (!label) return;
    if (active === false) {
      sttState = 'disconnected';
      label.textContent = 'off';
    } else if (active === true) {
      sttState = streaming ? 'connecting' : 'batch';
      label.textContent = sttState;
    }
    label.className = 'stt-status stt-' + sttState;
  }

  // ---- transcript history sidebar (hidden by default, manual toggle) ----
  let tsSidebarInterimEl = null;
  let sidebarOpen = false;
  // Track last committed row per channel — all chunks from same speaker go in one row
  const tsLastRow = { you: null, them: null };
  const tsRowTimer = { you: null, them: null };
  const TS_SENTENCE_GAP_MS = 10000; // 10s silence = new row

  function showSidebar() {
    const sidebar = document.getElementById('transcript-sidebar');
    const historyBtn = document.getElementById('history-btn');
    if (sidebar) sidebar.classList.remove('hidden');
    if (historyBtn) historyBtn.classList.add('active');
    const panelWrap = document.getElementById('panel-wrap');
    if (panelWrap) panelWrap.classList.add('sidebar-open');
    sidebarOpen = true;
  }

  function hideSidebar() {
    const sidebar = document.getElementById('transcript-sidebar');
    const historyBtn = document.getElementById('history-btn');
    if (sidebar) sidebar.classList.add('hidden');
    if (historyBtn) historyBtn.classList.remove('active');
    const panelWrap = document.getElementById('panel-wrap');
    if (panelWrap) panelWrap.classList.remove('sidebar-open');
    sidebarOpen = false;
  }

  function toggleSidebar() {
    if (sidebarOpen) {
      hideSidebar();
    } else {
      showSidebar();
      // FIX #7: Scroll to bottom when opening sidebar
      const list = document.getElementById('ts-list');
      if (list) {
        requestAnimationFrame(() => {
          list.scrollTop = list.scrollHeight;
        });
      }
    }
  }

  // History button toggle
  const historyBtn = document.getElementById('history-btn');
  if (historyBtn) {
    historyBtn.innerHTML = icon('message-square-text', { size: 15 });
    historyBtn.addEventListener('click', toggleSidebar);
  }

  // Close sidebar button
  const closeSidebarBtn = document.getElementById('close-sidebar-btn');
  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener('click', hideSidebar);
  }

  // merge false: always a row of its own, and later speech never joins it
  // (restored turns are whole saved turns, not fragments of a live sentence).
  function appendTranscriptHistoryTurn(channel, text, isInterim, { merge = true } = {}) {
    const list = document.getElementById('ts-list');
    if (!list) return;

    // Remove placeholder on first real turn
    const ph = list.querySelector('.ts-placeholder');
    if (ph) ph.remove();

    if (isInterim) {
      // Update the single floating interim row
      if (!tsSidebarInterimEl) {
        tsSidebarInterimEl = document.createElement('div');
        tsSidebarInterimEl.className = 'ts-turn ts-' + channel + ' ts-interim-row';
        const chLabel = document.createElement('span');
        chLabel.className = 'ts-channel';
        chLabel.textContent = channel === 'them' ? 'Interviewer' : 'You';
        const txt = document.createElement('span');
        txt.className = 'ts-text ts-interim';
        tsSidebarInterimEl.appendChild(chLabel);
        tsSidebarInterimEl.appendChild(txt);
        list.appendChild(tsSidebarInterimEl);
      }
      tsSidebarInterimEl.querySelector('.ts-text').textContent = text;
    } else {
      // Remove interim row
      if (tsSidebarInterimEl) { tsSidebarInterimEl.remove(); tsSidebarInterimEl = null; }

      const existingRow = merge ? tsLastRow[channel] : null;
      const useExisting = existingRow && existingRow.isConnected;

      if (useExisting) {
        // Append to existing row — accumulates sentence fragments
        const txt = existingRow.querySelector('.ts-text');
        if (txt) {
          txt.textContent = txt.textContent ? txt.textContent + ' ' + text : text;
        }
      } else {
        // Start a new row (no buttons — just clean history view)
        const row = document.createElement('div');
        row.className = 'ts-turn ts-' + channel;

        const chLabel = document.createElement('span');
        chLabel.className = 'ts-channel';
        chLabel.textContent = channel === 'them' ? 'Interviewer' : 'You';

        const txt = document.createElement('span');
        txt.className = 'ts-text';
        txt.textContent = text;

        row.appendChild(chLabel);
        row.appendChild(txt);
        list.appendChild(row);
        if (merge) tsLastRow[channel] = row;
      }

      if (!merge) { list.scrollTop = list.scrollHeight; return; }

      // Reset silence timer
      clearTimeout(tsRowTimer[channel]);
      tsRowTimer[channel] = setTimeout(() => { tsLastRow[channel] = null; }, TS_SENTENCE_GAP_MS);

      // When THIS channel speaks, reset the OTHER channel's row
      const other = channel === 'you' ? 'them' : 'you';
      clearTimeout(tsRowTimer[other]);
      tsLastRow[other] = null;

      list.scrollTop = list.scrollHeight;
    }
  }

  function clearTranscriptSidebar() {
    const list = document.getElementById('ts-list');
    if (list) list.innerHTML = '<div class="ts-placeholder">Conversation history will appear here when listening.</div>';
    tsSidebarInterimEl = null;
    tsLastRow.you = null; tsLastRow.them = null;
    clearTimeout(tsRowTimer.you); clearTimeout(tsRowTimer.them);
  }

  // ---- events from main --------------------------------------------------
  cue.on('capture:state', ({ active, streaming, mode }) => {
    setLiveDotState(active ? 'idle' : 'off');
    if (!active) speakerLabel.reset(); // no stale label once listening stops
    $('#stop-btn').classList.toggle('active', active);
    // FIX #4: Add .listening class to composer when capture is active
    composer.classList.toggle('listening', active);
    // startSystemAudio() is called directly from the stop-button click handler
    // so that the getDisplayMedia request has a fresh user gesture.
    // Here we only start the mic (no gesture required) and stop everything on deactivate.
    if (active) {
      startMic();
      // Don't auto-open sidebar — user can toggle it manually
    } else {
      stopMic();
      stopSystemAudio();
      // FIX #2: Clear interim element when capture stops
      if (interimEl) {
        interimEl.textContent = '';
        interimEl.classList.remove('show');
      }
      // Don't auto-close sidebar — let user keep it open if they want
    }
    updateSttStatus({ active, streaming });
    if (active && mode === 'local') {
      sttState = 'local';
      const label = document.getElementById('stt-status');
      if (label) { label.textContent = 'local'; label.className = 'stt-status stt-local'; }
    } else {
      updateSttStatus({ active, streaming });
    }
  });

  // ---- real-time transcript display (interim + final) ----
  let interimEl = null;
  function getOrCreateInterimEl() {
    if (!interimEl) {
      interimEl = document.createElement('div');
      interimEl.className = 'interim-transcript';
      // Insert into panel-main (the left column), before the action row
      const panelMain = document.getElementById('panel-main');
      const actionRow = document.getElementById('action-row');
      if (panelMain && actionRow && actionRow.parentNode === panelMain) {
        panelMain.insertBefore(interimEl, actionRow);
      } else if (panelMain) {
        panelMain.appendChild(interimEl);
      } else {
        document.getElementById('panel').appendChild(interimEl);
      }
    }
    return interimEl;
  }
  // FIX #12: Show interim text in input box (grayed/italic) before final arrives
  let inputInterimEl = null;
  function showInterimInInput(text) {
    if (!inputInterimEl) {
      inputInterimEl = document.createElement('span');
      inputInterimEl.className = 'input-interim';
      // FIX #2: Insert into composer (not input-area) for correct positioning
      composer.appendChild(inputInterimEl);
    }
    inputInterimEl.textContent = text;
    inputInterimEl.style.display = text ? 'block' : 'none';
  }
  function clearInputInterim() {
    if (inputInterimEl) {
      inputInterimEl.textContent = '';
      inputInterimEl.style.display = 'none';
    }
  }
  
  cue.on('stt:interim', ({ channel, text }) => {
    // Reading a script: speech only moves the teleprompter.
    if (teleprompter.isActive()) { if (channel === 'you') teleprompter.hear(text, false); return; }
    setLiveDotState('transcribing');
    const el = getOrCreateInterimEl();
    const label = channel === 'them' ? 'Interviewer' : 'You';
    // One line: show the newest words, which is what the speaker is saying now.
    const tail = text.length > 90 ? '…' + text.slice(-90) : text;
    el.textContent = `${label}: ${tail}`;
    el.classList.add('show');
    appendTranscriptHistoryTurn(channel, text, true); // update sidebar interim
    if (channel === 'you' && !isInterviewerEcho(channel, text)) readingFollow.onSpeech(text, false);
    
    // FIX #12: Show interviewer's interim speech in input area
    if (channel === 'them' && !input.value.trim()) {
      showInterimInInput(text);
    }
  });
  cue.on('stt:final', ({ channel, text }) => {
    setLiveDotState('idle');
    // Clear interim when we get a final
    if (interimEl) { interimEl.textContent = ''; interimEl.classList.remove('show'); }
    clearTranscriptInterim();
    clearInputInterim(); // FIX #12: Clear interim text from input area
    // sidebar: the final turn is added via the 'transcript' event below
  });
  cue.on('stt:status', ({ channel, status, provider }) => {
    cue.log(`[stt] ${provider || channel || 'unknown'} ${status}`);
    if (provider === 'local') {
      const label = document.getElementById('stt-status');
      const localLabels = {
        loading: 'loading local',
        ready: 'local',
        transcribing: 'local',
        stopping: 'stopping',
        off: 'off',
        error: 'error'
      };
      sttState = status === 'ready' || status === 'transcribing' ? 'local' : status;
      if (label) {
        label.textContent = localLabels[status] || status;
        label.className = 'stt-status stt-' + sttState;
      }
      if (status === 'loading') $('#stop-btn').classList.add('active');
      if (status === 'off' || status === 'error') $('#stop-btn').classList.remove('active');
      if (status === 'loading' || status === 'transcribing' || status === 'stopping') setLiveDotState('transcribing');
      if (status === 'ready') setLiveDotState('idle');
      if (status === 'off') setLiveDotState('off');
      return;
    }
    if (status === 'connected') {
      sttState = 'streaming';
      const label = document.getElementById('stt-status');
      if (label) { label.textContent = sttState; label.className = 'stt-status stt-streaming'; }
    }
  });
  cue.on('vad:state', ({ channel, speaking }) => {
    setLiveDotState(speaking ? 'speaking' : 'idle');
    speakerLabel.update(channel, speaking);
  });
  cue.on('llm:start', ({ userBubble, small, category, coding, showWait }) => {
    readingFollow.reset();
    paceHint.reset();
    responseCount++;
    if (responseCount > MAX_RESPONSES) {
      const oldest = messages.querySelector('.response-group');
      if (oldest) oldest.remove();
      responseCount = MAX_RESPONSES;
    }
    const group = document.createElement('div');
    group.className = 'response-group';
    const sep = document.createElement('div');
    sep.className = 'response-sep';
    sep.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    group.appendChild(sep);
    if (userBubble) {
      const b = document.createElement('div');
      b.className = 'user-bubble';
      b.textContent = userBubble;
      group.appendChild(b);
    }
    if (category) {
      const pill = document.createElement('div');
      pill.className = 'category-pill';
      pill.textContent = category.charAt(0).toUpperCase() + category.slice(1);
      group.appendChild(pill);
    }
    startAi(small, group);
    // A coding answer is worked through step by step, not read aloud: no
    // highlight and no automatic scrolling; the user scrolls it.
    if (coding) { aiEl.dataset.noFollow = '1'; aiEl.dataset.coding = '1'; }
    // The coding model thinks before its first word: show the live wait note at
    // once (elapsed seconds and the newest thinking line); the first word removes it.
    if (showWait) showWaitNote(aiEl);
    messages.appendChild(group);
    // Scroll only #messages: scrollIntoView would also scroll the page itself and
    // push the toolbar out of the window. requestAnimationFrame lets layout settle.
    requestAnimationFrame(() => {
      if (!sep.isConnected) return;
      const top = messages.scrollTop + sep.getBoundingClientRect().top - messages.getBoundingClientRect().top;
      messages.scrollTo({ top, behavior: 'smooth' });
    });
    setBusy(true);
  });
  // The answer came from the prepared bank: say so above it.
  cue.on('llm:tag', ({ label }) => {
    const group = messages.querySelector('.response-group:last-child');
    if (!group || !aiEl || aiEl.parentNode !== group) return;
    const pill = document.createElement('div');
    pill.className = 'prepared-pill';
    pill.textContent = label;
    group.insertBefore(pill, aiEl);
  });
  cue.on('llm:token', ({ text }) => { if (busy) armBusyFailsafe(); appendToken(text); });
  // The quick start is done and the full solution follows in the same answer:
  // close the quick part (its code and copy buttons render), label the next
  // part, and show the wait note again while the Coding model thinks.
  cue.on('llm:section', ({ label }) => {
    if (!aiEl) return;
    const group = aiEl.parentNode;
    const quickEl = aiEl;
    finalizeAi();
    const pill = document.createElement('div');
    pill.className = 'prepared-pill section-pill';
    pill.textContent = label;
    group.appendChild(pill);
    startAi(false, group);
    if (quickEl.dataset.coding === '1') { aiEl.dataset.noFollow = '1'; aiEl.dataset.coding = '1'; }
    showWaitNote(aiEl);
    // A coding answer never scrolls on its own, so the full part may start out
    // of view: say where it is, once now and once when its first words land.
    aiEl.dataset.section = 'full';
    showToast('Quick start ready. The full solution comes in below it.', 2600);
    if (busy) armBusyFailsafe();
  });
  cue.on('llm:done', () => { const done = aiEl; finalizeAi(); addCodingButtons(done); setBusy(false); readingFollow.update(); });
  cue.on('llm:error', ({ message, action }) => {
    // Keep what already streamed (an opener the user may be saying aloud) and
    // show the error as its own line under it.
    if (aiEl && aiEl.dataset.raw.trim()) {
      const parent = aiEl.parentNode;
      finalizeAi();
      startAi(true, parent);
    }
    if (!aiEl) startAi(true);
    aiEl.dataset.error = '1'; // reading follow keeps tracking the last real answer
    aiEl.dataset.raw = message; finalizeAi(); setBusy(false);
    // publik errors carry one action: the renderer's markdown emits no anchors,
    // so a link needs a real button (same pattern as the mic banner).
    if (action && action.kind === 'card') { showPublikCard(); return; }
    if (action && action.kind) showStatus(message, publikActionButton(action));
  });
  cue.on('transcript', ({ channel, text }) => {
    if (!text || text.trim().length < 2 || /^[?!.,;:\-…]+$/.test(text.trim())) return;
    appendTranscriptHistoryTurn(channel, text, false);
    // Without headphones the mic also hears the interviewer. That echo is not
    // the user talking, so it must not feed reading-follow or cancel the answer.
    if (isInterviewerEcho(channel, text)) return;
    if (channel === 'you') readingFollow.onSpeech(text, true);
    if (channel === 'you') paceHint.onSpeech(text);
    // Auto-fill the input box with Them (interviewer) speech
    if (channel === 'them') {
      cancelSoftClear(); // Interviewer is speaking, cancel any pending clear
      autoFillInputFromSTT(text);
    } else if (!readingFollow.isReading(text)) {
      // User spoke (and is not just reading the last answer aloud): soft clear,
      // don't immediately wipe, wait to see if they're really answering
      softClearSTTFill(text);
    }
  });
  let statusTimer = null;
  // After a restart mid-interview, show the remembered conversation in the
  // history list. Written straight to the list: replaying it as live speech
  // would refill the input and could auto-answer an old question.
  async function restoreInterviewMemory() {
    let memory = null;
    try { memory = await cue.memoryState(); } catch { return; } // boot must go on without it
    if (!memory || !memory.turnCount || !Array.isArray(memory.turns)) return;
    memory.turns.forEach((t) => appendTranscriptHistoryTurn(t.channel, t.text, false, { merge: false }));
    const since = new Date(memory.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    showStatus(`Continuing the interview from ${since}. Clear interview memory in History to start fresh.`);
  }

  function showStatus(message, button) {
    let el = document.getElementById('cue-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'cue-status';
      // Insert into panel-main before the action row
      const panelMain = document.getElementById('panel-main');
      const actionRow = document.getElementById('action-row');
      if (panelMain && actionRow && actionRow.parentNode === panelMain) {
        panelMain.insertBefore(el, actionRow);
      } else if (panelMain) {
        panelMain.appendChild(el);
      } else {
        document.getElementById('panel').appendChild(el);
      }
    }
    el.textContent = message;
    if (button) el.appendChild(button);
    el.classList.add('show');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => el.classList.remove('show'), button ? 30000 : 11000);
  }
  cue.on('status', ({ message }) => {
    cue.log('[status] ' + message);
    // Reading a coding question reports each page here before any token comes.
    if (busy) armBusyFailsafe();
    showStatus(message);
    if (sttState !== 'disconnected') {
      const lower = message.toLowerCase();
      if (lower.includes('error') || lower.includes(' off')) {
        sttState = 'error';
        const label = document.getElementById('stt-status');
        if (label) { label.textContent = sttState; label.className = 'stt-status stt-error'; }
      }
    }
  });

  // ---- prep status & smart tooltip helpers -------------------------------


  // ---- AI rules: live char counter + soft cap ---------------------------
  function updateAiRulesCounter() {
    const el = document.getElementById('ai-rules');
    const counter = document.getElementById('ai-rules-count');
    if (!el || !counter) return;
    const n = el.value.length;
    const cap = 2000;
    counter.textContent = String(n);
    counter.classList.toggle('over', n >= cap);
    counter.parentElement.classList.toggle('s-counter-warn', n >= cap - 100);
  }
  const aiRulesEl = document.getElementById('ai-rules');
  if (aiRulesEl) aiRulesEl.addEventListener('input', updateAiRulesCounter);
  // Live while dragging so the right level can be judged against the real screen.
  const panelOpacityInput = $('#panel-opacity');
  panelOpacityInput.min = String(window.PanelOpacity.MIN);
  panelOpacityInput.max = String(window.PanelOpacity.MAX);
  panelOpacityInput.addEventListener('input', (e) => applyPanelOpacity(e.target.value));
  function updatePrepStatus() {
    if (!settings) return;
    const fields = {
      resume:  !!(settings.resumeText && settings.resumeText.trim()),
      jd:      !!(settings.jobDescription && settings.jobDescription.trim()),
      stories: !!(settings.starStories && settings.starStories.trim()),
      salary:  !!(settings.salaryTarget && settings.salaryTarget.trim())
    };
    document.querySelectorAll('#prep-status .prep-item').forEach((el) => {
      const loaded = fields[el.dataset.field];
      el.classList.toggle('loaded', loaded);
      el.classList.toggle('missing', !loaded);
      el.title = loaded
        ? el.textContent.trim() + ' loaded'
        : el.textContent.trim() + ' not set, add it in Settings';
    });
  }

  function updateSmartTooltip() {
    if (!settings) return;
    const m = settings.models[settings.provider] || { fast: '', smart: '' };
    const fast = m.fast || 'fast model';
    const smart = m.smart || 'smart model';
    const btn = document.getElementById('smart-toggle');
    if (btn) btn.title = 'Fast: ' + fast + ' · Smart: ' + smart + ' (higher quality, ~2× slower)';
  }

  // ---- microphone permission banner --------------------------------------
  function showMicPermissionBanner() {
    let banner = document.getElementById('mic-perm-banner');
    if (banner) { banner.classList.add('show'); return; }
    banner = document.createElement('div');
    banner.id = 'mic-perm-banner';
    banner.className = 'show';
    banner.innerHTML =
      '<div class="mic-perm-text">' +
        '<strong>🎙️ Microphone access required</strong><br>' +
        'cue needs microphone permission to hear you during calls. Grant access in System Settings, then restart cue.' +
      '</div>' +
      '<div class="mic-perm-actions"></div>';
    const actions = banner.querySelector('.mic-perm-actions');
    if (cue.platform === 'darwin') {
      const openBtn = document.createElement('button');
      openBtn.textContent = 'Open Microphone Settings';
      openBtn.addEventListener('click', () => cue.openPane('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'));
      actions.appendChild(openBtn);
    }
    const dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.className = 'dismiss';
    dismissBtn.addEventListener('click', () => banner.classList.remove('show'));
    actions.appendChild(dismissBtn);
    // #action-row sits inside #panel-main, so insert there (inserting into #panel threw).
    document.getElementById('panel-main').insertBefore(banner, document.getElementById('action-row'));
  }

  // ---- settings ----------------------------------------------------------
  const scrim = $('#settings-scrim');
  function openSettings() { fillSettings(); scrim.classList.remove('hidden'); }
  async function closeSettings() {
    if (await saveSettings()) scrim.classList.add('hidden');
  }
  function openSettings() {
    fillSettings();
    scrim.classList.remove('hidden');
    refreshWhisperModels();
  }
  function closeSettings() { saveSettings(); scrim.classList.add('hidden'); }
  $('#more-btn').addEventListener('click', openSettings);
  $('#s-close').addEventListener('click', () => { void closeSettings(); });
  scrim.addEventListener('click', (e) => { if (e.target === scrim) void closeSettings(); });

  // Tab switching
  document.querySelectorAll('.s-tab').forEach((tab) => {
    tab.addEventListener('click', async () => {
      if (tab.classList.contains('on')) return;
      if (!(await saveSettings())) return;
      document.querySelectorAll('.s-tab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.s-tab-pane').forEach(p => p.classList.add('hidden'));
      tab.classList.add('on');
      const pane = document.querySelector(`.s-tab-pane[data-pane="${tab.dataset.tab}"]`);
      if (pane) pane.classList.remove('hidden');
    });
  });

  function updateCustomProviderFields() {
    $('#custom-endpoint-settings').classList.toggle('hidden', settings.provider !== 'custom');
    $('#publik-settings').classList.toggle('hidden', settings.provider !== 'publik');
    renderPublikBlock();
  }

  // ---- publik API (packaged-build default) --------------------------------
  function publikActionButton(action) {
    if (!action || !action.kind) return null;
    const btn = document.createElement('button');
    if (action.kind === 'link' && action.url) {
      btn.textContent = action.label || 'Open publikhq.com';
      btn.addEventListener('click', () => cue.publikOpen(action.url));
    } else if (action.kind === 'reconnect') {
      btn.textContent = action.label || 'Reconnect';
      btn.addEventListener('click', async () => { btn.disabled = true; publikState = await cue.publikReconnect(); renderPublikBlock(); });
    } else if (action.kind === 'disclosure') {
      btn.textContent = 'Set up publik API';
      btn.addEventListener('click', () => showPublikDisclosure());
    } else if (action.kind === 'card') {
      btn.textContent = 'Show the publik API card';
      btn.addEventListener('click', () => showPublikCard());
    } else {
      return null;
    }
    return btn;
  }

  // Low starter (CONTRACT §12 / task 3): one non-blocking banner with one
  // link, once per key while it sits below the 20% line — not on every push.
  let lowStarterNoticedFor = null;
  function maybeShowLowStarter(p) {
    if (!p || !p.lowStarter) { lowStarterNoticedFor = null; return; }
    if (lowStarterNoticedFor === p.keyId) return;
    lowStarterNoticedFor = p.keyId;
    showStatus(p.lowStarter.message, publikActionButton(p.lowStarter.action));
  }

  function selectByoProvider() {
    const openaiBtn = document.querySelector('#provider-seg button[data-provider="openai"]');
    if (openaiBtn) openaiBtn.click();
    $('#key-openai').focus();
  }

  function renderPublikBlock() {
    const p = publikState;
    const block = $('#publik-settings');
    if (!block || !p || !settings) return;
    const show = (id, on) => $(id).classList.toggle('hidden', !on);
    $('#publik-cost-note').textContent = p.copy.cost;
    $('#publik-data-note').textContent = p.copy.dataPath;
    const note = $('#publik-status-note');
    note.classList.remove('warn');
    let line;
    if (p.connected && p.revoked) {
      line = 'publik API key was revoked. Reconnect to set this computer up again.'; note.classList.add('warn');
    } else if (p.connected) {
      line = `Connected · key ${p.keyId} · ${p.line || 'Ready'}`;
    } else if (p.disconnected) {
      line = 'publik API is disconnected. This computer was removed from your publik account.'; note.classList.add('warn');
    } else if (!p.disclosureAccepted) {
      line = 'Not set up yet. No account or key needed to start.';
    } else if (p.lastError) {
      line = p.lastError; note.classList.add('warn');
    } else {
      line = 'Connecting…';
    }
    note.textContent = line;
    // Low starter: the same sentence the banner used, kept on the card.
    const low = $('#publik-low-note');
    low.textContent = p.lowStarter ? p.lowStarter.message : '';
    low.classList.toggle('hidden', !p.lowStarter);
    // "Why it costs money" — the one justification sentence (CONTRACT §12).
    $('#publik-why-summary').textContent = p.copy.whyItCostsToggle;
    $('#publik-why-text').textContent = p.copy.whyItCosts;
    // The primary button (CONTRACT §12.2): "Link this computer & pick a plan"
    // while anonymous, "Pick a plan" / "Manage plan" once claimed.
    const cta = p.settingsCta;
    $('#publik-link').textContent = cta ? cta.label : '';
    show('#publik-setup', !p.connected && !p.disclosureAccepted);
    show('#publik-reconnect', p.disclosureAccepted && (!p.connected || p.revoked));
    show('#publik-link', !!cta);
    show('#publik-add-credit', p.connected && !p.revoked && p.claimState === 'claimed' && !!p.addCreditUrl);
    show('#publik-disconnect', p.connected && !p.revoked);
    $('#provider-publik').classList.toggle('hidden', !p.available);
    if (settings.provider === 'publik') $('#s-status').textContent = statusText();
  }
  $('#publik-setup').addEventListener('click', () => showPublikDisclosure());
  $('#publik-link').addEventListener('click', () => { const cta = publikState && publikState.settingsCta; if (cta) cue.publikOpen(cta.url); });
  $('#publik-add-credit').addEventListener('click', () => cue.publikOpen(publikState && publikState.addCreditUrl));
  $('#publik-pricing').addEventListener('click', () => cue.publikOpen(publikState ? publikState.links.pricing : ''));
  $('#publik-reconnect').addEventListener('click', async () => { $('#publik-reconnect').disabled = true; try { publikState = await cue.publikReconnect(); } finally { $('#publik-reconnect').disabled = false; } renderPublikBlock(); });
  $('#publik-disconnect').addEventListener('click', async () => { publikState = await cue.publikDisconnect(); renderPublikBlock(); });
  $('#publik-byo').addEventListener('click', selectByoProvider);
  cue.on('publik:state', (state) => { publikState = state; renderPublikBlock(); maybeShowLowStarter(state); });

  function fillSettings() {
    // Keys tab
    document.querySelectorAll('#provider-seg button').forEach((b) => b.classList.toggle('on', b.dataset.provider === settings.provider));
    $('#key-openai').value = settings.apiKeys.openai || '';
    $('#key-anthropic').value = settings.apiKeys.anthropic || '';
    $('#key-gemini').value = settings.apiKeys.gemini || '';
    $('#key-deepgram').value = settings.apiKeys.deepgram || '';
    $('#key-elevenlabs').value = settings.apiKeys.elevenlabs || '';
    $('#stt-words').value = settings.sttWords || '';
    $('#company-notes').value = settings.companyNotes || '';
    fillProfiles();
    $('#practice-voice').value = settings.practiceVoice || 'george';
    $('#key-custom').value = settings.apiKeys.custom || '';
    $('#base-url').value = settings.baseUrl || '';
    updateCustomProviderFields();
    $('#key-ollama').value = settings.apiKeys.ollama || '';
    $('#key-groq').value = settings.apiKeys.groq || '';
    $('#key-minimax').value = settings.apiKeys.minimax || '';
    document.querySelectorAll('#minimax-region-seg button').forEach((b) => b.classList.toggle('on', b.dataset.region === (settings.minimaxRegion || 'global_en')));
    $('#key-azure').value = settings.apiKeys.azure || '';
    $('#azure-endpoint').value = settings.azureEndpoint || '';
    fillModelFields();
    fillAppLinkCallers();
    $('#s-status').textContent = statusText();
    // Transcription tab
    document.querySelectorAll('#meeting-audio-seg button').forEach((button) => {
      button.classList.toggle('on', (button.dataset.meetingAudio === 'on') === !!settings.meetingAudio);
    });
    const meetingAudioNote = $('#meeting-audio-note');
    if (meetingAudioNote) {
      meetingAudioNote.textContent = isMac
        ? 'macOS can only capture system audio through a screen-capture session. While this is on, the menu bar shows the screen-recording indicator and Control Center lists cue under \u201cCurrently Sharing\u201d, visible to everyone you share your whole screen with. Off by default; your microphone, screen capture and answers are unaffected.'
        : 'Transcribes the other participants alongside your microphone. This platform\u2019s loopback capture shows no recording indicator.';
    }
    document.querySelectorAll('#stt-provider-seg button').forEach((button) => {
      button.classList.toggle('on', button.dataset.sttProvider === (settings.sttProvider || 'auto'));
    });
    document.querySelectorAll('#auto-answer-seg button').forEach((button) => {
      button.classList.toggle('on', (button.dataset.autoAnswer === 'on') === (settings.autoAnswer !== false));
    });
    document.querySelectorAll('#watch-screen-seg button').forEach((button) => {
      button.classList.toggle('on', (button.dataset.watchScreen === 'on') === !!settings.watchScreen);
    });
    document.querySelectorAll('#architecture-seg button').forEach((button) => {
      button.classList.toggle('on', button.dataset.architecture === (settings.codeArchitecture || 'clean'));
    });
    document.querySelectorAll('#coding-speed-seg button').forEach((button) => {
      button.classList.toggle('on', button.dataset.codingSpeed === (settings.codingSpeed || 'fastest'));
    });
    document.querySelectorAll('#quick-start-seg button').forEach((button) => {
      button.classList.toggle('on', button.dataset.quickStart === (settings.codingQuickStart === false ? 'off' : 'on'));
    });
    showScrollReading(settings.scrollReading !== false);
    const localWhisper = settings.localWhisper || { modelId: 'base.en', language: 'auto', threads: 0 };
    $('#whisper-language').value = localWhisper.language || 'auto';
    $('#whisper-threads').value = Number(localWhisper.threads) || 0;
    // Profile tab
    $('#resume-text').value = settings.resumeText || '';
    $('#job-description').value = settings.jobDescription || '';
    // Interview Prep tab
    $('#star-stories').value = settings.starStories || '';
    $('#why-company').value = settings.whyCompany || '';
    $('#why-leaving').value = settings.whyLeaving || '';
    $('#work-style').value = settings.workStyle || '';
    // Style tab
    $('#ai-rules').value = settings.aiRules || '';
    updateAiRulesCounter();
    $('#panel-opacity').value = settings.panelOpacity;
    applyPanelOpacity(settings.panelOpacity);
    // Q&A tab
    $('#salary-target').value = settings.salaryTarget || '';
    $('#questions-to-ask').value = settings.questionsToAsk || '';
  }

  // Whoever cue has been told it may answer questions for. Empty is the normal
  // state — nothing appears here until something has asked and been allowed.
  async function fillAppLinkCallers() {
    const host = $('#applink-callers');
    if (!host || !cue.appLinkState) return;
    let state;
    try { state = await cue.appLinkState(); } catch (_) { return; }
    const callers = Object.entries((state && state.callers) || {});
    if (!callers.length) {
      host.innerHTML = '<div class="s-caller-empty">Nothing has asked yet.</div>';
      return;
    }
    host.innerHTML = '';
    for (const [id, scopes] of callers) {
      const allowed = Object.entries(scopes)
        .filter(([, record]) => record && record.decision === 'granted')
        .map(([scope]) => (scope === 'action' ? 'control' : 'read'));
      const name = (scopes.read && scopes.read.callerName) || (scopes.action && scopes.action.callerName) || id;

      const row = document.createElement('div');
      row.className = 's-caller';
      const label = document.createElement('span');
      label.textContent = name + ': ' + (allowed.length ? allowed.join(' + ') : 'denied');
      label.title = id;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Forget';
      button.addEventListener('click', async () => {
        await cue.appLinkRevoke(id);
        fillAppLinkCallers();
      });
      row.append(label, button);
      host.append(row);
    }
  }

  // Resume, job description and stories share one import: a file becomes the
  // textarea's text, and Save keeps it like anything typed.
  function wireImport(buttonId, textareaId, what) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.addEventListener('click', async () => {
      const res = await cue.pickProfileDocument();
      if (!res || res.canceled) return;
      if (res.error) { showStatus(what + ' import failed: ' + res.error); return; }
      $('#' + textareaId).value = res.text || '';
      showStatus('Imported ' + res.fileName + '. Press Save to keep it.');
    });
  }
  wireImport('upload-resume-btn', 'resume-text', 'Resume');
  wireImport('upload-jd-btn', 'job-description', 'Job description');
  wireImport('upload-stories-btn', 'star-stories', 'Stories');

  // Prepared answers: status line and a manual re-run in Interview Prep.
  function showPrepared(p) {
    const el = document.getElementById('prepared-status');
    const btn = document.getElementById('prepared-run-btn');
    if (!el || !p) return;
    btn.disabled = !!p.running || !p.canPrepare;
    if (p.running) el.textContent = 'Preparing answers…';
    else if (p.error) el.textContent = p.error;
    else if (!p.canPrepare) el.textContent = 'Add your resume and the job description first';
    else if (p.count && p.current) el.textContent = p.count + ' answers ready, made ' + new Date(p.createdAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
    else if (p.count) el.textContent = 'Out of date, updating after your profile changed';
    else el.textContent = 'Not prepared yet';
  }
  const preparedRunBtn = document.getElementById('prepared-run-btn');
  if (preparedRunBtn) preparedRunBtn.addEventListener('click', async () => { showPrepared(await cue.preparedRun()); });
  cue.on('prepared:state', showPrepared);

  // ---- job profiles ----
  function fillProfiles() {
    const select = $('#profile-select');
    select.replaceChildren(...Object.keys(settings.profiles || {}).map((name) => {
      const o = document.createElement('option');
      o.value = name; o.textContent = name;
      return o;
    }));
    select.value = settings.activeProfile || '';
    $('#profile-delete-btn').disabled = Object.keys(settings.profiles || {}).length < 2;
  }
  // Every change saves what is typed first, then main moves the fields and
  // sends the whole settings back, so the form always shows the active profile.
  // One change at a time, and only after the typed edits are saved: if saving
  // fails, switching would store the old values into the profile being left.
  let profileBusy = false;
  function setProfileControls(disabled) {
    ['#profile-select', '#profile-new-btn', '#profile-delete-btn'].forEach((id) => { $(id).disabled = disabled; });
  }
  async function changeProfile(call, done) {
    if (profileBusy) return false;
    profileBusy = true;
    setProfileControls(true);
    try {
      if (!(await saveSettings())) { fillProfiles(); showToast('Fix the error in Settings first, then change profile.', 3000); return false; }
      const res = await call();
      if (!res || res.error || !res.settings) { showStatus((res && res.error) || 'The profile could not be changed.'); return false; }
      settings = res.settings;
      fillSettings();
      if (done) showToast(done, 1800);
      return true;
    } finally {
      profileBusy = false;
      setProfileControls(false);
      fillProfiles(); // restores the right Delete state and the active selection
    }
  }
  $('#profile-select').addEventListener('change', (e) => {
    const name = e.target.value;
    void changeProfile(() => cue.profileSwitch(name), 'Switched to ' + name);
  });
  $('#profile-new-btn').addEventListener('click', () => {
    const name = $('#profile-new-name').value;
    // The name stays in the box if creating failed, so it can be corrected.
    void changeProfile(() => cue.profileCreate(name), 'Created ' + name.trim()).then((ok) => { if (ok) $('#profile-new-name').value = ''; });
  });
  // Deleting loses that job's material, so it takes a second click within 3s.
  let deleteArmedTimer = null;
  $('#profile-delete-btn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    if (!deleteArmedTimer) {
      btn.textContent = 'Click again to delete ' + settings.activeProfile;
      deleteArmedTimer = setTimeout(() => { deleteArmedTimer = null; btn.textContent = 'Delete this profile'; }, 3000);
      return;
    }
    clearTimeout(deleteArmedTimer); deleteArmedTimer = null;
    btn.textContent = 'Delete this profile';
    const name = settings.activeProfile;
    void changeProfile(() => cue.profileDeleteCurrent(), 'Deleted ' + name);
  });

  // ---- company research ----
  $('#company-research-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const status = $('#company-research-status');
    btn.disabled = true;
    status.textContent = 'Reading the website, about 20 seconds…';
    try {
      const res = await cue.companyResearch($('#company-url').value);
      if (!res || res.error) { status.textContent = (res && res.error) || 'Research failed.'; return; }
      $('#company-notes').value = res.notes;
      // A Why-this-company the user wrote themselves is never overwritten.
      const why = $('#why-company');
      const kept = !!why.value.trim();
      if (!kept && res.whyCompany) why.value = res.whyCompany;
      status.textContent = 'Company notes filled' + (kept ? '; your own Why this company was kept' : ' and Why this company drafted') + '. Press Done to keep them.';
    } finally {
      btn.disabled = false;
    }
  });

  // ---- test my setup ----
  const setupResults = document.getElementById('setup-test-results');
  const setupStatus = document.getElementById('setup-test-status');
  const SETUP_WORDS = { pass: 'Pass', fail: 'Fail', skip: 'Skipped' };
  // One row per check: a fixed-width status column, then the check's name with
  // its detail under it, so the list reads as a table rather than a paragraph.
  cue.on('setup:result', ({ name, status, detail }) => {
    const li = document.createElement('li');
    li.className = 'setup-row ' + status;
    const badge = document.createElement('span');
    badge.className = 'setup-badge';
    badge.textContent = SETUP_WORDS[status] || status;
    const text = document.createElement('div');
    text.className = 'setup-text';
    const title = document.createElement('div');
    title.className = 'setup-name';
    title.textContent = name;
    text.appendChild(title);
    if (detail) {
      const more = document.createElement('div');
      more.className = 'setup-detail';
      more.textContent = detail;
      text.appendChild(more);
    }
    li.append(badge, text);
    setupResults.appendChild(li);
  });
  document.getElementById('setup-test-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    await saveSettings(); // test what is typed now, not the last saved values
    setupResults.replaceChildren();
    btn.disabled = true;
    setupStatus.textContent = 'Testing, about 20 seconds.';
    try {
      const results = await cue.setupTest();
      if (results && results.busy) { setupStatus.textContent = 'A test is already running.'; return; }
      const count = (s) => (results || []).filter((r) => r.status === s).length;
      const fails = count('fail');
      const tally = count('pass') + ' passed' + (fails ? ', ' + fails + ' failed' : '') + (count('skip') ? ', ' + count('skip') + ' skipped' : '') + '. ';
      setupStatus.textContent = tally + (fails ? (fails === 1 ? 'Fix the failed check before the interview.' : 'Fix the failed checks before the interview.') : 'Everything cue needs works.');
    } finally {
      btn.disabled = false;
    }
  });

  // ---- practice interview ----
  const practiceBar = document.getElementById('practice-bar');
  let practiceAudio = null;
  function showPractice(p) {
    if (!p) return;
    practiceBar.classList.toggle('hidden', !p.active);
    if (p.active) document.getElementById('practice-label').textContent = 'Practice: question ' + (p.index + 1) + ' of ' + p.total;
    if (!p.active) stopPracticeVoice();
  }
  function stopPracticeVoice() {
    if (practiceAudio) { practiceAudio.pause(); practiceAudio = null; }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }
  // Play the question, then tell main it has been asked. The Mac's own voice
  // stands in when there is no ElevenLabs audio.
  let practiceUtterance = null; // held so the speech engine cannot drop it before onend
  cue.on('practice:play', ({ token, text, audio }) => {
    stopPracticeVoice();
    let reported = false;
    const done = () => { if (!reported) { reported = true; practiceUtterance = null; cue.practicePlayed(token); } };
    const speak = () => {
      if (!window.speechSynthesis) { done(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.onend = done; u.onerror = done;
      practiceUtterance = u;
      window.speechSynthesis.speak(u);
    };
    if (!audio) { speak(); return; }
    practiceAudio = new Audio('data:audio/mpeg;base64,' + audio);
    practiceAudio.onended = done;
    practiceAudio.onerror = () => { practiceAudio = null; speak(); };
    practiceAudio.play().catch(() => { practiceAudio = null; speak(); });
  });
  cue.on('practice:state', showPractice);
  cue.on('practice:cleared', (res) => {
    clearTranscriptSidebar();
    hardClearSTTFill();
    if (res && res.ok === false) showToast('Practice ended, but its memory could not be deleted from this computer.', 3500);
  });
  $('#practice-next-btn').addEventListener('click', async () => showPractice(await cue.practiceNext()));
  $('#practice-end-btn').addEventListener('click', async () => showPractice(await cue.practiceEnd()));
  $('#practice-start-btn').addEventListener('click', async () => {
    await saveSettings(); // the key and voice just typed are the ones used
    const res = await cue.practiceStart();
    if (res && res.error) { showStatus(res.error); return; }
    scrim.classList.add('hidden');
    showPractice(res);
  });
  cue.preparedState().then(showPrepared).catch(() => {});

  function statusText() {
    const k = settings.apiKeys;
    const labels = { publik: 'publik API', openai: 'OpenAI', anthropic: 'Anthropic', gemini: 'Gemini', deepgram: 'Deepgram', custom: 'Custom', ollama: 'Ollama', groq: 'Groq', minimax: 'MiniMax', azure: 'Azure AI Foundry' };
    const has = Object.keys(labels).filter((p) => k[p]).map((p) => labels[p]);
    const publikPart = settings.provider === 'publik' && publikState
      ? ` · ${publikState.connected ? (publikState.balanceLabel ? `balance ${publikState.balanceLabel}` : 'connected') : 'not set up'}`
      : '';
    // 'auto' walks the same fallback chain src/stt.js builds; an explicit choice
    // is reported as-is so the status line matches what will actually be used.
    const selectedSttProvider = settings.sttProvider || 'auto';
    const automaticStt = k.deepgram ? 'Deepgram (streaming)' : (k.openai ? 'OpenAI Realtime' : (k.groq ? 'Groq Whisper' : (k.gemini ? 'Gemini (batch)' : 'none')));
    const stt = selectedSttProvider === 'auto' ? automaticStt : selectedSttProvider;
    const ready = [
      settings.resumeText ? '✓ resume' : null,
      settings.jobDescription ? '✓ JD' : null,
      settings.starStories ? '✓ stories' : null,
      settings.salaryTarget ? '✓ salary' : null
    ].filter(Boolean);
    return `${labels[settings.provider] || settings.provider}${publikPart} · STT: ${stt}` + (ready.length ? ' · ' + ready.join(' · ') : '');
  }

  document.querySelectorAll('#provider-seg button').forEach((b) => b.addEventListener('click', () => {
    settings.provider = b.dataset.provider;
    document.querySelectorAll('#provider-seg button').forEach((x) => x.classList.toggle('on', x === b));
    updateCustomProviderFields();
    fillModelFields();
    $('#s-status').textContent = statusText();
    updateSmartTooltip();
  }));
  document.querySelectorAll('#minimax-region-seg button').forEach((b) => b.addEventListener('click', () => {
    settings.minimaxRegion = b.dataset.region;
    document.querySelectorAll('#minimax-region-seg button').forEach((x) => x.classList.toggle('on', x === b));
  }));

  document.querySelectorAll('#meeting-audio-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.meetingAudio = button.dataset.meetingAudio === 'on';
    document.querySelectorAll('#meeting-audio-seg button').forEach((candidate) => {
      candidate.classList.toggle('on', candidate === button);
    });
  }));

  document.querySelectorAll('#auto-answer-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.autoAnswer = button.dataset.autoAnswer === 'on';
    document.querySelectorAll('#auto-answer-seg button').forEach((candidate) => {
      candidate.classList.toggle('on', candidate === button);
    });
  }));

  document.querySelectorAll('#quick-start-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.codingQuickStart = button.dataset.quickStart === 'on';
    document.querySelectorAll('#quick-start-seg button').forEach((candidate) => candidate.classList.toggle('on', candidate === button));
  }));

  document.querySelectorAll('#scroll-reading-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.scrollReading = button.dataset.scrollReading === 'on';
    showScrollReading(settings.scrollReading);
  }));

  document.querySelectorAll('#coding-speed-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.codingSpeed = button.dataset.codingSpeed;
    document.querySelectorAll('#coding-speed-seg button').forEach((candidate) => candidate.classList.toggle('on', candidate === button));
  }));

  document.querySelectorAll('#architecture-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.codeArchitecture = button.dataset.architecture;
    document.querySelectorAll('#architecture-seg button').forEach((candidate) => candidate.classList.toggle('on', candidate === button));
  }));

  document.querySelectorAll('#watch-screen-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.watchScreen = button.dataset.watchScreen === 'on';
    document.querySelectorAll('#watch-screen-seg button').forEach((candidate) => {
      candidate.classList.toggle('on', candidate === button);
    });
  }));

  document.querySelectorAll('#stt-provider-seg button').forEach((button) => button.addEventListener('click', () => {
    settings.sttProvider = button.dataset.sttProvider;
    document.querySelectorAll('#stt-provider-seg button').forEach((candidate) => {
      candidate.classList.toggle('on', candidate === button);
    });
    $('#s-status').textContent = statusText();
  }));

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** unitIndex);
    return `${value >= 10 || unitIndex < 2 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
  }

  function getSelectedWhisperModel() {
    if (!whisperOverview) return null;
    return whisperOverview.models.find((model) => model.id === $('#whisper-model').value) || null;
  }

  function renderWhisperModelState() {
    const model = getSelectedWhisperModel();
    if (!model) return;
    const language = model.englishOnly ? 'English only' : 'Multilingual';
    const recommendation = model.recommended ? ' · recommended default' : '';
    const partial = model.partialBytes > 0 && !model.installed
      ? ` · ${formatBytes(model.partialBytes)} ready to resume`
      : '';
    $('#whisper-model-detail').textContent = `${formatBytes(model.bytes)} · ${language} · ${model.quantization} · ${model.hardwareTier}${recommendation}${partial}`;

    const progressWrap = $('#whisper-progress-wrap');
    const progressPercent = model.bytes > 0 ? Math.floor((model.partialBytes / model.bytes) * 100) : 0;
    progressWrap.classList.toggle('hidden', !model.downloading);
    $('#whisper-progress').value = progressPercent;
    $('#whisper-progress-label').textContent = `${progressPercent}%`;
    $('#whisper-download').disabled = model.installed || model.downloading;
    $('#whisper-download').textContent = model.installed ? 'Installed' : (model.partialBytes ? 'Resume' : 'Download');
    $('#whisper-cancel').classList.toggle('hidden', !model.downloading);
    $('#whisper-import').disabled = model.downloading;
    $('#whisper-delete').disabled = (model.installedBytes === 0 && model.partialBytes === 0) || model.downloading;
  }

  async function refreshWhisperModels() {
    const status = $('#whisper-status');
    try {
      const previousSelection = $('#whisper-model').value || settings.localWhisper?.modelId || 'base.en';
      whisperOverview = await cue.whisperModels();
      const runtimeBadge = $('#whisper-runtime-status');
      runtimeBadge.classList.toggle('ready', whisperOverview.runtime.available);
      runtimeBadge.classList.toggle('error', !whisperOverview.runtime.available);
      runtimeBadge.textContent = whisperOverview.runtime.available
        ? `Ready · v${whisperOverview.runtime.version} · ${whisperOverview.runtime.target}`
        : 'Not prepared';
      runtimeBadge.title = whisperOverview.runtime.message || '';

      const select = $('#whisper-model');
      select.innerHTML = '';
      for (const model of whisperOverview.models) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = `${model.label} — ${formatBytes(model.bytes)}${model.recommended ? ' (recommended)' : ''}${model.installed ? ' ✓' : ''}`;
        select.appendChild(option);
      }
      const selectionExists = whisperOverview.models.some((model) => model.id === previousSelection);
      select.value = selectionExists ? previousSelection : 'base.en';
      if (!settings.localWhisper) settings.localWhisper = {};
      settings.localWhisper.modelId = select.value;
      status.textContent = whisperOverview.runtime.available
        ? 'Model files are verified before they can be loaded.'
        : whisperOverview.runtime.message;
      renderWhisperModelState();
    } catch (error) {
      status.textContent = `Could not load local model information: ${error.message}`;
    }
  }

  $('#whisper-model').addEventListener('change', () => {
    if (!settings.localWhisper) settings.localWhisper = {};
    settings.localWhisper.modelId = $('#whisper-model').value;
    renderWhisperModelState();
  });

  $('#whisper-download').addEventListener('click', async () => {
    const model = getSelectedWhisperModel();
    if (!model) return;
    model.downloading = true;
    renderWhisperModelState();
    $('#whisper-status').textContent = `Downloading ${model.id}. You can cancel and resume later.`;
    try {
      await cue.whisperModelDownload(model.id);
      $('#whisper-status').textContent = `${model.id} downloaded and verified.`;
    } catch (error) {
      $('#whisper-status').textContent = error.message.includes('cancelled')
        ? `${model.id} download paused. Progress was kept.`
        : `Download failed: ${error.message}`;
    } finally {
      await refreshWhisperModels();
    }
  });

  $('#whisper-cancel').addEventListener('click', async () => {
    const model = getSelectedWhisperModel();
    if (model) await cue.whisperModelCancel(model.id);
  });

  $('#whisper-import').addEventListener('click', async () => {
    const model = getSelectedWhisperModel();
    if (!model) return;
    $('#whisper-status').textContent = `Verifying imported ${model.id}…`;
    try {
      const result = await cue.whisperModelImport(model.id);
      $('#whisper-status').textContent = result.cancelled ? 'Import cancelled.' : `${model.id} imported and verified.`;
    } catch (error) {
      $('#whisper-status').textContent = `Import failed: ${error.message}`;
    } finally {
      await refreshWhisperModels();
    }
  });

  $('#whisper-delete').addEventListener('click', async () => {
    const model = getSelectedWhisperModel();
    if (!model || !window.confirm(`Delete the ${model.id} model (${formatBytes(model.bytes)}) from this computer?`)) return;
    try {
      await cue.whisperModelDelete(model.id);
      $('#whisper-status').textContent = `${model.id} deleted.`;
    } catch (error) {
      $('#whisper-status').textContent = `Delete failed: ${error.message}`;
    } finally {
      await refreshWhisperModels();
    }
  });

  cue.on('whisper:download-progress', (progress) => {
    if (!whisperOverview) return;
    const model = whisperOverview.models.find((candidate) => candidate.id === progress.modelId);
    if (!model) return;
    model.partialBytes = progress.receivedBytes;
    model.downloading = true;
    if ($('#whisper-model').value === progress.modelId) {
      $('#whisper-progress-wrap').classList.remove('hidden');
      $('#whisper-progress').value = progress.percent;
      $('#whisper-progress-label').textContent = `${progress.percent}%`;
      $('#whisper-model-detail').textContent = `${formatBytes(progress.receivedBytes)} of ${formatBytes(progress.totalBytes)}`;
    }
  });
  cue.on('whisper:models-changed', () => refreshWhisperModels());

  async function saveSettings() {
    // Keys
    settings.apiKeys.openai = $('#key-openai').value.trim();
    settings.apiKeys.anthropic = $('#key-anthropic').value.trim();
    settings.apiKeys.gemini = $('#key-gemini').value.trim();
    settings.apiKeys.deepgram = $('#key-deepgram').value.trim();
    settings.apiKeys.elevenlabs = $('#key-elevenlabs').value.trim();
    settings.sttWords = $('#stt-words').value.trim();
    settings.companyNotes = $('#company-notes').value.trim();
    settings.practiceVoice = $('#practice-voice').value || 'george';
    settings.apiKeys.custom = $('#key-custom').value.trim();
    settings.baseUrl = $('#base-url').value.trim();
    settings.apiKeys.ollama = $('#key-ollama').value.trim();
    settings.apiKeys.groq = $('#key-groq').value.trim();
    settings.apiKeys.minimax = $('#key-minimax').value.trim();
    settings.apiKeys.azure = $('#key-azure').value.trim();
    settings.azureEndpoint = $('#azure-endpoint').value.trim();
    if (!settings.models[settings.provider]) settings.models[settings.provider] = {};
    settings.models[settings.provider].fast = $('#model-fast').value.trim();
    settings.models[settings.provider].smart = $('#model-smart').value.trim();
    settings.models[settings.provider].coding = $('#model-coding').value.trim();
    // If the active provider still has no key, but the user just filled in a
    // key for a different provider (without touching the Provider selector —
    // the flow both bug reports describe), switch to that provider. Without
    // this, `settings.provider` stays on its default ('openai') forever and
    // cue keeps reporting itself unconfigured even though a valid key was
    // saved for the provider the user actually meant to use.
    if (!settings.apiKeys[settings.provider]) {
      const keyedProviders = ['openai', 'anthropic', 'gemini', 'groq', 'minimax', 'azure'];
      const justFilled = keyedProviders.find((p) => settings.apiKeys[p]);
      if (justFilled) settings.provider = justFilled;
    }
    // Transcription
    if (!settings.localWhisper) settings.localWhisper = {};
    settings.localWhisper.modelId = $('#whisper-model').value || settings.localWhisper.modelId || 'base.en';
    settings.localWhisper.language = $('#whisper-language').value || 'auto';
    settings.localWhisper.threads = Math.max(0, Math.min(64, Number.parseInt($('#whisper-threads').value, 10) || 0));
    // Profile
    settings.resumeText = $('#resume-text').value.trim();
    settings.jobDescription = $('#job-description').value.trim();
    // Interview Prep
    settings.starStories = $('#star-stories').value.trim();
    settings.whyCompany = $('#why-company').value.trim();
    settings.whyLeaving = $('#why-leaving').value.trim();
    settings.workStyle = $('#work-style').value.trim();
    // Style tab
    settings.aiRules = $('#ai-rules').value.trim();
    settings.panelOpacity = Number($('#panel-opacity').value);
    // Q&A
    settings.salaryTarget = $('#salary-target').value.trim();
    settings.questionsToAsk = $('#questions-to-ask').value.trim();
    try {
      settings = await cue.settingsSet(settings);
      $('#s-status').textContent = statusText();
      updatePrepStatus();
      updateSmartTooltip();
      return true;
    } catch (error) {
      const message = error && error.message ? error.message : String(error);
      $('#s-status').textContent = message;
      $('#base-url').focus();
      return false;
    }
  }

  // ---- example conversation (matches the reference screenshot) ------------
  function showExample() {
    clearMessages();
    addUserBubble('What should I say?');
    const ai = document.createElement('div');
    ai.className = 'ai-text';
    ai.textContent = '“A discounted cash flow model values a company by projecting future free cash flows and discounting them to present value using the weighted average cost of capital.”';
    messages.appendChild(ai);
  }

  // ---- global keys -------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !scrim.classList.contains('hidden')) closeSettings();
    if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); openSettings(); }
  });

  // ---- click-through: only the UI blocks the mouse; empty gaps pass to your screen ----
  // Every part of the window that takes the mouse. A sheet missing here is
  // see-through to clicks, which land in the app behind (the Script window
  // did: clicks and pastes went to the terminal). Kept in step with the
  // pointer-events rule in styles.css by test/click-through.test.js.
  const UI_SELECTOR = '#toolbar, #panel-wrap, #transcript-sidebar, #settings-scrim, #onboard-scrim, #consent-scrim, #script-scrim';
  let ignoring = null;
  function setIgnore(v) { if (v !== ignoring) { ignoring = v; cue.setIgnoreMouse(v); } }
  document.addEventListener('mousemove', (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const overUI = !!(el && el.closest && el.closest(UI_SELECTOR));
    setIgnore(!overUI);
  });
  setIgnore(true); // start fully click-through; hovering the panel re-enables it

  // ---- assistant access request ------------------------------------------
  // Shown here rather than as a native dialog because cue hides its dock icon:
  // an OS panel from an accessory app never comes forward and cannot be
  // clicked. Note the scrim is registered in the click-through selector above
  // and in styles.css — without both, this window stays transparent to the
  // mouse and the buttons do nothing.
  const consentScrim = $('#consent-scrim');
  let pendingConsentId = null;

  function answerConsent(allowed) {
    if (!pendingConsentId) return;
    cue.appLinkConsentRespond(pendingConsentId, allowed);
    pendingConsentId = null;
    consentScrim.classList.add('hidden');
  }

  cue.on('applink:consent-request', (request) => {
    pendingConsentId = request.id;
    $('#cs-title').textContent = request.message;
    $('#cs-body').textContent = request.detail;
    $('#cs-allow').textContent = request.allowLabel;
    consentScrim.classList.remove('hidden');
    // Do not wait for a mousemove to turn the mouse back on: the pointer may
    // already be still, and the sheet would be unclickable until it moved.
    setIgnore(false);
    $('#cs-deny').focus();
  });

  $('#cs-allow').addEventListener('click', () => answerConsent(true));
  $('#cs-deny').addEventListener('click', () => answerConsent(false));
  // Anything other than a deliberate Allow is a no, including Escape and
  // clicking away.
  consentScrim.addEventListener('click', (e) => { if (e.target === consentScrim) answerConsent(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pendingConsentId) { e.preventDefault(); answerConsent(false); }
  });

  // ---- onboarding / first-run tutorial -----------------------------------
  const obScrim = $('#onboard-scrim');
  const permissionHelp = isWindows
    ? 'cue needs permission to see and hear. Open Windows Privacy & security settings, allow <strong>Microphone</strong> and <strong>Screen recording</strong> for cue, then come back here.'
    : 'cue needs two macOS permissions. Click each button, turn <strong>cue</strong> ON in the window that opens, then come back here.';
  const permissionButtons = isWindows
    ? [
        { label: 'Open Microphone settings', action: () => cue.openPane('ms-settings:privacy-microphone') },
        { label: 'Open Screen recording settings', action: () => cue.openPane('ms-settings:privacy-screenrecorder') }
      ]
    : [
        { label: 'Open Microphone settings', action: () => cue.openPane('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone') },
        { label: 'Open Screen Recording settings', action: () => cue.openPane('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture') }
      ];
  const assistShortcut = isWindows ? '<span class="kbd">Ctrl</span> <span class="kbd">↵</span>' : '<span class="kbd">⌘</span> <span class="kbd">↵</span>';
  const solveShortcut = isWindows ? '<span class="kbd">Ctrl</span> <span class="kbd">H</span>' : '<span class="kbd">⌘</span> <span class="kbd">H</span>';
  const quitShortcut = isWindows ? '<span class="kbd">Ctrl</span><span class="kbd">⇧</span><span class="kbd">X</span>' : '<span class="kbd">⌘</span><span class="kbd">⇧</span><span class="kbd">X</span>';
  const OB_STEPS = [
    {
      icon: '👋',
      title: 'Welcome to cue',
      body: 'cue is a private AI copilot that floats over your screen. It can <strong>see your screen</strong>, <strong>hear your meetings</strong>, and help you answer questions or solve coding problems — while staying hidden from most screen shares.<br><br>This quick guide gets you running in about a minute.'
    },
    {
      icon: '🔐',
      title: 'Allow cue to see & hear',
      body: permissionHelp + '<ul><li><strong>Microphone</strong> — to hear you</li><li><strong>Screen recording</strong> — to see your screen and hear meeting audio</li></ul>',
      buttons: permissionButtons
    },
    {
      icon: '🔑',
      title: 'Connect an AI provider',
      body: 'cue uses <strong>your own</strong> API key — pick <span class="hl">OpenAI</span>, <span class="hl">Anthropic</span>, <span class="hl">Google Gemini</span>, or <span class="hl">Azure AI Foundry</span>. Get a key from your provider, then paste it into cue\'s Settings.<br><br><strong>Tip:</strong> For the <em>best</em> real-time listening, add a <span class="hl">Deepgram</span> key (lowest latency streaming transcription). Otherwise, an OpenAI key enables streaming via the Realtime API, and Gemini/Whisper work as batch fallbacks.',
      buttons: [{ label: 'Open cue Settings', action: () => { finishOnboard(); openSettings(); } }]
    },
    {
      icon: '🫥',
      title: 'Stay hidden in Zoom',
      body: 'cue is hidden from most screen shares automatically (Google Meet, Teams, QuickTime — nothing to do). <strong>Zoom needs one setting:</strong><br><br>Zoom → <span class="hl">Settings</span> → <span class="hl">Share Screen</span> → <span class="hl">Advanced</span> → <strong>Screen capture mode</strong> → choose <strong>“Advanced capture with window filtering.”</strong><br><br>Avoid “<strong>without</strong> window filtering” — that mode reveals cue.'
    },
    {
      icon: '✨',
      title: 'You’re all set',
      body: 'How to use cue:<ul><li>' + assistShortcut + ' — <strong>Assist</strong> with whatever\'s on screen or being said</li><li>' + solveShortcut + ' — solve a coding problem on screen</li><li>Click <strong>▢</strong> in the top bar to start listening to a meeting</li><li>Type a question and press <span class="kbd">↵</span></li></ul>Reopen this guide anytime by clicking the <strong>cue logo</strong>. Quit with ' + quitShortcut + '.'
    }
  ];
  // First-run disclosure (R21 §4.3): two disclosures — cost and data path —
  // and a visible "use my own key" branch. Copy comes from main (one source).
  // Only "Continue" mints a key; Next/Skip never provision.
  function publikStep() {
    const c = publikState.copy.disclosure;
    return {
      icon: '🪙',
      title: c.title,
      body: () => `${esc(c.intro)}<br><br><strong>Cost.</strong> ${esc(c.cost)}<br><br><strong>Where your prompts go.</strong> ${esc(c.dataPath)}` +
        `<span class="ob-fine">${esc(c.terms)} <a id="ob-publik-terms">publik API terms</a></span>`,
      buttons: [
        { label: c.accept, action: async () => {
          const btns = $('#ob-buttons').querySelectorAll('button'); btns.forEach((b) => { b.disabled = true; });
          publikState = await cue.publikAcceptDisclosure(); settings.provider = 'publik'; renderPublikBlock();
          // CONTRACT §12.1: the card comes right after POST /installs succeeds,
          // with the real balance on it. Nothing is spent before it is seen.
          if (publikState.card) { showPublikCard(); return; }
          if (obDialog) { hideOnboardDialog(); } else { obIndex++; renderOnboard(); }
        } },
        { label: c.decline, action: () => { if (obDialog) hideOnboardDialog(); else finishOnboard(); openSettings(); selectByoProvider(); } }
      ]
    };
  }
  // The first-run card (CONTRACT §12.1), in this order: (a) the balance line
  // from the mint response, (b) the one-sentence justification, (c) the
  // primary button that opens claim_url — and "Later", which keeps the free
  // starter. Everything is painted from publikState.card (src/publik.js
  // ctaView), so the copy has one source and the link rule is tested there.
  function publikCardStep() {
    const card = publikState.card;
    const done = async () => {
      publikState = await cue.publikCardSeen(); renderPublikBlock();
      const idx = OB_STEPS.findIndex((st) => st.publikCard);
      if (idx >= 0) OB_STEPS.splice(idx, 1);
      if (obDialog) { hideOnboardDialog(); return; }
      if (obIndex >= OB_STEPS.length) finishOnboard(); else renderOnboard();
    };
    const buttons = [];
    if (card.primary) {
      buttons.push({ label: card.primary.label, primary: true, action: async () => { cue.publikOpen(card.primary.url); await done(); } });
    }
    buttons.push({ label: card.secondary.label, action: done });
    return {
      icon: '✅',
      title: card.title,
      body: () => `<div class="publik-card-balance">${esc(card.balance)}</div><div class="publik-card-why">${esc(card.why)}</div>`,
      buttons,
      publikCard: true
    };
  }
  function esc(text) { const d = document.createElement('div'); d.textContent = text; return d.innerHTML; }
  let obDialog = false; // true while the publik card is shown alone, after onboarding
  function showPublikDisclosure() {
    if (!publikState || !publikState.available) return;
    const idx = OB_STEPS.findIndex((st) => st.publik);
    if (idx < 0) return;
    obDialog = true;
    $('#onboard').classList.add('dialog');
    obIndex = idx; renderOnboard();
    obScrim.classList.remove('hidden'); setIgnore(false);
  }
  // Show the card: inside onboarding it becomes the next step; afterwards it
  // is a dialog of its own (also reached from the "never a silent starter"
  // gate in main.js runFeature).
  function showPublikCard() {
    if (!publikState || !publikState.card) return;
    const existing = OB_STEPS.findIndex((st) => st.publikCard);
    if (existing >= 0) OB_STEPS.splice(existing, 1);
    const inOnboarding = !obScrim.classList.contains('hidden') && !obDialog;
    if (inOnboarding) {
      const idx = OB_STEPS.findIndex((st) => st.publik);
      OB_STEPS.splice(idx + 1, 0, publikCardStep());
      obIndex = idx + 1; renderOnboard();
      return;
    }
    OB_STEPS.push(publikCardStep());
    obDialog = true;
    $('#onboard').classList.add('dialog');
    obIndex = OB_STEPS.length - 1; renderOnboard();
    obScrim.classList.remove('hidden'); setIgnore(false);
  }
  function hideOnboardDialog() { obDialog = false; $('#onboard').classList.remove('dialog'); obScrim.classList.add('hidden'); }

  let obIndex = 0;
  function renderOnboard() {
    const step = OB_STEPS[obIndex];
    $('#ob-icon').textContent = step.icon;
    $('#ob-title').textContent = step.title;
    $('#ob-body').innerHTML = typeof step.body === 'function' ? step.body() : step.body;
    const termsLink = $('#ob-publik-terms');
    if (termsLink) termsLink.addEventListener('click', () => cue.publikOpen(publikState.links.terms));
    const btns = $('#ob-buttons'); btns.innerHTML = '';
    (step.buttons || []).forEach((b) => { const el = document.createElement('button'); el.textContent = b.label; if (b.primary) el.classList.add('ob-cta'); el.addEventListener('click', b.action); btns.appendChild(el); });
    // The publik card has its own two buttons and no Next/Skip: leaving it any
    // other way would spend the starter without the card being acknowledged.
    $('#onboard').classList.toggle('card', !!step.publikCard);
    const dots = $('#ob-dots'); dots.innerHTML = '';
    OB_STEPS.forEach((_, i) => { const d = document.createElement('span'); if (i === obIndex) d.className = 'on'; dots.appendChild(d); });
    $('#ob-back').style.visibility = obIndex === 0 ? 'hidden' : 'visible';
    $('#ob-next').textContent = obIndex === OB_STEPS.length - 1 ? 'Done' : 'Next';
    $('#ob-skip').style.visibility = obIndex === OB_STEPS.length - 1 ? 'hidden' : 'visible';
  }
  function showOnboard() { obDialog = false; $('#onboard').classList.remove('dialog'); obIndex = 0; renderOnboard(); obScrim.classList.remove('hidden'); setIgnore(false); }
  async function finishOnboard() {
    if (obDialog) { hideOnboardDialog(); return; }
    obScrim.classList.add('hidden');
    if (settings && !settings.onboarded) { settings.onboarded = true; await cue.settingsSet({ onboarded: true }); }
  }
  $('#ob-next').addEventListener('click', () => { if (obIndex === OB_STEPS.length - 1) finishOnboard(); else { obIndex++; renderOnboard(); } });
  $('#ob-back').addEventListener('click', () => { if (obIndex > 0) { obIndex--; renderOnboard(); } });
  $('#ob-skip').addEventListener('click', finishOnboard);
  $('#logo-btn').addEventListener('click', showOnboard);

  // ---- boot --------------------------------------------------------------
  (async function boot() {
    settings = await cue.settingsGet();
    applyPanelOpacity(settings.panelOpacity);
    const platformInfo = await cue.platformInfo();
    publikState = await cue.publikState();
    // A build with no app token never shows the option, and keeps the BYO
    // onboarding card. With one, the "Connect an AI provider" card becomes the
    // publik disclosure; the BYO branch stays one tap away on that card.
    $('#provider-publik').classList.toggle('hidden', !publikState.available);
    if (publikState.available) OB_STEPS.splice(2, 1, { ...publikStep(), publik: true });

    // R4: shortcut hints
    const sayHintEl = document.getElementById('say-shortcut-hint');
    const assistHintEl = document.getElementById('assist-shortcut-hint');
    if (sayHintEl) sayHintEl.textContent = isWindows ? 'Ctrl+Shift+↵' : '⌘⇧↵';
    if (assistHintEl) assistHintEl.textContent = isWindows ? 'Ctrl+↵' : '⌘↵';

    // R5: prep status
    updatePrepStatus();
    // R6: smart tooltip
    updateSmartTooltip();
    // Fix 3: Adjust permission buttons based on actual Windows version.
    // ms-settings:privacy-screenrecorder only exists on Windows 11.
    // On Windows 10, screen capture needs no permission — so replace the button
    // with a more helpful note instead of an invalid settings link.
    if (isWindows && platformInfo.winBuild > 0 && platformInfo.winBuild < 22000) {
      // Windows 10: update the onboarding screen recording button to be more helpful
      const ob = OB_STEPS[1];
      ob.buttons = ob.buttons.filter((b) => !b.label.toLowerCase().includes('screen'));
      ob.body = 'cue needs microphone permission to hear you. Click the button below to open Windows microphone settings and allow cue.<br><br><strong>Screen capture works automatically on Windows 10</strong> — no additional permission needed.<ul><li><strong>Microphone</strong> — to hear you</li><li><strong>Screen recording</strong> — works automatically on Windows 10</li></ul>';
    }

    smartBtn.classList.toggle('on', !!settings.smart);
    showLength(settings.answerLength, false);
    showExample();
    await restoreInterviewMemory();
    syncPlaceholder();
    updateHistoryBadge(); // FIX #3: Initialize badge on boot
    updateSendButtonState(); // Initialize send button state

    const st = await cue.captureState();
    $('#live-dot').classList.toggle('off', !st.active);
    $('#stop-btn').classList.toggle('active', st.active);
    if (!settings.onboarded) showOnboard();
  })();
})();
