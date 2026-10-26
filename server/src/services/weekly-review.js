import { one, many, query } from '../db/pool.js';
import { config } from '../config.js';
import { tg } from './telegram.js';
import { buildToday } from './today.js';
import { pipeline, followUpsFrom, localDate, localMinutes } from './digest.js';
import { listTargets, nextAction } from './targets.js';

/**
 * Sunday-evening review on Telegram: the week against his Daily System
 * targets, which companies moved, what stalled, and next week's top five.
 * Stored data only — no model call, no search API.
 */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SEND_AT = 19 * 60; // 19:00 local, Sunday
const STAGE_LABEL = {
  new: 'New', interested: 'Interested', applied: 'Applied', networking: 'Networking', call: 'Call',
  win: 'WIN doc', interview: 'Interview', offer: 'Offer', failed: 'Closed',
};

const bar = (done, target) => {
  const pct = target ? Math.min(1, done / target) : 0;
  const n = Math.round(pct * 10);
  return '▰'.repeat(n) + '▱'.repeat(10 - n);
};

export async function buildWeeklyReview(now = new Date()) {
  const t = await buildToday(now);
  const w = t.week;
  const tz = config.digest.timeZone;

  const moved = await many(
    `SELECT c.name, t.stage FROM tracked_companies t JOIN companies c ON c.id = t.company_id
     WHERE t.stage_changed_at >= (date_trunc('week', now() AT TIME ZONE $1) AT TIME ZONE $1) AND t.stage <> 'new'
     ORDER BY t.stage_changed_at DESC LIMIT 12`,
    [tz],
  );
  const pipe = await pipeline();
  const stalled = followUpsFrom(pipe.tracked, pipe.contacts, now, { snoozed: pipe.snoozed });
  const top = await listTargets({ limit: 5 });
  const researched = await one(
    `SELECT count(*)::int AS n FROM company_targets WHERE research_at >= now() - interval '7 days'`,
  );

  const lines = [];
  lines.push(`<b>📊 Weekly review</b> — week ending ${esc(localDate(now))}`);
  lines.push('');
  lines.push('<b>Against your Daily System</b>');
  const rows = [
    ['Connection requests', w.connections], ['DMs', w.dms], ['Applications', w.applications],
    ['· abroad (visa / relocation)', w.abroad], ['· India', w.india], ['· remote', w.remote],
    ['Referral asks', w.referrals], ['LinkedIn posts', w.posts], ['Mock interviews', w.mocks],
  ];
  for (const [label, m] of rows) {
    lines.push(`${m.done >= m.target ? '✅' : '▫️'} ${esc(label)}: <b>${m.done}/${m.target}</b>${m.stretch ? ` (stretch ${m.stretch})` : ''} ${bar(m.done, m.target)}`);
  }
  lines.push(`${w.calls.done >= w.calls.target ? '✅' : '▫️'} Calls: <b>${w.calls.done}/${w.calls.target}–${w.calls.stretch}</b> ${bar(w.calls.done, w.calls.target)}`);

  const misses = rows.filter(([, m]) => m.done < m.target).map(([l]) => l.toLowerCase());
  if (misses.length) {
    lines.push('');
    lines.push(`<i>Short on ${esc(misses.slice(0, 3).join(', '))} — volume is what turns into calls. Block the first hour tomorrow for it.</i>`);
  }

  // AI quality and cost, by the model writing resumes, against the Sonnet baseline.
  try {
    const { aiReport } = await import('./ai-monitor.js');
    const a = await aiReport({ days: 30 });
    lines.push('');
    lines.push(`<b>AI — quality and cost</b> (writer ${esc(a.writer)}, fact-check ${esc(a.verifier)})`);
    for (const q of a.quality.filter((x) => x.writer !== 'unknown')) {
      lines.push(`• ${esc(q.model)}: ${q.resumes} resumes · match ${q.avg_match ?? '–'} · fact-check ${q.pass_pct ?? '–'}% · corrected ${q.corrected_pct}% · ${q.avg_words} words · $${q.cost_per_resume}/resume`);
    }
    lines.push(`• Spend: $${a.health.month_to_date.toFixed(2)} this month of $${a.monthlyBudget} · $${a.health.daily_avg_7d.toFixed(2)}/day (7-day)`);
    for (const r of a.recommendations) lines.push(`${r.level === 'act' ? '⚠️' : r.level === 'watch' ? '👀' : '✅'} ${esc(r.text)}`);
  } catch { /* the review goes out without it */ }

  lines.push('');
  lines.push(`<b>Moved this week</b>${moved.length ? '' : ': nothing changed stage'}`);
  for (const m of moved) lines.push(`• ${esc(m.name)} → ${esc(STAGE_LABEL[m.stage] || m.stage)}`);

  lines.push('');
  lines.push(`<b>Stalled</b>${stalled.total ? ` (${stalled.total} waiting on you)` : ': nothing waiting'}`);
  for (const f of stalled.items.slice(0, 5)) {
    const who = f.kind === 'dm' ? `DM to ${f.name}` : f.kind === 'applied' ? `application${f.role ? ` (${f.role})` : ''}` : 'networking';
    lines.push(`• ${esc(f.company)} — ${esc(who)}, quiet ${f.days} days`);
  }
  if (stalled.parked) lines.push(`<i>${stalled.parked} quiet for over 45 days left out — close them in the follow-up triage.</i>`);

  lines.push('');
  lines.push('<b>Next week — top 5</b>');
  for (const x of top) {
    const badge = `${x.priority ? '⭐ ' : ''}${x.tag === 'apply' ? 'APPLY' : 'OUTREACH'}`;
    lines.push(`${x.rank}. <b>${esc(x.name)}</b> · ${badge}`);
    lines.push(`   → ${esc(await nextAction(x))}`);
  }
  if (researched?.n) lines.push(`\n<i>${researched.n} companies had hiring signals researched this week.</i>`);
  lines.push('\nOpen the Today board: https://career.myagentfirm.com/');
  return { text: lines.join('\n'), week: w };
}

export async function weeklyReviewDue(now = new Date()) {
  const sunday = new Intl.DateTimeFormat('en-GB', { timeZone: config.digest.timeZone, weekday: 'short' }).format(now) === 'Sun';
  if (!sunday || localMinutes(now) < SEND_AT) return false;
  const sent = await one(
    `SELECT 1 FROM agent_runs WHERE kind = 'weekly-review' AND status = 'done'
       AND (started_at AT TIME ZONE $1)::date = $2::date`,
    [config.digest.timeZone, localDate(now)],
  );
  return !sent;
}

export async function sendWeeklyReview({ trigger = 'manual' } = {}) {
  const chatId = config.digest.telegram.chatId;
  if (!config.digest.telegram.botToken || !chatId) throw new Error('Telegram is not configured');
  const run = await one(`INSERT INTO agent_runs (kind, trigger, status) VALUES ('weekly-review', $1, 'running') RETURNING id`, [trigger]);
  try {
    const { text } = await buildWeeklyReview();
    await tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
    await query(`UPDATE agent_runs SET status = 'done', finished_at = now() WHERE id = $1`, [run.id]);
    return { sent: true };
  } catch (err) {
    await query(`UPDATE agent_runs SET status = 'error', error = $2, finished_at = now() WHERE id = $1`, [run.id, err.message]);
    throw err;
  }
}
