import { many, one } from '../db/pool.js';

/** Achievements (CAR bank), profile, and the raw message log. */
export default async function libraryRoutes(app) {
  app.addHook('onRequest', app.auth);

  app.get('/achievements', async (request) => {
    const { tag, skill } = request.query || {};
    if (tag) {
      return {
        achievements: await many(
          'SELECT * FROM achievements WHERE $1 = ANY (used_for) ORDER BY id',
          [tag],
        ),
      };
    }
    if (skill) {
      return {
        achievements: await many(
          'SELECT * FROM achievements WHERE $1 = ANY (skills) ORDER BY id',
          [skill],
        ),
      };
    }
    return { achievements: await many('SELECT * FROM achievements ORDER BY id') };
  });

  app.post('/achievements', async (request, reply) => {
    const b = request.body || {};
    if (!b.id || !b.title) return reply.code(400).send({ error: 'id and title are required' });

    const row = await one(
      `INSERT INTO achievements (id, title, company, period, challenge, action, result, metrics, skills, used_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, company = EXCLUDED.company, period = EXCLUDED.period,
         challenge = EXCLUDED.challenge, action = EXCLUDED.action, result = EXCLUDED.result,
         metrics = EXCLUDED.metrics, skills = EXCLUDED.skills, used_for = EXCLUDED.used_for
       RETURNING *`,
      [
        b.id, b.title, b.company || '', b.period || '',
        b.challenge || '', b.action || '', b.result || '',
        b.metrics || [], b.skills || [], b.usedFor || b.used_for || [],
      ],
    );
    return reply.code(201).send({ achievement: row });
  });

  app.delete('/achievements/:id', async (request) => {
    await one('DELETE FROM achievements WHERE id = $1 RETURNING id', [request.params.id]);
    return { deleted: request.params.id };
  });

  app.get('/profile', async () => ({
    profile: await one('SELECT * FROM profile WHERE id = $1', ['siddhant']),
  }));

  app.patch('/profile', async (request, reply) => {
    const b = request.body || {};
    const cols = {
      full_name: b.full_name ?? b.fullName,
      headline: b.headline,
      email: b.email,
      linkedin: b.linkedin,
      website: b.website,
      location: b.location,
      summary: b.summary,
      master_resume: b.master_resume ?? b.masterResume,
      target_roles: b.target_roles ?? b.targetRoles,
      skills: b.skills ? JSON.stringify(b.skills) : undefined,
    };

    const sets = [];
    const params = [];
    for (const [col, val] of Object.entries(cols)) {
      if (val === undefined) continue;
      params.push(val);
      sets.push(`${col} = $${params.length}`);
    }
    if (!sets.length) return reply.code(400).send({ error: 'No updatable fields supplied' });

    const row = await one(
      `UPDATE profile SET ${sets.join(', ')}, updated_at = now() WHERE id = 'siddhant' RETURNING *`,
      params,
    );
    return { profile: row };
  });

  app.get('/messages', async (request) => {
    const { companyId } = request.query || {};
    return {
      messages: companyId
        ? await many(
            'SELECT * FROM messages WHERE company_id = $1 ORDER BY created_at DESC',
            [companyId],
          )
        : await many('SELECT * FROM messages ORDER BY created_at DESC LIMIT 200'),
    };
  });

  app.post('/messages/:id/sent', async (request, reply) => {
    const row = await one(
      'UPDATE messages SET sent_at = now() WHERE id = $1 RETURNING *',
      [request.params.id],
    );
    if (!row) return reply.code(404).send({ error: 'Message not found' });
    return { message: row };
  });
}
