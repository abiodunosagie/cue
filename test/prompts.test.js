const test = require('node:test');
const assert = require('node:assert/strict');
const { MODES } = require('../src/prompts');

test('assist mode gives a direct answer in first person', () => {
  const system = MODES.assist.buildSystem(null);
  const text = system + '\n' + MODES.assist.build({ transcript: [], userText: '' });
  // System prompt must instruct to answer in first person with no preamble
  assert.match(text, /first person/i);
  assert.match(text, /no preamble|preamble/i);
});

test('say mode produces a spoken answer not a question', () => {
  const system = MODES.say.buildSystem(null);
  const text = system + '\n' + MODES.say.build({ transcript: [], userText: '' });
  assert.match(text, /say out loud|in first person/i);
  // Must instruct to write actual spoken words (not meta-instructions)
  assert.match(text, /actual words|Write the|2.5 sentences/i);
});

test('leetcode mode ignores context block and returns coding prompt', () => {
  const system = MODES.leetcode.buildSystem('IGNORED_CONTEXT');
  assert.match(system, /coding interview/i);
  assert.ok(!system.includes('IGNORED_CONTEXT'), 'leetcode should not include context block');
});

test('followup mode returns a bullet list', () => {
  const system = MODES.followup.buildSystem(null);
  assert.match(system, /bullet list|bullets/i);
});

test('all modes have a build function', () => {
  for (const [name, mode] of Object.entries(MODES)) {
    assert.equal(typeof mode.build, 'function', `${name}.build must be a function`);
    assert.equal(typeof mode.buildSystem, 'function', `${name}.buildSystem must be a function`);
  }
});

// ── AI rules ────────────────────────────────────────────────────────────────
const RULES = 'Never use em-dashes.\nReply in 2-3 short bullet points.\nUse a casual tone.';

test('every non-leetcode mode injects AI rules into its system prompt', () => {
  for (const [name, mode] of Object.entries(MODES)) {
    if (name === 'leetcode') continue;
    const withRules = mode.buildSystem(null, RULES);
    assert.match(withRules, /--- USER RULES ---/, `${name}.buildSystem should append USER RULES block`);
    assert.ok(withRules.includes(RULES), `${name}.buildSystem should include the user's rules verbatim`);
  }
});

test('every non-leetcode mode returns the base prompt unchanged when no rules are set', () => {
  for (const [name, mode] of Object.entries(MODES)) {
    if (name === 'leetcode') continue;
    const without = mode.buildSystem(null, '');
    const blank = mode.buildSystem(null, null);
    assert.ok(!without.includes('USER RULES'), `${name} should not include USER RULES when aiRules is empty`);
    assert.ok(!blank.includes('USER RULES'), `${name} should not include USER RULES when aiRules is null`);
  }
});

test('leetcode mode never applies AI rules (coding answers stay strict)', () => {
  const withRules = MODES.leetcode.buildSystem(null, RULES);
  assert.ok(!withRules.includes('USER RULES'), 'leetcode must not include USER RULES');
  assert.ok(!withRules.includes(RULES), 'leetcode must not leak user rules into the prompt');
  assert.match(withRules, /coding interview/);
});
test('modes that write spoken answers carry the intro, style and no-invented-stories rules', () => {
  const { MODES } = require('../src/prompts');
  for (const mode of ['assist', 'say', 'answerThis']) {
    const system = MODES[mode].buildSystem('', '');
    assert.match(system, /INTRO \("tell me about yourself"/, mode);
    assert.match(system, /calm, senior professional/, mode);
    assert.match(system, /without inventing specific failures/, mode);
  }
  assert.doesNotMatch(MODES.leetcode.buildSystem('', ''), /INTRO \(/);
});

test('answerThis sees the recent conversation so follow-ups make sense', () => {
  const { MODES } = require('../src/prompts');
  const prompt = MODES.answerThis.build({
    transcript: [{ channel: 'them', text: 'Tell me about the Numd library.' }, { channel: 'them', text: 'What was hardest about that?' }],
    userText: 'What was hardest about that?'
  });
  assert.match(prompt, /Numd library/);
  assert.match(prompt, /"What was hardest about that\?"/);
  assert.equal(prompt.match(/What was hardest about that\?/g).length, 1, 'question appears once');
});

test('coding answers ask for complete fenced code, never inline code', () => {
  const leet = MODES.leetcode.buildSystem(null);
  assert.match(leet, /\*\*Full code to paste:\*\*/);
  assert.match(leet, /BUILD TASK.*\*\*Step N:/s, 'build tasks come as numbered steps');
  assert.match(leet, /\*\*Say:\*\* lines are what the candidate says out loud/, 'every solve carries a spoken cue');
  assert.match(leet, /never in inline backticks/i);
  assert.match(leet, /tests are the specification/i);
  const assist = MODES.assist.buildSystem(null, '');
  assert.match(assist, /CODING TASK ON SCREEN.*fenced code block.*never in inline backticks/);
  assert.equal(MODES.leetcode.tier, 'coding');
});

test('coding solves see earlier solves from this interview, and design tasks get their own format', () => {
  const plain = MODES.leetcode.build({});
  assert.equal(plain, 'Solve the coding problem shown in the screenshot.');
  const withPrior = MODES.leetcode.build({ priorSolves: ['auth guard in routes.ts'] });
  assert.match(withPrior, /Earlier solves in this session[\s\S]*auth guard in routes\.ts[\s\S]*Solve the coding problem/);
  const system = MODES.leetcode.buildSystem(null);
  assert.match(system, /DESIGN TASK/);
  assert.match(system, /which file to open next/);
});

test('contextTurns matches exactly what each mode build() sends', () => {
  const { turnsSentByBuild } = require('../src/prompts');
  const transcript = Array.from({ length: 40 }, (_, i) => ({ channel: i % 2 ? 'you' : 'them', text: 'turn-' + i + '-end' }));
  for (const [mode, def] of Object.entries(MODES)) {
    if (!Number.isInteger(def.contextTurns)) continue;
    const ctx = { transcript, userText: 'a question not in the transcript' };
    const built = def.build(ctx);
    const sent = turnsSentByBuild(mode, ctx);
    assert.match(built, new RegExp('turn-' + (40 - sent) + '-end'), mode + ' sends its oldest counted turn');
    if (sent < 40) assert.doesNotMatch(built, new RegExp('turn-' + (40 - sent - 1) + '-end'), mode + ' sends nothing older');
  }
});

test('buy time always runs on the Fast model, skips memory, and is not stored as an answer', () => {
  const { createLLM } = require('../src/llm');
  const def = MODES.buyTime;
  assert.equal(def.tier, 'fast');
  assert.equal(def.skipMemory, true);
  assert.equal(def.notAnswer, true);
  const settings = { provider: 'anthropic', apiKeys: { anthropic: 'k' }, smart: true, models: { anthropic: { fast: 'fast-model', smart: 'smart-model' } } };
  assert.equal(createLLM(settings, { tier: def.tier }).model, 'fast-model');
  assert.equal(createLLM(settings).model, 'smart-model');
  const system = def.buildSystem('RESUME CONTEXT', '');
  assert.doesNotMatch(system, /RESUME CONTEXT/);
  assert.match(system, /clarifying question/);
  assert.match(def.build({ transcript: [{ channel: 'them', text: 'Design a rate limiter.' }] }), /Them: Design a rate limiter\./);
});

test('the interview report uses the whole interview and the suggested answers, never coding solves', () => {
  const def = MODES.report;
  assert.equal(def.skipMemory, true);
  assert.equal(def.notAnswer, true);
  const transcript = Array.from({ length: 30 }, (_, i) => ({ channel: i % 2 ? 'you' : 'them', text: 'turn ' + i }));
  const built = def.build({ transcript, answers: [{ mode: 'answerThis', text: 'Spoken answer' }, { mode: 'leetcode', text: 'code solve' }] });
  assert.match(built, /Them: turn 0\n/);
  assert.match(built, /You: turn 29/);
  assert.match(built, /- Spoken answer/);
  assert.doesNotMatch(built, /code solve/);
  const system = def.buildSystem('', '');
  assert.match(system, /Thank-you email/);
  assert.match(system, /no em dashes/);
  assert.match(system, /Never describe a specific conversation/);
});

test('an API key inside a provider error is hidden before the message is shown', () => {
  const { hideKey } = require('../src/llm');
  const key = 'sk-test-SECRET1234567890';
  assert.equal(hideKey('GET https://x/v1?key=' + key + ' failed, key ' + key, key), 'GET https://x/v1?key=[key hidden] failed, key [key hidden]');
  assert.equal(hideKey('Connection error.', key), 'Connection error.');
  assert.equal(hideKey('short key abc', 'abc'), 'short key abc');   // too short to be a real key: left alone
});

test('a small coding task is taught step by step in plain words, with a walk-through and the full code', () => {
  const system = MODES.leetcode.buildSystem('', '');
  // Only the SMALL TASK part: BUILD TASK also uses **Step N:.
  const small = system.slice(system.indexOf('SMALL TASK'), system.indexOf('DESIGN TASK'));
  const order = ['**What it asks:**', '**The idea:**', '**Step N:', '**Check it on the example:**', '**Full code to paste:**', '**Time and space:**', '**Run it:**'];
  const at = order.map((part) => small.indexOf(part));
  assert.ok(at.every((i) => i >= 0), 'every section is in the small-task format');
  assert.deepEqual([...at].sort((a, b) => a - b), at, 'the sections come in this order');
  assert.match(system, /new to this kind of problem/);
  assert.doesNotMatch(system, /two-line approach/);
});

test('a build task starts with every file to create, before the steps', () => {
  const system = MODES.leetcode.buildSystem('', '');
  assert.match(system, /BUILD TASK[^•]*\*\*Files to create:\*\* a bulleted list of every file path in build order/);
});

test('every coding answer says how to run it', () => {
  const system = MODES.leetcode.buildSystem('', '');
  const small = system.slice(system.indexOf('SMALL TASK'), system.indexOf('DESIGN TASK'));
  assert.match(small, /\*\*Run it:\*\*[^\n]*main function[^\n]*expected output as a comment[^\n]*below the full code in the same file/);
  assert.match(small, /dart run main\.dart/);
  const build = system.slice(system.indexOf('BUILD TASK'), system.indexOf('**Say:** lines are'));
  assert.match(build, /End with \*\*Run it:\*\* the exact commands in a fenced block tagged shell/);
  assert.match(small, /Full code to paste:\*\*[^\n]*no main function or print calls/);
});
