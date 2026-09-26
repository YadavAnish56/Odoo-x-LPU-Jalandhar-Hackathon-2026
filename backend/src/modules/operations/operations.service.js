// Receipts, delivery orders and internal transfers.
//
// Status flow:  draft --confirm--> ready (stock available) / waiting (not enough stock)
//               ready --validate--> done (stock is moved and logged in stock_moves)
//               draft / waiting / ready --cancel--> canceled
import { pool, withTransaction } from '../../db/pool.js';
import { badRequest, conflict, notFound } from '../../utils/httpError.js';
import { camelize, likePattern, toPage, WhereBuilder } from '../../utils/helpers.js';
import {
  addStock,
  assertProductsActive,
  assertUniqueProducts,
  findShortages,
  getAvailability,
  loadLocation,
  nextReference,
  refreshWaitingOperations,
  removeStock,
} from './stock.service.js';

export const OPEN_STATUSES = ['draft', 'waiting', 'ready'];

const OPERATION_COLUMNS = `
  o.*, w.name AS warehouse_name, w.code AS warehouse_code,
  sl.name AS source_location_name, sw.code || '/' || sl.code AS source_location_code,
  dl.name AS dest_location_name, dw.code || '/' || dl.code AS dest_location_code,
  ru.name AS responsible_name, cu.name AS created_by_name,
  (o.status IN ('draft', 'waiting', 'ready') AND o.scheduled_date < now()) AS is_late,
  (SELECT COUNT(*) FROM operation_lines x WHERE x.operation_id = o.id) AS line_count,
  (SELECT COALESCE(SUM(x.quantity), 0) FROM operation_lines x WHERE x.operation_id = o.id) AS total_quantity`;

const OPERATION_JOINS = `
  FROM operations o
  JOIN warehouses w ON w.id = o.warehouse_id
  LEFT JOIN locations sl ON sl.id = o.source_location_id
  LEFT JOIN warehouses sw ON sw.id = sl.warehouse_id
  LEFT JOIN locations dl ON dl.id = o.dest_location_id
  LEFT JOIN warehouses dw ON dw.id = dl.warehouse_id
  LEFT JOIN users ru ON ru.id = o.responsible_id
  LEFT JOIN users cu ON cu.id = o.created_by`;

/** Full operation with its product lines. `onHand` = stock at the source (or destination for receipts). */
export async function getOperation(id, db = pool) {
  const { rows } = await db.query(`SELECT ${OPERATION_COLUMNS} ${OPERATION_JOINS} WHERE o.id = $1`, [id]);
  const op = rows[0];
  if (!op) throw notFound('Operation not found');
  const lines = await db.query(
    `SELECT l.id, l.product_id, p.name AS product_name, p.sku, p.uom, l.quantity, l.system_quantity,
       COALESCE(q.quantity, 0) AS on_hand
     FROM operation_lines l
     JOIN products p ON p.id = l.product_id
     LEFT JOIN stock_quants q ON q.product_id = l.product_id AND q.location_id = $2
     WHERE l.operation_id = $1
     ORDER BY l.id`,
    [id, op.source_location_id ?? op.dest_location_id],
  );
  return camelize({ ...op, lines: lines.rows });
}

export async function listOperations(f) {
  const where = new WhereBuilder()
    .add('o.type = ?', f.type)
    .add('o.status = ANY(?)', f.status?.length ? f.status : undefined)
    .add('o.warehouse_id = ?', f.warehouseId)
    .add('(o.source_location_id = ? OR o.dest_location_id = ?)', f.locationId)
    .add(
      `EXISTS (SELECT 1 FROM operation_lines x JOIN products xp ON xp.id = x.product_id
               WHERE x.operation_id = o.id AND xp.category_id = ?)`,
      f.categoryId,
    )
    .add('EXISTS (SELECT 1 FROM operation_lines x WHERE x.operation_id = o.id AND x.product_id = ?)', f.productId)
    .add(
      `(o.reference ILIKE ? OR o.partner_name ILIKE ? OR EXISTS (
         SELECT 1 FROM operation_lines x JOIN products xp ON xp.id = x.product_id
         WHERE x.operation_id = o.id AND (xp.name ILIKE ? OR xp.sku ILIKE ?)))`,
      likePattern(f.search),
    )
    .add('o.scheduled_date >= ?::date', f.dateFrom)
    .add(`o.scheduled_date < ?::date + 1`, f.dateTo);
  if (f.late) where.addRaw(`o.status IN ('draft', 'waiting', 'ready') AND o.scheduled_date < now()`);

  const orderBy = f.sort === 'scheduled' ? 'o.scheduled_date ASC, o.id ASC' : 'o.created_at DESC, o.id DESC';
  const limit = where.param(f.limit);
  const offset = where.param((f.page - 1) * f.limit);
  const { rows } = await pool.query(
    `SELECT ${OPERATION_COLUMNS}, COUNT(*) OVER() AS total_count
     ${OPERATION_JOINS}
     ${where.toSql()}
     ORDER BY ${orderBy}
     LIMIT ${limit} OFFSET ${offset}`,
    where.params,
  );
  return toPage(rows, f);
}

async function lockOperation(client, id) {
  const { rows } = await client.query('SELECT * FROM operations WHERE id = $1 FOR UPDATE', [id]);
  if (!rows[0]) throw notFound('Operation not found');
  return rows[0];
}

function assertEditable(op, action) {
  if (op.type === 'adjustment') throw badRequest('Adjustments are applied immediately and cannot be changed');
  if (!OPEN_STATUSES.includes(op.status)) throw conflict(`Cannot ${action} an operation that is ${op.status}`);
}

/** Checks the source / destination rules for each type and returns the owning warehouse. */
async function resolveLocations(client, type, sourceLocationId, destLocationId) {
  if (type === 'receipt') {
    if (!destLocationId) throw badRequest('destLocationId is required for a receipt');
    const dest = await loadLocation(client, destLocationId, 'Destination location');
    return { sourceId: null, destId: dest.id, warehouseId: dest.warehouse_id, warehouseCode: dest.warehouse_code };
  }
  if (type === 'delivery') {
    if (!sourceLocationId) throw badRequest('sourceLocationId is required for a delivery');
    const src = await loadLocation(client, sourceLocationId, 'Source location');
    return { sourceId: src.id, destId: null, warehouseId: src.warehouse_id, warehouseCode: src.warehouse_code };
  }
  if (!sourceLocationId || !destLocationId) {
    throw badRequest('sourceLocationId and destLocationId are required for an internal transfer');
  }
  if (sourceLocationId === destLocationId) throw badRequest('Source and destination must be different');
  const src = await loadLocation(client, sourceLocationId, 'Source location');
  const dest = await loadLocation(client, destLocationId, 'Destination location');
  return { sourceId: src.id, destId: dest.id, warehouseId: src.warehouse_id, warehouseCode: src.warehouse_code };
}

async function assertUserExists(client, userId) {
  const { rowCount } = await client.query('SELECT 1 FROM users WHERE id = $1', [userId]);
  if (!rowCount) throw badRequest('Responsible user not found');
}

async function replaceLines(client, operationId, lines) {
  assertUniqueProducts(lines);
  await assertProductsActive(
    client,
    lines.map((l) => l.productId),
  );
  await client.query('DELETE FROM operation_lines WHERE operation_id = $1', [operationId]);
  await client.query(
    `INSERT INTO operation_lines (operation_id, product_id, quantity)
     SELECT $1, * FROM unnest($2::int[], $3::numeric[])`,
    [operationId, lines.map((l) => l.productId), lines.map((l) => l.quantity)],
  );
}

export async function createOperation(data, userId) {
  return withTransaction(async (client) => {
    const loc = await resolveLocations(client, data.type, data.sourceLocationId, data.destLocationId);
    if (data.responsibleId) await assertUserExists(client, data.responsibleId);
    const reference = await nextReference(client, loc.warehouseCode, data.type);
    const { rows } = await client.query(
      `INSERT INTO operations
         (reference, type, warehouse_id, source_location_id, dest_location_id, partner_name,
          scheduled_date, responsible_id, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()), $8, $9, $10)
       RETURNING id`,
      [reference, data.type, loc.warehouseId, loc.sourceId, loc.destId, data.partnerName ?? null,
        data.scheduledDate ?? null, data.responsibleId ?? userId, data.notes ?? null, userId],
    );
    await replaceLines(client, rows[0].id, data.lines);
    return getOperation(rows[0].id, client);
  });
}

/** Edits an open operation. Changing products or locations sends it back to draft. */
export async function updateOperation(id, data) {
  return withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    assertEditable(op, 'edit');

    const sourceId = data.sourceLocationId !== undefined ? data.sourceLocationId : op.source_location_id;
    const destId = data.destLocationId !== undefined ? data.destLocationId : op.dest_location_id;
    const loc = await resolveLocations(client, op.type, sourceId, destId);
    if (data.responsibleId) await assertUserExists(client, data.responsibleId);
    if (data.lines) await replaceLines(client, id, data.lines);

    const needsReconfirm = Boolean(data.lines) || loc.sourceId !== op.source_location_id || loc.destId !== op.dest_location_id;
    await client.query(
      `UPDATE operations SET
         source_location_id = $1, dest_location_id = $2, warehouse_id = $3,
         partner_name = CASE WHEN $4::boolean THEN $5 ELSE partner_name END,
         scheduled_date = COALESCE($6, scheduled_date),
         responsible_id = COALESCE($7, responsible_id),
         notes = CASE WHEN $8::boolean THEN $9 ELSE notes END,
         status = CASE WHEN $10::boolean THEN 'draft' ELSE status END,
         picked_at = CASE WHEN $10::boolean THEN NULL ELSE picked_at END,
         packed_at = CASE WHEN $10::boolean THEN NULL ELSE packed_at END,
         updated_at = now()
       WHERE id = $11`,
      [loc.sourceId, loc.destId, loc.warehouseId, data.partnerName !== undefined, data.partnerName ?? null,
        data.scheduledDate ?? null, data.responsibleId ?? null, data.notes !== undefined, data.notes ?? null,
        needsReconfirm, id],
    );
    return getOperation(id, client);
  });
}

/** draft/waiting/ready -> ready or waiting, depending on stock availability. */
export async function confirmOperation(id) {
  return withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    assertEditable(op, 'confirm');

    let shortages = [];
    if (op.type !== 'receipt') {
      const availability = await getAvailability(client, op);
      if (!availability.length) throw badRequest('Add at least one product before confirming');
      shortages = findShortages(availability);
    } else {
      const { rowCount } = await client.query('SELECT 1 FROM operation_lines WHERE operation_id = $1', [id]);
      if (!rowCount) throw badRequest('Add at least one product before confirming');
    }

    const status = shortages.length ? 'waiting' : 'ready';
    await client.query('UPDATE operations SET status = $1, updated_at = now() WHERE id = $2', [status, id]);
    return { ...(await getOperation(id, client)), shortages };
  });
}

/** Delivery pick / pack steps (optional - validate completes them automatically). */
export async function markDeliveryStep(id, step) {
  return withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    if (op.type !== 'delivery') throw badRequest(`Only delivery orders can be ${step}ed`);
    if (op.status !== 'ready') throw conflict(`Only ready deliveries can be ${step}ed (current status: ${op.status})`);
    if (step === 'pack' && !op.picked_at) throw conflict('Pick the items before packing');
    const column = step === 'pick' ? 'picked_at' : 'packed_at';
    await client.query(`UPDATE operations SET ${column} = COALESCE(${column}, now()), updated_at = now() WHERE id = $1`, [
      id,
    ]);
    return getOperation(id, client);
  });
}

/** Moves the stock and logs every line in the stock ledger. */
export async function validateOperation(id, userId) {
  return withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    assertEditable(op, 'validate');

    const { rows: lines } = await client.query(
      'SELECT product_id, quantity FROM operation_lines WHERE operation_id = $1 ORDER BY product_id',
      [id],
    );
    if (!lines.length) throw badRequest('Add at least one product before validating');

    if (op.type !== 'receipt') {
      const shortages = findShortages(await getAvailability(client, op, { lock: true }));
      if (shortages.length) throw conflict('Not enough stock to validate this operation', shortages);
    }

    for (const line of lines) {
      if (op.source_location_id) await removeStock(client, line.product_id, op.source_location_id, line.quantity);
      if (op.dest_location_id) await addStock(client, line.product_id, op.dest_location_id, line.quantity);
    }

    await client.query(
      `INSERT INTO stock_moves
         (operation_id, reference, move_type, product_id, from_location_id, to_location_id, quantity, partner_name, created_by)
       SELECT $1, $2, $3, l.product_id, $4, $5, l.quantity, $6, $7
       FROM operation_lines l WHERE l.operation_id = $1 AND l.quantity > 0`,
      [op.id, op.reference, op.type, op.source_location_id, op.dest_location_id, op.partner_name, userId],
    );

    await client.query(
      `UPDATE operations SET status = 'done', done_at = now(), updated_at = now(),
         picked_at = CASE WHEN type = 'delivery' THEN COALESCE(picked_at, now()) END,
         packed_at = CASE WHEN type = 'delivery' THEN COALESCE(packed_at, now()) END
       WHERE id = $1`,
      [id],
    );

    // New stock may unblock deliveries / transfers that were waiting for it.
    if (op.dest_location_id) await refreshWaitingOperations(client, op.dest_location_id);
    return getOperation(id, client);
  });
}

export async function cancelOperation(id) {
  return withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    assertEditable(op, 'cancel');
    await client.query(`UPDATE operations SET status = 'canceled', updated_at = now() WHERE id = $1`, [id]);
    return getOperation(id, client);
  });
}

export async function deleteOperation(id) {
  await withTransaction(async (client) => {
    const op = await lockOperation(client, id);
    if (!['draft', 'canceled'].includes(op.status)) {
      throw conflict('Only draft or canceled operations can be deleted');
    }
    await client.query('DELETE FROM operations WHERE id = $1', [id]);
  });
}
