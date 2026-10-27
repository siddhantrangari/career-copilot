import { many, one } from '../db/pool.js';
import { config } from '../config.js';

/**
 * One-off to-dos on the Today board, e.g. "finish Celonis Academy, then
 * apply". Rows are insert-only: done is an outreach_activity row whose note
 * is action:task:<id> (the Today board's normal Done button writes it), and
 * a reminder sent is a today_task_reminders row.
 */

export async function addTask({ title, detail = '', company = '', url = '', remindAt = null } = {}) {
  const t = String(title || '').trim();
  if (!t) throw Object.assign(new Error('title is required'), { statusCode: 400 });
  const at = remindAt ? new Date(remindAt) : null;
  if (at && Number.isNaN(at.getTime())) throw Object.assign(new Error('remindAt is not a valid date'), { statusCode: 400 });
  return one(
    `INSERT INTO today_tasks (title, detail, company_name, url, remind_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, detail, company_name, url, remind_at, created_at`,
    [t.slice(0, 300), String(detail).slice(0, 2000), String(company).slice(0, 200), String(url).slice(0, 1000), at],
  );
}

/** Tasks not yet marked done, oldest first. */
export function openTasks() {
  return many(
    `SELECT t.* FROM today_tasks t
     WHERE NOT EXISTS (SELECT 1 FROM outreach_activity a WHERE a.note = 'action:task:' || t.id)
     ORDER BY t.created_at, t.id`,
  );
}

/**
 * Scheduler check: one Telegram message listing every open task whose
 * remind_at has passed and that has not been reminded yet.
 */
export async function sendDueReminders() {
  const { botToken, chatId } = config.digest.telegram;
  if (!botToken || !chatId) return 0;
  const due = (await openTasks()).filter((t) => t.remind_at && new Date(t.remind_at) <= new Date());
  if (!due.length) return 0;
  const sent = new Set((await many(
    'SELECT task_id FROM today_task_reminders WHERE task_id = ANY($1::bigint[])', [due.map((t) => t.id)],
  )).map((r) => String(r.task_id)));
  const todo = due.filter((t) => !sent.has(String(t.id)));
  if (!todo.length) return 0;

  const { sendMarkdown } = await import('./telegram.js');
  const lines = todo.map((t, i) =>
    `${i + 1}. **${t.company_name ? `${t.company_name}: ` : ''}${t.title}**${t.detail ? `\n   ${t.detail}` : ''}`);
  await sendMarkdown(chatId, `⏰ **Reminder: ${todo.length} task${todo.length > 1 ? 's' : ''} on your Today board**\n\n${lines.join('\n')}\n\nMark each one Done on the Today board when finished.`);
  for (const t of todo) {
    await one('INSERT INTO today_task_reminders (task_id) VALUES ($1) ON CONFLICT (task_id) DO NOTHING RETURNING task_id', [t.id]);
  }
  return todo.length;
}
