import { badRequest } from '../utils/httpError.js';

const formatIssues = (issues) =>
  issues.map((issue) => ({ field: issue.path.join('.') || null, message: issue.message }));

/**
 * Validates request input with zod schemas.
 * - body  -> replaces req.body with the parsed value
 * - query -> stored on req.validQuery (req.query is read-only in Express 5)
 */
export const validate = (schemas) => (req, res, next) => {
  if (schemas.query) {
    const result = schemas.query.safeParse(req.query ?? {});
    if (!result.success) throw badRequest('Invalid query parameters', formatIssues(result.error.issues));
    req.validQuery = result.data;
  }
  if (schemas.body) {
    const result = schemas.body.safeParse(req.body ?? {});
    if (!result.success) throw badRequest('Validation failed', formatIssues(result.error.issues));
    req.body = result.data;
  }
  next();
};
