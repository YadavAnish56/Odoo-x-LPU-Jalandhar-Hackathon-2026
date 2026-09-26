import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const env = process.env.NODE_ENV || 'development';

function required(name, devDefault) {
  const value = process.env[name];
  if (value) return value;
  if (env === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devDefault;
}

const smtpHost = process.env.SMTP_HOST || '';

// Behind a hosting proxy (Render, Railway, Nginx...) the visitor's IP is in X-Forwarded-For.
// TRUST_PROXY = number of proxies in front of the app, "true" or "false". Default: 1 in production.
function trustProxy(value) {
  if (value === undefined || value === '') return env === 'production' ? 1 : false;
  if (value === 'true' || value === 'false') return value === 'true';
  return Number(value);
}

export const config = {
  env,
  isProduction: env === 'production',
  port: Number(process.env.PORT) || 5000,
  trustProxy: trustProxy(process.env.TRUST_PROXY),
  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/stocksense'),
  jwtSecret: required('JWT_SECRET', 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Comma separated list of allowed origins, or * for any origin.
  corsOrigin:
    !process.env.CORS_ORIGIN || process.env.CORS_ORIGIN === '*'
      ? '*'
      : process.env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  otp: {
    expiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES) || 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  },
  // Public demo accounts (their passwords are shown on the sign-in page). Their reset code is
  // shown on screen instead of being emailed. DEMO_EMAILS= (empty) turns this off.
  demoEmails: (process.env.DEMO_EMAILS ?? 'manager@stocksense.com,staff@stocksense.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  smtp: {
    enabled: Boolean(smtpHost),
    host: smtpHost,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'StockSense <no-reply@stocksense.local>',
  },
};

// Without SMTP in development, the OTP is printed to the console and returned
// in the API response so the frontend can be tested end to end.
config.exposeDevOtp = !config.isProduction && !config.smtp.enabled;
