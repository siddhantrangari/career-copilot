import { many, one, query } from '../db/pool.js';

const STAGES = ['new', 'applied', 'networking', 'call', 'win', 'interview', 'offer', 'failed'];
const CONN_STATUSES = ['req', 'dm', 'reply', 'fu1', 'fu2', 'fu3', 'win', 'call', 'ref', 'ab'];
const CONN_TYPES = ['peer', 'hm', 'hr', 'indian', 'other'];

export default async function trackedRoutes(app) {
  app.addHook('onRequest', app.auth);

  // GET /api/tracked — every tracked company with its connections
  app.get('/', async () => {
    const rows = await many(
      `SELECT t.*, c.name, c.region, c.roles, c.pay, c.apply_url AS apply
       FROM tracked_companies t
       JOIN companies c ON c.id = t.company_id
       ORDER BY t.updated_at DESC`,
    );
    const connections = await many('SELECT * FROM connections ORDER BY company_id, position, created_at');

    const byCompany = new Map();
    for (const conn of connections) {
      if (!byCompany.has(conn.company_id)) byCompany.set(conn.company_id, []);
      byCompany.get(conn.company_id).push(conn);
    }

    return {
      tracked: rows.map((r) => ({ ...r, connections: byCompany.get(r.company_id) || [] })),
    };
  });

  // POST /api/tracked/:id — upsert tracking state for a company
  app.post('/:id', async (request, reply) => {
    const b = request.body || {};
    const companyId = request.params.id;

    const exists = await one('SELECT id FROM companies WHERE id = $1', [companyId]);
    if (!exists) return reply.code(404).send({ error: 'Company not found' });

    if (b.stage && !STAGES.includes(b.stage)) {
      return reply.code(400).send({ error: `stage must be one of: ${STAGES.join(', ')}` });
    }

    const row = await one(
      `INSERT INTO tracked_companies (company_id, stage, win_status, msgs, jd, job_link, notes)
       VALUES ($1, COALESCE($2, 'new'), COALESCE($3, 'none'), COALESCE($4, ''), COALESCE($5, ''), COALESCE($6, ''), COALESCE($7, ''))
       ON CONFLICT (company_id) DO UPDATE SET
         stage      = COALESCE($2, tracked_companies.stage),
         win_status = COALESCE($3, tracked_companies.win_status),
         msgs       = COALESCE($4, tracked_companies.msgs),
         jd         = COALESCE($5, tracked_companies.jd),
         job_link   = COALESCE($6, tracked_companies.job_link),
         notes      = COALESCE($7, tracked_companies.notes),
         updated_at = now()
       RETURNING *`,
      [
        companyId,
        b.stage ?? null,
        b.win ?? b.winStatus ?? null,
        b.msgs ?? null,
        b.jd ?? null,
        b.jobLink ?? b.job_link ?? null,
        b.notes ?? null,
      ],
    );

    return { tracked: row };
  });

  app.delete('/:id', async (request) => {
    await query('DELETE FROM tracked_companies WHERE company_id = $1', [request.params.id]);
    return { deleted: request.params.id };
  });

  // ── Connections ────────────────────────────────────────────────────────
  app.get('/:id/connections', async (request) => ({
    connections: await many(
      'SELECT * FROM connections WHERE company_id = $1 ORDER BY position, created_at',
      [request.params.id],
    ),
  }));

  app.post('/:id/connections', async (request, reply) => {
    const b = request.body || {};
    const companyId = request.params.id;

    if (!b.name?.trim()) return reply.code(400).send({ error: 'name is required' });
    if (b.status && !CONN_STATUSES.includes(b.status)) {
      return reply.code(400).send({ error: `status must be one of: ${CONN_STATUSES.join(', ')}` });
    }
    if (b.type && !CONN_TYPES.includes(b.type)) {
      return reply.code(400).send({ error: `type must be one of: ${CONN_TYPES.join(', ')}` });
    }

    // Tracking a connection implies the company is being worked.
    await query(
      `INSERT INTO tracked_companies (company_id, stage) VALUES ($1, 'networking')
       ON CONFLICT (company_id) DO UPDATE SET updated_at = now()`,
      [companyId],
    );

    const next = await one(
      'SELECT COALESCE(MAX(position), -1) + 1 AS pos FROM connections WHERE company_id = $1',
      [companyId],
    );

    const row = await one(
      `INSERT INTO connections (company_id, position, name, role, type, linkedin_url, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        companyId, next.pos, b.name.trim(), b.role || '', b.type || 'peer',
        b.li ?? b.linkedinUrl ?? b.linkedin_url ?? '', b.status || 'req', b.notes || '',
      ],
    );

    return reply.code(201).send({ connection: row });
  });

  app.put('/:id/connections/:connId', async (request, reply) => {
    const b = request.body || {};
    if (b.status && !CONN_STATUSES.includes(b.status)) {
      return reply.code(400).send({ error: `status must be one of: ${CONN_STATUSES.join(', ')}` });
    }

    const row = await one(
      `UPDATE connections SET
         name = COALESCE($3, name),
         role = COALESCE($4, role),
         type = COALESCE($5, type),
         linkedin_url = COALESCE($6, linkedin_url),
         status = COALESCE($7, status),
         notes = COALESCE($8, notes),
         updated_at = now()
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [
        request.params.connId, request.params.id,
        b.name ?? null, b.role ?? null, b.type ?? null,
        b.li ?? b.linkedinUrl ?? b.linkedin_url ?? null,
        b.status ?? null, b.notes ?? null,
      ],
    );

    if (!row) return reply.code(404).send({ error: 'Connection not found' });
    return { connection: row };
  });

  app.delete('/:id/connections/:connId', async (request) => {
    await query('DELETE FROM connections WHERE id = $1 AND company_id = $2', [
      request.params.connId,
      request.params.id,
    ]);
    return { deleted: request.params.connId };
  });
}
