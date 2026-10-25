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
 * Spending is capped and logged. Every search goes through spend(), which
 * (one call at a time) reads SerpAPI's usage counter, refuses if the day,
 * week or month cap would be passed, makes the call, reads the counter again
 * to record whether it was billed or served free from cache, and logs it in
 * serp_calls. Nothing — not the morning run, not the bot — bypasses it.
 * The counter read is free and does not count as a search.
 *
 * The server never sends a request to google.com: searches go to SerpAPI,
 * and when a cap is reached the fallback is boolean links he opens himself.
 */

const SERP = config.googleJobs.apiBase;
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

/** Free: SerpAPI's own counters for this key (shared with other projects). */
export async function serpQuota() {
  const res = await fetch(`${SERP}/account.json?api_key=${encodeURIComponent(config.googleJobs.apiKey)}`, {
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`SerpAPI account check returned ${res.status}`);
  const d = await res.json();
  return {
    left: Number(d.plan_searches_left ?? d.total_searches_left ?? 0),
    used: Number(d.this_month_usage ?? 0),
    perMonth: Number(d.searches_per_month ?? 0),
    plan: d.plan_name,
  };
}

// ── Caps and the call log ─────────────────────────────────────────────

/** Billed searches today and this week (IST calendar), from the log. */
async function loggedUsage() {
  const tz = config.digest.timeZone;
  return one(
    `SELECT
       count(*) FILTER (WHERE (at AT TIME ZONE $1)::date = (now() AT TIME ZONE $1)::date)::int AS today,
       count(*) FILTER (WHERE date_trunc('week', at AT TIME ZONE $1) = date_trunc('week', now() AT TIME ZONE $1))::int AS week,
       count(*) FILTER (WHERE date_trunc('month', at AT TIME ZONE $1) = date_trunc('month', now() AT TIME ZONE $1))::int AS month
     FROM serp_calls WHERE billed IS NOT FALSE`,
    [tz],
  );
}

/**
 * Where usage stands against every cap. The month uses the larger of
 * SerpAPI's counter and the log, so another project on the same key still
 * counts. If the counter cannot be read, nothing may be spent.
 */
export async function searchUsage() {
  const { dailyCap, weeklyCap, monthlyCap } = config.googleJobs;
  const logged = await loggedUsage();
  let account = null;
  try { account = await serpQuota(); } catch { account = null; }
  const month = Math.max(account?.used ?? 0, logged.month);
  const allowance = account
    ? Math.max(0, Math.min(dailyCap - logged.today, weeklyCap - logged.week, monthlyCap - month))
    : 0;
  const blockedBy = !account ? 'SerpAPI usage could not be read'
    : logged.today >= dailyCap ? 'daily' : logged.week >= weeklyCap ? 'weekly' : month >= monthlyCap ? 'monthly' : null;
  return {
    today: logged.today, dailyCap, week: logged.week, weeklyCap, month, monthlyCap,
    planLeft: account?.left ?? null, planPerMonth: account?.perMonth ?? null,
    allowance, blockedBy,
  };
}

export const usageLine = (u) =>
  `today ${u.today}/${u.dailyCap} · week ${u.week}/${u.weeklyCap} · month ${u.month}/${u.monthlyCap}`;

// One search at a time, app-wide, so two callers cannot both pass the check.
let spendChain = Promise.resolve();

/** The only way a search is made. Returns { results } or { blocked, usage }. */
async function spend({ q, location }, trigger) {
  const turn = spendChain.then(async () => {
    const usage = await searchUsage();
    if (usage.allowance < 1) {
      // A real cap is announced once per period; an unreadable counter just blocks.
      if (['daily', 'weekly', 'monthly'].includes(usage.blockedBy)) await noticeCap(usage);
      return { blocked: usage.blockedBy || 'cap', usage };
    }
    const before = usage.month;
    let results = []; let error = null; let searchId = null; let ok = true;
    try {
      ({ results, searchId } = await searchPage({ q, location }));
    } catch (err) {
      ok = false; error = err.message;
    }
    let after = null;
    try { after = (await serpQuota()).used; } catch { after = null; }
    const billed = after === null ? null : after > before;
    await query(
      `INSERT INTO serp_calls (trigger, query, location, ok, billed, results, month_usage, search_id, error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [trigger, q, location || '', ok, billed, results.length, after, searchId, error],
    );
    await noticeMonth80();
    if (!ok) throw new Error(error);
    return { results, billed };
  });
  spendChain = turn.catch(() => {});
  return turn;
}

// ── Telegram notices ─────────────────────────────────────────────────

async function tell(text) {
  if (!config.digest.telegram.botToken || !config.digest.telegram.chatId) return;
  const { sendMarkdown } = await import('./telegram.js');
  await sendMarkdown(config.digest.telegram.chatId, text).catch(() => {});
}

/** Run fn once per key (e.g. once per day for "daily cap reached"). */
async function once(key, fn) {
  const row = await one(`INSERT INTO serp_notices (key) VALUES ($1) ON CONFLICT (key) DO NOTHING RETURNING key`, [key]);
  if (row) await fn();
}

const istDate = () => new Intl.DateTimeFormat('en-CA', { timeZone: config.digest.timeZone }).format(new Date());

/** Monday of the current IST week, YYYY-MM-DD — the same week the cap counts. */
function istMonday() {
  const d = new Date(`${istDate()}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

async function noticeCap(u) {
  const period = u.blockedBy === 'daily' ? `day:${istDate()}` : u.blockedBy === 'weekly' ? `week:${istMonday()}` : `month:${istDate().slice(0, 7)}`;
  await once(`cap-${period}`, () => tell(
    `⛔ **Google Jobs ${u.blockedBy || ''} limit reached** (${usageLine(u)}).\n` +
    'Searches pause until it resets — nothing can override that. Company-board discovery keeps running, ' +
    'and the bot will give you Google boolean links to open yourself (no requests from the server).',
  ));
}

async function noticeMonth80() {
  const u = await searchUsage();
  if (u.month >= Math.floor(u.monthlyCap * 0.8)) {
    await once(`month-80:${istDate().slice(0, 7)}`, () => tell(
      `⚠️ **Google Jobs at ${u.month}/${u.monthlyCap} searches this month** (past 80% of the cap). ` +
      `The cap stops it at ${u.monthlyCap}; SerpAPI shows ${u.planLeft} left on the plan.`,
    ));
  }
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

// Only spend() may call this.
async function searchPage({ q, location }) {
  const url = new URL(`${SERP}/search.json`);
  Object.entries({ engine: 'google_jobs', q, location, gl: 'in', hl: 'en', api_key: config.googleJobs.apiKey })
    .forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  const d = await res.json().catch(() => ({}));
  const searchId = d.search_metadata?.id || null;
  if (!res.ok || d.error) {
    // "Google hasn't returned any results" is an empty page, not a failure.
    if (/hasn't returned any results/i.test(d.error || '')) return { results: [], searchId };
    throw new Error(`SerpAPI: ${d.error || res.status}`);
  }
  return { results: d.jobs_results || [], searchId };
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

/** Today's standing searches: the configured list, rotated so all get run. */
function todaysQueries(all, n) {
  const day = Math.floor(Date.now() / DAY);
  return Array.from({ length: Math.min(n, all.length) }, (_, i) => all[(day + i) % all.length]);
}

/**
 * Run searches through spend() and store what they find. The morning run
 * takes at most `morningMax`, leaving the rest of the daily cap for the bot.
 */
export async function runGoogleJobs({ trigger = 'manual', queries = null, notify = trigger === 'scheduled' } = {}) {
  if (!googleJobsReady()) throw new Error('Google Jobs is not configured — set SERPAPI_KEY');
  const all = queries || config.googleJobs.queries || DEFAULT_QUERIES;
  const planned = queries ? all : todaysQueries(all, config.googleJobs.morningMax);

  const run = await one(
    `INSERT INTO agent_runs (kind, trigger, status) VALUES ('google-jobs', $1, 'running') RETURNING id`,
    [trigger],
  );
  const detail = [];
  const errors = [];
  let seen = 0; let added = 0; let searches = 0; let billed = 0; let blocked = null;
  for (const qy of planned) {
    try {
      const out = await spend(qy, trigger);
      if (out.blocked) { blocked = out.blocked; break; }
      searches += 1; if (out.billed !== false) billed += 1;
      const s = await storeResults(out.results);
      seen += s.relevant; added += s.added;
      detail.push({ query: qy.q, location: qy.location, results: out.results.length, billed: out.billed, ...s });
    } catch (err) {
      errors.push({ query: qy.q, error: err.message });
    }
  }
  if (blocked) errors.push({ note: `stopped: ${blocked} limit reached` });
  await query(
    `UPDATE agent_runs SET status = 'done', companies = $2, jobs_seen = $3, jobs_new = $4,
       errors = $5, detail = $6, finished_at = now() WHERE id = $1`,
    [run.id, searches, seen, added, JSON.stringify(errors), JSON.stringify(detail)],
  );
  const usage = await searchUsage();
  if (notify) {
    await tell(
      `🔎 **Google Jobs**: ${searches} search${searches === 1 ? '' : 'es'} (${billed} billed) · ${added} new role${added === 1 ? '' : 's'}` +
      `${blocked ? ` · stopped at the ${blocked} limit` : ''}\n${usageLine(usage)} · SerpAPI plan: ${usage.planLeft ?? '?'} left`,
    );
  }
  return { runId: run.id, searches, billed, blocked, jobsSeen: seen, jobsNew: added, errors, detail, usage };
}
