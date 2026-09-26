// End-to-end API tests. They need a separate, disposable PostgreSQL database:
//   TEST_DATABASE_URL=postgres://postgres:password@localhost:5432/stocksense_test npm test
// The database is wiped at the start of the run.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });
const testDbUrl = process.env.TEST_DATABASE_URL;
const skip = !testDbUrl ? 'set TEST_DATABASE_URL to run the API tests' : false;

let base;
let server;
let pool;

before(async () => {
  if (skip) return;
  if (!/test/i.test(new URL(testDbUrl).pathname)) {
    throw new Error('TEST_DATABASE_URL must point to a database whose name contains "test" (it gets wiped).');
  }
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDbUrl;
  process.env.JWT_SECRET = 'test-secret';
  delete process.env.SMTP_HOST;

  const { initDatabase } = await import('../src/db/init.js');
  await initDatabase({ reset: true });
  ({ pool } = await import('../src/db/pool.js'));
  const { createApp } = await import('../src/app.js');
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  server?.close();
  await pool?.end();
});

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const tokens = {};
const ids = {};

async function onHand(productId, locationId) {
  const res = await api('GET', `/api/stock?productId=${productId}&locationId=${locationId}&includeZero=true`, {
    token: tokens.manager,
  });
  return res.body.items[0]?.onHand ?? 0;
}

async function createOp(body, token = tokens.manager) {
  const res = await api('POST', '/api/operations', { token, body });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body;
}

describe('StockSense API', { skip }, () => {
  test('signup: first user is manager, next users are staff', async () => {
    const m = await api('POST', '/api/auth/signup', {
      body: { name: 'Maya Manager', email: 'Maya@Example.com', password: 'Secret123' },
    });
    assert.equal(m.status, 201);
    assert.equal(m.body.user.role, 'manager');
    assert.equal(m.body.user.email, 'maya@example.com');
    tokens.manager = m.body.token;

    const s = await api('POST', '/api/auth/signup', {
      body: { name: 'Sam Staff', email: 'sam@example.com', password: 'Secret123' },
    });
    assert.equal(s.body.user.role, 'staff');
    tokens.staff = s.body.token;

    const dup = await api('POST', '/api/auth/signup', {
      body: { name: 'Again', email: 'sam@example.com', password: 'Secret123' },
    });
    assert.equal(dup.status, 409);
  });

  test('signup validates input and login rejects a wrong password', async () => {
    const bad = await api('POST', '/api/auth/signup', { body: { name: 'X', email: 'nope', password: 'short' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.body.details.some((d) => d.field === 'email'));

    const wrong = await api('POST', '/api/auth/login', { body: { email: 'sam@example.com', password: 'Wrong1234' } });
    assert.equal(wrong.status, 401);

    const ok = await api('POST', '/api/auth/login', { body: { email: 'SAM@example.com', password: 'Secret123' } });
    assert.equal(ok.status, 200);
    tokens.staff = ok.body.token;
  });

  test('OTP password reset flow', async () => {
    const forgot = await api('POST', '/api/auth/forgot-password', { body: { email: 'sam@example.com' } });
    assert.equal(forgot.status, 200);
    const otp = forgot.body.devOtp;
    assert.match(otp, /^\d{6}$/);

    const unknown = await api('POST', '/api/auth/forgot-password', { body: { email: 'ghost@example.com' } });
    assert.equal(unknown.status, 200);
    assert.equal(unknown.body.devOtp, undefined);

    const wrongOtp = otp === '000000' ? '111111' : '000000';
    const bad = await api('POST', '/api/auth/verify-otp', { body: { email: 'sam@example.com', otp: wrongOtp } });
    assert.equal(bad.status, 400);
    const good = await api('POST', '/api/auth/verify-otp', { body: { email: 'sam@example.com', otp } });
    assert.equal(good.status, 200);

    const reset = await api('POST', '/api/auth/reset-password', {
      body: { email: 'sam@example.com', otp, newPassword: 'NewSecret456' },
    });
    assert.equal(reset.status, 200);

    // Old sessions are logged out and the OTP cannot be reused
    assert.equal((await api('GET', '/api/auth/me', { token: tokens.staff })).status, 401);
    const reuse = await api('POST', '/api/auth/reset-password', {
      body: { email: 'sam@example.com', otp, newPassword: 'Another789' },
    });
    assert.equal(reuse.status, 400);

    const login = await api('POST', '/api/auth/login', { body: { email: 'sam@example.com', password: 'NewSecret456' } });
    assert.equal(login.status, 200);
    tokens.staff = login.body.token;
  });

  test('warehouse gets a default Stock location; staff cannot manage master data', async () => {
    const wh = await api('POST', '/api/warehouses', {
      token: tokens.manager,
      body: { name: 'Main Warehouse', code: 'wh' },
    });
    assert.equal(wh.status, 201);
    assert.equal(wh.body.code, 'WH');
    assert.equal(wh.body.locations[0].fullCode, 'WH/STOCK');
    ids.wh = wh.body.id;
    ids.stock = wh.body.locations[0].id;

    const rack = await api('POST', '/api/locations', {
      token: tokens.manager,
      body: { warehouseId: ids.wh, name: 'Rack A', code: 'rack-a' },
    });
    assert.equal(rack.status, 201);
    ids.rack = rack.body.id;

    const denied = await api('POST', '/api/categories', { token: tokens.staff, body: { name: 'Nope' } });
    assert.equal(denied.status, 403);
  });

  test('product with initial stock is logged in the ledger', async () => {
    const cat = await api('POST', '/api/categories', { token: tokens.manager, body: { name: 'Raw Materials' } });
    ids.category = cat.body.id;

    const steel = await api('POST', '/api/products', {
      token: tokens.manager,
      body: {
        name: 'Steel Rods',
        sku: 'stl-01',
        categoryId: ids.category,
        uom: 'kg',
        initialStock: { locationId: ids.stock, quantity: 50 },
      },
    });
    assert.equal(steel.status, 201, JSON.stringify(steel.body));
    assert.equal(steel.body.sku, 'STL-01');
    assert.equal(steel.body.onHand, 50);
    ids.steel = steel.body.id;

    const chairs = await api('POST', '/api/products', {
      token: tokens.manager,
      body: { name: 'Chair', sku: 'CHR-01' },
    });
    ids.chair = chairs.body.id;

    const dupSku = await api('POST', '/api/products', { token: tokens.manager, body: { name: 'Other', sku: 'STL-01' } });
    assert.equal(dupSku.status, 409);

    const moves = await api('GET', `/api/moves?productId=${ids.steel}`, { token: tokens.manager });
    assert.equal(moves.body.total, 1);
    assert.equal(moves.body.items[0].moveType, 'adjustment');
    assert.equal(moves.body.items[0].direction, 'in');
  });

  test('receipt: draft -> ready -> done increases stock', async () => {
    const receipt = await createOp({
      type: 'receipt',
      partnerName: 'Tata Steel',
      destLocationId: ids.stock,
      lines: [{ productId: ids.steel, quantity: 100 }, { productId: ids.chair, quantity: 20 }],
    });
    assert.equal(receipt.status, 'draft');
    assert.match(receipt.reference, /^WH\/IN\/\d{4}$/);

    const confirmed = await api('POST', `/api/operations/${receipt.id}/confirm`, { token: tokens.manager });
    assert.equal(confirmed.body.status, 'ready');

    const done = await api('POST', `/api/operations/${receipt.id}/validate`, { token: tokens.staff });
    assert.equal(done.status, 200);
    assert.equal(done.body.status, 'done');
    assert.equal(await onHand(ids.steel, ids.stock), 150);
    assert.equal(await onHand(ids.chair, ids.stock), 20);

    const again = await api('POST', `/api/operations/${receipt.id}/validate`, { token: tokens.staff });
    assert.equal(again.status, 409);
    const cancel = await api('POST', `/api/operations/${receipt.id}/cancel`, { token: tokens.manager });
    assert.equal(cancel.status, 409);
  });

  test('delivery waits for stock, then pick -> pack -> validate decreases stock', async () => {
    const delivery = await createOp({
      type: 'delivery',
      partnerName: 'Acme Corp',
      sourceLocationId: ids.stock,
      lines: [{ productId: ids.chair, quantity: 30 }],
    });
    const confirmed = await api('POST', `/api/operations/${delivery.id}/confirm`, { token: tokens.manager });
    assert.equal(confirmed.body.status, 'waiting');
    assert.equal(confirmed.body.shortages[0].available, 20);

    const tooEarly = await api('POST', `/api/operations/${delivery.id}/validate`, { token: tokens.manager });
    assert.equal(tooEarly.status, 409);
    assert.equal(tooEarly.body.details[0].required, 30);

    // Receiving more chairs automatically makes the waiting delivery ready
    const receipt = await createOp({
      type: 'receipt',
      destLocationId: ids.stock,
      lines: [{ productId: ids.chair, quantity: 15 }],
    });
    await api('POST', `/api/operations/${receipt.id}/validate`, { token: tokens.manager });
    const refreshed = await api('GET', `/api/operations/${delivery.id}`, { token: tokens.manager });
    assert.equal(refreshed.body.status, 'ready');

    const packFirst = await api('POST', `/api/operations/${delivery.id}/pack`, { token: tokens.staff });
    assert.equal(packFirst.status, 409);
    assert.equal((await api('POST', `/api/operations/${delivery.id}/pick`, { token: tokens.staff })).status, 200);
    assert.equal((await api('POST', `/api/operations/${delivery.id}/pack`, { token: tokens.staff })).status, 200);

    const done = await api('POST', `/api/operations/${delivery.id}/validate`, { token: tokens.staff });
    assert.equal(done.body.status, 'done');
    assert.equal(await onHand(ids.chair, ids.stock), 5);
  });

  test('ready deliveries reserve stock for themselves', async () => {
    const first = await createOp({
      type: 'delivery',
      sourceLocationId: ids.stock,
      lines: [{ productId: ids.chair, quantity: 4 }],
    });
    assert.equal((await api('POST', `/api/operations/${first.id}/confirm`, { token: tokens.manager })).body.status, 'ready');

    const second = await createOp({
      type: 'delivery',
      sourceLocationId: ids.stock,
      lines: [{ productId: ids.chair, quantity: 2 }],
    });
    const res = await api('POST', `/api/operations/${second.id}/confirm`, { token: tokens.manager });
    assert.equal(res.body.status, 'waiting'); // only 1 of the 5 chairs is still free

    const product = await api('GET', `/api/products/${ids.chair}`, { token: tokens.manager });
    assert.equal(product.body.reserved, 4);
    assert.equal(product.body.freeToUse, 1);

    await api('POST', `/api/operations/${first.id}/cancel`, { token: tokens.manager });
    await api('POST', `/api/operations/${second.id}/cancel`, { token: tokens.manager });
  });

  test('concurrent deliveries can never take more stock than exists', async () => {
    const make = () =>
      createOp({ type: 'delivery', sourceLocationId: ids.stock, lines: [{ productId: ids.chair, quantity: 4 }] });
    const [a, b] = await Promise.all([make(), make()]);
    const results = await Promise.all(
      [a, b].map((op) => api('POST', `/api/operations/${op.id}/validate`, { token: tokens.manager })),
    );
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
    assert.equal(await onHand(ids.chair, ids.stock), 1);
  });

  test('internal transfer moves stock between locations', async () => {
    const transfer = await createOp({
      type: 'internal',
      sourceLocationId: ids.stock,
      destLocationId: ids.rack,
      lines: [{ productId: ids.steel, quantity: 40 }],
    });
    assert.match(transfer.reference, /^WH\/INT\//);
    const done = await api('POST', `/api/operations/${transfer.id}/validate`, { token: tokens.staff });
    assert.equal(done.body.status, 'done');
    assert.equal(await onHand(ids.steel, ids.stock), 110);
    assert.equal(await onHand(ids.steel, ids.rack), 40);

    const same = await api('POST', '/api/operations', {
      token: tokens.manager,
      body: { type: 'internal', sourceLocationId: ids.rack, destLocationId: ids.rack, lines: [{ productId: ids.steel, quantity: 1 }] },
    });
    assert.equal(same.status, 400);
  });

  test('stock adjustment by counted quantity and by difference', async () => {
    const counted = await api('POST', '/api/adjustments', {
      token: tokens.staff,
      body: { locationId: ids.stock, lines: [{ productId: ids.steel, countedQuantity: 97 }] },
    });
    assert.equal(counted.status, 201, JSON.stringify(counted.body));
    assert.equal(counted.body.status, 'done');
    assert.equal(counted.body.lines[0].systemQuantity, 110);
    assert.equal(await onHand(ids.steel, ids.stock), 97);

    const damaged = await api('POST', '/api/adjustments', {
      token: tokens.staff,
      body: { locationId: ids.stock, notes: 'Damaged', lines: [{ productId: ids.steel, difference: -3 }] },
    });
    assert.equal(damaged.status, 201);
    assert.equal(await onHand(ids.steel, ids.stock), 94);

    const tooMuch = await api('POST', '/api/adjustments', {
      token: tokens.staff,
      body: { locationId: ids.stock, lines: [{ productId: ids.steel, difference: -1000 }] },
    });
    assert.equal(tooMuch.status, 400);

    const moves = await api('GET', `/api/moves?productId=${ids.steel}&type=adjustment`, { token: tokens.manager });
    assert.deepEqual(
      moves.body.items.slice(0, 2).map((m) => [m.direction, m.quantity]),
      [['out', 3], ['out', 13]],
    );
  });

  test('editing and deleting operations follows the status rules', async () => {
    const op = await createOp({
      type: 'receipt',
      destLocationId: ids.stock,
      lines: [{ productId: ids.steel, quantity: 5 }],
    });
    await api('POST', `/api/operations/${op.id}/confirm`, { token: tokens.manager });

    const notesOnly = await api('PUT', `/api/operations/${op.id}`, { token: tokens.manager, body: { notes: 'Call first' } });
    assert.equal(notesOnly.body.status, 'ready');
    const newLines = await api('PUT', `/api/operations/${op.id}`, {
      token: tokens.manager,
      body: { lines: [{ productId: ids.steel, quantity: 8 }] },
    });
    assert.equal(newLines.body.status, 'draft');
    assert.equal(newLines.body.lines[0].quantity, 8);

    const dupLines = await api('PUT', `/api/operations/${op.id}`, {
      token: tokens.manager,
      body: { lines: [{ productId: ids.steel, quantity: 1 }, { productId: ids.steel, quantity: 2 }] },
    });
    assert.equal(dupLines.status, 400);

    assert.equal((await api('DELETE', `/api/operations/${op.id}`, { token: tokens.manager })).status, 204);
    assert.equal((await api('GET', `/api/operations/${op.id}`, { token: tokens.manager })).status, 404);
  });

  test('operation list filters', async () => {
    const receipts = await api('GET', '/api/operations?type=receipt&status=done', { token: tokens.manager });
    assert.ok(receipts.body.items.length >= 2);
    assert.ok(receipts.body.items.every((o) => o.type === 'receipt' && o.status === 'done'));

    const byCategory = await api('GET', `/api/operations?categoryId=${ids.category}`, { token: tokens.manager });
    assert.ok(byCategory.body.items.every((o) => o.type !== 'delivery'));

    const search = await api('GET', '/api/operations?search=tata', { token: tokens.manager });
    assert.equal(search.body.total, 1);

    const badFilter = await api('GET', '/api/operations?status=shipped', { token: tokens.manager });
    assert.equal(badFilter.status, 400);
  });

  test('operation lists include their product lines', async () => {
    const res = await api('GET', '/api/operations?type=receipt&status=done', { token: tokens.manager });
    const oldest = res.body.items.at(-1);
    assert.deepEqual(oldest.lineItems.map((l) => l.sku).sort(), ['CHR-01', 'STL-01']);
  });

  test('stock ledger keeps a running balance per location', async () => {
    const res = await api('GET', `/api/moves/ledger?productId=${ids.steel}&locationId=${ids.stock}&limit=100`, {
      token: tokens.manager,
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.items[0].balance, await onHand(ids.steel, ids.stock));
    const oldest = res.body.items.at(-1);
    assert.deepEqual([oldest.quantityIn, oldest.balance], [50, 50]);

    const transfer = await api('GET', `/api/moves/ledger?productId=${ids.steel}&type=internal`, {
      token: tokens.manager,
    });
    assert.deepEqual(
      transfer.body.items.map((r) => [r.locationId, r.quantityIn, r.quantityOut, r.balance]),
      [[ids.stock, 0, 40, 110], [ids.rack, 40, 0, 40]],
    );
  });

  test('dashboard movement series has one row per day', async () => {
    const res = await api('GET', '/api/dashboard/movement?days=7', { token: tokens.manager });
    assert.equal(res.status, 200);
    assert.equal(res.body.length, 7);
    const today = res.body.at(-1);
    assert.ok(today.inbound > 0 && today.outbound > 0 && today.internal > 0, JSON.stringify(today));
  });

  test('reorder rules drive low stock alerts and dashboard KPIs', async () => {
    const rule = await api('POST', '/api/reorder-rules', {
      token: tokens.manager,
      body: { productId: ids.chair, warehouseId: ids.wh, minQty: 10, maxQty: 50 },
    });
    assert.equal(rule.status, 201);
    assert.equal(rule.body.status, 'low');
    assert.equal(rule.body.suggestedQty, 49);

    const badRule = await api('POST', '/api/reorder-rules', {
      token: tokens.manager,
      body: { productId: ids.steel, warehouseId: ids.wh, minQty: 10, maxQty: 5 },
    });
    assert.equal(badRule.status, 400);

    const dash = await api('GET', '/api/dashboard', { token: tokens.manager });
    assert.equal(dash.status, 200);
    assert.equal(dash.body.kpis.totalProducts, 2);
    assert.equal(dash.body.kpis.lowStock, 1);
    assert.equal(dash.body.kpis.outOfStock, 0);
    assert.equal(dash.body.lowStockAlerts[0].productId, ids.chair);

    const alerts = await api('GET', '/api/alerts/low-stock', { token: tokens.manager });
    assert.equal(alerts.body.length, 1);
  });

  test('logout invalidates the token', async () => {
    assert.equal((await api('POST', '/api/auth/logout', { token: tokens.staff })).status, 200);
    assert.equal((await api('GET', '/api/products', { token: tokens.staff })).status, 401);
  });
});
