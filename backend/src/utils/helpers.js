import { badRequest } from './httpError.js';

const toCamel = (key) => key.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

/** Converts snake_case keys from PostgreSQL rows (including nested JSON) to camelCase. */
export function camelize(value) {
  if (Array.isArray(value)) return value.map(camelize);
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [toCamel(k), camelize(v)]));
  }
  return value;
}

/** Parses a route parameter as a positive integer id. */
export function parseId(value, name = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw badRequest(`Invalid ${name}`);
  return id;
}

/** Rounds to the 3 decimals stored in the database, avoiding float noise like 0.30000000000000004. */
export const round3 = (n) => Math.round(n * 1000) / 1000;

/** Builds an ILIKE "contains" pattern, escaping the user's % and _ characters. */
export const likePattern = (text) => (text ? `%${text.replace(/[\\%_]/g, '\\$&')}%` : undefined);

/**
 * Small helper to build dynamic WHERE clauses with numbered parameters.
 * `?` in the snippet is replaced by the parameter placeholder ($1, $2, ...).
 */
export class WhereBuilder {
  constructor() {
    this.conditions = [];
    this.params = [];
  }

  add(sql, value) {
    if (value === undefined || value === null || value === '') return this;
    this.params.push(value);
    this.conditions.push(sql.replaceAll('?', `$${this.params.length}`));
    return this;
  }

  addRaw(sql) {
    this.conditions.push(sql);
    return this;
  }

  /** Adds a parameter without a condition and returns its placeholder. */
  param(value) {
    this.params.push(value);
    return `$${this.params.length}`;
  }

  toSql() {
    return this.conditions.length ? `WHERE ${this.conditions.join(' AND ')}` : '';
  }
}

/** Splits `rows` that carry a `total_count` window column into a paginated response. */
export function toPage(rows, { page, limit }) {
  const total = rows.length ? rows[0].total_count : 0;
  const items = rows.map(({ total_count, ...rest }) => camelize(rest));
  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}
