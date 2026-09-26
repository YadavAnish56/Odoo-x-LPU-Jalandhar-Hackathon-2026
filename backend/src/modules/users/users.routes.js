import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../db/pool.js';
import { requireRole, signToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, notFound } from '../../utils/httpError.js';
import { parseId } from '../../utils/helpers.js';
import { email, password } from '../../utils/validators.js';
import { publicUser } from '../auth/auth.routes.js';

const router = Router();

// GET /api/users - list of users (e.g. for the "Responsible" dropdown)
router.get('/', async (req, res) => {
  const { rows } = await query('SELECT id, name, email, role, created_at FROM users ORDER BY name');
  res.json(rows.map(publicUser));
});

// GET /api/users/me - my profile
router.get('/me', async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json(publicUser(rows[0]));
});

// PUT /api/users/me - update my name / email
router.put(
  '/me',
  validate({ body: z.object({ name: z.string().trim().min(2).max(100).optional(), email: email.optional() }) }),
  async (req, res) => {
    const { rows } = await query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = now()
       WHERE id = $3 RETURNING *`,
      [req.body.name ?? null, req.body.email ?? null, req.user.id],
    );
    res.json(publicUser(rows[0]));
  },
);

// PUT /api/users/me/password - change my password (returns a fresh token)
router.put(
  '/me/password',
  validate({ body: z.object({ currentPassword: z.string().min(1), newPassword: password }) }),
  async (req, res) => {
    const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    if (!(await bcrypt.compare(req.body.currentPassword, rows[0].password_hash))) {
      throw badRequest('Current password is incorrect');
    }
    const hash = await bcrypt.hash(req.body.newPassword, 10);
    const updated = await query(
      `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [hash, req.user.id],
    );
    res.json({ message: 'Password changed', token: signToken(updated.rows[0]) });
  },
);

// PATCH /api/users/:id/role - managers can promote / demote users
router.patch(
  '/:id/role',
  requireRole('manager'),
  validate({ body: z.object({ role: z.enum(['manager', 'staff']) }) }),
  async (req, res) => {
    const id = parseId(req.params.id);
    if (id === req.user.id) throw badRequest('You cannot change your own role');
    const { rows } = await query('UPDATE users SET role = $1, updated_at = now() WHERE id = $2 RETURNING *', [
      req.body.role,
      id,
    ]);
    if (!rows[0]) throw notFound('User not found');
    res.json(publicUser(rows[0]));
  },
);

export default router;
