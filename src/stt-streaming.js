// Streaming Speech-to-Text via OpenAI Realtime API (WebSocket transcription session)
// or Deepgram Nova streaming. Falls back to batch Whisper/Gemini if streaming unavailable.
//
// This module manages a persistent WebSocket connection for real-time transcription
// with sub-200ms latency, interim results, and automatic reconnection.

const { buildVocabTerms } = require('./vocab');
const { looksLikeHallucination } = require('./stt');
const { pcmToWav } = require('./wav');
const { CURRENT_GEMINI_DEFAULT } = require('./llm');

// ============================================================================
// Reconnect policy shared by both streaming providers
// ============================================================================

// A dropped socket mid-call (Wi-Fi blip, laptop lid, provider restart) must not
// end listening for the rest of the interview. Retry with growing gaps, then
// every 30 s, for up to five minutes of continuous failure. Only after that,
// or on a refused key, does the caller fall back to batch or stop.
const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 16000, 30000];
const RECONNECT_BUDGET_MS = 5 * 60 * 1000;
// About five seconds of 16 kHz 16-bit mono, replayed once the socket is back.
const PENDING_AUDIO_BYTES = 16000 * 2 * 5;

function createReconnectPolicy({ delays = RECONNECT_DELAYS_MS, budgetMs = RECONNECT_BUDGET_MS, now = Date.now } = {}) {
  let attempt = 0;
  let failingSince = null;
  return {
    // The wait before the next try, or null once the budget is spent.
    next() {
      if (failingSince === null) failingSince = now();
      if (now() - failingSince >= budgetMs) return null;
      const delay = delays[Math.min(attempt, delays.length - 1)];
      attempt++;
      return delay;
    },
    reset() { attempt = 0; failingSince = null; }
  };
}

// The HTTP status of a refused WebSocket handshake ('Unexpected server response: 401').
function handshakeStatus(err) {
  const match = /Unexpected server response: (\d{3})/.exec(String((err && err.message) || ''));
  return match ? Number(match[1]) : null;
}

// A refused key or account: retrying cannot fix it.
function isAuthRefusal(status) {
  return status === 401 || status === 402 || status === 403;
}

// Keeps the newest audio up to a byte cap while the socket is down.
function pushPending(queue, chunk, capBytes = PENDING_AUDIO_BYTES) {
  const buf = Buffer.from(chunk);
  queue.chunks.push(buf);
  queue.bytes += buf.length;
  while (queue.bytes > capBytes && queue.chunks.length > 1) queue.bytes -= queue.chunks.shift().length;
}

// ============================================================================
// OpenAI Realtime Transcription Session (WebSocket)
// Uses the dedicated transcription session type for lowest latency streaming STT
// ============================================================================

class OpenAIRealtimeSTT {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || 'gpt-realtime-whisper';
    this.ws = null;
    this.connected = false;
    this.reconnecting = false;
    this.onTranscript = options.onTranscript || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this._policy = createReconnectPolicy(options.reconnect);
    this._reconnectTimer = null;
    this._stopped = false;
    this._fatal = null;
    this._pendingAudio = [];
    this._sessionReady = false;
  }

  async connect() {
    this._stopped = false;
    return this._open();
  }

  async _open() {
    if (this._stopped || (this.ws && this.connected)) return;
    this._fatal = null;

    try {
      const WebSocket = require('ws');
      // GA transcription endpoint: use ?intent=transcription (NOT ?model=)
      // The transcription model goes inside the session config
      const url = 'wss://api.openai.com/v1/realtime?intent=transcription';

      this.ws = new WebSocket(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      this.ws.on('open', () => {
        this.connected = true;
        this._policy.reset();
        this.onStatusChange('connected');

        // Configure the transcription session (GA format)
        this._sendEvent({
          type: 'session.update',
          session: {
            type: 'transcription',
            audio: {
              input: {
                format: { type: 'audio/pcm', rate: 24000 },
                transcription: {
                  model: this.model,
                  language: 'en'
                }
              }
            }
          }
        });
      });

      this.ws.on('message', (data) => {
        try {
          const event = JSON.parse(data.toString());
          this._handleEvent(event);
        } catch (e) {
          // ignore parse errors
        }
      });

      this.ws.on('close', (code) => {
        this.connected = false;
        this._sessionReady = false;
        if (this._stopped) return;
        this.onStatusChange('disconnected');
        if (this._fatal) { this.onError(this._fatal); return; }
        if (code !== 1000) this._attemptReconnect();
      });

      // A socket error is followed by 'close', which decides: retry, or give up
      // only for a refused key.
      this.ws.on('error', (err) => {
        const status = handshakeStatus(err);
        console.log(`[streaming-stt] openai-realtime socket error${status ? ' ' + status : ''}: ${err && err.message}`);
        if (isAuthRefusal(status)) this._fatal = { provider: 'openai-realtime', message: `OpenAI refused the key (${status}). Check it in Settings > Keys.`, status };
      });

    } catch (e) {
      this.onError({ provider: 'openai-realtime', message: e.message, status: null });
    }
  }

  _handleEvent(event) {
    switch (event.type) {
      case 'session.created':
      case 'session.updated':
        this._sessionReady = true;
        this._flushPendingAudio();
        break;

      case 'conversation.item.input_audio_transcription.delta':
        if (event.delta) {
          this.onInterim(event.delta);
        }
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript && event.transcript.trim()) {
          this.onTranscript(event.transcript.trim());
        }
        break;

      case 'input_audio_buffer.speech_started':
        break;

      case 'input_audio_buffer.speech_stopped':
        break;

      case 'input_audio_buffer.committed':
        break;

      case 'error':
        // Most realtime errors are per event (a bad append) and the session
        // carries on; a fatal one closes the socket and 'close' takes over.
        console.log(`[streaming-stt] openai-realtime error event: ${event.error?.code || ''} ${event.error?.message || ''}`);
        break;
    }
  }

  sendAudio(pcmBuffer) {
    if (!this.connected || !this._sessionReady) {
      // Buffer audio until session is ready (max 5 seconds worth)
      this._pendingAudio.push(pcmBuffer);
      if (this._pendingAudio.length > 80) this._pendingAudio.shift();
      return;
    }

    // Resample 16kHz -> 24kHz (linear interpolation) since the API requires 24kHz
    const resampled = this._resample16to24(Buffer.from(pcmBuffer));
    const b64 = resampled.toString('base64');
    this._sendEvent({
      type: 'input_audio_buffer.append',
      audio: b64
    });
  }

  _resample16to24(pcm16kHz) {
    // Linear interpolation from 16000 Hz to 24000 Hz (ratio 2:3)
    const srcSamples = pcm16kHz.length / 2;
    const dstSamples = Math.floor(srcSamples * 24000 / 16000);
    const out = Buffer.alloc(dstSamples * 2);
    for (let i = 0; i < dstSamples; i++) {
      const srcPos = i * 16000 / 24000;
      const idx = Math.floor(srcPos);
      const frac = srcPos - idx;
      const s0 = idx < srcSamples ? pcm16kHz.readInt16LE(idx * 2) : 0;
      const s1 = (idx + 1) < srcSamples ? pcm16kHz.readInt16LE((idx + 1) * 2) : s0;
      const sample = Math.round(s0 + (s1 - s0) * frac);
      out.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
    }
    return out;
  }

  _flushPendingAudio() {
    while (this._pendingAudio.length > 0) {
      const chunk = this._pendingAudio.shift();
      const resampled = this._resample16to24(Buffer.from(chunk));
      const b64 = resampled.toString('base64');
      this._sendEvent({
        type: 'input_audio_buffer.append',
        audio: b64
      });
    }
  }

  _sendEvent(event) {
    if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN
      this.ws.send(JSON.stringify(event));
    }
  }

  _attemptReconnect() {
    if (this._reconnectTimer || this._stopped) return;
    const delay = this._policy.next();
    if (delay == null) {
      this.onError({ provider: 'openai-realtime', message: 'Lost the connection for five minutes', status: null });
      return;
    }
    this.reconnecting = true;
    this.onStatusChange('reconnecting');
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.reconnecting = false;
      this._open();
    }, delay);
  }

  disconnect() {
    this._stopped = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    this.reconnecting = false;
    this._sessionReady = false;
    this._pendingAudio = [];
    if (this.ws) {
      this.ws.close(1000);
      this.ws = null;
    }
    this.connected = false;
  }
}

// ============================================================================
// Deepgram Nova Streaming STT (WebSocket)
// Ultra-low latency, supports interim results, speaker diarization, punctuation
// ============================================================================

class DeepgramStreamingSTT {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.model = options.model || 'nova-3';
    this.keyterms = options.keyterms || []; // src/vocab.js, sent as repeated keyterm params
    this.ws = null;
    this.connected = false;
    this.onTranscript = options.onTranscript || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onError = options.onError || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});
    this._policy = createReconnectPolicy(options.reconnect);
    this._reconnectTimer = null;
    this._stopped = false;
    this._fatal = null;
    this._pending = { chunks: [], bytes: 0 };
    this._keepAliveInterval = null;
    this._committed = ''; // is_final segments not yet closed out by speech_final
  }

  _listenUrl() {
    const params = new URLSearchParams({
      model: this.model,
      language: 'en',
      smart_format: 'true',
      interim_results: 'true',
      utterance_end_ms: '1000',
      vad_events: 'true',
      encoding: 'linear16',
      sample_rate: '16000',
      channels: '1',
      endpointing: '300',
      punctuate: 'true'
    });
    // Key terms (nova-3): the words this user says that Deepgram would otherwise mishear.
    for (const term of this.keyterms) params.append('keyterm', term);
    return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
  }

  async connect() {
    this._stopped = false;
    return this._open();
  }

  async _open() {
    if (this._stopped || (this.ws && this.connected)) return;
    this._fatal = null;

    try {
      const WebSocket = require('ws');
      const url = this._listenUrl();

      this.ws = new WebSocket(url, {
        headers: { 'Authorization': `Token ${this.apiKey}` }
      });

      this.ws.on('open', () => {
        this.connected = true;
        this._policy.reset();
        this.onStatusChange('connected');
        // Speech from the gap goes first, so a question asked while the
        // socket was down still arrives.
        const { chunks } = this._pending;
        this._pending = { chunks: [], bytes: 0 };
        for (const chunk of chunks) this.ws.send(chunk);
        // Keep-alive every 3 seconds to prevent timeout
        this._keepAliveInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === 1) {
            this.ws.send(JSON.stringify({ type: 'KeepAlive' }));
          }
        }, 3000);
      });

      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          this._handleMessage(msg);
        } catch (e) { /* ignore */ }
      });

      this.ws.on('close', (code) => {
        this.connected = false;
        this._clearKeepAlive();
        if (this._stopped) return;
        this.onStatusChange('disconnected');
        if (this._fatal) { this.onError(this._fatal); return; }
        if (code !== 1000) this._attemptReconnect();
      });

      // A socket error is followed by 'close', which decides: retry, or give up
      // only for a refused key. Before this, one network blip ended streaming
      // for the rest of the call.
      this.ws.on('error', (err) => {
        const status = handshakeStatus(err);
        console.log(`[streaming-stt] deepgram socket error${status ? ' ' + status : ''}: ${err && err.message}`);
        if (isAuthRefusal(status)) this._fatal = { provider: 'deepgram', message: `Deepgram refused the key (${status}). Check it in Settings > Keys.`, status };
      });

    } catch (e) {
      this.onError({ provider: 'deepgram', message: e.message, status: null });
    }
  }

  _handleMessage(msg) {
    if (msg.type === 'Results') {
      const alt = msg.channel?.alternatives?.[0];
      if (!alt) return;
      const text = (alt.transcript || '').trim();

      // Deepgram splits one spoken sentence into several is_final segments and only sets
      // speech_final on the last one. Accumulate the is_final pieces and emit a single turn
      // at speech_final so a sentence is not fragmented across transcript rows.
      if (msg.speech_final) {
        const full = ((this._committed || '') + ' ' + text).trim();
        this._committed = '';
        if (full && !looksLikeHallucination(full)) this.onTranscript(full);
        this.onInterim('');
        return;
      }
      if (!text) return;
      if (msg.is_final) {
        this._committed = ((this._committed || '') + ' ' + text).trim();
        this.onInterim(this._committed);
      } else {
        this.onInterim(((this._committed || '') + ' ' + text).trim());
      }
    } else if (msg.type === 'UtteranceEnd') {
      // Safety net: if endpointing never produced a speech_final, flush whatever is_final
      // segments we accumulated so the turn is not silently dropped.
      this._flushCommitted();
    } else if (msg.type === 'Error') {
      // Deepgram closes the socket after an error message; 'close' reconnects.
      console.log(`[streaming-stt] deepgram error message: ${msg.variant || ''} ${msg.description || msg.message || ''}`);
    }
  }

  _flushCommitted() {
    const full = (this._committed || '').trim();
    this._committed = '';
    if (full && !looksLikeHallucination(full)) this.onTranscript(full);
    this.onInterim('');
  }

  sendAudio(pcmBuffer) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(Buffer.from(pcmBuffer));
    } else if (!this._stopped) {
      pushPending(this._pending, pcmBuffer);
    }
  }

  _clearKeepAlive() {
    if (this._keepAliveInterval) { clearInterval(this._keepAliveInterval); this._keepAliveInterval = null; }
  }

  _attemptReconnect() {
    if (this._reconnectTimer || this._stopped) return;
    const delay = this._policy.next();
    if (delay == null) {
      this.onError({ provider: 'deepgram', message: 'Lost the connection for five minutes', status: null });
      return;
    }
    this.onStatusChange('reconnecting');
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._open();
    }, delay);
  }

  disconnect() {
    this._stopped = true;
    if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    this._pending = { chunks: [], bytes: 0 };
    this._flushCommitted();
    this._clearKeepAlive();
    if (this.ws) {
      // Send CloseStream message for clean shutdown
      try { this.ws.send(JSON.stringify({ type: 'CloseStream' })); } catch (e) { /* ignore */ }
      this.ws.close(1000);
      this.ws = null;
    }
    this.connected = false;
  }
}

// ============================================================================
// Batch STT (enhanced version of the original — used as fallback)
// Supports Whisper and Gemini with better error handling
// ============================================================================

async function transcribeBatchOpenAI(apiKey, wav, model) {
  const OpenAI = require('openai');
  const toFile = OpenAI.toFile || require('openai/uploads').toFile;
  const client = new OpenAI({ apiKey });
  const file = await toFile(wav, 'audio.wav', { type: 'audio/wav' });
  const res = await client.audio.transcriptions.create({
    file,
    model: model || 'whisper-1',
    response_format: 'text',
    language: 'en'
  });
  return (typeof res === 'string' ? res : res.text || '').trim();
}

async function transcribeBatchGemini(apiKey, wav) {
  const { GoogleGenAI } = require('@google/genai');
  const ai = new GoogleGenAI({ apiKey });
  const res = await ai.models.generateContent({
    model: CURRENT_GEMINI_DEFAULT,
    contents: [{ role: 'user', parts: [
      { text: 'Transcribe this audio verbatim. Return only the spoken words with no commentary. If there is no clear speech, return an empty response.' },
      { inlineData: { mimeType: 'audio/wav', data: wav.toString('base64') } }
    ] }]
  });
  return ((res && res.text) || '').trim();
}

// ============================================================================
// Unified Streaming STT Factory
// Creates the best available streaming STT based on the user's API keys.
// Priority: Deepgram (lowest latency) > OpenAI Realtime > Batch fallback
// ============================================================================

function createStreamingSTT(settings, channel, callbacks) {
  const keys = settings.apiKeys || {};
  const selectedProvider = settings.sttProvider || 'auto';
  const { onTranscript, onInterim, onError, onStatusChange } = callbacks;

  if (selectedProvider === 'local' || selectedProvider === 'gemini') {
    return { type: 'batch', provider: selectedProvider, instance: null };
  }

  // Priority 1: Deepgram (purpose-built for streaming STT, lowest latency)
  if ((selectedProvider === 'auto' || selectedProvider === 'deepgram') && keys.deepgram) {
    const stt = new DeepgramStreamingSTT(keys.deepgram, {
      model: 'nova-3',
      keyterms: buildVocabTerms(settings),
      onTranscript: (text) => onTranscript(channel, text),
      onInterim: (text) => onInterim(channel, text),
      onError,
      onStatusChange: (status) => onStatusChange(channel, status)
    });
    return { type: 'streaming', provider: 'deepgram', instance: stt };
  }

  // Priority 2: OpenAI Realtime API (excellent quality, slightly higher latency)
  if ((selectedProvider === 'auto' || selectedProvider === 'openai') && keys.openai) {
    const stt = new OpenAIRealtimeSTT(keys.openai, {
      model: 'gpt-realtime-whisper', // only this model gives true streaming deltas
      onTranscript: (text) => onTranscript(channel, text),
      onInterim: (text) => onInterim(channel, text),
      onError,
      onStatusChange: (status) => onStatusChange(channel, status)
    });
    return { type: 'streaming', provider: 'openai-realtime', instance: stt };
  }

  // Priority 3: Batch fallback (Gemini or Whisper via old system). Custom has
  // no streaming protocol of its own (an arbitrary OpenAI-compatible endpoint
  // isn't assumed to speak Realtime), so an explicit 'custom' choice lands
  // here too and is served by createSTT()'s batch chain — same as local/gemini.
  return {
    type: 'batch',
    provider: selectedProvider === 'custom' ? 'custom' : (selectedProvider === 'auto' && keys.gemini ? 'gemini' : 'none'),
    instance: null
  };
}

module.exports = {
  createReconnectPolicy,
  handshakeStatus,
  isAuthRefusal,
  pushPending,
  RECONNECT_DELAYS_MS,
  OpenAIRealtimeSTT,
  DeepgramStreamingSTT,
  createStreamingSTT,
  transcribeBatchOpenAI,
  transcribeBatchGemini
};
