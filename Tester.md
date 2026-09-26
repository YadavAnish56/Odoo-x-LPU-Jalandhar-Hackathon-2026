# StockSense - Full Stack Test & Verification Checklist

This is the working checklist for confirming the whole StockSense stack is actually working: database, backend, and frontend. Go through it section by section against your running environment, tick off what's confirmed, and leave anything broken unchecked so it's easy to spot in review.

---

## Before you start

- The working app (database + backend + frontend connected to the API) is on the `backend` branch. The `Frontend` branch is a UI prototype with mock data (`frontend/src/data.js`), so its numbers never match the database; use it only for the UI checks in section 7.
- Start everything from the root of the `backend` branch (Node.js 20+, PostgreSQL 13+):

  ```bash
  npm run setup                            # install backend + frontend packages
  cp backend/.env.example backend/.env     # then set DATABASE_URL
  npm run db:init                          # create the database and tables
  npm run db:seed                          # demo data
  npm run dev                              # API on http://localhost:5000, app on http://localhost:3000
  ```

- There are two demo data sets. Pick one and use it for the whole run:
  - `npm run db:seed` (backend): 2 warehouses, 5 locations, 8 products, a manager and a staff user.
  - `Database/02_seed.sql` (`main` and `Database` branches): 3 warehouses, 12 locations, 20 products, 19 operations, 5 users. Load it into an empty database after `Database/01_schema.sql` or `npm run db:init` (both create the same tables). Section 8 checks this data set.
- The views in section 2 come from `Database/03_views.sql` (`main` and `Database` branches). The backend does not create or use them, so install them yourself: `psql -U postgres -d stocksense -f Database/03_views.sql`.
- Automated API tests: `npm test`. It needs `TEST_DATABASE_URL` in `backend/.env`, pointing to a separate database whose name contains "test" (it gets wiped). Without it the tests are skipped, not passed.

---

## 1. Database - schema and integrity

- [ ] `users` table exists with a `role` column limited to manager / staff and a `token_version` column (starts at 0)
- [ ] `password_reset_otps` table stores hashed OTPs with expiry (`expires_at`), wrong-attempt count (`attempts`) and `used_at`
- [ ] `warehouses` table has the seeded warehouses: Central Warehouse (WH), Regional Logistics Hub (WH2), North Distribution Center (WH3) with `02_seed.sql`, or Main Warehouse (WH) and Secondary Warehouse (WH2) with `npm run db:seed`
- [ ] `locations` table has locations tied to warehouses, with a unique code per warehouse (for example WH/STOCK, WH/RACK-A, WH/RACK-B, WH/PROD, WH/PACK, WH/QC)
- [ ] `categories` table is a flat list with unique names (with `02_seed.sql`: Raw Materials, Finished Furniture, Electronics & IT, Packaging Supplies, Fasteners & Hardware, Safety & PPE)
- [ ] `products` table stores a unique SKU, category, unit of measure (`uom`), cost price, and active state correctly
- [ ] `stock_quants` never allows a negative value (the `quantity >= 0` check constraint holds, also under concurrent updates)
- [ ] `reorder_rules` stores min_qty and max_qty per product per warehouse (one rule per pair, max_qty can't be below min_qty)
- [ ] `operations` table enforces the lifecycle states (draft, waiting, ready, done, canceled) and the source / destination rule for each type (see section 4)
- [ ] `operation_lines` stores the demanded quantity per product (each product once per operation); for adjustments `quantity` is the counted amount and `system_quantity` the recorded amount before the count
- [ ] `stock_moves` gets a row for every stock change with reference, source, destination, quantity, user, and timestamp; the app only ever inserts into it (no endpoint edits or deletes moves)
- [ ] `sequences` hands out document references per warehouse and type (WH/IN/0001, WH/OUT/0001, WH2/INT/0001, etc.) with no duplicates, even under concurrent requests; a failed create does not use up a number

## 2. Database - analytical views

- [ ] `v_stock_summary` returns one row per product per location with warehouse, full location code (for example WH/STOCK), and stock value (quantity x cost price)
- [ ] `v_product_inventory` returns correct totals per product: total on hand, total valuation, and the number of locations that hold stock
- [ ] `v_low_stock_alerts` lists active products whose stock in a warehouse is at or below `min_qty`, with `reorder_quantity = max_qty - current_stock`
- [ ] `v_operations_overview` resolves warehouse and location codes, partner names, line counts, total quantity, and responsible users correctly
- [ ] `v_stock_ledger` produces a clean, human-readable audit trail with one row per `stock_moves` row (same quantities and locations)
- [ ] `v_dashboard_kpis` returns accurate numbers in a single row (active products, low stock alerts, pending receipts / deliveries / internal transfers, total inventory value) that match a manual count. Note: the app dashboard uses its own API queries and counts low stock and out of stock separately, so its numbers can differ from this view

## 3. Backend - authentication and security

- [ ] Login issues a valid JWT signed with HS256 (HMAC-SHA256) that expires after `JWT_EXPIRES_IN` (7 days by default)
- [ ] Passwords are stored bcrypt-hashed (10 rounds), never in plain text
- [ ] Logout, password reset, and password change increment `token_version`, which immediately invalidates all existing sessions for that user, across devices
- [ ] Manager role can do the manager-only actions: create, edit, and delete products, categories, warehouses, locations, and reordering rules, and change user roles
- [ ] Staff role gets 403 on those manager-only actions (staff can still create, validate, and cancel operations, and make stock adjustments)
- [ ] Password reset OTP is 6 digits, stored hashed, expires after 10 minutes (`OTP_EXPIRY_MINUTES`), and is blocked after 5 wrong attempts (a new OTP is needed); a new OTP can be requested at most once every 60 seconds
- [ ] Forgot password for manager@stocksense.com or staff@stocksense.com shows the OTP on screen (these inboxes are not real), also on the live site, and a new code can be requested right away
- [ ] The first account created with Sign Up becomes a manager; later sign-ups join as staff
- [ ] Demo accounts work as expected:
  - [ ] manager@stocksense.com / Manager@123
  - [ ] staff@stocksense.com / Staff@123
  - [ ] with `02_seed.sql` only: rahul.sharma@, priya.patel@ (manager), and amit.verma@stocksense.com, all with Staff@123

## 4. Backend - operations and business logic

- [ ] Zod validation rejects malformed requests on every write endpoint with 400 and a list of field errors
- [ ] Operation lifecycle moves correctly: draft -> confirm -> ready (stock available and reserved) or waiting (not enough stock) -> validate -> done; draft, waiting, and ready operations can be canceled, and only draft or canceled ones can be deleted
- [ ] A waiting delivery or transfer becomes ready automatically when enough stock arrives at its source location
- [ ] Validating an operation (moving it to done) updates `stock_quants` and appends to `stock_moves` inside a single atomic transaction (no partial updates if something fails mid-way)
- [ ] Receipt operations correctly treat source as external (vendor) and destination as the warehouse location
- [ ] Delivery operations correctly treat source as the warehouse location and destination as external (customer); the optional pick and pack steps only work on ready deliveries, and pack needs pick first
- [ ] Internal transfer operations move stock between two different locations (also across warehouses) without changing total company stock
- [ ] Adjustments (`POST /api/adjustments`) use the same location as source and destination, take a counted quantity or a +/- difference, are applied immediately as done, and log only the difference in `stock_moves`; the reason (`notes`) is optional
- [ ] Reorder logic marks a rule `low` once stock is at or below `min_qty` (`out` at zero), computes `suggestedQty = max_qty - on_hand`, and surfaces it in `GET /api/alerts/low-stock` and on the dashboard
- [ ] Connection pooling (up to 10 connections) holds up under multiple concurrent requests without exhausting connections

## 5. Backend - API correctness

- [ ] All CRUD endpoints for products, categories, warehouses, locations, and reordering rules work as expected (deleting a product archives it; a warehouse or location that still holds stock can't be deleted)
- [ ] Endpoints return correct HTTP status codes: 200 / 201 on success, 400 for validation errors, 401 for a missing or bad token, 403 for the wrong role, 404 when not found, 409 for conflicts (duplicate SKU or code, not enough stock, wrong status)
- [ ] Endpoints reject requests with an expired or invalid JWT (every `/api` route except health, signup, login, forgot password, verify OTP, and reset password)
- [ ] Pagination (`page`, `limit`: 20 by default, 100 max) and filters on products, stock, operations, adjustments, and moves return correct subsets and totals
- [ ] No endpoint allows a stock quantity to go negative, even via a race condition (test with concurrent requests: when stock covers only one of two deliveries validated at the same time, only one succeeds)

## 6. Frontend - core screens

Test these on the API-connected frontend (`backend` branch, http://localhost:3000).

- [ ] Dashboard KPIs (products in stock, low stock, out of stock, pending receipts, pending deliveries, scheduled transfers) match the database, and the warehouse and category filters change them
- [ ] Products screen lists items with correct SKU, category, stock, and reorder level, matching the database; search by name or SKU and the filters work
- [ ] Product Details shows accurate stock by location (on hand, reserved, free to use) and movement history for that product
- [ ] Receipts list and creation flow work end to end and reflect in `stock_moves` after validation
- [ ] Delivery Orders list and creation flow work end to end, including the "Not enough stock" warning and the waiting status
- [ ] Internal Transfers list and creation flow work end to end, and the screen states that total company stock does not change
- [ ] Inventory Adjustments flow shows recorded vs physical count and the difference, and applies only when "Apply Adjustment" is clicked; the reason is optional and is shown on the adjustment
- [ ] Move History matches the `v_stock_ledger` data exactly; Stock Ledger shows an out and an in row for each transfer and a running balance per product and location
- [ ] Warehouses and Reordering Rules screens reflect the actual warehouses, locations, and rules in the database
- [ ] Low-stock alerts on the frontend match `v_low_stock_alerts` output (same products and warehouses, suggested quantity = `reorder_quantity`)

## 7. Frontend - UI states and responsiveness

- [ ] Loading, empty, error, success, and confirmation states appear correctly on every major screen
- [ ] Layout works correctly on desktop, tablet, and mobile breakpoints (below 1024 px the menu becomes a bottom navigation bar)
- [ ] Status is never communicated by color alone; always paired with text or an icon
- [ ] Keyboard focus states are visible throughout the app

## 8. Seed data sanity check (`Database/02_seed.sql`)

- [ ] 5 users are present (2 managers, 3 staff)
- [ ] 3 warehouses are present and correctly named
- [ ] 12 locations are present and correctly tied to their warehouses (6 in WH, 3 in WH2, 3 in WH3)
- [ ] 20 products are present across all 6 categories, with 12 reordering rules
- [ ] 19 pre-loaded operations are present (10 done, 8 open, 1 canceled), including receipts from Tata Steel and Dell, dispatches to Larsen & Toubro, internal transfers (one from WH2 to WH), and one adjustment (WH/ADJ/0001)
- [ ] Right after seeding, exactly 3 low-stock alerts show: Industrial Hydraulic Oil, Solid Oak Executive Desk, and Cat6 UTP Cable Box 305m
- [ ] Seed data loads cleanly on a fresh database with no constraint violations or duplicate key errors, and running it again changes nothing

## 9. End-to-end integration check

- [ ] A manager can log in, create a receipt, validate it, and see stock increase on the dashboard, in Products, and in the Stock Ledger
- [ ] A staff user can log in, create and validate a delivery, and see stock decrease correctly, including a stock ledger entry
- [ ] A delivery for more than the free stock goes to waiting, and becomes ready automatically once a receipt brings in enough stock
- [ ] An internal transfer moves stock between two locations and total company stock stays exactly the same before and after
- [ ] An inventory adjustment changes stock only when applied, shows up in the ledger with the difference, and keeps its reason on the adjustment
- [ ] Triggering a reorder condition (stock at or below min_qty) surfaces the correct alert with the correct suggested quantity on the dashboard
- [ ] After logout or a password reset, the old token no longer works (the API answers 401)

---

## How to use this

1. Set up as described in "Before you start" and run `npm test` first, then go through each section against your local environment or deployed build, checking database, backend, and frontend together where a feature spans all three.
2. Check off anything confirmed working, leave the rest unchecked as open issues.
3. For anything broken, open a GitHub issue and reference the section number, for example "Section 4, stock quants not updating atomically on validate."
4. Re-run this full checklist before every release or demo, especially before the hackathon presentation.
