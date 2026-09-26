# StockSense - Full Stack Test & Verification Checklist

This is the working checklist for confirming the whole StockSense stack is actually working: database, backend, and frontend. Go through it section by section against your running environment, tick off what's confirmed, and leave anything broken unchecked so it's easy to spot in review.

---

## 1. Database - schema and integrity

- [ ] `users` table exists with role field (manager, staff) and a working `token_version` column
- [ ] `password_reset_otps` table stores hashed OTPs with expiry and attempt tracking
- [ ] `warehouses` table has the seeded warehouses: Central Warehouse (WH), Regional Hub (WH2), North Distribution Center (WH3)
- [ ] `locations` table has bins/zones tied to warehouses (Main Stock, High Racks, QC Staging, Packing Line, Dispatch)
- [ ] `categories` table supports the hierarchy (Raw Materials, Furniture, IT Hardware, Fasteners, Packaging, PPE)
- [ ] `products` table stores SKU, barcode, unit of measure, unit cost, and active state correctly
- [ ] `stock_quants` never allows a negative value (check constraint holds under concurrent updates)
- [ ] `reorder_rules` stores min_qty and max_qty per product per warehouse
- [ ] `operations` table enforces the lifecycle states: draft, waiting, ready, done, canceled
- [ ] `operation_lines` correctly tracks demanded vs counted quantities
- [ ] `stock_moves` is append-only and immutable, records source, destination, quantity, and timestamp for every movement
- [ ] `sequences` generates thread-safe, gap-free document references (WH/IN/0001, WH/OUT/0001, etc.) even under concurrent requests

## 2. Database - analytical views

- [ ] `v_stock_summary` returns correct live stock aggregated by warehouse and bin, with valuation
- [ ] `v_product_inventory` returns correct totals, pricing, and storage distribution per product
- [ ] `v_low_stock_alerts` correctly flags products below their safety threshold and calculates the right replenishment quantity
- [ ] `v_operations_overview` resolves warehouse codes, counterparties, line counts, and responsible users correctly
- [ ] `v_stock_ledger` produces a clean, human-readable audit trail matching the raw `stock_moves` data
- [ ] `v_dashboard_kpis` returns accurate KPI numbers in a single query and matches what the dashboard displays

## 3. Backend - authentication and security

- [ ] Login issues a valid JWT signed with HMAC-SHA256
- [ ] Passwords are stored bcrypt-hashed (10 rounds), never in plain text
- [ ] Incrementing `token_version` immediately invalidates all existing sessions for that user, across devices
- [ ] Manager role can access admin-only actions (warehouse config, reorder rules, user management, valuation)
- [ ] Staff role is correctly blocked from manager-only actions
- [ ] Password reset OTP is 6 digits, expires after 10 minutes, and locks out after repeated wrong attempts
- [ ] Demo accounts work as expected:
  - [ ] manager@stocksense.com / Manager@123
  - [ ] staff@stocksense.com / Staff@123

## 4. Backend - operations and business logic

- [ ] Zod validation rejects malformed requests on every write endpoint
- [ ] Operation lifecycle moves correctly through draft to waiting to ready to done, and can be canceled at the right stages
- [ ] Validating an operation (moving it to done) updates `stock_quants` and appends to `stock_moves` inside a single atomic transaction (no partial updates if something fails mid-way)
- [ ] Receipt operations correctly treat source as external (vendor) and destination as the warehouse location
- [ ] Delivery operations correctly treat source as the warehouse location and destination as external (customer)
- [ ] Internal transfer operations move stock between two warehouse locations without changing total company stock
- [ ] Adjustment operations use the same location as source and destination, and require a reason before applying
- [ ] Reorder logic correctly computes `shortfall = max_qty - current_stock` once stock drops below `min_qty`, and surfaces it in the alert pipeline
- [ ] Connection pooling holds up under multiple concurrent requests without exhausting connections

## 5. Backend - API correctness

- [ ] All CRUD endpoints for products, warehouses, locations, and categories work as expected
- [ ] Endpoints return correct HTTP status codes for success, validation errors, and auth failures
- [ ] Endpoints reject requests with an expired or invalid JWT
- [ ] Pagination/filtering (where implemented) returns correct subsets of data
- [ ] No endpoint allows a stock quantity to go negative, even via a race condition (test with concurrent requests)

## 6. Frontend - core screens

- [ ] Dashboard shows live KPIs pulled from `v_dashboard_kpis` and matches the database values
- [ ] Products screen lists items with correct SKU, category, stock, and reorder level, matching the database
- [ ] Product Details shows accurate stock by location and movement history for that product
- [ ] Receipts list and creation flow work end to end and reflect in `stock_moves` after validation
- [ ] Delivery Orders list and creation flow work end to end, including the insufficient-stock warning
- [ ] Internal Transfers list and creation flow work end to end, and make it visually clear total stock is unchanged
- [ ] Inventory Adjustments flow shows recorded vs physical count, requires a reason, and requires confirmation before applying
- [ ] Move History and Stock Ledger screens match the `v_stock_ledger` data exactly
- [ ] Warehouses and Reordering Rules screens reflect the actual seeded warehouses and rules
- [ ] Low-stock alerts on the frontend match `v_low_stock_alerts` output

## 7. Frontend - UI states and responsiveness

- [ ] Loading, empty, error, success, and confirmation states appear correctly on every major screen
- [ ] Layout works correctly on desktop, tablet, and mobile breakpoints
- [ ] Status is never communicated by color alone; always paired with text or an icon
- [ ] Keyboard focus states are visible throughout the app

## 8. Seed data sanity check

- [ ] 3 warehouses are present and correctly named
- [ ] 12 locations are present and correctly tied to their warehouses
- [ ] 20 products are present across all listed categories
- [ ] 19 pre-loaded operations are present, including receipts from Tata Steel and Dell, dispatches to Larsen & Toubro, inter-rack transfers, and adjustment entries
- [ ] Seed data loads cleanly on a fresh database with no constraint violations or duplicate key errors

## 9. End-to-end integration check

- [ ] A manager can log in, create a receipt, validate it, and see stock increase on the dashboard, in Products, and in the Stock Ledger
- [ ] A staff user can log in, create and validate a delivery, and see stock decrease correctly, including a stock ledger entry
- [ ] An internal transfer moves stock between two locations and total company stock stays exactly the same before and after
- [ ] An inventory adjustment changes stock only after confirmation, and shows up correctly in the ledger with its reason attached
- [ ] Triggering a reorder condition (dropping stock below min_qty) surfaces the correct alert with the correct shortfall number on the dashboard

---

## How to use this

1. Run through each section against your local environment or deployed build, checking database, backend, and frontend together where a feature spans all three.
2. Check off anything confirmed working, leave the rest unchecked as open issues.
3. For anything broken, open a GitHub issue and reference the section number, for example "Section 4, stock quants not updating atomically on validate."
4. Re-run this full checklist before every release or demo, especially before the hackathon presentation.
