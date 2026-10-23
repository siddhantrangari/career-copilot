import { many, one, query } from '../db/pool.js';
import { autofillCompany } from '../services/autofill.js';
import { resolveBrand } from '../services/brand.js';
import { fetchJdForRole } from '../services/discovery.js';

const ROW = `
  c.id, c.name, c.region, c.roles, c.pay, c.description AS desc, c.apply_url AS apply,
  c.dsa, c.custom, c.favourite, c.freelance, COALESCE(c.dismissed, false) AS dismissed, c.dismissed_at, c.research, c.created_at, c.updated_at
`;

export default async function companyRoutes(app) {
  app.addHook('onRequest', app.auth);

  // GET /api/companies?region=eu&role=fde&tracked=true
  app.get('/', async (request) => {
    const { region, role, tracked } = request.query || {};
    const where = [];
    const params = [];

    if (region && region !== 'all') {
      params.push(region);
      where.push(`c.region = $${params.length}`);
    }
    if (role && role !== 'all') {
      params.push(role);
      where.push(`$${params.length} = ANY (c.roles)`);
    }
    if (tracked === 'true') where.push('t.company_id IS NOT NULL');

    const rows = await many(
      `SELECT ${ROW},
              t.stage, t.win_status, t.notes, t.jd, t.job_link, t.msgs, t.updated_at AS tracked_updated_at,
              COALESCE(cn.count, 0)::int AS connection_count
       FROM companies c
       LEFT JOIN tracked_companies t ON t.company_id = c.id
       LEFT JOIN (SELECT company_id, COUNT(*) AS count FROM connections GROUP BY company_id) cn
              ON cn.company_id = c.id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
       ORDER BY c.custom, c.name`,
      params,
    );

    return { companies: rows };
  });

  app.get('/:id', async (request, reply) => {
    const company = await one(
      `SELECT ${ROW} FROM companies c WHERE c.id = $1`,
      [request.params.id],
    );
    if (!company) return reply.code(404).send({ error: 'Company not found' });

    const tracked = await one('SELECT * FROM tracked_companies WHERE company_id = $1', [company.id]);
    const connections = await many(
      'SELECT * FROM connections WHERE company_id = $1 ORDER BY position, created_at',
      [company.id],
    );
    const messages = await many(
      'SELECT * FROM messages WHERE company_id = $1 ORDER BY created_at DESC LIMIT 50',
      [company.id],
    );
    const winDocs = await many(
      'SELECT id, contact_name, created_at FROM win_docs WHERE company_id = $1 ORDER BY created_at DESC',
      [company.id],
    );

    return { company, tracked, connections, messages, winDocs };
  });

  /**
   * Everything already known about a company, shaped for the Track form.
   * Lets the modal open pre-filled instead of blank.
   */
  app.get('/:id/autofill', async (request, reply) => {
    const data = await autofillCompany(request.params.id);
    if (!data) return reply.code(404).send({ error: 'Company not found' });
    return data;
  });

  /** The saved research brief plus the evidence it was built from. */
  app.get('/:id/research', async (request, reply) => {
    const company = await one(
      'SELECT id, name, research FROM companies WHERE id = $1',
      [request.params.id],
    );
    if (!company) return reply.code(404).send({ error: 'Company not found' });
    if (!company.research) {
      return reply.code(404).send({ error: 'No research on file for this company yet' });
    }

    const evidence = await many(
      `SELECT id, findings, sources, model, created_at
       FROM research_evidence WHERE company_id = $1
       ORDER BY created_at DESC LIMIT 3`,
      [request.params.id],
    );

    return { company: { id: company.id, name: company.name }, research: company.research, evidence };
  });

  /**
   * On-demand JD lookup for the Tailor Resume flow. Given a role name (from
   * the drawer's role input), find and return the best-matching open role's
   * full JD from the company's public ATS board. Used when there is no cached
   * JD text on file, so the drawer can auto-fill instead of asking to paste.
   */
  app.get('/:id/find-jd', async (request, reply) => {
    const role = String(request.query?.role || '').trim();
    const jd = await fetchJdForRole(request.params.id, role).catch((err) => {
      request.log.warn(`[find-jd] ${request.params.id} (${role}): ${err.message}`);
      return null;
    });
    if (!jd) return reply.code(404).send({ error: 'No matching public JD found' });
    return { jd };
  });

  /**
   * Cached brand data — logo, palette, domain — used by the WIN doc slideshow
   * so slides look like the target company's own deck. Force = true refetches
   * from Brandfetch, ignoring the cache.
   */
  app.get('/:id/brand', async (request, reply) => {
    const force = request.query?.force === 'true';
    const brand = await resolveBrand(request.params.id, { force }).catch((err) => {
      request.log.warn(`[brand] resolve failed for ${request.params.id}: ${err.message}`);
      return null;
    });
    if (!brand) return reply.code(404).send({ error: 'Company not found' });
    return { brand };
  });

  /** Interested in this company — shows up in the favourites filter. */
  app.post('/:id/favourite', async (request, reply) => {
    const row = await one(
      `UPDATE companies SET favourite = NOT favourite, updated_at = now()
       WHERE id = $1 RETURNING id, name, favourite`,
      [request.params.id],
    );
    if (!row) return reply.code(404).send({ error: 'Company not found' });

    // Marking interest implies you intend to work it.
    if (row.favourite) {
      await query(
        `INSERT INTO tracked_companies (company_id, stage) VALUES ($1, 'new')
         ON CONFLICT (company_id) DO NOTHING`,
        [row.id],
      );
    }
    return { company: row };
  });

  // POST /api/companies — add a custom company
  app.post('/', async (request, reply) => {
    const b = request.body || {};
    if (!b.name?.trim()) return reply.code(400).send({ error: 'name is required' });

    const id = b.id || `c_${Date.now()}`;
    const isFav = !!(b.favourite || b.fav);
    const row = await one(
      `INSERT INTO companies (id, name, region, roles, pay, description, apply_url, dsa, custom, favourite)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, region = EXCLUDED.region, roles = EXCLUDED.roles,
         pay = EXCLUDED.pay, description = EXCLUDED.description,
         apply_url = EXCLUDED.apply_url, dsa = EXCLUDED.dsa,
         favourite = EXCLUDED.favourite, updated_at = now()
       RETURNING ${ROW.replaceAll('c.', '')}`,
      [
        id, b.name.trim(), b.region || 'global',
        Array.isArray(b.roles) && b.roles.length ? b.roles : ['fs'],
        b.pay || 'Market rate', b.desc || b.description || 'Custom company.',
        b.apply || b.applyUrl || '', !!b.dsa, isFav,
      ],
    );

    // Adding a company from the UI always means you intend to work it.
    await query(
      `INSERT INTO tracked_companies (company_id, stage) VALUES ($1, $2)
       ON CONFLICT (company_id) DO UPDATE SET stage = COALESCE($2, tracked_companies.stage), updated_at = now()`,
      [id, b.stage || 'new'],
    );

    return reply.code(201).send({ company: row });
  });

  app.patch('/:id', async (request, reply) => {
    const b = request.body || {};
    const fields = { name: b.name, region: b.region, roles: b.roles, pay: b.pay, apply_url: b.apply ?? b.applyUrl, dsa: b.dsa };
    if (b.desc !== undefined || b.description !== undefined) fields.description = b.desc ?? b.description;

    const sets = [];
    const params = [];
    for (const [col, val] of Object.entries(fields)) {
      if (val === undefined) continue;
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    }
    if (!sets.length) return reply.code(400).send({ error: 'No updatable fields supplied' });

    params.push(request.params.id);
    const row = await one(
      `UPDATE companies SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length} RETURNING *`,
      params,
    );
    if (!row) return reply.code(404).send({ error: 'Company not found' });
    return { company: row };
  });

  /** Mark as not interested / toggle dismiss on company */
  app.post('/:id/dismiss', async (request, reply) => {
    const row = await one(
      `UPDATE companies
       SET dismissed = NOT COALESCE(dismissed, false),
           dismissed_at = CASE WHEN NOT COALESCE(dismissed, false) THEN now() ELSE NULL END,
           updated_at = now()
       WHERE id = $1
       RETURNING id, name, COALESCE(dismissed, false) AS dismissed, dismissed_at`,
      [request.params.id],
    );
    if (!row) return reply.code(404).send({ error: 'Company not found' });
    return { company: row };
  });

  /** Delete any company permanently */
  app.delete('/:id', async (request, reply) => {
    const id = request.params.id;
    await query('DELETE FROM tracked_companies WHERE company_id = $1', [id]);
    await query('DELETE FROM connections WHERE company_id = $1', [id]);
    await query('DELETE FROM messages WHERE company_id = $1', [id]);
    await query('DELETE FROM win_docs WHERE company_id = $1', [id]);
    await query('DELETE FROM research_evidence WHERE company_id = $1', [id]);
    await query('UPDATE jobs SET company_id = NULL WHERE company_id = $1', [id]);
    const row = await one('DELETE FROM companies WHERE id = $1 RETURNING id, name', [id]);
    if (!row) return reply.code(404).send({ error: 'Company not found' });
    return { deleted: row.id, name: row.name };
  });
}
