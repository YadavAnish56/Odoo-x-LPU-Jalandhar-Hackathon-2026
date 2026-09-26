import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/validate.js';
import { camelize } from '../../utils/helpers.js';
import { OPERATION_TYPES, optionalId } from '../../utils/validators.js';
import { RULES_SQL } from '../products/reorderRules.routes.js';

const router = Router();

const filterSchema = z.object({ warehouseId: optionalId, categoryId: optionalId });

// $1 = warehouseId, $2 = categoryId (both optional)
const STOCK_KPIS_SQL = `
  WITH s AS (
    SELECT p.id, p.cost_price, COALESCE(SUM(q.quantity), 0) AS on_hand
    FROM products p
    LEFT JOIN stock_quants q ON q.product_id = p.id
      AND ($1::int IS NULL OR q.location_id IN (SELECT id FROM locations WHERE warehouse_id = $1::int))
    WHERE p.is_active AND ($2::int IS NULL OR p.category_id = $2::int)
    GROUP BY p.id
  ),
  r AS (
    SELECT product_id, SUM(min_qty) AS min_qty FROM reorder_rules
    WHERE $1::int IS NULL OR warehouse_id = $1::int
    GROUP BY product_id
  )
  SELECT COUNT(*) AS total_products,
    COUNT(*) FILTER (WHERE s.on_hand > 0) AS products_in_stock,
    COUNT(*) FILTER (WHERE s.on_hand > 0 AND r.min_qty IS NOT NULL AND s.on_hand <= r.min_qty) AS low_stock,
    COUNT(*) FILTER (WHERE s.on_hand <= 0) AS out_of_stock,
    COALESCE(SUM(s.on_hand), 0) AS total_quantity,
    COALESCE(SUM(s.on_hand * s.cost_price), 0) AS stock_value
  FROM s LEFT JOIN r ON r.product_id = s.id`;

const OPERATION_KPIS_SQL = `
  SELECT o.type,
    COUNT(*) FILTER (WHERE o.status IN ('draft', 'waiting', 'ready')) AS pending,
    COUNT(*) FILTER (WHERE o.status IN ('draft', 'waiting', 'ready') AND o.scheduled_date < now()) AS late,
    COUNT(*) FILTER (WHERE o.status = 'draft') AS draft,
    COUNT(*) FILTER (WHERE o.status = 'waiting') AS waiting,
    COUNT(*) FILTER (WHERE o.status = 'ready') AS ready,
    COUNT(*) FILTER (WHERE o.status = 'done') AS done,
    COUNT(*) FILTER (WHERE o.status = 'canceled') AS canceled
  FROM operations o
  WHERE ($1::int IS NULL OR o.warehouse_id = $1::int
         OR o.dest_location_id IN (SELECT id FROM locations WHERE warehouse_id = $1::int))
    AND ($2::int IS NULL OR EXISTS (
      SELECT 1 FROM operation_lines x JOIN products xp ON xp.id = x.product_id
      WHERE x.operation_id = o.id AND xp.category_id = $2::int))
  GROUP BY o.type`;

const RECENT_MOVES_SQL = `
  SELECT m.id, m.reference, m.move_type, p.name AS product_name, p.sku, m.quantity, m.created_at,
    fw.code || '/' || fl.code AS from_location_code, tw.code || '/' || tl.code AS to_location_code
  FROM stock_moves m
  JOIN products p ON p.id = m.product_id
  LEFT JOIN locations fl ON fl.id = m.from_location_id LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
  LEFT JOIN locations tl ON tl.id = m.to_location_id LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
  WHERE ($1::int IS NULL OR fl.warehouse_id = $1::int OR tl.warehouse_id = $1::int)
    AND ($2::int IS NULL OR p.category_id = $2::int)
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 10`;

const ALERTS_SQL = `${RULES_SQL}
  WHERE rules.status <> 'ok'
    AND ($1::int IS NULL OR rules.warehouse_id = $1::int)
    AND ($2::int IS NULL OR rules.product_id IN (SELECT id FROM products WHERE category_id = $2::int))
  ORDER BY rules.status DESC, rules.on_hand ASC`;

const emptyCounts = { pending: 0, late: 0, draft: 0, waiting: 0, ready: 0, done: 0, canceled: 0 };

// GET /api/dashboard?warehouseId=1&categoryId=2
router.get('/dashboard', validate({ query: filterSchema }), async (req, res) => {
  const params = [req.validQuery.warehouseId ?? null, req.validQuery.categoryId ?? null];
  const [stock, ops, moves, alerts] = await Promise.all([
    query(STOCK_KPIS_SQL, params),
    query(OPERATION_KPIS_SQL, params),
    query(RECENT_MOVES_SQL, params),
    query(`${ALERTS_SQL} LIMIT 10`, params),
  ]);

  const operations = Object.fromEntries(OPERATION_TYPES.map((t) => [t, { ...emptyCounts }]));
  for (const { type, ...counts } of ops.rows) operations[type] = counts;
  const s = stock.rows[0];

  res.json({
    filters: req.validQuery,
    kpis: {
      totalProducts: s.total_products,
      productsInStock: s.products_in_stock,
      lowStock: s.low_stock,
      outOfStock: s.out_of_stock,
      totalQuantity: s.total_quantity,
      stockValue: s.stock_value,
      pendingReceipts: operations.receipt.pending,
      lateReceipts: operations.receipt.late,
      pendingDeliveries: operations.delivery.pending,
      lateDeliveries: operations.delivery.late,
      waitingDeliveries: operations.delivery.waiting,
      scheduledTransfers: operations.internal.pending,
      lateTransfers: operations.internal.late,
    },
    operations,
    lowStockAlerts: camelize(alerts.rows),
    recentMoves: camelize(moves.rows),
  });
});

// $1 = number of days, $2 = warehouseId (optional)
const MOVEMENT_SQL = `
  SELECT to_char(d.day, 'YYYY-MM-DD') AS date,
    COALESCE(SUM(m.quantity) FILTER (WHERE m.direction = 'in'), 0) AS inbound,
    COALESCE(SUM(m.quantity) FILTER (WHERE m.direction = 'out'), 0) AS outbound,
    COALESCE(SUM(m.quantity) FILTER (WHERE m.direction = 'internal'), 0) AS internal
  FROM generate_series(current_date - ($1::int - 1), current_date, interval '1 day') AS d(day)
  LEFT JOIN (
    SELECT mv.created_at::date AS day, mv.quantity,
      CASE WHEN mv.from_location_id IS NULL THEN 'in'
           WHEN mv.to_location_id IS NULL THEN 'out'
           ELSE 'internal' END AS direction
    FROM stock_moves mv
    LEFT JOIN locations fl ON fl.id = mv.from_location_id
    LEFT JOIN locations tl ON tl.id = mv.to_location_id
    WHERE mv.created_at >= current_date - ($1::int - 1)
      AND ($2::int IS NULL OR fl.warehouse_id = $2::int OR tl.warehouse_id = $2::int)
  ) m ON m.day = d.day::date
  GROUP BY d.day
  ORDER BY d.day`;

// GET /api/dashboard/movement?days=30&warehouseId=1 - daily quantities received / shipped / moved
router.get(
  '/dashboard/movement',
  validate({
    query: z.object({
      days: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().min(1).max(365).default(30)),
      warehouseId: optionalId,
    }),
  }),
  async (req, res) => {
    const { rows } = await query(MOVEMENT_SQL, [req.validQuery.days, req.validQuery.warehouseId ?? null]);
    res.json(camelize(rows));
  },
);

// GET /api/alerts/low-stock?warehouseId=1 - reorder rules at or below their minimum
router.get('/alerts/low-stock', validate({ query: filterSchema }), async (req, res) => {
  const { rows } = await query(ALERTS_SQL, [req.validQuery.warehouseId ?? null, req.validQuery.categoryId ?? null]);
  res.json(camelize(rows));
});

export default router;
