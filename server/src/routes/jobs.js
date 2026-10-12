import { many, one } from '../db/pool.js';
import { listJobs, agentRuns, agentRun, latestPostings } from '../services/discovery.js';
import { createJob } from '../services/jobs.js';
import { chatJson } from '../services/ai.js';
import { candidateBlock } from '../services/context.js';
import { gigProposalPrompt } from '../services/prompts.js';

const APP_STATUSES = ['applied', 'talking', 'won', 'lost'];

/**
 * Job discovery. Live scraping (LinkedIn/NaukriGulf via Apify) is not wired up
 * yet — these routes cover the manual + Boolean-search workflow the prototypes
 * already use, and give scrapers a table to write into when they land.
 */

const DSA_SIGNALS = [
  'leetcode', 'data structures and algorithms', 'algorithmic', 'coding challenge',
  'hackerrank', 'codesignal', 'whiteboard', 'competitive programming', 'dsa round',
];

const detectDsa = (text = '') => {
  const lower = text.toLowerCase();
  const hit = DSA_SIGNALS.find((s) => lower.includes(s));
  return { likely: Boolean(hit), evidence: hit || null };
};

export default async function jobRoutes(app) {
  app.addHook('onRequest', app.auth);

  /** Discovered jobs, newest posting first. */
  app.get('/discovered', async (request) => {
    const q = request.query || {};
    return {
      jobs: await listJobs({
        limit: parseInt(q.limit ?? '100', 10) || 100,
        companyId: q.companyId,
        includeClosed: q.includeClosed === 'true',
        minRelevance: parseInt(q.minRelevance ?? '40', 10) || 40,
        favouritesOnly: q.favourites === 'true',
        kind: ['gigs', 'fte', 'all'].includes(q.kind) ? q.kind : 'fte',
        appStatus: q.status || null,
        source: q.source || null,
        sort: q.sort || 'recent',
      }),
    };
  });

  // ── Freelance gigs ──────────────────────────────────────────────────
  /** Pull fresh gigs from every source now (normally every 6h on its own). */
  app.post('/gigs/refresh', async (request, reply) => {
    const job = await createJob('gig-discovery', request.body || {});
    return reply.code(202).send({ job });
  });

  /** Counts for the freelance header: open gigs per source, and his pipeline. */
  app.get('/gigs/summary', async () => {
    const bySource = await many(
      `SELECT source, COUNT(*)::int AS open
       FROM jobs
       WHERE engagement IS NOT NULL AND engagement <> 'fte'
         AND closed_at IS NULL AND NOT dismissed AND relevance >= 30
       GROUP BY source ORDER BY open DESC`,
    );
    const byStatus = await many(
      `SELECT app_status AS status, COUNT(*)::int AS n
       FROM jobs
       WHERE engagement IS NOT NULL AND engagement <> 'fte' AND app_status IS NOT NULL
       GROUP BY app_status`,
    );
    const lastRun = await one(
      `SELECT status, finished_at, jobs_new, detail FROM agent_runs
       WHERE kind = 'gig-discovery' ORDER BY started_at DESC LIMIT 1`,
    );
    return { bySource, byStatus, lastRun };
  });

  /** Full posting, for the expanded card and the proposal writer. */
  app.get('/:id', async (request, reply) => {
    if (!/^[0-9a-f-]{36}$/i.test(request.params.id)) return reply.code(404).send({ error: 'Not found' });
    const row = await one('SELECT * FROM jobs WHERE id = $1', [request.params.id]);
    if (!row) return reply.code(404).send({ error: 'Job not found' });
    return { job: row };
  });

  /**
   * Where he is with this one: applied → talking → won / lost. Marketplaces
   * expose no applicant tracking, so this is set by hand. Any status also
   * saves the posting so it stays in the Saved view.
   */
  app.post('/:id/status', async (request, reply) => {
    const status = request.body?.status || null;
    if (status && !APP_STATUSES.includes(status)) {
      return reply.code(400).send({ error: `status must be one of: ${APP_STATUSES.join(', ')} (or empty)` });
    }
    const row = await one(
      `UPDATE jobs SET app_status = $2, app_status_at = CASE WHEN $2::text IS NULL THEN NULL ELSE now() END,
              favourite = CASE WHEN $2::text IS NULL THEN favourite ELSE true END,
              dismissed = CASE WHEN $2::text IS NULL THEN dismissed ELSE false END
       WHERE id = $1
       RETURNING id, title, app_status, app_status_at, favourite`,
      [request.params.id, status],
    );
    if (!row) return reply.code(404).send({ error: 'Job not found' });
    return { job: row };
  });

  /**
   * Draft the proposal / application for one gig, with an honest fit check.
   * Inline rather than queued: one short model call fits inside the proxy
   * window. Saved, so reopening the card does not pay for it twice.
   */
  app.post('/:id/proposal', async (request, reply) => {
    const gig = await one('SELECT * FROM jobs WHERE id = $1', [request.params.id]);
    if (!gig) return reply.code(404).send({ error: 'Job not found' });
    if (gig.proposal && request.body?.regenerate !== true) return { proposal: gig.proposal, cached: true };

    const prompt = gigProposalPrompt({ gig, candidate: await candidateBlock() });
    const proposal = await chatJson({
      kind: 'gig-proposal',
      companyId: gig.company_id,
      system: prompt.system,
      user: prompt.user,
      maxTokens: 3_000,
      input: { jobId: gig.id, source: gig.source, title: gig.title },
    });
    await one('UPDATE jobs SET proposal = $2 WHERE id = $1 RETURNING id', [gig.id, JSON.stringify(proposal)]);
    return { proposal, cached: false };
  });

  /** Interested in this specific role. Also starts tracking the company. */
  app.post('/:id/favourite', async (request, reply) => {
    const row = await one(
      `UPDATE jobs SET favourite = NOT favourite WHERE id = $1
       RETURNING id, company_id, company_name, title, url, favourite`,
      [request.params.id],
    );
    if (!row) return reply.code(404).send({ error: 'Job not found' });

    if (row.favourite && row.company_id) {
      await one(
        `INSERT INTO tracked_companies (company_id, stage, job_link)
         VALUES ($1, 'new', $2)
         ON CONFLICT (company_id) DO UPDATE SET
           job_link = CASE WHEN tracked_companies.job_link = '' THEN EXCLUDED.job_link
                           ELSE tracked_companies.job_link END,
           updated_at = now()
         RETURNING company_id`,
        [row.company_id, row.url],
      );
    }
    return { job: row };
  });

  /** Not interested — keeps the row, sinks it to the bottom of the list. */
  app.post('/:id/dismiss', async (request, reply) => {
    const row = await one(
      `UPDATE jobs
       SET dismissed = NOT dismissed,
           dismissed_at = CASE WHEN dismissed THEN NULL ELSE now() END,
           favourite = CASE WHEN dismissed THEN favourite ELSE false END
       WHERE id = $1
       RETURNING id, title, dismissed, favourite`,
      [request.params.id],
    );
    if (!row) return reply.code(404).send({ error: 'Job not found' });
    return { job: row };
  });

  /** Latest posting date + open count per company, for the card badges. */
  app.get('/latest-by-company', async () => ({ companies: await latestPostings() }));

  /** Kick the agent off now. */
  app.post('/discover', async (request, reply) => {
    const job = await createJob('job-discovery', request.body || {});
    return reply.code(202).send({ job });
  });

  /** Full agent history — every run, what it checked and what broke. */
  app.get('/agent/runs', async (request) => ({
    runs: await agentRuns(Math.min(parseInt(request.query?.limit ?? '25', 10) || 25, 100)),
  }));

  app.get('/agent/runs/:id', async (request, reply) => {
    const run = await agentRun(request.params.id);
    if (!run) return reply.code(404).send({ error: 'Agent run not found' });
    return { run };
  });

  app.get('/', async (request) => {
    const { companyId, source } = request.query || {};
    const where = [];
    const params = [];
    if (companyId) {
      params.push(companyId);
      where.push(`company_id = $${params.length}`);
    }
    if (source) {
      params.push(source);
      where.push(`source = $${params.length}`);
    }
    return {
      jobs: await many(
        `SELECT * FROM jobs ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY discovered_at DESC LIMIT 200`,
        params,
      ),
    };
  });

  app.post('/', async (request, reply) => {
    const b = request.body || {};
    if (!b.url?.trim()) return reply.code(400).send({ error: 'url is required' });

    const dsa = detectDsa(b.description || '');
    const row = await one(
      `INSERT INTO jobs (company_id, company_name, title, url, location, source, description, no_dsa, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (url) DO UPDATE SET
         title = EXCLUDED.title, location = EXCLUDED.location,
         description = EXCLUDED.description, no_dsa = EXCLUDED.no_dsa
       RETURNING *`,
      [
        b.companyId || null, b.companyName || '', b.title || '', b.url.trim(),
        b.location || '', b.source || 'manual', b.description || '',
        b.description ? !dsa.likely : null,
        b.postedAt || null,
      ],
    );
    return reply.code(201).send({ job: row, dsaSignal: dsa });
  });

  app.delete('/:id', async (request) => {
    await one('DELETE FROM jobs WHERE id = $1 RETURNING id', [request.params.id]);
    return { deleted: request.params.id };
  });

  /**
   * GET /api/jobs/search-links — the Boolean strings and board links the
   * prototype builds client-side, generated server-side so they stay in one place.
   */
  app.get('/search-links', async (request) => {
    const role = request.query?.role || 'Forward Deployed Engineer';
    const location = request.query?.location || 'Remote';
    const q = (s) => encodeURIComponent(s);

    const boolean = {
      greenhouse: `site:job-boards.greenhouse.io OR site:boards.greenhouse.io "${role}" "${location}"`,
      lever: `site:jobs.lever.co "${role}" "${location}"`,
      ashby: `site:jobs.ashbyhq.com "${role}"`,
      workable: `site:apply.workable.com "${role}" "${location}"`,
      noDsa: `"${role}" "${location}" -leetcode -"data structures" ("take home" OR "system design" OR "pair programming")`,
    };

    return {
      boolean,
      google: Object.fromEntries(
        Object.entries(boolean).map(([k, v]) => [k, `https://www.google.com/search?q=${q(v)}`]),
      ),
      boards: [
        { name: 'LinkedIn Jobs', url: `https://www.linkedin.com/jobs/search/?keywords=${q(role)}&location=${q(location)}&f_TPR=r604800` },
        { name: 'NaukriGulf', url: `https://www.naukrigulf.com/${q(role.toLowerCase().replaceAll(' ', '-'))}-jobs` },
        { name: 'Bayt', url: `https://www.bayt.com/en/uae/jobs/${q(role.toLowerCase().replaceAll(' ', '-'))}-jobs/` },
        { name: 'Wellfound', url: `https://wellfound.com/role/r/${q(role.toLowerCase().replaceAll(' ', '-'))}` },
        { name: 'RemoteOK', url: `https://remoteok.com/remote-${q(role.toLowerCase().replaceAll(' ', '-'))}-jobs` },
        { name: 'EU Remote Jobs', url: `https://euremotejobs.com/?s=${q(role)}` },
        { name: 'Otta', url: 'https://app.otta.com/jobs' },
      ],
    };
  });

  /** POST /api/jobs/dsa-check — paste a JD, get the DSA verdict. */
  app.post('/dsa-check', async (request, reply) => {
    const { description = '' } = request.body || {};
    if (!description.trim()) return reply.code(400).send({ error: 'description is required' });
    const dsa = detectDsa(description);
    return { noDsa: !dsa.likely, ...dsa };
  });
}
