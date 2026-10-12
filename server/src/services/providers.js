import { config } from '../config.js';

/**
 * Provider registry. Every provider here speaks the OpenAI chat-completions
 * wire format, but the accepted parameters differ — so each one owns a
 * buildPayload(). Order comes from AI_PROVIDER_ORDER; the first provider with
 * a configured key handles the call, the rest are failover.
 *
 * Verified call shapes (see MyAgentFirm's provider-request-params test):
 *   mesh   — Anthropic-family models: plain `max_tokens`.
 *   openai — gpt-5.x: `max_completion_tokens`, temperature must be 1, and
 *            `reasoning_effort: 'none'` or function tools 400.
 */

/**
 * gpt-5.x models reject any temperature but 1, and emit billable reasoning
 * tokens unless reasoning_effort is 'none'. Measured: luna without it spent
 * 20 reasoning tokens at output rate on a 35-token answer. Mesh proxies these
 * models, so the quirk has to be applied by model id, not by provider.
 */
const isGpt5 = (model) => /(^|\/)gpt-5/.test(model || '');

const REGISTRY = {
  mesh: {
    name: 'mesh',
    baseUrl: config.ai.mesh.baseUrl,
    apiKey: config.ai.mesh.apiKey,
    model: config.ai.mesh.model,
    buildPayload: ({ model, messages, maxTokens, json }) => ({
      model,
      messages,
      max_tokens: maxTokens,
      ...(isGpt5(model) ? { temperature: 1, reasoning_effort: 'none' } : {}),
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  },

  openai: {
    name: 'openai',
    baseUrl: config.ai.openai.baseUrl,
    apiKey: config.ai.openai.apiKey,
    model: config.ai.openai.model,
    buildPayload: ({ model, messages, maxTokens, json }) => ({
      model,
      messages,
      max_completion_tokens: maxTokens,
      temperature: 1,
      reasoning_effort: 'none',
      ...(json ? { response_format: { type: 'json_object' } } : {}),
    }),
  },
};

/** Providers in priority order, skipping any without a key. */
export function activeProviders() {
  return config.ai.order
    .map((name) => REGISTRY[name])
    .filter((p) => p && p.apiKey && p.baseUrl && p.model);
}

/**
 * The live-search provider. Separate from the chat chain: it is a specific
 * model chosen for its ability to search the web, not a failover tier.
 */
export function searchProvider() {
  if (!config.ai.search.enabled) return null;
  if (!config.ai.mesh.apiKey) return null;
  return {
    name: 'mesh-search',
    baseUrl: config.ai.mesh.baseUrl,
    apiKey: config.ai.mesh.apiKey,
    model: config.ai.search.model,
  };
}

export function providerStatus() {
  const chain = config.ai.order.map((name) => ({
    provider: name,
    configured: Boolean(REGISTRY[name]?.apiKey),
    model: REGISTRY[name]?.model || null,
  }));

  const search = searchProvider();
  chain.push({
    provider: 'search',
    configured: Boolean(search),
    model: search?.model || null,
  });

  return chain;
}
