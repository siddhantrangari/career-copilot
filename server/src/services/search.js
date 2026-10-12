import { config } from '../config.js';
import { AiError } from './ai.js';
import { searchProvider } from './providers.js';
import { pool } from '../db/pool.js';

/**
 * Live web grounding.
 *
 * The synthesis models (Claude/GPT) answer from training memory, so anything
 * time-sensitive they produce is months-to-years stale. Perplexity's sonar
 * models run an actual web search per request and return citations, so every
 * grounded fact in a research brief or WIN document traces to a real URL with
 * a real date.
 *
 * Shape of the pipeline:
 *   searchCompany()  → live evidence + citations   (perplexity/sonar-pro)
 *   then the caller synthesises structured output  (anthropic/claude-sonnet-4-6)
 */

const DAY = 24 * 60 * 60 * 1000;

/** One grounded search. Returns prose plus the sources it actually read. */
export async function groundedSearch(query, { maxTokens = 1600, timeoutMs = 120_000 } = {}) {
  const provider = searchProvider();
  if (!provider) {
    throw new AiError('No search provider configured (set MESH_API_KEY and MESH_SEARCH_MODEL)', 503);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      // No response_format here: the sonar models are search-and-summarise,
      // and forcing JSON mode costs us the citation quality.
      body: JSON.stringify({
        model: provider.model,
        max_tokens: maxTokens,
        messages: [
          {
            role: 'system',
            content:
              'You are a research analyst. Report only what current sources actually say. ' +
              'Attach an explicit date (month and year) to every factual claim. ' +
              'If you cannot find recent information on something, say so plainly instead of ' +
              'filling the gap from background knowledge. Never speculate about private ' +
              'internal details. Prefer sources from the last 6 months.',
          },
          { role: 'user', content: query },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new AiError(`Search provider returned ${res.status}: ${detail.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) throw new AiError('Search provider returned an empty result');

    // Mesh passes Perplexity's citation fields straight through.
    const citations = Array.isArray(data.citations) ? data.citations : [];
    const searchResults = Array.isArray(data.search_results) ? data.search_results : [];

    return {
      query,
      content,
      citations,
      sources: searchResults.map((r) => ({
        title: r.title || '',
        url: r.url || '',
        date: r.date || r.last_updated || null,
      })),
      model: provider.model,
      searchedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err.name === 'AbortError') throw new AiError('Search request timed out', 504);
    throw err instanceof AiError ? err : new AiError(`Search failed: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The research loop: several targeted searches per company rather than one
 * broad one, because "what is company X working on" returns marketing copy
 * while specific questions return engineering signal.
 */
export function buildQueries(companyName, roleName) {
  const role = roleName || 'senior software engineer';
  return [
    {
      key: 'challenges',
      query:
        `What technical and engineering challenges is ${companyName} facing right now? ` +
        `Focus on the last 6 months: scaling problems, architecture changes, reliability or ` +
        `latency issues, data infrastructure, AI/LLM reliability, integration burden, or ` +
        `platform migrations. Include anything from their engineering blog, conference talks, ` +
        `or incident reports. Give the date of each item.`,
    },
    {
      key: 'news',
      query:
        `What has happened at ${companyName} in the last 6 months? Funding rounds, product ` +
        `launches, acquisitions, layoffs, leadership changes, major customer wins, market ` +
        `pressure, or strategy shifts. Give the date and source of each item, newest first.`,
    },
    {
      key: 'hiring',
      query:
        `What is ${companyName} currently hiring for in engineering, particularly ${role} ` +
        `or similar roles? What do their recent job descriptions say about the problems those ` +
        `teams are solving, the tech stack, and their interview process? Do they use ` +
        `LeetCode-style algorithmic interviews or practical/take-home assessments?`,
    },
  ];
}

/** Run the query set, tolerating individual failures. */
export async function researchCompanyLive(companyName, roleName, onStep = () => {}) {
  const queries = buildQueries(companyName, roleName);

  onStep({
    phase: 'search',
    status: 'start',
    message: `Running ${queries.length} live web searches for ${companyName}`,
    detail: queries.map((q) => ({ key: q.key, query: q.query })),
  });

  const settled = await Promise.allSettled(
    queries.map((q) =>
      groundedSearch(q.query)
        .then((r) => {
          onStep({
            phase: 'search',
            status: 'ok',
            key: q.key,
            message: `“${q.key}” search returned ${r.sources.length || r.citations.length} sources`,
            sources: (r.sources.length ? r.sources : r.citations.map((url) => ({ url })))
              .slice(0, 8).map((x) => ({ url: x.url, title: x.title || '', date: x.date || null })),
            excerpt: r.content.slice(0, 400),
          });
          return { ...r, key: q.key };
        })
        .catch((err) => {
          onStep({ phase: 'search', status: 'failed', key: q.key, message: `“${q.key}” search failed: ${err.message}` });
          throw err;
        }),
    ),
  );

  const findings = [];
  const failures = [];
  for (const [i, result] of settled.entries()) {
    if (result.status === 'fulfilled') findings.push(result.value);
    else failures.push(`${queries[i].key}: ${result.reason?.message || 'failed'}`);
  }

  if (!findings.length) {
    throw new AiError(`Live research failed — ${failures.join(' | ')}`);
  }

  // De-duplicate sources across the query set.
  const seen = new Set();
  const sources = [];
  for (const f of findings) {
    for (const s of f.sources.length ? f.sources : f.citations.map((url) => ({ url, title: '', date: null }))) {
      if (!s.url || seen.has(s.url)) continue;
      seen.add(s.url);
      sources.push(s);
    }
  }

  return {
    findings,
    sources,
    failures,
    searchedAt: new Date().toISOString(),
    model: findings[0]?.model,
  };
}

/** Grounded evidence rendered for prompt injection. */
export function renderGrounding(grounding) {
  if (!grounding?.findings?.length) return '(no live search results available)';

  const blocks = grounding.findings
    .map((f) => `### Live search — ${f.key}\n${f.content}`)
    .join('\n\n');

  const sourceList = grounding.sources
    .slice(0, 30)
    .map((s, i) => `[${i + 1}] ${s.title || s.url}${s.date ? ` (${s.date})` : ''} — ${s.url}`)
    .join('\n');

  return `LIVE WEB RESEARCH — retrieved ${grounding.searchedAt}
These findings came from an actual web search just now. Prefer them over anything
you remember; where your background knowledge disagrees with these, these win.

${blocks}

SOURCES
${sourceList}`;
}

// ── Evidence cache ────────────────────────────────────────────────────
// Stored so the WIN document can reuse the same grounded evidence the
// research brief was built from, without paying for the searches twice.

export async function saveEvidence(companyId, grounding) {
  if (!companyId) return null;
  const row = await pool.query(
    `INSERT INTO research_evidence (company_id, findings, sources, model)
     VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
    [
      companyId,
      JSON.stringify(grounding.findings || []),
      JSON.stringify(grounding.sources || []),
      grounding.model || '',
    ],
  );
  return row.rows[0];
}

export async function loadRecentEvidence(companyId, maxAgeDays = 7) {
  if (!companyId) return null;
  const { rows } = await pool.query(
    `SELECT findings, sources, model, created_at
     FROM research_evidence
     WHERE company_id = $1 AND created_at > now() - ($2 || ' days')::interval
     ORDER BY created_at DESC LIMIT 1`,
    [companyId, String(maxAgeDays)],
  );
  if (!rows.length) return null;

  return {
    findings: rows[0].findings || [],
    sources: rows[0].sources || [],
    model: rows[0].model,
    searchedAt: new Date(rows[0].created_at).toISOString(),
    cached: true,
  };
}

/** Fresh evidence, reusing anything recent enough. */
export async function getGrounding(
  companyId, companyName, roleName,
  { force = false, maxAgeDays = 7, onStep = () => {} } = {},
) {
  if (!force) {
    const cached = await loadRecentEvidence(companyId, maxAgeDays);
    if (cached) {
      onStep({
        phase: 'search', status: 'cached',
        message: `Reusing evidence gathered ${new Date(cached.searchedAt).toLocaleString()} ` +
                 `(${cached.sources.length} sources) — force a refresh to search again`,
      });
      return cached;
    }
  }

  const grounding = await researchCompanyLive(companyName, roleName, onStep);
  await saveEvidence(companyId, grounding);
  onStep({
    phase: 'search', status: 'done',
    message: `Gathered ${grounding.sources.length} unique sources`,
  });
  return grounding;
}

export const EVIDENCE_MAX_AGE_DAYS = Math.max(
  1,
  parseInt(process.env.RESEARCH_MAX_AGE_DAYS || '7', 10) || 7,
);

export { config };
