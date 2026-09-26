// Low-level stock helpers shared by operations, adjustments and products.
// Every function takes a transaction `client` so callers control commit / rollback.
import { badRequest, conflict } from '../../utils/httpError.js';
import { camelize, round3 } from '../../utils/helpers.js';

const PREFIX = { receipt: 'IN', delivery: 'OUT', internal: 'INT', adjustment: 'ADJ' };

/** Returns the next reference for a warehouse and operation type, e.g. WH/IN/0007. */
export async function nextReference(client, warehouseCode, type) {
  const key = `${warehouseCode}/${PREFIX[type]}`;
  const { rows } = await client.query(
    `INSERT INTO sequences (key, last_value) VALUES ($1, 1)
     ON CONFLICT (key) DO UPDATE SET last_value = sequences.last_value + 1
     RETURNING last_value`,
    [key],
  );
  return `${key}/${String(rows[0].last_value).padStart(4, '0')}`;
}

/** Loads an active location together with its warehouse code. */
export async function loadLocation(client, locationId, label = 'Location') {
  const { rows } = await client.query(
    `SELECT l.id, l.is_active, l.warehouse_id, w.code AS warehouse_code, w.is_active AS warehouse_active
     FROM locations l JOIN warehouses w ON w.id = l.warehouse_id
     WHERE l.id = $1`,
    [locationId],
  );
  const location = rows[0];
  if (!location) throw badRequest(`${label} not found`);
  if (!location.is_active || !location.warehouse_active) throw badRequest(`${label} is archived`);
  return location;
}

export async function assertProductsActive(client, productIds) {
  const { rows } = await client.query('SELECT id FROM products WHERE id = ANY($1::int[]) AND is_active', [
    productIds,
  ]);
  const found = new Set(rows.map((r) => r.id));
  const missing = productIds.filter((pid) => !found.has(pid));
  if (missing.length) throw badRequest(`Product not found or archived: ${missing.join(', ')}`);
}

export function assertUniqueProducts(lines) {
  const ids = lines.map((l) => l.productId);
  if (new Set(ids).size !== ids.length) throw badRequest('Each product can appear only once per operation');
}

export async function addStock(client, productId, locationId, quantity) {
  await client.query(
    `INSERT INTO stock_quants (product_id, location_id, quantity) VALUES ($1, $2, $3)
     ON CONFLICT (product_id, location_id)
     DO UPDATE SET quantity = stock_quants.quantity + EXCLUDED.quantity, updated_at = now()`,
    [productId, locationId, quantity],
  );
}

export async function removeStock(client, productId, locationId, quantity) {
  // The quantity >= $3 condition makes this safe even under concurrent requests.
  const { rowCount } = await client.query(
    `UPDATE stock_quants SET quantity = quantity - $3, updated_at = now()
     WHERE product_id = $1 AND location_id = $2 AND quantity >= $3`,
    [productId, locationId, quantity],
  );
  if (!rowCount) throw conflict('Not enough stock to complete this operation');
}

/**
 * For each line of an outgoing operation (delivery / internal transfer):
 * stock on hand at the source location, stock reserved there by other "ready"
 * operations, and how much is still available for this one.
 * With `lock`, the stock rows are locked until the transaction ends.
 */
export async function getAvailability(client, operation, { lock = false } = {}) {
  if (lock) {
    await client.query(
      `SELECT 1 FROM stock_quants
       WHERE location_id = $1 AND product_id IN (SELECT product_id FROM operation_lines WHERE operation_id = $2)
       ORDER BY product_id
       FOR UPDATE`,
      [operation.source_location_id, operation.id],
    );
  }
  const { rows } = await client.query(
    `SELECT l.product_id, p.name AS product_name, p.sku, l.quantity AS required,
       COALESCE(q.quantity, 0) AS on_hand,
       COALESCE((
         SELECT SUM(ol.quantity) FROM operation_lines ol
         JOIN operations o ON o.id = ol.operation_id
         WHERE o.status = 'ready' AND o.type IN ('delivery', 'internal')
           AND o.source_location_id = $2 AND ol.product_id = l.product_id AND o.id <> $1
       ), 0) AS reserved
     FROM operation_lines l
     JOIN products p ON p.id = l.product_id
     LEFT JOIN stock_quants q ON q.product_id = l.product_id AND q.location_id = $2
     WHERE l.operation_id = $1
     ORDER BY l.product_id`,
    [operation.id, operation.source_location_id],
  );
  return rows.map((r) => ({ ...r, available: Math.max(0, round3(r.on_hand - r.reserved)) }));
}

/** Lines that cannot be fulfilled right now (empty array = everything is available). */
export function findShortages(availability) {
  return availability.filter((a) => a.available < a.required).map((a) => camelize(a));
}

/**
 * After stock arrives in a location, promote "waiting" operations that take stock
 * from it to "ready" when they can now be fulfilled (oldest scheduled first).
 */
export async function refreshWaitingOperations(client, locationId) {
  const { rows } = await client.query(
    `SELECT * FROM operations
     WHERE status = 'waiting' AND source_location_id = $1
     ORDER BY scheduled_date, id
     LIMIT 50
     FOR UPDATE`,
    [locationId],
  );
  for (const op of rows) {
    if (!findShortages(await getAvailability(client, op)).length) {
      await client.query(`UPDATE operations SET status = 'ready', updated_at = now() WHERE id = $1`, [op.id]);
    }
  }
}

/**
 * Stock adjustment: sets the stock of each product in a location to the counted
 * quantity (or changes it by `difference`) and logs the change in the ledger.
 * Returns the id of the created adjustment operation (status "done").
 */
export async function adjustStock(client, { locationId, lines, notes }, userId) {
  assertUniqueProducts(lines);
  const location = await loadLocation(client, locationId);
  await assertProductsActive(
    client,
    lines.map((l) => l.productId),
  );

  const reference = await nextReference(client, location.warehouse_code, 'adjustment');
  const { rows } = await client.query(
    `INSERT INTO operations
       (reference, type, status, warehouse_id, source_location_id, dest_location_id, notes,
        responsible_id, created_by, scheduled_date, done_at)
     VALUES ($1, 'adjustment', 'done', $2, $3, $3, $4, $5, $5, now(), now())
     RETURNING id`,
    [reference, location.warehouse_id, location.id, notes ?? null, userId],
  );
  const operationId = rows[0].id;
  let stockIncreased = false;

  const sorted = [...lines].sort((a, b) => a.productId - b.productId);
  for (const line of sorted) {
    const current = await client.query(
      'SELECT quantity FROM stock_quants WHERE product_id = $1 AND location_id = $2 FOR UPDATE',
      [line.productId, location.id],
    );
    const systemQty = current.rows[0]?.quantity ?? 0;
    const counted = line.countedQuantity ?? round3(systemQty + line.difference);
    if (counted < 0) {
      throw badRequest(`Cannot remove more than the ${systemQty} on hand (product ${line.productId})`);
    }
    const diff = round3(counted - systemQty);

    await client.query(
      `INSERT INTO stock_quants (product_id, location_id, quantity) VALUES ($1, $2, $3)
       ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = now()`,
      [line.productId, location.id, counted],
    );
    await client.query(
      `INSERT INTO operation_lines (operation_id, product_id, quantity, system_quantity) VALUES ($1, $2, $3, $4)`,
      [operationId, line.productId, counted, systemQty],
    );
    if (diff !== 0) {
      stockIncreased ||= diff > 0;
      await client.query(
        `INSERT INTO stock_moves
           (operation_id, reference, move_type, product_id, from_location_id, to_location_id, quantity, created_by)
         VALUES ($1, $2, 'adjustment', $3, $4, $5, $6, $7)`,
        [operationId, reference, line.productId, diff < 0 ? location.id : null, diff > 0 ? location.id : null,
          Math.abs(diff), userId],
      );
    }
  }

  if (stockIncreased) await refreshWaitingOperations(client, location.id);
  return operationId;
}
