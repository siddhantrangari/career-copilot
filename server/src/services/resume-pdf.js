import crypto from 'node:crypto';
import { one, many, query } from '../db/pool.js';
import { config } from '../config.js';
import { tgDocument } from './telegram.js';

/**
 * Resume PDFs come from the Resume Studio, exactly as it exports them —
 * the server never draws its own. The Studio renders each resume from its
 * markdown, so the sha256 of that markdown identifies which saved version a
 * PDF belongs to. When the bot is asked for a PDF the Studio hasn't made
 * yet, it sends a one-tap link that opens the Studio and exports it; the
 * upload then goes straight to the chat.
 */

export const contentHash = (markdown) => crypto.createHash('sha256').update(String(markdown ?? ''), 'utf8').digest('hex');

const studioLink = (versionId) => `${config.digest.appUrl}/outreach.html?tab=resume&pdf=${encodeURIComponent(versionId || 'master')}`;

export async function latestPdf({ hash = null, kind = null } = {}) {
  if (hash) return one(`SELECT id, filename, pdf, size, created_at FROM resume_pdfs WHERE content_hash = $1 ORDER BY created_at DESC LIMIT 1`, [hash]);
  if (kind) return one(`SELECT id, filename, pdf, size, created_at FROM resume_pdfs WHERE kind = $1 ORDER BY created_at DESC LIMIT 1`, [kind]);
  return null;
}

/** The Studio PDF for one saved version, or the master ('master'). */
export async function pdfForVersion(versionId) {
  if (!versionId || versionId === 'master') {
    return { pdf: await latestPdf({ kind: 'master' }), hash: null, kind: 'master', label: 'Master resume', link: studioLink('master') };
  }
  const v = await one(`SELECT id, company_name, job_title, tailored_text FROM resume_versions WHERE id = $1`, [versionId]);
  if (!v) return null;
  const hash = contentHash(v.tailored_text);
  return {
    pdf: await latestPdf({ hash }), hash, kind: 'tailored',
    label: `Resume — ${v.company_name} ${v.job_title}`.trim(), link: studioLink(v.id),
    filename: `Resume_${(v.company_name || 'Tailored').replace(/[^a-zA-Z0-9_-]/g, '_')}_${(v.job_title || 'Resume').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
  };
}

/** Saved upload from the Studio; delivers any PDF the bot is waiting on. */
export async function savePdf({ buffer, hash, kind = 'tailored', filename = 'resume.pdf' }) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1000 || buffer.subarray(0, 5).toString() !== '%PDF-') {
    throw Object.assign(new Error('Not a PDF'), { statusCode: 400 });
  }
  if (!/^[a-f0-9]{64}$/.test(String(hash || ''))) throw Object.assign(new Error('content hash required'), { statusCode: 400 });
  const k = ['tailored', 'master', 'draft'].includes(kind) ? kind : 'tailored';
  const name = String(filename || 'resume.pdf').replace(/[^\w.\- ]/g, '_').slice(0, 120);
  const row = await one(
    `INSERT INTO resume_pdfs (content_hash, kind, filename, pdf, size) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
    [hash, k, name, buffer, buffer.length],
  );
  const waiting = await many(
    `SELECT id, chat_id, label FROM resume_pdf_requests
     WHERE fulfilled_at IS NULL AND created_at > now() - interval '3 days'
       AND (content_hash = $1 OR ($2 = 'master' AND kind = 'master'))`,
    [hash, k],
  );
  let delivered = 0;
  for (const w of waiting) {
    try {
      await tgDocument(w.chat_id, { filename: name, content: buffer, mime: 'application/pdf', caption: `📄 ${w.label || 'Your resume'} — from the Resume Studio` });
      await query(`UPDATE resume_pdf_requests SET fulfilled_at = now() WHERE id = $1`, [w.id]);
      delivered += 1;
    } catch { /* stays open; the next export retries */ }
  }
  return { id: row.id, size: buffer.length, delivered };
}

/** The bot asked for a PDF the Studio hasn't exported: remember, return the link. */
export async function requestPdf({ versionId, chatId }) {
  const r = await pdfForVersion(versionId);
  if (!r) return null;
  await query(`INSERT INTO resume_pdf_requests (content_hash, kind, chat_id, label) VALUES ($1, $2, $3, $4)`, [r.hash, r.kind, String(chatId), r.label]);
  return r;
}
