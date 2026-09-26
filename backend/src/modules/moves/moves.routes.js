import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/validate.js';
import { likePattern, toPage, WhereBuilder } from '../../utils/helpers.js';
import { dateOnly, OPERATION_TYPES, optionalEnum, optionalId, pagination, searchText } from '../../utils/validators.js';

const router = Router();

const listSchema = z.object({
  productId: optionalId,
  locationId: optionalId,
  warehouseId: optionalId,
  categoryId: optionalId,
  operationId: optionalId,
  type: optionalEnum(OPERATION_TYPES),
  search: searchText,
  dateFrom: dateOnly,
  dateTo: dateOnly,
  ...pagination,
});

// GET /api/moves - stock ledger / move history (newest first)
// direction: 'in' (stock entered the company), 'out' (stock left), 'internal' (moved between locations)
router.get('/', validate({ query: listSchema }), async (req, res) => {
  const f = req.validQuery;
  const where = new WhereBuilder()
    .add('m.product_id = ?', f.productId)
    .add('(m.from_location_id = ? OR m.to_location_id = ?)', f.locationId)
    .add('(fl.warehouse_id = ? OR tl.warehouse_id = ?)', f.warehouseId)
    .add('p.category_id = ?', f.categoryId)
    .add('m.operation_id = ?', f.operationId)
    .add('m.move_type = ?', f.type)
    .add('(m.reference ILIKE ? OR p.name ILIKE ? OR p.sku ILIKE ? OR m.partner_name ILIKE ?)', likePattern(f.search))
    .add('m.created_at >= ?::date', f.dateFrom)
    .add('m.created_at < ?::date + 1', f.dateTo);
  const limit = where.param(f.limit);
  const offset = where.param((f.page - 1) * f.limit);

  const { rows } = await query(
    `SELECT m.id, m.operation_id, m.reference, m.move_type,
       m.product_id, p.name AS product_name, p.sku, p.uom, c.name AS category_name,
       m.from_location_id, fl.name AS from_location_name, fw.code || '/' || fl.code AS from_location_code,
       m.to_location_id, tl.name AS to_location_name, tw.code || '/' || tl.code AS to_location_code,
       m.quantity, m.partner_name, u.name AS created_by_name, m.created_at,
       CASE WHEN m.from_location_id IS NULL THEN 'in'
            WHEN m.to_location_id IS NULL THEN 'out'
            ELSE 'internal' END AS direction,
       COUNT(*) OVER() AS total_count
     FROM stock_moves m
     JOIN products p ON p.id = m.product_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN locations fl ON fl.id = m.from_location_id
     LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
     LEFT JOIN locations tl ON tl.id = m.to_location_id
     LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
     LEFT JOIN users u ON u.id = m.created_by
     ${where.toSql()}
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  res.json(toPage(rows, f));
});

const ledgerSchema = listSchema.omit({ operationId: true });

// GET /api/moves/ledger - stock ledger per location: one row per stock change with the
// running balance of that product in that location (a transfer gives an "out" and an "in" row).
router.get('/ledger', validate({ query: ledgerSchema }), async (req, res) => {
  const f = req.validQuery;
  const where = new WhereBuilder()
    .add('l.product_id = ?', f.productId)
    .add('l.location_id = ?', f.locationId)
    .add('loc.warehouse_id = ?', f.warehouseId)
    .add('p.category_id = ?', f.categoryId)
    .add('l.move_type = ?', f.type)
    .add('(l.reference ILIKE ? OR p.name ILIKE ? OR p.sku ILIKE ?)', likePattern(f.search))
    .add('l.created_at >= ?::date', f.dateFrom)
    .add('l.created_at < ?::date + 1', f.dateTo);
  const limit = where.param(f.limit);
  const offset = where.param((f.page - 1) * f.limit);

  // The balance is computed over the full history first, then the filters are applied.
  const { rows } = await query(
    `WITH entries AS (
       SELECT m.id AS move_id, m.operation_id, m.created_at, m.reference, m.move_type, m.product_id,
         m.from_location_id AS location_id, 0::numeric AS quantity_in, m.quantity AS quantity_out
       FROM stock_moves m WHERE m.from_location_id IS NOT NULL
       UNION ALL
       SELECT m.id, m.operation_id, m.created_at, m.reference, m.move_type, m.product_id,
         m.to_location_id, m.quantity, 0::numeric
       FROM stock_moves m WHERE m.to_location_id IS NOT NULL
     ),
     l AS (
       SELECT e.*, SUM(e.quantity_in - e.quantity_out)
         OVER (PARTITION BY e.product_id, e.location_id ORDER BY e.created_at, e.move_id) AS balance
       FROM entries e
     )
     SELECT l.move_id, l.operation_id, l.created_at, l.reference, l.move_type,
       l.product_id, p.name AS product_name, p.sku, p.uom,
       l.location_id, loc.name AS location_name, w.code || '/' || loc.code AS location_code,
       w.id AS warehouse_id, w.name AS warehouse_name,
       l.quantity_in, l.quantity_out, l.balance,
       COUNT(*) OVER() AS total_count
     FROM l
     JOIN products p ON p.id = l.product_id
     JOIN locations loc ON loc.id = l.location_id
     JOIN warehouses w ON w.id = loc.warehouse_id
     ${where.toSql()}
     ORDER BY l.created_at DESC, l.move_id DESC, l.quantity_in ASC
     LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  res.json(toPage(rows, f));
});

export default router;
