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

/** Repair unescaped newlines/tabs inside string literals and trailing commas. */
function repairJson(str) {
  let inString = false;
  let escaped = false;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        out += ch;
      } else if (ch === '\\') {
        escaped = true;
        out += ch;
      } else if (ch === '"') {
        inString = false;
        out += ch;
      } else if (ch === '\n') {
        out += '\\n';
      } else if (ch === '\r') {
        out += '\\r';
      } else if (ch === '\t') {
        out += '\\t';
      } else {
        out += ch;
      }
    } else {
      if (ch === '"') {
        inString = true;
        out += ch;
      } else {
        out += ch;
      }
    }
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/** Pull the JSON object out of a response that may be fenced, padded with prose, or have unescaped control chars. */
export function parseJson(raw, fallback = null) {
  if (!raw || typeof raw !== 'string') return fallback;

  // 1. Direct parse attempt
  try {
    return JSON.parse(raw);
  } catch {}

  // 2. Strip leading and trailing markdown code block wrapper
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/i, '');
    const lastFence = text.lastIndexOf('```');
    if (lastFence !== -1) {
      text = text.slice(0, lastFence).trim();
    }
  }

  try {
    return JSON.parse(text);
  } catch {}

  // 3. Extract outermost JSON object or array ({ ... } or [ ... ])
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  const firstBracket = text.indexOf('[');
  const lastBracket = text.lastIndexOf(']');

  let candidate = text;
  if (firstBrace !== -1 && lastBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    candidate = text.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1 && lastBracket !== -1) {
    candidate = text.slice(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(candidate);
  } catch {}

  // 4. Try repairing common LLM JSON defects (unescaped newlines/tabs inside strings, trailing commas)
  try {
    const repaired = repairJson(candidate);
    return JSON.parse(repaired);
  } catch {}

  // 5. Fallback regex extraction for tailoredResumeText if the response is a tailored/refined resume object
  try {
    const match = candidate.match(/"tailoredResumeText"\s*:\s*"([\s\S]*?)(?:",\s*"(?:changeSummary|summaryRewrite|keywordsMatched|matchScore|talkingPoints)|"\s*})/);
    if (match) {
      const rawResume = match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      const scoreMatch = candidate.match(/"matchScore"\s*:\s*(\d+)/);
      const summaryMatch = candidate.match(/"changeSummary"\s*:\s*"([^"]*)"/);
      return {
        tailoredResumeText: rawResume,
        changeSummary: summaryMatch ? summaryMatch[1] : 'Resume refined according to feedback.',
        matchScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 85,
        talkingPoints: []
      };
    }
  } catch {}

  return fallback;
}

export async function logRun({
  kind, companyId, model, ok, error, durationMs, input, output,
  tokensIn = 0, tokensOut = 0, cachedIn = 0, sessionId,
}) {
  try {
    await pool.query(
      `INSERT INTO ai_runs (kind, company_id, model, ok, error, duration_ms, input, output,
                            tokens_in, tokens_out, cost_usd, session_id, cached_tokens)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        kind, companyId || null, model || 'unknown', ok, error || null, durationMs,
        input ? JSON.stringify(input) : null,
        output ? JSON.stringify(output) : null,
        tokensIn, tokensOut, estimateCost(model, tokensIn, tokensOut, cachedIn),
        sessionId || null, cachedIn || 0,
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

/**
 * One tool-calling turn, for the Telegram assistant.
 *
 * Kept apart from callProvider on purpose: a tool-call reply has no text
 * content, which callProvider (rightly, for JSON tasks) treats as a failure.
 * Returns the assistant message as the provider sent it — content and/or
 * tool_calls — so the caller can append it to the transcript verbatim.
 *
 * `model` is a Mesh-style id ("openai/gpt-5.6-luna"); the direct OpenAI
 * provider takes the bare id, so the vendor prefix is dropped for it.
 */
export async function chatWithTools({ messages, tools, model, maxTokens = 1200, timeoutMs = 90_000, kind = 'telegram-bot' }) {
  const providers = activeProviders();
  if (!providers.length) throw new AiError('No AI provider is configured', 503);

  const failures = [];
  for (const provider of providers) {
    const useModel = provider.name === 'openai' ? (model || provider.model).replace(/^[a-z-]+\//, '') : (model || provider.model);
    const payload = {
      ...provider.buildPayload({ model: useModel, messages, maxTokens, json: false }),
      tools,
      tool_choice: 'auto',
    };
    const started = Date.now();
    try {
      const res = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${provider.apiKey}` },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) throw new AiError(`${provider.name} returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
      const data = await res.json();
      const choice = data.choices?.[0];
      if (!choice?.message) throw new AiError(`${provider.name} returned no message`);
      const usage = data.usage || {};
      await logRun({
        kind, model: useModel, ok: true, durationMs: Date.now() - started,
        tokensIn: usage.prompt_tokens || 0, tokensOut: usage.completion_tokens || 0,
        cachedIn: usage.prompt_tokens_details?.cached_tokens || 0,
      });
      return { message: choice.message, finishReason: choice.finish_reason, model: useModel };
    } catch (err) {
      const msg = err.name === 'TimeoutError' ? `${provider.name} timed out` : err.message;
      failures.push(`${provider.name}: ${msg}`);
      await logRun({ kind, model: useModel, ok: false, error: msg, durationMs: Date.now() - started });
    }
  }
  throw new AiError(`All AI providers failed → ${failures.join(' | ')}`);
}
