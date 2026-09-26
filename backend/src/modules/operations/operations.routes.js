import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validate.js';
import { parseId } from '../../utils/helpers.js';
import { id, nullableText, optionalDate, optionalId, optionalText, quantity } from '../../utils/validators.js';
import { listQuerySchema } from './operations.schemas.js';
import {
  cancelOperation,
  confirmOperation,
  createOperation,
  deleteOperation,
  getOperation,
  listOperations,
  markDeliveryStep,
  updateOperation,
  validateOperation,
} from './operations.service.js';

const router = Router();

const lineSchema = z.object({ productId: id, quantity });

const createSchema = z.object({
  type: z.enum(['receipt', 'delivery', 'internal']),
  sourceLocationId: optionalId,
  destLocationId: optionalId,
  partnerName: optionalText(150),
  scheduledDate: optionalDate,
  responsibleId: optionalId,
  notes: optionalText(2000),
  lines: z.array(lineSchema).min(1, 'Add at least one product'),
});

const updateSchema = z.object({
  sourceLocationId: optionalId,
  destLocationId: optionalId,
  partnerName: nullableText(150),
  scheduledDate: optionalDate,
  responsibleId: optionalId,
  notes: nullableText(2000),
  lines: z.array(lineSchema).min(1, 'Add at least one product').optional(),
});

// GET /api/operations?type=receipt&status=draft,ready&warehouseId=1&categoryId=2&search=WH/IN&page=1
router.get('/', validate({ query: listQuerySchema }), async (req, res) => {
  res.json(await listOperations(req.validQuery));
});

// GET /api/operations/:id
router.get('/:id', async (req, res) => {
  res.json(await getOperation(parseId(req.params.id)));
});

// POST /api/operations - create a receipt, delivery order or internal transfer (status: draft)
router.post('/', validate({ body: createSchema }), async (req, res) => {
  res.status(201).json(await createOperation(req.body, req.user.id));
});

// PUT /api/operations/:id - edit while draft / waiting / ready
router.put('/:id', validate({ body: updateSchema }), async (req, res) => {
  res.json(await updateOperation(parseId(req.params.id), req.body));
});

// POST /api/operations/:id/confirm - draft -> ready (or waiting if stock is missing)
router.post('/:id/confirm', async (req, res) => {
  res.json(await confirmOperation(parseId(req.params.id)));
});

// POST /api/operations/:id/check-availability - re-check stock for a waiting operation
router.post('/:id/check-availability', async (req, res) => {
  res.json(await confirmOperation(parseId(req.params.id)));
});

// POST /api/operations/:id/pick and /pack - delivery steps
router.post('/:id/pick', async (req, res) => {
  res.json(await markDeliveryStep(parseId(req.params.id), 'pick'));
});

router.post('/:id/pack', async (req, res) => {
  res.json(await markDeliveryStep(parseId(req.params.id), 'pack'));
});

// POST /api/operations/:id/validate - moves the stock (receipt +, delivery -, transfer moves)
router.post('/:id/validate', async (req, res) => {
  res.json(await validateOperation(parseId(req.params.id), req.user.id));
});

// POST /api/operations/:id/cancel
router.post('/:id/cancel', async (req, res) => {
  res.json(await cancelOperation(parseId(req.params.id)));
});

// DELETE /api/operations/:id - only draft or canceled
router.delete('/:id', async (req, res) => {
  await deleteOperation(parseId(req.params.id));
  res.status(204).end();
});

export default router;
