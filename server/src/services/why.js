import { many, one, query } from '../db/pool.js';
import { chatJson } from './ai.js';
import { loadCandidateContext } from './context.js';
import { cleanJdText } from './autofill.js';

/**
 * "Why this company" and "why this role" one-liners.
 *
 * Generated in batches on the cheap model and stored, so every surface (feed,
 * company cards, Track modal, digest, Telegram) shows them for free. The
 * model sees only what the app holds — the JD, the company's description and
 * research, the open roles there, and his compact profile — and is told to
 * write nothing else. A line it cannot ground is better left empty.
 */

const MODEL = process.env.WHY_MODEL || 'openai/gpt-5.6-luna';
const BATCH = 10;
const MAX_LEN = 220;

export const companyKey = (name) => String(name || '').trim().toLowerCase();

const clean = (s, n) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Profile small enough to resend with every batch: no resume body, no CAR narrative. */
async function compactCandidate() {
  const { profile, achievements } = await loadCandidateContext({ limit: 14 });
  if (!profile) throw new Error('No candidate profile configured');
  const skills = Object.entries(profile.skills || {})
    .filter(([k, v]) => !['constraints', 'gap_answer'].includes(k) && Array.isArray(v))
    .map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n');
  const wins = achievements
    .map((a) => `- ${a.title} (${a.company}): ${clean(a.result, 160)} [${(a.skills || []).slice(0, 6).join(', ')}]`)
    .join('\n');
  return `CANDIDATE
Headline: ${profile.headline}
Target roles: ${(profile.target_roles || []).join(', ')}
Targets: Bangalore/Bengaluru or remote in India; EU remote; Gulf; global remote. Avoids DSA/LeetCode-style interviews.
Summary: ${clean(profile.summary, 500)}
Skills:
${skills}
Proven work:
${wins}`;
}

const RULES = `Rules:
- Use ONLY facts in CANDIDATE and the item. Never invent products, customers, funding, culture, team size, tech stack or candidate skills.
- One line, at most 22 words. Plain and specific — name the concrete overlap. No hype ("perfect fit", "exciting"), no emoji, no quotes.
- Only if the item gives nothing to say, return an empty string.
Return JSON only: {"items":[{"id":"<id>","why":"<line>"}]}`;

async function writeLines(kind, candidate, items) {
  const system = kind === 'role'
    ? `You write a one-line "why this role" note for Siddhant's job search: which of his real strengths match this role, and the main gap if the JD clearly needs something he lacks (e.g. "…; gap: Go"). If there is no JD, judge from the title against his target roles and start the line with "Title only:".
Also give "fit", an integer 0-100 for how well this role suits him, from the same evidence:
- 85-100: one of his target role types, most required skills proven in his work, location acceptable.
- 70-84: target role type, many skills proven, one or two real gaps.
- 50-69: adjacent role, or several gaps in required skills.
- 30-49: major gap in core stack or domain (e.g. a language or platform he has never used).
- 0-29: not his field (mobile-native, hardware/firmware, sales, pure research).
Location: Bangalore/Bengaluru, India-remote, EU-remote, Gulf and global remote are acceptable; other on-site cities lower fit by 10-20. Title only (no JD): at most 60.
${RULES.replace('{"id":"<id>","why":"<line>"}', '{"id":"<id>","why":"<line>","fit":<0-100>}')}`
    : `You write a one-line "why this company" note for Siddhant's job search: what the company does (only from its description/research) and why it is worth his time (his target roles, location, the open roles there). With no description, never guess what the company does: say what it is hiring for (openRoles, trackedRoles) and why that suits him. Never start with "Title only:".\n${RULES}`;
  const res = await chatJson({
    kind: `why-${kind}`,
    model: MODEL,
    maxTokens: 1500,
    system,
    user: `${candidate}\n\nITEMS\n${JSON.stringify(items)}`,
  });
  const out = new Map();
  for (const it of res?.items || []) {
    if (!it?.id) continue;
    const why = clean(it.why, MAX_LEN);
    const fit = Number.isFinite(Number(it.fit)) ? Math.max(0, Math.min(100, Math.round(Number(it.fit)))) : null;
    if (why || fit !== null) out.set(String(it.id), { why, fit });
  }
  return out;
}

/** "AI Developer (applied)" from the CC_ROLES JSON kept in tracking notes. */
function trackedRoleTitles(json) {
  try {
    return (JSON.parse(json || '[]') || []).slice(0, 4).map((r) => `${r.title} (${r.stage || 'new'})`);
  } catch {
    return [];
  }
}

/**
 * Fill in missing lines, newest roles first. Safe to call repeatedly: only
 * rows without a line are touched, and nothing is ever deleted.
 */
export async function generateWhyLines({ maxJobs = 120, maxCompanies = 40, onStep = () => {} } = {}) {
  const jobs = await many(
    `SELECT id, title, company_name, location, left(description, 3000) AS jd
     FROM jobs
     WHERE closed_at IS NULL AND COALESCE(engagement, 'fte') = 'fte' AND NOT dismissed
       AND relevance >= 40 AND fit_score IS NULL
       -- a role the model could not ground is retried weekly, not every pass
       AND (why_role IS NOT NULL OR why_role_at IS NULL OR why_role_at < now() - interval '7 days')
       -- these sources fetch the JD right after listing; wait for it
       AND NOT (source IN ('workday', 'smartrecruiters') AND COALESCE(description, '') = '')
     ORDER BY COALESCE(posted_at, discovered_at) DESC LIMIT $1`,
    [maxJobs],
  );

  // Catalogue companies plus employers that only appear through discovery,
  // tracked ones and ones with open relevant roles first.
  const companies = await many(
    `WITH names AS (
       SELECT c.name, c.description, c.region, c.pay, c.research, (t.company_id IS NOT NULL) AS tracked,
              substring(t.notes from '<!--CC_ROLES:(.*?)-->') AS tracked_roles
       FROM companies c LEFT JOIN tracked_companies t ON t.company_id = c.id
       WHERE NOT COALESCE(c.dismissed, false) AND NOT c.freelance
       UNION
       SELECT DISTINCT ON (lower(j.company_name)) j.company_name, '', '', '', NULL::jsonb, false, NULL::text
       FROM jobs j
       WHERE j.company_id IS NULL AND j.closed_at IS NULL AND j.relevance >= 40
         AND COALESCE(j.engagement, 'fte') = 'fte' AND j.company_name <> ''
         AND NOT EXISTS (SELECT 1 FROM companies c2 WHERE lower(c2.name) = lower(j.company_name))
     )
     SELECT n.*, (
         SELECT json_agg(x.title) FROM (
           SELECT title FROM jobs j WHERE lower(j.company_name) = lower(n.name) AND j.closed_at IS NULL
             AND NOT j.dismissed AND j.relevance >= 40 ORDER BY j.relevance DESC LIMIT 4) x
       ) AS open_roles
     FROM names n
     WHERE NOT EXISTS (SELECT 1 FROM company_why w WHERE w.key = lower(trim(n.name)) AND w.why NOT LIKE 'Title only:%')
     ORDER BY n.tracked DESC, (SELECT count(*) FROM jobs j WHERE lower(j.company_name) = lower(n.name) AND j.closed_at IS NULL AND j.relevance >= 40) DESC
     LIMIT $1`,
    [maxCompanies],
  );

  if (!jobs.length && !companies.length) return { roles: 0, companies: 0, skipped: 0 };
  const candidate = await compactCandidate();
  let roles = 0; let comps = 0; let skipped = 0;

  // The same role is often listed once per city: write one line per
  // company + title and give it to every listing.
  const groups = new Map();
  for (const j of jobs) {
    const key = `${companyKey(j.company_name)}|${j.title.trim().toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, { lead: j, ids: [] });
    groups.get(key).ids.push(j.id);
  }
  const leads = [...groups.values()];

  for (let i = 0; i < leads.length; i += BATCH) {
    const batch = leads.slice(i, i + BATCH);
    try {
      const lines = await writeLines('role', candidate, batch.map(({ lead: j }) => ({
        id: j.id, title: j.title, company: j.company_name, location: j.location,
        jd: clean(cleanJdText(j.jd || ''), 900),
      })));
      for (const { lead, ids } of batch) {
        const got = lines.get(lead.id) || {};
        // Blank: recorded as attempted so it is not re-asked every pass. An
        // existing line is kept if this pass returned none.
        await query(
          `UPDATE jobs SET why_role = COALESCE($2, why_role), fit_score = $3, why_role_at = now()
           WHERE id = ANY ($1::uuid[]) AND fit_score IS NULL`,
          [ids, got.why || null, got.fit ?? null],
        );
        if (got.why || got.fit !== undefined) roles += ids.length; else skipped += ids.length;
      }
    } catch (err) {
      skipped += batch.reduce((n, g) => n + g.ids.length, 0);
      onStep({ phase: 'why', status: 'error', message: err.message });
    }
  }

  for (let i = 0; i < companies.length; i += BATCH) {
    const batch = companies.slice(i, i + BATCH);
    try {
      const lines = await writeLines('company', candidate, batch.map((c, k) => ({
        id: String(k), name: c.name, description: clean(c.description, 400), region: c.region || undefined,
        pay: c.pay || undefined, hook: c.research?.hookSentence || undefined,
        challenges: (c.research?.challenges || []).slice(0, 2).map((x) => clean(typeof x === 'string' ? x : x.title || x.challenge, 140)),
        openRoles: c.open_roles || [],
        trackedRoles: trackedRoleTitles(c.tracked_roles),
      })));
      for (const [k, c] of batch.entries()) {
        const why = lines.get(String(k))?.why || '';
        // An empty line marks "tried, nothing groundable"; every surface treats it as absent.
        await query(
          // Replaces only a line from the earlier prompt that wrongly used the
          // role-only "Title only:" prefix; a good line is never overwritten.
          `INSERT INTO company_why (key, name, why) VALUES ($1, $2, $3)
           ON CONFLICT (key) DO UPDATE SET why = EXCLUDED.why, generated_at = now()
           WHERE company_why.why LIKE 'Title only:%'`,
          [companyKey(c.name), c.name, why],
        );
        if (why) comps += 1; else skipped += 1;
      }
    } catch (err) {
      skipped += batch.length;
      onStep({ phase: 'why', status: 'error', message: err.message });
    }
  }
  return { roles, companies: comps, skipped };
}

/** How much is still missing — for the scheduler and status checks. */
export async function whyBacklog() {
  return one(
    `SELECT
       (SELECT count(*) FROM jobs WHERE closed_at IS NULL AND COALESCE(engagement,'fte')='fte' AND NOT dismissed
          AND relevance >= 40 AND fit_score IS NULL
          AND (why_role IS NOT NULL OR why_role_at IS NULL OR why_role_at < now() - interval '7 days'))::int AS roles,
       (SELECT count(*) FROM companies c WHERE NOT COALESCE(c.dismissed,false) AND NOT c.freelance
          AND NOT EXISTS (SELECT 1 FROM company_why w WHERE w.key = lower(trim(c.name)) AND w.why NOT LIKE 'Title only:%'))::int AS companies`,
  );
}
