import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config.js';
import { query } from './db/pool.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './modules/auth/auth.routes.js';
import categoriesRoutes from './modules/categories/categories.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import locationsRoutes from './modules/locations/locations.routes.js';
import movesRoutes from './modules/moves/moves.routes.js';
import adjustmentsRoutes from './modules/operations/adjustments.routes.js';
import operationsRoutes from './modules/operations/operations.routes.js';
import productsRoutes from './modules/products/products.routes.js';
import reorderRulesRoutes from './modules/products/reorderRules.routes.js';
import stockRoutes from './modules/products/stock.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import warehousesRoutes from './modules/warehouses/warehouses.routes.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/', (req, res) => {
    res.json({ name: 'StockSense API', status: 'running', health: '/api/health' });
  });

  app.get('/api/health', async (req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch {
      res.status(503).json({ status: 'error', database: 'unreachable' });
    }
  });

  // Public routes: signup, login, forgot / reset password
  app.use('/api/auth', authRoutes);

  // Everything below needs a logged-in user
  const api = express.Router();
  api.use(requireAuth);
  api.use('/users', usersRoutes);
  api.use('/warehouses', warehousesRoutes);
  api.use('/locations', locationsRoutes);
  api.use('/categories', categoriesRoutes);
  api.use('/products', productsRoutes);
  api.use('/stock', stockRoutes);
  api.use('/reorder-rules', reorderRulesRoutes);
  api.use('/operations', operationsRoutes);
  api.use('/adjustments', adjustmentsRoutes);
  api.use('/moves', movesRoutes);
  api.use('/', dashboardRoutes); // /dashboard and /alerts/low-stock
  app.use('/api', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
