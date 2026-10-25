import { contentHash, pdfForVersion, savePdf } from '../services/resume-pdf.js';

/** Resume Studio PDFs: the Studio uploads what it exports; anything here can download it. */
export default async function resumePdfRoutes(app) {
  app.addHook('onRequest', app.auth);
  app.addContentTypeParser('application/pdf', { parseAs: 'buffer', bodyLimit: 15 * 1024 * 1024 }, (req, body, done) => done(null, body));

  // Body: the PDF bytes. Headers: x-content-hash (sha256 of the markdown it
  // was rendered from), x-resume-kind, x-filename.
  app.post('/', { bodyLimit: 15 * 1024 * 1024 }, async (request) => savePdf({
    buffer: request.body,
    hash: String(request.headers['x-content-hash'] || ''),
    kind: String(request.headers['x-resume-kind'] || 'tailored'),
    filename: decodeURIComponent(String(request.headers['x-filename'] || 'resume.pdf')),
  }));

  /** Is there a Studio PDF for this version ('master' for the master)? */
  app.get('/status/:versionId', async (request, reply) => {
    const r = await pdfForVersion(request.params.versionId);
    if (!r) return reply.code(404).send({ error: 'Resume not found' });
    return { ready: Boolean(r.pdf), createdAt: r.pdf?.created_at || null, size: r.pdf?.size || 0, studioLink: r.link };
  });

  app.get('/file/:versionId', async (request, reply) => {
    const r = await pdfForVersion(request.params.versionId);
    if (!r?.pdf) return reply.code(404).send({ error: 'No Studio PDF yet — export it once from the Resume Studio', studioLink: r?.link || null });
    return reply.header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${r.pdf.filename}"`)
      .send(r.pdf.pdf);
  });

  /** sha256 of a markdown body, as the Studio computes it (for checks). */
  app.post('/hash', async (request) => ({ hash: contentHash(request.body?.markdown || '') }));
}
