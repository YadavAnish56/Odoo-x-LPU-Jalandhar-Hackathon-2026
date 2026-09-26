import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { camelize, parseId, WhereBuilder } from '../../utils/helpers.js';
import { id, nonNegativeQuantity, optionalEnum, optionalId } from '../../utils/validators.js';

const router = Router();

/**
 * Reorder rules with the current stock in the rule's warehouse.
 * status: 'out' (no stock), 'low' (at or below min) or 'ok'.
 * suggestedQty: how much to order to get back up to max.
 */
export const RULES_SQL = `
  SELECT * FROM (
    SELECT r.id, r.product_id, p.name AS product_name, p.sku, p.uom,
      r.warehouse_id, w.name AS warehouse_name, w.code AS warehouse_code,
      r.min_qty, r.max_qty, COALESCE(s.on_hand, 0) AS on_hand,
      CASE WHEN COALESCE(s.on_hand, 0) <= 0 THEN 'out'
           WHEN COALESCE(s.on_hand, 0) <= r.min_qty THEN 'low'
           ELSE 'ok' END AS status,
      GREATEST(r.max_qty - COALESCE(s.on_hand, 0), 0) AS suggested_qty,
      r.created_at, r.updated_at
    FROM reorder_rules r
    JOIN products p ON p.id = r.product_id AND p.is_active
    JOIN warehouses w ON w.id = r.warehouse_id
    LEFT JOIN LATERAL (
      SELECT SUM(q.quantity) AS on_hand FROM stock_quants q JOIN locations l ON l.id = q.location_id
      WHERE q.product_id = r.product_id AND l.warehouse_id = r.warehouse_id
    ) s ON TRUE
  ) rules`;

async function getRule(ruleId) {
  const { rows } = await query(`${RULES_SQL} WHERE rules.id = $1`, [ruleId]);
  if (!rows[0]) throw notFound('Reorder rule not found');
  return camelize(rows[0]);
}

const minMax = z
  .object({ minQty: nonNegativeQuantity, maxQty: nonNegativeQuantity })
  .refine((r) => r.maxQty >= r.minQty, { message: 'maxQty must be greater than or equal to minQty', path: ['maxQty'] });

// GET /api/reorder-rules?productId=1&warehouseId=1&status=low
router.get(
  '/',
  validate({
    query: z.object({ productId: optionalId, warehouseId: optionalId, status: optionalEnum(['ok', 'low', 'out']) }),
  }),
  async (req, res) => {
    const f = req.validQuery;
    const where = new WhereBuilder()
      .add('rules.product_id = ?', f.productId)
      .add('rules.warehouse_id = ?', f.warehouseId)
      .add('rules.status = ?', f.status);
    const { rows } = await query(`${RULES_SQL} ${where.toSql()} ORDER BY rules.product_name, rules.warehouse_name`, where.params);
    res.json(camelize(rows));
  },
);

// POST /api/reorder-rules - creates the rule, or updates it if the product already has one in that warehouse
router.post(
  '/',
  requireRole('manager'),
  validate({ body: z.object({ productId: id, warehouseId: id }).and(minMax) }),
  async (req, res) => {
    const b = req.body;
    const { rows } = await query(
      `INSERT INTO reorder_rules (product_id, warehouse_id, min_qty, max_qty) VALUES ($1, $2, $3, $4)
       ON CONFLICT (product_id, warehouse_id)
       DO UPDATE SET min_qty = EXCLUDED.min_qty, max_qty = EXCLUDED.max_qty, updated_at = now()
       RETURNING id`,
      [b.productId, b.warehouseId, b.minQty, b.maxQty],
    );
    res.status(201).json(await getRule(rows[0].id));
  },
);

// PUT /api/reorder-rules/:id
router.put(
  '/:id',
  requireRole('manager'),
  validate({ body: z.object({ minQty: nonNegativeQuantity.optional(), maxQty: nonNegativeQuantity.optional() }) }),
  async (req, res) => {
    const ruleId = parseId(req.params.id);
    const current = await getRule(ruleId);
    const minQty = req.body.minQty ?? current.minQty;
    const maxQty = req.body.maxQty ?? current.maxQty;
    if (maxQty < minQty) throw badRequest('maxQty must be greater than or equal to minQty');
    await query('UPDATE reorder_rules SET min_qty = $1, max_qty = $2, updated_at = now() WHERE id = $3', [
      minQty,
      maxQty,
      ruleId,
    ]);
    res.json(await getRule(ruleId));
  },
);

// DELETE /api/reorder-rules/:id
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const { rowCount } = await query('DELETE FROM reorder_rules WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw notFound('Reorder rule not found');
  res.status(204).end();
});

export default router;
