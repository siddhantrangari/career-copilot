import { one } from '../db/pool.js';
import { TASKS } from './tasks.js';

/**
 * Background job runner.
 *
 * Grounded research runs three live web searches plus a synthesis call and
 * takes around two minutes. Cloudflare terminates a proxied request at roughly
 * 100 seconds, so anything the browser triggers has to return immediately and
 * be polled. The work still happens in this process — there is no separate
 * worker — but the HTTP request is no longer holding the connection open.
 *
 * Single-user tool, so an in-process runner is the right size. If this ever
 * needs to survive a restart mid-job, the pattern to reach for is the one in
 * MyAgentFirm: FOR UPDATE SKIP LOCKED polling off the same table.
 */

/**
 * Append a step to a running job. The UI polls these so a two-minute task
 * shows its actual work — which query is running, what came back — instead of
 * a spinner and a stopwatch.
 */
export async function addStep(jobId, step) {
  if (!jobId) return;
  try {
    await (await import('../db/pool.js')).pool.query(
      `UPDATE ai_jobs SET steps = steps || $2::jsonb WHERE id = $1`,
      [jobId, JSON.stringify([{ at: new Date().toISOString(), ...step }])],
    );
  } catch (err) {
    console.error('[jobs] could not record step:', err.message);
  }
}

export async function createJob(kind, payload) {
  if (!TASKS[kind]) throw new Error(`Unknown job kind: ${kind}`);

  const job = await one(
    `INSERT INTO ai_jobs (kind, company_id, status, input)
     VALUES ($1, $2, 'queued', $3)
     RETURNING id, kind, status, created_at`,
    [kind, payload?.companyId || null, JSON.stringify(payload || {})],
  );

  // Deliberately not awaited — the HTTP handler returns the id straight away.
  runJob(job.id, kind, payload).catch((err) => {
    console.error(`[jobs] ${kind} ${job.id} crashed:`, err.message);
  });

  return job;
}

async function runJob(id, kind, payload) {
  await one(`UPDATE ai_jobs SET status = 'running', started_at = now() WHERE id = $1 RETURNING id`, [id]);

  try {
    // Tasks receive a reporter so they can narrate their own progress.
    const result = await TASKS[kind](payload || {}, {
      onStep: (step) => addStep(id, step),
    });
    await one(
      `UPDATE ai_jobs SET status = 'done', result = $2, finished_at = now()
       WHERE id = $1 RETURNING id`,
      [id, JSON.stringify(result)],
    );
  } catch (err) {
    await one(
      `UPDATE ai_jobs SET status = 'error', error = $2, finished_at = now()
       WHERE id = $1 RETURNING id`,
      [id, err.message || String(err)],
    );
  }
}

export async function getJob(id) {
  return one(
    `SELECT id, kind, company_id, status, error, result, steps, created_at, started_at, finished_at,
            EXTRACT(EPOCH FROM (COALESCE(finished_at, now()) - created_at))::int AS elapsed_seconds
     FROM ai_jobs WHERE id = $1`,
    [id],
  );
}

/**
 * Jobs orphaned by a restart. Nothing resumes them; they are marked failed so
 * the UI stops polling a job that will never finish.
 */
export async function failStaleJobs() {
  const { rowCount } = await (await import('../db/pool.js')).pool.query(
    `UPDATE ai_jobs
     SET status = 'error',
         error = 'Interrupted by a server restart — run it again',
         finished_at = now()
     WHERE status IN ('queued', 'running')`,
  );
  return rowCount;
}
