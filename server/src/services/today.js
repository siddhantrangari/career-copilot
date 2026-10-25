import { many, one } from '../db/pool.js';
import { config } from '../config.js';
import { pipeline, interviewsFrom, followUpsFrom, parseLooseDate } from './digest.js';
import { listTargets, nextAction } from './targets.js';

/**
 * The "Today" board: his Daily System made live.
 *
 * Targets come from config.targets.daily (the numbers on his Daily System
 * tab). Counts come from what actually happened — outreach he logged,
 * contacts added or moved, roles marked applied — for today and this week
 * (IST). The action list is what to do next, most time-sensitive first, each
 * with why this company and why this role. Marking an action done logs it
 * and hides it for the rest of the day.
 */

const tz = () => config.digest.timeZone;
const DAY = 86_400_000;

function rolesOf(notes) {
  const m = String(notes || '').match(/<!--CC_ROLES:([\s\S]*?)-->/);
  if (!m) return [];
  try { const r = JSON.parse(m[1]); return Array.isArray(r) ? r : []; } catch { return []; }
}

/** Start of today and of this week (Monday) in IST, as Dates. */
async function boundaries() {
  const r = await one(
    `SELECT (date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1) AS day,
            (date_trunc('week', now() AT TIME ZONE $1) AT TIME ZONE $1) AS week`,
    [tz()],
  );
  return { day: new Date(r.day), week: new Date(r.week) };
}

async function countsSince(since) {
  const r = await one(
    `SELECT
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity WHERE kind = 'connection_request' AND at >= $1)
         + (SELECT count(*) FROM connections WHERE created_at >= $1) AS connections,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity WHERE kind IN ('dm', 'follow_up') AND at >= $1)
         + (SELECT count(*) FROM connections WHERE status IN ('dm', 'fu1', 'fu2', 'fu3') AND COALESCE(status_changed_at, created_at) >= $1) AS dms,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity WHERE kind = 'post' AND at >= $1) AS posts,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity WHERE kind = 'referral_ask' AND at >= $1)
         + (SELECT count(*) FROM connections WHERE status = 'ref' AND COALESCE(status_changed_at, created_at) >= $1) AS referrals,
       (SELECT COALESCE(sum(count), 0) FROM outreach_activity WHERE kind = 'call' AND at >= $1)
         + (SELECT count(*) FROM connections WHERE status = 'call' AND COALESCE(status_changed_at, created_at) >= $1) AS calls`,
    [since],
  );
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Number(v)]));
}

const key = (...parts) => parts.map((p) => String(p || '').toLowerCase().trim()).join(':');

/**
 * Applications in the window, each counted once. One application can be
 * recorded twice — Done on an Apply action, and the role marked applied in
 * Track — so both are reduced to a company:role key and merged. A company
 * moved to "applied" with no roles counts once unless a role there is
 * already counted. +1 presses carry no key and are added as they are.
 */
export function applicationsSince(tracked, logged, since) {
  const roles = new Set();       // company:role
  const companies = new Set();   // companies with a counted role
  const companyOnly = new Set(); // applied with no role named
  const addRole = (company, role) => { roles.add(key(company, role)); companies.add(key(company)); };
  let unkeyed = 0;

  for (const a of logged) {
    if (new Date(a.at) < since) continue;
    const m = /^action:apply:(.*)$/.exec(a.note || '');
    if (!m) { unkeyed += a.count; continue; }
    const [company, ...role] = m[1].split(':');
    addRole(company, role.join(':'));
  }
  for (const t of tracked) {
    const rs = rolesOf(t.notes);
    if (rs.length) {
      for (const r of rs) {
        if (r.stage !== 'applied' && !r.appliedAt) continue;
        const d = parseLooseDate(r.appliedAt);
        if (d && d >= since) addRole(t.company, r.title);
      }
    } else if (t.stage === 'applied' && t.stage_changed_at && new Date(t.stage_changed_at) >= since) {
      companyOnly.add(key(t.company));
    }
  }
  const extra = [...companyOnly].filter((c) => !companies.has(c)).length;
  return roles.size + extra + unkeyed;
}

export async function buildToday(now = new Date()) {
  const { day, week } = await boundaries();
  const g = config.targets;
  const [tracked, logged, cToday, cWeek] = await Promise.all([
    many(`SELECT t.company_id, t.stage, t.notes, t.stage_changed_at, c.name AS company
          FROM tracked_companies t JOIN companies c ON c.id = t.company_id`),
    many(`SELECT at, count, note FROM outreach_activity WHERE kind = 'application' AND at >= $1`, [week]),
    countsSince(day), countsSince(week),
  ]);
  const targets = (c, mult) => ({
    connections: { done: c.connections, target: g.daily.connections * mult, label: 'Connection requests' },
    dms: { done: c.dms, target: g.daily.dms * mult, label: 'DMs to HMs / peers' },
    applications: { done: applicationsSince(tracked, logged, mult === 1 ? day : week), target: g.daily.applications * mult, stretch: g.daily.applicationsStretch * mult, label: 'Applications' },
    posts: { done: c.posts, target: g.daily.posts * mult, label: 'LinkedIn posts' },
    referrals: { done: c.referrals, target: g.daily.referrals * mult, label: 'Referral asks' },
  });

  // Actions already marked done today.
  const doneKeys = new Set((await many(
    `SELECT note FROM outreach_activity WHERE at >= $1 AND note LIKE 'action:%'`, [day],
  )).map((r) => r.note.slice(7)));

  // An application marked done stays done, not just for today.
  for (const r of await many(`SELECT note FROM outreach_activity WHERE kind = 'application' AND note LIKE 'action:apply:%'`)) {
    doneKeys.add(r.note.slice(7));
  }

  const actions = [];
  const push = (a) => { if (!doneKeys.has(a.key)) actions.push(a); };

  // 1. Interviews in the next 48 hours.
  const pipe = await pipeline();
  for (const i of interviewsFrom(pipe.tracked, now).upcoming) {
    if (i.at.getTime() - now.getTime() > 2 * DAY) continue;
    const prep = await one(
      `SELECT id, created_at FROM interview_preps WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1`, [i.companyId],
    );
    push({ key: key('interview', i.company, i.role), type: 'interview', icon: '🎤', company: i.company, companyId: i.companyId,
      prepId: prep?.id || null, prepAt: prep?.created_at || null,
      role: i.role, title: `Interview ${i.at.toLocaleString('en-IN', { timeZone: tz(), weekday: 'short', hour: 'numeric', minute: '2-digit' })}`,
      detail: prep ? 'Re-read your prep guide, then run a mock round' : 'Build the prep guide (how they interview for this role), then a mock round', logKind: 'action_done' });
  }

  // 2. Follow-ups due (DM day 4, applications quiet 7 days) — the two oldest.
  const idOf = new Map(pipe.tracked.map((t) => [t.company, t.company_id]));
  for (const f of followUpsFrom(pipe.tracked, pipe.contacts, now, { snoozed: pipe.snoozed }).items.slice(0, 2)) {
    push({ key: key('follow', f.company, f.role || f.name), fkey: f.key, type: 'follow_up', icon: '📬', company: f.company, companyId: idOf.get(f.company) || null,
      role: f.role || '', title: f.kind === 'dm' ? `Follow up with ${f.name}` : f.kind === 'applied' ? 'Nudge the recruiter or ask for a referral' : 'Send the next networking message',
      detail: `Quiet for ${f.days} days`, logKind: f.kind === 'applied' ? 'referral_ask' : 'follow_up', url: f.url || null });
  }

  // 3–4. Priority companies with an open role: apply, or ask a referral if applied.
  const apply = await listTargets({ tag: 'apply', limit: 12 });
  let applyCount = 0; let referralCount = 0;
  for (const t of apply) {
    const applied = ['applied', 'networking', 'call', 'win', 'interview', 'offer'].includes(t.pipeline_stage) || t.best_role_status === 'applied';
    if (applied ? referralCount >= 2 : applyCount >= 3) continue;
    push({
      key: key(applied ? 'referral' : 'apply', t.name, t.best_role), type: applied ? 'referral' : 'apply',
      icon: applied ? '🤝' : '🚀', company: t.name, companyId: t.company_id, priority: t.priority,
      role: t.best_role || '', fit: t.best_fit, url: t.best_role_url, jobId: applied ? null : t.best_job_id_ref,
      title: applied ? 'Ask for a referral' : `Apply${t.best_fit ? ` · fit ${t.best_fit}` : ''}`,
      detail: t.why_now || '', whyCompany: t.why_company || null, whyRole: t.why_role || null,
      logKind: applied ? 'referral_ask' : 'application',
    });
    if (applied) referralCount += 1; else applyCount += 1;
  }

  // 5. Outreach — the hidden market — top two by rank.
  for (const t of await listTargets({ tag: 'outreach', limit: 2 })) {
    push({
      key: key('outreach', t.name), type: 'outreach', icon: '🔭', company: t.name, companyId: t.company_id, priority: t.priority,
      title: 'Outreach', detail: await nextAction(t), whyCompany: t.why_company || null, whyNowLine: t.why_now || null,
      logKind: 'action_done',
    });
  }

  return {
    date: now.toISOString(),
    today: targets(cToday, 1),
    week: { ...targets(cWeek, 5), calls: { done: cWeek.calls, target: g.weeklyCalls, stretch: g.weeklyCallsStretch, label: 'Calls' } },
    actions: actions.slice(0, 10),
    priorityTargets: (await one(`SELECT count(*)::int AS n FROM company_targets WHERE priority`))?.n || 0,
    followUpsDue: followUpsFrom(pipe.tracked, pipe.contacts, now, { snoozed: pipe.snoozed }).total,
  };
}
