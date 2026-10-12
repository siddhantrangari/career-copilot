import { many, one, query } from '../db/pool.js';

/**
 * Freelance / contract gig discovery.
 *
 * Marketplaces like Upwork, Toptal, A.Team and Micro1 publish nothing a tool
 * can read, so this pulls only from sources that expose open work publicly:
 *
 *   freelancer  Freelancer.com documented project-search API (real client gigs)
 *   mercor      Mercor's public /explore page (robots.txt allows it; its JSON
 *               is the page's own __NEXT_DATA__, not their private /api/)
 *   remoteok    RemoteOK public API, contract-flagged postings only
 *   himalayas   Himalayas public search API, employment_type=Contractor
 *   remotive    Remotive public API, contract / freelance / part-time only
 *
 * Every board's terms ask for attribution and a link back, which the UI gives
 * on every card ("via …" + the Apply link goes to the original listing).
 * Run a few times a day at most — Remotive explicitly asks for ≤ 4 calls/day.
 */

const UA = 'career-copilot/1.0 (personal job search tool)';
const DAY = 86_400_000;

async function getJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`${new URL(url).hostname} returned ${res.status}`);
  return res.json();
}

function plain(html = '', max = 6000) {
  return String(html)
    .replace(/<(br|\/p|\/li|\/h\d)\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'")
    .replace(/\*\*|__|^#+\s*/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim()
    .slice(0, max);
}

const iso = (v) => {
  if (!v) return null;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

// ── Sources ─────────────────────────────────────────────────────────────

// Several narrow queries beat one broad one: Freelancer's search is fuzzy and
// a broad "AI" query returns podcast booking and logo design.
const FREELANCER_QUERIES = [
  'langchain', 'llm', 'ai agent', 'openai api', 'rag chatbot', 'generative ai',
  'spring boot', 'full stack react node', 'python automation', 'n8n automation',
];

async function fromFreelancer() {
  const out = new Map();
  for (const q of FREELANCER_QUERIES) {
    const d = await getJson(
      'https://www.freelancer.com/api/projects/0.1/projects/active/?limit=40' +
      '&full_description=true&job_details=true&query=' + encodeURIComponent(q),
    );
    for (const p of d.result?.projects || []) {
      if (out.has(p.id) || p.nonpublic || p.deleted) continue;
      out.set(p.id, {
        externalId: String(p.id),
        source: 'freelancer',
        platformId: 'freelancer',
        title: p.title,
        company: 'Freelancer.com client',
        url: 'https://www.freelancer.com/projects/' + p.seo_url,
        description: plain(p.description || p.preview_description),
        skills: (p.jobs || []).map((x) => x.name).filter(Boolean),
        rateMin: p.budget?.minimum ?? null,
        rateMax: p.budget?.maximum ?? null,
        rateUnit: p.type === 'hourly' ? 'hour' : 'fixed',
        currency: p.currency?.code || 'USD',
        engagement: 'freelance',
        location: 'Remote',
        postedAt: iso(p.time_submitted),
        meta: {
          bids: p.bid_stats?.bid_count ?? null,
          avgBid: p.bid_stats?.bid_avg ?? null,
          usdRate: p.currency?.exchange_rate ?? null,
          sign: p.currency?.sign || null,
        },
      });
    }
  }
  return [...out.values()];
}

async function fromMercor() {
  const res = await fetch('https://work.mercor.com/explore', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`work.mercor.com returned ${res.status}`);
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Mercor page layout changed — no __NEXT_DATA__ found');

  const queries = JSON.parse(m[1])?.props?.pageProps?.dehydratedState?.queries || [];
  const listings = queries.flatMap((q) => q?.state?.data?.listings || []);
  if (!listings.length) throw new Error('Mercor page had no listings — layout may have changed');

  return listings
    .filter((l) => l.status === 'active' && !l.isPrivate && !l.deletedAt && !l.disableApplications)
    .map((l) => ({
      externalId: l.listingId,
      source: 'mercor',
      platformId: 'mercor',
      title: l.title,
      company: l.companyBrandVisible && l.companyName ? l.companyName : 'Mercor client',
      url: 'https://work.mercor.com/jobs/' + l.listingId,
      description: plain(l.description),
      skills: [],
      rateMin: l.rateMin ?? null,
      rateMax: l.rateMax ?? null,
      rateUnit: { hourly: 'hour', yearly: 'year', 'per-task': 'task', 'one-time': 'fixed' }[l.payRateFrequency] || 'hour',
      currency: 'USD',
      engagement: l.commitment === 'full-time' ? 'contract' : 'part-time',
      location: l.location || 'Remote',
      eligible: l.eligibleLocation || [],
      postedAt: iso(l.postedAt),
      meta: { hoursPerWeek: l.hoursPerWeek ?? null, commitment: l.commitment || null, arrangement: l.workArrangement || null },
    }));
}

const CONTRACT_RE = /\b(contract|contractor|freelance|freelancer|part[- ]time|hourly|independent contractor)\b/i;

async function fromRemoteOk() {
  const d = await getJson('https://remoteok.com/api');
  return (Array.isArray(d) ? d.slice(1) : [])
    .filter((j) => CONTRACT_RE.test(`${(j.tags || []).join(' ')} ${j.position} ${String(j.description || '').slice(0, 1200)}`))
    .map((j) => ({
      externalId: String(j.id),
      source: 'remoteok',
      title: j.position,
      company: j.company || '',
      url: j.url || `https://remoteok.com/remote-jobs/${j.slug}`,
      description: plain(j.description),
      skills: j.tags || [],
      rateMin: j.salary_min || null,
      rateMax: j.salary_max || null,
      rateUnit: j.salary_max ? 'year' : null,
      currency: 'USD',
      engagement: /part[- ]time/i.test(j.description || '') ? 'part-time' : 'contract',
      location: j.location || 'Remote',
      postedAt: iso(j.date || j.epoch),
      meta: {},
    }));
}

const HIMALAYAS_QUERIES = ['python', 'llm', 'ai engineer', 'typescript', 'react', 'java'];

async function fromHimalayas() {
  const out = new Map();
  for (const q of HIMALAYAS_QUERIES) {
    const d = await getJson(
      'https://himalayas.app/jobs/api/search?employment_type=Contractor&q=' + encodeURIComponent(q),
    );
    for (const j of d.jobs || []) {
      if (!/contract|part/i.test(j.employmentType || '')) continue;
      const key = j.guid || j.applicationLink;
      if (!key || out.has(key)) continue;
      out.set(key, {
        externalId: String(key),
        source: 'himalayas',
        title: j.title,
        company: j.companyName || '',
        url: j.applicationLink || j.guid,
        description: plain(j.description || j.excerpt),
        skills: [...(j.categories || []), ...(j.parentCategories || [])],
        rateMin: j.minSalary || null,
        rateMax: j.maxSalary || null,
        rateUnit: j.salaryPeriod === 'hour' ? 'hour' : (j.maxSalary ? 'year' : null),
        currency: j.currency || 'USD',
        engagement: /part/i.test(j.employmentType) ? 'part-time' : 'contract',
        location: (j.locationRestrictions || []).join(', ') || 'Worldwide',
        eligible: j.locationRestrictions || [],
        postedAt: iso(j.pubDate),
        meta: { seniority: j.seniority || null },
      });
    }
  }
  return [...out.values()];
}

// "$120 - $170 /hour", "€60k–80k", "50-70 USD per hour" → numbers + unit.
function parseSalary(text = '') {
  const t = String(text).replace(/,/g, '');
  const m = t.match(/(\d+(?:\.\d+)?)\s*(k)?\s*(?:-|–|to)\s*[$€£]?\s*(\d+(?:\.\d+)?)\s*(k)?/i);
  if (!m) return {};
  const mult = (k) => (k ? 1000 : 1);
  const min = Number(m[1]) * mult(m[2] || m[4]);
  const max = Number(m[3]) * mult(m[4]);
  const unit = /hour|\/h\b|\bhr\b/i.test(t) ? 'hour' : /month/i.test(t) ? 'month' : 'year';
  const currency = /€|eur/i.test(t) ? 'EUR' : /£|gbp/i.test(t) ? 'GBP' : /₹|inr/i.test(t) ? 'INR' : 'USD';
  return { rateMin: min, rateMax: max, rateUnit: unit === 'month' ? 'year' : unit,
           currency, ...(unit === 'month' ? { rateMin: min * 12, rateMax: max * 12 } : {}) };
}

async function fromRemotive() {
  const d = await getJson('https://remotive.com/api/remote-jobs?limit=500');
  return (d.jobs || [])
    .filter((j) => ['contract', 'freelance', 'part_time'].includes(j.job_type))
    .map((j) => ({
      externalId: String(j.id),
      source: 'remotive',
      title: j.title,
      company: j.company_name || '',
      url: j.url,
      description: plain(j.description),
      skills: j.tags || [],
      rateMin: null,
      rateMax: null,
      rateUnit: null,
      currency: null,
      ...parseSalary(j.salary),
      salaryText: j.salary || '',
      engagement: j.job_type === 'part_time' ? 'part-time' : j.job_type,
      location: j.candidate_required_location || 'Worldwide',
      postedAt: iso(j.publication_date),
      meta: { salary: j.salary || null },
    }));
}

export const GIG_SOURCES = {
  freelancer: fromFreelancer,
  mercor: fromMercor,
  remoteok: fromRemoteOk,
  himalayas: fromHimalayas,
  remotive: fromRemotive,
};

// ── Relevance ───────────────────────────────────────────────────────────
// Scored against his actual stack rather than generic "software": AI agents,
// LLM routing, RAG, Spring Boot / Java, React / Node, Kafka, automation.

const AI_TERMS = [
  'llm', 'large language model', 'genai', 'generative ai', 'gen ai', 'ai agent', 'agentic',
  'langchain', 'langgraph', 'llamaindex', 'rag', 'retrieval', 'vector', 'embedding', 'openai',
  'gpt', 'claude', 'anthropic', 'gemini', 'mcp', 'prompt', 'chatbot', 'conversational ai',
  'voice ai', 'ai engineer', 'machine learning', 'ml engineer', 'nlp', 'fine-tune', 'fine-tuning', 'fine tuning', 'ai automation',
  'artificial intelligence',
];
const STACK_TERMS = [
  'python', 'java', 'spring boot', 'typescript', 'javascript', 'node', 'react', 'next.js',
  'fastapi', 'django', 'kafka', 'microservice', 'postgres', 'redis', 'docker', 'kubernetes',
  'aws', 'gcp', 'azure', 'full stack', 'full-stack', 'fullstack', 'backend', 'back-end', 'api',
  'graphql', 'n8n', 'zapier', 'automation', 'integration', 'webhook', 'twilio', 'whatsapp',
];
// Never his work, whatever the title says.
const HARD_EXCLUDE = new RegExp([
  'mechanical engineer', 'electrical', 'civil engineer', 'firmware', 'hardware', 'physician', 'nurse',
  'dentist', 'pharmac', 'lawyer', 'attorney', 'paralegal', 'accountant', 'bookkeep', 'voice actor',
  'voice-over', 'graphic design', '\\blogo\\b', 'video edit', 'illustrat', 'photograph', 'interior',
  'real estate', 'physicist', 'chemist', 'biolog', 'economist', 'psycholog', 'radiolog', 'data entry',
  'virtual assistant', 'podcast', 'business development', 'sales partner', 'sales executive',
  'account executive', 'lead generation', 'appointment setter', 'cold call',
].join('|'), 'i');
// Domain words that are fine next to an engineering title ("Python developer,
// clinical data platform") but mean a non-engineering role on their own.
const SOFT_EXCLUDE = new RegExp([
  'doctor', '\\bmd\\b', 'clinical', 'medical', 'legal', 'finance expert', 'marketing', '\\bseo\\b',
  '\\bsales\\b', 'recruiter', 'copywrit', '\\bwriter\\b', 'translat', 'transcri', 'tutor', 'teacher',
  'customer support', 'social media', 'animation', '3d model', 'mathematic',
].join('|'), 'i');
const ENGINEERING_TITLE = /engineer|developer|software|programm|coding|full.?stack|backend|\bai\b|llm|\bml\b/;
const ANNOTATION = /\b(annotat\w*|label(l)?ers?|label(l)?ing|raters?)\b/i;
// For a remote gig the location is where HE must live, not where the client
// is. He works from India, so India / worldwide / APAC are fully open; a
// Europe- or Gulf-only contract sometimes means timezone rather than
// residence, so it is softened rather than dropped; US-only is out.
// Whole-word matching with plural / -ing suffixes allowed: a plain substring
// test made "rag" hit "leverage" and "api" hit "rapid".
const termRe = (t) => new RegExp(
  '(?:^|[^a-z0-9])' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:s|es|ing|ed)?(?:$|[^a-z0-9])',
);
const AI_RES = AI_TERMS.map(termRe);
const STACK_RES = STACK_TERMS.map(termRe);
const countHits = (text, res) => res.filter((re) => re.test(text)).length;

const OPEN_TO_INDIA = /(worldwide|anywhere|global|international|^remote$|india|asia|apac)/i;
const SOFT_REGIONS = /(europe|\beu\b|emea|uae|united arab emirates|dubai|middle east|gulf|mena|uk\b|united kingdom|germany|netherlands)/i;
const US_ONLY = /\b(usa|u\.s\.|united states|us only|us-based|canada|north america|americas|latam|brazil|mexico)\b/i;

function locationScore(gig) {
  if (Array.isArray(gig.eligible) && gig.eligible.length) {
    return gig.eligible.some((c) => /^(in|ind|india)$/i.test(String(c).trim()) || OPEN_TO_INDIA.test(String(c)))
      ? 0 : -40;
  }
  const loc = String(gig.location || '').trim();
  if (!loc || OPEN_TO_INDIA.test(loc)) return 0;
  if (US_ONLY.test(loc) && !SOFT_REGIONS.test(loc)) return -40;
  if (SOFT_REGIONS.test(loc)) return -20;
  return -10;
}

// Fallback FX for sources that do not send a rate; Freelancer sends a live one.
const FX = { USD: 1, EUR: 1.1, GBP: 1.3, INR: 0.012, AED: 0.27, CAD: 0.72, AUD: 0.66, SGD: 0.75 };
const toUsd = (gig, amount) => {
  if (amount == null || amount === '') return null;
  const rate = gig.meta?.usdRate ?? FX[String(gig.currency || 'USD').toUpperCase()] ?? 1;
  return Math.round(Number(amount) * rate);
};

function hourlyEquivalent(gig) {
  const max = toUsd(gig, gig.rateMax || gig.rateMin);
  if (!max) return null;
  if (gig.rateUnit === 'hour') return max;
  if (gig.rateUnit === 'year') return max / 2000;
  return null;
}

export function scoreGig(gig) {
  const title = String(gig.title || '').toLowerCase();
  const body = `${(gig.skills || []).join(' ')} ${String(gig.description || '').slice(0, 3000)}`.toLowerCase();

  if (HARD_EXCLUDE.test(title)) return { relevance: 0, roles: [] };
  if (SOFT_EXCLUDE.test(title) && !ENGINEERING_TITLE.test(title)) return { relevance: 0, roles: [] };
  if (ANNOTATION.test(title) && !/engineer|developer|coding|\bcode\b|software|programm/.test(title)) {
    return { relevance: 0, roles: [] };
  }

  const aiTitle = countHits(title, AI_RES);
  const stackTitle = countHits(title, STACK_RES);
  const aiBody = countHits(body, AI_RES);
  const stackBody = countHits(body, STACK_RES);

  let s = Math.min(aiTitle, 2) * 18 + Math.min(stackTitle, 2) * 10 +
          Math.min(aiBody, 4) * 5 + Math.min(stackBody, 5) * 3;
  if (/software|developer|engineer|programmer|coding/.test(title)) s += 15;
  if (s < 15) return { relevance: 0, roles: [] };

  const hourly = hourlyEquivalent(gig);
  if (hourly != null) {
    if (hourly >= 100) s += 12;
    else if (hourly >= 50) s += 8;
    else if (hourly >= 25) s += 3;
    else if (hourly < 15) s -= 15;
  } else if (gig.rateUnit === 'fixed') {
    const max = toUsd(gig, gig.rateMax || gig.rateMin) || 0;
    if (max >= 5000) s += 10;
    else if (max >= 1000) s += 6;
    else if (max > 0 && max < 300) s -= 15;
  }

  if (gig.postedAt) {
    const days = (Date.now() - new Date(gig.postedAt).getTime()) / DAY;
    if (days <= 2) s += 8;
    else if (days <= 7) s += 4;
    else if (days > 30) s -= 10;
  }

  if ((gig.meta?.bids ?? 0) > 60) s -= 5;
  s += locationScore(gig);

  const roles = [];
  if (aiTitle || aiBody >= 2) roles.push('ai');
  if (/full.?stack|backend|back-end|react|node|spring|java\b/.test(`${title} ${body.slice(0, 800)}`)) roles.push('fs');
  if (/solutions|integration|implementation|automation/.test(title)) roles.push('se');
  if (/forward.?deployed/.test(title)) roles.push('fde');

  return { relevance: Math.max(0, Math.min(100, Math.round(s))), roles };
}

// ── The run ─────────────────────────────────────────────────────────────

export async function runGigDiscovery({ trigger = 'manual', sources = null, onStep = () => {} } = {}) {
  const run = await one(
    `INSERT INTO agent_runs (kind, trigger, status) VALUES ('gig-discovery', $1, 'running')
     RETURNING id, started_at`,
    [trigger],
  );

  const names = (sources?.length ? sources : Object.keys(GIG_SOURCES)).filter((n) => GIG_SOURCES[n]);
  const platforms = new Set(
    (await many('SELECT id FROM companies WHERE freelance')).map((r) => r.id),
  );

  const detail = [];
  const errors = [];
  let seen = 0;
  let added = 0;

  for (const name of names) {
    onStep({ phase: 'gigs', status: 'start', message: `Fetching open work from ${name}` });
    let gigs;
    try {
      gigs = await GIG_SOURCES[name]();
    } catch (err) {
      errors.push({ source: name, error: err.message });
      detail.push({ source: name, fetched: 0, kept: 0, new: 0, error: err.message });
      onStep({ phase: 'gigs', status: 'failed', message: `${name}: ${err.message}` });
      continue;
    }

    let kept = 0;
    let fresh = 0;
    for (const g of gigs) {
      if (!g.url || !g.title) continue;
      const { relevance, roles } = scoreGig(g);
      if (relevance < 25) continue;
      kept += 1;

      const meta = { ...g.meta, usdMin: toUsd(g, g.rateMin), usdMax: toUsd(g, g.rateMax) };
      if (g.salaryText) meta.salary = g.salaryText;
      if (g.eligible?.length) meta.eligible = g.eligible;

      const row = await one(
        `INSERT INTO jobs (company_id, company_name, title, url, location, source, description,
                           no_dsa, posted_at, relevance, matched_roles, ats, external_id, seen_at,
                           engagement, rate_min, rate_max, rate_unit, currency, skills, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$10,$6,$11,now(),$12,$13,$14,$15,$16,$17,$18)
         ON CONFLICT (url) DO UPDATE SET
           title = EXCLUDED.title, description = EXCLUDED.description,
           location = EXCLUDED.location, relevance = EXCLUDED.relevance,
           matched_roles = EXCLUDED.matched_roles,
           posted_at = COALESCE(EXCLUDED.posted_at, jobs.posted_at),
           rate_min = EXCLUDED.rate_min, rate_max = EXCLUDED.rate_max,
           rate_unit = EXCLUDED.rate_unit, currency = EXCLUDED.currency,
           skills = EXCLUDED.skills, meta = EXCLUDED.meta,
           engagement = EXCLUDED.engagement,
           seen_at = now(), closed_at = NULL
         RETURNING (xmax = 0) AS inserted, dismissed`,
        [
          g.platformId && platforms.has(g.platformId) ? g.platformId : null,
          g.company || '', g.title, g.url, g.location || '', name, g.description || '',
          g.postedAt, relevance, roles, g.externalId || null,
          g.engagement, g.rateMin, g.rateMax, g.rateUnit, g.currency,
          (g.skills || []).slice(0, 15), JSON.stringify(meta),
        ],
      );
      seen += 1;
      if (row?.inserted && !row.dismissed) { added += 1; fresh += 1; }
    }

    detail.push({ source: name, fetched: gigs.length, kept, new: fresh });
    onStep({
      phase: 'gigs', status: 'ok',
      message: `${name}: ${gigs.length} open, ${kept} relevant to you, ${fresh} new`,
    });
  }

  // A gig's search ranking moves around between runs, so "not returned this
  // time" is not the same as "filled". Close only what has gone unseen for
  // three days, and never touch a source that failed this run.
  const okSources = detail.filter((d) => !d.error).map((d) => d.source);
  const closedRes = okSources.length
    ? await query(
      `UPDATE jobs SET closed_at = now()
       WHERE closed_at IS NULL AND source = ANY($1::text[])
         AND seen_at < now() - interval '3 days'`,
      [okSources],
    )
    : { rowCount: 0 };

  await query(
    `UPDATE agent_runs SET status = $2, companies = $3, jobs_seen = $4, jobs_new = $5,
       jobs_closed = $6, errors = $7, detail = $8, finished_at = now(),
       error = $9
     WHERE id = $1`,
    [
      run.id, okSources.length ? 'done' : 'error', names.length, seen, added,
      closedRes.rowCount || 0, JSON.stringify(errors), JSON.stringify(detail),
      okSources.length ? null : 'Every gig source failed',
    ],
  );

  return { runId: run.id, sources: names.length, seen, added, closed: closedRes.rowCount || 0, detail, errors };
}
