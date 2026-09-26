-- StockSense Database Views

BEGIN;

-- Stock summary per location
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT
  sq.product_id,
  p.name AS product_name,
  p.sku,
  c.name AS category_name,
  sq.location_id,
  l.name AS location_name,
  l.code AS location_code,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  w.code AS warehouse_code,
  w.code || '/' || l.code AS full_location_code,
  p.uom,
  sq.quantity,
  p.cost_price,
  ROUND(sq.quantity * p.cost_price, 2) AS stock_value,
  sq.updated_at
FROM stock_quants sq
JOIN products p ON p.id = sq.product_id
JOIN locations l ON l.id = sq.location_id
JOIN warehouses w ON w.id = l.warehouse_id
LEFT JOIN categories c ON c.id = p.category_id;

-- Product catalog with aggregated stock totals
CREATE OR REPLACE VIEW v_product_inventory AS
SELECT
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  c.name AS category_name,
  p.uom,
  p.cost_price,
  p.is_active,
  COALESCE(SUM(sq.quantity), 0) AS total_on_hand,
  ROUND(COALESCE(SUM(sq.quantity), 0) * p.cost_price, 2) AS total_valuation,
  COUNT(DISTINCT sq.location_id) AS stored_in_locations
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN stock_quants sq ON sq.product_id = p.id
GROUP BY p.id, p.name, p.sku, c.name, p.uom, p.cost_price, p.is_active;

-- Reordering and low stock alerts
CREATE OR REPLACE VIEW v_low_stock_alerts AS
WITH warehouse_stock AS (
  SELECT
    sq.product_id,
    l.warehouse_id,
    COALESCE(SUM(sq.quantity), 0) AS current_stock
  FROM stock_quants sq
  JOIN locations l ON l.id = sq.location_id
  GROUP BY sq.product_id, l.warehouse_id
)
SELECT
  rr.id AS rule_id,
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  p.uom,
  w.id AS warehouse_id,
  w.name AS warehouse_name,
  w.code AS warehouse_code,
  COALESCE(ws.current_stock, 0) AS current_stock,
  rr.min_qty,
  rr.max_qty,
  GREATEST(rr.max_qty - COALESCE(ws.current_stock, 0), 0) AS reorder_quantity
FROM reorder_rules rr
JOIN products p ON p.id = rr.product_id
JOIN warehouses w ON w.id = rr.warehouse_id
LEFT JOIN warehouse_stock ws ON ws.product_id = rr.product_id AND ws.warehouse_id = rr.warehouse_id
WHERE COALESCE(ws.current_stock, 0) <= rr.min_qty;

-- Operations list with line counts and location paths
CREATE OR REPLACE VIEW v_operations_overview AS
SELECT
  o.id,
  o.reference,
  o.type,
  o.status,
  o.warehouse_id,
  w.code AS warehouse_code,
  w.name AS warehouse_name,
  CASE
    WHEN sl.id IS NOT NULL THEN sw.code || '/' || sl.code
    ELSE NULL
  END AS source_location,
  CASE
    WHEN dl.id IS NOT NULL THEN dw.code || '/' || dl.code
    ELSE NULL
  END AS dest_location,
  o.partner_name,
  o.scheduled_date,
  o.done_at,
  u.name AS responsible_user,
  COUNT(ol.id) AS total_items,
  COALESCE(SUM(ol.quantity), 0) AS total_quantity
FROM operations o
JOIN warehouses w ON w.id = o.warehouse_id
LEFT JOIN locations sl ON sl.id = o.source_location_id
LEFT JOIN warehouses sw ON sw.id = sl.warehouse_id
LEFT JOIN locations dl ON dl.id = o.dest_location_id
LEFT JOIN warehouses dw ON dw.id = dl.warehouse_id
LEFT JOIN users u ON u.id = o.responsible_id
LEFT JOIN operation_lines ol ON ol.operation_id = o.id
GROUP BY
  o.id, o.reference, o.type, o.status, o.warehouse_id,
  w.code, w.name, sl.id, sw.code, sl.code, dl.id, dw.code, dl.code,
  o.partner_name, o.scheduled_date, o.done_at, u.name;

-- Stock ledger view
CREATE OR REPLACE VIEW v_stock_ledger AS
SELECT
  sm.id AS move_id,
  sm.reference,
  sm.move_type,
  p.name AS product_name,
  p.sku,
  p.uom,
  sm.quantity,
  CASE
    WHEN fl.id IS NOT NULL THEN fw.code || '/' || fl.code
    ELSE 'Vendor / Adjustment'
  END AS from_location,
  CASE
    WHEN tl.id IS NOT NULL THEN tw.code || '/' || tl.code
    ELSE 'Customer / Adjustment'
  END AS to_location,
  sm.partner_name,
  u.name AS created_by_name,
  sm.created_at
FROM stock_moves sm
JOIN products p ON p.id = sm.product_id
LEFT JOIN locations fl ON fl.id = sm.from_location_id
LEFT JOIN warehouses fw ON fw.id = fl.warehouse_id
LEFT JOIN locations tl ON tl.id = sm.to_location_id
LEFT JOIN warehouses tw ON tw.id = tl.warehouse_id
LEFT JOIN users u ON u.id = sm.created_by;

-- Dashboard KPI view
CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
  (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS total_active_products,
  (SELECT COUNT(*) FROM v_low_stock_alerts) AS low_stock_alerts_count,
  (SELECT COUNT(*) FROM operations WHERE type = 'receipt' AND status IN ('draft', 'waiting', 'ready')) AS pending_receipts,
  (SELECT COUNT(*) FROM operations WHERE type = 'delivery' AND status IN ('draft', 'waiting', 'ready')) AS pending_deliveries,
  (SELECT COUNT(*) FROM operations WHERE type = 'internal' AND status IN ('draft', 'waiting', 'ready')) AS pending_internal_transfers,
  (SELECT ROUND(COALESCE(SUM(sq.quantity * p.cost_price), 0), 2) FROM stock_quants sq JOIN products p ON p.id = sq.product_id) AS total_inventory_valuation;

COMMIT;
