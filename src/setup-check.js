// Test my setup: one click runs every part cue needs in an interview against
// the real services and reports pass, fail (with the plain reason) or skipped,
// so a broken key or a missing permission shows up before the interview, not
// during it. Everything outside comes in as functions, so this is testable.

const CHECK_TIMEOUT_MS = 20000;
const SAMPLE_QUESTION = 'How do you keep a mobile app fast on a slow network?';

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
      name: 'Instant first line',
      run: async () => {
        const llm = d.llmFor('fast');
        if (!llm.ready) return { status: 'skip', detail: 'Needs the Fast model.' };
        const line = await d.runOpener({ llm, question: SAMPLE_QUESTION, onToken: () => {} });
        return line ? { status: 'pass', detail: '"' + line + '"' } : { status: 'fail', detail: 'No first line within 1 second. Answers still work, just without the instant start.' };
      }
    },
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
