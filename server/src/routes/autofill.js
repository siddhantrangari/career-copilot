import { checkAutofillKey, autofillPayload } from '../services/guided-apply.js';

/**
 * For the Career Copilot browser extension. It authenticates with its own
 * read-only key (x-autofill-key), not his login: it can read the prepared
 * answers and the Studio PDF for the application page he is on — nothing
 * else, and it can change nothing.
 */
export default async function autofillRoutes(app) {
  app.addHook('onRequest', async (request, reply) => {
    if (!(await checkAutofillKey(request.headers['x-autofill-key']))) {
      return reply.code(401).send({ error: 'Autofill key missing or retired — create a new one in Career Copilot (Apply queue → Guided apply → Autofill setup).' });
    }
  });

  app.get('/pack', async (request) => autofillPayload(String(request.query?.url || '')));
  app.get('/ping', async () => ({ ok: true }));
}
