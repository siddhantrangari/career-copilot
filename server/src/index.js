import path from 'node:path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import fastifyStatic from '@fastify/static';

import { config } from './config.js';
import { pool } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { providerStatus } from './services/providers.js';
import { failStaleJobs } from './services/jobs.js';
import { startScheduler } from './services/scheduler.js';

import authRoutes from './routes/auth.js';
import companyRoutes from './routes/companies.js';
import trackedRoutes from './routes/tracked.js';
import pipelineRoutes from './routes/pipeline.js';
import aiRoutes from './routes/ai.js';
import libraryRoutes from './routes/library.js';
import jobRoutes from './routes/jobs.js';
import stateRoutes from './routes/state.js';
import interviewRoutes from './routes/interview.js';
import linkedInRoutes from './routes/linkedin.js';
import digestRoutes from './routes/digest.js';

const app = Fastify({
  logger: {
    level: config.isProd ? 'info' : 'debug',
    transport: config.isProd ? undefined : { target: 'pino-pretty' },
  },
  bodyLimit: 10 * 1024 * 1024,
});

await app.register(cors, { origin: true, credentials: true });
await app.register(jwt, { secret: config.auth.jwtSecret, sign: { expiresIn: '30d' } });

// Serve the wired-up prototypes from server/public (built by scripts/build-web.js).
await app.register(fastifyStatic, {
  root: path.join(config.rootDir, 'server/public'),
  prefix: '/',
  // Cache-Control is set here rather than via maxAge, because maxAge wins over
  // setHeaders and would cache the HTML too. Asset URLs carry a content hash so
  // they are safe to cache hard; the HTML referencing them must always be
  // revalidated, or a deploy stays invisible until the browser feels like it.
  cacheControl: false,
  setHeaders(res, filePath) {
    res.setHeader(
      'Cache-Control',
      filePath.endsWith('.html')
        ? 'no-cache, must-revalidate'
        : 'public, max-age=604800, immutable',
    );
  },
});

/** Single-user gate. Public: health + login. Everything else needs the JWT. */
app.decorate('auth', async (request, reply) => {
  try {
    await request.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
});

app.get('/api/health', async () => {
  let db = 'down';
  try {
    await pool.query('SELECT 1');
    db = 'up';
  } catch {
    db = 'down';
  }
  return {
    status: db === 'up' ? 'ok' : 'degraded',
    db,
    providers: providerStatus(),
    env: config.nodeEnv,
    time: new Date().toISOString(),
  };
});

await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(companyRoutes, { prefix: '/api/companies' });
await app.register(trackedRoutes, { prefix: '/api/tracked' });
await app.register(pipelineRoutes, { prefix: '/api' });
await app.register(aiRoutes, { prefix: '/api' });
await app.register(libraryRoutes, { prefix: '/api' });
await app.register(jobRoutes, { prefix: '/api/jobs' });
await app.register(stateRoutes, { prefix: '/api/state' });
await app.register(interviewRoutes, { prefix: '/api/interview' });
await app.register(linkedInRoutes, { prefix: '/api/linkedin' });
await app.register(digestRoutes, { prefix: '/api/digest' });

app.setErrorHandler((err, request, reply) => {
  const status = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  if (status >= 500) request.log.error(err);
  else request.log.warn({ msg: err.message, url: request.url });
  reply.code(status).send({ error: err.message || 'Internal Server Error' });
});

try {
  await migrate();
  app.log.info('[db] schema up to date');
  // Jobs do not survive a restart; mark the orphans so the UI stops polling.
  const stale = await failStaleJobs();
  if (stale) app.log.warn(`[jobs] failed ${stale} job(s) orphaned by restart`);
} catch (err) {
  app.log.error(`[db] startup failed: ${err.message}`);
}

startScheduler(app.log);

await app.listen({ port: config.port, host: config.host });
app.log.info(`Career Copilot API on :${config.port} — providers: ${config.ai.order.join(' > ')}`);
