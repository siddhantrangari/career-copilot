import { many, one, query } from '../db/pool.js';
import { cleanJdText } from './autofill.js';

/**
 * Job discovery agent.
 *
 * Greenhouse, Lever and Ashby all publish a company's open roles as free
 * public JSON, including a real posted date. That is strictly better than
 * asking a language model to find jobs and guess when they appeared: it is
 * accurate, complete, instant and costs nothing. Roughly 80% of the target
 * companies resolve to one of these boards.
 *
 * Every run is written to agent_runs with per-company detail, so the agent is
 * auditable — you can see exactly what it checked, what it found, and what
 * broke, rather than wondering whether it silently stopped working.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = 'career-copilot/1.0 (personal job search tool)';

// ── The three board APIs, normalised to one shape ─────────────────────
const BOARDS = {
  greenhouse: {
    url: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    parse: (d) => (d.jobs || []).map((j) => ({
      externalId: String(j.id),
      title: j.title,
      url: j.absolute_url,
      location: j.location?.name || '',
      postedAt: j.updated_at || j.first_published || null,
      description: cleanJdText(j.content || '').slice(0, 4000),
    })),
  },
  lever: {
    url: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
    parse: (d) => (Array.isArray(d) ? d : []).map((j) => ({
      externalId: j.id,
      title: j.text,
      url: j.hostedUrl,
      location: j.categories?.location || '',
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null,
      description: cleanJdText(j.descriptionPlain || j.description || '').slice(0, 4000),
    })),
  },
  ashby: {
    url: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=false`,
    parse: (d) => (d.jobs || []).map((j) => ({
      externalId: j.id,
      title: j.title,
      url: j.jobUrl || j.applyUrl,
      location: j.location || '',
      postedAt: j.publishedAt || null,
      description: cleanJdText(j.descriptionPlain || j.descriptionHtml || '').slice(0, 4000),
    })),
  },

  // The providers below are only used when a URL names them explicitly.
  // Guessing their slugs produced confident matches against the wrong
  // company — a SmartRecruiters account whose newest role was from 2020 —
  // and a wrong company is worse than no data.
  workable: {
    url: (slug) => `https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`,
    parse: (d) => (d.jobs || []).map((j) => ({
      externalId: String(j.shortcode || j.id),
      title: j.title,
      url: j.url || j.application_url,
      location: [j.city, j.country].filter(Boolean).join(', '),
      postedAt: j.published_on || null,
      description: cleanJdText(j.description || '').slice(0, 4000),
    })),
  },
  recruitee: {
    url: (slug) => `https://${slug}.recruitee.com/api/offers/`,
    parse: (d) => (d.offers || []).map((j) => ({
      externalId: String(j.id),
      title: j.title,
      url: j.careers_url || j.careers_apply_url,
      location: [j.city, j.country].filter(Boolean).join(', '),
      postedAt: j.published_at || null,
      description: cleanJdText(j.description || '').slice(0, 4000),
    })),
  },
  smartrecruiters: {
    url: (slug) => `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`,
    parse: (d) => (d.content || []).map((j) => ({
      externalId: j.id,
      title: j.name,
      url: `https://jobs.smartrecruiters.com/${j.company?.identifier || ''}/${j.id}`,
      location: [j.location?.city, j.location?.country].filter(Boolean).join(', '),
      postedAt: j.releasedDate || null,
      description: '',
    })),
  },
};

/** Only these are safe to slug-guess; the rest need an explicit URL. */
const GUESSABLE = ['greenhouse', 'lever', 'ashby'];

const slugCandidates = (name) => {
  const base = String(name || '').toLowerCase().replace(/\.(com|io|ai|co)\b/g, '').trim();
  const s = (x) => x.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [...new Set([s(base), s(base).replace(/-/g, ''), s(base.split(/[\s/]/)[0])])].filter(Boolean);
};

/** Pull a board slug straight out of an apply URL when it is already there. */
function slugFromApplyUrl(url = '') {
  const gh = url.match(/greenhouse\.io\/(?:embed\/job_board\?for=)?([^/?#]+)/i);
  if (gh) return { provider: 'greenhouse', slug: gh[1] };
  const lv = url.match(/jobs\.lever\.co\/([^/?#]+)/i);
  if (lv) return { provider: 'lever', slug: lv[1] };
  const ab = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
  if (ab) return { provider: 'ashby', slug: ab[1] };
  const wk = url.match(/apply\.workable\.com\/([^/?#]+)/i);
  if (wk) return { provider: 'workable', slug: wk[1] };
  const rc = url.match(/([a-z0-9-]+)\.recruitee\.com/i);
  if (rc) return { provider: 'recruitee', slug: rc[1] };
  const sr = url.match(/jobs\.smartrecruiters\.com\/([^/?#]+)/i);
  if (sr) return { provider: 'smartrecruiters', slug: sr[1] };
  return null;
}

/**
 * Attach a board by URL. Used for the companies slug-guessing cannot reach,
 * where a wrong guess would silently show roles from another company.
 */
export async function setBoardFromUrl(companyId, boardUrl) {
  const parsed = slugFromApplyUrl(String(boardUrl || ''));
  if (!parsed) {
    throw new Error(
      'That URL is not a recognised job board. Supported: Greenhouse, Lever, ' +
      'Ashby, Workable, Recruitee, SmartRecruiters.',
    );
  }

  const jobs = await fetchBoard(parsed.provider, parsed.slug);
  if (!jobs) throw new Error(`${parsed.provider} board "${parsed.slug}" returned no jobs — check the URL.`);

  await query(
    `UPDATE companies SET ats_provider = $2, ats_slug = $3,
                          ats_checked_at = now(), ats_job_count = $4
     WHERE id = $1`,
    [companyId, parsed.provider, parsed.slug, jobs.length],
  );

  return { provider: parsed.provider, slug: parsed.slug, jobs: jobs.length, sample: jobs.slice(0, 3).map((j) => j.title) };
}

async function fetchBoard(provider, slug) {
  try {
    const res = await fetch(BOARDS[provider].url(slug), {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const jobs = BOARDS[provider].parse(await res.json());
    return jobs.length ? jobs : null;
  } catch {
    return null;
  }
}

/** Find which board a company publishes on, preferring its own apply URL. */
export async function resolveBoard(company) {
  const direct = slugFromApplyUrl(company.apply_url || '');
  if (direct) {
    const jobs = await fetchBoard(direct.provider, direct.slug);
    if (jobs) return { ...direct, jobs };
  }

  for (const slug of slugCandidates(company.name)) {
    for (const provider of GUESSABLE) {
      const jobs = await fetchBoard(provider, slug);
      if (jobs) return { provider, slug, jobs };
      await sleep(120);
    }
  }
  return null;
}

// ── Relevance ─────────────────────────────────────────────────────────
// Scored from the title, using the target roles rather than a generic match,
// so a Sales or Recruiter opening at a target company does not surface.

const ROLE_PATTERNS = [
  { role: 'fde', weight: 50, re: /forward[- ]deployed|solutions architect|field engineer/i },
  { role: 'ai', weight: 45, re: /\b(ai|ml|llm|machine learning|applied ai|genai)\b.*engineer|engineer.*\b(ai|ml|llm)\b/i },
  // Solutions Engineer is a target role; Sales Engineer and Technical Account
  // Manager are commercial roles that merely sound similar, and are excluded
  // below rather than scored here.
  { role: 'se', weight: 35, re: /solutions? engineer|customer engineer/i },
  { role: 'fs', weight: 30, re: /full[- ]?stack|back[- ]?end (engineer|developer)|software (engineer|developer|development engineer)|\bsde\b|platform engineer|member of (the )?technical staff|\b[sl]?mts\b/i },
  { role: 'senior', weight: 15, re: /\b(senior|staff|principal|lead|sr\.?)\b/i },
];

/**
 * Titles that pattern-match but are not what he is looking for. Sales-adjacent
 * engineering, and specialisms far from his history (security, Salesforce,
 * hardware, firmware) that would otherwise score highly on "Engineer".
 */
const EXCLUDE = new RegExp([
  '\\b(intern|internship|graduate|new grad|apprentice)\\b',
  '\\b(recruiter|sales development|sdr|account executive|marketing|designer)\\b',
  '\\b(sales engineer|technical account manager|account manager|customer success)\\b',
  '\\b(salesforce|workday|netsuite|sap abap)\\b',
  '\\b(security engineer|cryptograph\\w*|firmware|hardware|embedded|silicon|fpga)\\b',
  '\\b(data entry|support specialist|manager, people|hr business|technical writer)\\b',
].join('|'), 'i');

const DSA_SIGNALS = /leetcode|data structures and algorithms|algorithmic (interview|assessment)|hackerrank|codesignal|competitive programming/i;

const LOCATION_OK = /remote|hybrid|onsite|on-site|emea|europe|london|berlin|amsterdam|munich|paris|dublin|madrid|lisbon|zurich|stockholm|dubai|abu dhabi|uae|riyadh|saudi|doha|qatar|singapore|tokyo|sydney|toronto|vancouver|san francisco|sf|bay area|new york|nyc|seattle|austin|boston|chicago|india|bangalore|bengaluru|bengalore|anywhere|global|worldwide|us|united states|uk|united kingdom/i;

/**
 * In India he targets Bangalore only, or remote. A role placed in any other
 * Indian city is excluded unless the same listing also offers Bangalore or
 * remote ("Bangalore, Hyderabad" and "Pune (Remote)" stay). A bare "India"
 * with no city is kept: it usually means country-wide or remote.
 */
const INDIA_OTHER_CITY = /\b(mumbai|bombay|thane|navi mumbai|delhi|new delhi|ncr|gurgaon|gurugram|noida|ghaziabad|faridabad|hyderabad|secunderabad|pune|chennai|kolkata|calcutta|ahmedabad|gandhinagar|kochi|cochin|trivandrum|thiruvananthapuram|jaipur|chandigarh|mohali|indore|coimbatore|mysore|mysuru|visakhapatnam|vizag|bhubaneswar|nagpur|lucknow|vadodara|surat|goa|kerala|tamil nadu|telangana|maharashtra|uttar pradesh|haryana|west bengal|gujarat|andhra pradesh|rajasthan|punjab|madhya pradesh|odisha|uttarakhand|bihar|jharkhand|assam)\b/i;
const BANGALORE_OR_REMOTE = /bangalore|bengaluru|bengalore|remote|work from home|\bwfh\b|anywhere/i;

export const outsideIndiaTarget = (location = '') =>
  INDIA_OTHER_CITY.test(location) && !BANGALORE_OR_REMOTE.test(location);

// A trailing "- Zagreb, Croatia" / "(Remote)" / "| Bangalore" names a place,
// not a different job: Speechify posted one role 173 times that way.
const PLACE_HINT = /\b(remote|hybrid|onsite|on-site|usa|us|uk|united states|united kingdom|india|germany|france|spain|italy|canada|mexico|brazil|argentina|colombia|chile|netherlands|belgium|denmark|sweden|norway|finland|croatia|serbia|romania|bulgaria|greece|poland|portugal|ireland|switzerland|austria|czech(ia| republic)?|hungary|turkey|israel|egypt|nigeria|kenya|south africa|singapore|japan|korea|china|taiwan|philippines|vietnam|indonesia|malaysia|thailand|australia|new zealand|uae|dubai|saudi arabia|qatar|emea|apac|latam|europe|americas|bangalore|bengaluru|hyderabad|pune|mumbai|delhi|london|berlin|munich|paris|madrid|barcelona|lisbon|dublin|zurich|stockholm|warsaw|new york|nyc|san francisco|sf|bay area|seattle|austin|boston|chicago|toronto|vancouver|amsterdam|tel aviv|tokyo|sydney)\b|,\s*[A-Z]{2}\b/i;

/** The title with any trailing location suffix removed, for de-duplication. */
export function titleKey(title = '') {
  let t = String(title).trim().replace(/\s+/g, ' ');
  for (let i = 0; i < 2; i++) {
    const m = t.match(/^(.*\S)\s*(?:[-–—|]\s+([^-–—|]+)|\(([^()]+)\))$/);
    if (!m) break;
    const tail = m[2] || m[3] || '';
    if (!PLACE_HINT.test(tail) || m[1].length < 6) break;
    t = m[1].trim();
  }
  return t.toLowerCase();
}

export function scoreJob(job) {
  const title = job.title || '';
  if (EXCLUDE.test(title)) return { relevance: 0, roles: [] };
  if (outsideIndiaTarget(job.location || '')) return { relevance: 0, roles: [], excluded: 'india-city' };

  let score = 0;
  const roles = [];
  for (const p of ROLE_PATTERNS) {
    if (p.re.test(title)) { score += p.weight; if (p.role !== 'senior') roles.push(p.role); }
  }
  if (!roles.length) return { relevance: 0, roles: [] };

  if (LOCATION_OK.test(job.location || '')) score += 20;

  // Recent postings matter more — a six-month-old listing is usually filled.
  if (job.postedAt) {
    const days = (Date.now() - new Date(job.postedAt).getTime()) / 86_400_000;
    if (days <= 7) score += 25;
    else if (days <= 30) score += 12;
    else if (days > 120) score -= 15;
  }

  return { relevance: Math.max(0, Math.min(100, score)), roles };
}

// ── The agent ─────────────────────────────────────────────────────────

export async function runDiscovery({ trigger = 'manual', companyIds = null, minRelevance = 40 } = {}) {
  const run = await one(
    `INSERT INTO agent_runs (kind, trigger, status) VALUES ('job-discovery', $1, 'running')
     RETURNING id, started_at`,
    [trigger],
  );

  const companies = companyIds?.length
    ? await many('SELECT * FROM companies WHERE id = ANY ($1::text[]) AND NOT freelance ORDER BY name', [companyIds])
    // A marketplace's own careers board lists its employees' roles, not the
    // gigs on the platform — reporting those as "open roles" misleads.
    : await many('SELECT * FROM companies WHERE NOT freelance ORDER BY custom, name');

  const detail = [];
  const errors = [];
  let seen = 0;
  let added = 0;

  try {
    for (const company of companies) {
      try {
        // Re-probing every run is wasteful; a known board is reused.
        let provider = company.ats_provider;
        let slug = company.ats_slug;
        let jobs = null;

        if (provider && slug) {
          jobs = await fetchBoard(provider, slug);
        }
        if (!jobs) {
          const found = await resolveBoard(company);
          if (found) ({ provider, slug, jobs } = found);
        }

        if (!jobs) {
          await query(
            'UPDATE companies SET ats_checked_at = now(), ats_job_count = 0 WHERE id = $1',
            [company.id],
          );
          detail.push({ company: company.name, board: null, seen: 0, new: 0, note: 'no public board' });
          continue;
        }

        await query(
          `UPDATE companies SET ats_provider = $2, ats_slug = $3,
                                ats_checked_at = now(), ats_job_count = $4
           WHERE id = $1`,
          [company.id, provider, slug, jobs.length],
        );

        let newForCompany = 0;
        let relevantForCompany = 0;

        // The same role is often listed once per office. Keep the newest.
        const deduped = [...jobs
          .filter((j) => j.url && j.title)
          .sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0))
          .reduce((map, j) => {
            const key = titleKey(j.title);
            if (!map.has(key)) map.set(key, j);
            return map;
          }, new Map())
          .values()];

        for (const job of deduped) {
          const { relevance, roles } = scoreJob(job);
          if (relevance < minRelevance) continue;
          relevantForCompany += 1;

          const dsa = DSA_SIGNALS.test(job.description || '');

          const row = await one(
            `INSERT INTO jobs (company_id, company_name, title, url, location, source,
                               description, no_dsa, posted_at, relevance, matched_roles,
                               ats, external_id, seen_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
             ON CONFLICT (url) DO UPDATE SET
               title = EXCLUDED.title,
               location = EXCLUDED.location,
               posted_at = COALESCE(EXCLUDED.posted_at, jobs.posted_at),
               relevance = EXCLUDED.relevance,
               matched_roles = EXCLUDED.matched_roles,
               seen_at = now(),
               closed_at = NULL
             RETURNING (xmax = 0) AS inserted, dismissed`,
            [
              company.id, company.name, job.title, job.url, job.location, provider,
              job.description || '', !dsa, job.postedAt, relevance, roles,
              provider, job.externalId,
            ],
          );

          seen += 1;
          // A role already dismissed is not counted as new again.
          if (row?.inserted && !row.dismissed) { added += 1; newForCompany += 1; }
        }

        detail.push({
          company: company.name,
          board: `${provider}:${slug}`,
          total: jobs.length,
          relevant: relevantForCompany,
          new: newForCompany,
        });
      } catch (err) {
        errors.push({ company: company.name, error: err.message });
      }

      await sleep(250); // polite to the public endpoints
    }

    // Anything not seen in this sweep is treated as closed, not deleted, so
    // the history of what was once open stays intact.
    let closed = 0;
    if (!companyIds) {
      const res = await query(
        `UPDATE jobs SET closed_at = now()
         WHERE closed_at IS NULL AND seen_at < $1 AND source IN ('greenhouse','lever','ashby')`,
        [run.started_at],
      );
      closed = res.rowCount || 0;
    }

    await query(
      `UPDATE agent_runs
       SET status = 'done', companies = $2, jobs_seen = $3, jobs_new = $4,
           jobs_closed = $5, errors = $6, detail = $7, finished_at = now()
       WHERE id = $1`,
      [run.id, companies.length, seen, added, closed, JSON.stringify(errors), JSON.stringify(detail)],
    );

    return {
      runId: run.id,
      companies: companies.length,
      jobsSeen: seen,
      jobsNew: added,
      jobsClosed: closed,
      errors: errors.length,
      boardsFound: detail.filter((d) => d.board).length,
    };
  } catch (err) {
    await query(
      `UPDATE agent_runs SET status = 'error', error = $2, detail = $3, finished_at = now() WHERE id = $1`,
      [run.id, err.message, JSON.stringify(detail)],
    );
    throw err;
  }
}

// ── Reads ─────────────────────────────────────────────────────────────

export async function listJobs({
  limit = 100, companyId, includeClosed = false, minRelevance = 0, favouritesOnly = false,
  kind = 'fte', appStatus = null, source = null, sort = 'recent',
} = {}) {
  const where = ['relevance >= $1'];
  const params = [minRelevance];

  if (!includeClosed) where.push('closed_at IS NULL');
  if (favouritesOnly) where.push('favourite');
  if (companyId) { params.push(companyId); where.push(`company_id = $${params.length}`); }
  // Gigs share the table but not the views: the full-time "Open roles" list
  // must never fill up with $40 Freelancer.com bids.
  if (kind === 'gigs') where.push("engagement IS NOT NULL AND engagement <> 'fte'");
  else if (kind === 'fte') where.push("(engagement IS NULL OR engagement = 'fte')");
  if (appStatus === 'any') where.push('app_status IS NOT NULL');
  else if (appStatus) { params.push(appStatus); where.push(`app_status = $${params.length}`); }
  if (source) { params.push(source); where.push(`source = $${params.length}`); }
  params.push(Math.min(limit, 300));

  const order = {
    recent: 'dismissed ASC, posted_at DESC NULLS LAST, discovered_at DESC',
    // An unscored role ranks as fit <= 70 until scored, so a fresh title match
    // never jumps above a known strong fit.
    match: 'dismissed ASC, COALESCE(fit_score, LEAST(relevance, 70)) DESC, posted_at DESC NULLS LAST',
    // Fresh roles first (speed matters), best fit first within them.
    best: `dismissed ASC, (COALESCE(posted_at, discovered_at) > now() - interval '7 days') DESC, COALESCE(fit_score, LEAST(relevance, 70)) DESC, posted_at DESC NULLS LAST`,
    pay: "dismissed ASC, COALESCE((meta->>'usdMax')::numeric, (meta->>'usdMin')::numeric, 0) DESC, relevance DESC",
  }[sort] || 'dismissed ASC, posted_at DESC NULLS LAST, discovered_at DESC';

  return many(
    `SELECT id, company_id, company_name, title, url, location, source, posted_at,
            discovered_at, relevance, matched_roles, no_dsa, closed_at, favourite, dismissed,
            engagement, rate_min, rate_max, rate_unit, currency, skills, meta,
            app_status, app_status_at, (proposal IS NOT NULL) AS has_proposal,
            left(description, 420) AS snippet, why_role, fit_score,
            (SELECT w.why FROM company_why w WHERE w.key = lower(trim(company_name))) AS why_company,
            (SELECT ct.tag FROM company_targets ct WHERE ct.key = lower(trim(company_name))) AS target_tag,
            (SELECT ct.priority FROM company_targets ct WHERE ct.key = lower(trim(company_name))) AS target_priority
     FROM jobs
     WHERE ${where.join(' AND ')}
     ORDER BY ${order}
     LIMIT $${params.length}`,
    params,
  );
}

export async function agentRuns(limit = 25) {
  return many(
    `SELECT id, kind, trigger, status, companies, jobs_seen, jobs_new, jobs_closed,
            jsonb_array_length(errors) AS error_count, error,
            started_at, finished_at,
            EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - started_at))::int AS duration_sec
     FROM agent_runs ORDER BY started_at DESC LIMIT $1`,
    [limit],
  );
}

export async function agentRun(id) {
  return one('SELECT * FROM agent_runs WHERE id = $1', [id]);
}

/** Latest posting date per company, for the card badges. */
export async function latestPostings() {
  return many(
    `SELECT j.company_id,
            MAX(j.posted_at) AS latest_posted,
            COUNT(*) FILTER (WHERE j.closed_at IS NULL) AS open_jobs,
            COUNT(*) FILTER (WHERE j.closed_at IS NULL AND j.posted_at > now() - interval '14 days') AS fresh_jobs,
            COALESCE(
              (
                SELECT json_agg(j_sub)
                FROM (
                  SELECT id, title, url, location, relevance, posted_at, why_role, fit_score
                  FROM jobs j2
                  WHERE j2.company_id = j.company_id
                    AND j2.closed_at IS NULL
                    AND NOT j2.dismissed
                    AND j2.relevance >= 40
                  ORDER BY COALESCE(j2.fit_score, LEAST(j2.relevance, 70)) DESC, j2.posted_at DESC NULLS LAST
                  LIMIT 5
                ) j_sub
              ),
              '[]'::json
            ) AS jobs
     FROM jobs j WHERE j.relevance >= 40 AND NOT j.dismissed
       AND (j.engagement IS NULL OR j.engagement = 'fte')
     GROUP BY j.company_id`,
  );
}

/**
 * On-demand JD fetch for the Tailor Resume flow.
 *
 * Given a company id and a role query ("FDE", "AI engineer", "Solutions
 * Engineer" or the exact posting title), find the best-matching open role on
 * the company's public ATS board and return its full JD text. Reuses the
 * board resolution and role-pattern matching that the discovery agent
 * already relies on, so we do not maintain a second set of rules.
 *
 * Returns { title, url, location, description, source } on success, or null
 * when the company has no discoverable public board, no matching role, or a
 * matching role with an empty description body.
 */
export async function fetchJdForRole(companyId, roleQuery = '') {
  const company = await one('SELECT * FROM companies WHERE id = $1', [companyId]);
  if (!company) return null;

  // Try the cached board first — resolve() re-probes only if the cache misses,
  // which keeps the drawer responsive when a board was already discovered.
  let provider = company.ats_provider;
  let slug = company.ats_slug;
  let jobs = null;
  if (provider && slug) jobs = await fetchBoard(provider, slug);
  if (!jobs) {
    const found = await resolveBoard(company);
    if (found) ({ provider, slug, jobs } = found);
  }
  if (!jobs || !jobs.length) return null;

  // Rank candidates. Priority order:
  //   1. The role query as a substring of the title.
  //   2. Our own role-code match (fde/ai/se/fs) via scoreJob.
  //   3. Anything else — falls out if we found nothing at 1 or 2.
  const q = String(roleQuery || '').trim().toLowerCase();
  const shortCodes = { fde: 'fde', 'ai eng': 'ai', ai: 'ai', ml: 'ai', se: 'se', 'solutions engineer': 'se', fs: 'fs', 'full stack': 'fs' };
  const codeHint = shortCodes[q] || null;

  const scored = jobs
    .filter((j) => j.title && j.description && j.description.length > 200)
    .map((j) => {
      const title = j.title.toLowerCase();
      const s = scoreJob(j);
      let bonus = 0;
      if (q && title.includes(q)) bonus += 200;
      if (codeHint && s.roles.includes(codeHint)) bonus += 100;
      return { job: j, score: s.relevance + bonus };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = scored[0]?.job;
  if (!best) return null;

  return {
    title: best.title,
    url: best.url,
    location: best.location || '',
    description: best.description,
    source: `${provider} board (${slug})`,
  };
}
