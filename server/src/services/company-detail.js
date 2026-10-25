import { one, many, query } from '../db/pool.js';
import { chatJson } from './ai.js';
import { candidateBlock } from './context.js';
import { messagesPrompt } from './prompts.js';
import { companyKey } from './why.js';
import { companyNewsLinks, companyPeopleLinks } from './search-links.js';
import { nextAction } from './targets.js';

/**
 * Everything known about one company, from stored data only — no search
 * API is spent opening it. What is new on the web comes as Google searches
 * he opens (news, funding, layoffs, India expansion, interviews, people).
 */

const STAGE_ORDER = ['new', 'interested', 'applied', 'networking', 'call', 'win', 'interview', 'offer'];

function rolesOf(notes) {
  const m = String(notes || '').match(/<!--CC_ROLES:([\s\S]*?)-->/);
  if (!m) return [];
  try { const r = JSON.parse(m[1]); return Array.isArray(r) ? r : []; } catch { return []; }
}

/** Find a company by target key, catalogue id, or name. */
async function resolve({ key, id, name }) {
  let k = key ? companyKey(key) : name ? companyKey(name) : null;
  let company = id ? await one(`SELECT * FROM companies WHERE id = $1`, [id]) : null;
  if (!k && company) k = companyKey(company.name);
  if (!k) return null;
  const target = await one(`SELECT * FROM company_targets WHERE key = $1`, [k]);
  if (!company) {
    company = await one(
      `SELECT * FROM companies WHERE (id = $1 OR lower(trim(name)) = $2) ORDER BY (id = $1) DESC, custom, created_at LIMIT 1`,
      [target?.company_id || '', k],
    );
  }
  if (!target && !company) return null;
  return { key: k, name: company?.name || target?.name, company, target };
}

export async function companyDetail(ref) {
  const r = await resolve(ref);
  if (!r) return null;
  const { key, name, company, target } = r;
  const companyId = company?.id || null;

  const [why, roles, tracked, contacts, activity, messages] = await Promise.all([
    one(`SELECT why FROM company_why WHERE key = $1`, [key]),
    many(
      `SELECT id, title, url, location, source, fit_score, relevance, why_role, posted_at, discovered_at, app_status
       FROM jobs
       WHERE (lower(trim(company_name)) = $1 OR ($2::text IS NOT NULL AND company_id = $2))
         AND closed_at IS NULL AND NOT dismissed AND COALESCE(engagement, 'fte') = 'fte'
       ORDER BY fit_score DESC NULLS LAST, relevance DESC, COALESCE(posted_at, discovered_at) DESC
       LIMIT 15`,
      [key, companyId],
    ),
    companyId ? one(`SELECT stage, notes, stage_changed_at, win_status FROM tracked_companies WHERE company_id = $1`, [companyId]) : null,
    companyId ? many(`SELECT id, name, role, type, status, linkedin_url, created_at FROM connections WHERE company_id = $1 ORDER BY position`, [companyId]) : [],
    many(
      `SELECT at, kind, count, note FROM outreach_activity
       WHERE (company_id = $1 OR lower(trim(company_name)) = $2) ORDER BY at DESC LIMIT 10`,
      [companyId || '', key],
    ),
    companyId ? many(`SELECT kind, body, created_at FROM messages WHERE company_id = $1 ORDER BY created_at DESC LIMIT 4`, [companyId]) : [],
  ]);

  const best = roles[0] || null;
  const action = target?.rank ? await nextAction({
    ...target, best_role: best?.title, best_fit: best?.fit_score,
    pipeline_stage: tracked?.stage, contacts: contacts.length,
  }) : null;

  return {
    key, name, companyId,
    inList: Boolean(company && !company.dismissed),
    company: company ? {
      region: company.region, roles: company.roles, pay: company.pay, description: company.description,
      website: company.website, applyUrl: company.apply_url, dsa: company.dsa, custom: company.custom,
      atsProvider: company.ats_provider, research: company.research || null,
    } : null,
    target: target ? {
      tag: target.tag, priority: target.priority, rank: target.rank, hiring: target.hiring_score, fit: target.company_fit,
      whyNow: target.why_now, openFit75: target.open_fit75, new30d: target.new_30d, prev30d: target.prev_30d, bestFit: target.best_fit,
      research: target.research || null, researchAt: target.research_at, updatedAt: target.updated_at,
    } : null,
    whyCompany: why?.why || null,
    nextAction: action,
    roles,
    pipeline: tracked ? { stage: tracked.stage, since: tracked.stage_changed_at, winStatus: tracked.win_status, roles: rolesOf(tracked.notes) } : null,
    contacts, activity, messages,
    links: { news: companyNewsLinks(name), people: companyPeopleLinks(name) },
  };
}

const ROLE_HINTS = [[/forward[- ]deployed|\bfde\b/i, 'fde'], [/\b(ai|ml|llm|machine learning|genai)\b/i, 'ai'], [/solutions? (engineer|architect)/i, 'se'], [/full[- ]?stack|front|back[- ]?end|software engineer|developer|sde/i, 'fs']];
function regionOf(location) {
  const l = String(location || '').toLowerCase();
  if (/bangalore|bengaluru/.test(l)) return /remote/.test(l) ? 'in_remote' : 'blr_hybrid';
  if (/india/.test(l)) return 'in_remote';
  return 'global';
}

/**
 * Add a discovered company to his Companies list, and optionally his
 * pipeline as Interested. Links an existing entry of the same name rather
 * than creating a duplicate, and never moves a pipeline stage backwards.
 */
export async function addToList(ref, { stage = 'new' } = {}) {
  const r = await resolve(ref);
  if (!r) return null;
  const { key, target } = r;
  let { company } = r;
  const best = target?.best_job_id ? await one(`SELECT title, url, location FROM jobs WHERE id = $1`, [target.best_job_id]) : null;
  const why = await one(`SELECT why FROM company_why WHERE key = $1`, [key]);
  let created = false;

  if (!company) {
    const roles = [...new Set(ROLE_HINTS.filter(([re]) => re.test(best?.title || '')).map(([, v]) => v))];
    company = await one(
      `INSERT INTO companies (id, name, region, roles, pay, description, apply_url, dsa, custom)
       VALUES ($1, $2, $3, $4, 'Market rate', $5, $6, false, true) RETURNING *`,
      [`c_${Date.now()}`, r.name, regionOf(best?.location), roles.length ? roles : ['fs'],
        why?.why || 'Found by job discovery.', best?.url || ''],
    );
    created = true;
  } else if (company.dismissed) {
    await query(`UPDATE companies SET dismissed = false, dismissed_at = NULL, updated_at = now() WHERE id = $1`, [company.id]);
  }

  // Pipeline: create, or move forward only (new → interested), never back.
  const want = STAGE_ORDER.includes(stage) ? stage : 'new';
  await query(
    `INSERT INTO tracked_companies (company_id, stage) VALUES ($1, $2)
     ON CONFLICT (company_id) DO UPDATE SET
       stage = CASE WHEN tracked_companies.stage = 'new' AND $2 <> 'new' THEN $2 ELSE tracked_companies.stage END,
       updated_at = now()`,
    [company.id, want],
  );
  // Link the target and its discovered roles now, rather than at the next refresh.
  await query(`UPDATE company_targets SET company_id = $2, in_catalogue = true, updated_at = now() WHERE key = $1`, [key, company.id]);
  await query(`UPDATE jobs SET company_id = $2 WHERE company_id IS NULL AND lower(trim(company_name)) = $1`, [key, company.id]);

  const t = await one(`SELECT stage FROM tracked_companies WHERE company_id = $1`, [company.id]);
  return { companyId: company.id, name: company.name, created, stage: t?.stage || want };
}

/**
 * Outreach drafts for one person: connection note (≤300 chars), first DM,
 * peer DM and day-4 follow-up. Grounded in what is stored — his profile and
 * achievements, the company's research and hiring signals, the why lines
 * and the best open role. One model call; no search API.
 */
export async function draftOutreach(ref, contact = {}) {
  const d = await companyDetail(ref);
  if (!d) return null;
  const best = d.roles[0] || null;
  const research = {
    whyThisCompany: d.whyCompany,
    hiringSignals: d.target?.research?.signals || [],
    whyNow: d.target?.whyNow || null,
    companyResearch: d.company?.research || null,
    description: d.company?.description || null,
    bestOpenRole: best ? { title: best.title, location: best.location, whyRole: best.why_role } : null,
  };
  const prompt = messagesPrompt({
    companyName: d.name, roleName: best?.title, research, messageType: 'all',
    contact: { name: contact.name || '', role: contact.role || '', type: contact.type || 'peer' },
    candidate: await candidateBlock(),
  });
  const result = await chatJson({
    kind: 'outreach-draft', companyId: d.companyId, system: prompt.system, user: prompt.user,
    maxTokens: 2500, input: { company: d.name, contact },
  });
  if (result.connectionNote) {
    result.connectionNoteChars = result.connectionNote.length;
    result.connectionNoteOverLimit = result.connectionNote.length > 300;
  }
  if (d.companyId) {
    for (const kind of ['connectionNote', 'firstDM', 'peerDM', 'followUp']) {
      if (result[kind]) await query(`INSERT INTO messages (company_id, kind, body, model) VALUES ($1, $2, $3, '')`, [d.companyId, kind, result[kind]]);
    }
  }
  return { company: d.name, messages: result, grounded: { research: Boolean(d.target?.research || d.company?.research), why: Boolean(d.whyCompany) } };
}
