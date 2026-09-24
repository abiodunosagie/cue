// Interview memory: the whole current interview (what was said and what cue
// answered), kept in one local file so it survives a restart and ends only when
// the user clears it. Never leaves the machine except as prompt text sent to the
// user's own AI provider. Text only: screenshots are never stored.

const fs = require('fs');

const MAX_TURNS = 600;            // ~90 minutes of conversation
const MAX_ANSWERS = 80;
const MAX_ANSWER_CHARS = 6000;
// A record untouched this long belongs to an earlier interview the user forgot
// to clear; carrying it into the next one would mix two conversations.
const STALE_MS = 6 * 60 * 60 * 1000;

function emptyRecord(now) {
  return { startedAt: now, updatedAt: now, turns: [], answers: [] };
}

function isRecord(r) {
  return r && typeof r === 'object' && Array.isArray(r.turns) && Array.isArray(r.answers) && Number.isFinite(r.updatedAt);
}

function createInterviewMemory({ file, now = Date.now } = {}) {
  let record = emptyRecord(now());

  function save() {
    if (!file) return;
    // 0600 like cue-data.json: this is the user's spoken words.
    try { fs.writeFileSync(file, JSON.stringify(record), { mode: 0o600 }); } catch { /* memory is best effort */ }
  }

  function load() {
    record = emptyRecord(now());
    if (!file) return record;
    let parsed = null;
    try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return record; }
    if (!isRecord(parsed) || now() - parsed.updatedAt > STALE_MS) { clear(); return record; }
    record = parsed;
    return record;
  }

  function touch() { record.updatedAt = now(); save(); }

  function addTurn(turn) {
    record.turns.push({ channel: turn.channel, text: String(turn.text || ''), ts: turn.ts || now() });
    if (record.turns.length > MAX_TURNS) record.turns.splice(0, record.turns.length - MAX_TURNS);
    touch();
  }

  function addAnswer({ mode, text }) {
    const body = String(text || '').trim();
    if (!body) return;
    record.answers.push({ mode, text: body.slice(0, MAX_ANSWER_CHARS), ts: now() });
    if (record.answers.length > MAX_ANSWERS) record.answers.splice(0, record.answers.length - MAX_ANSWERS);
    touch();
  }

  function clear() {
    record = emptyRecord(now());
    if (file) { try { fs.unlinkSync(file); } catch { /* already gone */ } }
  }

  // Every interviewer question so far, newest kept when over budget, plus cue's
  // last spoken answer so the next one does not repeat its example.
  function digest({ maxChars = 3000 } = {}) {
    const asked = record.turns.filter((t) => t.channel === 'them').map((t) => '- ' + t.text.slice(0, 240));
    const lastSpoken = [...record.answers].reverse().find((a) => a.mode !== 'leetcode');
    if (!asked.length && !lastSpoken) return '';
    const kept = [];
    let used = 0;
    for (let i = asked.length - 1; i >= 0; i--) {
      if (used + asked[i].length > maxChars) break;
      kept.unshift(asked[i]);
      used += asked[i].length + 1;
    }
    const parts = ['INTERVIEW SO FAR (this interview only; keep answers consistent with it and do not repeat an example already used):'];
    if (kept.length) parts.push('Questions asked' + (kept.length < asked.length ? ' (latest ' + kept.length + ' of ' + asked.length + ')' : '') + ':\n' + kept.join('\n'));
    if (lastSpoken) parts.push('Your previous suggested answer:\n' + lastSpoken.text.slice(0, 700));
    return parts.join('\n\n');
  }

  // The last few coding solves, so a task spread over several screens or files
  // builds on what was already worked out.
  function codingHistory({ count = 2, maxChars = 2000 } = {}) {
    return record.answers.filter((a) => a.mode === 'leetcode').slice(-count).map((a) => a.text.slice(0, maxChars));
  }

  return {
    load,
    addTurn,
    addAnswer,
    clear,
    digest,
    codingHistory,
    turns() { return record.turns.slice(); },
    summary() { return { startedAt: record.startedAt, updatedAt: record.updatedAt, turnCount: record.turns.length, answerCount: record.answers.length }; }
  };
}

module.exports = { createInterviewMemory, MAX_TURNS, STALE_MS };
