import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../../config.js';
import { query, withTransaction } from '../../db/pool.js';
import { requireAuth, signToken } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { badRequest, HttpError, unauthorized } from '../../utils/httpError.js';
import { sendOtpEmail } from '../../utils/mailer.js';
import { email, password } from '../../utils/validators.js';

const router = Router();

const limiter = (limit) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => config.env === 'test',
    message: { error: 'Too many requests, please try again later' },
  });

export const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  role: u.role,
  createdAt: u.created_at,
});

const hashOtp = (otp) => crypto.createHmac('sha256', config.jwtSecret).update(otp).digest('hex');

const otpMatches = (storedHash, otp) =>
  crypto.timingSafeEqual(Buffer.from(storedHash, 'hex'), Buffer.from(hashOtp(otp), 'hex'));

// Used so a login with an unknown email takes as long as one with a wrong password.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const otpField = z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits');

// POST /api/auth/signup
router.post(
  '/signup',
  limiter(20),
  validate({ body: z.object({ name: z.string().trim().min(2).max(100), email, password }) }),
  async (req, res) => {
    const { name, email: userEmail, password: plain } = req.body;
    const hash = await bcrypt.hash(plain, 10);
    // The very first account becomes the manager; everyone after that starts as staff.
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, CASE WHEN EXISTS (SELECT 1 FROM users) THEN 'staff' ELSE 'manager' END)
       RETURNING *`,
      [name, userEmail, hash],
    );
    res.status(201).json({ token: signToken(rows[0]), user: publicUser(rows[0]) });
  },
);

// POST /api/auth/login
router.post(
  '/login',
  limiter(30),
  validate({ body: z.object({ email, password: z.string().min(1, 'Password is required') }) }),
  async (req, res) => {
    const { rows } = await query('SELECT * FROM users WHERE email = $1', [req.body.email]);
    const user = rows[0];
    const valid = await bcrypt.compare(req.body.password, user?.password_hash ?? DUMMY_HASH);
    if (!user || !valid) throw unauthorized('Invalid email or password');
    res.json({ token: signToken(user), user: publicUser(user) });
  },
);

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json(publicUser(rows[0]));
});

// POST /api/auth/logout - invalidates every token issued to this user so far.
router.post('/logout', requireAuth, async (req, res) => {
  await query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [req.user.id]);
  res.json({ message: 'Logged out' });
});

// POST /api/auth/forgot-password - sends a 6 digit OTP to the email.
router.post(
  '/forgot-password',
  limiter(10),
  validate({ body: z.object({ email }) }),
  async (req, res) => {
    // Same answer whether or not the email exists, so accounts cannot be discovered.
    const response = { message: 'If an account exists for this email, an OTP has been sent.' };

    const { rows } = await query('SELECT id, name, email FROM users WHERE email = $1', [req.body.email]);
    const user = rows[0];
    if (!user) return res.json(response);

    const recent = await query(
      `SELECT 1 FROM password_reset_otps
       WHERE user_id = $1 AND used_at IS NULL AND created_at > now() - make_interval(secs => $2)`,
      [user.id, config.otp.resendCooldownSeconds],
    );
    if (recent.rowCount) return res.json(response);

    const otp = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await withTransaction(async (client) => {
      await client.query('UPDATE password_reset_otps SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [
        user.id,
      ]);
      await client.query(
        `INSERT INTO password_reset_otps (user_id, otp_hash, expires_at)
         VALUES ($1, $2, now() + make_interval(mins => $3))`,
        [user.id, hashOtp(otp), config.otp.expiryMinutes],
      );
    });

    try {
      await sendOtpEmail(user, otp);
    } catch (err) {
      console.error('Failed to send OTP email:', err.message);
      throw new HttpError(502, 'Could not send the OTP email, please try again later');
    }

    res.json(config.exposeDevOtp ? { ...response, devOtp: otp } : response);
  },
);

/** Checks the latest active OTP for the email. Wrong guesses are counted. */
async function checkOtp(userEmail, otp) {
  const { rows } = await query(
    `SELECT o.id, o.otp_hash, o.attempts, o.user_id
     FROM password_reset_otps o
     JOIN users u ON u.id = o.user_id
     WHERE u.email = $1 AND o.used_at IS NULL AND o.expires_at > now()
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [userEmail],
  );
  const record = rows[0];
  if (!record) throw badRequest('Invalid or expired OTP');
  if (record.attempts >= config.otp.maxAttempts) {
    throw badRequest('Too many wrong attempts. Please request a new OTP');
  }
  if (!otpMatches(record.otp_hash, otp)) {
    await query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [record.id]);
    throw badRequest('Invalid or expired OTP');
  }
  return record;
}

// POST /api/auth/verify-otp - lets the frontend check the OTP before asking for a new password.
router.post(
  '/verify-otp',
  limiter(20),
  validate({ body: z.object({ email, otp: otpField }) }),
  async (req, res) => {
    await checkOtp(req.body.email, req.body.otp);
    res.json({ valid: true });
  },
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  limiter(20),
  validate({ body: z.object({ email, otp: otpField, newPassword: password }) }),
  async (req, res) => {
    const record = await checkOtp(req.body.email, req.body.otp);
    const hash = await bcrypt.hash(req.body.newPassword, 10);

    await withTransaction(async (client) => {
      const used = await client.query(
        'UPDATE password_reset_otps SET used_at = now() WHERE id = $1 AND used_at IS NULL RETURNING id',
        [record.id],
      );
      if (!used.rowCount) throw badRequest('Invalid or expired OTP');
      // Bumping token_version logs the user out everywhere.
      await client.query(
        `UPDATE users SET password_hash = $1, token_version = token_version + 1, updated_at = now()
         WHERE id = $2`,
        [hash, record.user_id],
      );
    });

    res.json({ message: 'Password has been reset. Please log in with your new password.' });
  },
);

export default router;
