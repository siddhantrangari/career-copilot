import { many, one, pool, withTransaction } from '../db/pool.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    let roles = [];
    let cleanNotes = r.notes || '';
    if (cleanNotes.includes('<!--CC_ROLES:')) {
      try {
        const m = cleanNotes.match(/<!--CC_ROLES:([\s\S]*?)-->/);
        if (m) {
          roles = JSON.parse(m[1]);
          cleanNotes = cleanNotes.replace(/<!--CC_ROLES:[\s\S]*?-->/g, '').trim();
        }
      } catch (e) {}
    }

    blob[r.company_id] = {
      stage: r.stage,
      win: r.win_status,
      msgs: r.msgs,
      jd: r.jd,
      jobLink: r.job_link,
      notes: cleanNotes,
      roles: Array.isArray(roles) ? roles : [],
      connections: byCompany.get(r.company_id) || [],
      updated: new Date(r.updated_at).toLocaleDateString(),
    };
  }
  return blob;
};

/**
 * Content fingerprint of everything the prototype keeps in localStorage.
 * The page holds that data in memory and saves all of it back, so a tab left
 * open while the Telegram assistant edits the pipeline would overwrite those
 * edits. The bridge compares this on returning to the tab and reloads when
 * something changed elsewhere.
 */
async function stateVersion() {
  const { rows } = await pool.query(`
    SELECT md5(
      COALESCE((SELECT string_agg(concat_ws('|', company_id, stage, win_status, msgs, jd, job_link, notes), '¦' ORDER BY company_id)
                FROM tracked_companies), '') || '#' ||
      COALESCE((SELECT string_agg(concat_ws('|', id, company_id, name, role, type, linkedin_url, status, notes), '¦' ORDER BY id)
                FROM connections), '') || '#' ||
      COALESCE((SELECT string_agg(concat_ws('|', id, name, region, apply_url), '¦' ORDER BY id)
                FROM companies WHERE custom), '')
    ) AS v`);
  return rows[0].v;
}

export default async function stateRoutes(app) {
  app.addHook('onRequest', app.auth);

  app.get('/version', async () => ({ version: await stateVersion() }));

  // GET /api/state — the whole prototype state in one round trip
  app.get('/', async () => {
    const tracked = await many('SELECT * FROM tracked_companies');
    const connections = await many('SELECT * FROM connections ORDER BY company_id, position, created_at');
    const custom = await many(
      // Qualified on purpose: company_why and company_targets both have their
      // own name column, and an unqualified `name` inside a subquery binds to
      // it, matching every row.
      `SELECT c.id, c.name, c.region, c.roles, c.pay, c.description AS desc, c.apply_url AS apply, c.dsa, c.custom,
              (SELECT w.why FROM company_why w WHERE w.key = lower(trim(c.name))) AS why,
              (SELECT json_build_object('tag', ct.tag, 'priority', ct.priority, 'rank', ct.rank, 'whyNow', ct.why_now, 'hiring', ct.hiring_score, 'fit', ct.company_fit) FROM company_targets ct WHERE ct.key = lower(trim(c.name))) AS target
       FROM companies c WHERE c.custom = true ORDER BY c.created_at`,
    );
    const ui = await many('SELECT key, value FROM ui_state');

    return {
      version: await stateVersion(),
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

      const trackedIds = Object.keys(tracked);
      let connCount = 0;
      const connectionIds = {};

      for (const companyId of trackedIds) {
        const t = tracked[companyId] || {};

        // Skip ids that never made it into the companies table.
        const exists = await client.query('SELECT 1 FROM companies WHERE id = $1', [companyId]);
        if (!exists.rowCount) continue;

        let notesToSave = t.notes || '';
        if (Array.isArray(t.roles) && t.roles.length) {
          notesToSave = notesToSave.replace(/<!--CC_ROLES:[\s\S]*?-->/g, '').trim();
          notesToSave += (notesToSave ? '\n\n' : '') + `<!--CC_ROLES:${JSON.stringify(t.roles)}-->`;
        }

        await client.query(
          `INSERT INTO tracked_companies (company_id, stage, win_status, msgs, jd, job_link, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (company_id) DO UPDATE SET
             stage = EXCLUDED.stage, win_status = EXCLUDED.win_status, msgs = EXCLUDED.msgs,
             jd = EXCLUDED.jd, job_link = EXCLUDED.job_link, notes = EXCLUDED.notes,
             updated_at = now()`,
          [
            companyId, t.stage || 'new', t.win || 'none', t.msgs || '',
            t.jd || '', t.jobLink || '', notesToSave,
          ],
        );

        // Connections are upserted, never deleted. This used to delete the
        // company's whole list and re-insert the array, so a device holding a
        // stale copy erased contacts added elsewhere. A contact missing from
        // the array is now left alone; removal is a deliberate single-record
        // call (DELETE /api/tracked/:id/connections/:connId).
        //
        // Matching order: the row id the client got from GET /api/state, then
        // the LinkedIn URL, then the name when there is no URL. `used` stops
        // two entries in one payload collapsing into the same row.
        const conns = Array.isArray(t.connections) ? t.connections : [];
        const used = [];
        const ids = [];
        for (const [i, cn] of conns.entries()) {
          if (!cn?.name && !cn?.li) { ids.push(null); continue; }
          const li = (cn.li || cn.linkedinUrl || '').trim();
          const name = (cn.name || '').trim();

          let rowId = null;
          if (UUID.test(cn.id || '')) {
            const hit = await client.query(
              'SELECT id FROM connections WHERE id = $1 AND company_id = $2',
              [cn.id, companyId],
            );
            rowId = hit.rows[0]?.id || null;
          }
          if (!rowId) {
            const hit = await client.query(
              `SELECT id FROM connections
               WHERE company_id = $1 AND NOT (id = ANY($4::uuid[]))
                 AND CASE WHEN $2 <> '' THEN linkedin_url = $2
                          ELSE linkedin_url = '' AND lower(name) = lower($3) END
               ORDER BY created_at LIMIT 1`,
              [companyId, li, name, used],
            );
            rowId = hit.rows[0]?.id || null;
          }

          const values = [
            companyId, i, name, cn.role || '', cn.type || 'peer',
            li, cn.status || 'req', cn.notes || '',
          ];
          const res = rowId
            ? await client.query(
              `UPDATE connections SET position = $2, name = $3, role = $4, type = $5,
                 linkedin_url = $6, status = $7, notes = $8, updated_at = now()
               WHERE id = $9 AND company_id = $1 RETURNING id`,
              [...values, rowId],
            )
            : await client.query(
              `INSERT INTO connections (company_id, position, name, role, type, linkedin_url, status, notes)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
              values,
            );
          used.push(res.rows[0].id);
          ids.push(res.rows[0].id);
          connCount += 1;
        }
        // Handed back so the client can stamp new contacts with their row id.
        connectionIds[companyId] = ids;
      }

      // Do not blindly purge untracked companies during state sync to protect
      // against multi-device sync overwrites. Explicit removals use DELETE /api/tracked/:id.

      return {
        tracked: trackedIds.length, connections: connCount, custom: custom.length, connectionIds,
      };
    });

    const { connectionIds, ...saved } = counts;
    return { saved, connectionIds, version: await stateVersion() };
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
