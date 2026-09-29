// LLM factory — OpenAI, Anthropic, Gemini, and OpenAI-compatible APIs behind one streaming interface.
// stream({ system, turns:[{role,text}], imageDataUrl | imageDataUrls, maxTokens, onToken }) -> Promise<fullText>

const { createCompatibleClientOptions } = require('./openai-compatible');
const publik = require('./publik');

const CUSTOM_PROVIDER = 'custom';
const PUBLIK_PROVIDER = publik.PUBLIK_PROVIDER;
// gemini-2.0-flash was Google's default here until it was deprecated (Feb 2026)
// and fully retired (Mar 3 2026) — every request against it now 404s with a
// generic "exception parsing response" body. gemini-2.5-flash is the model
// Google's own SDK examples standardize on and is documented as free-tier
// available, so it is the single default used everywhere in this file.
const CURRENT_GEMINI_DEFAULT = 'gemini-2.5-flash';
// claude-3-5-haiku-latest / claude-3-5-sonnet-latest were retired by Anthropic
// (confirmed absent from GET https://api.anthropic.com/v1/models as of Sep 19
// 2026 — every claude-2.x and claude-3.x id 404s with not_found_error).
// Fast and Smart are both claude-sonnet-5-5: Haiku answered faster but not well
// enough for a live interview. Live-verified on 2026-09-29 (GET /v1/models and
// real streams): first word 1.3 to 1.8s against Haiku 4.5's 0.9s.
const CURRENT_ANTHROPIC_DEFAULT_FAST = 'claude-sonnet-5-5';
const CURRENT_ANTHROPIC_DEFAULT_SMART = 'claude-sonnet-5-5';
// Coding solves (⌘H) run on the strongest model: a wrong answer there fails the
// interview outright, so they trade cost and a few seconds for correctness.
// Live-verified against GET /v1/models and a real solve on 2026-09-23.
const CURRENT_ANTHROPIC_DEFAULT_CODING = 'claude-opus-5-5';
const DEFAULT_MODELS = {
  openai: 'gpt-4o-mini',
  anthropic: CURRENT_ANTHROPIC_DEFAULT_FAST,
  gemini: CURRENT_GEMINI_DEFAULT,
  ollama: 'llama3.2',
  groq: 'llama-3.1-8b-instant',
  minimax: 'MiniMax-M2.7',
  azure: 'gpt-4o-mini',
  publik: publik.DEFAULT_MODELS.fast
};

// Gemini model ids that Google has since deprecated/retired. A settings file
// saved before this fix can still have one of these persisted on disk, so
// createLLM migrates them at read time rather than only fixing the default —
// otherwise an existing user would keep re-hitting the same 404 forever.
const DEAD_GEMINI_MODEL_RE = /^gemini-(1\.0|1\.5|2\.0)(?:-|$)/i;

// Same self-heal, for Anthropic: matches every retired claude-2.x/claude-3.x
// id (including the "-latest" aliases), so a settings file saved back when
// claude-3-5-haiku-latest/claude-3-5-sonnet-latest were the shipped defaults
// (store.js's DEFAULTS.models.anthropic, before this fix) gets migrated to a
// live model on next read instead of permanently re-hitting the same 404.
const DEAD_ANTHROPIC_MODEL_RE = /^claude-(2(?:\.\d+)?(?:-|$)|3-)/i;

const PROVIDER_LABELS = { azure: 'Azure AI Foundry', openai: 'OpenAI', minimax: 'MiniMax', publik: publik.PROVIDER_LABEL };

function normalizeProviderName(provider) {
  if (!provider) return 'provider';
  if (PROVIDER_LABELS[provider]) return PROVIDER_LABELS[provider];
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

// A 429 on its own says only "slow down" — it never says the account is out of
// credit. So quota exhaustion is recognised ONLY from an upstream body that
// actually claims it (OpenAI `insufficient_quota`, Gemini `RESOURCE_EXHAUSTED`,
// or plain "exceeded your current quota"/quota/billing wording); every other
// 429 is reported as the rate limit it is. Anthropic's API has no quota concept
// at all — every Anthropic 429 is a per-minute rate_limit_error whose envelope
// is {type:'error', error:{type:'rate_limit_error', message}} (SDKs expose the
// whole envelope as error.error, so the real type sits at error.error.error.type)
// — so under the old `status === 429` rule an Anthropic user could never avoid
// the false "free-tier quota exhausted" message.
function errorSignals(error) {
  const status = error && (error.status || error.statusCode || error.response?.status);
  const code = error && (error.code || error.error?.code);
  const upstreamType = error && (error.error?.error?.type || error.error?.type);
  const rawMessage = (error && (error.message || String(error))) || '';
  return { status, code, upstreamType, text: `${rawMessage} ${code || ''} ${upstreamType || ''}`.toLowerCase() };
}

// The two upstream codes that mean "this is a burst/per-minute limit", never
// "your account is empty".
function hasRateLimitSignal({ code, upstreamType }) {
  return code === 'rate_limit_exceeded' || upstreamType === 'rate_limit_error';
}

// Pulled out so both the LLM and STT error paths (llm.js and stt.js) agree on
// what counts as a quota failure instead of drifting independently.
function isQuotaError(error) {
  const signals = errorSignals(error);
  const { code, upstreamType, text } = signals;
  if (code === 'insufficient_quota' || code === 'RESOURCE_EXHAUSTED' ||
      upstreamType === 'insufficient_quota' || upstreamType === 'RESOURCE_EXHAUSTED') return true;
  if (hasRateLimitSignal(signals)) return false;
  return /insufficient_quota|resource_exhausted|exceeded your current quota|\bquota\b|\bbilling\b/i.test(text);
}

// Everything else that 429s (including a bare 429 with no body at all, which is
// what most providers send under load) is a rate limit, not exhaustion.
function isRateLimitError(error) {
  if (isQuotaError(error)) return false;
  const signals = errorSignals(error);
  const { status, code, text } = signals;
  return status === 429 || code === 429 || hasRateLimitSignal(signals) ||
    /\b429\b|too many requests|rate limit/i.test(text);
}

function isNotFoundError(error) {
  const status = error && (error.status || error.statusCode || error.response?.status);
  const code = error && (error.code || error.error?.code);
  const rawMessage = (error && (error.message || String(error))) || '';
  const text = `${rawMessage} ${status || ''} ${code || ''}`.toLowerCase();
  return status === 404 || code === 404 || /\b404\b|is not found for api version|model not found/i.test(text);
}

// Gemini 429 bodies often carry a google.rpc.RetryInfo detail like
// {"retryDelay":"38s"} inside the JSON error text. Not every quota error has
// one (OpenAI/Anthropic don't), so this is best-effort and returns null when
// absent instead of guessing a wait time.
function extractRetryDelaySeconds(rawMessage) {
  const match = /retryDelay"?\s*:\s*"?(\d+(?:\.\d+)?)\s*s/i.exec(String(rawMessage || ''));
  if (!match) return null;
  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function formatRetryWait(seconds) {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes} minute${minutes === 1 ? '' : 's'}`;
}

// Structured errors for publik so main.js can offer a button, not just a sentence.
function publikError(message, action) {
  const e = new Error(message);
  e.action = action || null;
  return e;
}

function isConnectionError(error) {
  const name = error && error.name;
  const text = (error && (error.message || String(error))) || '';
  return name === 'APIConnectionError' || name === 'APIConnectionTimeoutError' ||
    /fetch failed|ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|network|connection error|aborted/i.test(text);
}

// publik gateway failures, mapped BEFORE isQuotaError: its regex matches
// "billing"/"quota" in message text and the generic 429 copy tells the user to
// "add billing to your publik API account", which is wrong for publik. Reads
// the openai SDK's APIError shape (status, error = the envelope's inner
// object, headers) and falls through (null) for anything not publik-specific.
function describePublikError(error, model) {
  const status = error && (error.status || error.statusCode || error.response?.status);
  const body = error && (error.error || error.response?.data?.error || null);
  const headers = error && error.headers;
  const retryAfter = headers ? (typeof headers.get === 'function' ? headers.get('retry-after') : (headers['retry-after'] || headers['Retry-After'])) : null;
  if (!status && !isConnectionError(error)) return null;
  const described = publik.describeGatewayError({ status, body, model, retryAfter });
  return described ? publikError(described.message, described.action) : null;
}

function formatProviderErrorMessage(error, provider, model) {
  const label = normalizeProviderName(provider);
  const rawMessage = (error && (error.message || String(error))) || '';

  if (provider === PUBLIK_PROVIDER) {
    const described = describePublikError(error, model);
    if (described) return described;
  }

  if (isQuotaError(error)) {
    const retrySeconds = extractRetryDelaySeconds(rawMessage);
    const waitHint = retrySeconds ? ` Wait about ${formatRetryWait(retrySeconds)}` : ' Wait a moment';
    return `${label} free-tier quota exhausted (429 Too Many Requests).${waitHint} and try again, or add billing to your ${label} account. You can also switch providers or models in Settings.`;
  }

  if (isRateLimitError(error)) {
    const retrySeconds = extractRetryDelaySeconds(rawMessage);
    const waitHint = retrySeconds ? ` Wait about ${formatRetryWait(retrySeconds)}` : ' Wait a moment';
    return `${label} is rate-limiting requests right now (429 Too Many Requests).${waitHint} and try again — this is a temporary per-minute/request limit, not your account running out of credit.`;
  }

  if (isNotFoundError(error)) {
    const modelHint = model ? ` "${model}"` : '';
    return `${label} model${modelHint} is unavailable (404) — it may have been renamed, retired by the provider, or misspelled. Open Settings and pick a current model for ${label} (or clear the field to use cue's default), then try again.`;
  }

  return rawMessage || 'Unknown LLM error.';
}

function sanitizeTurns(turns) {
  const valid = new Set(['user', 'assistant']);
  return (turns || []).filter(t => valid.has(t.role)).map(t => ({ role: t.role, text: String(t.text || '') }));
}

// MiniMax is OpenAI-compatible and exposes two regional gateways. MiniMax-M3
// accepts image input, so it reuses the OpenAI screenshot path via baseURL.
const MINIMAX_BASE_URLS = {
  global_en: 'https://api.minimax.io/v1',
  cn_zh: 'https://api.minimaxi.com/v1'
};

function stripDataUrl(dataUrl) {
  const m = /^data:(.+?);base64,(.*)$/s.exec(dataUrl || '');
  return m ? { mime: m[1], b64: m[2] } : null;
}

// The screenshots for the last user turn, in order: imageDataUrls (the pages
// of a coding question read while scrolling and switching tabs)
// or the single imageDataUrl. An entry is a data URL, or { url, label } when
// the caller names it ("View 2 of 3, page 1 of 2"). Each result is
// { url, mime, b64, label }; label names the page when there is more than one.
function turnImages(imageDataUrl, imageDataUrls) {
  const entries = (Array.isArray(imageDataUrls) && imageDataUrls.length ? imageDataUrls : [imageDataUrl]).filter(Boolean);
  return entries.map((entry, i) => {
    const url = typeof entry === 'string' ? entry : entry.url;
    const img = stripDataUrl(url);
    const named = typeof entry === 'object' && entry.label;
    const label = named ? entry.label + ':' : entries.length > 1 ? `Page ${i + 1} of ${entries.length}:` : '';
    return img && { url, ...img, label };
  }).filter(Boolean);
}

// Most images a provider takes in one request; the newest are kept (the
// screen on screen now is last). Documented limits, checked 2026-09-25:
// Groq "a maximum of 3 images" (console.groq.com/docs/vision), Azure OpenAI
// 50 (learn.microsoft.com Foundry quotas). Anthropic takes 100 (600 on larger
// context models) and cue sends at most 48, each under the 2000px many-image limit.
const MAX_IMAGES = { groq: 3, azure: 50 };

function capImages(provider, imageDataUrls) {
  const max = MAX_IMAGES[provider];
  return Array.isArray(imageDataUrls) && max && imageDataUrls.length > max ? imageDataUrls.slice(-max) : imageDataUrls;
}

// OpenAI-style content parts: the text, then each image after its page label.
function openAIContent(text, images) {
  const parts = [{ type: 'text', text }];
  for (const img of images) {
    if (img.label) parts.push({ type: 'text', text: img.label });
    parts.push({ type: 'image_url', image_url: { url: img.url } });
  }
  return parts;
}

async function streamOpenAI({ apiKey, baseURL, model, system, turns, imageDataUrl, imageDataUrls, maxTokens, onToken, onResponse }) {
  const OpenAI = require('openai');
  const client = new OpenAI(baseURL ? { apiKey, baseURL } : { apiKey });
  const images = turnImages(imageDataUrl, imageDataUrls);
  const messages = [{ role: 'system', content: system }];
  turns.forEach((t, i) => {
    const last = i === turns.length - 1;
    if (last && images.length && t.role === 'user') {
      messages.push({ role: 'user', content: openAIContent(t.text, images) });
    } else {
      messages.push({ role: t.role, content: t.text });
    }
  });
  const pending = client.chat.completions.create({ model, messages, stream: true, max_tokens: maxTokens });
  let stream;
  if (typeof onResponse === 'function' && pending && typeof pending.withResponse === 'function') {
    // The gateway stamps x-publik-* headers at admission; hand the raw
    // Response to the caller so the balance line can move before settlement.
    const { data, response } = await pending.withResponse();
    try { onResponse(response); } catch { /* a display hook must never break the answer */ }
    stream = data;
  } else {
    stream = await pending;
  }
  let full = '';
  for await (const part of stream) {
    const d = part.choices && part.choices[0] && part.choices[0].delta && part.choices[0].delta.content;
    if (d) { full += d; onToken(d); }
  }
  return full;
}

// Azure AI Foundry Models API (cognitiveservices.azure.com hosts) lives under
// {endpoint}/openai/v1 and authenticates with the `api-key` header.
function normalizeAzureBaseURL(raw) {
  let u = String(raw || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
  if (!u) return '';
  if (/cognitiveservices\.azure\.com/i.test(u) && !/\/openai\/v1$/i.test(u)) {
    u += '/openai/v1';
  }
  return u;
}

async function streamAzure({ apiKey, model, system, turns, imageDataUrl, imageDataUrls, maxTokens, onToken, endpoint }) {
  const url = normalizeAzureBaseURL(endpoint);
  if (!url) throw new Error('Missing Azure endpoint. Add your Azure AI Foundry or Azure OpenAI endpoint in Settings.');
  const images = turnImages(imageDataUrl, imageDataUrls);
  const messages = [{ role: 'system', content: system }];
  turns.forEach((t, i) => {
    const last = i === turns.length - 1;
    if (last && images.length && t.role === 'user') {
      messages.push({ role: 'user', content: openAIContent(t.text, images) });
    } else {
      messages.push({ role: t.role, content: t.text });
    }
  });
  const OpenAI = require('openai');
  let client;
  if (/openai\.azure\.com/i.test(url)) {
    client = new OpenAI.AzureOpenAI({ endpoint: url.replace(/\/openai$/i, ''), apiKey, apiVersion: '2024-10-21' });
  } else {
    // Foundry / OpenAI-compatible base: force the `api-key` header and drop the
    // Authorization header the SDK adds by default (those hosts don't take a Bearer key).
    const azureFetch = async (input, init) => {
      const headers = new Headers(init && init.headers);
      headers.set('api-key', apiKey);
      headers.delete('authorization');
      return fetch(input, { ...init, headers });
    };
    client = new OpenAI({ baseURL: url, apiKey, fetch: azureFetch });
  }
  const stream = await client.chat.completions.create({ model, messages, stream: true, max_completion_tokens: maxTokens });
  let full = '';
  for await (const part of stream) {
    const d = part.choices && part.choices[0] && part.choices[0].delta && part.choices[0].delta.content;
    if (d) { full += d; onToken(d); }
  }
  return full;
}

// Coding speed (Settings > Answer style). Opus 5.5 always thinks before its
// first word, and that thinking is hidden, so a solve looked frozen for about
// 35s. Lower effort means less thinking; fast mode runs the same model up to
// 2.5x faster (Claude API only, twice the price).
const CODING_SPEEDS = {
  fastest: { effort: 'low', fast: true },
  balanced: { effort: 'medium', fast: true },
  careful: { effort: 'high', fast: false }
};
// Models that take output_config.effort, and the ones with fast mode.
const EFFORT_MODEL = /^claude-(opus-4-[5-9]|opus-5|sonnet-4-6|sonnet-5|fable-5|mythos-5)/;
const FAST_MODE_MODEL = /^claude-(opus-4-8|opus-5)/;
// Models that take thinking {type: 'adaptive'} (4.6 and later), which the summary needs.
const ADAPTIVE_THINKING_MODEL = /^claude-(opus-4-[6-9]|opus-5|sonnet-4-6|sonnet-5|fable-5|mythos-5)/;

// Fast mode is a research preview with its own rate limit. Once a key is
// refused, skip fast mode for that key instead of paying a wasted round trip on
// every solve: a 403, or a 429 saying the limit is 0 (no access), until
// restart; any other 429 (a rate limit, which can clear) for ten minutes. Keyed by hash, so no extra copy of a key sits in
// memory, and a new key in Settings gets its own chance.
const FAST_MODE_RATE_LIMIT_PAUSE_MS = 10 * 60 * 1000;
const fastModePausedUntil = new Map();
const keyId = (apiKey) => require('crypto').createHash('sha256').update(String(apiKey || '')).digest('hex');

// The extra request fields for a coding solve on this model, or null.
// summarize: stream a short summary of the thinking (the same models take it),
// so the wait shows progress and the watchdog sees a live stream instead of
// minutes of silence before the first word.
function codingSpeedOptions(model, speed, apiKey) {
  const choice = CODING_SPEEDS[speed] || CODING_SPEEDS.fastest;
  const m = String(model || '');
  const out = {};
  if (EFFORT_MODEL.test(m)) out.effort = choice.effort;
  if (ADAPTIVE_THINKING_MODEL.test(m)) out.summarize = true;
  if (choice.fast && FAST_MODE_MODEL.test(m) && !(Date.now() < (fastModePausedUntil.get(keyId(apiKey)) || 0))) out.fast = true;
  return Object.keys(out).length ? out : null;
}

// Spoken and screen answers (every tier but coding): Sonnet 5.5 thinks before
// its first word by default. Measured 2026-09-30 on a walkthrough answer with a
// screenshot: 5.2 to 5.9 s to the first word by default, 1.4 to 2.0 s with
// effort low, same quality for a few spoken sentences. Refused (an older model
// or a proxy), the plain request follows as the next stage.
function answerSpeedOptions(model) {
  return EFFORT_MODEL.test(String(model || '')) ? { effort: 'low' } : null;
}

async function streamAnthropic({ apiKey, model, system, turns, imageDataUrl, imageDataUrls, maxTokens, onToken, onActivity, onThinking, speedOptions, stageLabel = 'coding' }) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });
  const images = turnImages(imageDataUrl, imageDataUrls);
  const messages = turns.map((t, i) => {
    const last = i === turns.length - 1;
    if (last && images.length && t.role === 'user') {
      // Images first, each after its page label, then the request.
      const content = [];
      for (const img of images) {
        if (img.label) content.push({ type: 'text', text: img.label });
        content.push({ type: 'image', source: { type: 'base64', media_type: img.mime, data: img.b64 } });
      }
      content.push({ type: 'text', text: t.text });
      return { role: 'user', content };
    }
    return { role: t.role, content: t.text };
  });
  const body = { model, max_tokens: maxTokens, system, messages, stream: true };
  const startedAt = Date.now();
  let emitted = false;
  // A stage with a fallback after it gets no SDK retries: a 429 on fast mode
  // would otherwise wait out retry-after (up to a minute) inside the SDK and
  // eat most of main.js's first-word silence window before the next stage could run.
  const run = async (extra, hasFallback) => {
    const request = { ...body };
    const headers = {};
    if (extra && extra.effort) request.output_config = { effort: extra.effort };
    if (extra && extra.fast) { request.speed = 'fast'; headers['anthropic-beta'] = 'fast-mode-2026-02-01'; }
    if (extra && extra.summarize) request.thinking = { type: 'adaptive', display: 'summarized' };
    const stream = await client.messages.create(request, hasFallback ? { headers, maxRetries: 0 } : { headers });
    let full = '';
    for await (const ev of stream) {
      // Any event proves the stream is alive, thinking included.
      if (onActivity) onActivity();
      const d = ev.type === 'content_block_delta' && ev.delta;
      if (d && d.type === 'text_delta') { emitted = true; full += d.text; onToken(d.text); }
      else if (d && d.type === 'thinking_delta' && d.thinking && onThinking) onThinking(d.thinking);
    }
    return full;
  };
  // Try the fastest options first, then effort alone (fast mode can be off for
  // the account or have hit its own rate limit), then the plain request. Any
  // failure before the first word moves to the next stage, which stands in for
  // the SDK retries those stages skip (an overload 529 or a network blip too).
  // After a word arrived, or on the last stage, the error is real.
  const stages = [];
  if (speedOptions) {
    stages.push(speedOptions);
    if (speedOptions.fast && speedOptions.effort) stages.push({ effort: speedOptions.effort, summarize: speedOptions.summarize });
  }
  stages.push(null);
  for (let i = 0; ; i++) {
    try {
      return await run(stages[i], i < stages.length - 1);
    } catch (error) {
      if (emitted || i === stages.length - 1) throw error;
      const stage = stages[i];
      const fastRefused = !!(stage && stage.fast && error && (error.status === 429 || error.status === 403));
      // A 429 that says the limit is 0 means the account has no fast mode at all, like a 403.
      const noFastMode = fastRefused && (error.status === 403 || /limit of 0 fast mode/i.test(String(error.message || '')));
      if (fastRefused) fastModePausedUntil.set(keyId(apiKey), noFastMode ? Infinity : Date.now() + FAST_MODE_RATE_LIMIT_PAUSE_MS);
      const reason = (error && (error.status || error.code)) || 'no status';
      const message = hideKey(error && error.message ? error.message : String(error), apiKey).slice(0, 200);
      const next = stages[i + 1];
      console.log(`[timing] ${stageLabel} stage ${i + 1} failed after ${Date.now() - startedAt}ms (${reason}: ${message}); retrying ${next ? 'without fast mode' : 'with no speed options'}${fastRefused ? (noFastMode ? ', fast mode not on this account, off until restart' : ', fast mode paused for 10 minutes') : ''}`);
    }
  }
}

async function streamGemini({ apiKey, model, system, turns, imageDataUrl, imageDataUrls, maxTokens, onToken }) {
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const images = turnImages(imageDataUrl, imageDataUrls);
  const contents = turns.map((t, i) => {
    const last = i === turns.length - 1;
    const parts = [{ text: t.text }];
    if (last && t.role === 'user') {
      for (const img of images) {
        if (img.label) parts.push({ text: img.label });
        parts.push({ inlineData: { mimeType: img.mime, data: img.b64 } });
      }
    }
    return { role: t.role === 'assistant' ? 'model' : 'user', parts };
  });
  const stream = await ai.models.generateContentStream({
    model, contents, config: { systemInstruction: system, maxOutputTokens: maxTokens }
  });
  let full = '';
  for await (const chunk of stream) {
    const t = chunk && chunk.text;
    if (t) { full += t; onToken(t); }
  }
  return full;
}

async function streamOllama({ apiKey, model, system, turns, imageDataUrl, imageDataUrls, maxTokens, onToken }) {
  const baseUrl = apiKey || 'http://localhost:11434';
  const url = `${baseUrl.replace(/\/$/, '')}/api/chat`;

  const images = turnImages(imageDataUrl, imageDataUrls);
  const messages = [{ role: 'system', content: system }];
  turns.forEach((t, i) => {
    const last = i === turns.length - 1;
    if (last && images.length && t.role === 'user') {
      // Ollama has no per-image labels; the images go in scroll order.
      messages.push({ role: 'user', content: t.text, images: images.map((img) => img.b64) });
    } else {
      messages.push({ role: t.role, content: t.text });
    }
  });

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: true })
    });
  } catch (err) {
    throw new Error(`Ollama fetch failed: ${err.message}. Is Ollama running at ${baseUrl}?`);
  }

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep incomplete line
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message && data.message.content) {
          full += data.message.content;
          onToken(data.message.content);
        }
      } catch (e) {
        // ignore
      }
    }
  }
  if (buffer.trim()) {
    try {
      const data = JSON.parse(buffer);
      if (data.message && data.message.content) {
        full += data.message.content;
        onToken(data.message.content);
      }
    } catch (e) { }
  }
  return full;
}

// Answer budgets per tier. A coding answer holds whole files and build steps.
const MAX_TOKENS = { fast: 700, smart: 1400, coding: 8192 };

// tier: 'coding' for coding solves, 'fast' to force the Fast model (buying time must
// be instant); otherwise the Smart toggle picks fast/smart.
// A provider with no coding model set uses the user's smart model, then their fast
// model, so a setup that works for spoken answers also works for coding.
// Some SDKs put the request URL, key and all, in their error text; error
// messages are shown in the app, so the key never goes with them.
function hideKey(message, apiKey) {
  const text = String(message || '');
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) return text;
  return text.split(apiKey).join('[key hidden]');
}

function createLLM(settings, { tier: requestedTier } = {}) {
  const provider = settings.provider;
  const keys = settings.apiKeys || {};
  let apiKey = keys[provider];
  let baseURL = '';
  let configurationError = '';
  const tier = requestedTier === 'coding' || requestedTier === 'fast' ? requestedTier : (settings.smart ? 'smart' : 'fast');
  const models = settings.models || {};
  const providerModels = models[provider] || {};
  let model = tier === 'coding'
    ? (providerModels.coding || providerModels.smart || providerModels.fast)
    : providerModels[tier];
  if (provider === 'gemini' && DEAD_GEMINI_MODEL_RE.test(model || '')) {
    model = CURRENT_GEMINI_DEFAULT;
  }
  if (provider === PUBLIK_PROVIDER && !model) model = publik.DEFAULT_MODELS[tier === 'coding' ? 'smart' : tier];
  if (provider === 'anthropic' && DEAD_ANTHROPIC_MODEL_RE.test(model || '')) {
    model = { fast: CURRENT_ANTHROPIC_DEFAULT_FAST, smart: CURRENT_ANTHROPIC_DEFAULT_SMART, coding: CURRENT_ANTHROPIC_DEFAULT_CODING }[tier];
  }
  if (!model) model = DEFAULT_MODELS[provider] || '';
  const minimaxRegion = settings.minimaxRegion || 'global_en';
  const endpoint = settings.azureEndpoint || '';

  if (provider === PUBLIK_PROVIDER) {
    // The packaged-build default: an OpenAI-compatible endpoint with a fixed
    // base URL (the provisioning response's, else the build's) and the key the
    // install minted. Never settings.baseUrl — that is the user's Custom slot.
    const base = (settings.publik && settings.publik.baseUrl) || publik.DEFAULT_BASE_URL;
    try {
      baseURL = createCompatibleClientOptions(apiKey, base).baseURL;
    } catch (error) {
      configurationError = error.message;
    }
    if (!apiKey) configurationError = `${publik.PROVIDER_LABEL} is not set up on this computer yet.`;
  } else if (provider === CUSTOM_PROVIDER) {
    try {
      const clientOptions = createCompatibleClientOptions(apiKey, settings.baseUrl);
      apiKey = clientOptions.apiKey;
      baseURL = clientOptions.baseURL;
    } catch (error) {
      configurationError = error.message;
    }
    if (!model && !configurationError) {
      configurationError = 'Set a Fast or Smart model for the Custom provider.';
    }
  } else if (provider !== 'ollama' && !apiKey) {
    // Ollama is a local server: the field holds a URL, and no key is required.
    configurationError = `Add your ${provider} API key in Settings.`;
  }

  // Azure needs a second credential: the resource endpoint.
  if (!configurationError && provider === 'azure' && !endpoint) {
    configurationError = 'Add your Azure AI Foundry endpoint in Settings.';
  }

  const ready = !configurationError && !!model;
  const maxTokens = MAX_TOKENS[tier];
  let speedOptions = null;
  if (provider === 'anthropic') speedOptions = tier === 'coding' ? codingSpeedOptions(model, settings.codingSpeed, apiKey) : answerSpeedOptions(model);
  // Names the request in the timing log when a speed stage is refused.
  const stageLabel = tier === 'coding' ? 'coding' : 'answer';

  return {
    provider, model, apiKey, baseURL,
    ready,
    configurationError,
    async stream(params) {
      if (!ready) throw new Error(configurationError || `Complete the ${provider} provider settings.`);
      const args = { apiKey, baseURL, endpoint, model, maxTokens, speedOptions, stageLabel, ...params, imageDataUrls: capImages(provider, params.imageDataUrls), turns: sanitizeTurns(params.turns) };
      try {
        if (provider === 'openai') return await streamOpenAI(args);
        if (provider === CUSTOM_PROVIDER) return await streamOpenAI(args);
        if (provider === PUBLIK_PROVIDER) return await streamOpenAI(args);
        if (provider === 'ollama') return await streamOllama(args);
        if (provider === 'groq') return await streamOpenAI({ ...args, baseURL: 'https://api.groq.com/openai/v1' });
        if (provider === 'minimax') return await streamOpenAI({ ...args, baseURL: MINIMAX_BASE_URLS[minimaxRegion] || MINIMAX_BASE_URLS.global_en });
        if (provider === 'anthropic') return await streamAnthropic(args);
        if (provider === 'gemini') return await streamGemini(args);
        if (provider === 'azure') return await streamAzure(args);
        throw new Error('unknown provider: ' + provider);
      } catch (error) {
        // publik branches return an Error carrying `.action`; the string
        // branches keep working unchanged.
        const wrapped = formatProviderErrorMessage(error, provider, model);
        const out = wrapped instanceof Error ? wrapped : new Error(wrapped);
        out.message = hideKey(out.message, apiKey);
        throw out;
      }
    }
  };
}

// Test-only hooks, kept apart from the real API.
const _test = { resetFastMode: () => fastModePausedUntil.clear(), turnImages, openAIContent, capImages, streamGemini, streamOllama };

module.exports = {
  _test,
  createLLM,
  hideKey,
  codingSpeedOptions,
  streamAnthropic,
  formatProviderErrorMessage,
  isQuotaError,
  CURRENT_GEMINI_DEFAULT,
  CURRENT_ANTHROPIC_DEFAULT_FAST,
  CURRENT_ANTHROPIC_DEFAULT_SMART,
  CURRENT_ANTHROPIC_DEFAULT_CODING,
  PUBLIK_PROVIDER,
  isRateLimitError,
  answerSpeedOptions
};
