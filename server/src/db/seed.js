import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from './pool.js';
import { migrate } from './migrate.js';
import { config } from '../config.js';

const DATA_DIR = path.join(config.rootDir, 'server/data');
const readJson = async (p) => JSON.parse(await fs.readFile(p, 'utf8'));

/**
 * Seeding is idempotent: preloaded companies are upserted on their catalogue
 * fields only, so any research already attached to them survives a re-seed.
 */
export async function seed() {
  await migrate();

  const companies = await readJson(path.join(config.rootDir, 'docs/companies.json'));
  for (const c of companies) {
    await pool.query(
      `INSERT INTO companies (id, name, region, roles, pay, description, apply_url, dsa, custom, freelance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         region = EXCLUDED.region,
         roles = EXCLUDED.roles,
         pay = EXCLUDED.pay,
         description = EXCLUDED.description,
         apply_url = EXCLUDED.apply_url,
         dsa = EXCLUDED.dsa,
         freelance = EXCLUDED.freelance,
         updated_at = now()`,
      [
        c.id, c.name, c.region, c.roles || [], c.pay || '', c.desc || '',
        c.apply || '', !!c.dsa, !!c.freelance,
      ],
    );
  }

  // NO automatic deletion in seed: Seeding ONLY upserts catalog records.
  // Deletions are strictly prohibited during seed to prevent any accidental data loss.

  const achievements = await readJson(path.join(DATA_DIR, 'achievements.json'));
  for (const a of achievements) {
    await pool.query(
      `INSERT INTO achievements (id, title, company, period, challenge, action, result, metrics, skills, used_for)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title, company = EXCLUDED.company, period = EXCLUDED.period,
         challenge = EXCLUDED.challenge, action = EXCLUDED.action, result = EXCLUDED.result,
         metrics = EXCLUDED.metrics, skills = EXCLUDED.skills, used_for = EXCLUDED.used_for`,
      [
        a.id, a.title, a.company || '', a.period || '',
        a.challenge || '', a.action || '', a.result || '',
        a.metrics || [], a.skills || [], a.usedFor || [],
      ],
    );
  }

  const p = await readJson(path.join(DATA_DIR, 'profile.json'));
  await pool.query(
    `INSERT INTO profile (id, full_name, headline, email, linkedin, website, location, summary, master_resume, target_roles, skills, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
       full_name = EXCLUDED.full_name, headline = EXCLUDED.headline, email = EXCLUDED.email,
       linkedin = EXCLUDED.linkedin, website = EXCLUDED.website, location = EXCLUDED.location,
       summary = EXCLUDED.summary, master_resume = EXCLUDED.master_resume,
       target_roles = EXCLUDED.target_roles, skills = EXCLUDED.skills,
       phone = EXCLUDED.phone, updated_at = now()`,
    [
      p.id, p.full_name, p.headline, p.email, p.linkedin, p.website, p.location,
      p.summary, p.master_resume, p.target_roles || [],
      JSON.stringify({ ...p.skills, constraints: p.constraints, gap_answer: p.gap_answer }),
      p.phone || '',
    ],
  );

  return { companies: companies.length, achievements: achievements.length };
}

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isMain) {
  seed()
    .then((counts) => {
      console.log(`[seed] ${counts.companies} companies, ${counts.achievements} achievements, 1 profile`);
      return pool.end();
    })
    .catch((err) => {
      console.error('[seed] failed:', err.message);
      process.exit(1);
    });
}
