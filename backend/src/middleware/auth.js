import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { forbidden, unauthorized } from '../utils/httpError.js';

export function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, tv: user.token_version }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/** Requires a valid `Authorization: Bearer <token>` header and loads req.user. */
export async function requireAuth(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  } catch {
    throw unauthorized('Invalid or expired token');
  }

  const { rows } = await query('SELECT id, name, email, role, token_version FROM users WHERE id = $1', [
    Number(payload.sub),
  ]);
  const user = rows[0];
  // token_version changes on logout and password reset, which invalidates older tokens.
  if (!user || user.token_version !== payload.tv) {
    throw unauthorized('Session expired, please log in again');
  }

  req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  next();
}

/** Allows the request only for the given roles, e.g. requireRole('manager'). */
export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      throw forbidden(`Only ${roles.join(' / ')} users can do this`);
    }
    next();
  };
