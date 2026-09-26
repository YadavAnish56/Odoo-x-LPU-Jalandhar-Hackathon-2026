-- StockSense Demo Seed Data
-- Users: manager@stocksense.com / Manager@123, staff@stocksense.com / Staff@123

BEGIN;

-- Users
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Inventory Manager', 'manager@stocksense.com', '$2b$10$r/wCUTbzx4pFKkGM03vOje6HIxwQd1I6ulZDCkyWOCbTBbb2wWgae', 'manager'),
  (2, 'Warehouse Staff',    'staff@stocksense.com',   '$2b$10$QpXudt7LGGaPNvgFXwO3wOMM0YX/MNka.r.pfAV4A0XXO.akL1FbG', 'staff')
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO warehouses (id, name, code, address) VALUES
  (1, 'Main Warehouse',      'WH',  'Plot 12, Industrial Area, Jalandhar'),
  (2, 'Secondary Warehouse', 'WH2', 'GT Road, Phagwara')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO locations (id, warehouse_id, name, code) VALUES
  (1, 1, 'Stock',            'STOCK'),
  (2, 1, 'Rack A',           'RACK-A'),
  (3, 1, 'Rack B',           'RACK-B'),
  (4, 1, 'Production Floor', 'PROD'),
  (5, 2, 'Stock',            'STOCK')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, description) VALUES
  (1, 'Raw Materials', 'Metals and other production inputs'),
  (2, 'Furniture',     'Finished furniture goods'),
  (3, 'Electronics',   'Monitors and accessories'),
  (4, 'Packaging',     'Boxes, tape and packing material')
ON CONFLICT (id) DO NOTHING;

-- Products
INSERT INTO products (id, name, sku, category_id, uom, cost_price, description) VALUES
  (1, 'Steel Rods',       'STL-ROD-01', 1, 'kg',     65.00,   'High grade steel rods for construction and fabrication'),
  (2, 'Steel Sheet',      'STL-SHT-01', 1, 'kg',     80.00,   'Cold-rolled industrial grade steel sheets'),
  (3, 'Office Chair',     'FUR-CHR-01', 2, 'Units',  3500.00, 'Ergonomic mesh office chair with lumbar support'),
  (4, 'Wooden Table',     'FUR-TBL-01', 2, 'Units',  7200.00, 'Solid hardwood work table'),
  (5, '24" LED Monitor',  'ELC-MON-24', 3, 'Units',  9800.00, 'Full HD IPS panel display'),
  (6, 'USB Keyboard',     'ELC-KBD-01', 3, 'Units',  650.00,  'Standard membrane wired keyboard'),
  (7, 'Cardboard Box',    'PKG-BOX-01', 4, 'Units',  25.00,   'Corrugated shipping boxes'),
  (8, 'Packing Tape',     'PKG-TAP-01', 4, 'Units',  40.00,   'Heavy duty transparent tape')
ON CONFLICT (id) DO NOTHING;

-- Stock Quants
INSERT INTO stock_quants (product_id, location_id, quantity) VALUES
  (1, 1, 77.000),
  (1, 4, 40.000),
  (2, 1, 60.000),
  (3, 1, 15.000),
  (4, 1, 8.000),
  (5, 1, 12.000),
  (6, 1, 10.000),
  (7, 5, 300.000)
ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = EXCLUDED.quantity;

-- Reordering Rules
INSERT INTO reorder_rules (id, product_id, warehouse_id, min_qty, max_qty) VALUES
  (1, 1, 1, 50.000, 200.000),
  (2, 3, 1, 10.000, 40.000),
  (3, 5, 1, 5.000,  20.000),
  (4, 6, 1, 15.000, 60.000),
  (5, 8, 1, 20.000, 100.000),
  (6, 7, 2, 100.000, 500.000)
ON CONFLICT (id) DO NOTHING;

-- Operations (Receipts, Deliveries, Transfers, Adjustments)
INSERT INTO operations (
  id, reference, type, status, warehouse_id, source_location_id, dest_location_id,
  partner_name, scheduled_date, responsible_id, notes, done_at, created_by, created_at
) VALUES
  (1, 'WH/IN/0001', 'receipt', 'done', 1, NULL, 1, 'Tata Steel Ltd', now() - interval '6 days', 1, NULL, now() - interval '6 days', 1, now() - interval '6 days'),
  (2, 'WH/IN/0002', 'receipt', 'done', 1, NULL, 1, 'Comfort Furnitures', now() - interval '5 days', 1, NULL, now() - interval '5 days', 1, now() - interval '5 days'),
  (3, 'WH/IN/0003', 'receipt', 'done', 1, NULL, 1, 'Dell India', now() - interval '5 days', 1, NULL, now() - interval '5 days', 1, now() - interval '5 days'),
  (4, 'WH2/IN/0001', 'receipt', 'done', 2, NULL, 5, 'PackRight Supplies', now() - interval '4 days', 1, NULL, now() - interval '4 days', 1, now() - interval '4 days'),
  (5, 'WH/INT/0001', 'internal', 'done', 1, 1, 4, NULL, now() - interval '3 days', 2, 'Steel for the production line', now() - interval '3 days', 2, now() - interval '3 days'),
  (6, 'WH/OUT/0001', 'delivery', 'done', 1, 1, NULL, 'Acme Corp', now() - interval '2 days', 1, NULL, now() - interval '2 days', 1, now() - interval '2 days'),
  (7, 'WH/OUT/0002', 'delivery', 'done', 1, 1, NULL, 'Global Traders', now() - interval '1 day', 1, NULL, now() - interval '1 day', 1, now() - interval '1 day'),
  (8, 'WH/ADJ/0001', 'adjustment', 'done', 1, 1, 1, NULL, now() - interval '12 hours', 2, '3 kg steel damaged', now() - interval '12 hours', 2, now() - interval '12 hours'),
  (9, 'WH/IN/0004', 'receipt', 'draft', 1, NULL, 1, 'Tata Steel Ltd', now() + interval '1 day', 1, NULL, NULL, 1, now()),
  (10, 'WH/IN/0005', 'receipt', 'ready', 1, NULL, 1, 'Dell India', now() - interval '1 day', 1, NULL, NULL, 1, now()),
  (11, 'WH/OUT/0003', 'delivery', 'ready', 1, 1, NULL, 'Acme Corp', now() + interval '2 days', 1, NULL, NULL, 1, now()),
  (12, 'WH/OUT/0004', 'delivery', 'waiting', 1, 1, NULL, 'Sharma Enterprises', now() + interval '3 days', 1, NULL, NULL, 1, now()),
  (13, 'WH/OUT/0005', 'delivery', 'draft', 1, 1, NULL, 'Global Traders', now() + interval '4 days', 1, NULL, NULL, 1, now()),
  (14, 'WH/INT/0002', 'internal', 'ready', 1, 1, 2, NULL, now() + interval '4 hours', 2, 'Shelve chairs on Rack A', NULL, 2, now()),
  (15, 'WH2/INT/0001', 'internal', 'draft', 2, 5, 1, NULL, now() + interval '2 days', 1, 'Boxes for the packing area', NULL, 1, now()),
  (16, 'WH/IN/0006', 'receipt', 'canceled', 1, NULL, 1, 'Old Vendor Co', now() - interval '2 days', 1, NULL, NULL, 1, now())
ON CONFLICT (id) DO NOTHING;

-- Operation Lines
INSERT INTO operation_lines (id, operation_id, product_id, quantity, system_quantity) VALUES
  (1,  1, 1, 100.000, NULL),
  (2,  1, 2, 60.000,  NULL),
  (3,  2, 3, 25.000,  NULL),
  (4,  2, 4, 8.000,   NULL),
  (5,  3, 5, 12.000,  NULL),
  (6,  3, 6, 10.000,  NULL),
  (7,  4, 7, 300.000, NULL),
  (8,  5, 1, 40.000,  NULL),
  (9,  6, 3, 10.000,  NULL),
  (10, 7, 1, 20.000,  NULL),
  (11, 8, 1, 77.000,  80.000),
  (12, 9, 1, 150.000, NULL),
  (13, 10, 5, 10.000, NULL),
  (14, 10, 6, 30.000, NULL),
  (15, 11, 4, 3.000,  NULL),
  (16, 12, 5, 20.000, NULL),
  (17, 13, 3, 5.000,  NULL),
  (18, 14, 3, 5.000,  NULL),
  (19, 15, 7, 100.000, NULL),
  (20, 16, 6, 5.000,  NULL)
ON CONFLICT (id) DO NOTHING;

-- Stock Moves (Audit history for completed movements)
INSERT INTO stock_moves (id, operation_id, reference, move_type, product_id, from_location_id, to_location_id, quantity, partner_name, created_by, created_at) VALUES
  (1, 1, 'WH/IN/0001',  'receipt',    1, NULL, 1, 100.000, 'Tata Steel Ltd',     1, now() - interval '6 days'),
  (2, 1, 'WH/IN/0001',  'receipt',    2, NULL, 1, 60.000,  'Tata Steel Ltd',     1, now() - interval '6 days'),
  (3, 2, 'WH/IN/0002',  'receipt',    3, NULL, 1, 25.000,  'Comfort Furnitures', 1, now() - interval '5 days'),
  (4, 2, 'WH/IN/0002',  'receipt',    4, NULL, 1, 8.000,   'Comfort Furnitures', 1, now() - interval '5 days'),
  (5, 3, 'WH/IN/0003',  'receipt',    5, NULL, 1, 12.000,  'Dell India',         1, now() - interval '5 days'),
  (6, 3, 'WH/IN/0003',  'receipt',    6, NULL, 1, 10.000,  'Dell India',         1, now() - interval '5 days'),
  (7, 4, 'WH2/IN/0001', 'receipt',    7, NULL, 5, 300.000, 'PackRight Supplies', 1, now() - interval '4 days'),
  (8, 5, 'WH/INT/0001', 'internal',   1, 1,    4, 40.000,  NULL,                 2, now() - interval '3 days'),
  (9, 6, 'WH/OUT/0001', 'delivery',   3, 1, NULL, 10.000,  'Acme Corp',          1, now() - interval '2 days'),
  (10, 7, 'WH/OUT/0002', 'delivery',  1, 1, NULL, 20.000,  'Global Traders',     1, now() - interval '1 day'),
  (11, 8, 'WH/ADJ/0001', 'adjustment', 1, 1, NULL, 3.000,   NULL,                 2, now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;

-- Sync Sequence Counters
INSERT INTO sequences (key, last_value) VALUES
  ('WH/IN', 6),
  ('WH/OUT', 5),
  ('WH/INT', 2),
  ('WH/ADJ', 1),
  ('WH2/IN', 1),
  ('WH2/INT', 1)
ON CONFLICT (key) DO UPDATE SET last_value = EXCLUDED.last_value;

-- Advance identity sequences past seed IDs
SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users;
SELECT setval(pg_get_serial_sequence('warehouses', 'id'), coalesce(max(id), 1)) FROM warehouses;
SELECT setval(pg_get_serial_sequence('locations', 'id'), coalesce(max(id), 1)) FROM locations;
SELECT setval(pg_get_serial_sequence('categories', 'id'), coalesce(max(id), 1)) FROM categories;
SELECT setval(pg_get_serial_sequence('products', 'id'), coalesce(max(id), 1)) FROM products;
SELECT setval(pg_get_serial_sequence('reorder_rules', 'id'), coalesce(max(id), 1)) FROM reorder_rules;
SELECT setval(pg_get_serial_sequence('operations', 'id'), coalesce(max(id), 1)) FROM operations;
SELECT setval(pg_get_serial_sequence('operation_lines', 'id'), coalesce(max(id), 1)) FROM operation_lines;
SELECT setval(pg_get_serial_sequence('stock_moves', 'id'), coalesce(max(id), 1)) FROM stock_moves;

COMMIT;
