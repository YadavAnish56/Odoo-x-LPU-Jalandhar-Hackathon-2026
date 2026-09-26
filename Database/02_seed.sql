-- StockSense Demo Seed Data
-- Default Users:
--   Manager: manager@stocksense.com / Manager@123
--   Staff:   staff@stocksense.com / Staff@123

BEGIN;

-- Users
INSERT INTO users (id, name, email, password_hash, role) VALUES
  (1, 'Inventory Manager', 'manager@stocksense.com',     '$2b$10$r/wCUTbzx4pFKkGM03vOje6HIxwQd1I6ulZDCkyWOCbTBbb2wWgae', 'manager'),
  (2, 'Warehouse Staff',   'staff@stocksense.com',       '$2b$10$QpXudt7LGGaPNvgFXwO3wOMM0YX/MNka.r.pfAV4A0XXO.akL1FbG', 'staff'),
  (3, 'Rahul Sharma',      'rahul.sharma@stocksense.com', '$2b$10$QpXudt7LGGaPNvgFXwO3wOMM0YX/MNka.r.pfAV4A0XXO.akL1FbG', 'staff'),
  (4, 'Priya Patel',       'priya.patel@stocksense.com',  '$2b$10$QpXudt7LGGaPNvgFXwO3wOMM0YX/MNka.r.pfAV4A0XXO.akL1FbG', 'manager'),
  (5, 'Amit Verma',        'amit.verma@stocksense.com',   '$2b$10$QpXudt7LGGaPNvgFXwO3wOMM0YX/MNka.r.pfAV4A0XXO.akL1FbG', 'staff')
ON CONFLICT (id) DO NOTHING;

-- Warehouses
INSERT INTO warehouses (id, name, code, address) VALUES
  (1, 'Central Warehouse',         'WH',  'Plot 12, Industrial Area, Jalandhar, Punjab'),
  (2, 'Regional Logistics Hub',    'WH2', 'GT Road, Phagwara, Punjab'),
  (3, 'North Distribution Center', 'WH3', 'Sector 18, Logistics Park, Gurugram, Haryana')
ON CONFLICT (id) DO NOTHING;

-- Locations
INSERT INTO locations (id, warehouse_id, name, code) VALUES
  -- Central Warehouse (WH)
  (1,  1, 'Main Stock',          'STOCK'),
  (2,  1, 'Rack A (Heavy)',      'RACK-A'),
  (3,  1, 'Rack B (Small Parts)','RACK-B'),
  (4,  1, 'Production Floor',    'PROD'),
  (5,  1, 'Packing Zone',        'PACK'),
  (6,  1, 'Quality Inspection',  'QC'),
  -- Regional Logistics Hub (WH2)
  (7,  2, 'General Stock',       'STOCK'),
  (8,  2, 'High-Bay Pallet 1',   'BAY-01'),
  (9,  2, 'High-Bay Pallet 2',   'BAY-02'),
  -- North Distribution Center (WH3)
  (10, 3, 'Inbound Staging',     'STAGE-IN'),
  (11, 3, 'Outbound Dispatch',   'DISPATCH'),
  (12, 3, 'Bulk Storage',        'BULK')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, name, description) VALUES
  (1, 'Raw Materials',        'Industrial metals, polymers, and raw inputs'),
  (2, 'Finished Furniture',   'Office desks, chairs, and ergonomic furniture'),
  (3, 'Electronics & IT',     'Monitors, peripherals, and workstation hardware'),
  (4, 'Packaging Supplies',   'Cartons, tapes, bubble wraps, and strapping'),
  (5, 'Fasteners & Hardware', 'Bolts, nuts, brackets, and structural fittings'),
  (6, 'Safety & PPE',         'Helmets, gloves, vests, and protective gear')
ON CONFLICT (id) DO NOTHING;

-- Products (20 catalog items)
INSERT INTO products (id, name, sku, category_id, uom, cost_price, description) VALUES
  (1,  'Steel Rods 12mm',           'STL-ROD-12', 1, 'kg',     65.00,   'High-tensile structural steel rebar'),
  (2,  'Cold-Rolled Steel Sheet',   'STL-SHT-01', 1, 'kg',     82.50,   '1.5mm industrial sheet metal'),
  (3,  'Aluminum Angle 50x50',      'ALU-ANG-50', 1, 'm',     140.00,   'Extruded structural aluminum beam'),
  (4,  'Industrial Hydraulic Oil',  'OIL-HYD-46', 1, 'L',     195.00,   'ISO VG 46 anti-wear hydraulic fluid'),
  (5,  'Ergonomic Mesh Chair',      'FUR-CHR-01', 2, 'Units', 3500.00,  'High-back lumbar support office chair'),
  (6,  'Solid Oak Executive Desk',  'FUR-DSK-02', 2, 'Units', 8200.00,  'Commercial grade 160cm workstation desk'),
  (7,  'Mobile Pedestal Drawer',    'FUR-DRW-03', 2, 'Units', 2400.00,  '3-drawer lockable under-desk steel cabinet'),
  (8,  '24" IPS Business Monitor',  'ELC-MON-24', 3, 'Units', 9500.00,  '1080p borderless display with HDMI/DP'),
  (9,  'Wired Mechanical Keyboard', 'ELC-KBD-01', 3, 'Units',  750.00,  'Durable spill-resistant membrane keyboard'),
  (10, 'Wireless Optical Mouse',    'ELC-MOU-02', 3, 'Units',  420.00,  '2.4GHz USB wireless optical mice'),
  (11, 'Cat6 UTP Cable Box 305m',   'ELC-CBL-06', 3, 'Units', 4800.00,  'Gigabit certified networking cable roll'),
  (12, 'Heavy-Duty Corrugated Box', 'PKG-BOX-01', 4, 'Units',   32.00,  'Double-walled 45x30x30cm storage box'),
  (13, 'Industrial Packing Tape',   'PKG-TAP-01', 4, 'Units',   45.00,  '48mm x 65m heavy-duty adhesive tape'),
  (14, 'Air Bubble Wrap Roll 100m', 'PKG-BBL-10', 4, 'Units',  720.00,  'Shock-absorbing packaging wrap'),
  (15, 'Stretch Pallet Film 23mic', 'PKG-FLM-23', 4, 'Units',  390.00,  '500mm cast pallet stretch wrap roll'),
  (16, 'Hex Bolts M10 x 50mm',      'HDW-BLT-10', 5, 'Units',    8.50,  'Grade 8.8 zinc-plated structural bolts'),
  (17, 'Stainless Lock Nut M10',    'HDW-NUT-10', 5, 'Units',    4.20,  'Nylon insert self-locking nuts'),
  (18, 'Industrial Safety Helmet',  'PPE-HLM-01', 6, 'Units',  320.00,  'EN397 certified hard hat with chin strap'),
  (19, 'Hi-Vis Reflective Vest',    'PPE-VST-01', 6, 'Units',  160.00,  'Class 2 neon yellow reflective jacket'),
  (20, 'Nitrile Heavy Work Gloves', 'PPE-GLV-01', 6, 'Units',   95.00,  'Oil-resistant grip protective gloves')
ON CONFLICT (id) DO NOTHING;

-- Stock Quants (Live inventory across locations)
INSERT INTO stock_quants (product_id, location_id, quantity) VALUES
  (1,  1, 100.000),  -- Steel Rods in WH Main Stock
  (1,  4,  45.000),  -- Steel Rods in WH Production
  (2,  1,  80.000),  -- Steel Sheet in WH Main Stock
  (3,  1,  35.000),  -- Aluminum Angle in WH Main Stock
  (4,  1,  18.000),  -- Hydraulic Oil in WH Main Stock (Low stock)
  (5,  1,  22.000),  -- Mesh Chair in WH Main Stock
  (5,  2,   8.000),  -- Mesh Chair in WH Rack A
  (6,  1,   6.000),  -- Oak Desk in WH Main Stock (Low stock)
  (7,  1,  15.000),  -- Drawer in WH Main Stock
  (8,  1,  15.000),  -- 24" Monitor in WH Main Stock
  (8,  7,   8.000),  -- 24" Monitor in WH2
  (9,  1,  30.000),  -- Keyboard in WH Main Stock
  (10, 1,  50.000),  -- Mouse in WH Main Stock
  (11, 1,   4.000),  -- Cat6 Cable in WH Main Stock (Low stock)
  (12, 1, 180.000),  -- Boxes in WH Main Stock
  (12, 7, 400.000),  -- Boxes in WH2 General Stock
  (13, 1,  60.000),  -- Tape in WH Main Stock
  (14, 1,  12.000),  -- Bubble Wrap in WH Main Stock
  (15, 7,  50.000),  -- Stretch Film in WH2
  (16, 3, 1000.000), -- Hex Bolts in WH Rack B
  (17, 3, 1000.000), -- Lock Nuts in WH Rack B
  (18, 1,  28.000),  -- Helmets in WH Main Stock
  (19, 1,  50.000),  -- Vests in WH Main Stock
  (20, 1,  75.000)   -- Gloves in WH Main Stock
ON CONFLICT (product_id, location_id) DO NOTHING;

-- Reordering Rules (Automated min/max replenishment triggers)
INSERT INTO reorder_rules (id, product_id, warehouse_id, min_qty, max_qty) VALUES
  (1,  1,  1, 100.000,  300.000),  -- Steel Rods
  (2,  4,  1,  25.000,   60.000),  -- Hydraulic Oil (Currently ALERT: 18 < 25)
  (3,  5,  1,  15.000,   50.000),  -- Mesh Chair
  (4,  6,  1,  10.000,   25.000),  -- Oak Desk (Currently ALERT: 6 < 10)
  (5,  8,  1,  10.000,   30.000),  -- 24" Monitor
  (6,  9,  1,  20.000,   60.000),  -- Keyboards
  (7,  11, 1,   6.000,   20.000),  -- Cat6 Roll (Currently ALERT: 4 < 6)
  (8,  12, 1, 100.000,  400.000),  -- Boxes WH1
  (9,  12, 2, 200.000,  800.000),  -- Boxes WH2
  (10, 13, 1,  30.000,  120.000),  -- Packing Tape
  (11, 18, 1,  20.000,   80.000),  -- Safety Helmets
  (12, 20, 1,  50.000,  150.000)   -- Gloves
ON CONFLICT (id) DO NOTHING;

-- Operations (Historical + Live Draft / Ready Movements)
INSERT INTO operations (
  id, reference, type, status, warehouse_id, source_location_id, dest_location_id,
  partner_name, scheduled_date, responsible_id, notes, done_at, created_by, created_at
) VALUES
  -- Completed Receipts
  (1,  'WH/IN/0001', 'receipt', 'done', 1, NULL, 1, 'Tata Steel Ltd',            now() - interval '8 days', 1, 'Bulk raw materials delivery', now() - interval '8 days', 1, now() - interval '8 days'),
  (2,  'WH/IN/0002', 'receipt', 'done', 1, NULL, 1, 'Comfort Works Furniture',    now() - interval '6 days', 1, 'Quarterly furniture shipment', now() - interval '6 days', 1, now() - interval '6 days'),
  (3,  'WH/IN/0003', 'receipt', 'done', 1, NULL, 1, 'Dell Technologies India',   now() - interval '5 days', 1, 'Displays and IT input', now() - interval '5 days', 1, now() - interval '5 days'),
  (4,  'WH2/IN/0001','receipt', 'done', 2, NULL, 7, 'PackRight Logistics',        now() - interval '4 days', 1, 'Warehousing bulk boxes', now() - interval '4 days', 1, now() - interval '4 days'),
  (5,  'WH/IN/0004', 'receipt', 'done', 1, NULL, 3, 'Unbrako Fasteners Corp',     now() - interval '3 days', 1, 'Hardware & fasteners batch', now() - interval '3 days', 1, now() - interval '3 days'),
  -- Completed Transfers
  (6,  'WH/INT/0001','internal','done', 1, 1,    4, NULL,                         now() - interval '4 days', 2, 'Allocated steel for fabrication', now() - interval '4 days', 2, now() - interval '4 days'),
  (7,  'WH/INT/0002','internal','done', 1, 1,    2, NULL,                         now() - interval '2 days', 3, 'Chairs moved to high rack', now() - interval '2 days', 3, now() - interval '2 days'),
  -- Completed Deliveries
  (8,  'WH/OUT/0001','delivery','done', 1, 1, NULL, 'Larsen & Toubro Project #4', now() - interval '3 days', 1, 'Dispatched furniture & monitors', now() - interval '3 days', 1, now() - interval '3 days'),
  (9,  'WH/OUT/0002','delivery','done', 1, 1, NULL, 'Godrej Industrial Systems',  now() - interval '2 days', 1, 'Construction materials handover', now() - interval '2 days', 1, now() - interval '2 days'),
  -- Completed Adjustments
  (10, 'WH/ADJ/0001','adjustment','done',1, 1,   1, NULL,                         now() - interval '1 day',  2, 'Cycle count discrepancy correction', now() - interval '1 day', 2, now() - interval '1 day'),
  -- Pending / Active Operations
  (11, 'WH/IN/0005', 'receipt', 'ready',   1, NULL, 1, 'Schneider Electric India', now() + interval '1 day',  4, 'Emergency electrical & cabling replenishment', NULL, 4, now()),
  (12, 'WH/IN/0006', 'receipt', 'ready',   1, NULL, 1, 'Tata Steel Ltd',            now() + interval '3 days', 1, 'Scheduled monthly raw rebar delivery', NULL, 1, now()),
  (13, 'WH/IN/0007', 'receipt', 'draft',   1, NULL, 1, '3M Safety Solutions',      now() + interval '4 days', 1, 'PPE restock order', NULL, 1, now()),
  (14, 'WH/OUT/0003','delivery','ready',   1, 1, NULL, 'Flipkart Fulfillment Hub',  now() + interval '5 hours',1, 'Urgent customer dispatch', NULL, 1, now()),
  (15, 'WH/OUT/0004','delivery','waiting', 1, 1, NULL, 'Acme Engineering Corp',    now() + interval '2 days', 1, 'Waiting on client pickup truck', NULL, 1, now()),
  (16, 'WH/OUT/0005','delivery','draft',   1, 1, NULL, 'Apex Modular Works',        now() + interval '4 days', 1, 'Planned project order', NULL, 1, now()),
  (17, 'WH/INT/0003','internal','ready',   1, 1,    5, NULL,                         now() + interval '2 hours',2, 'Move boxes and tapes to pack line', NULL, 2, now()),
  (18, 'WH2/INT/0001','internal','draft',  2, 7,    1, NULL,                         now() + interval '3 days', 3, 'Inter-warehouse stock balancing WH2 -> WH1', NULL, 3, now()),
  (19, 'WH/IN/0008', 'receipt', 'canceled',1, NULL, 1, 'Legacy Vendors Ltd',        now() - interval '1 day',  1, 'Canceled by procurement', NULL, 1, now())
ON CONFLICT (id) DO NOTHING;

-- Operation Lines
INSERT INTO operation_lines (id, operation_id, product_id, quantity, system_quantity) VALUES
  -- Op 1 (Done Receipt)
  (1,  1,  1,  165.000, NULL),
  (2,  1,  2,   80.000, NULL),
  -- Op 2 (Done Receipt)
  (3,  2,  5,   35.000, NULL),
  (4,  2,  6,   10.000, NULL),
  (5,  2,  7,   15.000, NULL),
  -- Op 3 (Done Receipt)
  (6,  3,  8,   20.000, NULL),
  (7,  3,  9,   30.000, NULL),
  (8,  3,  10,  50.000, NULL),
  -- Op 4 (Done Receipt WH2)
  (9,  4,  12, 400.000, NULL),
  (10, 4,  15,  50.000, NULL),
  -- Op 5 (Done Receipt)
  (11, 5,  16, 1000.000,NULL),
  (12, 5,  17, 1000.000,NULL),
  -- Op 6 (Done Transfer to Prod)
  (13, 6,  1,   45.000, NULL),
  -- Op 7 (Done Transfer to Rack A)
  (14, 7,  5,    8.000, NULL),
  -- Op 8 (Done Delivery to L&T)
  (15, 8,  5,    5.000, NULL),
  (16, 8,  6,    4.000, NULL),
  (17, 8,  8,    5.000, NULL),
  -- Op 9 (Done Delivery to Godrej)
  (18, 9,  1,   20.000, NULL),
  -- Op 10 (Done Adjustment)
  (19, 10, 4,   18.000, 20.000),  -- 2L spillage recorded
  -- Op 11 (Ready Receipt)
  (20, 11, 11,  10.000, NULL),
  -- Op 12 (Waiting Receipt)
  (21, 12, 1,  200.000, NULL),
  -- Op 13 (Draft Receipt)
  (22, 13, 18,  50.000, NULL),
  (23, 13, 19,  40.000, NULL),
  -- Op 14 (Ready Delivery)
  (24, 14, 8,    4.000, NULL),
  (25, 14, 9,    5.000, NULL),
  -- Op 15 (Waiting Delivery)
  (26, 15, 5,    3.000, NULL),
  -- Op 16 (Draft Delivery)
  (27, 16, 7,    2.000, NULL),
  -- Op 17 (Ready Transfer to Pack)
  (28, 17, 12,  50.000, NULL),
  -- Op 18 (Draft Inter-wh transfer)
  (29, 18, 12, 100.000, NULL),
  -- Op 19 (Canceled Receipt)
  (30, 19, 9,    5.000, NULL)
ON CONFLICT (id) DO NOTHING;

-- Stock Moves (Audit ledger for completed movements)
INSERT INTO stock_moves (id, operation_id, reference, move_type, product_id, from_location_id, to_location_id, quantity, partner_name, created_by, created_at) VALUES
  (1,  1, 'WH/IN/0001',   'receipt',     1,  NULL, 1, 165.000, 'Tata Steel Ltd',          1, now() - interval '8 days'),
  (2,  1, 'WH/IN/0001',   'receipt',     2,  NULL, 1,  80.000, 'Tata Steel Ltd',          1, now() - interval '8 days'),
  (3,  2, 'WH/IN/0002',   'receipt',     5,  NULL, 1,  35.000, 'Comfort Works Furniture', 1, now() - interval '6 days'),
  (4,  2, 'WH/IN/0002',   'receipt',     6,  NULL, 1,  10.000, 'Comfort Works Furniture', 1, now() - interval '6 days'),
  (5,  2, 'WH/IN/0002',   'receipt',     7,  NULL, 1,  15.000, 'Comfort Works Furniture', 1, now() - interval '6 days'),
  (6,  3, 'WH/IN/0003',   'receipt',     8,  NULL, 1,  20.000, 'Dell Technologies India',1, now() - interval '5 days'),
  (7,  3, 'WH/IN/0003',   'receipt',     9,  NULL, 1,  30.000, 'Dell Technologies India',1, now() - interval '5 days'),
  (8,  3, 'WH/IN/0003',   'receipt',     10, NULL, 1,  50.000, 'Dell Technologies India',1, now() - interval '5 days'),
  (9,  4, 'WH2/IN/0001',  'receipt',     12, NULL, 7, 400.000, 'PackRight Logistics',     1, now() - interval '4 days'),
  (10, 4, 'WH2/IN/0001',  'receipt',     15, NULL, 7,  50.000, 'PackRight Logistics',     1, now() - interval '4 days'),
  (11, 5, 'WH/IN/0004',   'receipt',     16, NULL, 3, 1000.000,'Unbrako Fasteners Corp',  1, now() - interval '3 days'),
  (12, 5, 'WH/IN/0004',   'receipt',     17, NULL, 3, 1000.000,'Unbrako Fasteners Corp',  1, now() - interval '3 days'),
  (13, 6, 'WH/INT/0001',  'internal',    1,  1,    4,  45.000, NULL,                      2, now() - interval '4 days'),
  (14, 7, 'WH/INT/0002',  'internal',    5,  1,    2,   8.000, NULL,                      3, now() - interval '2 days'),
  (15, 8, 'WH/OUT/0001',  'delivery',    5,  1, NULL,   5.000, 'Larsen & Toubro Project #4', 1, now() - interval '3 days'),
  (16, 8, 'WH/OUT/0001',  'delivery',    6,  1, NULL,   4.000, 'Larsen & Toubro Project #4', 1, now() - interval '3 days'),
  (17, 8, 'WH/OUT/0001',  'delivery',    8,  1, NULL,   5.000, 'Larsen & Toubro Project #4', 1, now() - interval '3 days'),
  (18, 9, 'WH/OUT/0002',  'delivery',    1,  1, NULL,  20.000, 'Godrej Industrial Systems',  1, now() - interval '2 days'),
  (19, 10,'WH/ADJ/0001',  'adjustment',  4,  1, NULL,   2.000, NULL,                      2, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Sync Sequence Counters
INSERT INTO sequences (key, last_value) VALUES
  ('WH/IN', 8),
  ('WH/OUT', 5),
  ('WH/INT', 3),
  ('WH/ADJ', 1),
  ('WH2/IN', 1),
  ('WH2/INT', 1)
ON CONFLICT (key) DO UPDATE SET last_value = GREATEST(sequences.last_value, EXCLUDED.last_value);

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
