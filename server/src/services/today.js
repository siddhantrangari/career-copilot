import { many, one } from '../db/pool.js';
import { config } from '../config.js';
import { pipeline, interviewsFrom, followUpsFrom, parseLooseDate } from './digest.js';
import { listTargets, nextAction } from './targets.js';
import { regionOf } from './apply-queue.js';
import { openTasks } from './today-tasks.js';

/**
 * The "Today" board: his Daily System made live.
 *
 * Targets come from config.targets.daily (the numbers on his Daily System
 * tab). Counts come from what actually happened — outreach he logged,
 * contacts added or moved, roles marked applied — for today and this week
 * (IST). The action list is what to do next, most time-sensitive first, each
 * with why this company and why this role. Marking an action done logs it
 * and hides it for the rest of the day.
 *
 * Applications are also split by where the role is — abroad (visa /
 * relocation), India, remote — each with its own daily range, and a mock
 * interview a day. Until a range or the mock is met it stays at the top of
 * the action list.
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
         + (SELECT count(*) FROM connections WHERE status = 'call' AND COALESCE(status_changed_at, created_at) >= $1) AS calls,
       (SELECT count(*) FROM interview_sessions WHERE started_at >= $1 AND status <> 'abandoned') AS mocks`,
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
 * Returns the items behind the count, so the Today card can list them.
 */
export function applicationItems(tracked, logged, since) {
  const roles = new Map();       // company:role → item
  const companies = new Set();   // companies with a counted role
  const companyOnly = new Map(); // applied with no role named
  const addRole = (company, role, item) => {
    const k = key(company, role);
    if (!roles.has(k)) roles.set(k, item);
    companies.add(key(company));
  };
  const presses = [];

  // Tracked roles first: they carry the real names and the card to open.
  for (const t of tracked) {
    const rs = rolesOf(t.notes);
    if (rs.length) {
      for (const r of rs) {
        if (r.stage !== 'applied' && !r.appliedAt) continue;
        const d = parseLooseDate(r.appliedAt);
        if (d && d >= since) {
          addRole(t.company, r.title, { title: t.company, detail: r.title, companyId: t.company_id, roleId: r.id || null, url: r.jobLink || null, at: d });
        }
      }
    } else if (t.stage === 'applied' && t.stage_changed_at && new Date(t.stage_changed_at) >= since) {
      companyOnly.set(key(t.company), { title: t.company, detail: 'Moved to Applied', companyId: t.company_id, at: new Date(t.stage_changed_at) });
    }
  }
  const idOf = new Map(tracked.map((t) => [key(t.company), t]));
  for (const a of logged) {
    if (new Date(a.at) < since) continue;
    const m = /^action:apply:(.*)$/.exec(a.note || '');
    if (!m) {
      presses.push({ title: 'Logged with +1', detail: `${a.count} application${a.count === 1 ? '' : 's'}, no role named`, count: a.count, at: new Date(a.at) });
      continue;
    }
    const [company, ...role] = m[1].split(':');
    const t = idOf.get(key(company));
    addRole(company, role.join(':'), { title: t?.company || company, detail: role.join(':') || 'Apply action marked done', companyId: t?.company_id || null, at: new Date(a.at) });
  }
  const extra = [...companyOnly].filter(([c]) => !companies.has(c)).map(([, item]) => item);
  const items = [...roles.values(), ...extra, ...presses].sort((x, y) => y.at - x.at);
  return { items, count: roles.size + extra.length + presses.reduce((n, p) => n + p.count, 0) };
}

export const applicationsSince = (tracked, logged, since) => applicationItems(tracked, logged, since).count;

/**
 * Applications in the window by where the role is. A role applied from the
 * queue carries its posting's location; one added by hand goes by its
 * company's region (EU and Gulf are abroad) or a "remote" / India word in its
 * title. +1 presses name no role, so they count only in the total.
 */
export async function applicationsByPlaceItems(tracked, since) {
  const out = { abroad: [], india: [], remote: [] };
  const jobs = await many(
    `SELECT j.id, j.title, j.location, j.url, j.app_status_at, COALESCE(c.name, j.company_name) AS company, COALESCE(j.company_id, c.id) AS company_id
     FROM jobs j LEFT JOIN companies c ON c.id = j.company_id
     WHERE j.app_status = 'applied' AND j.app_status_at >= $1 AND COALESCE(j.engagement, 'fte') = 'fte'`,
    [since],
  );
  const roleOfJob = new Map();
  for (const t of tracked) for (const r of rolesOf(t.notes)) if (r.jobId) roleOfJob.set(r.jobId, r.id);
  for (const j of jobs) {
    const p = regionOf(j.location);
    if (p in out) {
      out[p].push({ title: j.company || 'Unknown company', detail: `${j.title}${j.location ? ` · ${j.location}` : ''}`,
        companyId: j.company_id || null, roleId: roleOfJob.get(j.id) || null, url: j.url || null, at: new Date(j.app_status_at) });
    }
  }
  for (const t of tracked) {
    for (const r of rolesOf(t.notes)) {
      if (r.jobId || (r.stage !== 'applied' && !r.appliedAt)) continue; // queue roles are counted from the job above
      const d = parseLooseDate(r.appliedAt);
      if (!d || d < since) continue;
      const p = /\bremote\b/i.test(r.title) ? 'remote'
        : /\b(india|bangalore|bengaluru)\b/i.test(r.title) ? 'india'
        : t.region === 'eu' || t.region === 'gulf' ? 'abroad' : null;
      if (p) out[p].push({ title: t.company, detail: r.title, companyId: t.company_id, roleId: r.id || null, url: r.jobLink || null, at: d });
    }
  }
  for (const k of Object.keys(out)) out[k].sort((x, y) => y.at - x.at);
  return out;
}

export async function applicationsByPlace(tracked, since) {
  const items = await applicationsByPlaceItems(tracked, since);
  return Object.fromEntries(Object.entries(items).map(([k, v]) => [k, v.length]));
}

const TRACKED_SQL = `SELECT t.company_id, t.stage, t.notes, t.stage_changed_at, c.name AS company, c.region
                     FROM tracked_companies t JOIN companies c ON c.id = t.company_id`;

/** Outreach rows and contacts behind one of the activity counts in countsSince. */
async function outreachItems(kinds, statuses, since, { newContacts = false } = {}) {
  const logged = await many(
    `SELECT a.at, a.count, a.kind, a.note, a.company_id, COALESCE(c.name, a.company_name) AS company
     FROM outreach_activity a LEFT JOIN companies c ON c.id = a.company_id
     WHERE a.kind = ANY($1) AND a.at >= $2 ORDER BY a.at DESC`,
    [kinds, since],
  );
  const contacts = await many(
    `SELECT n.name, n.role, n.status, n.linkedin_url, n.company_id, c.name AS company,
            ${newContacts ? 'n.created_at' : 'COALESCE(n.status_changed_at, n.created_at)'} AS at
     FROM connections n JOIN companies c ON c.id = n.company_id
     WHERE ${newContacts ? 'n.created_at >= $1' : 'n.status = ANY($2) AND COALESCE(n.status_changed_at, n.created_at) >= $1'}
     ORDER BY at DESC`,
    newContacts ? [since] : [since, statuses],
  );
  return [
    ...contacts.map((n) => ({ title: n.name || 'Contact', detail: [n.role, n.company].filter(Boolean).join(' · '),
      companyId: n.company_id, url: n.linkedin_url || null, at: new Date(n.at) })),
    ...logged.map((a) => ({ title: a.company || 'Logged with +1', detail: `${a.count} × ${a.kind.replace(/_/g, ' ')}${a.note && !a.note.startsWith('action:') ? ` · ${a.note}` : ''}`,
      companyId: a.company_id || null, count: a.count, at: new Date(a.at) })),
  ].sort((x, y) => y.at - x.at);
}

/**
 * The items behind one Today meter, for today or this week — the same
 * sources countsSince and the application counters use.
 */
export async function todayDetails(kind, range = 'day') {
  const { day, week } = await boundaries();
  const since = range === 'week' ? week : day;
  if (kind === 'applications' || ['abroad', 'india', 'remote'].includes(kind)) {
    const tracked = await many(TRACKED_SQL);
    if (kind !== 'applications') return (await applicationsByPlaceItems(tracked, since))[kind];
    const logged = await many(`SELECT at, count, note FROM outreach_activity WHERE kind = 'application' AND at >= $1`, [since]);
    return applicationItems(tracked, logged, since).items;
  }
  if (kind === 'connections') return outreachItems(['connection_request'], [], since, { newContacts: true });
  if (kind === 'dms') return outreachItems(['dm', 'follow_up'], ['dm', 'fu1', 'fu2', 'fu3'], since);
  if (kind === 'referrals') return outreachItems(['referral_ask'], ['ref'], since);
  if (kind === 'calls') return outreachItems(['call'], ['call'], since);
  if (kind === 'posts') return outreachItems(['post'], [], since);
  if (kind === 'mocks') {
    const rows = await many(
      `SELECT id, company_id, company_name, role_title, round, status, started_at FROM interview_sessions
       WHERE started_at >= $1 AND status <> 'abandoned' ORDER BY started_at DESC`, [since],
    );
    return rows.map((r) => ({ title: r.company_name || 'Mock interview', detail: [r.role_title, `${r.round} round`, r.status].filter(Boolean).join(' · '),
      companyId: r.company_id || null, url: `/interview.html?session=${r.id}`, at: new Date(r.started_at) }));
  }
  throw Object.assign(new Error(`kind must be one of applications, abroad, india, remote, connections, dms, referrals, calls, posts, mocks`), { statusCode: 400 });
}

export async function buildToday(now = new Date()) {
  const { day, week } = await boundaries();
  const g = config.targets;
  const [tracked, logged, cToday, cWeek] = await Promise.all([
    many(TRACKED_SQL),
    many(`SELECT at, count, note FROM outreach_activity WHERE kind = 'application' AND at >= $1`, [week]),
    countsSince(day), countsSince(week),
  ]);
  const [pToday, pWeek] = await Promise.all([applicationsByPlace(tracked, day), applicationsByPlace(tracked, week)]);
  const split = (p, k, mult, label) => ({ done: p[k], target: g.daily[k][0] * mult, stretch: g.daily[k][1] * mult, label });
  const targets = (c, mult, p) => ({
    connections: { done: c.connections, target: g.daily.connections * mult, label: 'Connection requests' },
    dms: { done: c.dms, target: g.daily.dms * mult, label: 'DMs to HMs / peers' },
    applications: { done: applicationsSince(tracked, logged, mult === 1 ? day : week), target: g.daily.applications * mult, stretch: g.daily.applicationsStretch * mult, label: 'Applications' },
    posts: { done: c.posts, target: g.daily.posts * mult, label: 'LinkedIn posts' },
    referrals: { done: c.referrals, target: g.daily.referrals * mult, label: 'Referral asks' },
    abroad: split(p, 'abroad', mult, 'Abroad · visa / relocation'),
    india: split(p, 'india', mult, 'India · Bangalore'),
    remote: split(p, 'remote', mult, 'Remote'),
    mocks: { done: c.mocks, target: g.daily.mocks * mult, label: 'Mock interviews' },
  });
  const todayT = targets(cToday, 1, pToday);

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

  // Tasks he added himself stay at the top until marked done (any day).
  for (const t of await openTasks()) {
    actions.push({ key: `task:${t.id}`, type: 'task', icon: '📌', company: t.company_name || '',
      title: t.title, detail: t.detail || '', url: t.url || null, logKind: 'action_done' });
  }

  // The day's application split and a mock round: on the list until met.
  for (const [k, scope, icon, what] of [
    ['abroad', 'abroad', '✈️', 'abroad roles with visa sponsorship or relocation'],
    ['india', 'bangalore', '🇮🇳', 'India roles (Bangalore)'],
    ['remote', 'remote', '🌐', 'remote roles open to India'],
  ]) {
    const m = todayT[k];
    if (m.done >= m.target) continue;
    actions.push({ key: key('plan', k), type: 'apply_plan', icon, scope, company: '',
      title: `Apply to ${m.target - m.done}–${m.stretch - m.done} more ${what}`,
      detail: `${m.done} of ${m.target}–${m.stretch} done today` });
  }
  if (todayT.mocks.done < todayT.mocks.target) {
    actions.push({ key: key('plan', 'mock'), type: 'mock', icon: '🎙', company: '',
      title: 'Practice a mock interview',
      detail: 'One round today — a company in your pipeline, or a general screening round' });
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
    today: todayT,
    week: { ...targets(cWeek, 5, pWeek), calls: { done: cWeek.calls, target: g.weeklyCalls, stretch: g.weeklyCallsStretch, label: 'Calls' } },
    actions: actions.slice(0, 10 + actions.filter((a) => a.type === 'task').length),
    priorityTargets: (await one(`SELECT count(*)::int AS n FROM company_targets WHERE priority`))?.n || 0,
    followUpsDue: followUpsFrom(pipe.tracked, pipe.contacts, now, { snoozed: pipe.snoozed }).total,
  };
}
