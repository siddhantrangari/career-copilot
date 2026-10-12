import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { AwsClient } from 'aws4fetch';
import { one, query } from '../db/pool.js';
import { config } from '../config.js';
import { AiError } from './ai.js';

/**
 * Interview recordings: camera + mic, captured in the browser.
 *
 * Flow — VPS first, R2 second, as asked:
 *   1. The browser records in short chunks and POSTs each one as it is
 *      produced. Chunking keeps every request small (well under nginx's body
 *      limit) and means a crashed tab loses seconds, not the whole session.
 *   2. Chunks are appended to a single .webm on the VPS, so the file is
 *      playable locally the moment the interview ends.
 *   3. A background task uploads it to Cloudflare R2 and deletes the local
 *      copy. Playback redirects to a short-lived signed R2 URL.
 *
 * If R2 is not configured, or the upload fails, the file simply stays on the
 * VPS and remains playable — the recording is never lost to a transfer error.
 */

const RECORDING_DIR = path.join(config.rootDir, 'server/data/recordings');

export const recordingPath = (sessionId) => path.join(RECORDING_DIR, `${sessionId}.webm`);

export async function ensureDir() {
  await fsp.mkdir(RECORDING_DIR, { recursive: true });
}

/** Append one chunk from the browser's MediaRecorder. */
export async function appendChunk(sessionId, buffer, mime) {
  if (!buffer?.length) return null;
  await ensureDir();

  const file = recordingPath(sessionId);
  await fsp.appendFile(file, buffer);
  const { size } = await fsp.stat(file);

  await query(
    `UPDATE interview_sessions
     SET recording_status = CASE WHEN recording_status IN ('none','recording') THEN 'recording' ELSE recording_status END,
         recording_bytes  = $2,
         recording_mime   = COALESCE(recording_mime, $3)
     WHERE id = $1`,
    [sessionId, size, mime || 'video/webm'],
  );

  return { bytes: size };
}

/** Called when the browser stops recording. */
export async function finaliseRecording(sessionId) {
  const file = recordingPath(sessionId);
  let size = 0;
  try {
    ({ size } = await fsp.stat(file));
  } catch {
    await query(
      `UPDATE interview_sessions SET recording_status = 'none' WHERE id = $1`,
      [sessionId],
    );
    return { stored: false, bytes: 0 };
  }

  await query(
    `UPDATE interview_sessions SET recording_status = 'local', recording_bytes = $2 WHERE id = $1`,
    [sessionId, size],
  );
  return { stored: true, bytes: size };
}

// ── Cloudflare R2 ─────────────────────────────────────────────────────

function r2Client() {
  const { accountId, accessKeyId, secretAccessKey, bucket } = config.r2;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    client: new AwsClient({ accessKeyId, secretAccessKey, service: 's3', region: 'auto' }),
    endpoint: `https://${accountId}.r2.cloudflarestorage.com/${bucket}`,
    bucket,
  };
}

export const r2Configured = () => Boolean(r2Client());

const objectKey = (sessionId) => `${config.r2.prefix.replace(/^\/+|\/+$/g, '')}/${sessionId}.webm`;

/**
 * Move a finished local recording to R2, then delete it from the VPS.
 * Runs as a background task so it never blocks the report.
 */
export async function uploadToR2(sessionId) {
  const r2 = r2Client();
  if (!r2) return { uploaded: false, reason: 'R2 is not configured — recording stays on the VPS' };

  const session = await one(
    'SELECT id, recording_status, recording_mime FROM interview_sessions WHERE id = $1',
    [sessionId],
  );
  if (!session) throw new AiError('Interview session not found', 404);
  if (session.recording_status === 'stored') return { uploaded: true, alreadyStored: true };

  const file = recordingPath(sessionId);
  let stat;
  try {
    stat = await fsp.stat(file);
  } catch {
    return { uploaded: false, reason: 'No local recording to upload' };
  }

  const key = objectKey(sessionId);
  await query(`UPDATE interview_sessions SET recording_status = 'uploading' WHERE id = $1`, [sessionId]);

  try {
    // Streamed straight from disk so a large file is never held in memory.
    const res = await r2.client.fetch(`${r2.endpoint}/${key}`, {
      method: 'PUT',
      body: fs.createReadStream(file),
      duplex: 'half',
      headers: {
        'Content-Type': session.recording_mime || 'video/webm',
        'Content-Length': String(stat.size),
      },
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`R2 returned ${res.status}: ${detail.slice(0, 200)}`);
    }

    await query(
      `UPDATE interview_sessions
       SET recording_status = 'stored', recording_key = $2, recording_error = NULL
       WHERE id = $1`,
      [sessionId, key],
    );

    // Only remove the local copy once R2 has confirmed the write.
    await fsp.unlink(file).catch(() => {});

    return { uploaded: true, key, bytes: stat.size };
  } catch (err) {
    // Keep status 'local' — the file is still on the VPS and still playable.
    await query(
      `UPDATE interview_sessions SET recording_status = 'local', recording_error = $2 WHERE id = $1`,
      [sessionId, err.message],
    );
    return { uploaded: false, reason: err.message };
  }
}

/** Short-lived signed URL so the browser can stream from R2 directly. */
export async function signedUrl(key, expiresSeconds = 3600) {
  const r2 = r2Client();
  if (!r2) return null;
  const url = new URL(`${r2.endpoint}/${key}`);
  url.searchParams.set('X-Amz-Expires', String(expiresSeconds));
  const signed = await r2.client.sign(new Request(url, { method: 'GET' }), {
    aws: { signQuery: true },
  });
  return signed.url;
}

/** Delete a recording from wherever it lives. */
export async function deleteRecording(sessionId) {
  const session = await one(
    'SELECT recording_key FROM interview_sessions WHERE id = $1',
    [sessionId],
  );

  await fsp.unlink(recordingPath(sessionId)).catch(() => {});

  const r2 = r2Client();
  if (r2 && session?.recording_key) {
    await r2.client.fetch(`${r2.endpoint}/${session.recording_key}`, { method: 'DELETE' }).catch(() => {});
  }

  await query(
    `UPDATE interview_sessions
     SET recording_status = 'none', recording_key = NULL, recording_bytes = 0
     WHERE id = $1`,
    [sessionId],
  );
  return { deleted: true };
}
