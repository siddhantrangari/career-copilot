import { many, one } from '../db/pool.js';
import {
  networkSearches,
  parseLinkedInId,
  resolveCompanyId,
  setCompanyLinkedIn,
} from '../services/linkedin.js';
import { createJob } from '../services/jobs.js';

export default async function linkedInRoutes(app) {
  app.addHook('onRequest', app.auth);

  /** The four network searches for one company, with correct faceted URLs. */
  app.get('/network/:companyId', async (request, reply) => {
    const company = await one('SELECT * FROM companies WHERE id = $1', [request.params.companyId]);
    if (!company) return reply.code(404).send({ error: 'Company not found' });
    return { company: { id: company.id, name: company.name, region: company.region }, ...networkSearches(company) };
  });

  /** Which companies still have no id — drives the "fix this" prompts. */
  app.get('/status', async () => {
    const rows = await many(
      `SELECT id, name, linkedin_company_id, linkedin_name, linkedin_slug, linkedin_verified
       FROM companies ORDER BY custom, name`,
    );
    return {
      total: rows.length,
      resolved: rows.filter((r) => r.linkedin_company_id).length,
      verified: rows.filter((r) => r.linkedin_verified).length,
      missing: rows.filter((r) => !r.linkedin_company_id).map((r) => ({ id: r.id, name: r.name })),
      unverified: rows
        .filter((r) => r.linkedin_company_id && !r.linkedin_verified)
        .map((r) => ({ id: r.id, name: r.name, resolvedAs: r.linkedin_name, linkedInId: r.linkedin_company_id })),
    };
  });

  /**
   * Set an id by hand. Accepts a bare number, a company URL, a urn, or the
   * whole filtered-search URL copied out of the address bar.
   */
  app.post('/companies/:companyId', async (request, reply) => {
    const parsed = parseLinkedInId(request.body?.value);
    if (!parsed) {
      return reply.code(400).send({
        error:
          'Could not read a LinkedIn id from that. Paste the numeric id, a ' +
          'linkedin.com/company/... URL, or a people-search URL after you have ' +
          'applied the company filter.',
      });
    }

    let { id, slug } = parsed;
    let title;

    // A company URL gives a slug but not the id — resolve that one page.
    if (!id && slug) {
      const hit = await resolveCompanyId(null, slug);
      if (!hit) return reply.code(422).send({ error: `Could not read an organisation id from /company/${slug}` });
      ({ id, title } = hit);
    }

    const row = await setCompanyLinkedIn(request.params.companyId, {
      id, slug, title,
      verified: true, // hand-supplied means confirmed
    });
    if (!row) return reply.code(404).send({ error: 'Company not found' });
    return { company: row, source: parsed.source };
  });

  /** Confirm an auto-resolved match is the right entity. */
  app.post('/companies/:companyId/verify', async (request, reply) => {
    const row = await one(
      `UPDATE companies SET linkedin_verified = true, updated_at = now()
       WHERE id = $1 AND linkedin_company_id IS NOT NULL
       RETURNING id, name, linkedin_company_id, linkedin_name, linkedin_verified`,
      [request.params.companyId],
    );
    if (!row) return reply.code(404).send({ error: 'Company has no LinkedIn id to verify' });
    return { company: row };
  });

  app.delete('/companies/:companyId', async (request) => {
    const row = await one(
      `UPDATE companies
       SET linkedin_company_id = NULL, linkedin_slug = NULL,
           linkedin_name = NULL, linkedin_verified = false, updated_at = now()
       WHERE id = $1 RETURNING id, name`,
      [request.params.companyId],
    );
    return { cleared: row?.id || null };
  });

  /** Bulk resolve — background task, deliberately slow, aborts on throttling. */
  app.post('/resolve-all', async (request, reply) => {
    const job = await createJob('linkedin-resolve', { limit: request.body?.limit ?? 60 });
    return reply.code(202).send({ job });
  });
}
