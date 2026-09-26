# 📦 StockSense — Inventory Management System
## Hackathon Project Report & Technical Documentation
**Event:** Odoo × LPU Jalandhar Hackathon 2026  
**Track:** Enterprise Resource Planning & Inventory Optimization  
**Project:** StockSense — Next-Gen Warehouse & Inventory Management Platform  

---

## 1. Executive Summary

**StockSense** is an enterprise-grade, multi-warehouse inventory management system inspired by the robust double-entry bookkeeping architecture of Odoo Inventory. Designed for fast-moving logistics, manufacturing, and distribution centers, StockSense delivers real-time stock visibility, traceability, automated replenishment triggers, and granular movement tracking across warehouses, zones, and bins.

The platform provides a streamlined user interface, a resilient RESTful API backend, and a relational PostgreSQL database engine engineered for high-throughput transactional consistency.

---

## 2. Problem Statement & Motivation

Modern supply chains face critical bottlenecks when managing stock across distributed facilities:
- **Discrepancies & Human Error:** Inaccurate manual logs lead to discrepancies between physical inventory and system records.
- **Stockouts & Overstocking:** Lack of predictive or threshold-based alerts leads to production downtime or excessive tied-up capital.
- **Zero Audit Trail:** Without immutable movement logging, identifying shrinkage, damage, or routing errors is nearly impossible.
- **Multi-Warehouse Complexity:** Traditional legacy systems struggle with inter-facility transfers, zone-level bin allocation, and role separation.

**StockSense solves these challenges** by implementing double-entry stock movement semantics where goods are never simply deleted or updated in place—every gram, litre, or unit moved is accounted for through an immutable audit ledger.

---

## 3. System Architecture & Tech Stack

```
+-------------------------------------------------------------------+
|                           StockSense                              |
+-------------------------------------------------------------------+
                                  |
                                  v
+-----------------------+-----------------------+-------------------+
|      Frontend         |        Backend        |     Database      |
|  (Responsive UI)      |   (RESTful Express)   |   (PostgreSQL)    |
+-----------------------+-----------------------+-------------------+
| - Dashboard KPIs      | - Node.js & Express   | - Relational ACID |
| - Operations Kanbans  | - JWT & Role Auth     | - Double-Entry    |
| - Product Catalogs    | - Connection Pooling  | - Immutable Moves |
| - Low-Stock Alerts    | - Zod Validations     | - Fast Views      |
+-----------------------+-----------------------+-------------------+
```

### Component Breakdown
| Layer | Technologies & Libraries | Key Responsibility |
|---|---|---|
| **Database** | PostgreSQL 14+, pgPool, Analytical Views | ACID persistence, integrity constraints, stock ledger, KPI views |
| **Backend** | Node.js, Express, `pg`, `bcryptjs`, `jsonwebtoken`, `zod` | Business logic, state machines, transactional operations, auth |
| **Security** | JWT (bearer token), Argon2/Bcrypt, OTP expiry throttling | Multi-role access control (`manager`, `staff`), session invalidation |

---

## 4. Database Engineering & Schema Design

The StockSense database model adheres to strict 3NF normalization rules combined with high-performance indexing and analytical SQL views.

### 4.1 Core Entity Relational Diagram (ERD Overview)

- **`users`**: System credentials, role-based authorization (`manager`, `staff`), and `token_version` for instant session revocation.
- **`password_reset_otps`**: Secure password recovery with hashed OTPs, expiration windows, and attempt throttling.
- **`warehouses`**: Physical logistics centers (e.g., `WH` - Central Warehouse, `WH2` - Regional Hub).
- **`locations`**: Storage bins and functional zones within warehouses (`WH/STOCK`, `WH/RACK-A`, `WH/PROD`, `WH/QC`).
- **`categories`**: Hierarchical product taxonomy (Raw Materials, Finished Goods, Electronics, Packaging).
- **`products`**: Item master catalog tracking SKU, barcode, unit of measure (`uom`), unit cost price, and active states.
- **`stock_quants`**: Real-time stock on hand per `(product_id, location_id)` with non-negative constraints.
- **`reorder_rules`**: Automated replenishment parameters (`min_qty`, `max_qty`) per product per warehouse.
- **`operations`**: Document headers controlling movement workflows (`receipt`, `delivery`, `internal`, `adjustment`) across lifecycle states (`draft`, `waiting`, `ready`, `done`, `canceled`).
- **`operation_lines`**: Itemized product demands and physical count verification quantities.
- **`stock_moves`**: The immutable double-entry ledger recording source, destination, quantity, and timestamp for every physical movement.
- **`sequences`**: Thread-safe sequence generators for document references (e.g., `WH/IN/0001`, `WH/OUT/0001`).

### 4.2 Operation Routing Semantics

| Operation Type | Source Location | Destination Location | Business Meaning |
|---|---|---|---|
| **Receipt (`receipt`)** | `NULL` (Vendor) | Warehouse Location | Inbound purchase order received into stock |
| **Delivery (`delivery`)** | Warehouse Location | `NULL` (Customer) | Outbound sales order dispatched to client |
| **Transfer (`internal`)** | Warehouse Location A | Warehouse Location B | Inter-zone or inter-warehouse stock rebalancing |
| **Adjustment (`adjustment`)** | Warehouse Location | Warehouse Location (`source = dest`) | Physical inventory cycle count correction |

### 4.3 Analytical Views for High-Speed Queries
Rather than requiring expensive multi-table joins on every API call, StockSense utilizes pre-indexed SQL views:
1. **`v_stock_summary`**: Live stock aggregated by warehouse and bin with valuation.
2. **`v_product_inventory`**: Catalog-wide stock totals, pricing, and storage distribution.
3. **`v_low_stock_alerts`**: Real-time calculation of stock falling below safety thresholds with recommended replenishment quantities.
4. **`v_operations_overview`**: Operation tracking with resolved warehouse codes, counterparties, line counts, and responsible personnel.
5. **`v_stock_ledger`**: Clean human-readable audit trail of all historical movements.
6. **`v_dashboard_kpis`**: Single-row subquery bundle delivering instant KPI metrics for dashboard summary cards.

---

## 5. Key Features & Business Logic

### 5.1 Real-Time Multi-Warehouse Inventory
- Unified dashboard tracking inventory across multiple locations.
- Bin-level tracking (`WH/RACK-A`, `WH/PROD`, `WH/QC`).
- Live valuation calculation based on weighted unit cost.

### 5.2 End-to-End Operation Lifecycle
Operations transition cleanly through strict workflow stages:
```
[Draft]  --->  [Waiting Availability]  --->  [Ready to Transfer]  --->  [Validated (Done)]
   |                                                                          |
   +--------------------------------->  [Canceled]  <-------------------------+
```
- **Validation Transaction:** When an operation moves to `done`, stock quants are updated inside an ACID transaction and an immutable row is appended to `stock_moves`.
- **Negative Stock Prevention:** Strict check constraints ensure inventory quantities never dip below zero.

### 5.3 Automated Replenishment & Reorder Triggers
- Each product can have dedicated min/max safety limits per warehouse.
- When on-hand stock drops below `min_qty`, the system automatically computes `shortfall = max_qty - current_stock` and surfaces it in the procurement alert pipeline.

### 5.4 Cycle Count Stock Adjustments
- Allows physical stock counts to be reconciled against system quantities.
- Discrepancies generate adjustment operations with audit reasons (e.g., spillage, damaged goods, found items).

---

## 6. Security, Compliance & Authentication

- **Authentication:** Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256.
- **Password Security:** Salted and hashed using `bcrypt` (10 rounds).
- **Session Revocation:** Users table contains a `token_version` counter; incrementing it immediately invalidates all active sessions across devices.
- **Role-Based Access Control (RBAC):**
  - **`manager`:** Full administrative control (warehouse configuration, reordering rules, user management, financial valuation).
  - **`staff`:** Operational execution (processing receipts, picking deliveries, shelving internal transfers).
- **Password Reset:** 6-digit cryptographic OTPs with a 10-minute expiry window and brute-force attempt limits.

---

## 7. Testing, Seed Data & Verification

The database includes a rich demo dataset reflecting an active manufacturing & distribution environment:
- **3 Warehouses:** Central Warehouse (WH), Regional Hub (WH2), North Distribution Center (WH3).
- **12 Specialized Locations:** Main Stock, High Racks, QC Staging, Packing Line, Dispatch.
- **20 Products:** Categorized across Raw Materials, Furniture, IT Hardware, Fasteners, Packaging, and PPE.
- **Demo Users:**
  - Manager: `manager@stocksense.com` / `Manager@123`
  - Staff: `staff@stocksense.com` / `Staff@123`
- **19 Pre-loaded Operations:** Demonstrating receipts from Tata Steel and Dell, dispatches to Larsen & Toubro, inter-rack movements, and cycle count adjustments.

---

## 8. Future Roadmap & Scalability

1. **Barcode / QR Code Scanner Support:** Direct integration with mobile web cameras and zebra handheld scanners for fast warehouse picking.
2. **Serial & Batch / Lot Number Tracking:** Expiry date tracking for perishable goods and batch recall management.
3. **Automated Purchase Order Generation:** One-click conversion of low-stock alerts into draft vendor purchase orders.
4. **Predictive Inventory Forecasting:** Machine learning models analyzing historical burn rates and seasonal spikes to suggest optimal `min_qty` thresholds.

---

## 9. Conclusion

StockSense bridges the gap between complex enterprise ERP systems and modern, agile web applications. By pairing a mathematically sound double-entry ledger design with a clean, high-performance tech stack, it provides warehouse managers and logistics operators with transparency, zero-data-loss accounting, and operational efficiency.
