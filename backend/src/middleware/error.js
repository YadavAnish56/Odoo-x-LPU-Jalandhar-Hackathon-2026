import { HttpError } from '../utils/httpError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// "Key (sku)=(ST-01) already exists." -> "sku 'ST-01' already exists"
function uniqueViolationMessage(err) {
  const match = /Key \((.+?)\)=\((.+?)\)/.exec(err.detail || '');
  return match ? `${match[1]} '${match[2]}' already exists` : 'Record already exists';
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  if (err.expose && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ error: err.message });
  }

  // PostgreSQL error codes
  switch (err.code) {
    case '23505':
      return res.status(409).json({ error: uniqueViolationMessage(err) });
    case '23503':
      return res.status(409).json({ error: 'Related record does not exist or is still in use' });
    case '23514':
      return res.status(400).json({ error: `Value not allowed (${err.constraint})` });
    case '22P02':
    case '22003':
    case '22007':
    case '22008':
      return res.status(400).json({ error: 'Invalid value in request' });
    default:
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
  }
}
