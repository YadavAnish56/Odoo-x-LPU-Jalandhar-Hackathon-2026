# StockSense Database

PostgreSQL database schema, demo seed data, and analytical views for StockSense.

---

## Quick Setup

Make sure PostgreSQL is running locally on port 5432 with an active database named `stocksense`.

### Option 1: Using `psql` directly

```bash
# 1. Create database if it doesn't exist
psql -U postgres -c "CREATE DATABASE stocksense;"

# 2. Run schema, seed data, and views
psql -U postgres -d stocksense -f Database/01_schema.sql
psql -U postgres -d stocksense -f Database/02_seed.sql
psql -U postgres -d stocksense -f Database/03_views.sql
```

### Option 2: Using Backend NPM Scripts

If you are working from the repository root:

```bash
cd backend
npm install
npm run db:init   # Creates tables if missing
npm run db:seed   # Seeds initial users, warehouses, and operations
```

To wipe and rebuild from scratch:
```bash
npm run db:reset
npm run db:seed
```

---

## Demo Accounts

The seed script creates two default users:

| Name | Role | Email | Password |
|---|---|---|---|
| Inventory Manager | `manager` | `manager@stocksense.com` | `Manager@123` |
| Warehouse Staff | `staff` | `staff@stocksense.com` | `Staff@123` |

Passwords are pre-hashed using `bcryptjs` (cost factor 10).

---

## Schema Architecture

The database consists of 12 core tables designed around double-entry warehouse movement patterns:

### Core Tables

1. **`users`**: System users with role-based permissions (`manager`, `staff`) and `token_version` for session invalidation.
2. **`password_reset_otps`**: Stores hashed 6-digit verification codes for password recovery with expiry and attempt throttling.
3. **`warehouses`**: Physical facilities (e.g. `WH` - Main Warehouse, `WH2` - Secondary Warehouse).
4. **`locations`**: Storage bins, racks, or areas scoped to a warehouse (e.g. `WH/STOCK`, `WH/RACK-A`, `WH/PROD`). Unique per `(warehouse_id, code)`.
5. **`categories`**: Product classifications (Raw Materials, Furniture, Electronics, Packaging).
6. **`products`**: Product catalog items with SKU, unit of measure (`uom`), cost price, and active toggle.
7. **`stock_quants`**: Current stock on hand per `(product_id, location_id)`.
8. **`reorder_rules`**: Minimum and maximum stock thresholds configured per product per warehouse.
9. **`operations`**: Document headers for inventory movements (`receipt`, `delivery`, `internal`, `adjustment`) tracking status (`draft`, `waiting`, `ready`, `done`, `canceled`).
10. **`operation_lines`**: Itemized product lines and demanded quantities belonging to an operation.
11. **`stock_moves`**: Immutable ledger of every executed inventory movement. Tracks exact source and destination locations, reference, and timestamps.
12. **`sequences`**: Atomic sequence counters for auto-generating formatted document references (e.g. `WH/IN/0001`, `WH/OUT/0001`).

---

## Operation Routing Rules

| Operation Type | Source Location | Destination Location | Notes |
|---|---|---|---|
| `receipt` | `NULL` | Warehouse Location | Inbound from supplier (`partner_name`) |
| `delivery` | Warehouse Location | `NULL` | Outbound to customer (`partner_name`) |
| `internal` | Warehouse Location A | Warehouse Location B | Inter-zone transfer within or between facilities |
| `adjustment` | Warehouse Location | Warehouse Location | Physical count correction (`source = dest`) |

---

## Pre-built Database Views

Run `Database/03_views.sql` to install these convenience views:

- `v_stock_summary`: Current on-hand quantities with warehouse codes, full location paths (`WH/STOCK`), and item valuation.
- `v_product_inventory`: Aggregated inventory across all warehouses with total stock counts and inventory value.
- `v_low_stock_alerts`: Products whose warehouse stock has fallen below the configured `min_qty` in `reorder_rules`.
- `v_operations_overview`: High-level list of operations with resolved location codes, partner names, line counts, and user names.
- `v_stock_ledger`: Human-readable audit log of all stock movements.
- `v_dashboard_kpis`: Fast single-row KPI aggregate for dashboard stat cards.

---

## Backend Connection

Configure the backend database connection in `backend/.env`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/stocksense
```

The backend uses `pg.Pool` with connection pooling and handles transactional updates for operations and inventory validation.
