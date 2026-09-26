import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { camelize, parseId, WhereBuilder } from '../../utils/helpers.js';
import { booleanQuery, id, optionalId } from '../../utils/validators.js';

const router = Router();

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,20}$/, 'Code must be 1-20 letters, numbers or dashes');

const SELECT_LOCATION = `
  SELECT l.*, w.name AS warehouse_name, w.code AS warehouse_code, w.code || '/' || l.code AS full_code,
    (SELECT COALESCE(SUM(q.quantity), 0) FROM stock_quants q WHERE q.location_id = l.id) AS total_quantity
  FROM locations l
  JOIN warehouses w ON w.id = l.warehouse_id`;

async function getLocation(locationId) {
  const { rows } = await query(`${SELECT_LOCATION} WHERE l.id = $1`, [locationId]);
  if (!rows[0]) throw notFound('Location not found');
  const stock = await query(
    `SELECT p.id AS product_id, p.name AS product_name, p.sku, p.uom, q.quantity
     FROM stock_quants q JOIN products p ON p.id = q.product_id
     WHERE q.location_id = $1 AND q.quantity > 0
     ORDER BY p.name`,
    [locationId],
  );
  return camelize({ ...rows[0], stock: stock.rows });
}

// GET /api/locations?warehouseId=1&includeInactive=true
router.get(
  '/',
  validate({ query: z.object({ warehouseId: optionalId, includeInactive: booleanQuery }) }),
  async (req, res) => {
    const { warehouseId, includeInactive } = req.validQuery;
    const where = new WhereBuilder().add('l.warehouse_id = ?', warehouseId);
    if (!includeInactive) where.addRaw('l.is_active');
    const { rows } = await query(`${SELECT_LOCATION} ${where.toSql()} ORDER BY w.name, l.name`, where.params);
    res.json(camelize(rows));
  },
);

// GET /api/locations/:id - includes the stock stored in this location
router.get('/:id', async (req, res) => {
  res.json(await getLocation(parseId(req.params.id)));
});

// POST /api/locations
router.post(
  '/',
  requireRole('manager'),
  validate({ body: z.object({ warehouseId: id, name: z.string().trim().min(1).max(100), code }) }),
  async (req, res) => {
    const wh = await query('SELECT is_active FROM warehouses WHERE id = $1', [req.body.warehouseId]);
    if (!wh.rows[0]) throw badRequest('Warehouse not found');
    if (!wh.rows[0].is_active) throw badRequest('Warehouse is archived');
    const { rows } = await query('INSERT INTO locations (warehouse_id, name, code) VALUES ($1, $2, $3) RETURNING id', [
      req.body.warehouseId,
      req.body.name,
      req.body.code,
    ]);
    res.status(201).json(await getLocation(rows[0].id));
  },
);

// PUT /api/locations/:id
router.put(
  '/:id',
  requireRole('manager'),
  validate({
    body: z.object({
      name: z.string().trim().min(1).max(100).optional(),
      code: code.optional(),
      isActive: z.boolean().optional(),
    }),
  }),
  async (req, res) => {
    const locationId = parseId(req.params.id);
    const { rowCount } = await query(
      `UPDATE locations SET name = COALESCE($1, name), code = COALESCE($2, code),
         is_active = COALESCE($3, is_active), updated_at = now()
       WHERE id = $4`,
      [req.body.name ?? null, req.body.code ?? null, req.body.isActive ?? null, locationId],
    );
    if (!rowCount) throw notFound('Location not found');
    res.json(await getLocation(locationId));
  },
);

// DELETE /api/locations/:id - archives the location (history is kept)
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const locationId = parseId(req.params.id);
  await withTransaction(async (client) => {
    const found = await client.query('SELECT id FROM locations WHERE id = $1 FOR UPDATE', [locationId]);
    if (!found.rowCount) throw notFound('Location not found');

    const stock = await client.query('SELECT 1 FROM stock_quants WHERE location_id = $1 AND quantity > 0 LIMIT 1', [
      locationId,
    ]);
    if (stock.rowCount) throw conflict('Location still has stock. Move or adjust it to zero first.');

    const open = await client.query(
      `SELECT 1 FROM operations
       WHERE (source_location_id = $1 OR dest_location_id = $1) AND status IN ('draft', 'waiting', 'ready')
       LIMIT 1`,
      [locationId],
    );
    if (open.rowCount) throw conflict('Location is used by open operations. Validate or cancel them first.');

    await client.query('UPDATE locations SET is_active = FALSE, updated_at = now() WHERE id = $1', [locationId]);
  });
  res.status(204).end();
});

export default router;
