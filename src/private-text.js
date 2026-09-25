// What must never reach a prompt from the candidate's projects folder. Used by
// the README / description filter (src/projects-scan.js) and the session guide
// intro (src/project-structure.js). Prose checks: a sentence or paragraph that
// matches is dropped whole, never partly redacted.

// Pointers at the owner's machine, private notes or credentials, by word.
const PRIVATE_RE = /~\/|\/Users\/|\/home\/|session guide|session_guide|\.env\b|api[_ -]?key|secret|passw|token|credential|private key/i;
// Secret-shaped text whatever it is called: an env line (NAME=value), a JWT,
// a URL with a password in it, or a long run of key-like characters.
const SECRET_SHAPE_RE = /(^|\s)[A-Z][A-Z0-9_]{2,}=\S|eyJ[A-Za-z0-9_-]{20,}|:\/\/[^/\s:@]+:[^@\s]+@|[A-Za-z0-9+/_-]{40,}/;
// Infrastructure names that point at accounts even without a secret value:
// an env variable name (SUPABASE_SERVICE_ROLE_KEY), a keychain slug
// (supabase-evvyhairs), a 20-letter Supabase project ref, a hosting address
// (x.vercel.app), a dated status line (2026-08-12).
const INFRA_RE = /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b|\b(gh|vercel|supabase|claude|codex|resend|paystack|firebase|cloudflare)-[a-z0-9-]{2,}\b|\b[a-z]{20}\b|\b[a-z0-9-]+\.(vercel\.app|workers\.dev|netlify\.app|pages\.dev|supabase\.co|web\.app|firebaseapp\.com)\b|\b\d{4}-\d{2}-\d{2}\b/;
// People around the project: family, client contacts, the owner's own name.
const PERSONAL_RE = /\b(spouse|wife|husband|girlfriend|boyfriend|sister|brother|mother|father|owner contact|client contact|the owner|his|her)\b/i;

const isPrivate = (text) => PRIVATE_RE.test(text) || SECRET_SHAPE_RE.test(text);

module.exports = { PRIVATE_RE, SECRET_SHAPE_RE, INFRA_RE, PERSONAL_RE, isPrivate };
