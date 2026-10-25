import { many } from '../db/pool.js';
import { outreachPlan, listTargets, loadNavigator, logActivity, ACTIVITY_KINDS } from '../services/targets.js';
import { buildToday } from '../services/today.js';

export default async function targetRoutes(app) {
  app.addHook('onRequest', app.auth);

  /** This week's progress, top targets with next actions, suggested companies. */
  app.get('/plan', async (request) => outreachPlan({ limit: Math.min(Number(request.query?.limit) || 20, 40) }));

  app.get('/', async (request) => ({
    targets: await listTargets({
      tag: ['apply', 'outreach'].includes(request.query?.tag) ? request.query.tag : null,
      priorityOnly: request.query?.priority === 'true',
      limit: Number(request.query?.limit) || 40,
    }),
  }));

  app.get('/navigator', async () => ({ navigator: await loadNavigator() }));

  /** The Today board: daily targets with live counts, this week, and today's actions. */
  app.get('/today', async () => buildToday());

  /** Log an outreach action, e.g. { company, kind: 'connection_request', count: 5 }. */
  app.post('/activity', async (request, reply) => {
    const b = request.body || {};
    if (!ACTIVITY_KINDS.includes(b.kind)) return reply.code(400).send({ error: `kind must be one of ${ACTIVITY_KINDS.join(', ')}` });
    const company = b.companyId
      ? (await many('SELECT id, name FROM companies WHERE id = $1', [b.companyId]))[0]
      : null;
    // An action marked done from the Today board carries its key in the note.
    const note = b.actionKey ? `action:${String(b.actionKey).slice(0, 300)}` : b.note;
    return { logged: await logActivity({ companyId: company?.id || null, companyName: company?.name || b.company || '', kind: b.kind, count: b.count, note }) };
  });
}
