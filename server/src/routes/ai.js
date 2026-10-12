import { many, one } from '../db/pool.js';
import { TASKS, TASK_KINDS } from '../services/tasks.js';
import { createJob, getJob } from '../services/jobs.js';
import { resolveBrand } from '../services/brand.js';
import { buildWinDocPptx } from '../services/pptx.js';

/**
 * Every AI capability is exposed twice:
 *
 *   POST /api/<kind>             runs it synchronously (curl, scripts)
 *   POST /api/jobs  { kind }     queues it and returns an id to poll
 *
 * The browser always uses the job form: grounded research takes ~2 minutes and
 * Cloudflare drops a proxied request at ~100 seconds.
 */
export default async function aiRoutes(app) {
  app.addHook('onRequest', app.auth);

  const syncRoute = (path, kind) => {
    app.post(path, async (request) => TASKS[kind](request.body || {}));
  };

  syncRoute('/research', 'research');
  syncRoute('/generate-messages', 'generate-messages');
  syncRoute('/generate-win-doc', 'generate-win-doc');
  syncRoute('/tailor-resume', 'tailor-resume');
  syncRoute('/cold-email', 'cold-email');
  syncRoute('/call-prep', 'call-prep');
  syncRoute('/linkedin-post', 'linkedin-post');

  // ── Background jobs ──────────────────────────────────────────────────
  app.post('/tasks', async (request, reply) => {
    const { kind, ...payload } = request.body || {};
    if (!TASK_KINDS.includes(kind)) {
      return reply.code(400).send({ error: `kind must be one of: ${TASK_KINDS.join(', ')}` });
    }
    const job = await createJob(kind, payload);
    return reply.code(202).send({ job });
  });

  app.get('/tasks/:id', async (request, reply) => {
    const job = await getJob(request.params.id);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return { job };
  });

  app.get('/tasks', async (request) => {
    const limit = Math.min(parseInt(request.query?.limit ?? '25', 10) || 25, 100);
    return {
      tasks: await many(
        `SELECT id, kind, company_id, status, error, created_at, finished_at
         FROM ai_jobs ORDER BY created_at DESC LIMIT $1`,
        [limit],
      ),
    };
  });

  // ── Stored artefacts ─────────────────────────────────────────────────
  app.get('/win-docs', async () => ({
    winDocs: await many(
      `SELECT w.id, w.company_id, c.name AS company_name, w.contact_name, w.created_at
       FROM win_docs w JOIN companies c ON c.id = w.company_id
       ORDER BY w.created_at DESC LIMIT 100`,
    ),
  }));

  app.get('/win-docs/:id', async (request, reply) => {
    const row = await one('SELECT * FROM win_docs WHERE id = $1', [request.params.id]);
    if (!row) return reply.code(404).send({ error: 'WIN doc not found' });
    return { winDoc: row };
  });

  /**
   * WIN doc as a PowerPoint file, styled with the company's brand colors.
   * Streams a real .pptx that opens cleanly in PowerPoint, Keynote and
   * Google Slides — the whole point of shipping presentation output rather
   * than markdown.
   */
  app.get('/win-docs/:id/pptx', async (request, reply) => {
    const winDoc = await one('SELECT * FROM win_docs WHERE id = $1', [request.params.id]);
    if (!winDoc) return reply.code(404).send({ error: 'WIN doc not found' });

    const company = await one(
      'SELECT id, name FROM companies WHERE id = $1',
      [winDoc.company_id],
    );
    const brand = await resolveBrand(winDoc.company_id).catch(() => null);

    const buffer = await buildWinDocPptx({ winDoc, company, brand });

    const safeName = String(company?.name || 'company')
      .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company';
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
      .header('Content-Disposition', `attachment; filename="win-doc-${safeName}.pptx"`)
      .send(buffer);
  });

  app.get('/resumes', async () => ({
    resumes: await many(
      `SELECT id, company_name, job_title, match_score, created_at
       FROM resume_versions ORDER BY created_at DESC LIMIT 100`,
    ),
  }));

  app.get('/resumes/:id', async (request, reply) => {
    const row = await one('SELECT * FROM resume_versions WHERE id = $1', [request.params.id]);
    if (!row) return reply.code(404).send({ error: 'Resume version not found' });
    return { resume: row };
  });

  /** The live search evidence a brief or WIN doc was built from. */
  app.get('/evidence/:companyId', async (request) => ({
    evidence: await many(
      `SELECT id, findings, sources, model, created_at
       FROM research_evidence WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 5`,
      [request.params.companyId],
    ),
  }));

  app.get('/ai-runs', async (request) => {
    const limit = Math.min(parseInt(request.query?.limit ?? '50', 10) || 50, 200);
    return {
      runs: await many(
        `SELECT id, kind, company_id, model, ok, error, duration_ms, created_at
         FROM ai_runs ORDER BY created_at DESC LIMIT $1`,
        [limit],
      ),
    };
  });
}
