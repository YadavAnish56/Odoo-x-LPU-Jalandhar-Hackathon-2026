// Fills an empty database with demo data: users, warehouses, products and a
// realistic history of receipts, deliveries, transfers and adjustments.
//   npm run db:seed
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import {
  cancelOperation,
  confirmOperation,
  createOperation,
  validateOperation,
} from '../modules/operations/operations.service.js';
import { adjustStock } from '../modules/operations/stock.service.js';
import { initDatabase } from './init.js';
import { pool, withTransaction } from './pool.js';

export const DEMO_USERS = [
  { name: 'Inventory Manager', email: 'manager@stocksense.com', password: 'Manager@123', role: 'manager' },
  { name: 'Warehouse Staff', email: 'staff@stocksense.com', password: 'Staff@123', role: 'staff' },
];

const daysFromNow = (days) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function insertOne(client, sql, params) {
  const { rows } = await client.query(sql, params);
  return rows[0].id;
}

async function seedMasterData() {
  return withTransaction(async (client) => {
    const users = {};
    for (const u of DEMO_USERS) {
      users[u.role] = await insertOne(
        client,
        'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id',
        [u.name, u.email, await bcrypt.hash(u.password, 10), u.role],
      );
    }

    const wh = await insertOne(
      client,
      `INSERT INTO warehouses (name, code, address) VALUES ('Main Warehouse', 'WH', 'Plot 12, Industrial Area, Jalandhar') RETURNING id`,
    );
    const wh2 = await insertOne(
      client,
      `INSERT INTO warehouses (name, code, address) VALUES ('Secondary Warehouse', 'WH2', 'GT Road, Phagwara') RETURNING id`,
    );
    const loc = {};
    const locations = [
      ['stock', wh, 'Stock', 'STOCK'],
      ['rackA', wh, 'Rack A', 'RACK-A'],
      ['rackB', wh, 'Rack B', 'RACK-B'],
      ['production', wh, 'Production Floor', 'PROD'],
      ['stock2', wh2, 'Stock', 'STOCK'],
    ];
    for (const [key, warehouseId, name, code] of locations) {
      loc[key] = await insertOne(client, 'INSERT INTO locations (warehouse_id, name, code) VALUES ($1, $2, $3) RETURNING id', [
        warehouseId,
        name,
        code,
      ]);
    }

    const cat = {};
    for (const [key, name, description] of [
      ['raw', 'Raw Materials', 'Metals and other production inputs'],
      ['furniture', 'Furniture', 'Finished furniture goods'],
      ['electronics', 'Electronics', 'Monitors and accessories'],
      ['packaging', 'Packaging', 'Boxes, tape and packing material'],
    ]) {
      cat[key] = await insertOne(client, 'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id', [
        name,
        description,
      ]);
    }

    const prod = {};
    for (const [key, name, sku, category, uom, cost] of [
      ['steelRod', 'Steel Rods', 'STL-ROD-01', 'raw', 'kg', 65],
      ['steelSheet', 'Steel Sheet', 'STL-SHT-01', 'raw', 'kg', 80],
      ['chair', 'Office Chair', 'FUR-CHR-01', 'furniture', 'Units', 3500],
      ['table', 'Wooden Table', 'FUR-TBL-01', 'furniture', 'Units', 7200],
      ['monitor', '24" LED Monitor', 'ELC-MON-24', 'electronics', 'Units', 9800],
      ['keyboard', 'USB Keyboard', 'ELC-KBD-01', 'electronics', 'Units', 650],
      ['box', 'Cardboard Box', 'PKG-BOX-01', 'packaging', 'Units', 25],
      ['tape', 'Packing Tape', 'PKG-TAP-01', 'packaging', 'Units', 40],
    ]) {
      prod[key] = await insertOne(
        client,
        'INSERT INTO products (name, sku, category_id, uom, cost_price) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [name, sku, cat[category], uom, cost],
      );
    }

    for (const [product, warehouseId, min, max] of [
      ['steelRod', wh, 50, 200],
      ['chair', wh, 10, 40],
      ['monitor', wh, 5, 20],
      ['keyboard', wh, 15, 60],
      ['tape', wh, 20, 100],
      ['box', wh2, 100, 500],
    ]) {
      await client.query('INSERT INTO reorder_rules (product_id, warehouse_id, min_qty, max_qty) VALUES ($1, $2, $3, $4)', [
        prod[product],
        warehouseId,
        min,
        max,
      ]);
    }

    return { users, loc, prod };
  });
}

async function seedOperations({ users, loc, prod }) {
  const manager = users.manager;
  const staff = users.staff;
  const line = (product, quantity) => ({ productId: prod[product], quantity });
  const create = (data, userId = manager) => createOperation(data, userId);
  const done = async (data, userId = manager) => validateOperation((await create(data, userId)).id, userId);

  // Completed history, following the example in the problem statement
  await done({ type: 'receipt', partnerName: 'Tata Steel Ltd', destLocationId: loc.stock, scheduledDate: daysFromNow(-6),
    lines: [line('steelRod', 100), line('steelSheet', 60)] });
  await done({ type: 'receipt', partnerName: 'Comfort Furnitures', destLocationId: loc.stock, scheduledDate: daysFromNow(-5),
    lines: [line('chair', 25), line('table', 8)] });
  await done({ type: 'receipt', partnerName: 'Dell India', destLocationId: loc.stock, scheduledDate: daysFromNow(-5),
    lines: [line('monitor', 12), line('keyboard', 10)] });
  await done({ type: 'receipt', partnerName: 'PackRight Supplies', destLocationId: loc.stock2, scheduledDate: daysFromNow(-4),
    lines: [line('box', 300)] });
  await done({ type: 'internal', sourceLocationId: loc.stock, destLocationId: loc.production, scheduledDate: daysFromNow(-3),
    notes: 'Steel for the production line', lines: [line('steelRod', 40)] }, staff);
  await done({ type: 'delivery', partnerName: 'Acme Corp', sourceLocationId: loc.stock, scheduledDate: daysFromNow(-2),
    lines: [line('chair', 10)] });
  await done({ type: 'delivery', partnerName: 'Global Traders', sourceLocationId: loc.stock, scheduledDate: daysFromNow(-1),
    lines: [line('steelRod', 20)] });
  await withTransaction((client) =>
    adjustStock(client, { locationId: loc.stock, notes: '3 kg steel damaged', lines: [{ productId: prod.steelRod, difference: -3 }] }, staff),
  );

  // Open work for the dashboard
  await create({ type: 'receipt', partnerName: 'Tata Steel Ltd', destLocationId: loc.stock, scheduledDate: daysFromNow(1),
    lines: [line('steelRod', 150)] });
  const lateReceipt = await create({ type: 'receipt', partnerName: 'Dell India', destLocationId: loc.stock,
    scheduledDate: daysFromNow(-1), lines: [line('monitor', 10), line('keyboard', 30)] });
  await confirmOperation(lateReceipt.id);
  const readyDelivery = await create({ type: 'delivery', partnerName: 'Acme Corp', sourceLocationId: loc.stock,
    scheduledDate: daysFromNow(2), lines: [line('table', 3)] });
  await confirmOperation(readyDelivery.id);
  const waitingDelivery = await create({ type: 'delivery', partnerName: 'Sharma Enterprises', sourceLocationId: loc.stock,
    scheduledDate: daysFromNow(3), lines: [line('monitor', 20)] });
  await confirmOperation(waitingDelivery.id);
  await create({ type: 'delivery', partnerName: 'Global Traders', sourceLocationId: loc.stock, scheduledDate: daysFromNow(4),
    lines: [line('chair', 5)] });
  const transfer = await create({ type: 'internal', sourceLocationId: loc.stock, destLocationId: loc.rackA,
    scheduledDate: daysFromNow(0.2), notes: 'Shelve chairs on Rack A', lines: [line('chair', 5)] }, staff);
  await confirmOperation(transfer.id);
  await create({ type: 'internal', sourceLocationId: loc.stock2, destLocationId: loc.stock, scheduledDate: daysFromNow(2),
    notes: 'Boxes for the packing area', lines: [line('box', 100)] });
  const canceled = await create({ type: 'receipt', partnerName: 'Old Vendor Co', destLocationId: loc.stock,
    scheduledDate: daysFromNow(-2), lines: [line('keyboard', 5)] });
  await cancelOperation(canceled.id);
}

/**
 * The demo history above is created in a few milliseconds. Move each completed operation
 * (and its stock moves) to the date it was scheduled for, so the dashboard chart, the ledger
 * and the move history show a realistic week of activity.
 */
async function backdateHistory() {
  await withTransaction(async (client) => {
    await client.query(
      `UPDATE operations SET scheduled_date = now() - interval '12 hours'
       WHERE type = 'adjustment'`,
    );
    await client.query(
      `UPDATE operations SET done_at = scheduled_date,
         created_at = LEAST(created_at, scheduled_date - interval '2 hours'),
         updated_at = scheduled_date
       WHERE status = 'done'`,
    );
    await client.query(
      `UPDATE stock_moves m SET created_at = o.done_at FROM operations o WHERE m.operation_id = o.id`,
    );
  });
}

export async function seed() {
  await initDatabase();
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM users');
  if (rows[0].n > 0) {
    console.log('Database already has data - seed skipped. Run "npm run db:reset" first for a fresh demo database.');
    return false;
  }
  await seedOperations(await seedMasterData());
  await backdateHistory();
  return true;
}

// Run directly: node src/db/seed.js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  seed()
    .then((seeded) => {
      if (seeded) {
        console.log('Demo data created. Log in with:');
        for (const u of DEMO_USERS) console.log(`  ${u.role.padEnd(8)} ${u.email} / ${u.password}`);
      }
    })
    .catch((err) => {
      console.error('Seed failed:', err.message);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
