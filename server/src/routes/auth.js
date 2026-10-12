import crypto from 'node:crypto';
import { config } from '../config.js';

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

export default async function authRoutes(app) {
  app.post('/login', async (request, reply) => {
    const { email = '', password = '' } = request.body || {};

    const emailOk = safeEqual(String(email).trim().toLowerCase(), config.auth.email);
    const passOk = safeEqual(password, config.auth.password);

    if (!emailOk || !passOk) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    const token = app.jwt.sign({ sub: config.auth.userId, email: config.auth.email });
    return { token, user: { id: config.auth.userId, email: config.auth.email } };
  });

  app.get('/me', { onRequest: [app.auth] }, async (request) => ({
    user: { id: request.user.sub, email: request.user.email },
  }));
}
