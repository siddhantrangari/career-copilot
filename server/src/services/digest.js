import { many, one } from '../db/pool.js';
import { config } from '../config.js';
import { tg } from './telegram.js';
import { dailySearches } from './search-links.js';
import { jobActionsMessage } from './job-actions.js';

/**
 * Morning digest.
 *
 * The discovery agent finds roles every few hours, but a role only matters if
 * it is applied to in the first few days. This turns what the system already
 * knows into one Telegram message each morning:
 *
 *   1. Interviews in the next 7 days (from the interview date on each role).
 *   2. Fresh high-match roles from the last 72h — never one already sent.
 *   3. Follow-ups due: applications gone quiet, networking with no logged
 *      activity, and DMs waiting on their one follow-up (the NxtJob Day-4 rule).
 *
 * Read-only against the pipeline. The only write is the digest_runs row that
 * records what was sent.
 */

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

// Follow-up thresholds, in days.
const APPLIED_NUDGE_DAYS = 7;      // no news a week after applying → nudge or find a referral
const NETWORKING_QUIET_DAYS = 4;   // NxtJob: follow up on Day 4 if no reply
const DM_FOLLOWUP_DAYS = 4;
const STALE_LIMIT_DAYS = 45;       // beyond this it is parked, not "due"
const MAX_FOLLOWUPS = 8;

const TELEGRAM_LIMIT = 3800;       // Telegram caps a message at 4096 characters

export class DigestError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'DigestError';
    this.statusCode = statusCode;
  }
}

export const telegramConfigured = () =>
  Boolean(config.digest.telegram.botToken && config.digest.telegram.chatId);

// ── Dates ─────────────────────────────────────────────────────────────

/** YYYY-MM-DD for `date` in the digest's time zone. */
export function localDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.digest.timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/** Minutes since local midnight in the digest's time zone. */
export function localMinutes(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: config.digest.timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
}

const fmtWhen = (date) => new Intl.DateTimeFormat('en-IN', {
  timeZone: config.digest.timeZone, weekday: 'short', day: 'numeric', month: 'short',
  hour: 'numeric', minute: '2-digit',
}).format(date);

const fmtDay = (date) => new Intl.DateTimeFormat('en-IN', {
  timeZone: config.digest.timeZone, weekday: 'short', day: 'numeric', month: 'short',
}).format(date);

const daysSince = (date, now) => Math.floor((now - date) / DAY);

function ago(date, now) {
  const hours = Math.max(0, Math.round((now - date) / HOUR));
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

/**
 * The Track modal's "Applied Date" is free text, and the browser locale has
 * written it both as 24/10/2026 and 10/24/2026. A part above 12 settles the
 * order; when both could be a month, day-first wins (en-IN). Anything that
 * does not parse returns null and the caller falls back to tracked dates.
 */
export function parseLooseDate(value) {
  const s = String(value || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) {
    let [a, b, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (y < 100) y += 2000;
    let day = a;
    let month = b;
    if (a <= 12 && b > 12) { day = b; month = a; }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(y, month - 1, day, 6, 30)); // midday IST
  }
  // "27 Oct" with no year parses as 2001. Older bot entries were saved that
  // way, so take the current year — or last year if that lands in the future.
  const hasYear = !/^(\d{1,2}\s+[a-z]{3,}\.?|[a-z]{3,}\.?\s+\d{1,2})$/i.test(s); // "27 Oct" / "Oct 27"
  const t = Date.parse(hasYear ? s : `${s} ${new Date().getFullYear()}`); // "24 Oct 2026" — parsed as local midnight, so re-anchor to midday IST
  if (Number.isNaN(t)) return null;
  const local = new Date(t);
  const d = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate(), 6, 30));
  if (!hasYear && d.getTime() > Date.now() + 86_400_000) d.setUTCFullYear(d.getUTCFullYear() - 1);
  return d;
}

function rolesOf(notes) {
  const m = String(notes || '').match(/<!--CC_ROLES:([\s\S]*?)-->/);
  if (!m) return [];
  try {
    const roles = JSON.parse(m[1]);
    return Array.isArray(roles) ? roles : [];
  } catch {
    return [];
  }
}

const latest = (...dates) => dates.filter(Boolean).reduce((a, b) => (b > a ? b : a), null);

// ── Building the digest ───────────────────────────────────────────────

async function freshJobs(now) {
  const { minRelevance, minFit, maxJobs } = config.digest;
  const where = `
    COALESCE(j.engagement, 'fte') = 'fte'
    AND NOT j.dismissed AND j.closed_at IS NULL
    AND NOT COALESCE(c.dismissed, false)
    AND COALESCE(t.stage, '') <> 'failed'
    AND COALESCE(j.posted_at, j.discovered_at) > $1
    -- Scored roles qualify on fit (JD vs profile); unscored ones on the title
    -- score until the next why-lines pass scores them.
    AND CASE WHEN j.fit_score IS NOT NULL THEN j.fit_score >= $3 ELSE j.relevance >= $2 END
    AND NOT EXISTS (
      SELECT 1 FROM digest_runs d WHERE d.status = 'sent' AND j.id = ANY (d.job_ids)
    )`;
  const from = `
    FROM jobs j
    LEFT JOIN companies c ON c.id = j.company_id
    LEFT JOIN tracked_companies t ON t.company_id = j.company_id`;
  const since = new Date(now.getTime() - 72 * HOUR);

  const candidates = await many(
    `SELECT j.id, j.title, j.url, j.location, j.relevance, j.fit_score, j.favourite, j.no_dsa, j.why_role,
            COALESCE(j.posted_at, j.discovered_at) AS posted_at,
            COALESCE(NULLIF(c.name, ''), j.company_name) AS company, t.stage AS tracked_stage
     ${from} WHERE ${where}
     ORDER BY j.favourite DESC, COALESCE(j.fit_score, LEAST(j.relevance, 70)) DESC, COALESCE(j.posted_at, j.discovered_at) DESC
     LIMIT $4`,
    [since, minRelevance, minFit, maxJobs * 6],
  );
  // At most two roles per company, so one employer posting a batch cannot
  // take over the morning list; the rest stay unsent for later digests.
  const perCompany = new Map();
  const jobs = [];
  for (const j of candidates) {
    const n = perCompany.get(j.company) || 0;
    if (n >= 2) continue;
    perCompany.set(j.company, n + 1);
    jobs.push(j);
    if (jobs.length >= maxJobs) break;
  }
  const total = await one(`SELECT count(*)::int AS n ${from} WHERE ${where}`, [since, minRelevance, minFit]);
  return { jobs, total: total?.n ?? jobs.length };
}

export async function pipeline() {
  const tracked = await many(
    `SELECT t.company_id, t.stage, t.notes, t.created_at, t.stage_changed_at, t.activity_at,
            c.name AS company,
            COALESCE((SELECT ct.priority FROM company_targets ct WHERE ct.key = lower(trim(c.name))), false) AS priority
     FROM tracked_companies t JOIN companies c ON c.id = t.company_id
     WHERE t.stage NOT IN ('failed', 'offer') AND NOT COALESCE(c.dismissed, false)`,
  );
  const contacts = await many(
    `SELECT n.id, n.company_id, n.name, n.type, n.status, n.linkedin_url,
            COALESCE(n.status_changed_at, n.created_at) AS since, c.name AS company
     FROM connections n
     JOIN tracked_companies t ON t.company_id = n.company_id
     JOIN companies c ON c.id = n.company_id
     WHERE n.status = 'dm' AND t.stage NOT IN ('failed', 'offer')`,
  );
  const snoozed = new Set((await many(`SELECT key FROM followup_snoozes WHERE until > now()`)).map((r) => r.key));
  return { tracked, contacts, snoozed };
}

export function interviewsFrom(tracked, now) {
  const upcoming = [];
  const undated = [];
  for (const t of tracked) {
    const roles = rolesOf(t.notes);
    let dated = false;
    for (const r of roles) {
      if (!r.interviewAt) continue;
      const at = new Date(r.interviewAt);
      if (Number.isNaN(at.getTime())) continue;
      dated = true;
      // Keep one that started up to 3h ago — you may read this mid-morning.
      const t0 = now.getTime();
      if (at.getTime() >= t0 - 3 * HOUR && at.getTime() <= t0 + 7 * DAY) {
        upcoming.push({ company: t.company, companyId: t.company_id, role: r.title || '', at });
      }
    }
    const anyRoleInterview = roles.some((r) => r.stage === 'interview');
    if (!dated && (t.stage === 'interview' || anyRoleInterview)) {
      undated.push({ company: t.company, companyId: t.company_id });
    }
  }
  upcoming.sort((a, b) => a.at - b.at);
  return { upcoming, undated };
}

/** The follow-up's identity, stable across days: kind:companyId:role-or-contact. */
export const followUpKey = (f) => [f.kind, f.companyId || '', String(f.role || f.name || '').toLowerCase().trim()].join(':');

export function followUpsFrom(tracked, contacts, now, { snoozed = new Set(), limit = MAX_FOLLOWUPS } = {}) {
  const due = [];
  let parked = 0;
  let waiting = 0;

  const consider = (item, lastTouch, threshold) => {
    const days = daysSince(lastTouch, now);
    if (days < threshold) return;
    item.key = followUpKey(item);
    if (snoozed.has(item.key)) { waiting += 1; return; }
    if (days > STALE_LIMIT_DAYS) { parked += 1; return; }
    due.push({ ...item, days });
  };
  // Rows from before activity tracking have no activity_at; their clock runs
  // from when tracking began, and the message says so rather than implying
  // nothing happened.

  for (const t of tracked) {
    const activity = t.activity_at ? new Date(t.activity_at) : null;
    const created = new Date(t.created_at);
    const roles = rolesOf(t.notes);
    // Quick applications from the Apply queue (30–45 a day) would bury the
    // nudges that matter; they get one only at a priority company.
    const appliedRoles = roles.filter((r) => r.stage === 'applied' && (!r.quick || t.priority));

    if (appliedRoles.length) {
      for (const r of appliedRoles) {
        const applied = parseLooseDate(r.appliedAt)
          || (t.stage_changed_at ? new Date(t.stage_changed_at) : created);
        consider(
          { kind: 'applied', company: t.company, companyId: t.company_id, role: r.title || '', applied },
          latest(applied, activity),
          APPLIED_NUDGE_DAYS,
        );
      }
    } else if (t.stage === 'applied') {
      const applied = t.stage_changed_at ? new Date(t.stage_changed_at) : created;
      consider({ kind: 'applied', company: t.company, companyId: t.company_id, role: '', applied }, latest(applied, activity), APPLIED_NUDGE_DAYS);
    } else if (t.stage === 'networking') {
      consider({ kind: 'networking', company: t.company, companyId: t.company_id, sinceTracking: !activity }, activity || created, NETWORKING_QUIET_DAYS);
    }
  }

  for (const c of contacts) {
    consider(
      { kind: 'dm', company: c.company, companyId: c.company_id, contactId: c.id, name: c.name, url: c.linkedin_url },
      new Date(c.since),
      DM_FOLLOWUP_DAYS,
    );
  }

  // Waiting DMs and applications first — someone is already looking at those —
  // then networking. Within a kind, the oldest silence first.
  const rank = { dm: 0, applied: 1, networking: 2 };
  due.sort((a, b) => rank[a.kind] - rank[b.kind] || b.days - a.days);
  return { items: due.slice(0, limit), total: due.length, parked, waiting };
}

/** Everything the message needs, as data. Pure read. */
export async function buildDigest(now = new Date()) {
  const [{ jobs, total }, { tracked, contacts, snoozed }] = await Promise.all([freshJobs(now), pipeline()]);
  let searchUsage = null;
  try {
    const gj = await import('./google-jobs.js');
    if (gj.googleJobsReady()) searchUsage = gj.usageLine(await gj.searchUsage());
  } catch { searchUsage = null; }
  // AI spend from the usage log (estimates at published rates): yesterday, this month, what drove it.
  let aiSpend = null;
  try {
    const tz = config.digest.timeZone;
    const s = await one(
      `SELECT
         COALESCE(sum(cost_usd) FILTER (WHERE created_at >= (date_trunc('day', now() AT TIME ZONE $1) - interval '1 day') AT TIME ZONE $1
                                          AND created_at < date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1), 0)::float AS yesterday,
         count(*) FILTER (WHERE created_at >= (date_trunc('day', now() AT TIME ZONE $1) - interval '1 day') AT TIME ZONE $1
                            AND created_at < date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1)::int AS calls,
         COALESCE(sum(cost_usd) FILTER (WHERE created_at >= date_trunc('month', now() AT TIME ZONE $1) AT TIME ZONE $1), 0)::float AS month,
         COALESCE(sum(cost_usd) FILTER (WHERE created_at >= now() - interval '7 days'), 0)::float / 7 AS daily_avg
       FROM ai_runs`, [tz]);
    const top = await many(
      `SELECT kind, sum(cost_usd)::float AS cost FROM ai_runs
       WHERE created_at >= (date_trunc('day', now() AT TIME ZONE $1) - interval '1 day') AT TIME ZONE $1
         AND created_at < date_trunc('day', now() AT TIME ZONE $1) AT TIME ZONE $1
       GROUP BY kind HAVING sum(cost_usd) > 0 ORDER BY 2 DESC LIMIT 3`, [tz]);
    const { aiReport } = await import('./ai-monitor.js');
    const report = await aiReport({ days: 30 });
    aiSpend = { ...s, top, advice: report.recommendations.filter((r) => r.level !== 'ok') };
  } catch { aiSpend = null; }
  let plan = null;
  try {
    const { outreachPlan, progressLine } = await import('./targets.js');
    const p = await outreachPlan({ limit: 5 });
    plan = { progress: progressLine(p.progress), targets: p.targets, suggested: p.suggested };
  } catch { plan = null; }
  return {
    generatedAt: now.toISOString(),
    date: localDate(now),
    searchUsage,
    aiSpend,
    plan,
    interviews: interviewsFrom(tracked, now),
    jobs: { items: jobs, total },
    followUps: followUpsFrom(tracked, contacts, now, { snoozed }),
  };
}

// ── Rendering (Telegram HTML) ─────────────────────────────────────────

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

const link = (url, text) => (url ? `<a href="${esc(url)}">${esc(text)}</a>` : esc(text));

/** Sections as arrays of lines, so a long digest can split cleanly. */
export function renderDigest(d, now = new Date(d.generatedAt)) {
  const app = config.digest.appUrl;
  const sections = [];

  sections.push([`☀️ <b>Morning digest · ${esc(fmtDay(now))}</b>`]);

  // The day's plan, every morning: applications by place, and a mock round.
  const g = config.targets.daily;
  sections.push([
    '🎯 <b>Today\'s plan</b>',
    `• Apply to <b>${g.abroad[0]}–${g.abroad[1]}</b> abroad roles (visa sponsorship / relocation)`,
    `• Apply to <b>${g.india[0]}–${g.india[1]}</b> India roles (Bangalore)`,
    `• Apply to <b>${g.remote[0]}–${g.remote[1]}</b> remote roles open to India`,
    `• Practice <b>${g.mocks}</b> mock interview — ${link(`${app}/interview.html`, 'Interview Room')}`,
    `  ${link(app, 'Apply queue')} has each tab ready`,
  ]);

  const { upcoming, undated } = d.interviews;
  if (upcoming.length || undated.length) {
    const lines = [`🎤 <b>Interviews this week</b> (${upcoming.length})`];
    for (const i of upcoming) {
      lines.push(`• <b>${esc(fmtWhen(i.at))}</b> — ${esc(i.company)}${i.role ? ` · ${esc(i.role)}` : ''}`);
    }
    for (const u of undated) {
      lines.push(`• ${esc(u.company)} — at Interview stage, no date set`);
    }
    lines.push(`  ${link(`${app}/interview.html`, 'Run a mock')} · prep guides live in the Interview Room`);
    sections.push(lines);
  }

  // Company-first: where to spend the week, before the list of new postings.
  if (d.plan && d.plan.targets?.length) {
    const lines = [`🎯 <b>This week</b> — ${esc(d.plan.progress)}`];
    for (const t of d.plan.targets) {
      const badge = `${t.priority ? '⭐ ' : ''}${t.tag === 'apply' ? 'APPLY' : 'OUTREACH'}`;
      lines.push(`• <b>${esc(t.name)}</b> · ${badge}${t.why_now ? ` — ${esc(t.why_now)}` : ''}`);
      if (t.nextAction) lines.push(`   → ${esc(t.nextAction)}`);
    }
    if (d.plan.suggested?.length) {
      lines.push(`   ➕ Worth adding to your list: ${d.plan.suggested.map((s) => esc(s.name)).join(', ')}`);
    }
    sections.push(lines);
  }

  const { items: jobs, total } = d.jobs;
  if (jobs.length) {
    const head = total > jobs.length ? `${jobs.length} of ${total}` : `${jobs.length}`;
    const lines = [`🔥 <b>New high-match roles · last 72h</b> (${head})`];
    for (const j of jobs) {
      const tags = [
        j.favourite && '⭐',
        j.tracked_stage && `tracked: ${j.tracked_stage}`,
        j.no_dsa === false && 'DSA signals',
      ].filter(Boolean).join(' · ');
      lines.push(
        `• ${link(j.url, j.title)} — ${esc(j.company)}` +
        `${j.location ? ` · ${esc(clip(j.location, 40))}` : ''} · ${j.fit_score != null ? `fit ${j.fit_score}` : `match ${j.relevance}`} · ${esc(ago(new Date(j.posted_at), now))}` +
        `${tags ? ` · ${esc(tags)}` : ''}`,
      );
      if (j.why_role) lines.push(`   💡 <i>${esc(j.why_role)}</i>`);
    }
    if (total > jobs.length) lines.push(`  ${link(`${app}/?tab=discovery`, `See all ${total} in the live feed`)}`);
    sections.push(lines);
  } else {
    sections.push(['🔥 <b>New high-match roles</b> — nothing new since the last digest']);
  }

  const f = d.followUps;
  if (f.items.length) {
    const lines = [`📬 <b>Follow-ups due</b> (${f.total})`];
    for (const x of f.items) {
      if (x.kind === 'applied') {
        lines.push(
          `• ${esc(x.company)}${x.role ? ` · ${esc(x.role)}` : ''} — applied ${esc(fmtDay(x.applied))}, ` +
          `quiet ${x.days}d → nudge the recruiter or ask for a referral`,
        );
      } else if (x.kind === 'networking') {
        lines.push(
          `• ${esc(x.company)} — networking, nothing logged ` +
          `${x.sinceTracking ? `since you started tracking (${x.days}d)` : `in ${x.days}d`} → send the next message`,
        );
      } else {
        lines.push(`• ${link(x.url, x.name || 'Contact')} at ${esc(x.company)} — DM ${x.days}d ago, no reply → send your one follow-up`);
      }
    }
    if (f.total > f.items.length) lines.push(`  +${f.total - f.items.length} more in the ${link(`${app}/?tab=pipeline`, 'pipeline')}`);
    if (f.parked) lines.push(`  ${f.parked} quiet for over ${STALE_LIMIT_DAYS}d — worth closing out`);
    sections.push(lines);
  } else {
    sections.push(['📬 <b>Follow-ups</b> — none due']);
  }

  // Standing web searches (past 24h) — reach LinkedIn, Naukri, Instahyre and
  // the rest in one tap without anything reading those sites automatically.
  sections.push([`🔎 <b>Today on the web</b>: ${dailySearches().map((s) => link(s.url, s.label)).join(' · ')}`]
    .concat(d.searchUsage ? [`   Google Jobs searches: ${esc(d.searchUsage)}`] : []));

  if (d.aiSpend) {
    const a = d.aiSpend; const $ = (n) => `$${Number(n || 0).toFixed(2)}`;
    sections.push([`🤖 <b>AI spend</b>: yesterday ${$(a.yesterday)} (${a.calls} calls) · this month ${$(a.month)} · 7-day avg ${$(a.daily_avg)}/day` +
      (a.top?.length ? `\n   Top: ${a.top.map((t) => `${esc(t.kind)} ${$(t.cost)}`).join(' · ')}` : '') +
      (a.advice || []).map((r) => `\n   ${r.level === 'act' ? '⚠️' : '👀'} ${esc(r.text)}`).join('')]);
  }

  sections.push([link(app, 'Open Career Copilot')]);

  // Pack sections into as few messages as fit under Telegram's limit.
  const messages = [];
  let current = '';
  for (const lines of sections) {
    const block = lines.join('\n');
    const next = current ? `${current}\n\n${block}` : block;
    if (next.length <= TELEGRAM_LIMIT) { current = next; continue; }
    if (current) messages.push(current);
    // A section too big for one message is split between lines.
    current = '';
    for (const line of lines) {
      const candidate = current ? `${current}\n${line}` : line;
      if (candidate.length > TELEGRAM_LIMIT && current) { messages.push(current); current = line; } else current = candidate;
    }
  }
  if (current) messages.push(current);
  return messages;
}

// ── Telegram ──────────────────────────────────────────────────────────

const telegram = (method, body) => tg(method, body);

/**
 * Chats that have messaged the bot — how you find TELEGRAM_CHAT_ID: send the
 * bot any message, then call this. Once a chat id is set the bot long-polls
 * getUpdates itself, and a second getUpdates caller would make Telegram
 * return 409 to both — so the configured chat is reported instead.
 */
export async function telegramChats() {
  if (config.digest.telegram.chatId) {
    return [{ id: Number(config.digest.telegram.chatId) || config.digest.telegram.chatId, type: 'private', name: 'configured (TELEGRAM_CHAT_ID)' }];
  }
  const updates = await telegram('getUpdates', { limit: 50 });
  const chats = new Map();
  for (const u of updates || []) {
    const chat = (u.message || u.channel_post || u.my_chat_member || {}).chat;
    if (chat) chats.set(chat.id, { id: chat.id, type: chat.type, name: chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.username || '' });
  }
  return [...chats.values()];
}

// ── Running it ────────────────────────────────────────────────────────

let running = false;

export async function lastRun(date) {
  return one(
    `SELECT id, digest_date, trigger, status, counts, error, created_at FROM digest_runs
     ${date ? 'WHERE digest_date = $1' : ''} ORDER BY created_at DESC LIMIT 1`,
    date ? [date] : [],
  );
}

/** Build, send and record one digest. */
export async function runDigest({ trigger = 'manual', now = new Date() } = {}) {
  if (!telegramConfigured()) {
    throw new DigestError('Telegram is not configured — set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID');
  }
  if (running) throw new DigestError('A digest is already being sent', 409);
  running = true;

  try {
    const digest = await buildDigest(now);
    const messages = renderDigest(digest, now);
    const counts = {
      interviews: digest.interviews.upcoming.length,
      undatedInterviews: digest.interviews.undated.length,
      jobs: digest.jobs.items.length,
      jobsTotal: digest.jobs.total,
      followUps: digest.followUps.total,
      messages: messages.length,
    };
    const jobIds = digest.jobs.items.map((j) => j.id);

    try {
      for (const text of messages) {
        await telegram('sendMessage', {
          chat_id: config.digest.telegram.chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      }
      // Buttons for the new roles: tailor resume, cover letter, guided apply, people.
      const buttons = jobActionsMessage(digest.jobs.items.map((j) => ({ id: j.id, company: j.company, title: j.title })), { heading: 'Act on the new roles' });
      if (buttons) await telegram('sendMessage', { chat_id: config.digest.telegram.chatId, ...buttons }).catch(() => {});
    } catch (err) {
      await one(
        `INSERT INTO digest_runs (digest_date, trigger, status, counts, body, error)
         VALUES ($1, $2, 'error', $3, $4, $5) RETURNING id`,
        [digest.date, trigger, JSON.stringify(counts), messages.join('\n\n'), err.message],
      );
      throw err;
    }

    const run = await one(
      `INSERT INTO digest_runs (digest_date, trigger, status, job_ids, counts, body)
       VALUES ($1, $2, 'sent', $3, $4, $5) RETURNING id, digest_date, created_at`,
      [digest.date, trigger, jobIds, JSON.stringify(counts), messages.join('\n\n')],
    );
    return { run, counts };
  } finally {
    running = false;
  }
}

/**
 * Scheduler check: past the configured local time, nothing sent today, and
 * fewer than three failed attempts today (so a bad token does not retry
 * every five minutes all day).
 */
export async function digestDue(now = new Date()) {
  const { enabled, hour, minute } = config.digest;
  if (!enabled || !telegramConfigured()) return false;
  if (localMinutes(now) < hour * 60 + minute) return false;
  const today = await one(
    `SELECT count(*) FILTER (WHERE status = 'sent')::int AS sent,
            count(*) FILTER (WHERE status = 'error' AND trigger = 'scheduled')::int AS failed
     FROM digest_runs WHERE digest_date = $1`,
    [localDate(now)],
  );
  return !today.sent && today.failed < 3;
}
