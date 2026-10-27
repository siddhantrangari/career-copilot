import { labProgress, setLabStep, saveLabNote } from '../services/fde-lab.js';

export default async function fdeLabRoutes(app) {
  app.addHook('onRequest', app.auth);

  const handle = (fn) => async (request, reply) => {
    try {
      return await fn(request.body || {});
    } catch (err) {
      if (err.statusCode === 400) return reply.code(400).send({ error: err.message });
      throw err;
    }
  };

  /** Steps ticked and notes saved, per day. */
  app.get('/', async () => labProgress());
  /** Tick or untick a step: { day, step, done }. */
  app.post('/step', handle(setLabStep));
  /** Save notes or a link for a day: { day, kind: notes|video|post|repo, value }. */
  app.post('/note', handle(saveLabNote));
}
