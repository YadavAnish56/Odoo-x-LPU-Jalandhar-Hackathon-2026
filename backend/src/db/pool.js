import pg from 'pg';
import { config } from '../config.js';

// Return NUMERIC (quantities, prices) and BIGINT (COUNT/SUM results) as JS numbers.
pg.types.setTypeParser(1700, (value) => parseFloat(value));
pg.types.setTypeParser(20, (value) => parseInt(value, 10));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Runs `fn(client)` inside a single database transaction.
 * Commits when fn resolves, rolls back when it throws.
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
