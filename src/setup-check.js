// Test my setup: one click runs every part cue needs in an interview against
// the real services and reports pass, fail (with the plain reason) or skipped,
// so a broken key or a missing permission shows up before the interview, not
// during it. Everything outside comes in as functions, so this is testable.

const CHECK_TIMEOUT_MS = 20000;

// A sound from the other side within this window counts as working meeting audio.
const MEETING_AUDIO_FRESH_MS = 2 * 60 * 1000;
const clock = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// Each check resolves { status: 'pass' | 'fail' | 'skip', detail }.
function buildChecks(d) {
  const reply = async (tier) => {
    const llm = d.llmFor(tier);
    if (!llm.ready) return { status: 'fail', detail: llm.configurationError || 'This model is not set up in Settings > Keys.' };
    const text = await d.quickAsk({ llm, system: 'Reply with the single word OK.', text: 'Say OK.', maxTokens: 5, timeoutMs: CHECK_TIMEOUT_MS });
    return text.trim() ? { status: 'pass', detail: llm.model } : { status: 'fail', detail: llm.model + ' sent an empty reply.' };
  };
  return [
    { name: 'Fast model', run: () => reply('fast') },
    { name: 'Smart model', run: () => reply('smart') },
    { name: 'Coding model (' + d.codingShortcut + ')', run: () => reply('coding') },
    {
      name: 'Prepared answers',
      run: async () => {
        const p = d.preparedState();
        if (!p.canPrepare) return { status: 'skip', detail: 'Add your resume and a job description in Settings > Profile.' };
        if (p.running) return { status: 'skip', detail: 'Being prepared right now. Test again in a minute.' };
        if (p.error) return { status: 'fail', detail: p.error };
        if (p.count && p.current) return { status: 'pass', detail: p.count + ' answers ready.' };
        return { status: 'fail', detail: 'Not prepared for the current profile yet. Press Prepare again in Interview prep.' };
      }
    },
    {
      name: 'Microphone permission',
      run: async () => (d.mediaStatus('microphone') === 'granted'
        ? { status: 'pass', detail: 'Granted.' }
        : { status: 'fail', detail: 'Allow cue in System Settings > Privacy & Security > Microphone.' })
    },
    {
      name: 'Screen permission',
      run: async () => (d.mediaStatus('screen') === 'granted'
        ? { status: 'pass', detail: 'Granted. Needed for Assist, ' + d.codingShortcut + ' and screen watch.' }
        : { status: 'fail', detail: 'Allow cue in System Settings > Privacy & Security > Screen & System Audio Recording.' })
    },
    {
      name: 'Reading the screen',
      run: async () => {
        const llm = d.llmFor('fast');
        if (!llm.ready) return { status: 'skip', detail: 'Needs the Fast model.' };
        if (d.mediaStatus('screen') !== 'granted') return { status: 'skip', detail: 'Needs the screen permission.' };
        const shot = await d.captureScreen();
        if (!shot) return { status: 'fail', detail: 'No screen image was available.' };
        const answer = await d.quickAsk({ llm, system: d.detectSystem, text: 'What is the candidate being asked on this screen?', imageDataUrl: shot.dataUrl, maxTokens: 200, timeoutMs: CHECK_TIMEOUT_MS });
        // Any well-formed reply proves the Fast model can see images; NONE is fine.
        return /^\s*(NONE|QUESTION\s*:|CODING\s*:)/i.test(answer)
          ? { status: 'pass', detail: 'The Fast model can read your screen.' }
          : { status: 'fail', detail: 'The Fast model did not answer in the expected form. It may not accept images; pick a Fast model that does.' };
      }
    },
    {
      name: 'Live transcription',
      run: async () => {
        const stt = d.sttProvider();
        if (stt !== 'deepgram') return { status: 'skip', detail: stt === 'none' ? 'No transcription key in Settings > Keys.' : 'Uses ' + stt + '. Only Deepgram is tested here.' };
        const probe = await d.probeDeepgram();
        return probe.ok ? { status: 'pass', detail: probe.detail } : { status: 'fail', detail: probe.detail };
      }
    },
    {
      // Meeting audio needs a call or video playing, so this reports what cue
      // actually received; it never passes on a guess.
      name: 'Meeting audio',
      run: async () => {
        const a = d.meetingAudio();
        const now = Date.now();
        if (a.lastSoundAt && now - a.lastSoundAt < MEETING_AUDIO_FRESH_MS) {
          return { status: 'pass', detail: 'Heard the other side at ' + clock(a.lastSoundAt) + '.' };
        }
        if (!a.capturing) return { status: 'skip', detail: 'Start Listening with a call or a video playing, then test again.' };
        if (a.lastChunkAt && now - a.lastChunkAt < 5000) {
          return { status: 'fail', detail: 'Meeting audio is connected but silent. Play a sound in the call app; if it stays silent, check Screen & System Audio Recording.' };
        }
        return { status: 'fail', detail: 'Listening is on but no meeting audio is arriving. Meeting audio needs macOS 14.4 or later and the Screen & System Audio Recording permission.' };
      }
    },
    {
      name: 'Practice voice (ElevenLabs)',
      run: async () => {
        const key = d.elevenLabsKey();
        if (!key) return { status: 'skip', detail: 'No key in Settings > Keys. Practice uses the Mac voice instead.' };
        await d.synthesize({ apiKey: key, voice: d.practiceVoice(), text: 'Ready.' });
        return { status: 'pass', detail: 'Voice works.' };
      }
    }
  ];
}

// Runs the checks one after another, reporting each result as it lands.
// A thrown error is a fail with its message; nothing stops the rest.
async function runSetupChecks(deps, onResult) {
  const results = [];
  for (const check of buildChecks(deps)) {
    let result;
    try {
      result = await check.run();
    } catch (e) {
      result = { status: 'fail', detail: e && e.message ? e.message : String(e) };
    }
    const entry = { name: check.name, ...result };
    results.push(entry);
    onResult(entry);
  }
  return results;
}

module.exports = { runSetupChecks };
