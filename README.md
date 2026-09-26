# StockSense — Modern Inventory Management System
> Odoo x LPU Jalandhar Hackathon 2026

StockSense replaces manual registers and Excel sheets with one real-time app for every stock movement:
receipts from vendors, deliveries to customers, internal transfers between warehouses and racks, and stock
adjustments after physical counts, all recorded in a stock ledger.

| Part | Tech | Folder |
|---|---|---|
| Frontend | Vanilla JS (ES modules), Vite 6, Tailwind CSS | [`frontend/`](frontend) |
| Backend | Node.js, Express 5, JWT auth, Zod validation | [`backend/`](backend) |
| Database | PostgreSQL | [`backend/src/db/schema.sql`](backend/src/db/schema.sql) |

---

## 🚀 Quick Start

Requirements: **Node.js 20+** and **PostgreSQL 13+** (running locally).

```bash
# 1. Install backend + frontend packages
npm run setup

# 2. Configure the backend: copy the example file and put your PostgreSQL password in DATABASE_URL
cp backend/.env.example backend/.env        # Windows: copy backend\.env.example backend\.env

# 3. Create the database + tables, then load demo data
npm run db:init
npm run db:seed

# 4. Start backend (http://localhost:5000) and frontend (http://localhost:3000) together
npm run dev
```

Open **http://localhost:3000**. The frontend forwards `/api` requests to the backend automatically.

You can also run them separately: `npm run dev:backend` and `npm run dev:frontend`.

## 🔑 Demo Login

| Role | Email | Password |
|---|---|---|
| Inventory Manager | `manager@stocksense.com` | `Manager@123` |
| Warehouse Staff | `staff@stocksense.com` | `Staff@123` |

Or click **Auto Login** on the sign-in screen. New sign-ups: the first account becomes the manager,
later accounts join as staff (a manager can promote them from **My Profile → Team**).

**Password reset:** without an email server configured, the 6-digit OTP is shown on the screen and in the
backend console (development mode). Add SMTP settings in `backend/.env` to send real emails.

---

## 🌟 Pages

| Page | Route | What you can do |
|---|---|---|
| Landing page | `/landing.html` | Marketing page |
| Sign in / Sign up | `/#auth` | Login, signup, forgot password → OTP → new password |
| Dashboard | `/#dashboard` | KPIs (products in stock, low / out of stock, pending receipts & deliveries, scheduled transfers), warehouse & category filters, movement chart (7/30/90 days), low stock alerts with one-click reorder, recent operations filtered by type & status, CSV export, SKU scan |
| Products | `/#products` | Search by name / SKU, filter by category, stock level and warehouse, add / edit / archive products, initial stock, stock per location |
| Product detail | `/#product-detail-:id` | Stock by location, free-to-use vs reserved, movement history, reordering rules, adjust or transfer stock |
| Operations | `/#operations` | Receipts, delivery orders, internal transfers and adjustments: Draft → Waiting / Ready → Done, pick & pack, validate, cancel |
| Warehouses | `/#warehouses` | Warehouses & locations (Settings → Warehouse), reordering rules with suggested order quantity |
| Ledger | `/#ledger` | Move history and a stock ledger with running balance per location, CSV export |
| Profile / Settings | `/#profile`, `/#settings` | Update profile, change password, team roles, currency, sign out |

Press **Ctrl + K** (⌘K) anywhere to search products and operations. The bell shows low stock alerts.

## 🧱 How stock moves

- **Receipt** (WH/IN/0001): validate → stock **increases** at the destination location.
- **Delivery** (WH/OUT/0001): confirm → *Ready* if stock is available (it is reserved) or *Waiting* if not;
  waiting orders become ready automatically when stock arrives; validate → stock **decreases**.
- **Internal transfer** (WH/INT/0001): stock moves between locations / warehouses; total stock stays the same.
- **Adjustment** (WH/ADJ/0001): enter the counted quantity; the difference is applied and logged.

Every change is written to the stock ledger inside a database transaction, so stock can never go negative,
even when two people validate at the same time.

## 📚 More documentation

- [backend/README.md](backend/README.md) — backend setup, scripts, database design
- [backend/API.md](backend/API.md) — every API endpoint with examples

## 🧪 Tests

```bash
# Backend end-to-end API tests (needs a separate database whose name contains "test")
# set TEST_DATABASE_URL in backend/.env, then:
npm test
```
