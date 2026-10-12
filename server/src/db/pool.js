import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.database.url,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

export const query = (text, params) => pool.query(text, params);

export const one = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows[0] || null;
};

export const many = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows;
};

/** Run a set of statements inside a single transaction. */
export const withTransaction = async (fn) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
