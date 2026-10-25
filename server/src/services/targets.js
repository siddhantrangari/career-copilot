import { many, one, query } from '../db/pool.js';
import { config } from '../config.js';
import { chatJson, logRun } from './ai.js';
import { candidateBlock } from './context.js';
import { groundedSearch } from './search.js';
import { setNavigatorAliases } from './search-links.js';

/**
 * Targeting — the company-first half of the NxtJob method.
 *
 * Job discovery answers "what is posted". This answers "where should I
 * spend my week": which companies to apply to now, which to reach through
 * people because no matching role is posted, and which deserve priority
 * because they are hiring hard and fit him best.
 *
 *   Navigator     niche and title aliases from evidence in his work history
 *   signals       free ones from discovered jobs (daily), researched ones
 *                 from a grounded web search (weekly, top candidates only)
 *   tags          apply | outreach | watch, plus a priority star
 *   outreach      weekly targets, progress and the next action per company
 */

const DAY = 86_400_000;
const tz = () => config.digest.timeZone;

// ── Navigator ─────────────────────────────────────────────────────────

export async function loadNavigator() {
  const row = await one(`SELECT data, generated_at FROM target_profile WHERE id = 'siddhant'`);
  if (row?.data?.titleAliases) setNavigatorAliases(row.data.titleAliases);
  return row ? { ...row.data, generatedAt: row.generated_at } : null;
}

/**
 * NxtJob Day-1 prompt 01, grounded: patterns across his real work, not his
 * titles, inside the constraints he has set (locations, no DSA).
 */
export async function generateNavigator() {
  const candidate = await candidateBlock();
  const data = await chatJson({
    kind: 'navigator',
    maxTokens: 7000,
    system: `Act as a top executive recruiter and talent-market analyst. Analyse the candidate from evidence in his work — recurring strengths, problems solved, scope, industries, customer types, company sizes — not from his job titles. Base every recommendation on patterns that recur across several roles, never a single project. Stay inside his stated constraints (locations: Bangalore/Bengaluru or remote India, EU remote, Gulf, global remote; avoids DSA/LeetCode-style interviews). Never invent experience. Return valid JSON only.`,
    user: `${candidate}

Return JSON exactly:
{
  "niche": {
    "roles": ["highest-probability target roles, best first"],
    "industries": ["industries where his evidence is strongest"],
    "companyTypes": ["e.g. Series B-D AI startups, product GCCs in Bangalore"],
    "seniority": "the level he is most competitive at",
    "geographies": ["in priority order"]
  },
  "strengths": [ { "pattern": "recurring strength", "evidence": "the roles/projects that show it" } ],
  "titleAliases": {
    "Forward Deployed": ["up to 12 distinct title aliases actually used for this kind of role across startups, scale-ups, enterprises, consulting firms and MNCs — most common first"],
    "AI Engineer": ["..."],
    "Full Stack": ["..."],
    "Solutions Engineer": ["..."],
    "Backend": ["..."]
  },
  "avoid": ["role types or company types that are a poor fit, with reason"]
}`,
  });
  await query(
    `INSERT INTO target_profile (id, data) VALUES ('siddhant', $1)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, generated_at = now()`,
    [JSON.stringify(data)],
  );
  setNavigatorAliases(data.titleAliases);
  return data;
}

// ── Free signals from discovered jobs ─────────────────────────────────

// Roles listed once per city still count once.
const NORM_TITLE = `lower(regexp_replace(j.title, '\\s+[-–—|]\\s+[^-–—|]*$', ''))`;

/** Recompute job-based signals for every employer and the catalogue. No cost. */
async function computeFreeSignals() {
  await query(
    `WITH roles AS (
       SELECT lower(trim(j.company_name)) AS key, max(j.company_name) AS name, max(j.company_id) AS company_id,
              count(DISTINCT ${NORM_TITLE}) FILTER (WHERE j.fit_score >= 75) AS open_fit75,
              count(DISTINCT ${NORM_TITLE}) FILTER (WHERE COALESCE(j.posted_at, j.discovered_at) > now() - interval '30 days') AS new_30d,
              count(DISTINCT ${NORM_TITLE}) FILTER (WHERE COALESCE(j.posted_at, j.discovered_at) BETWEEN now() - interval '60 days' AND now() - interval '30 days') AS prev_30d,
              max(j.fit_score) AS best_fit,
              (array_agg(j.id ORDER BY j.fit_score DESC NULLS LAST, j.posted_at DESC NULLS LAST))[1] AS best_job_id
       FROM jobs j
       WHERE j.closed_at IS NULL AND NOT j.dismissed AND j.relevance >= 40
         AND COALESCE(j.engagement, 'fte') = 'fte' AND j.company_name <> ''
       GROUP BY 1
     ),
     -- One row per name: the catalogue has a few duplicate entries (a custom
     -- copy of a seeded company); the seeded one wins.
     catalogue AS (
       SELECT DISTINCT ON (lower(trim(c.name))) lower(trim(c.name)) AS key, c.name, c.id AS company_id
       FROM companies c WHERE NOT c.freelance AND NOT COALESCE(c.dismissed, false)
       ORDER BY lower(trim(c.name)), c.custom, c.created_at
     ),
     merged AS (
       SELECT COALESCE(r.key, k.key) AS key, COALESCE(k.name, r.name) AS name,
              COALESCE(k.company_id, r.company_id) AS company_id, (k.key IS NOT NULL) AS in_catalogue,
              COALESCE(r.open_fit75, 0) AS open_fit75, COALESCE(r.new_30d, 0) AS new_30d,
              COALESCE(r.prev_30d, 0) AS prev_30d, r.best_fit, r.best_job_id
       FROM roles r FULL JOIN catalogue k ON k.key = r.key
     )
     INSERT INTO company_targets (key, company_id, name, in_catalogue, open_fit75, new_30d, prev_30d, best_fit, best_job_id, updated_at)
     SELECT key, company_id, name, in_catalogue, open_fit75, new_30d, prev_30d, best_fit, best_job_id, now() FROM merged
     ON CONFLICT (key) DO UPDATE SET
       company_id = EXCLUDED.company_id, name = EXCLUDED.name, in_catalogue = EXCLUDED.in_catalogue,
       open_fit75 = EXCLUDED.open_fit75, new_30d = EXCLUDED.new_30d, prev_30d = EXCLUDED.prev_30d,
       best_fit = EXCLUDED.best_fit, best_job_id = EXCLUDED.best_job_id, updated_at = now()`,
  );
  // An employer that no longer has roles and left the catalogue keeps its
  // row (history), but its job counts must read zero.
  await query(
    `UPDATE company_targets t SET open_fit75 = 0, new_30d = 0, prev_30d = 0, best_fit = NULL, best_job_id = NULL
     WHERE NOT EXISTS (SELECT 1 FROM jobs j WHERE lower(trim(j.company_name)) = t.key AND j.closed_at IS NULL AND NOT j.dismissed AND j.relevance >= 40)`,
  );
}

const freeScore = (t) => Math.min(100,
  t.new_30d * 6 + t.open_fit75 * 4 + (t.new_30d >= 3 && t.new_30d > t.prev_30d ? 15 : 0));

// ── Researched signals (weekly, top candidates) ───────────────────────

async function researchOne(t, niche) {
  const started = Date.now();
  const search = await groundedSearch(
    `${t.name}: hiring and growth signals from the last 12 months relevant to software / AI engineering hiring in Bangalore or remote India. ` +
    'Cover: funding rounds (amount, date), revenue or ARR growth, India / Bangalore office or GCC expansion, engineering headcount growth, ' +
    'new senior engineering or AI leadership hires, and any layoffs or hiring freezes (with dates). Cite each fact with its source and date.',
    { maxTokens: 900 },
  );
  // Logged so the weekly research spend is visible (token-priced; the
  // search provider's small per-request fee is not included).
  const u = search.usage || {};
  await logRun({ kind: 'hiring-signals-search', companyId: t.company_id, model: search.model, ok: true, durationMs: Date.now() - started,
    tokensIn: u.prompt_tokens || 0, tokensOut: u.completion_tokens || 0, input: { company: t.name } });

  const out = await chatJson({
    kind: 'hiring-signals',
    companyId: t.company_id,
    model: process.env.TARGETS_MODEL || 'openai/gpt-5.6-luna',
    maxTokens: 900,
    system: `You turn web-search findings into hiring signals for one company. Use ONLY the findings text; never add facts from memory. Every signal needs a date and source taken from the findings. If the findings are thin, say so and score low. Return valid JSON only.`,
    user: `TODAY: ${new Date().toISOString().slice(0, 10)}
COMPANY: ${t.name}
HIS NICHE: ${JSON.stringify(niche || {})}
OPEN ROLES HE FITS (from discovery): ${t.open_fit75} with fit >= 75; new relevant roles in 30 days: ${t.new_30d}

FINDINGS
${search.content}

SOURCES
${JSON.stringify((search.sources || []).slice(0, 8))}

Return JSON exactly:
{
  "signals": [ { "type": "funding|growth|india_expansion|headcount|leadership|layoffs|other", "text": "one line", "date": "Mon YYYY", "source": "url" } ],
  "layoffs": false,  // true ONLY for layoffs or a hiring freeze dated within the 6 months before TODAY
  "hiringScore": 0,
  "companyFit": 0,
  "whyNow": "one line, at most 18 words, naming the strongest dated signal — or 'No strong hiring signal found'"
}
hiringScore 0-100: 80+ = recent large funding or India/Bangalore expansion plus engineering growth; 50-79 = some recent growth signals; below 50 = little evidence; layoffs or a freeze in the 6 months before TODAY caps it at 30 — older layoffs are history, not a current signal.
companyFit 0-100: how well the company matches HIS NICHE (role types, industries, company types, geographies) — from the findings and niche only.`,
  });
  return {
    ...out,
    hiringScore: Math.max(0, Math.min(100, Number(out?.hiringScore) || 0)),
    companyFit: Math.max(0, Math.min(100, Number(out?.companyFit) || 0)),
    sources: (search.sources || []).slice(0, 6),
  };
}

/**
 * Research up to `limit` companies not researched in the last week: tracked
 * ones first (he is already working them), then the strongest by free
 * signals. Each costs one grounded search plus a small extraction.
 */
async function researchSignals(limit, onStep) {
  if (!limit) return 0;
  const niche = (await loadNavigator())?.niche || null;
  const picks = await many(
    `SELECT t.* FROM company_targets t
     LEFT JOIN tracked_companies tc ON tc.company_id = t.company_id
     WHERE (t.research_at IS NULL OR t.research_at < now() - interval '7 days')
       AND (t.in_catalogue OR t.open_fit75 > 0)
     ORDER BY (tc.company_id IS NOT NULL AND tc.stage NOT IN ('failed', 'offer')) DESC,
              (t.new_30d * 6 + t.open_fit75 * 4) DESC, t.best_fit DESC NULLS LAST
     LIMIT $1`,
    [limit],
  );
  let done = 0;
  for (const t of picks) {
    try {
      onStep?.({ phase: 'targets', status: 'running', message: `Hiring signals: ${t.name}` });
      const r = await researchOne(t, niche);
      await query(`UPDATE company_targets SET research = $2, research_at = now() WHERE key = $1`, [t.key, JSON.stringify(r)]);
      done += 1;
    } catch (err) {
      onStep?.({ phase: 'targets', status: 'error', message: `${t.name}: ${err.message}` });
    }
  }
  return done;
}

// ── Scoring, tags, ranking ────────────────────────────────────────────

/**
 * apply     a fit >= 75 role is open now (apply, and ask for a referral)
 * outreach  no matching role is posted but the company fits — the hidden
 *           market: reach insiders before a role is advertised
 * watch     neither
 * priority  hiring hard (>= 65) and among his best fits (>= 80), no layoffs
 */
async function scoreAndTag() {
  const rows = await many(
    `SELECT t.*, (tc.company_id IS NOT NULL) AS tracked FROM company_targets t
     LEFT JOIN tracked_companies tc ON tc.company_id = t.company_id`,
  );
  const scored = rows.map((t) => {
    const r = t.research || null;
    const free = freeScore(t);
    const layoffs = Boolean(r?.layoffs);
    let hiring = r ? Math.max(Math.round(free * 0.9), r.hiringScore) : Math.round(free * 0.9);
    if (layoffs) hiring = Math.min(hiring, 30);
    const prior = t.in_catalogue ? 70 + (t.tracked ? 5 : 0) : 55;
    const roleFit = t.best_fit ?? null;
    const fit = r?.companyFit
      ? Math.round(roleFit != null ? (r.companyFit + roleFit) / 2 : r.companyFit)
      : (roleFit ?? prior);
    const tag = t.open_fit75 > 0 ? 'apply' : fit >= 70 ? 'outreach' : 'watch';
    const priority = !layoffs && tag !== 'watch' && hiring >= 65 && fit >= 80;
    const roles = t.new_30d || 0;
    const whyNow = r?.whyNow && !/no strong hiring signal/i.test(r.whyNow) ? r.whyNow
      : tag === 'apply'
        ? (roles ? `${roles} new relevant role${roles === 1 ? '' : 's'} in 30 days, best fit ${t.best_fit}` : `${t.open_fit75} open fit-75+ role${t.open_fit75 === 1 ? '' : 's'}`)
        : roles ? `Hiring (${roles} relevant role${roles === 1 ? '' : 's'} in 30 days) but none fit-75+ — network into the right team` : null;
    // ⭐ Priority first (apply before outreach within it), then Apply, then
    // Outreach; the hiring/fit blend orders companies inside each group.
    const group = priority ? (tag === 'apply' ? 4 : 3) : tag === 'apply' ? 2 : tag === 'outreach' ? 1 : 0;
    return { key: t.key, hiring, fit, tag, priority, whyNow, sort: group * 1000 + hiring * 0.5 + fit * 0.5 };
  });
  scored.sort((a, b) => b.sort - a.sort);
  let rank = 0;
  for (const s of scored) {
    const r = s.tag === 'watch' ? null : (rank += 1);
    await query(
      `UPDATE company_targets SET hiring_score = $2, company_fit = $3, tag = $4, priority = $5, why_now = $6, rank = $7 WHERE key = $1`,
      [s.key, s.hiring, s.fit, s.tag, s.priority, s.whyNow, r],
    );
  }
  return {
    apply: scored.filter((s) => s.tag === 'apply').length,
    outreach: scored.filter((s) => s.tag === 'outreach').length,
    priority: scored.filter((s) => s.priority).length,
  };
}

/** Daily: free signals and tags. Weekly (research=true): also researched signals. */
export async function refreshTargets({ trigger = 'manual', research = false, researchLimit = config.targets.researchPerWeek, onStep } = {}) {
  const run = await one(`INSERT INTO agent_runs (kind, trigger, status) VALUES ('targets', $1, 'running') RETURNING id`, [trigger]);
  try {
    await loadNavigator();
    await computeFreeSignals();
    const researched = research ? await researchSignals(researchLimit, onStep) : 0;
    const counts = await scoreAndTag();
    await query(
      `UPDATE agent_runs SET status = 'done', companies = $2, jobs_seen = $3, detail = $4, finished_at = now() WHERE id = $1`,
      [run.id, counts.apply + counts.outreach, researched, JSON.stringify([counts])],
    );
    return { ...counts, researched };
  } catch (err) {
    await query(`UPDATE agent_runs SET status = 'error', error = $2, finished_at = now() WHERE id = $1`, [run.id, err.message]);
    throw err;
  }
}

// ── Reads ─────────────────────────────────────────────────────────────

export async function listTargets({ tag = null, priorityOnly = false, limit = 20 } = {}) {
  return many(
    `SELECT t.key, t.name, t.company_id, t.in_catalogue, t.tag, t.priority, t.rank, t.hiring_score, t.company_fit,
            t.why_now, t.open_fit75, t.new_30d, t.best_fit, t.research_at,
            j.title AS best_role, j.url AS best_role_url, j.why_role AS why_role,
            NULLIF((SELECT w.why FROM company_why w WHERE w.key = t.key), '') AS why_company,
            tc.stage AS pipeline_stage,
            (SELECT count(*) FROM connections n WHERE n.company_id = t.company_id)::int AS contacts
     FROM company_targets t
     LEFT JOIN jobs j ON j.id = t.best_job_id
     LEFT JOIN tracked_companies tc ON tc.company_id = t.company_id
     WHERE t.rank IS NOT NULL AND ($1::text IS NULL OR t.tag = $1) AND (NOT $2 OR t.priority)
     ORDER BY t.rank LIMIT $3`,
    [tag, Boolean(priorityOnly), Math.min(Number(limit) || 20, 60)],
  );
}

/** Employers found by discovery, outside the catalogue, worth adding. */
export async function suggestedCompanies(limit = 5) {
  return many(
    `SELECT name, open_fit75, best_fit, hiring_score, why_now FROM company_targets
     WHERE NOT in_catalogue AND open_fit75 >= 2 AND best_fit >= 80
     ORDER BY priority DESC, hiring_score DESC, best_fit DESC LIMIT $1`,
    [limit],
  );
}

// ── Outreach loop ─────────────────────────────────────────────────────

export const ACTIVITY_KINDS = ['connection_request', 'dm', 'follow_up', 'call', 'referral_ask', 'win_doc_sent', 'application', 'post', 'action_done'];

export async function logActivity({ companyId = null, companyName = '', kind, count = 1, note = null }) {
  if (!ACTIVITY_KINDS.includes(kind)) throw new Error(`kind must be one of ${ACTIVITY_KINDS.join(', ')}`);
  const n = Math.max(1, Math.min(500, Math.round(Number(count) || 1)));
  return one(
    `INSERT INTO outreach_activity (company_id, company_name, kind, count, note) VALUES ($1, $2, $3, $4, $5) RETURNING id, at`,
    [companyId, companyName, kind, n, note],
  );
}

/** This IST week (Mon–Sun): reported activity plus contacts logged and moved. */
export async function outreachProgress() {
  const row = await one(
    `WITH wk AS (SELECT date_trunc('week', now() AT TIME ZONE $1) AS start)
     SELECT
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity, wk WHERE kind = 'connection_request' AND (at AT TIME ZONE $1) >= wk.start)
         + (SELECT count(*) FROM connections, wk WHERE (created_at AT TIME ZONE $1) >= wk.start) AS connections,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity, wk WHERE kind IN ('dm', 'follow_up') AND (at AT TIME ZONE $1) >= wk.start)
         + (SELECT count(*) FROM connections, wk WHERE status IN ('dm', 'fu1', 'fu2', 'fu3') AND (COALESCE(status_changed_at, created_at) AT TIME ZONE $1) >= wk.start) AS messages,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity, wk WHERE kind = 'call' AND (at AT TIME ZONE $1) >= wk.start)
         + (SELECT count(*) FROM connections, wk WHERE status = 'call' AND (COALESCE(status_changed_at, created_at) AT TIME ZONE $1) >= wk.start) AS calls,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity, wk WHERE kind = 'referral_ask' AND (at AT TIME ZONE $1) >= wk.start)
         + (SELECT count(*) FROM connections, wk WHERE status = 'ref' AND (COALESCE(status_changed_at, created_at) AT TIME ZONE $1) >= wk.start) AS referrals,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity, wk WHERE kind = 'application' AND (at AT TIME ZONE $1) >= wk.start) AS applications`,
    [tz()],
  );
  const g = config.targets;
  return {
    connections: Number(row.connections), connectionsTarget: g.weeklyConnections,
    messages: Number(row.messages), calls: Number(row.calls), callsTarget: g.weeklyCalls, callsStretch: g.weeklyCallsStretch,
    referrals: Number(row.referrals), applications: Number(row.applications),
  };
}

export const progressLine = (p) =>
  `${p.connections}/${p.connectionsTarget} connection requests · ${p.messages} messages · ${p.calls}/${p.callsTarget}${p.callsStretch > p.callsTarget ? `–${p.callsStretch}` : ''} calls · ${p.referrals} referrals`;

/** What to do next at one company, from its tag and the state of outreach there. */
export async function nextAction(t) {
  if (t.tag === 'apply') {
    const role = t.best_role ? `"${t.best_role}"${t.best_fit ? ` (fit ${t.best_fit})` : ''}` : 'the best-fit role';
    if (['applied', 'networking', 'call', 'win', 'interview'].includes(t.pipeline_stage)) {
      return t.contacts ? `Applied — ask your contact there for a referral on ${role}` : `Applied — find someone there to refer you for ${role}`;
    }
    return `Apply to ${role} and ask for a referral`;
  }
  if (!t.research_at) return 'Research first (their real problems — ask me to research it), then find 3–5 people there';
  if (!t.company_id || !t.contacts) return 'Find 3–5 people: the hiring manager, two peer engineers, one Indian engineer there';
  const waiting = await one(
    `SELECT name FROM connections WHERE company_id = $1 AND status = 'dm'
       AND COALESCE(status_changed_at, created_at) < now() - interval '4 days' ORDER BY status_changed_at LIMIT 1`,
    [t.company_id],
  );
  if (waiting) return `Follow up with ${waiting.name} (DM day 4) — add something new`;
  const called = await one(`SELECT name FROM connections WHERE company_id = $1 AND status = 'call' LIMIT 1`, [t.company_id]);
  if (called) return `Send a WIN doc built from your call with ${called.name}`;
  return `Keep going: ${t.contacts} contact${t.contacts === 1 ? '' : 's'} so far — send the next requests or DMs`;
}

/**
 * The week's plan: progress, then the top targets — both kinds, so applying
 * never crowds out outreach (the half of the method that reaches unposted
 * roles). Priority first within each kind.
 */
export async function outreachPlan({ limit = 8 } = {}) {
  const half = Math.max(1, Math.ceil(limit / 2));
  const [progress, apply, outreach, suggested] = await Promise.all([
    outreachProgress(),
    listTargets({ tag: 'apply', limit: half }),
    listTargets({ tag: 'outreach', limit: limit - half || 1 }),
    suggestedCompanies(3),
  ]);
  // Rank order — priority, then apply, then outreach — while keeping at
  // least one outreach company in view so that half of the method is not lost.
  const targets = [...apply, ...outreach].sort((a, b) => a.rank - b.rank).slice(0, limit);
  if (!targets.some((t) => t.tag === 'outreach') && outreach[0]) targets[targets.length - 1] = outreach[0];
  for (const t of targets) t.nextAction = await nextAction(t);
  return { progress, targets, suggested };
}
