import { one, query } from '../db/pool.js';
import { scoreJob } from './discovery.js';
import { cleanJdText } from './autofill.js';

/**
 * India job discovery — Bangalore and India-remote roles the catalogue's
 * Greenhouse / Lever / Ashby boards never show.
 *
 * Only sources that are meant to be read:
 *   workday          Public career-site API (/wday/cxs/…) of large Bangalore
 *                    employers. robots.txt allows the career-site paths. No key.
 *   smartrecruiters  Documented public Posting API. No key.
 *
 * Deliberately NOT here: Instahyre, Naukri, LinkedIn, foundit, Indeed and
 * Google itself. Their terms forbid automated extraction (Instahyre: "crawl or
 * spider any part of the Platform"), and doing it would risk his own accounts.
 * Those are reached through Google boolean and portal search links he opens
 * himself (see search-links.js).
 *
 * Writes are upserts into jobs; nothing is deleted. A role missing from a
 * board that was fetched completely is marked closed, never removed.
 */

const UA = 'career-copilot/1.0 (personal job search tool)';
const DAY = 86_400_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CITY_SPELLINGS = ['Bangalore', 'Bengaluru'];

// Verified to answer and to list Bangalore roles (probed 25 Oct 2026).
export const WORKDAY_BOARDS = [
  { company: 'NVIDIA', host: 'nvidia.wd5.myworkdayjobs.com', tenant: 'nvidia', site: 'NVIDIAExternalCareerSite' },
  { company: 'Intel', host: 'intel.wd1.myworkdayjobs.com', tenant: 'intel', site: 'External' },
  { company: 'Salesforce', host: 'salesforce.wd12.myworkdayjobs.com', tenant: 'salesforce', site: 'External_Career_Site' },
  { company: 'HP', host: 'hp.wd5.myworkdayjobs.com', tenant: 'hp', site: 'ExternalCareerSite' },
  { company: 'Thomson Reuters', host: 'thomsonreuters.wd5.myworkdayjobs.com', tenant: 'thomsonreuters', site: 'External_Career_Site' },
  { company: 'GE HealthCare', host: 'gehc.wd5.myworkdayjobs.com', tenant: 'gehc', site: 'GEHC_ExternalSite' },
  { company: 'Target', host: 'target.wd5.myworkdayjobs.com', tenant: 'target', site: 'targetcareers' },
  { company: 'Adobe', host: 'adobe.wd5.myworkdayjobs.com', tenant: 'adobe', site: 'external_experienced' },
  { company: 'Philips', host: 'philips.wd3.myworkdayjobs.com', tenant: 'philips', site: 'jobs-and-careers' },
  { company: 'Autodesk', host: 'autodesk.wd1.myworkdayjobs.com', tenant: 'autodesk', site: 'Ext' },
  { company: 'Eli Lilly', host: 'lilly.wd115.myworkdayjobs.com', tenant: 'lilly', site: 'LLY' },
  { company: 'Equinix', host: 'equinix.wd1.myworkdayjobs.com', tenant: 'equinix', site: 'External' },
  { company: 'PayPal', host: 'paypal.wd1.myworkdayjobs.com', tenant: 'paypal', site: 'jobs' },
  { company: 'Red Hat', host: 'redhat.wd5.myworkdayjobs.com', tenant: 'redhat', site: 'jobs' },
  { company: 'Mastercard', host: 'mastercard.wd1.myworkdayjobs.com', tenant: 'mastercard', site: 'CorporateCareers' },
];

export const SMARTRECRUITERS_COMPANIES = [
  { company: 'Bosch', id: 'BoschGroup' },
  { company: 'LinkedIn', id: 'LinkedIn3' },
  { company: 'ServiceNow', id: 'ServiceNow' },
  { company: 'Freshworks', id: 'Freshworks' },
  { company: 'Canva', id: 'Canva' },
];

// ── Workday ───────────────────────────────────────────────────────────

/** "Posted Today" / "Posted 3 Days Ago" / "Posted 30+ Days Ago" → Date. */
export function workdayPostedOn(text, now = Date.now()) {
  const s = String(text || '').toLowerCase();
  if (s.includes('today')) return new Date(now);
  if (s.includes('yesterday')) return new Date(now - DAY);
  const m = s.match(/(\d+)\+?\s*days?/);
  if (m) return new Date(now - (Number(m[1]) + (s.includes('+') ? 1 : 0)) * DAY);
  return null;
}

async function workdayPage(board, searchText, offset) {
  const res = await fetch(`https://${board.host}/wday/cxs/${board.tenant}/${board.site}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'User-Agent': UA },
    body: JSON.stringify({ appliedFacets: {}, limit: 20, offset, searchText }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`${board.company} Workday returned ${res.status}`);
  return res.json();
}

/** Every Bangalore posting on one Workday site (both spellings, all pages, capped). */
async function fetchWorkday(board, maxPerSpelling = 300) {
  const byPath = new Map();
  for (const city of CITY_SPELLINGS) {
    // Workday reports `total` on the first page only; later pages say 0.
    let total = 0;
    for (let offset = 0; offset < maxPerSpelling; offset += 20) {
      const d = await workdayPage(board, city, offset);
      if (offset === 0) total = d.total || 0;
      const posts = d.jobPostings || [];
      for (const p of posts) {
        if (!p.externalPath || byPath.has(p.externalPath)) continue;
        // "2 Locations" hides the list; the search was for Bangalore, so say so.
        const loc = /^\d+ locations?$/i.test(p.locationsText || '') ? `Bangalore (+${p.locationsText})` : (p.locationsText || city);
        byPath.set(p.externalPath, {
          path: p.externalPath,
          externalId: p.bulletFields?.[0] || p.externalPath,
          title: p.title,
          url: `https://${board.host}/${board.site}${p.externalPath}`,
          location: loc,
          postedAt: workdayPostedOn(p.postedOn),
        });
      }
      if (posts.length < 20 || offset + 20 >= total) break;
      await sleep(300);
    }
  }
  return [...byPath.values()];
}

/**
 * The list API carries no description; the posting endpoint does, plus the
 * exact posting date. Fetched only for relevant roles not yet described.
 */
async function describeWorkday(board, job) {
  const res = await fetch(`https://${board.host}/wday/cxs/${board.tenant}/${board.site}${job.path}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const info = (await res.json()).jobPostingInfo || {};
  return {
    description: cleanJdText(info.jobDescription || ''),
    postedAt: info.startDate ? new Date(`${info.startDate}T06:30:00Z`) : null,
  };
}

async function describeSmartRecruiters(sr, job) {
  const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${sr.id}/postings/${job.externalId}`, {
    headers: { Accept: 'application/json', 'User-Agent': UA }, signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) return null;
  const s = (await res.json()).jobAd?.sections || {};
  const text = ['jobDescription', 'qualifications', 'companyDescription']
    .map((k) => s[k]?.text || '').filter(Boolean).join('\n\n');
  return { description: cleanJdText(text) };
}

// ── SmartRecruiters ───────────────────────────────────────────────────

async function fetchSmartRecruiters(sr) {
  const byId = new Map();
  for (const city of CITY_SPELLINGS) {
    for (let offset = 0; offset < 500; offset += 100) {
      const res = await fetch(
        `https://api.smartrecruiters.com/v1/companies/${sr.id}/postings?city=${city}&limit=100&offset=${offset}`,
        { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(25_000) },
      );
      if (!res.ok) throw new Error(`${sr.company} SmartRecruiters returned ${res.status}`);
      const d = await res.json();
      for (const p of d.content || []) {
        if (byId.has(p.id)) continue;
        const loc = [p.location?.city, p.location?.region, p.location?.remote ? 'Remote' : null].filter(Boolean).join(', ');
        byId.set(p.id, {
          externalId: p.id,
          title: p.name,
          url: `https://jobs.smartrecruiters.com/${sr.id}/${p.id}`,
          location: loc || city,
          postedAt: p.releasedDate ? new Date(p.releasedDate) : null,
        });
      }
      if ((d.content || []).length < 100) break;
      await sleep(300);
    }
  }
  return [...byId.values()];
}

// ── Storing ───────────────────────────────────────────────────────────

const DSA_SIGNALS = /leetcode|data structures and algorithms|algorithmic (interview|assessment)|hackerrank|codesignal|competitive programming/i;

/** Catalogue id for a company name, so these roles join the pipeline view. */
async function catalogueId(name) {
  if (!name) return null;
  const row = await one('SELECT id FROM companies WHERE lower(name) = lower($1) LIMIT 1', [name]);
  return row?.id || null;
}

async function store(source, companyName, jobs, minRelevance, describe = null) {
  const companyId = await catalogueId(companyName);
  const ids = new Map();
  let relevant = 0;
  let added = 0;
  for (const job of jobs) {
    const name = job.company || companyName;
    const { relevance, roles } = scoreJob(job);
    if (relevance < minRelevance) continue;
    relevant += 1;
    if (!ids.has(name)) ids.set(name, companyId ?? (await catalogueId(name)));
    if (describe && !job.description) {
      const have = await one(`SELECT length(description) > 0 AS described FROM jobs WHERE url = $1`, [job.url]);
      if (!have?.described) {
        try {
          const d = await describe(job);
          if (d?.description) job.description = d.description;
          if (d?.postedAt && !Number.isNaN(d.postedAt.getTime())) job.postedAt = d.postedAt;
        } catch { /* a missing description is not worth failing the board */ }
        await sleep(250);
      }
    }
    const meta = job.publisher ? { publisher: job.publisher } : {};
    const row = await one(
      `INSERT INTO jobs (company_id, company_name, title, url, location, source, description, no_dsa,
                         posted_at, relevance, matched_roles, ats, external_id, meta, seen_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$6,$12,$13, now())
       ON CONFLICT (url) DO UPDATE SET
         title = EXCLUDED.title, location = EXCLUDED.location,
         description = CASE WHEN EXCLUDED.description <> '' THEN EXCLUDED.description ELSE jobs.description END,
         no_dsa = COALESCE(EXCLUDED.no_dsa, jobs.no_dsa),
         posted_at = COALESCE(EXCLUDED.posted_at, jobs.posted_at),
         relevance = EXCLUDED.relevance, matched_roles = EXCLUDED.matched_roles,
         seen_at = now(), closed_at = NULL
       RETURNING (xmax = 0) AS inserted, dismissed`,
      [
        ids.get(name), name, job.title, job.url, job.location, source, (job.description || '').slice(0, 4000),
        job.description ? !DSA_SIGNALS.test(job.description) : null,
        job.postedAt && !Number.isNaN(job.postedAt.getTime()) ? job.postedAt : null,
        relevance, roles, job.externalId || null, JSON.stringify(meta),
      ],
    );
    if (row?.inserted && !row.dismissed) added += 1;
  }
  return { relevant, added };
}

// ── The run ───────────────────────────────────────────────────────────

export function indiaSourcesStatus() {
  return {
    workday: WORKDAY_BOARDS.length,
    smartrecruiters: SMARTRECRUITERS_COMPANIES.length,
  };
}

export async function runIndiaDiscovery({ trigger = 'manual', minRelevance = 40 } = {}) {
  const run = await one(
    `INSERT INTO agent_runs (kind, trigger, status) VALUES ('india-discovery', $1, 'running') RETURNING id, started_at`,
    [trigger],
  );
  const detail = [];
  const errors = [];
  let seen = 0;
  let added = 0;
  let closed = 0;

  const boards = [
    ...WORKDAY_BOARDS.map((b) => ({ source: 'workday', company: b.company, key: b.host, fetch: () => fetchWorkday(b), describe: (j) => describeWorkday(b, j) })),
    ...SMARTRECRUITERS_COMPANIES.map((s) => ({ source: 'smartrecruiters', company: s.company, key: s.id, fetch: () => fetchSmartRecruiters(s), describe: (j) => describeSmartRecruiters(s, j) })),
  ];

  try {
    for (const b of boards) {
      try {
        const jobs = await b.fetch();
        const { relevant, added: n } = await store(b.source, b.company, jobs, minRelevance, b.describe);
        seen += relevant;
        added += n;
        // A company board was read in full, so a role it no longer lists has
        // closed. Marked, never deleted.
        const res = await query(
          `UPDATE jobs SET closed_at = now()
           WHERE source = $1 AND company_name = $2 AND closed_at IS NULL AND seen_at < $3`,
          [b.source, b.company, run.started_at],
        );
        closed += res.rowCount || 0;
        detail.push({ source: b.source, company: b.company, fetched: jobs.length, relevant, new: n });
      } catch (err) {
        errors.push({ source: b.source, company: b.company, error: err.message });
      }
      await sleep(400);
    }
    await query(
      `UPDATE agent_runs SET status = 'done', companies = $2, jobs_seen = $3, jobs_new = $4, jobs_closed = $5,
         errors = $6, detail = $7, finished_at = now() WHERE id = $1`,
      [run.id, boards.length, seen, added, closed, JSON.stringify(errors), JSON.stringify(detail)],
    );
    return { runId: run.id, boards: boards.length, jobsSeen: seen, jobsNew: added, jobsClosed: closed, errors, detail };
  } catch (err) {
    await query(`UPDATE agent_runs SET status = 'error', error = $2, finished_at = now() WHERE id = $1`, [run.id, err.message]);
    throw err;
  }
}

