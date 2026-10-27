import { one, many, query } from '../db/pool.js';
import { companyStageFor } from './role-stage.js';
import { chatJson } from './ai.js';
import { candidateBlock } from './context.js';
import { CONSULTANT_STANCE } from './prompts.js';
import { pipeline, followUpsFrom } from './digest.js';
import { logActivity } from './targets.js';

/**
 * Follow-up triage: every follow-up that is due, and one decision for each.
 *
 *   sent    — he followed up: the clock restarts (DM → follow-up 1)
 *   snooze  — waiting on them: hidden for N days, then due again
 *   close   — it is over: the role / company moves to Closed, the contact
 *             to "no reply". A stage change, so the history stays.
 *
 * Nothing is deleted. Every decision is logged in outreach_activity.
 */

const NUDGE_MODEL = 'openai/gpt-5.6-luna';

function splitNotes(notes) {
  const raw = String(notes || '');
  const m = raw.match(/<!--CC_ROLES:([\s\S]*?)-->/);
  let roles = [];
  if (m) { try { roles = JSON.parse(m[1]); } catch { roles = []; } }
  return { roles: Array.isArray(roles) ? roles : [], text: raw.replace(/<!--CC_ROLES:[\s\S]*?-->/g, '').trim() };
}
const joinNotes = (text, roles) => (roles.length ? `${text}${text ? '\n\n' : ''}<!--CC_ROLES:${JSON.stringify(roles)}-->` : text);

/** All follow-ups due (not snoozed), oldest silence first within each kind. */
export async function listFollowups(now = new Date()) {
  const pipe = await pipeline();
  const f = followUpsFrom(pipe.tracked, pipe.contacts, now, { snoozed: pipe.snoozed, limit: 500 });
  return { items: f.items, total: f.total, parked: f.parked, waiting: f.waiting };
}

async function findDue(key) {
  const { items } = await listFollowups();
  const item = items.find((i) => i.key === key);
  if (!item) throw Object.assign(new Error('That follow-up is no longer due — it may already be handled.'), { statusCode: 404 });
  return item;
}

export async function actOnFollowup(key, action, { days = 7, as = null } = {}) {
  const item = await findDue(key);
  const note = `followup:${action}:${key}`.slice(0, 300);
  if (action === 'snooze') {
    const d = Math.max(1, Math.min(60, Math.round(Number(days) || 7)));
    await query(
      `INSERT INTO followup_snoozes (key, until) VALUES ($1, now() + make_interval(days => $2))
       ON CONFLICT (key) DO UPDATE SET until = EXCLUDED.until`,
      [key, d],
    );
    await logActivity({ companyId: item.companyId, companyName: item.company, kind: 'action_done', note });
    return { done: `Waiting — back in ${d} days`, item };
  }

  if (action === 'sent') {
    if (item.kind === 'dm') {
      await query(`UPDATE connections SET status = 'fu1', updated_at = now() WHERE id = $1 AND status = 'dm'`, [item.contactId]);
    } else {
      await query(`UPDATE tracked_companies SET activity_at = now() WHERE company_id = $1`, [item.companyId]);
    }
    await logActivity({ companyId: item.companyId, companyName: item.company, kind: as === 'referral' ? 'referral_ask' : 'follow_up', note });
    return { done: 'Followed up — the clock restarts', item };
  }

  if (action === 'close') {
    if (item.kind === 'dm') {
      await query(`UPDATE connections SET status = 'ab', updated_at = now() WHERE id = $1`, [item.contactId]);
    } else {
      const t = await one(`SELECT stage, notes FROM tracked_companies WHERE company_id = $1`, [item.companyId]);
      const { roles, text } = splitNotes(t?.notes);
      let stage = t?.stage;
      const role = item.role ? roles.find((r) => (r.title || '') === item.role) : null;
      if (role) {
        role.stage = 'failed';
        // The company follows its furthest open role, closing only when all are closed.
        stage = companyStageFor(roles, stage);
      } else {
        stage = 'failed';
      }
      await query(`UPDATE tracked_companies SET stage = $2, notes = $3, updated_at = now() WHERE company_id = $1`,
        [item.companyId, stage, joinNotes(text, roles)]);
    }
    await logActivity({ companyId: item.companyId, companyName: item.company, kind: 'action_done', note });
    return { done: 'Closed — kept in your history', item };
  }
  throw Object.assign(new Error('action must be sent, snooze or close'), { statusCode: 400 });
}

/**
 * A short, specific follow-up for one item (one cheap model call). For an
 * application: a recruiter nudge and a referral ask. For a DM: the day-4
 * follow-up with something new. For networking: the next message.
 */
export async function draftNudge(key) {
  const item = await findDue(key);
  const [why, role, contacts] = await Promise.all([
    one(`SELECT why FROM company_why WHERE key = lower(trim($1))`, [item.company]),
    item.role ? one(`SELECT title, why_role, url FROM jobs WHERE company_id = $1 AND title = $2 LIMIT 1`, [item.companyId, item.role]) : null,
    many(`SELECT name, role, type, status FROM connections WHERE company_id = $1 ORDER BY position LIMIT 6`, [item.companyId]),
  ]);
  const what = item.kind === 'applied'
    ? `He applied ${item.days} days ago${item.role ? ` to "${item.role}"` : ''} and has heard nothing.`
    : item.kind === 'dm' ? `He sent a LinkedIn DM to ${item.name} ${item.days} days ago with no reply.`
    : `He is networking at the company and nothing has happened for ${item.days} days.`;
  const res = await chatJson({
    kind: 'followup-nudge', model: NUDGE_MODEL, companyId: item.companyId, maxTokens: 900,
    system: `${CONSULTANT_STANCE}

You write ONE short follow-up for a job search. Never "just checking in" or "following up on my application" as the whole message: give one specific reason to reply (a relevant result from his achievements, or something about the company from the context). Use only facts in the context. Return JSON only.`,
    user: `${await candidateBlock({ limit: 6 })}

COMPANY: ${item.company}
WHY THIS COMPANY: ${why?.why || '(none on file)'}
${role ? `ROLE: ${role.title}\nWHY THIS ROLE: ${role.why_role || ''}` : ''}
CONTACTS THERE: ${contacts.length ? contacts.map((c) => `${c.name} (${c.role || c.type}, ${c.status})`).join('; ') : 'none'}
SITUATION: ${what}

Return JSON:
${item.kind === 'applied'
    ? `{ "recruiterNudge": "LinkedIn message or email to the recruiter / hiring manager, 50-90 words", "referralAsk": "message to someone at the company asking for a referral${contacts.length ? ' — address the best contact listed by first name' : ' — to a peer engineer he is about to connect with'}, 50-90 words", "tip": "one line: who to send it to and how to find them" }`
    : `{ "message": "${item.kind === 'dm' ? 'the day-4 follow-up DM, 40-80 words, adds something new' : 'the next networking message, 50-90 words'}", "tip": "one line on when/how to send it" }`}`,
    input: { key },
  });
  return { item, drafts: res };
}
