import { many, one } from '../db/pool.js';

const STAGES = ['new', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];

export default async function pipelineRoutes(app) {
  app.addHook('onRequest', app.auth);

  // GET /api/pipeline — kanban-ready grouping
  app.get('/pipeline', async () => {
    const rows = await many(
      `SELECT t.company_id, t.stage, t.win_status, t.notes, t.jd, t.job_link, t.updated_at,
              c.name, c.region, c.roles, c.pay, c.apply_url AS apply,
              COALESCE(cn.count, 0)::int AS connection_count,
              COALESCE(cn.replies, 0)::int AS reply_count
       FROM tracked_companies t
       JOIN companies c ON c.id = t.company_id
       LEFT JOIN (
         SELECT company_id,
                COUNT(*) AS count,
                COUNT(*) FILTER (WHERE status IN ('reply','call','win','ref')) AS replies
         FROM connections GROUP BY company_id
       ) cn ON cn.company_id = t.company_id
       ORDER BY t.updated_at DESC`,
    );

    const columns = Object.fromEntries(STAGES.map((s) => [s, []]));
    for (const row of rows) (columns[row.stage] || columns.new).push(row);

    return { stages: STAGES, columns, total: rows.length };
  });

  // GET /api/stats — headline numbers + funnel
  app.get('/stats', async () => {
    const totals = await one(`
      SELECT
        (SELECT COUNT(*) FROM companies)::int                                         AS companies,
        (SELECT COUNT(*) FROM companies WHERE custom)::int                            AS custom_companies,
        (SELECT COUNT(*) FROM tracked_companies)::int                                 AS tracked,
        (SELECT COUNT(*) FROM tracked_companies
           WHERE stage NOT IN ('new','failed'))::int                                  AS active,
        (SELECT COUNT(*) FROM tracked_companies WHERE stage = 'interview')::int       AS interviews,
        (SELECT COUNT(*) FROM tracked_companies WHERE stage = 'offer')::int           AS offers,
        (SELECT COUNT(*) FROM connections)::int                                       AS connections,
        (SELECT COUNT(*) FROM connections
           WHERE status IN ('reply','call','win','ref'))::int                         AS replies,
        (SELECT COUNT(*) FROM connections WHERE status = 'ref')::int                  AS referrals,
        (SELECT COUNT(*) FROM win_docs)::int                                          AS win_docs,
        (SELECT COUNT(*) FROM resume_versions)::int                                   AS tailored_resumes,
        (SELECT COUNT(*) FROM companies WHERE research IS NOT NULL)::int              AS researched
    `);

    const byStage = await many(
      'SELECT stage, COUNT(*)::int AS count FROM tracked_companies GROUP BY stage',
    );
    const byConnStatus = await many(
      'SELECT status, COUNT(*)::int AS count FROM connections GROUP BY status',
    );
    const weekly = await many(`
      SELECT date_trunc('week', created_at)::date AS week, COUNT(*)::int AS connections
      FROM connections
      WHERE created_at > now() - interval '12 weeks'
      GROUP BY 1 ORDER BY 1
    `);

    const replyRate = totals.connections
      ? Math.round((totals.replies / totals.connections) * 1000) / 10
      : 0;

    return {
      totals: { ...totals, replyRate },
      byStage: Object.fromEntries(byStage.map((r) => [r.stage, r.count])),
      byConnectionStatus: Object.fromEntries(byConnStatus.map((r) => [r.status, r.count])),
      weekly,
    };
  });
}
