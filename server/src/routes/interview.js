import {
  startInterview,
  interviewTurn,
  finishInterview,
  getSession,
  listSessions,
  sessionCost,
  ROUNDS,
} from '../services/interview.js';
import { listPreps, getPrep, deepDivePrep } from '../services/interview-prep.js';
import { speak, ttsStatus } from '../services/tts.js';
import { createJob, getJob } from '../services/jobs.js';
import {
  appendChunk, finaliseRecording, recordingPath, signedUrl,
  deleteRecording, r2Configured,
} from '../services/recording.js';
import { one } from '../db/pool.js';
import fs from 'node:fs';
import fsp from 'node:fs/promises';

export default async function interviewRoutes(app) {
  app.addHook('onRequest', app.auth);

  app.get('/rounds', async () => ({
    rounds: ROUNDS,
    tts: ttsStatus(),
    recording: { enabled: true, r2: r2Configured() },
  }));

  // ── Recording ────────────────────────────────────────────────────────
  // MediaRecorder chunks arrive as raw bytes. A custom parser keeps them out
  // of the JSON body parser and avoids base64 inflating every upload by a third.
  app.addContentTypeParser(
    ['video/webm', 'audio/webm', 'application/octet-stream'],
    { parseAs: 'buffer' },
    (req, body, done) => done(null, body),
  );

  app.post('/:id/recording/chunk', async (request, reply) => {
    const buf = request.body;
    if (!Buffer.isBuffer(buf) || !buf.length) {
      return reply.code(400).send({ error: 'Expected raw media bytes' });
    }
    return appendChunk(request.params.id, buf, request.headers['content-type']);
  });

  app.post('/:id/recording/finish', async (request, reply) => {
    const result = await finaliseRecording(request.params.id);
    // Move it to R2 in the background; it stays playable from the VPS meanwhile.
    if (result.stored && r2Configured()) {
      await createJob('recording-upload', { sessionId: request.params.id });
    }
    return reply.send({ ...result, movingToR2: result.stored && r2Configured() });
  });

  /**
   * Play the recording. Served from the VPS while it is still local, or via a
   * short-lived signed R2 URL once it has been moved.
   */
  app.get('/:id/recording', async (request, reply) => {
    const session = await one(
      'SELECT recording_status, recording_key, recording_mime FROM interview_sessions WHERE id = $1',
      [request.params.id],
    );
    if (!session || session.recording_status === 'none') {
      return reply.code(404).send({ error: 'No recording for this interview' });
    }

    if (session.recording_status === 'stored' && session.recording_key) {
      const url = await signedUrl(session.recording_key);
      if (url) return reply.redirect(url, 302);
    }

    const file = recordingPath(request.params.id);
    try {
      const stat = await fsp.stat(file);
      reply.header('Content-Type', session.recording_mime || 'video/webm');
      reply.header('Content-Length', stat.size);
      reply.header('Accept-Ranges', 'none');
      return reply.send(fs.createReadStream(file));
    } catch {
      return reply.code(404).send({ error: 'Recording file is not available' });
    }
  });

  app.delete('/:id/recording', async (request) => deleteRecording(request.params.id));

  /**
   * Planning reads the JD, WIN doc and research and takes ~30-60s, so it is
   * queued like the other heavy work rather than held open through Cloudflare.
   */
  app.post('/start', async (request, reply) => {
    const job = await createJob('interview-start', request.body || {});
    return reply.code(202).send({ job });
  });

  /**
   * Prep guide — reads the JD, resume and WIN doc, runs two live searches on
   * how this company actually interviews for this role, and produces a study
   * guide (not a live mock). Same job/polling shape as /start so the client
   * can reuse its progress UI.
   */
  app.post('/prep', async (request, reply) => {
    const job = await createJob('interview-prep', request.body || {});
    return reply.code(202).send({ job });
  });

  /** Past prep guides, newest first — powers the setup page's history list. */
  app.get('/preps', async (request) => {
    const limit = Math.min(parseInt(request.query?.limit ?? '25', 10) || 25, 100);
    return { preps: await listPreps(limit) };
  });

  app.get('/preps/:id', async (request, reply) => {
    const row = await getPrep(request.params.id);
    if (!row) return reply.code(404).send({ error: 'Prep guide not found' });
    return { prep: row };
  });

  /**
   * On-demand technical revision on a single question or topic. Runs inline
   * (no job) — a single deep dive is small enough to complete inside the
   * Cloudflare proxy window, so the UI can `POST → await → render`.
   */
  app.post('/preps/deep-dive', async (request, reply) => {
    try {
      return await deepDivePrep(request.body || {});
    } catch (err) {
      const code = err.statusCode || 500;
      return reply.code(code).send({ error: err.message || 'Deep dive failed' });
    }
  });

  app.get('/start/:jobId', async (request, reply) => {
    const job = await getJob(request.params.jobId);
    if (!job) return reply.code(404).send({ error: 'Job not found' });
    return { job };
  });

  /** Live turn — must stay fast, so it runs inline on the small model. */
  app.post('/:id/turn', async (request) => interviewTurn(request.params.id, request.body || {}));

  app.post('/:id/finish', async (request, reply) => {
    const job = await createJob('interview-report', { sessionId: request.params.id });
    return reply.code(202).send({ job });
  });

  /** Re-assess an interview against the current report format. */
  app.post('/:id/reassess', async (request, reply) => {
    const job = await createJob('interview-report', {
      sessionId: request.params.id,
      regenerate: true,
    });
    return reply.code(202).send({ job });
  });

  app.get('/:id', async (request, reply) => {
    const data = await getSession(request.params.id);
    if (!data) return reply.code(404).send({ error: 'Interview session not found' });
    return { ...data, cost: await sessionCost(request.params.id) };
  });

  /** Live spend for the cost meter. */
  app.get('/:id/cost', async (request) => sessionCost(request.params.id));

  app.get('/', async (request) => {
    const limit = Math.min(parseInt(request.query?.limit ?? '25', 10) || 25, 100);
    return { sessions: await listSessions(limit) };
  });

  /**
   * Speak a line. Returns 204 when no server-side voice is available, which
   * tells the browser to use its own free speech synthesis instead of
   * failing — the interview keeps going either way.
   */
  app.post('/speak', async (request, reply) => {
    const { text, voiceId, model } = request.body || {};
    // 'browser' means the client asked for the free voice — do no paid work.
    if (!model || model === 'browser') return reply.code(204).send();
    const result = await speak(text, { voiceId, model });
    if (!result) return reply.code(204).send();

    reply.header('Content-Type', result.contentType);
    reply.header('X-TTS-Provider', result.provider);
    reply.header('Cache-Control', 'no-store');
    return reply.send(result.audio);
  });
}
