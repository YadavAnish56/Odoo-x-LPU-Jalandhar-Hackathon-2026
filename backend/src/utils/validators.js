import { z } from 'zod';

// Query strings and HTML forms often send "" for "not set".
const emptyToUndefined = (v) => (v === '' || v === null ? undefined : v);

const hasMax3Decimals = (n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6;

export const id = z.coerce.number().int().positive();
export const optionalId = z.preprocess(emptyToUndefined, id.optional());
export const nullableId = z.preprocess((v) => (v === '' ? null : v), id.nullable().optional());

export const quantity = z.coerce
  .number()
  .positive('Quantity must be greater than 0')
  .max(1e10)
  .refine(hasMax3Decimals, 'Quantity can have at most 3 decimal places');

export const nonNegativeQuantity = z.coerce
  .number()
  .min(0, 'Quantity cannot be negative')
  .max(1e10)
  .refine(hasMax3Decimals, 'Quantity can have at most 3 decimal places');

export const optionalDate = z.preprocess(emptyToUndefined, z.coerce.date().optional());

/** Date filter in YYYY-MM-DD format (what HTML date pickers send). */
export const dateOnly = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
);

export const optionalText = (max) =>
  z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

export const nullableText = (max) =>
  z.preprocess((v) => (v === '' ? null : v), z.string().trim().max(max).nullable().optional());

export const searchText = z.preprocess(emptyToUndefined, z.string().trim().max(100).optional());

export const optionalEnum = (values) => z.preprocess(emptyToUndefined, z.enum(values).optional());

export const booleanQuery = z.preprocess(
  (v) => (v === 'true' ? true : v === 'false' ? false : emptyToUndefined(v)),
  z.boolean().optional(),
);

export const pagination = {
  page: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).default(20)),
};

export const OPERATION_TYPES = ['receipt', 'delivery', 'internal', 'adjustment'];
export const OPERATION_STATUSES = ['draft', 'waiting', 'ready', 'done', 'canceled'];

/** Accepts `status=ready` or `status=draft,ready` and returns an array. */
export const statusList = z.preprocess(
  (v) => (typeof v === 'string' && v !== '' ? v.split(',').map((s) => s.trim()) : emptyToUndefined(v)),
  z.array(z.enum(OPERATION_STATUSES)).optional(),
);

export const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/[0-9]/, 'Password must contain a number');
