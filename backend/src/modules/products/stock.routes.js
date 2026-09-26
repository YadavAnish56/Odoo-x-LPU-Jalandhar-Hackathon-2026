import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { validate } from '../../middleware/validate.js';
import { likePattern, round3, toPage, WhereBuilder } from '../../utils/helpers.js';
import { booleanQuery, optionalId, pagination, searchText } from '../../utils/validators.js';

const router = Router();

const listSchema = z.object({
  warehouseId: optionalId,
  locationId: optionalId,
  productId: optionalId,
  categoryId: optionalId,
  search: searchText,
  includeZero: booleanQuery,
  ...pagination,
});

// GET /api/stock - stock availability per product per location
router.get('/', validate({ query: listSchema }), async (req, res) => {
  const f = req.validQuery;
  const where = new WhereBuilder()
    .add('w.id = ?', f.warehouseId)
    .add('l.id = ?', f.locationId)
    .add('p.id = ?', f.productId)
    .add('p.category_id = ?', f.categoryId)
    .add('(p.name ILIKE ? OR p.sku ILIKE ?)', likePattern(f.search));
  if (!f.includeZero) where.addRaw('q.quantity > 0');
  const limit = where.param(f.limit);
  const offset = where.param((f.page - 1) * f.limit);

  const { rows } = await query(
    `SELECT q.product_id, p.name AS product_name, p.sku, p.uom, p.category_id, c.name AS category_name,
       q.location_id, l.name AS location_name, w.code || '/' || l.code AS location_code,
       w.id AS warehouse_id, w.name AS warehouse_name,
       q.quantity AS on_hand,
       COALESCE((
         SELECT SUM(ol.quantity) FROM operation_lines ol JOIN operations o ON o.id = ol.operation_id
         WHERE o.status = 'ready' AND o.type IN ('delivery', 'internal')
           AND o.source_location_id = q.location_id AND ol.product_id = q.product_id
       ), 0) AS reserved,
       q.updated_at,
       COUNT(*) OVER() AS total_count
     FROM stock_quants q
     JOIN products p ON p.id = q.product_id
     JOIN locations l ON l.id = q.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     LEFT JOIN categories c ON c.id = p.category_id
     ${where.toSql()}
     ORDER BY p.name, w.name, l.name
     LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );

  const page = toPage(rows, f);
  page.items = page.items.map((item) => ({ ...item, freeToUse: Math.max(0, round3(item.onHand - item.reserved)) }));
  res.json(page);
});

export default router;
