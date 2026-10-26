import { config } from '../config.js';
import { AiError, logRun } from './ai.js';

/**
 * Text to speech for the interviewer's voice.
 *
 * Cost is the whole design constraint here — this runs daily, on no income.
 * Per 1,000 characters, via Mesh (≈7k characters of interviewer speech in a
 * 30-minute interview):
 *
 *   browser speechSynthesis      free      — robotic, but $0 and zero latency
 *   fishaudio/fish-speech-1.5    $0.0072   ≈ $0.05 / interview
 *   inworld-ai/tts-1.5-max       $0.0125   ≈ $0.09 / interview   ← default
 *   elevenlabs/eleven_flash_v2_5 $0.05     ≈ $0.35 / interview
 *
 * ElevenLabs direct (his own Starter plan) is used first when a key is
 * configured, because those credits are already paid for; when they run out
 * the provider falls through to the cheap Mesh voice rather than failing.
 * The browser voice is always available as a free last resort.
 */

/**
 * Gateway quirks, found by probing rather than assumed:
 *  - inworld rejects every response_format the gateway will accept — unusable.
 *  - elevenlabs needs a real voice_id, not a display name.
 *  - x-ai/tts-v1 works with no response_format at all and returns mp3.
 * Only models verified to return audio are listed.
 */
const MESH_VOICES = {
  'x-ai/tts-v1': null,
  'elevenlabs/eleven_flash_v2_5': '21m00Tcm4TlvDq8ikWAM',
};

/** ElevenLabs direct — uses the subscription he already pays for. */
async function elevenLabsDirect(text, { voiceId, signal }) {
  const key = config.tts.elevenLabsKey;
  if (!key) return null;

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || config.tts.elevenLabsVoiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: config.tts.elevenLabsModel,
        voice_settings: { stability: 0.45, similarity_boost: 0.75, speed: 1.0 },
      }),
      signal,
    },
  );

  if (!res.ok) {
    const detail = await res.text();
    // 401 = bad key, 429 = quota exhausted. Both mean "use the fallback",
    // and neither should take the interview down mid-sentence.
    console.warn(`[tts] ElevenLabs direct failed (${res.status}): ${detail.slice(0, 160)}`);
    return null;
  }

  return { audio: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg', provider: 'elevenlabs-direct' };
}

/** Any TTS model on the Mesh gateway. */
async function meshTts(text, { model, signal }) {
  const key = config.ai.mesh.apiKey;
  if (!key) return null;

  const chosen = model || config.tts.meshModel;
  const voice = MESH_VOICES[chosen];

  const res = await fetch(`${config.ai.mesh.baseUrl}/audio/speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    // No response_format: the gateway defaults to mp3, and passing it
    // explicitly is rejected for several models.
    body: JSON.stringify({
      model: chosen,
      input: text,
      ...(voice ? { voice } : {}),
    }),
    signal,
  });

  if (!res.ok) {
    const detail = await res.text();
    console.warn(`[tts] Mesh ${chosen} failed (${res.status}): ${detail.slice(0, 200)}`);
    return null;
  }

  return { audio: Buffer.from(await res.arrayBuffer()), contentType: 'audio/mpeg', provider: `mesh:${chosen}` };
}

/**
 * Speak a line. Returns null when no server-side provider worked, which the
 * route reports so the browser falls back to its own speech synthesis — the
 * interview continues either way.
 */
export async function speak(text, { voiceId, model, timeoutMs = 30_000 } = {}) {
  if (!text?.trim()) throw new AiError('text is required', 400);
  if (config.tts.provider === 'browser') return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Paid-for credits first, then the cheap gateway voice.
    const started = Date.now();
    if (config.tts.provider === 'elevenlabs' || config.tts.provider === 'auto') {
      const direct = await elevenLabsDirect(text, { voiceId, signal: controller.signal });
      if (direct) { logVoice(direct, text, started); return direct; }
    }
    const out = await meshTts(text, { model, signal: controller.signal });
    if (out) logVoice(out, text, started);
    return out;
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[tts] timed out — browser voice will be used');
      return null;
    }
    console.warn(`[tts] failed: ${err.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Every spoken line goes in the AI usage log like any model call: the gateway
 * bills voice by the character, and it used to be invisible in the spend
 * totals. ElevenLabs direct is on his own plan, so it is logged at $0.
 */
function logVoice(out, text, started) {
  const model = String(out.provider || '').replace(/^mesh:/, '');
  const chars = text.length;
  const rate = out.provider === 'elevenlabs-direct' ? 0 : (TTS_RATES[model] ?? TTS_RATES['x-ai/tts-v1']);
  logRun({ kind: 'interview-voice', model: model || 'tts', ok: true, durationMs: Date.now() - started,
    tokensIn: chars, costUsd: Number(((chars / 1000) * rate).toFixed(6)), input: { chars } }).catch(() => {});
}

/** Per-1k-character rates, for the cost meter shown in the UI. */
export const TTS_RATES = {
  browser: 0,
  'x-ai/tts-v1': 0.01875,
  'elevenlabs/eleven_flash_v2_5': 0.05,
};

export function ttsStatus() {
  return {
    provider: config.tts.provider,
    elevenLabsConfigured: Boolean(config.tts.elevenLabsKey),
    meshModel: config.tts.meshModel,
    voices: [
      { id: 'browser', label: 'Browser voice — free', costPerInterviewUsd: 0 },
      { id: 'x-ai/tts-v1', label: 'Natural voice', costPerInterviewUsd: 0.13 },
      ...(config.tts.elevenLabsKey
        ? [{ id: 'elevenlabs', label: 'ElevenLabs (your plan)', costPerInterviewUsd: 0 }]
        : []),
    ],
  };
}
