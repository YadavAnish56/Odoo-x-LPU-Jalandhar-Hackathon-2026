import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { notFound } from '../../utils/httpError.js';
import { camelize, parseId } from '../../utils/helpers.js';
import { nullableText } from '../../utils/validators.js';

const router = Router();

const SELECT_CATEGORY = `
  SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active) AS product_count
  FROM categories c`;

async function getCategory(categoryId) {
  const { rows } = await query(`${SELECT_CATEGORY} WHERE c.id = $1`, [categoryId]);
  if (!rows[0]) throw notFound('Category not found');
  return camelize(rows[0]);
}

// GET /api/categories
router.get('/', async (req, res) => {
  const { rows } = await query(`${SELECT_CATEGORY} ORDER BY c.name`);
  res.json(camelize(rows));
});

// GET /api/categories/:id
router.get('/:id', async (req, res) => {
  res.json(await getCategory(parseId(req.params.id)));
});

// POST /api/categories
router.post(
  '/',
  requireRole('manager'),
  validate({ body: z.object({ name: z.string().trim().min(1).max(100), description: nullableText(500) }) }),
  async (req, res) => {
    const { rows } = await query('INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id', [
      req.body.name,
      req.body.description ?? null,
    ]);
    res.status(201).json(await getCategory(rows[0].id));
  },
);

// PUT /api/categories/:id
router.put(
  '/:id',
  requireRole('manager'),
  validate({
    body: z.object({ name: z.string().trim().min(1).max(100).optional(), description: nullableText(500) }),
  }),
  async (req, res) => {
    const categoryId = parseId(req.params.id);
    const { rowCount } = await query(
      `UPDATE categories SET name = COALESCE($1, name),
         description = CASE WHEN $2::boolean THEN $3 ELSE description END, updated_at = now()
       WHERE id = $4`,
      [req.body.name ?? null, req.body.description !== undefined, req.body.description ?? null, categoryId],
    );
    if (!rowCount) throw notFound('Category not found');
    res.json(await getCategory(categoryId));
  },
);

// DELETE /api/categories/:id - products in this category become uncategorized
router.delete('/:id', requireRole('manager'), async (req, res) => {
  const { rowCount } = await query('DELETE FROM categories WHERE id = $1', [parseId(req.params.id)]);
  if (!rowCount) throw notFound('Category not found');
  res.status(204).end();
});

export default router;
