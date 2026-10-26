import { one } from '../db/pool.js';

/**
 * Buttons under a list of roles in Telegram: tailor the resume, write the
 * cover letter, guided apply, or people to connect with — per role.
 *
 * Telegram buttons belong to a message, not to a line of it, so a list
 * (the digest's new roles, the Apply queue, a job search) is followed by
 * one short message: the roles numbered, and a row of buttons for each.
 * A button carries `ja:<action>:<job id>` and is handled by the bot.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX = 8;
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const clip = (s, n) => { s = String(s || ''); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s; };

export const ACTIONS = {
  r: { emoji: '📄', label: 'Resume' },
  l: { emoji: '✉️', label: 'Letter' },
  g: { emoji: '🧭', label: 'Apply' },
  p: { emoji: '👥', label: 'People' },
};

/** sendMessage body for the roles, or null when none has a job id. */
export function jobActionsMessage(jobs, { heading = 'Quick actions' } = {}) {
  const seen = new Set();
  const list = (jobs || []).filter((j) => j && UUID.test(String(j.id)) && !seen.has(j.id) && seen.add(j.id)).slice(0, MAX);
  if (!list.length) return null;
  const text = [
    `⚡ <b>${esc(heading)}</b> — 📄 tailor resume · ✉️ cover letter · 🧭 guided apply · 👥 people to connect`,
    ...list.map((j, i) => `${i + 1}. <b>${esc(j.company)}</b> — ${esc(clip(j.title, 70))}`),
  ].join('\n');
  const inline_keyboard = list.map((j, i) => Object.entries(ACTIONS).map(([a, { emoji, label }]) => ({
    text: `${emoji} ${label} ${i + 1}`, callback_data: `ja:${a}:${j.id}`,
  })));
  return { text, parse_mode: 'HTML', disable_web_page_preview: true, reply_markup: { inline_keyboard } };
}

/** `ja:r:<uuid>` → { action, jobId }, or null. */
export function parseJobAction(data) {
  const m = /^ja:([rlgp]):([0-9a-f-]{36})$/i.exec(String(data || ''));
  return m && UUID.test(m[2]) ? { action: m[1], jobId: m[2] } : null;
}

export async function jobForAction(jobId) {
  return one(
    `SELECT j.id, j.title, j.url, COALESCE(NULLIF(c.name, ''), j.company_name) AS company
     FROM jobs j LEFT JOIN companies c ON c.id = j.company_id WHERE j.id = $1`,
    [jobId],
  );
}
