import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

if (config.jwtSecret === 'dev-only-secret-change-me') {
  console.warn('Warning: JWT_SECRET is not set - using an insecure development secret.');
}

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`StockSense API running on http://localhost:${config.port}`);
});

function shutdown() {
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
