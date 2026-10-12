import { config } from '../config.js';
import { pool } from '../db/pool.js';
import { activeProviders } from './providers.js';

export class AiError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'AiError';
    this.statusCode = status;
  }
}

/** Pull the JSON object out of a response that may be fenced or padded with prose. */
export function parseJson(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1] : raw.match(/\{[\s\S]*\}/)?.[0];
    if (!candidate) return fallback;
    try {
      return JSON.parse(candidate);
    } catch {
      return fallback;
    }
  }
}

async function logRun({
  kind, companyId, model, ok, error, durationMs, input, output,
  tokensIn = 0, tokensOut = 0, cachedIn = 0, sessionId,
}) {
  try {
    await pool.query(
      `INSERT INTO ai_runs (kind, company_id, model, ok, error, duration_ms, input, output,
                            tokens_in, tokens_out, cost_usd, session_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        kind, companyId || null, model || 'unknown', ok, error || null, durationMs,
        input ? JSON.stringify(input) : null,
        output ? JSON.stringify(output) : null,
        tokensIn, tokensOut, estimateCost(model, tokensIn, tokensOut, cachedIn),
        sessionId || null,
      ],
    );
  } catch (err) {
    console.error('[ai] failed to log run:', err.message);
  }
}

/**
 * Published per-1M-token rates for the models this app actually calls, so the
 * UI can show real spend instead of a guess. Unlisted models cost 0 here —
 * an underestimate is flagged as such rather than invented.
 */
const RATES = {
  'anthropic/claude-sonnet-4-6': { in: 3, out: 15, cached: 0.30 },
  'openai/gpt-5.6-luna': { in: 0.20, out: 1.20, cached: 0.02 },
  'openai/gpt-5.6-terra': { in: 2.00, out: 12.00, cached: 0.20 },
  'openai/gpt-5.6-sol': { in: 4.00, out: 20.00, cached: 0.40 },
  'openai/gpt-4o-mini': { in: 0.15, out: 0.60, cached: 0.075 },
  'mistralai/mistral-small-24b-instruct-2501': { in: 0.05, out: 0.08, cached: 0.05 },
  'perplexity/sonar-pro': { in: 3, out: 15, cached: 3 },
  'gpt-5.6-sol': { in: 4, out: 24, cached: 0.4 },
};

/** Cached input is billed at a lower rate, so it is priced separately. */
export function estimateCost(model, tokensIn, tokensOut, cachedIn = 0) {
  const r = RATES[model];
  if (!r) return 0;
  const fresh = Math.max(0, tokensIn - cachedIn);
  const cost =
    (fresh / 1e6) * r.in +
    (cachedIn / 1e6) * (r.cached ?? r.in) +
    (tokensOut / 1e6) * r.out;
  return Number(cost.toFixed(6));
}

/** One attempt against one provider. */
async function callProvider(provider, { messages, json, maxTokens, timeoutMs, model }) {
  const payload = provider.buildPayload({
    // A per-call model override lets cheap, latency-sensitive work (live
    // interview turns) use a small model without changing the chain.
    model: model || provider.model,
    messages,
    maxTokens: maxTokens || config.ai.maxTokens,
    json,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new AiError(`${provider.name} returned ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content?.trim();
    if (!content) throw new AiError(`${provider.name} returned an empty completion`);

    // A truncated completion is the usual cause of "not valid JSON" — surface
    // it as itself rather than letting it fail later as a parse error.
    const finishReason = choice.finish_reason || choice.stop_reason || null;
    if (finishReason === 'length' || finishReason === 'max_tokens') {
      throw new AiError(
        `${provider.name} hit the output token limit (finish_reason=${finishReason}) — ` +
        'the response was cut off mid-JSON. Raise maxTokens for this endpoint.',
      );
    }

    const usage = data.usage || {};
    return {
      content,
      provider: provider.name,
      model: payload.model,
      finishReason,
      tokensIn: usage.prompt_tokens || usage.input_tokens || 0,
      tokensOut: usage.completion_tokens || usage.output_tokens || 0,
      cachedIn: usage.prompt_tokens_details?.cached_tokens || 0,
    };
  } catch (err) {
    if (err.name === 'AbortError') throw new AiError(`${provider.name} timed out`, 504);
    throw err instanceof AiError ? err : new AiError(`${provider.name} failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Chat completion with provider failover. Walks AI_PROVIDER_ORDER and returns
 * the first success; if every provider fails, throws with all of their errors
 * so the cause is visible rather than buried behind a silent fallback.
 */
export async function chat(messages, { json = false, maxTokens, timeoutMs = 240_000, model } = {}) {
  const providers = activeProviders();
  if (!providers.length) {
    throw new AiError('No AI provider is configured (set MESH_API_KEY or OPENAI_API_KEY)', 503);
  }

  const failures = [];
  for (const provider of providers) {
    try {
      return await callProvider(provider, { messages, json, maxTokens, timeoutMs, model });
    } catch (err) {
      failures.push(`${provider.name}: ${err.message}`);
      console.warn(`[ai] ${provider.name} failed, trying next — ${err.message}`);
    }
  }

  throw new AiError(`All AI providers failed → ${failures.join(' | ')}`);
}

/** chat() plus JSON parsing and an ai_runs audit row. */
export async function chatJson({
  kind, companyId, system, user, maxTokens, input, messages, model, sessionId,
}) {
  const started = Date.now();
  let usedModel;
  let res;
  try {
    res = await chat(
      messages || [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { json: true, maxTokens, model },
    );
    usedModel = res.model;

    const parsed = parseJson(res.content);
    if (!parsed) {
      throw new AiError(
        'AI response was not valid JSON (finish_reason=' + (res.finishReason || 'unknown') +
        ', ' + res.content.length + ' chars). Starts: ' + res.content.slice(0, 120) +
        ' … Ends: ' + res.content.slice(-120),
      );
    }

    await logRun({
      kind, companyId, model: usedModel, ok: true,
      durationMs: Date.now() - started, input, output: parsed,
      tokensIn: res.tokensIn, tokensOut: res.tokensOut, cachedIn: res.cachedIn, sessionId,
    });
    return parsed;
  } catch (err) {
    await logRun({
      kind, companyId, model: usedModel, ok: false, error: err.message,
      durationMs: Date.now() - started, input, output: null,
      tokensIn: res?.tokensIn, tokensOut: res?.tokensOut, cachedIn: res?.cachedIn, sessionId,
    });
    throw err;
  }
}

/** chat() returning markdown/plain text, with an audit row. */
export async function chatText({ kind, companyId, system, user, maxTokens, input, messages }) {
  const started = Date.now();
  let model;
  try {
    const res = await chat(
      messages || [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens },
    );
    model = res.model;

    await logRun({
      kind, companyId, model, ok: true,
      durationMs: Date.now() - started, input, output: { text: res.content },
    });
    return res.content;
  } catch (err) {
    await logRun({
      kind, companyId, model, ok: false, error: err.message,
      durationMs: Date.now() - started, input, output: null,
    });
    throw err;
  }
}
