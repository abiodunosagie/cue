// The transcript history sidebar (hidden by default, manual toggle), created
// by renderer.js, which uses the two functions it returns.
(function () {
  window.createHistorySidebar = function ({ icon }) {
    let tsSidebarInterimEl = null;
    let sidebarOpen = false;
    // Track last committed row per channel, all chunks from same speaker go in one row
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
          // Append to existing row, accumulates sentence fragments
          const txt = existingRow.querySelector('.ts-text');
          if (txt) {
            txt.textContent = txt.textContent ? txt.textContent + ' ' + text : text;
          }
        } else {
          // Start a new row (no buttons, just clean history view)
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

    return { appendTranscriptHistoryTurn, clearTranscriptSidebar };
  };
})();
