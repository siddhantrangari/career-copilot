import { many, one } from '../db/pool.js';

/**
 * FDE Lab progress. The curriculum itself lives in web/fde-lab-data-*.js;
 * the server only keeps what he did: steps ticked and the notes and links he
 * saved per day. Both tables are insert-only and the latest row wins.
 */
export const LAB_STEPS = ['context', 'discovery', 'value', 'build', 'video', 'post'];
export const NOTE_KINDS = ['notes', 'video', 'post', 'repo'];

const bad = (message) => Object.assign(new Error(message), { statusCode: 400 });

export async function labProgress() {
  const steps = await many(
    `SELECT DISTINCT ON (day, step) day, step, done, at FROM fde_lab_steps ORDER BY day, step, at DESC`,
  );
  const notes = await many(
    `SELECT DISTINCT ON (day, kind) day, kind, value, at FROM fde_lab_notes ORDER BY day, kind, at DESC`,
  );
  const first = await one(`SELECT min(at) AS at FROM fde_lab_steps WHERE done`);
  const out = { startedAt: first?.at || null, days: {} };
  const dayOf = (d) => (out.days[d] ||= { steps: {}, notes: {} });
  for (const s of steps) dayOf(s.day).steps[s.step] = s.done;
  for (const n of notes) dayOf(n.day).notes[n.kind] = n.value;
  return out;
}

export async function setLabStep({ day, step, done }) {
  const d = Number(day);
  if (!Number.isInteger(d) || d < 1 || d > 30) throw bad('day must be 1 to 30');
  if (!LAB_STEPS.includes(step)) throw bad(`step must be one of ${LAB_STEPS.join(', ')}`);
  return one(`INSERT INTO fde_lab_steps (day, step, done) VALUES ($1, $2, $3) RETURNING day, step, done, at`, [d, step, done === true]);
}

export async function saveLabNote({ day, kind, value }) {
  const d = Number(day);
  if (!Number.isInteger(d) || d < 1 || d > 30) throw bad('day must be 1 to 30');
  if (!NOTE_KINDS.includes(kind)) throw bad(`kind must be one of ${NOTE_KINDS.join(', ')}`);
  return one(`INSERT INTO fde_lab_notes (day, kind, value) VALUES ($1, $2, $3) RETURNING day, kind, at`, [d, kind, String(value || '').slice(0, 20000)]);
}

/** The first day not fully done, once he has started; null before day 1 or after day 30. */
export async function currentLabDay() {
  const { startedAt, days } = await labProgress();
  if (!startedAt) return null;
  for (let d = 1; d <= 30; d += 1) {
    const s = days[d]?.steps || {};
    if (!LAB_STEPS.every((k) => s[k])) return { day: d, done: LAB_STEPS.filter((k) => s[k]).length };
  }
  return null;
}
