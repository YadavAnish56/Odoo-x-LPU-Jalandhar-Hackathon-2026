import { Router } from 'express';
import { z } from 'zod';
import { withTransaction } from '../../db/pool.js';
import { validate } from '../../middleware/validate.js';
import { id, nonNegativeQuantity, optionalText } from '../../utils/validators.js';
import { listQuerySchema } from './operations.schemas.js';
import { getOperation, listOperations } from './operations.service.js';
import { adjustStock } from './stock.service.js';

const router = Router();

// Each line gives either the physically counted quantity, or a +/- difference
// (e.g. difference: -3 for 3 damaged units).
const lineSchema = z
  .object({
    productId: id,
    countedQuantity: nonNegativeQuantity.optional(),
    difference: z.coerce
      .number()
      .refine((n) => n !== 0, 'Difference cannot be 0')
      .refine((n) => Math.abs(n * 1000 - Math.round(n * 1000)) < 1e-6, 'At most 3 decimal places')
      .optional(),
  })
  .refine((l) => (l.countedQuantity === undefined) !== (l.difference === undefined), {
    message: 'Provide either countedQuantity or difference',
  });

const createSchema = z.object({
  locationId: id,
  notes: optionalText(2000),
  lines: z.array(lineSchema).min(1, 'Add at least one product'),
});

// GET /api/adjustments - same filters as /api/operations
router.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  res.json(await listOperations({ ...req.validQuery, type: 'adjustment' }));
});

// POST /api/adjustments - applied immediately and logged in the stock ledger
router.post('/', validate({ body: createSchema }), async (req, res) => {
  const operation = await withTransaction(async (client) => {
    const operationId = await adjustStock(client, req.body, req.user.id);
    return getOperation(operationId, client);
  });
  res.status(201).json(operation);
});

export default router;
