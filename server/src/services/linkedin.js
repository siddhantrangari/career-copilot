import { many, one, query } from '../db/pool.js';

/**
 * LinkedIn people-search URL building.
 *
 * The bug this exists to fix: the prototypes built
 *   currentCompany=["Remote.com"]
 * LinkedIn's faceted search takes a numeric organisation id there, so a name
 * is silently dropped — the search runs unfiltered and returns engineering
 * managers at random companies. It looks like it worked. The correct form is
 *   currentCompany=["211358"]&origin=FACETED_SEARCH
 *
 * Ids are resolved once from LinkedIn's public guest company page, which
 * exposes urn:li:organization:<id> without authentication, and cached in the
 * companies table. Slug guessing can land on the wrong entity, so the resolved
 * page title is stored and shown for confirmation.
 *
 * ACCOUNT SAFETY — this is the part that matters:
 *   - Resolution runs server-side from the VPS. The user's LinkedIn account,
 *     cookies and session are never involved, and never could be: no auth
 *     header, no cookie jar, no browser.
 *   - It requests PUBLIC logged-out company pages only. No people data, no
 *     profile scraping, no connection or message automation.
 *   - One company at a time, ~1.5s apart, at most a few dozen page views, once.
 *   - Any sign of rate limiting (429, or LinkedIn's 999) aborts the whole run
 *     immediately rather than retrying into a block.
 *   - At runtime the app only BUILDS URLs. The user clicks them and browses
 *     LinkedIn himself, as a human, signed in normally. That is ordinary use.
 *
 * The worst case is that LinkedIn throttles the VPS IP for guest pages, which
 * costs us resolution and touches the user's account not at all. This is also
 * why there is no browser extension: an extension would act inside his
 * authenticated session, which is exactly where account risk lives.
 */

/** LinkedIn returns 999 for "rate limited / blocked". */
export class LinkedInBlocked extends Error {
  constructor(status) {
    super(`LinkedIn returned ${status} — stopping so we do not push into a block.`);
    this.name = 'LinkedInBlocked';
    this.status = status;
  }
}

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/131.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Geo ids are real LinkedIn region urns and were already correct. */
export const GEO = {
  gulf: ['102713980', '105756358'],
  eu: ['100565514', '102890719', '101165590', '105015875'],
  india: ['102257491'],
};

const slugVariants = (name) => {
  const base = String(name || '').toLowerCase().trim();
  const noTld = base.replace(/\.(com|io|ai|co|tech|dev)\b/g, '');
  const s = (x) => x.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return [...new Set([
    s(noTld),
    s(base),
    s(noTld).replace(/-/g, ''),
    s(noTld.split(/[\s/]/)[0]),
    `${s(noTld)}-ai`,
    `${s(noTld)}-labs`,
    `${s(noTld)}-inc`,
  ])].filter(Boolean);
};

/** Pull an organisation id out of anything the user might paste. */
export function parseLinkedInId(input) {
  const text = String(input || '').trim();
  if (!text) return null;

  if (/^\d+$/.test(text)) return { id: text, source: 'numeric' };

  // A filtered search URL: ...currentCompany=%5B%2217955831%22%5D
  const decoded = (() => { try { return decodeURIComponent(text); } catch { return text; } })();
  const facet = decoded.match(/currentCompany=\[?"?(\d+)"?\]?/);
  if (facet) return { id: facet[1], source: 'search-url' };

  const urn = decoded.match(/urn:li:(?:organization|company|fs_normalized_company):(\d+)/);
  if (urn) return { id: urn[1], source: 'urn' };

  // A company page URL — the slug still needs resolving.
  const slug = decoded.match(/linkedin\.com\/company\/([^/?#\s]+)/i);
  if (slug) return { slug: slug[1], source: 'company-url' };

  return null;
}

/** Fetch one public guest company page and read its organisation id. */
async function fetchOrgId(slug) {
  try {
    const res = await fetch(`https://www.linkedin.com/company/${slug}/`, {
      // No cookies, no Authorization, no credentials — an anonymous visitor.
      headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    });

    // Back off entirely rather than hammering a throttle.
    if (res.status === 429 || res.status === 999 || res.status === 403) {
      throw new LinkedInBlocked(res.status);
    }
    if (res.status !== 200) return null;

    const html = await res.text();
    const id = html.match(/urn:li:organization:(\d+)/)?.[1];
    if (!id) return null;

    const title = (html.match(/<title>([^<]+)<\/title>/)?.[1] || '')
      .split('|')[0].trim();
    return { id, slug, title };
  } catch (err) {
    if (err instanceof LinkedInBlocked) throw err;
    return null;
  }
}

/**
 * Resolve a company's LinkedIn id, trying slug spellings in order.
 * Deliberately slow — this is a handful of public page views, run once per
 * company, not a crawl.
 */
export async function resolveCompanyId(name, explicitSlug) {
  const slugs = explicitSlug ? [explicitSlug] : slugVariants(name);
  for (const slug of slugs) {
    const hit = await fetchOrgId(slug);
    if (hit) return hit;
    await sleep(500);
  }
  return null;
}

/** Store a resolved (or hand-supplied) id against a company. */
export async function setCompanyLinkedIn(companyId, { id, slug, title, verified = false }) {
  const row = await one(
    `UPDATE companies
     SET linkedin_company_id = COALESCE($2, linkedin_company_id),
         linkedin_slug       = COALESCE($3, linkedin_slug),
         linkedin_name       = COALESCE($4, linkedin_name),
         linkedin_verified   = $5,
         updated_at          = now()
     WHERE id = $1
     RETURNING id, name, linkedin_company_id, linkedin_slug, linkedin_name, linkedin_verified`,
    [companyId, id || null, slug || null, title || null, Boolean(verified)],
  );
  return row;
}

/** Resolve every company that has no id yet. Runs as a background task. */
export async function resolveAllMissing({ limit = 60 } = {}) {
  const pending = await many(
    `SELECT id, name FROM companies
     WHERE linkedin_company_id IS NULL
     ORDER BY custom, name LIMIT $1`,
    [limit],
  );

  const resolved = [];
  const failed = [];
  let stoppedEarly = null;

  for (const c of pending) {
    let hit = null;
    try {
      hit = await resolveCompanyId(c.name);
    } catch (err) {
      // Throttled: stop the run. Whatever resolved already is kept.
      stoppedEarly = err.message;
      break;
    }

    if (hit) {
      await setCompanyLinkedIn(c.id, { ...hit, verified: false });
      resolved.push({ id: c.id, name: c.name, linkedInId: hit.id, resolvedAs: hit.title });
    } else {
      failed.push({ id: c.id, name: c.name });
    }
    await sleep(1_500);
  }

  return {
    attempted: pending.length,
    resolved,
    failed,
    stoppedEarly,
    note:
      'Resolved by slug guess and NOT verified — check each "resolvedAs" name. ' +
      'A wrong match (e.g. "Cohere" resolving to "Cohere Labs") produces a ' +
      'search filtered to the wrong company.',
  };
}

// ── URL building ──────────────────────────────────────────────────────

const enc = encodeURIComponent;
const facetArray = (values) => enc(JSON.stringify(values.map(String)));

/**
 * Build a people-search URL. With a numeric id this is a real faceted search;
 * without one we do NOT emit a broken currentCompany facet — we fall back to
 * putting the company name in the keyword query, which genuinely narrows
 * results, and flag the search as imprecise so the UI can say so.
 */
export function peopleSearchUrl({ companyName, linkedInId, keywords, geoUrns }) {
  const params = [];

  if (linkedInId) {
    if (keywords) params.push(`keywords=${enc(keywords)}`);
    params.push(`currentCompany=${facetArray([linkedInId])}`);
    params.push('origin=FACETED_SEARCH');
  } else {
    // Quoted company name keeps it in the query rather than silently dropped.
    const combined = keywords
      ? `"${companyName}" AND (${keywords})`
      : `"${companyName}"`;
    params.push(`keywords=${enc(combined)}`);
    params.push('origin=GLOBAL_SEARCH_HEADER');
  }

  if (geoUrns?.length) params.push(`geoUrn=${facetArray(geoUrns)}`);

  return `https://www.linkedin.com/search/results/people/?${params.join('&')}`;
}

const ROLE_KEYWORDS = {
  peers: 'Senior Engineer OR "AI Engineer" OR "Forward Deployed" OR "Solutions Engineer" OR "Full Stack"',
  managers: '"Engineering Manager" OR "Head of Engineering" OR "VP Engineering" OR CTO OR "Director of Engineering"',
  recruiters: '"Technical Recruiter" OR "Talent Acquisition" OR Recruiter OR "People Partner"',
  indians: null, // the geo facet does the work; keywords would only add noise
};

/** The four network searches for one company, with correct URLs. */
export function networkSearches(company) {
  const linkedInId = company.linkedin_company_id || null;
  const region = company.region;
  const isIndia = region === 'in_remote' || region === 'blr_onsite' || region === 'blr_hybrid' || region === 'india';
  const regionGeo = region === 'gulf' ? GEO.gulf : region === 'eu' ? GEO.eu : isIndia ? GEO.india : null;

  const build = (kind, geo) =>
    peopleSearchUrl({
      companyName: company.name,
      linkedInId,
      keywords: ROLE_KEYWORDS[kind],
      geoUrns: geo,
    });

  return {
    precise: Boolean(linkedInId),
    linkedInId,
    linkedInName: company.linkedin_name || null,
    verified: Boolean(company.linkedin_verified),
    companyPage: company.linkedin_slug
      ? `https://www.linkedin.com/company/${company.linkedin_slug}/`
      : `https://www.linkedin.com/search/results/companies/?keywords=${enc(company.name)}`,
    searches: [
      { key: 'peers', label: 'Peers — same role', url: build('peers', regionGeo) },
      { key: 'managers', label: 'Hiring managers', url: build('managers', regionGeo) },
      { key: 'recruiters', label: 'Recruiters & HR', url: build('recruiters', regionGeo) },
      { key: 'indians', label: 'Indians at this company', url: build('indians', GEO.india) },
    ],
  };
}
