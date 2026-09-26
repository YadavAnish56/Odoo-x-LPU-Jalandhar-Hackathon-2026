import { Router } from 'express';
import { z } from 'zod';
import { query, withTransaction } from '../../db/pool.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { conflict, notFound } from '../../utils/httpError.js';
import { camelize, parseId } from '../../utils/helpers.js';
import { booleanQuery, nullableText } from '../../utils/validators.js';

const router = Router();

const code = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{1,10}$/, 'Code must be 1-10 letters, numbers or dashes');

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code,
  address: nullableText(500),
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: code.optional(),
  address: nullableText(500),
  isActive: z.boolean().optional(),
});

const SELECT_WAREHOUSE = `
  SELECT w.*,
    (SELECT COUNT(*) FROM locations l WHERE l.warehouse_id = w.id AND l.is_active) AS location_count,
    (SELECT COALESCE(SUM(q.quantity), 0) FROM stock_quants q JOIN locations l ON l.id = q.location_id
      WHERE l.warehouse_id = w.id) AS total_quantity
  FROM warehouses w`;

async function getWarehouse(id) {
  const { rows } = await query(`${SELECT_WAREHOUSE} WHERE w.id = $1`, [id]);
  if (!rows[0]) throw notFound('Warehouse not found');
  const locations = await query(
    `SELECT l.id, l.name, l.code, w.code || '/' || l.code AS full_code, l.is_active
     FROM locations l JOIN warehouses w ON w.id = l.warehouse_id
     WHERE l.warehouse_id = $1 ORDER BY l.name`,
    [id],
  );
  return camelize({ ...rows[0], locations: locations.rows });
}

// GET /api/warehouses?includeInactive=true
router.get('/', validate({ query: z.object({ includeInactive: booleanQuery }) }), async (req, res) => {
  const where = req.validQuery.includeInactive ? '' : 'WHERE w.is_active';
  const { rows } = await query(`${SELECT_WAREHOUSE} ${where} ORDER BY w.name`);
  res.json(camelize(rows));
});

// GET /api/warehouses/:id
router.get('/:id', async (req, res) => {
  res.json(await getWarehouse(parseId(req.params.id)));
});

// POST /api/warehouses - also creates a default "Stock" location
router.post('/', requireRole('manager'), validate({ body: createSchema }), async (req, res) => {
  const id = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO warehouses (name, code, address) VALUES ($1, $2, $3) RETURNING id',
      [req.body.name, req.body.code, req.body.address ?? null],
    );
    await client.query(`INSERT INTO locations (warehouse_id, name, code) VALUES ($1, 'Stock', 'STOCK')`, [
      rows[0].id,
    ]);
    return rows[0].id;
  });
  res.status(201).json(await getWarehouse(id));
});

// PUT /api/warehouses/:id
router.put('/:id', requireRole('manager'), validate({ body: updateSchema }), async (req, res) => {
  const id = parseId(req.params.id);
  const b = req.body;
  const { rowCount } = await query(
    `UPDATE warehouses SET
       name = COALESCE($1, name),
       code = COALESCE($2, code),
       address = CASE WHEN $3::boolean THEN $4 ELSE address END,
       is_active = COALESCE($5, is_active),
       updated_at = now()
     WHERE id = $6`,
    [b.name ?? null, b.code ?? null, b.address !== undefined, b.address ?? null, b.isActive ?? null, id],
  );
  if (!rowCount) throw notFound('Warehouse not found');
  res.json(await getWarehouse(id));
});

// DELETE /api/warehouses/:id - archives the warehouse (history is kept)
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const id = parseId(req.params.id);
  await withTransaction(async (client) => {
    const found = await client.query('SELECT id FROM warehouses WHERE id = $1 FOR UPDATE', [id]);
    if (!found.rowCount) throw notFound('Warehouse not found');

    const stock = await client.query(
      `SELECT 1 FROM stock_quants q JOIN locations l ON l.id = q.location_id
       WHERE l.warehouse_id = $1 AND q.quantity > 0 LIMIT 1`,
      [id],
    );
    if (stock.rowCount) throw conflict('Warehouse still has stock. Move or adjust it to zero first.');

    const open = await client.query(
      `SELECT 1 FROM operations WHERE warehouse_id = $1 AND status IN ('draft', 'waiting', 'ready') LIMIT 1`,
      [id],
    );
    if (open.rowCount) throw conflict('Warehouse has open operations. Validate or cancel them first.');

    await client.query('UPDATE locations SET is_active = FALSE, updated_at = now() WHERE warehouse_id = $1', [id]);
    await client.query('UPDATE warehouses SET is_active = FALSE, updated_at = now() WHERE id = $1', [id]);
  });
  res.status(204).end();
});

export default router;
