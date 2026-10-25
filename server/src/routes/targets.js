import { many } from '../db/pool.js';
import { outreachPlan, listTargets, loadNavigator, logActivity, ACTIVITY_KINDS } from '../services/targets.js';
import { buildToday } from '../services/today.js';
import { companyDetail, addToList, draftOutreach } from '../services/company-detail.js';
import { buildWeeklyReview, sendWeeklyReview } from '../services/weekly-review.js';

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

  // One company, by target key, catalogue id or name. Stored data only; the
  // web side comes as Google searches he opens, so no search API is spent.
  const ref = (o = {}) => ({ key: o.key || null, id: o.id || o.companyId || null, name: o.name || o.company || null });

  app.get('/company', async (request, reply) => {
    const d = await companyDetail(ref(request.query));
    return d || reply.code(404).send({ error: 'Company not found' });
  });

  /** Add to his Companies list; stage "interested" also puts it in the pipeline. */
  app.post('/company/add', async (request, reply) => {
    const b = request.body || {};
    const r = await addToList(ref(b), { stage: b.stage === 'interested' ? 'interested' : 'new' });
    return r || reply.code(404).send({ error: 'Company not found' });
  });

  /** Connection note, first DM, peer DM and follow-up for one person (one model call). */
  app.post('/company/draft', async (request, reply) => {
    const b = request.body || {};
    const c = b.contact || {};
    const r = await draftOutreach(ref(b), { name: String(c.name || '').slice(0, 120), role: String(c.role || '').slice(0, 160), type: ['hm', 'peer', 'hr', 'indian', 'other'].includes(c.type) ? c.type : 'peer' });
    return r || reply.code(404).send({ error: 'Company not found' });
  });

  /** The Sunday review: preview it, or send it to Telegram now. */
  app.get('/weekly-review', async () => buildWeeklyReview());
  app.post('/weekly-review/send', async () => sendWeeklyReview({ trigger: 'manual' }));

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
