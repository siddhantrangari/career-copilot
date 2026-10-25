import { many, one, query } from '../db/pool.js';
import { config } from '../config.js';
import { createJob, getJob } from './jobs.js';
import { buildDigest, runDigest } from './digest.js';

/**
 * Tools the Telegram assistant can call.
 *
 * They read and write the database directly, through the same tables and
 * rules the web app uses. Three rules hold for every tool:
 *   - Nothing is deleted. Removal stays a deliberate click in the web app.
 *   - Every write is audited in bot_actions with its before and after.
 *   - Long AI work runs as the same background jobs the web app starts; the
 *     bot watches the job and messages the result when it lands.
 */

export class ToolError extends Error {}

const STAGES = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];
const CONN_STATUSES = ['req', 'dm', 'reply', 'fu1', 'fu2', 'fu3', 'win', 'call', 'ref', 'ab'];
const CONN_TYPES = ['peer', 'hm', 'hr', 'indian', 'other'];
const ROUNDS = ['any', 'screening', 'technical', 'manager', 'behavioural', 'win-defence'];

const clip = (s, n) => {
  const t = String(s ?? '');
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const today = () => new Intl.DateTimeFormat('en-IN', {
  timeZone: config.digest.timeZone, day: 'numeric', month: 'short',
}).format(new Date());

// ── Lookups ───────────────────────────────────────────────────────────

/**
 * Resolve "adyen", "Adyen", "property finder" to one company. Exact id or
 * name wins; otherwise a substring match, preferring tracked companies. More
 * than one plausible hit is an error listing them, so the model asks.
 */
async function findCompany(q) {
  const s = String(q || '').trim();
  if (!s) throw new ToolError('company is required');
  const exact = await one(
    `SELECT c.*, (t.company_id IS NOT NULL) AS tracked FROM companies c
     LEFT JOIN tracked_companies t ON t.company_id = c.id
     WHERE c.id = $1 OR lower(c.name) = lower($1) LIMIT 1`,
    [s],
  );
  if (exact) return exact;
  const hits = await many(
    `SELECT c.*, (t.company_id IS NOT NULL) AS tracked FROM companies c
     LEFT JOIN tracked_companies t ON t.company_id = c.id
     WHERE c.name ILIKE '%' || $1 || '%' OR c.id ILIKE '%' || $1 || '%'
     ORDER BY (t.company_id IS NOT NULL) DESC, length(c.name) LIMIT 8`,
    [s],
  );
  if (hits.length === 1) return hits[0];
  const tracked = hits.filter((h) => h.tracked);
  if (tracked.length === 1) return tracked[0];
  if (!hits.length) throw new ToolError(`No company matches "${s}". Use find_companies, or add_company to add it.`);
  throw new ToolError(`"${s}" matches several companies: ${hits.map((h) => `${h.name} (${h.id})`).join(', ')}. Ask which one.`);
}

/** Roles live as JSON inside tracked_companies.notes, exactly as the web app stores them. */
function splitNotes(notes) {
  const raw = String(notes || '');
  const m = raw.match(/<!--CC_ROLES:([\s\S]*?)-->/);
  let roles = [];
  if (m) {
    try { roles = JSON.parse(m[1]); } catch { roles = []; }
  }
  return { roles: Array.isArray(roles) ? roles : [], text: raw.replace(/<!--CC_ROLES:[\s\S]*?-->/g, '').trim() };
}

function joinNotes(text, roles) {
  const body = String(text || '').trim();
  if (!roles.length) return body;
  return `${body}${body ? '\n\n' : ''}<!--CC_ROLES:${JSON.stringify(roles)}-->`;
}

/** A role summary small enough to hand the model — no resume or JD bodies. */
function roleView(r) {
  return {
    id: r.id, title: r.title, stage: r.stage || 'new', primary: !!r.isPrimary,
    appliedAt: r.appliedAt || undefined,
    interviewAt: r.interviewAt || undefined,
    pay: r.pay || undefined,
    jobLink: r.jobLink || undefined,
    outreach: r.outreachSent || undefined,
    resumeScore: r.tailoredResumeScore || undefined,
    hasJd: Boolean(r.jdText),
  };
}

function findRole(roles, q) {
  if (!roles.length) return null;
  if (!q) return roles.find((r) => r.isPrimary) || (roles.length === 1 ? roles[0] : null);
  const s = String(q).toLowerCase();
  return roles.find((r) => r.id === q)
    || roles.find((r) => (r.title || '').toLowerCase() === s)
    || roles.find((r) => (r.title || '').toLowerCase().includes(s))
    || null;
}

/** "2026-10-28 11:15" or "2026-10-28T11:15" in IST → ISO instant. */
function istToIso(value) {
  const m = String(value || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/);
  if (!m) throw new ToolError('Use "YYYY-MM-DD HH:mm" in IST for the interview time, e.g. "2026-10-28 15:30".');
  const [, y, mo, d, h, mi] = m.map(Number);
  // IST is UTC+5:30 with no DST.
  return new Date(Date.UTC(y, mo - 1, d, h - 5, mi - 30)).toISOString();
}

async function tracking(companyId) {
  return one('SELECT * FROM tracked_companies WHERE company_id = $1', [companyId]);
}

async function audit(tool, args, companyId, before, after, error) {
  try {
    await query(
      `INSERT INTO bot_actions (tool, args, company_id, before, after, ok, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [tool, JSON.stringify(args || {}), companyId || null,
        before === undefined ? null : JSON.stringify(before),
        after === undefined ? null : JSON.stringify(after), !error, error || null],
    );
  } catch (err) {
    console.error('[bot] audit failed:', err.message);
  }
}

/** Make sure a company is tracked; returns the tracking row. */
async function ensureTracked(companyId, stage = 'new') {
  await query(
    `INSERT INTO tracked_companies (company_id, stage) VALUES ($1, $2)
     ON CONFLICT (company_id) DO NOTHING`,
    [companyId, stage],
  );
  return tracking(companyId);
}

// ── Read tools ────────────────────────────────────────────────────────

async function getOverview() {
  const totals = await one(`
    SELECT (SELECT count(*) FROM companies)::int AS companies,
           (SELECT count(*) FROM tracked_companies)::int AS tracked,
           (SELECT count(*) FROM connections)::int AS contacts,
           (SELECT count(*) FROM win_docs)::int AS win_docs,
           (SELECT count(*) FROM resume_versions)::int AS tailored_resumes,
           (SELECT count(*) FROM interview_preps)::int AS interview_preps,
           (SELECT count(*) FROM interview_sessions WHERE status = 'finished')::int AS mock_interviews,
           (SELECT count(*) FROM jobs WHERE COALESCE(engagement,'fte')='fte' AND closed_at IS NULL AND NOT dismissed AND relevance >= 60)::int AS open_matching_jobs,
           (SELECT count(*) FROM jobs WHERE COALESCE(engagement,'fte')='fte' AND closed_at IS NULL AND NOT dismissed AND relevance >= 60
              AND COALESCE(posted_at, discovered_at) > now() - interval '72 hours')::int AS new_jobs_72h`);
  const byStage = await many('SELECT stage, count(*)::int AS n FROM tracked_companies GROUP BY stage ORDER BY n DESC');
  const lastScan = await one(
    `SELECT finished_at, jobs_new, jobs_seen FROM agent_runs
     WHERE kind = 'job-discovery' AND status = 'done' ORDER BY finished_at DESC LIMIT 1`,
  );
  const lastDigest = await one('SELECT status, created_at, counts FROM digest_runs ORDER BY created_at DESC LIMIT 1');
  return {
    totals, pipelineByStage: Object.fromEntries(byStage.map((r) => [r.stage, r.n])),
    lastJobScan: lastScan, lastDigest,
  };
}

async function listPipeline({ stage, query: q } = {}) {
  if (stage && !STAGES.includes(stage)) throw new ToolError(`stage must be one of ${STAGES.join(', ')}`);
  const rows = await many(
    `SELECT t.company_id, t.stage, t.notes, t.created_at, t.activity_at, c.name,
            (SELECT count(*) FROM connections n WHERE n.company_id = t.company_id)::int AS contacts
     FROM tracked_companies t JOIN companies c ON c.id = t.company_id
     WHERE ($1::text IS NULL OR t.stage = $1) AND ($2::text IS NULL OR c.name ILIKE '%' || $2 || '%')
     ORDER BY array_position($3::text[], t.stage), c.name`,
    [stage || null, q || null, STAGES],
  );
  return {
    count: rows.length,
    // One line per company keeps a 40-company pipeline to a few hundred tokens.
    companies: rows.map((r) => {
      const roles = splitNotes(r.notes).roles.map((x) => `${x.title} (${x.stage || 'new'}${x.interviewAt ? `, interview ${x.interviewAt}` : ''})`);
      return `${r.name} [${r.stage}]${r.contacts ? ` ${r.contacts} contacts` : ''}${roles.length ? ` — ${roles.join('; ')}` : ''}`;
    }),
  };
}

async function getCompany({ company }) {
  const c = await findCompany(company);
  const t = await tracking(c.id);
  const { roles, text } = splitNotes(t?.notes);
  const [contacts, resumes, winDocs, preps, mocks, jobs] = await Promise.all([
    many(`SELECT name, role, type, status, linkedin_url, notes FROM connections WHERE company_id = $1 ORDER BY position, created_at`, [c.id]),
    many(`SELECT id, job_title, match_score, created_at FROM resume_versions WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5`, [c.id]),
    many(`SELECT id, contact_name, created_at FROM win_docs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 3`, [c.id]),
    many(`SELECT id, role_title, round, created_at FROM interview_preps WHERE company_id = $1 ORDER BY created_at DESC LIMIT 3`, [c.id]),
    many(`SELECT id, round, status, report->>'readiness' AS readiness, started_at FROM interview_sessions WHERE company_id = $1 ORDER BY started_at DESC LIMIT 3`, [c.id]),
    many(`SELECT id, title, location, fit_score AS fit, url, why_role, COALESCE(posted_at, discovered_at) AS posted FROM jobs
          WHERE company_id = $1 AND closed_at IS NULL AND NOT dismissed ORDER BY COALESCE(fit_score, LEAST(relevance, 70)) DESC, posted_at DESC NULLS LAST LIMIT 6`, [c.id]),
  ]);
  const r = c.research || null;
  return {
    id: c.id, name: c.name, region: c.region, pay: c.pay, website: c.website || undefined,
    description: clip(c.description, 400), applyUrl: c.apply_url || undefined,
    dismissed: c.dismissed || false,
    whyThisCompany: (await one('SELECT why FROM company_why WHERE key = lower(trim($1))', [c.name]))?.why,
    tracking: t ? {
      stage: t.stage, winStatus: t.win_status, outreachLog: clip(t.msgs, 600) || undefined,
      notes: clip(text, 600) || undefined, jobLink: t.job_link || undefined,
      lastActivity: t.activity_at || undefined, trackedSince: t.created_at,
    } : null,
    roles: roles.map(roleView),
    contacts,
    research: r ? {
      lastResearched: r.lastResearched, hook: r.hookSentence,
      challenges: (r.challenges || []).slice(0, 5).map((x) => (typeof x === 'string' ? x : x.title || x.challenge || JSON.stringify(x))),
    } : null,
    documents: { resumes, winDocs, interviewPreps: preps, mockInterviews: mocks },
    openJobs: jobs,
    webUrl: `${config.digest.appUrl}/?tab=pipeline`,
  };
}

async function findCompanies({ query: q, region, trackedOnly, limit = 15 } = {}) {
  const rows = await many(
    `SELECT c.id, c.name, c.region, c.roles, c.pay, c.freelance, c.dismissed, t.stage
     FROM companies c LEFT JOIN tracked_companies t ON t.company_id = c.id
     WHERE ($1::text IS NULL OR c.name ILIKE '%' || $1 || '%' OR c.description ILIKE '%' || $1 || '%')
       AND ($2::text IS NULL OR c.region = $2)
       AND (NOT $3 OR t.company_id IS NOT NULL)
     ORDER BY (t.company_id IS NOT NULL) DESC, c.name LIMIT $4`,
    [q || null, region || null, Boolean(trackedOnly), Math.min(Number(limit) || 15, 40)],
  );
  return { count: rows.length, companies: rows };
}

// ── Job search: words, synonyms, places ───────────────────────────────
//
// The first version matched the whole query as one substring of the title,
// location or description, so "AI Engineer Bangalore" matched nothing — no
// single field contains that phrase — and Bangalore never matched
// "Bengaluru". Now the query is split into alternatives ("AI engineer or
// fullstack"), each alternative into words, every word must appear in the
// title (with synonyms), and place names go to a separate location filter.

const PLACES = [
  { words: ['bangalore', 'bengaluru', 'bengalore', 'blr'], re: 'bangalore|bengaluru|bengalore' },
  { words: ['hyderabad'], re: 'hyderabad' },
  { words: ['pune'], re: 'pune' },
  { words: ['mumbai', 'bombay'], re: 'mumbai|bombay' },
  { words: ['delhi', 'ncr', 'gurgaon', 'gurugram', 'noida'], re: 'delhi|ncr|gurgaon|gurugram|noida' },
  { words: ['chennai'], re: 'chennai' },
  // In India he targets Bangalore or remote only (other cities score 0 in discovery).
  { words: ['india', 'indian'], re: 'india|bangalore|bengaluru|bengalore' },
  { words: ['remote'], re: 'remote|anywhere|worldwide' },
  { words: ['europe', 'eu', 'emea'], re: 'europe|emea|\\meu\\M|london|berlin|amsterdam|paris|dublin|madrid|lisbon|munich|zurich|stockholm|warsaw' },
  { words: ['uae', 'dubai', 'gulf'], re: 'dubai|abu dhabi|uae|united arab emirates|riyadh|saudi|doha|qatar' },
  { words: ['uk', 'london'], re: 'london|united kingdom|\\muk\\M' },
  { words: ['us', 'usa'], re: 'united states|\\musa?\\M|new york|san francisco|seattle|austin|boston' },
];

const TITLE_SYNONYMS = {
  ai: 'ai|ml|llm|genai|gen ai|machine learning|artificial intelligence|applied ai',
  ml: 'ml|machine learning|ai|llm',
  llm: 'llm|genai|gen ai|ai',
  genai: 'genai|gen ai|llm|ai',
  fullstack: 'full[- ]?stack',
  'full-stack': 'full[- ]?stack',
  frontend: 'front[- ]?end',
  backend: 'back[- ]?end',
  engineer: 'engineer|engineering|developer|swe',
  engineers: 'engineer|engineering|developer|swe',
  developer: 'developer|engineer|swe',
  swe: 'swe|software engineer|software developer',
  fde: 'forward[- ]deployed|fde',
  sr: 'sr\\.?|senior',
  senior: 'senior|sr\\.?',
};

// Words that describe the request, not the job title.
const NOISE = new Set(['job', 'jobs', 'role', 'roles', 'opening', 'openings', 'position', 'positions', 'vacancy',
  'vacancies', 'open', 'recent', 'new', 'latest', 'posted', 'any', 'the', 'a', 'an', 'for', 'in', 'at', 'of', 'with',
  'and', 'me', 'my', 'show', 'find', 'list', 'this', 'week', 'month', 'today', 'based', 'onsite', 'hybrid', 'links']);

const reEscape = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Turn free text into title patterns (OR of ANDs) and a location pattern.
 * Exported for tests. "full stack" is joined first so it stays one idea.
 */
export function parseJobQuery(query = '', location = '') {
  const placeRes = new Set();
  const addPlace = (word) => {
    const p = PLACES.find((x) => x.words.includes(word));
    if (p) { placeRes.add(p.re); return true; }
    return false;
  };
  const locText = String(location || '').toLowerCase();
  if (locText) {
    const words = locText.split(/[^a-z]+/).filter(Boolean);
    const known = words.filter(addPlace);
    if (!known.length) placeRes.add(reEscape(locText.trim()));
  }

  const alternatives = String(query || '').toLowerCase()
    .replace(/\bfull\s+stack\b/g, 'fullstack').replace(/\bfront\s+end\b/g, 'frontend').replace(/\bback\s+end\b/g, 'backend')
    .replace(/\bforward\s+deployed\b/g, 'fde').replace(/\bmachine\s+learning\b/g, 'ml')
    .split(/\s+or\s+|[,/|]/)
    .map((alt) => alt.split(/[^a-z0-9+#.-]+/).map((w) => w.replace(/^[.-]+|[.-]+$/g, '')).filter(Boolean)
      .filter((w) => !NOISE.has(w) && !addPlace(w))
      .map((w) => `\\m(${TITLE_SYNONYMS[w] || reEscape(w)})\\M`))
    .filter((words) => words.length);

  return {
    titleAlternatives: alternatives,
    locationRe: placeRes.size ? [...placeRes].join('|') : null,
  };
}

async function searchJobs({
  query: q, location, company, minMatch, postedWithinDays = 7, favouritesOnly = false, limit = 5,
} = {}) {
  let companyId = null;
  if (company) companyId = (await findCompany(company)).id;
  const { titleAlternatives, locationRe } = parseJobQuery(q, location);
  // Words already narrow the search, so the relevance floor drops when present.
  const floor = Number.isFinite(Number(minMatch)) && minMatch !== undefined ? Number(minMatch) : (titleAlternatives.length ? 40 : 60);
  const days = Math.min(Number(postedWithinDays) || 7, 120);

  const run = async ({ withTitle = true, withinDays = days, count = false } = {}) => {
    const params = [floor, withinDays, companyId, Boolean(favouritesOnly), locationRe];
    let titleSql = '';
    if (withTitle && titleAlternatives.length) {
      const ors = titleAlternatives.map((words) => `(${words.map((w) => {
        params.push(w);
        return `j.title ~* $${params.length}`;
      }).join(' AND ')})`);
      titleSql = `AND (${ors.join(' OR ')})`;
    }
    const where = `
      WHERE COALESCE(j.engagement,'fte') = 'fte' AND j.closed_at IS NULL AND NOT j.dismissed
        AND j.relevance >= $1
        AND COALESCE(j.posted_at, j.discovered_at) > now() - make_interval(days => $2::int)
        AND ($3::text IS NULL OR j.company_id = $3)
        AND (NOT $4 OR j.favourite)
        AND ($5::text IS NULL OR j.location ~* $5)
        ${titleSql}`;
    const from = `FROM jobs j LEFT JOIN companies c ON c.id = j.company_id LEFT JOIN tracked_companies t ON t.company_id = j.company_id`;
    if (count) return (await one(`SELECT count(*)::int AS n ${from} ${where}`, params)).n;
    params.push(Math.min(Number(limit) || 5, 25));
    return many(
      `SELECT j.id, j.title, COALESCE(NULLIF(c.name,''), j.company_name) AS company, j.location, j.fit_score AS fit, j.relevance AS title_match,
              j.url, j.favourite, j.no_dsa, COALESCE(j.posted_at, j.discovered_at) AS posted, t.stage AS tracked_stage,
              j.why_role AS why_role, (SELECT w.why FROM company_why w WHERE w.key = lower(trim(COALESCE(NULLIF(c.name,''), j.company_name)))) AS why_company
       ${from} ${where}
       -- Best fit first among what matched, freshest breaking ties.
       ORDER BY j.favourite DESC, COALESCE(j.fit_score, LEAST(j.relevance, 70)) DESC, COALESCE(j.posted_at, j.discovered_at) DESC
       LIMIT $${params.length}`,
      params,
    );
  };

  const rows = await run();
  const total = rows.length ? await run({ count: true }) : 0;
  const result = {
    searched: { query: q || undefined, location: location || undefined, postedWithinDays: days, minMatch: floor },
    count: rows.length,
    totalMatching: total,
    jobs: rows.map(({ no_dsa: noDsa, ...j }) => ({ ...j, dsaSignals: noDsa === false })),
  };
  // An empty result carries the evidence for what to try next, so the
  // answer is "0 for X, but N in that place / M over 30 days", not a guess.
  if (!rows.length) {
    result.nearby = {
      sameWindowAnyTitle: locationRe ? await run({ withTitle: false, count: true }) : undefined,
      last30Days: days < 30 ? await run({ withinDays: 30, count: true }) : undefined,
    };
  }
  return result;
}

async function searchGigs({ query: q, limit = 10 } = {}) {
  const rows = await many(
    `SELECT id, title, company_name AS client, engagement, rate_min, rate_max, rate_unit, currency, url, source,
            COALESCE(posted_at, discovered_at) AS posted, app_status
     FROM jobs WHERE engagement IN ('freelance','contract','part-time') AND closed_at IS NULL AND NOT dismissed
       AND ($1::text IS NULL OR title ILIKE '%' || $1 || '%' OR description ILIKE '%' || $1 || '%')
     ORDER BY COALESCE(posted_at, discovered_at) DESC LIMIT $2`,
    [q || null, Math.min(Number(limit) || 10, 25)],
  );
  return { count: rows.length, gigs: rows };
}

async function getFollowupsAndInterviews() {
  const d = await buildDigest();
  return {
    interviewsNext7Days: d.interviews.upcoming,
    atInterviewStageWithoutDate: d.interviews.undated,
    followUpsDue: d.followUps.items, followUpsTotal: d.followUps.total,
    newJobsNotYetSent: d.jobs.items.map((j) => ({ id: j.id, title: j.title, company: j.company, match: j.relevance, url: j.url })),
  };
}

async function listDocuments({ company, type } = {}) {
  const companyId = company ? (await findCompany(company)).id : null;
  const want = (t) => !type || type === t;
  const out = {};
  if (want('resume')) {
    out.resumes = await many(
      `SELECT id, company_name, job_title, match_score, created_at FROM resume_versions
       WHERE ($1::text IS NULL OR company_id = $1) ORDER BY created_at DESC LIMIT 10`, [companyId]);
  }
  if (want('win_doc')) {
    out.winDocs = await many(
      `SELECT w.id, c.name AS company, w.contact_name, w.created_at FROM win_docs w JOIN companies c ON c.id = w.company_id
       WHERE ($1::text IS NULL OR w.company_id = $1) ORDER BY w.created_at DESC LIMIT 10`, [companyId]);
  }
  if (want('interview_prep')) {
    out.interviewPreps = await many(
      `SELECT id, company_name, role_title, round, created_at FROM interview_preps
       WHERE ($1::text IS NULL OR company_id = $1) ORDER BY created_at DESC LIMIT 10`, [companyId]);
  }
  if (want('mock_interview')) {
    out.mockInterviews = await many(
      `SELECT id, company_name, round, status, report->>'readiness' AS readiness, started_at FROM interview_sessions
       WHERE ($1::text IS NULL OR company_id = $1) ORDER BY started_at DESC LIMIT 10`, [companyId]);
  }
  return out;
}

/** Turn a JSON document (prep guide, mock report) into readable markdown. */
function jsonToMarkdown(value, depth = 0) {
  if (value == null) return '';
  if (typeof value !== 'object') return String(value);
  const pad = '  '.repeat(depth);
  if (Array.isArray(value)) {
    return value.map((v) => (typeof v === 'object' ? `${pad}- ${jsonToMarkdown(v, depth + 1).trim()}` : `${pad}- ${v}`)).join('\n');
  }
  return Object.entries(value).map(([k, v]) => {
    const label = k.replace(/([A-Z])/g, ' $1').replace(/^./, (ch) => ch.toUpperCase());
    if (v && typeof v === 'object') return `${depth ? pad : '## '}${depth ? `**${label}:**` : label}\n${jsonToMarkdown(v, depth + 1)}`;
    return `${pad}**${label}:** ${v}`;
  }).join('\n\n');
}

const slug = (s) => String(s || 'doc').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'doc';

async function getDocument({ type, id, format = 'file' }) {
  if (!id) throw new ToolError('id is required — get it from list_documents or get_company');
  let title; let markdown; let file = null;
  if (type === 'resume') {
    const r = await one('SELECT * FROM resume_versions WHERE id = $1', [id]);
    if (!r) throw new ToolError('Resume not found');
    title = `Resume — ${r.company_name} ${r.job_title}`.trim();
    markdown = r.tailored_text;
  } else if (type === 'win_doc') {
    const w = await one('SELECT * FROM win_docs WHERE id = $1', [id]);
    if (!w) throw new ToolError('WIN doc not found');
    const c = await one('SELECT id, name FROM companies WHERE id = $1', [w.company_id]);
    title = `WIN doc — ${c?.name || ''}`;
    markdown = w.markdown;
    if (format === 'pptx') {
      const { buildWinDocPptx } = await import('./pptx.js');
      const { resolveBrand } = await import('./brand.js');
      const brand = await resolveBrand(w.company_id).catch(() => null);
      file = {
        filename: `win-doc-${slug(c?.name)}.pptx`,
        content: await buildWinDocPptx({ winDoc: w, company: c, brand }),
        mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    }
  } else if (type === 'interview_prep') {
    const p = await one('SELECT * FROM interview_preps WHERE id = $1', [id]);
    if (!p) throw new ToolError('Interview prep not found');
    title = `Interview prep — ${p.company_name} ${p.role_title} (${p.round})`;
    markdown = jsonToMarkdown(p.guide);
  } else if (type === 'mock_interview') {
    const s = await one('SELECT * FROM interview_sessions WHERE id = $1', [id]);
    if (!s) throw new ToolError('Mock interview not found');
    title = `Mock interview report — ${s.company_name} ${s.round}`;
    markdown = s.report ? jsonToMarkdown(s.report) : 'This mock interview has no report yet.';
  } else {
    throw new ToolError('type must be resume, win_doc, interview_prep or mock_interview');
  }
  if (format === 'text') return { title, text: clip(markdown, 3500) };
  file = file || { filename: `${slug(title)}.md`, content: `# ${title}\n\n${markdown || ''}`, mime: 'text/markdown' };
  return { title, sent: 'as a file attachment', file: { ...file, caption: title } };
}

/** Files for a finished document: the markdown, plus the slide deck for a WIN doc. */
export async function documentFiles(type, id) {
  const files = [];
  const md = await getDocument({ type, id, format: 'file' });
  if (md.file) files.push(md.file);
  if (type === 'win_doc') {
    const deck = await getDocument({ type, id, format: 'pptx' });
    if (deck.file) files.push(deck.file);
  }
  return files;
}

async function getProfile() {
  const p = await one('SELECT full_name, headline, email, location, linkedin, website, summary, target_roles FROM profile LIMIT 1');
  const achievements = await many('SELECT id, title, company, result FROM achievements ORDER BY created_at');
  return { profile: p, achievements };
}

async function getTask({ taskId }) {
  const j = await getJob(taskId);
  if (!j) throw new ToolError('Task not found');
  return { id: j.id, kind: j.kind, status: j.status, error: j.error, elapsedSeconds: j.elapsed_seconds, lastStep: (j.steps || []).slice(-1)[0] };
}

// ── Write tools (audited, never delete) ───────────────────────────────

async function trackCompany(args) {
  const { company, stage = 'interested' } = args;
  if (!STAGES.includes(stage)) throw new ToolError(`stage must be one of ${STAGES.join(', ')}`);
  const c = await findCompany(company);
  const before = await tracking(c.id);
  if (before) return { company: c.name, alreadyTracked: true, stage: before.stage, note: 'Use set_stage to change the stage.' };
  const after = await ensureTracked(c.id, stage);
  await audit('track_company', args, c.id, null, { stage: after.stage });
  return { company: c.name, changed: `now tracked at stage "${after.stage}"` };
}

async function setStage(args) {
  const { company, stage, role } = args;
  if (!STAGES.includes(stage)) throw new ToolError(`stage must be one of ${STAGES.join(', ')}`);
  const c = await findCompany(company);
  const t = await ensureTracked(c.id);
  const { roles, text } = splitNotes(t.notes);
  const changes = [];
  let companyStage = t.stage;

  if (roles.length) {
    const r = findRole(roles, role);
    if (role && !r) throw new ToolError(`No role "${role}" at ${c.name}. Roles: ${roles.map((x) => x.title).join(', ')}`);
    const target = r || roles.find((x) => x.isPrimary) || roles[0];
    changes.push(`role "${target.title}": ${target.stage || 'new'} → ${stage}`);
    target.stage = stage;
    if (stage === 'applied' && !target.appliedAt) target.appliedAt = today();
    // The web app mirrors the primary role's stage onto the company.
    const primary = roles.find((x) => x.isPrimary) || roles[0];
    if (primary === target) companyStage = stage;
  } else {
    companyStage = stage;
  }
  if (companyStage !== t.stage) changes.push(`company stage: ${t.stage} → ${companyStage}`);

  await query('UPDATE tracked_companies SET stage = $2, notes = $3, updated_at = now() WHERE company_id = $1',
    [c.id, companyStage, joinNotes(text, roles)]);
  await audit('set_stage', args, c.id, { stage: t.stage }, { stage: companyStage, changes });
  return { company: c.name, changed: changes.length ? changes : ['no change — already at that stage'] };
}

async function addRole(args) {
  const { company, title, jobLink, stage = 'interested', pay } = args;
  if (!title) throw new ToolError('title is required');
  if (!STAGES.includes(stage)) throw new ToolError(`stage must be one of ${STAGES.join(', ')}`);
  const c = await findCompany(company);
  const t = await ensureTracked(c.id, stage);
  const { roles, text } = splitNotes(t.notes);
  if (findRole(roles, title)?.title?.toLowerCase() === title.toLowerCase()) {
    throw new ToolError(`${c.name} already has a role called "${title}"`);
  }
  const role = {
    id: `role-${Date.now()}`, title, stage, pay: pay || '', jobLink: jobLink || '', jdText: '',
    appliedAt: stage === 'applied' ? today() : '', interviewAt: '', outreachSent: '', notes: '',
    isPrimary: roles.length === 0,
  };
  roles.push(role);
  await query('UPDATE tracked_companies SET notes = $2, stage = CASE WHEN $3 THEN $4 ELSE stage END, updated_at = now() WHERE company_id = $1',
    [c.id, joinNotes(text, roles), role.isPrimary, stage]);
  await audit('add_role', args, c.id, null, roleView(role));
  return { company: c.name, changed: `added role "${title}" at stage ${stage}${role.isPrimary ? ' (primary)' : ''}` };
}

async function updateRole(args) {
  const { company, role, appliedAt, interviewAtIst, clearInterview, pay, jobLink, outreachSent, notes } = args;
  const c = await findCompany(company);
  const t = await tracking(c.id);
  if (!t) throw new ToolError(`${c.name} is not tracked yet — track_company first.`);
  const { roles, text } = splitNotes(t.notes);
  const r = findRole(roles, role);
  if (!r) {
    throw new ToolError(roles.length
      ? `Which role? ${c.name} has: ${roles.map((x) => x.title).join(', ')}`
      : `${c.name} has no roles yet — add_role first.`);
  }
  const before = roleView(r);
  if (appliedAt !== undefined) r.appliedAt = appliedAt;
  if (interviewAtIst) r.interviewAt = istToIso(interviewAtIst);
  if (clearInterview) r.interviewAt = '';
  if (pay !== undefined) r.pay = pay;
  if (jobLink !== undefined) r.jobLink = jobLink;
  if (outreachSent !== undefined) r.outreachSent = outreachSent;
  if (notes !== undefined) r.notes = notes;
  const after = roleView(r);
  await query('UPDATE tracked_companies SET notes = $2, updated_at = now() WHERE company_id = $1', [c.id, joinNotes(text, roles)]);
  await audit('update_role', args, c.id, before, after);
  const changed = Object.keys(after).filter((k) => JSON.stringify(after[k]) !== JSON.stringify(before[k]))
    .map((k) => `${k}: ${before[k] ?? '—'} → ${after[k] ?? '—'}`);
  return { company: c.name, role: r.title, changed: changed.length ? changed : ['no change'] };
}

async function addNote(args) {
  const { company, text: note } = args;
  if (!note) throw new ToolError('text is required');
  const c = await findCompany(company);
  const t = await ensureTracked(c.id);
  const { roles, text } = splitNotes(t.notes);
  const updated = `${text}${text ? '\n' : ''}[${today()}] ${note}`;
  await query('UPDATE tracked_companies SET notes = $2, updated_at = now() WHERE company_id = $1', [c.id, joinNotes(updated, roles)]);
  await audit('add_note', args, c.id, null, { appended: note });
  return { company: c.name, changed: `note added: "${note}"` };
}

async function logOutreach(args) {
  const { company, text: entry } = args;
  if (!entry) throw new ToolError('text is required');
  const c = await findCompany(company);
  const t = await ensureTracked(c.id, 'networking');
  const msgs = `${t.msgs || ''}${t.msgs ? '\n' : ''}[${today()}] ${entry}`;
  await query('UPDATE tracked_companies SET msgs = $2, updated_at = now() WHERE company_id = $1', [c.id, msgs]);
  await audit('log_outreach', args, c.id, null, { appended: entry });
  return { company: c.name, changed: `outreach logged: "${entry}"` };
}

async function addContact(args) {
  const { company, name, role = '', type = 'peer', linkedinUrl = '', status = 'req', notes = '' } = args;
  if (!name) throw new ToolError('name is required');
  if (!CONN_TYPES.includes(type)) throw new ToolError(`type must be one of ${CONN_TYPES.join(', ')}`);
  if (!CONN_STATUSES.includes(status)) throw new ToolError(`status must be one of ${CONN_STATUSES.join(', ')}`);
  const c = await findCompany(company);
  await ensureTracked(c.id, 'networking');
  const dupe = await one(
    `SELECT id FROM connections WHERE company_id = $1 AND (lower(name) = lower($2) OR ($3 <> '' AND linkedin_url = $3))`,
    [c.id, name, linkedinUrl],
  );
  if (dupe) throw new ToolError(`${name} is already a contact at ${c.name} — use update_contact.`);
  const pos = await one('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM connections WHERE company_id = $1', [c.id]);
  await query(
    `INSERT INTO connections (company_id, position, name, role, type, linkedin_url, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [c.id, pos.p, name, role, type, linkedinUrl, status, notes],
  );
  await audit('add_contact', args, c.id, null, { name, role, type, status });
  return { company: c.name, changed: `added contact ${name}${role ? ` (${role})` : ''}, status ${status}` };
}

async function updateContact(args) {
  const { company, contact, status, notes, role, linkedinUrl } = args;
  if (status && !CONN_STATUSES.includes(status)) throw new ToolError(`status must be one of ${CONN_STATUSES.join(', ')}`);
  const c = await findCompany(company);
  const hits = await many(
    `SELECT * FROM connections WHERE company_id = $1 AND name ILIKE '%' || $2 || '%' ORDER BY position`, [c.id, contact || ''],
  );
  if (!hits.length) throw new ToolError(`No contact matching "${contact}" at ${c.name}`);
  if (hits.length > 1) throw new ToolError(`Several contacts match: ${hits.map((h) => h.name).join(', ')}`);
  const before = hits[0];
  const after = await one(
    `UPDATE connections SET status = COALESCE($2, status), notes = COALESCE($3, notes),
       role = COALESCE($4, role), linkedin_url = COALESCE($5, linkedin_url), updated_at = now()
     WHERE id = $1 RETURNING name, status, notes, role, linkedin_url`,
    [before.id, status || null, notes ?? null, role ?? null, linkedinUrl ?? null],
  );
  await audit('update_contact', args, c.id,
    { status: before.status, notes: before.notes, role: before.role }, after);
  return { company: c.name, contact: after.name, changed: `status ${before.status} → ${after.status}${notes !== undefined ? ', notes updated' : ''}` };
}

async function setJobFlag(args) {
  const { jobId, favourite, notForMe } = args;
  const job = await one('SELECT id, title, company_id, url, favourite, dismissed FROM jobs WHERE id = $1', [jobId]);
  if (!job) throw new ToolError('Job not found — use search_jobs to get the id.');
  const after = await one(
    `UPDATE jobs SET favourite = COALESCE($2, favourite),
       dismissed = COALESCE($3, dismissed),
       dismissed_at = CASE WHEN $3 IS TRUE THEN now() WHEN $3 IS FALSE THEN NULL ELSE dismissed_at END
     WHERE id = $1 RETURNING favourite, dismissed`,
    [job.id, favourite ?? null, notForMe ?? null],
  );
  // Same rule as the web app: favouriting a role starts tracking its company.
  if (after.favourite && job.company_id) {
    await query(
      `INSERT INTO tracked_companies (company_id, stage, job_link) VALUES ($1, 'new', $2)
       ON CONFLICT (company_id) DO UPDATE SET job_link = CASE WHEN tracked_companies.job_link = '' THEN EXCLUDED.job_link ELSE tracked_companies.job_link END`,
      [job.company_id, job.url],
    );
  }
  await audit('set_job_flag', args, job.company_id, { favourite: job.favourite, dismissed: job.dismissed }, after);
  return { job: job.title, changed: `favourite ${job.favourite} → ${after.favourite}, not-for-me ${job.dismissed} → ${after.dismissed}` };
}

async function addCompany(args) {
  const { name, website = '', region = 'global', roles = ['fs'], applyUrl = '', description = '' } = args;
  if (!name) throw new ToolError('name is required');
  const existing = await one('SELECT id, name FROM companies WHERE lower(name) = lower($1)', [name]);
  if (existing) throw new ToolError(`${existing.name} already exists (${existing.id}) — use track_company.`);
  const id = `c_${Date.now()}`;
  await query(
    `INSERT INTO companies (id, name, region, roles, description, apply_url, website, custom)
     VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
    [id, name, region, roles, description, applyUrl, website],
  );
  await ensureTracked(id, 'interested');
  await audit('add_company', args, id, null, { id, name });
  return { changed: `added ${name} (${id}) and started tracking it at "interested"` };
}

// ── AI tasks (background) ─────────────────────────────────────────────

const TASK_KINDS = {
  research: 'research',
  tailor_resume: 'tailor-resume',
  cover_letter: 'cover-letter',
  outreach_messages: 'generate-messages',
  cold_email: 'cold-email',
  call_prep: 'call-prep',
  win_doc: 'generate-win-doc',
  interview_prep: 'interview-prep',
  linkedin_post: 'linkedin-post',
  job_scan: 'job-discovery',
  india_job_scan: 'india-discovery',
};

async function startAiTask(args) {
  const { task, company, role, jobDescription, instructions, contactName, problems, topic, round, force, confirmedByUser } = args;
  if (confirmedByUser !== true) {
    throw new ToolError('Not started: AI tasks cost money. Offer it and start only when he asks or says yes.');
  }
  const kind = TASK_KINDS[task];
  if (!kind) throw new ToolError(`task must be one of ${Object.keys(TASK_KINDS).join(', ')}`);
  if (round && !ROUNDS.includes(round)) throw new ToolError(`round must be one of ${ROUNDS.join(', ')}`);

  let c = null; let r = null; let t = null;
  if (!['linkedin_post', 'job_scan', 'india_job_scan'].includes(task)) {
    c = await findCompany(company);
    t = await tracking(c.id);
    r = findRole(splitNotes(t?.notes).roles, role);
  }
  const roleTitle = r?.title || role || '';
  // A tracked role already holds the JD (or its URL); use it unless one was given.
  const jd = jobDescription || r?.jdText || r?.jobLink || t?.jd || t?.job_link || '';
  if (['tailor_resume', 'cover_letter'].includes(task) && !jd) {
    throw new ToolError(`No job description for ${c.name}${roleTitle ? ` / ${roleTitle}` : ''}. Ask for the job URL or the JD text.`);
  }

  const payloads = {
    research: { companyId: c?.id, roleName: roleTitle, force: Boolean(force) },
    tailor_resume: { companyId: c?.id, companyName: c?.name, jobTitle: roleTitle, jobDescription: jd, instructions },
    cover_letter: { companyId: c?.id, companyName: c?.name, jobTitle: roleTitle, jobDescription: jd, instructions },
    outreach_messages: { companyId: c?.id, roleName: roleTitle, messageType: 'all' },
    cold_email: { companyId: c?.id, roleName: roleTitle, recipient: contactName },
    call_prep: { companyId: c?.id, contactName },
    win_doc: { companyId: c?.id, roleTitle, contactName, problems: Array.isArray(problems) ? problems : [] },
    interview_prep: { companyId: c?.id, roleTitle, round: round || 'any', jobDescription: jobDescription || r?.jdText || '' },
    linkedin_post: { topic },
    job_scan: {},
    india_job_scan: {},
  };
  if (task === 'linkedin_post' && !topic) throw new ToolError('topic is required for a LinkedIn post');

  const job = await createJob(kind, payloads[task]);
  await audit('start_ai_task', args, c?.id, null, { taskId: job.id, kind });
  return {
    taskId: job.id, task, company: c?.name, role: roleTitle || undefined,
    status: 'started — the result will be messaged automatically when it finishes',
    typicalDuration: { research: '~2 min', win_doc: '~2–3 min', interview_prep: '~1–2 min', job_scan: '~1–3 min' }[task] || '~30–90 s',
  };
}

async function webSearchLinks({ query: q = 'AI Engineer', location = 'Bangalore', period = 'week' } = {}) {
  const { googleBooleanLinks, portalSearchLinks } = await import('./search-links.js');
  return {
    note: 'Links for him to open — the portals and Google forbid automated reading.',
    google: googleBooleanLinks(q, location, period).map(({ name, url }) => ({ name, url })),
    portals: portalSearchLinks(q, location),
  };
}

/** Live Google Jobs search (SerpAPI, one search from the monthly quota), stored like any discovery. */
async function searchGoogleJobs({ query: q, location = 'Bangalore' } = {}) {
  if (!q) throw new ToolError('query is required, e.g. "AI Engineer"');
  const { googleJobsReady, runGoogleJobs } = await import('./google-jobs.js');
  if (!googleJobsReady()) throw new ToolError('Google Jobs is not configured (SERPAPI_KEY).');
  const remote = /remote/i.test(`${q} ${location}`);
  const where = remote || /india/i.test(location) && !/bangalore|bengaluru/i.test(location) ? 'India' : 'Bengaluru, Karnataka, India';
  const term = remote && !/remote/i.test(q) ? `Remote ${q}` : q;
  const run = await runGoogleJobs({ trigger: 'bot', queries: [{ q: term, location: where }] });
  if (run.blocked || !run.searches) {
    // Capped: no search was made. Links run in his own browser, so the
    // server sends nothing to Google.
    const { googleBooleanLinks } = await import('./search-links.js');
    return {
      limited: true,
      reason: `${['daily', 'weekly', 'monthly'].includes(run.blocked) ? `Google Jobs ${run.blocked} limit reached` : `Google Jobs paused (${run.blocked || 'limit reached'})`} — no search was made (${(await import('./google-jobs.js')).usageLine(run.usage)}).`,
      instead: 'Google boolean links for him to open:',
      links: googleBooleanLinks(q, remote ? 'remote india' : 'Bangalore', 'week').slice(0, 6).map(({ name, url }) => ({ name, url })),
    };
  }
  const found = await searchJobs({ query: q.replace(/remote/ig, '').trim(), location: remote ? 'remote' : 'Bangalore', postedWithinDays: 30, limit: 8 });
  const { usageLine } = await import('./google-jobs.js');
  return {
    searched: `${term} — ${where}`,
    newRolesStored: run.jobsNew,
    usage: usageLine(run.usage),
    note: 'New roles get their fit score and why line within 30 minutes.',
    jobs: found.jobs,
  };
}

async function getSearchUsage() {
  const { searchUsage, usageLine } = await import('./google-jobs.js');
  const u = await searchUsage();
  const recent = await many(
    `SELECT at, trigger, query, location, billed, results, ok FROM serp_calls ORDER BY at DESC LIMIT 10`,
  );
  return {
    usage: usageLine(u), searchesLeftToday: u.allowance, serpapiPlanLeft: u.planLeft, blockedBy: u.blockedBy,
    googleRequestsFromServer: 'none — searches go through SerpAPI; boolean links open in his browser',
    recentCalls: recent,
  };
}

async function sendDigestNow() {
  const { counts } = await runDigest({ trigger: 'manual' });
  return { sent: true, counts };
}

// ── Registry ──────────────────────────────────────────────────────────

// Tool definitions are re-sent with every request, so they are kept terse:
// a short description, plain parameter names, and enums only where the value
// set is closed. Every extra word here is paid for on every message.
const str = (description) => (description ? { type: 'string', description } : { type: 'string' });
const S = (properties, required = []) => ({ type: 'object', properties, required });
const companyArg = str('name or id');
const stageArg = { type: 'string', enum: STAGES };
const int = { type: 'integer' };
const bool = { type: 'boolean' };
const DOC_TYPES = ['resume', 'win_doc', 'interview_prep', 'mock_interview'];
const REGION = str('eu|gulf|global|in_remote|blr_hybrid|blr_onsite|global_onsite');

const TOOLS = [
  ['get_overview', 'Counts: pipeline by stage, documents, open/new jobs, last scan and digest. Use for "how many".', S({}), getOverview],
  ['list_pipeline', 'Tracked companies with stage and roles.', S({ stage: stageArg, query: str('name filter') }), listPipeline],
  ['get_company', 'One company: tracking, roles, contacts, research, document ids, open jobs.', S({ company: companyArg }, ['company']), getCompany],
  ['find_companies', 'Search the company catalogue.', S({ query: str(), region: REGION, trackedOnly: bool, limit: int }), findCompanies],
  ['search_jobs', 'Discovered full-time jobs, newest first. query = title words, "or" for alternatives (synonyms handled: AI/ML/LLM, fullstack/full stack, engineer/developer). location = place (Bangalore=Bengaluru, India, remote, Europe…). Ranked by fit (0-100, JD vs his profile; show it as "fit 82"); title_match is the title score. leave minMatch unset unless he asks.', S({ query: str('e.g. AI engineer or fullstack'), location: str('e.g. Bangalore'), company: companyArg, minMatch: int, postedWithinDays: int, favouritesOnly: bool, limit: int }), searchJobs],
  ['search_gigs', 'Freelance/contract gigs.', S({ query: str(), limit: int }), searchGigs],
  ['get_followups_and_interviews', 'Interviews in 7 days, follow-ups due, new jobs not yet in a digest.', S({}), getFollowupsAndInterviews],
  ['list_documents', 'Resumes, WIN docs, interview preps, mock interviews (ids).', S({ company: companyArg, type: { type: 'string', enum: DOC_TYPES } }), listDocuments],
  ['get_document', 'Send a document as a file (default), "text" excerpt, or WIN doc as "pptx".', S({ type: { type: 'string', enum: DOC_TYPES }, id: str(), format: { type: 'string', enum: ['file', 'text', 'pptx'] } }, ['type', 'id']), getDocument],
  ['get_profile', 'His profile and achievement bank.', S({}), getProfile],
  ['get_ai_task', 'Status of a background task.', S({ taskId: str() }, ['taskId']), getTask],
  ['track_company', 'Start tracking a company.', S({ company: companyArg, stage: stageArg }, ['company']), trackCompany],
  ['set_stage', 'Move a company or one role to a stage (sets applied date when moving to applied).', S({ company: companyArg, stage: stageArg, role: str('role title') }, ['company', 'stage']), setStage],
  ['add_role', 'Add a role to a company.', S({ company: companyArg, title: str(), jobLink: str(), stage: stageArg, pay: str() }, ['company', 'title']), addRole],
  ['update_role', 'Edit a role: applied date, interview time, pay, link, outreach, notes.', S({ company: companyArg, role: str('title'), appliedAt: str('e.g. 25 Oct 2026'), interviewAtIst: str('YYYY-MM-DD HH:mm IST'), clearInterview: bool, pay: str(), jobLink: str(), outreachSent: str(), notes: str() }, ['company']), updateRole],
  ['add_note', 'Append a dated note to a company.', S({ company: companyArg, text: str() }, ['company', 'text']), addNote],
  ['log_outreach', 'Append a dated entry to the outreach log.', S({ company: companyArg, text: str() }, ['company', 'text']), logOutreach],
  ['add_contact', 'Add a contact. type: hm=hiring manager. status: req=request, dm, reply, fu1-3, win, call, ref=referred, ab=abandoned.', S({ company: companyArg, name: str(), role: str('their title'), type: { type: 'string', enum: CONN_TYPES }, linkedinUrl: str(), status: { type: 'string', enum: CONN_STATUSES }, notes: str() }, ['company', 'name']), addContact],
  ['update_contact', "Update a contact's status, title, URL or notes.", S({ company: companyArg, contact: str('name'), status: { type: 'string', enum: CONN_STATUSES }, role: str(), linkedinUrl: str(), notes: str() }, ['company', 'contact']), updateContact],
  ['set_job_flag', 'Favourite a job (tracks its company) or mark it not for me.', S({ jobId: str(), favourite: bool, notForMe: bool }, ['jobId']), setJobFlag],
  ['add_company', 'Add a new company and track it.', S({ name: str(), website: str(), region: REGION, applyUrl: str(), description: str() }, ['name']), addCompany],
  ['start_ai_task', 'Background AI task; result is messaged when done. Costs money: only when his message asks for it or agrees to your offer. Resume/cover letter use the saved JD unless jobDescription (text or URL) is given.', S({
    task: { type: 'string', enum: Object.keys(TASK_KINDS) },
    confirmedByUser: { type: 'boolean', description: 'true only if his latest message asks for this task or says yes to it' },
    company: companyArg, role: str(), jobDescription: str(), instructions: str(), contactName: str(),
    problems: { type: 'array', items: { type: 'string' } }, topic: str(), round: { type: 'string', enum: ROUNDS }, force: bool,
  }, ['task', 'confirmedByUser']), startAiTask],
  ['web_search_links', 'Google boolean searches (past week by default) across LinkedIn, Naukri, Instahyre, foundit, Indeed, Wellfound, Cutshort, Hirist, ATS boards and careers pages, plus the portals\' own search pages. Links he opens. Offer when search_jobs is thin or he asks to search the web.', S({ query: str('role'), location: str(), period: { type: 'string', enum: ['day', 'week', 'month'] } }), webSearchLinks],
  ['search_google_jobs', 'Live Google Jobs search (covers LinkedIn, Naukri, Indeed, Instahyre, company sites) for Bangalore or remote India; stores new roles. Uses 1 search; hard daily/weekly/monthly caps apply and cannot be overridden — when capped it returns boolean links instead. Only when he asks to search Google/the web live, or search_jobs found too little and he agrees.', S({ query: str('role, e.g. AI Engineer'), location: str('Bangalore or remote India') }, ['query']), searchGoogleJobs],
  ['get_search_usage', 'Google Jobs (SerpAPI) usage against the daily/weekly/monthly caps, and the last calls.', S({}), getSearchUsage],
  ['send_digest_now', "Send today's digest now.", S({}), sendDigestNow],
];

export const toolSchemas = TOOLS.map(([name, description, parameters]) => ({
  type: 'function', function: { name, description, parameters },
}));

const handlers = Object.fromEntries(TOOLS.map(([name, , , fn]) => [name, fn]));

/** Run one tool call. Errors come back as data so the model can recover or ask. */
export async function runTool(name, rawArgs) {
  const fn = handlers[name];
  if (!fn) return { error: `Unknown tool ${name}` };
  let args = {};
  try {
    args = typeof rawArgs === 'string' && rawArgs.trim() ? JSON.parse(rawArgs) : (rawArgs || {});
  } catch {
    return { error: 'Arguments were not valid JSON' };
  }
  try {
    return await fn(args);
  } catch (err) {
    if (!(err instanceof ToolError)) console.error(`[bot] tool ${name} failed:`, err);
    return { error: err.message };
  }
}

export { TASK_KINDS };
