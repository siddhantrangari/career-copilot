import { many, one, withTransaction } from '../db/pool.js';

/**
 * Compatibility layer for the single-file prototypes in /artifacts.
 *
 * They keep everything in two localStorage blobs — `sr_tracked` (an object
 * keyed by company id) and `sr_custom` (an array of custom companies). These
 * routes read and write exactly those shapes, so the prototypes only need
 * their ld()/sv() helpers swapped for fetch calls.
 */

const toTrackedBlob = (rows, connections) => {
  const byCompany = new Map();
  for (const c of connections) {
    if (!byCompany.has(c.company_id)) byCompany.set(c.company_id, []);
    byCompany.get(c.company_id).push({
      id: c.id,
      name: c.name,
      role: c.role,
      type: c.type,
      li: c.linkedin_url,
      status: c.status,
      notes: c.notes,
    });
  }

  const blob = {};
  for (const r of rows) {
    blob[r.company_id] = {
      stage: r.stage,
      win: r.win_status,
      msgs: r.msgs,
      jd: r.jd,
      jobLink: r.job_link,
      notes: r.notes,
      connections: byCompany.get(r.company_id) || [],
      updated: new Date(r.updated_at).toLocaleDateString(),
    };
  }
  return blob;
};

export default async function stateRoutes(app) {
  app.addHook('onRequest', app.auth);

  // GET /api/state — the whole prototype state in one round trip
  app.get('/', async () => {
    const tracked = await many('SELECT * FROM tracked_companies');
    const connections = await many('SELECT * FROM connections ORDER BY company_id, position, created_at');
    const custom = await many(
      `SELECT id, name, region, roles, pay, description AS desc, apply_url AS apply, dsa, custom
       FROM companies WHERE custom = true ORDER BY created_at`,
    );
    const ui = await many('SELECT key, value FROM ui_state');

    return {
      tracked: toTrackedBlob(tracked, connections),
      custom,
      ui: Object.fromEntries(ui.map((r) => [r.key, r.value])),
    };
  });

  /**
   * PUT /api/state — replace the tracked/custom snapshot.
   * Used by the prototypes' debounced autosave and by the one-time
   * localStorage → server import.
   */
  app.put('/', async (request) => {
    const { tracked = {}, custom = [] } = request.body || {};

    const counts = await withTransaction(async (client) => {
      for (const c of custom) {
        if (!c?.id || !c?.name) continue;
        await client.query(
          `INSERT INTO companies (id, name, region, roles, pay, description, apply_url, dsa, custom)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, region = EXCLUDED.region, roles = EXCLUDED.roles,
             pay = EXCLUDED.pay, description = EXCLUDED.description,
             apply_url = EXCLUDED.apply_url, updated_at = now()`,
          [
            c.id, c.name, c.region || 'global',
            Array.isArray(c.roles) && c.roles.length ? c.roles : ['fs'],
            c.pay || '', c.desc || c.description || '', c.apply || '', !!c.dsa,
          ],
        );
      }

      const ids = Object.keys(tracked);
      let connCount = 0;

      for (const companyId of ids) {
        const t = tracked[companyId] || {};

        // Skip ids that never made it into the companies table.
        const exists = await client.query('SELECT 1 FROM companies WHERE id = $1', [companyId]);
        if (!exists.rowCount) continue;

        await client.query(
          `INSERT INTO tracked_companies (company_id, stage, win_status, msgs, jd, job_link, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (company_id) DO UPDATE SET
             stage = EXCLUDED.stage, win_status = EXCLUDED.win_status, msgs = EXCLUDED.msgs,
             jd = EXCLUDED.jd, job_link = EXCLUDED.job_link, notes = EXCLUDED.notes,
             updated_at = now()`,
          [
            companyId, t.stage || 'new', t.win || 'none', t.msgs || '',
            t.jd || '', t.jobLink || '', t.notes || '',
          ],
        );

        // Connections are a full replace — the prototype owns the array.
        await client.query('DELETE FROM connections WHERE company_id = $1', [companyId]);
        const conns = Array.isArray(t.connections) ? t.connections : [];
        for (const [i, cn] of conns.entries()) {
          if (!cn?.name && !cn?.li) continue;
          await client.query(
            `INSERT INTO connections (company_id, position, name, role, type, linkedin_url, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              companyId, i, cn.name || '', cn.role || '', cn.type || 'peer',
              cn.li || cn.linkedinUrl || '', cn.status || 'req', cn.notes || '',
            ],
          );
          connCount += 1;
        }
      }

      // Do not blindly purge untracked companies during state sync to protect
      // against multi-device sync overwrites. Explicit removals use DELETE /api/tracked/:id.

      return { tracked: ids.length, connections: connCount, custom: custom.length };
    });

    return { saved: counts };
  });

  // Arbitrary UI keys (daily checklist state and friends).
  app.get('/ui/:key', async (request) => {
    const row = await one('SELECT value FROM ui_state WHERE key = $1', [request.params.key]);
    return { key: request.params.key, value: row?.value ?? null };
  });

  app.put('/ui/:key', async (request) => {
    const row = await one(
      `INSERT INTO ui_state (key, value) VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()
       RETURNING key, value`,
      [request.params.key, JSON.stringify(request.body?.value ?? request.body ?? {})],
    );
    return row;
  });
}
