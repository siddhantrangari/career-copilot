import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function migrate() {
  const sql = await fs.readFile(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

const isMain = process.argv[1] && import.meta.url === `file://${path.resolve(process.argv[1])}`;
if (isMain) {
  migrate()
    .then(() => {
      console.log('[migrate] schema applied');
      return pool.end();
    })
    .catch((err) => {
      console.error('[migrate] failed:', err.message);
      process.exit(1);
    });
}
