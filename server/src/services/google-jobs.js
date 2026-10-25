import { one, query } from '../db/pool.js';
import { config } from '../config.js';
import { scoreJob } from './discovery.js';
import { cleanJdText } from './autofill.js';

/**
 * Google Jobs discovery through SerpAPI.
 *
 * Google's job index already gathers postings from LinkedIn, Naukri, Indeed,
 * Instahyre, foundit and company career sites. SerpAPI is the sanctioned way
 * to query it programmatically, so the server reads SerpAPI's structured
 * results and never opens Google, LinkedIn or Naukri itself.
 *
 * The free plan is 250 searches a month. A morning run spends one search per
 * standing query (one page of ten), and the account's remaining searches are
 * checked first — that check is free — so the run never eats the reserve
 * left for on-demand searches from the bot.
 */

const SERP = 'https://serpapi.com';
const DAY = 86_400_000;

// Standing searches. Bengaluru is the only Indian city he targets; the remote
// ones search India-wide and the location rule in scoreJob keeps only
// Bangalore or remote results.
export const DEFAULT_QUERIES = [
  { q: 'AI Engineer', location: 'Bengaluru, Karnataka, India' },
  { q: 'Generative AI LLM Engineer', location: 'Bengaluru, Karnataka, India' },
  { q: 'Full Stack Engineer', location: 'Bengaluru, Karnataka, India' },
  { q: 'Backend Engineer', location: 'Bengaluru, Karnataka, India' },
  { q: 'Forward Deployed Engineer', location: 'India' },
  { q: 'Remote AI Engineer', location: 'India' },
];

// Aggregators and job boards — a link to the employer's own site beats these.
const BOARD_HOSTS = /linkedin|naukri|indeed|foundit|monster|shine|instahyre|glassdoor|jooble|jobrapido|kitjob|bebee|simplyhired|adzuna|jobaaj|hirist|cutshort|talent500|bayt|builtin|jobzmall|speedyapply|olibr|devsunite|hiringbunch|wellfound|ziprecruiter|careerjet|timesjobs|apna|trabajo|jobleads|getmereferred|jobgether|learn4good|jobsora|whatjobs|talentify|recruit\.net|tealhq|ladders|dice\.com|hiring\.cafe|workindia|iimjobs|jobsearcher|expertini|ambitionbox|freshersworld|placementindia|clanx|grabjobs|jobted|virtualvocations|remoterocketship|himalayas|remotive|weworkremotely/i;

export const googleJobsReady = () => Boolean(config.googleJobs.enabled && config.googleJobs.apiKey);

/** Free: remaining searches on the SerpAPI plan. */
export async function serpQuota() {
  const res = await fetch(`${SERP}/account.json?api_key=${encodeURIComponent(config.googleJobs.apiKey)}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`SerpAPI account check returned ${res.status}`);
  const d = await res.json();
  return { left: Number(d.plan_searches_left ?? d.total_searches_left ?? 0), perMonth: d.searches_per_month, plan: d.plan_name };
}

/** "Bengaluru â€“ AI" — UTF-8 text decoded as Latin-1 somewhere upstream. */
function fixMojibake(s) {
  const text = String(s || '');
  if (!/â€|Ã.|Â/.test(text)) return text;
  const fixed = Buffer.from(text, 'latin1').toString('utf8');
  return fixed.includes('�') ? text.replace(/â€“/g, '–').replace(/â€”/g, '—').replace(/â€™/g, '’').replace(/Â/g, '') : fixed;
}

/** "11 days ago", "5 hours ago", "2 weeks ago" → Date. */
export function postedFrom(extensions = [], now = Date.now()) {
  for (const e of extensions) {
    const m = String(e).toLowerCase().match(/(\d+)\+?\s*(minute|hour|day|week|month)s?\s+ago/);
    if (!m) continue;
    const n = Number(m[1]);
    const unit = { minute: 60_000, hour: 3_600_000, day: DAY, week: 7 * DAY, month: 30 * DAY }[m[2]];
    return new Date(now - n * unit);
  }
  return null;
}

const stripTracking = (url) => {
  try {
    const u = new URL(url);
    [...u.searchParams.keys()].filter((k) => /^utm_|^gh_src$|^src$/i.test(k)).forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
};

const hostOf = (link) => { try { return new URL(link).hostname.toLowerCase(); } catch { return ''; } };

/**
 * The employer's own posting when listed: an option named after the company
 * or "Careers", or a link on a domain carrying the company's name. Then
 * LinkedIn, then any non-aggregator, then whatever is first.
 */
function bestApply(job) {
  const opts = (job.apply_options || []).filter((o) => o?.link);
  const tokens = String(job.company_name || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !['india', 'technologies', 'services', 'private', 'limited', 'global', 'solutions', 'group'].includes(t));
  const named = opts.find((o) => {
    const title = String(o.title || '').toLowerCase();
    const host = hostOf(o.link);
    return !BOARD_HOSTS.test(host) && (/careers|jobs -/.test(title) || tokens.some((t) => title.includes(t) || host.includes(t)));
  });
  const linkedin = opts.find((o) => /linkedin\.com/i.test(o.link));
  const other = opts.find((o) => hostOf(o.link) && !BOARD_HOSTS.test(hostOf(o.link)));
  return stripTracking((named || linkedin || other || opts[0])?.link || job.source_link || job.share_link || '');
}

async function searchPage({ q, location }) {
  const url = new URL(`${SERP}/search.json`);
  Object.entries({ engine: 'google_jobs', q, location, gl: 'in', hl: 'en', api_key: config.googleJobs.apiKey })
    .forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || d.error) {
    // "Google hasn't returned any results" is an empty page, not a failure.
    if (/hasn't returned any results/i.test(d.error || '')) return [];
    throw new Error(`SerpAPI: ${d.error || res.status}`);
  }
  return d.jobs_results || [];
}

const catalogueId = async (name) =>
  (await one('SELECT id FROM companies WHERE lower(name) = lower($1) LIMIT 1', [name]))?.id || null;

const DSA_SIGNALS = /leetcode|data structures and algorithms|algorithmic (interview|assessment)|hackerrank|codesignal|competitive programming/i;

/** Store one page of results. Upsert only; a role already on file is skipped. */
async function storeResults(results, { minRelevance = 40 } = {}) {
  let relevant = 0; let added = 0; let duplicate = 0; let stale = 0;
  for (const r of results) {
    const title = fixMojibake(r.title).trim();
    const company = fixMojibake(r.company_name).trim();
    const location = fixMojibake(r.location).trim() || 'India';
    const ext = (r.extensions || []).map(fixMojibake);
    if (!title || !company) continue;
    // Internship-only or contract-only listings are not what this feed is for.
    if (ext.some((e) => /internship/i.test(e)) && !ext.some((e) => /full/i.test(e))) continue;

    const postedAt = postedFrom(ext);
    if (postedAt && Date.now() - postedAt.getTime() > 30 * DAY) { stale += 1; continue; }

    const job = { title, location, postedAt };
    const { relevance, roles } = scoreJob(job);
    if (relevance < minRelevance) continue;
    relevant += 1;

    // Already found on the company's own board (or an earlier Google run).
    const existing = await one(
      `SELECT id FROM jobs WHERE closed_at IS NULL AND lower(company_name) = lower($1) AND lower(title) = lower($2) LIMIT 1`,
      [company, title],
    );
    if (existing) { duplicate += 1; continue; }

    const url = bestApply(r);
    if (!url) continue;
    const description = cleanJdText(fixMojibake(r.description || '')).slice(0, 4000);
    const meta = {
      via: r.via || null,
      salary: ext.find((e) => /₹|\$|€|lpa|a year|a month/i.test(e)) || null,
      applyOptions: (r.apply_options || []).slice(0, 6).map((o) => ({ title: o.title, link: stripTracking(o.link) })),
    };
    const row = await one(
      `INSERT INTO jobs (company_id, company_name, title, url, location, source, description, no_dsa,
                         posted_at, relevance, matched_roles, ats, external_id, meta, seen_at)
       VALUES ($1,$2,$3,$4,$5,'google_jobs',$6,$7,$8,$9,$10,'google_jobs',$11,$12, now())
       ON CONFLICT (url) DO UPDATE SET seen_at = now(), closed_at = NULL,
         posted_at = COALESCE(jobs.posted_at, EXCLUDED.posted_at)
       RETURNING (xmax = 0) AS inserted`,
      [await catalogueId(company), company, title, url, location, description,
        description ? !DSA_SIGNALS.test(description) : null, postedAt, relevance, roles,
        r.job_id ? String(r.job_id).slice(0, 500) : null, JSON.stringify(meta)],
    );
    if (row?.inserted) added += 1;
  }
  return { relevant, added, duplicate, stale };
}

/**
 * Run searches and store what they find. `reserve` is how many searches must
 * remain on the plan afterwards; the morning run keeps some for the bot.
 */
export async function runGoogleJobs({ trigger = 'manual', queries = config.googleJobs.queries || DEFAULT_QUERIES, reserve = config.googleJobs.reserve } = {}) {
  if (!googleJobsReady()) throw new Error('Google Jobs is not configured — set SERPAPI_KEY');
  const quota = await serpQuota();
  const affordable = Math.max(0, quota.left - reserve);
  const toRun = queries.slice(0, affordable);

  const run = await one(
    `INSERT INTO agent_runs (kind, trigger, status) VALUES ('google-jobs', $1, 'running') RETURNING id`,
    [trigger],
  );
  const detail = [];
  const errors = [];
  let seen = 0; let added = 0;
  for (const qy of toRun) {
    try {
      const results = await searchPage(qy);
      const s = await storeResults(results);
      seen += s.relevant; added += s.added;
      detail.push({ query: qy.q, location: qy.location, results: results.length, ...s });
    } catch (err) {
      errors.push({ query: qy.q, error: err.message });
    }
  }
  const skipped = queries.length - toRun.length;
  if (skipped) errors.push({ note: `${skipped} search(es) skipped to keep ${reserve} of ${quota.left} remaining for on-demand use` });
  await query(
    `UPDATE agent_runs SET status = 'done', companies = $2, jobs_seen = $3, jobs_new = $4,
       errors = $5, detail = $6, finished_at = now() WHERE id = $1`,
    [run.id, toRun.length, seen, added, JSON.stringify(errors), JSON.stringify(detail)],
  );
  return { runId: run.id, searches: toRun.length, quotaBefore: quota.left, jobsSeen: seen, jobsNew: added, errors, detail };
}
