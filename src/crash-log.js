// A local crash log, so a failure mid-interview can be read afterwards:
// ~/Library/Application Support/cue/cue-crash.log, private (0600), one line per
// event, rotated to cue-crash.log.1 past a size cap. It holds error names,
// messages and stack frames only: never transcripts, answers or keys.
const fs = require('fs');

const MAX_BYTES = 1024 * 1024;
const MAX_ENTRY_CHARS = 4000;

// Key-shaped strings (provider keys, bearer tokens, long secrets) are masked
// before anything reaches the disk.
const SECRET_PATTERNS = [
  /\bsk-[A-Za-z0-9_-]{8,}/g,
  /\b(?:Bearer|Token)\s+[A-Za-z0-9._~+/=-]{8,}/gi,
  /\b[A-Za-z0-9_-]{32,}\b/g
];

function redact(text, extraSecrets = []) {
  let out = String(text == null ? '' : text);
  for (const secret of extraSecrets) {
    if (typeof secret === 'string' && secret.length >= 8) out = out.split(secret).join('[hidden]');
  }
  for (const pattern of SECRET_PATTERNS) out = out.replace(pattern, '[hidden]');
  return out;
}

function describe(error) {
  if (error instanceof Error) return (error.stack || `${error.name}: ${error.message}`);
  if (error && typeof error === 'object') {
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return String(error);
}

function createCrashLog({ file, maxBytes = MAX_BYTES, secrets = () => [], now = () => new Date() }) {
  function rotateIfFull() {
    try {
      if (fs.statSync(file).size < maxBytes) return;
      fs.renameSync(file, file + '.1');
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }

  // Never throws: a crash logger that crashes would hide the first failure.
  function write(kind, error, context) {
    try {
      rotateIfFull();
      const body = redact(describe(error) + (context ? ' | ' + describe(context) : ''), secrets()).slice(0, MAX_ENTRY_CHARS);
      const line = `${now().toISOString()} [${kind}] ${body.replace(/\r?\n/g, ' \\n ')}\n`;
      fs.appendFileSync(file, line, { mode: 0o600 });
      fs.chmodSync(file, 0o600);
    } catch { /* the log is best effort */ }
  }

  return { write, file };
}

module.exports = { createCrashLog, redact, MAX_BYTES };
