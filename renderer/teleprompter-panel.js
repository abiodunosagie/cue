// The teleprompter (the Script button), created by renderer.js with what it
// shares: cue, the #messages view, showStatus, and getSettings(), since
// renderer.js replaces its settings object on every save.
// The candidate reads a script they wrote, for example an intro video. The
// words move with their voice (window.ScriptFollow): the word just said is
// lit, words read are dimmed, and the view scrolls only as far as they have
// read. Silence holds it still. Speech during a script never reaches the
// interview (main drops it from the transcript and memory).
(function () {
  window.createTeleprompter = function ({ cue, messages, showStatus, getSettings }) {
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
      let autoStopTimer = null;
      let cameraOwner = 0;     // the recorder's camera generation this reading uses
      // Subtitles: when each word of the script was lit in the take being
      // recorded (ms from its start), or null when this take has none.
      let wordTimes = null;
      let takeStartedAt = 0;
      const CONFIRM_MS = 3000; // a second press within this deletes a take
      const AUTO_STOP_S = 4;   // after the last word: time to smile and look at the lens before it ends
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
        // Only the word lit gets a time; words the follower jumped over are placed
        // between their neighbours when the captions are made.
        if (wordTimes && token > lastToken && takeStartedAt && !Number.isFinite(wordTimes[token])) wordTimes[token] = Date.now() - takeStartedAt;
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

      // The last word was said: count down, then save as if Done was pressed.
      function autoStopAfterLastWord() {
        let left = AUTO_STOP_S;
        label.textContent = `End of script. Saving in ${left}...`;
        autoStopTimer = setInterval(() => {
          left -= 1;
          if (left > 0) { label.textContent = `End of script. Saving in ${left}...`; return; }
          clearAutoStop();
          stop();
        }, 1000);
      }
      function clearAutoStop() { clearInterval(autoStopTimer); autoStopTimer = null; }

      // One take: a new file, the REC badge and its clock.
      function beginTake() {
        take += 1;
        // A camera unplugged or a recorder failure mid-take: say so and save what there is.
        const onProblem = (message) => { showStatus(message); stop(); };
        taking = window.CueRecorder.start({ scriptName: record.scriptName, preset: record.preset, take, onProblem })
          .then(() => {
            takeStartedAt = Date.now();
            wordTimes = record && record.subtitles ? [] : null;
            recBadge.classList.remove('hidden');
            recTime.textContent = '0:00';
            clearInterval(recTimer);
            recTimer = setInterval(() => {
              // One clock for the take: the REC time and the subtitles both count from here.
              const s = Math.floor((Date.now() - takeStartedAt) / 1000);
              recTime.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
            }, 500);
          })
          .catch((e) => { showStatus('Recording did not start: ' + (e && e.message ? e.message : String(e))); });
        return taking;
      }

      // Ends the take in progress, if any, and says where the video went.
      async function finishTake() {
        // The words and their times now: stop() clears the script right after calling this.
        const tokens = follower ? follower.tokens.slice() : [];
        const times = wordTimes;
        const length = takeStartedAt ? Date.now() - takeStartedAt : 0;
        wordTimes = null;
        takeStartedAt = 0;
        if (taking) await taking.catch(() => {});
        clearInterval(recTimer);
        recBadge.classList.add('hidden');
        if (!window.CueRecorder.recording()) return;
        const cues = times ? window.CueSubtitles.buildCues(tokens, times, length) : [];
        const res = await window.CueRecorder.stop(cues.length ? window.CueSubtitles.toSrt(cues) : '');
        if (res) showSaved(res, !!times && !cues.length);
      }

      // A line under the answers: the file and a Show in Finder button.
      // noWordsHeard: subtitles were on but no word was followed, so there are none.
      function showSaved(res, noWordsHeard = false) {
        const box = document.createElement('div');
        box.className = 'rec-saved' + (res.error ? ' failed' : '');
        const text = document.createElement('span');
        if (res.error) text.textContent = res.error;
        else {
          const mb = res.bytes ? ` (${Math.max(1, Math.round(res.bytes / 1048576))} MB)` : '';
          const subs = res.subtitleTrack ? ' Subtitles are inside it (switch them on in the player) and in the .srt beside it.'
            : res.srt ? ' Subtitles are in the .srt file beside it.'
              : res.subtitleError ? ' The subtitles could not be saved: ' + res.subtitleError + '.'
                : noWordsHeard ? ' No subtitles: cue did not hear the script being read.' : '';
          text.textContent = `Saved ${res.file}${mb} in ${res.folder}.` + subs + (res.remuxed ? '' : ' Install ffmpeg (brew install ffmpeg) for files that stream and show their length everywhere.') + (res.warning ? ' Part of it may be missing: ' + res.warning : '');
        }
        box.appendChild(text);
        if (res.path) {
          const btn = document.createElement('button');
          btn.className = 's-action';
          btn.textContent = 'Show in Finder';
          btn.addEventListener('click', async () => { const r = await cue.recordReveal(res.path); if (r && r.error) text.textContent = r.error; });
          // Keeping a take is the default; deleting one takes two presses and goes to the Trash.
          const del = document.createElement('button');
          del.className = 's-action danger';
          del.textContent = 'Delete take';
          let armed = null;
          del.addEventListener('click', async () => {
            if (!armed) {
              del.textContent = 'Press again to delete';
              armed = setTimeout(() => { armed = null; del.textContent = 'Delete take'; }, CONFIRM_MS);
              return;
            }
            clearTimeout(armed);
            armed = null;
            del.disabled = true;
            const r = await cue.recordDiscard(res.path);
            if (r && r.error) { text.textContent = r.error; del.disabled = false; del.textContent = 'Delete take'; return; }
            box.classList.add('removed');
            text.textContent = `Moved ${res.file} to the Trash.`;
            btn.remove(); del.remove();
          });
          box.append(btn, del);
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
          cameraOwner = window.CueRecorder.generation();
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
        clearAutoStop();
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
        clearAutoStop();
        if (record) {
          record = null;
          // The camera goes off once the last take is on disk.
          // Only this reading's camera: a preview opened for the next take meanwhile stays on.
          const owner = cameraOwner;
          finishTake().finally(() => { window.CueRecorder.close(owner); });
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
        if (st.done && films() && record.autoStop) { if (!autoStopTimer) autoStopAfterLastWord(); }
        else if (st.done) label.textContent = films() ? 'End of script. Press Done to save the video.' : 'End of script. Stop recording, then press Done.';
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

      const scripts = () => (getSettings() && Array.isArray(getSettings().scripts) ? getSettings().scripts : []);
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
        if (!getSettings()) return;
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
        getSettings().scripts = saved && Array.isArray(saved.scripts) ? saved.scripts : list;
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
      const recAutoStop = document.getElementById('rec-autostop');
      const recSubtitles = document.getElementById('rec-subtitles');
      const recMeter = document.getElementById('rec-meter');
      const recMeterTrack = document.getElementById('rec-meter-track');
      const recMeterFill = document.getElementById('rec-meter-fill');
      const recMeterText = document.getElementById('rec-meter-text');
      const Presets = window.CueRecordPresets;
      const recPrefs = () => ({ cameraId: '', micId: '', on: false, autoStop: true, subtitles: false, preset: Presets.DEFAULT_PRESET, ...((getSettings() && getSettings().recording) || {}) });
      const METER_WINDOW_MS = 1200; // the verdict is on the loudest moment of about a second of speech

      // The bar moves with every frame; the words change only a few times a second.
      function startMeter() {
        const recent = [];
        let lastText = 0;
        recMeter.removeAttribute('data-level');
        recMeterText.textContent = 'Say something to test the microphone.';
        window.CueRecorder.meter((peak) => {
          const now = Date.now();
          recent.push({ t: now, peak });
          while (recent.length && now - recent[0].t > METER_WINDOW_MS) recent.shift();
          const db = peak > 0 ? 20 * Math.log10(peak) : -60;
          const pct = Math.max(0, Math.min(100, Math.round(((db + 60) / 60) * 100)));
          recMeterFill.style.width = pct + '%';
          recMeterTrack.setAttribute('aria-valuenow', String(pct));
          if (now - lastText < 300) return;
          lastText = now;
          const loudest = recent.reduce((m, r) => Math.max(m, r.peak), 0);
          // Silence before anyone speaks is not "too quiet" yet.
          if (loudest < 0.003) return;
          const v = Presets.micVerdict(loudest);
          recMeter.dataset.level = v.level;
          recMeterText.textContent = v.text;
        });
      }
      let previewSeq = 0;

      function fillSelect(sel, items, value) {
        sel.replaceChildren(...items.map((it) => { const o = document.createElement('option'); o.value = it.id; o.textContent = it.label; return o; }));
        if (items.some((it) => it.id === value)) sel.value = value;
      }

      async function saveRecPrefs(patch) {
        const next = { ...recPrefs(), ...patch };
        const saved = await cue.settingsSet({ recording: next });
        getSettings().recording = (saved && saved.recording) || next;
      }

      // Shows the camera for framing (and fills the device lists: their names
      // appear only once the camera may be used). Off: the camera light goes out.
      async function refreshRecord() {
        const seq = ++previewSeq;
        const prefs = recPrefs();
        recOn.checked = prefs.on;
        recAutoStop.checked = prefs.autoStop;
        recSubtitles.checked = prefs.subtitles;
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
        if (info && info.folder) recFolder.textContent = 'Saves to ' + info.folder + (info.ffmpeg ? '' : '. Install ffmpeg (brew install ffmpeg) so every player shows the video\'s length.');
        const willFilm = !!p.request;
        recFrame.classList.toggle('hidden', !willFilm);
        recCamera.disabled = !willFilm; recMic.disabled = !willFilm;
        recMeter.classList.toggle('hidden', !willFilm);
        recAutoStop.parentElement.classList.toggle('hidden', !willFilm);
        recSubtitles.parentElement.classList.toggle('hidden', !willFilm);
        if (!willFilm) { window.CueRecorder.close(); recPreview.srcObject = null; recSize.textContent = 'Nothing is recorded in this mode.'; return; }
        recSize.textContent = 'Turning the camera on...';
        try {
          const got = await window.CueRecorder.preview(recPreview, prefs);
          if (seq !== previewSeq) return;
          const { cameras, mics } = await window.CueRecorder.devices();
          fillSelect(recCamera, cameras, (got && got.cameraId) || prefs.cameraId);
          fillSelect(recMic, mics, (got && got.micId) || prefs.micId);
          startMeter();
          recSize.textContent = got
            ? `Records ${got.width}x${got.height} at ${got.fps} fps` + (got.cropped ? ', cut from this camera\'s wider picture.' : ', the camera\'s own picture.') + ' Line your eyes up with the dashed line.'
            : '';
        } catch (e) {
          if (seq !== previewSeq) return;
          // The saved camera or microphone is not connected now: forget it and use the default.
          if (e && (e.name === 'OverconstrainedError' || e.name === 'NotFoundError') && (prefs.cameraId || prefs.micId)) {
            await saveRecPrefs({ cameraId: '', micId: '' });
            if (seq === previewSeq) refreshRecord();
            return;
          }
          recSize.textContent = e && e.name === 'NotAllowedError'
            ? 'cue may not use the camera. Allow it in System Settings > Privacy & Security > Camera, then open Script again.'
            : 'The camera did not start: ' + (e && e.message ? e.message : String(e));
        }
      }

      recOn.addEventListener('change', async () => { await saveRecPrefs({ on: recOn.checked }); refreshRecord(); });
      recPreset.addEventListener('change', async () => { await saveRecPrefs({ preset: recPreset.value }); refreshRecord(); });
      recCamera.addEventListener('change', async () => { await saveRecPrefs({ cameraId: recCamera.value }); refreshRecord(); });
      recMic.addEventListener('change', async () => { await saveRecPrefs({ micId: recMic.value }); refreshRecord(); });
      recAutoStop.addEventListener('change', () => saveRecPrefs({ autoStop: recAutoStop.checked }));
      recSubtitles.addEventListener('change', () => saveRecPrefs({ subtitles: recSubtitles.checked }));
      document.getElementById('rec-folder-btn').addEventListener('click', async () => {
        const res = await cue.recordChooseFolder().catch(() => null);
        if (res && res.folder) recFolder.textContent = 'Saves to ' + res.folder;
      });

      function open() {
        if (!getSettings()) return;
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
        window.CueRecorder.stopMeter();
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
        const record = prefs.on ? { preset: prefs.preset, autoStop: prefs.autoStop, subtitles: prefs.subtitles, scriptName: name.value.trim() || 'cue recording' } : null;
        await close(!!record);
        teleprompter.start(area.value, { record });
      });
      document.getElementById('script-close').addEventListener('click', () => close());
      // Like Settings: Escape anywhere, or a click on the dimmed backdrop, closes it.
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scrim.classList.contains('hidden')) close(); });
      scrim.addEventListener('click', (e) => { if (e.target === scrim) close(); });
      document.getElementById('script-btn').addEventListener('click', open);
    })();

    return teleprompter;
  };
})();
