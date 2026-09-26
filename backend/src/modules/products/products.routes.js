import { Router } from 'express';
import { z } from 'zod';
import { pool, query, withTransaction } from '../../db/pool.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { conflict, notFound } from '../../utils/httpError.js';
import { camelize, likePattern, parseId, toPage, WhereBuilder } from '../../utils/helpers.js';
import {
  booleanQuery,
  id,
  nullableId,
  nullableText,
  optionalEnum,
  optionalId,
  pagination,
  quantity,
  searchText,
} from '../../utils/validators.js';
import { adjustStock } from '../operations/stock.service.js';

const router = Router();

const name = z.string().trim().min(1).max(150);
const sku = z
  .string()
  .trim()
  .toUpperCase()
  .min(1)
  .max(50)
  .regex(/^[A-Z0-9._\-/]+$/, 'SKU can contain letters, numbers and . _ - /');
const uom = z.string().trim().min(1).max(20);
const costPrice = z.coerce.number().min(0).max(1e10);

const createSchema = z.object({
  name,
  sku,
  categoryId: nullableId,
  uom: uom.default('Units'),
  costPrice: costPrice.default(0),
  description: nullableText(2000),
  initialStock: z.object({ locationId: id, quantity }).optional(),
});

const updateSchema = z.object({
  name: name.optional(),
  sku: sku.optional(),
  categoryId: nullableId,
  uom: uom.optional(),
  costPrice: costPrice.optional(),
  description: nullableText(2000),
  isActive: z.boolean().optional(),
});

const listSchema = z.object({
  search: searchText,
  categoryId: optionalId,
  warehouseId: optionalId,
  stockStatus: optionalEnum(['in', 'low', 'out']),
  includeInactive: booleanQuery,
  ...pagination,
});

/**
 * Products with stock figures, optionally limited to one warehouse:
 * onHand, reserved (by ready deliveries / transfers), freeToUse, reorder min/max
 * and stockStatus: 'out' (nothing on hand), 'low' (at or below reorder min) or 'in'.
 */
function productStockSql(warehouseParam) {
  return `
    WITH product_stock AS (
      SELECT p.id, p.name, p.sku, p.uom, p.cost_price, p.description, p.category_id, c.name AS category_name,
        p.is_active, p.created_at, p.updated_at,
        COALESCE(s.on_hand, 0) AS on_hand,
        COALESCE(r.reserved, 0) AS reserved,
        GREATEST(COALESCE(s.on_hand, 0) - COALESCE(r.reserved, 0), 0) AS free_to_use,
        rr.min_qty AS reorder_min_qty,
        rr.max_qty AS reorder_max_qty
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT SUM(q.quantity) AS on_hand FROM stock_quants q JOIN locations l ON l.id = q.location_id
        WHERE q.product_id = p.id AND (${warehouseParam}::int IS NULL OR l.warehouse_id = ${warehouseParam}::int)
      ) s ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(ol.quantity) AS reserved FROM operation_lines ol
        JOIN operations o ON o.id = ol.operation_id
        JOIN locations l ON l.id = o.source_location_id
        WHERE ol.product_id = p.id AND o.status = 'ready' AND o.type IN ('delivery', 'internal')
          AND (${warehouseParam}::int IS NULL OR l.warehouse_id = ${warehouseParam}::int)
      ) r ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(x.min_qty) AS min_qty, SUM(x.max_qty) AS max_qty FROM reorder_rules x
        WHERE x.product_id = p.id AND (${warehouseParam}::int IS NULL OR x.warehouse_id = ${warehouseParam}::int)
      ) rr ON TRUE
    ),
    ps AS (
      SELECT *,
        CASE WHEN on_hand <= 0 THEN 'out'
             WHEN reorder_min_qty IS NOT NULL AND on_hand <= reorder_min_qty THEN 'low'
             ELSE 'in' END AS stock_status,
        on_hand * cost_price AS stock_value
      FROM product_stock
    )`;
}

async function getProduct(productId, db = pool) {
  const { rows } = await db.query(`${productStockSql('$2')} SELECT * FROM ps WHERE ps.id = $1`, [productId, null]);
  if (!rows[0]) throw notFound('Product not found');

  // Sequential on purpose: `db` may be a single transaction client.
  const stock = await db.query(
    `SELECT q.location_id, l.name AS location_name, w.code || '/' || l.code AS location_code,
       w.id AS warehouse_id, w.name AS warehouse_name, q.quantity
     FROM stock_quants q
     JOIN locations l ON l.id = q.location_id
     JOIN warehouses w ON w.id = l.warehouse_id
     WHERE q.product_id = $1 AND q.quantity > 0
     ORDER BY w.name, l.name`,
    [productId],
  );
  const rules = await db.query(
    `SELECT r.id, r.warehouse_id, w.name AS warehouse_name, r.min_qty, r.max_qty
     FROM reorder_rules r JOIN warehouses w ON w.id = r.warehouse_id
     WHERE r.product_id = $1 ORDER BY w.name`,
    [productId],
  );
  const moves = await db.query(
    `SELECT m.id, m.reference, m.move_type, m.quantity, m.created_at,
       fw.code || '/' || fl.code AS from_location_code, tw.code || '/' || tl.code AS to_location_code
     FROM stock_moves m
     LEFT JOIN locations fl ON fl.id = m.from_location_id LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
     LEFT JOIN locations tl ON tl.id = m.to_location_id LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
     WHERE m.product_id = $1
     ORDER BY m.created_at DESC, m.id DESC
     LIMIT 10`,
    [productId],
  );

  return camelize({
    ...rows[0],
    stockByLocation: stock.rows,
    reorderRules: rules.rows,
    recentMoves: moves.rows,
  });
}

// GET /api/products?search=steel&categoryId=1&warehouseId=1&stockStatus=low&page=1&limit=20
router.get('/', validate({ query: listSchema }), async (req, res) => {
  const f = req.validQuery;
  const where = new WhereBuilder();
  const warehouseParam = where.param(f.warehouseId ?? null);
  if (!f.includeInactive) where.addRaw('ps.is_active');
  where
    .add('ps.category_id = ?', f.categoryId)
    .add('ps.stock_status = ?', f.stockStatus)
    .add('(ps.name ILIKE ? OR ps.sku ILIKE ?)', likePattern(f.search));
  const limit = where.param(f.limit);
  const offset = where.param((f.page - 1) * f.limit);

  const { rows } = await query(
    `${productStockSql(warehouseParam)}
     SELECT ps.*, COUNT(*) OVER() AS total_count FROM ps
     ${where.toSql()}
     ORDER BY ps.name, ps.id
     LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  res.json(toPage(rows, f));
});

// GET /api/products/sku/:sku - exact SKU lookup (e.g. barcode scanner)
router.get('/sku/:sku', async (req, res) => {
  const { rows } = await query('SELECT id FROM products WHERE sku = upper($1)', [req.params.sku.trim()]);
  if (!rows[0]) throw notFound('No product with this SKU');
  res.json(await getProduct(rows[0].id));
});

// GET /api/products/:id - product with stock per location, reorder rules and recent moves
router.get('/:id', async (req, res) => {
  res.json(await getProduct(parseId(req.params.id)));
});

// POST /api/products - optional initialStock is logged as an adjustment in the ledger
router.post('/', requireRole('manager'), validate({ body: createSchema }), async (req, res) => {
  const b = req.body;
  const product = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `INSERT INTO products (name, sku, category_id, uom, cost_price, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [b.name, b.sku, b.categoryId ?? null, b.uom, b.costPrice, b.description ?? null],
    );
    const productId = rows[0].id;
    if (b.initialStock) {
      await adjustStock(
        client,
        {
          locationId: b.initialStock.locationId,
          lines: [{ productId, countedQuantity: b.initialStock.quantity }],
          notes: 'Initial stock',
        },
        req.user.id,
      );
    }
    return getProduct(productId, client);
  });
  res.status(201).json(product);
});

// PUT /api/products/:id
router.put('/:id', requireRole('manager'), validate({ body: updateSchema }), async (req, res) => {
  const productId = parseId(req.params.id);
  const b = req.body;
  const { rowCount } = await query(
    `UPDATE products SET
       name = COALESCE($1, name),
       sku = COALESCE($2, sku),
       category_id = CASE WHEN $3::boolean THEN $4 ELSE category_id END,
       uom = COALESCE($5, uom),
       cost_price = COALESCE($6, cost_price),
       description = CASE WHEN $7::boolean THEN $8 ELSE description END,
       is_active = COALESCE($9, is_active),
       updated_at = now()
     WHERE id = $10`,
    [b.name ?? null, b.sku ?? null, b.categoryId !== undefined, b.categoryId ?? null, b.uom ?? null,
      b.costPrice ?? null, b.description !== undefined, b.description ?? null, b.isActive ?? null, productId],
  );
  if (!rowCount) throw notFound('Product not found');
  res.json(await getProduct(productId));
});

// DELETE /api/products/:id - archives the product (stock history is kept)
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const productId = parseId(req.params.id);
  const open = await query(
    `SELECT 1 FROM operation_lines l JOIN operations o ON o.id = l.operation_id
     WHERE l.product_id = $1 AND o.status IN ('draft', 'waiting', 'ready') LIMIT 1`,
    [productId],
  );
  if (open.rowCount) throw conflict('Product is used in open operations. Validate or cancel them first.');
  const { rowCount } = await query('UPDATE products SET is_active = FALSE, updated_at = now() WHERE id = $1', [
    productId,
  ]);
  if (!rowCount) throw notFound('Product not found');
  res.status(204).end();
});

export default router;
