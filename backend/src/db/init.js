// Creates the database (if missing) and all tables.
//   npm run db:init   -> create missing tables
//   npm run db:reset  -> DROP all StockSense tables and recreate them (deletes all data!)
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { config } from '../config.js';

const TABLES = [
  'stock_moves',
  'operation_lines',
  'operations',
  'reorder_rules',
  'stock_quants',
  'products',
  'categories',
  'locations',
  'warehouses',
  'password_reset_otps',
  'users',
  'sequences',
];

async function ensureDatabaseExists() {
  const probe = new pg.Client({ connectionString: config.databaseUrl });
  try {
    await probe.connect();
    return;
  } catch (err) {
    if (err.code !== '3D000') throw err; // 3D000 = database does not exist
  } finally {
    await probe.end().catch(() => {});
  }

  const url = new URL(config.databaseUrl);
  const dbName = decodeURIComponent(url.pathname.slice(1));
  url.pathname = '/postgres';
  const admin = new pg.Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query(`CREATE DATABASE "${dbName.replaceAll('"', '""')}"`);
  await admin.end();
  console.log(`Created database "${dbName}"`);
}

export async function initDatabase({ reset = false } = {}) {
  await ensureDatabaseExists();
  const client = new pg.Client({ connectionString: config.databaseUrl });
  await client.connect();
  try {
    if (reset) {
      await client.query(`DROP TABLE IF EXISTS ${TABLES.join(', ')} CASCADE`);
    }
    const schema = await readFile(new URL('./schema.sql', import.meta.url), 'utf8');
    await client.query(schema);
  } finally {
    await client.end();
  }
}

// Run directly: node src/db/init.js [--reset]
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reset = process.argv.includes('--reset');
  if (reset && config.isProduction) {
    console.error('Refusing to reset the database in production.');
    process.exit(1);
  }
  initDatabase({ reset })
    .then(() => console.log(reset ? 'Database reset complete.' : 'Database schema is ready.'))
    .catch((err) => {
      console.error('Database init failed:', err.message);
      process.exit(1);
    });
}
