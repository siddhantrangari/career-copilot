/**
 * One-off: apply the "Bangalore or remote only" India rule to jobs already
 * stored. Discovery skips a role that now scores 0 rather than updating it,
 * so rows saved before the rule keep their old relevance until this runs.
 *
 * Nothing is deleted: matching rows get relevance 0, which drops them from
 * the live feed, the digest and the bot's search. Dry run by default.
 *
 *   node scripts/rescore-india-locations.js            # list what would change
 *   node scripts/rescore-india-locations.js --apply    # take a backup first
 */
import { many, pool } from '../server/src/db/pool.js';
import { outsideIndiaTarget } from '../server/src/services/discovery.js';

const apply = process.argv.includes('--apply');

const rows = await many(
  `SELECT id, title, company_name, location, relevance FROM jobs
   WHERE closed_at IS NULL AND COALESCE(engagement, 'fte') = 'fte' AND relevance > 0`,
);
const hits = rows.filter((r) => outsideIndiaTarget(r.location || ''));

for (const r of hits) console.log(`${r.relevance}\t${r.company_name}\t${r.title}\t${r.location}`);
console.log(`\n${hits.length} open role(s) outside Bangalore/remote in India${apply ? '' : ' (dry run — nothing changed)'}`);

if (apply && hits.length) {
  const res = await pool.query(
    `UPDATE jobs SET relevance = 0, matched_roles = '{}' WHERE id = ANY ($1::uuid[])`,
    [hits.map((r) => r.id)],
  );
  console.log(`updated ${res.rowCount} row(s)`);
}
await pool.end();
