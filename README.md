# StockSense — Inventory Management System
> Odoo x LPU Jalandhar Hackathon 2026

StockSense replaces manual registers and Excel sheets with one real-time app for every stock movement:
receipts from vendors, deliveries to customers, internal transfers between warehouses and racks, and stock
adjustments after physical counts — all recorded in a stock ledger.

| Part | Tech | Folder |
|---|---|---|
| Frontend | Vanilla JS (ES modules), Vite 6, Tailwind CSS | [`frontend/`](frontend) |
| Backend | Node.js, Express 5, JWT auth, Zod validation | [`backend/`](backend) |
| Database | PostgreSQL | [`backend/src/db/schema.sql`](backend/src/db/schema.sql) |

---

## Quick start

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

Open **http://localhost:3000**. Keep the terminal open — the site runs only while `npm run dev` is running.

## Deploy online (free)

The backend serves the built frontend in production, so the whole app runs as **one web service**.
The repo includes a [render.yaml](render.yaml) for [Render](https://render.com); the database can be a free
[Neon](https://neon.tech) PostgreSQL.

1. **Neon:** create a project and copy its connection string (`postgresql://...neon.tech/neondb?sslmode=require`).
2. **Render:** New → Blueprint → select this repository. When asked, paste the Neon string as `DATABASE_URL`.
   Render builds with `npm run setup && npm run build` and starts with `npm run db:setup && npm start`
   (creates the tables and the demo data on the first start).
3. Open the `https://<name>.onrender.com` link. Every push to `main` redeploys automatically.

Password reset emails: add `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER` and `SMTP_PASS`
(a Gmail app password) in Render → Environment. Without them the reset code is only written to Render's logs.

Free plan: the service sleeps after 15 minutes without visits; the next visit takes about a minute.

## Demo login

| Role | Email | Password |
|---|---|---|
| Inventory Manager | `manager@stocksense.com` | `Manager@123` |
| Warehouse Staff | `staff@stocksense.com` | `Staff@123` |

Both accounts are listed on the sign-in screen with a **Use this account** button. If you change one of
their passwords (My Profile or Forgot password with OTP), the sign-in screen shows the new password in that
browser, and an open sign-in tab updates immediately. New sign-ups: the first account becomes the Inventory Manager,
later accounts join as Warehouse Staff (a manager can change roles in **Settings → Warehouses → Users & roles**).

**Password reset (OTP):** without an email server configured, the 6-digit OTP is shown on the screen and in the
backend console (development mode). Add SMTP settings in `backend/.env` to send real emails.

---

## Problem statement → app

| Problem statement | Where in StockSense |
|---|---|
| Sign up / log in, OTP password reset, redirect to dashboard | Sign-in screen → **Dashboard** |
| Dashboard KPIs: products in stock, low / out of stock, pending receipts, pending deliveries, internal transfers scheduled | **Dashboard** (5 KPI cards, click to open the matching list) |
| Dynamic filters: document type, status, warehouse / location, product category | **Dashboard** filter bar (updates KPIs and the operations table) |
| Products: create / update, stock per location, categories, reordering rules | **Products**, **Stock by Location**, **Categories**, **Reordering Rules** |
| Product fields: name, SKU / code, category, unit of measure, initial stock | **Products → New Product** |
| Receipts: supplier & products → quantities → validate → stock increases | **Operations → Receipts** |
| Delivery orders: pick → pack → validate → stock decreases | **Operations → Delivery Orders** |
| Internal transfers (warehouse → floor, rack → rack, warehouse → warehouse) | **Operations → Internal Transfers** |
| Stock adjustments: select product / location, enter counted quantity | **Operations → Inventory Adjustment** |
| Move history / stock ledger | **Move History** (moves + ledger with running balance) |
| Setting → Warehouse | **Settings → Warehouses** (warehouses and their locations) |
| Profile menu (left sidebar): My Profile, Logout | Bottom of the left sidebar |
| Alerts for low stock, multi-warehouse, SKU search & smart filters | Bell icon + dashboard alerts, warehouses & locations, **Ctrl + K** search and list filters |

## How stock moves

- **Receipt** (`WH/IN/0001`): validate → stock **increases** at the destination location.
- **Delivery** (`WH/OUT/0001`): *Mark as To Do* → **Ready** if stock is available (it is reserved) or **Waiting** if not;
  waiting orders become ready automatically when stock arrives; pick → pack → validate → stock **decreases**.
- **Internal transfer** (`WH/INT/0001`): stock moves between locations / warehouses; total stock stays the same.
- **Adjustment** (`WH/ADJ/0001`): enter the counted quantity; the difference is applied and logged.

Every change is written to the stock ledger inside a database transaction, so stock can never go negative,
even when two people validate at the same time.

## More documentation

- [backend/README.md](backend/README.md) — backend setup, scripts and database design (ER diagram)
- [backend/API.md](backend/API.md) — every API endpoint with examples
- [Database/](Database) — SQL scripts (schema, seed data, views) and setup notes from the database team
- [Tester.md](Tester.md) — testing checklist

## Tests

```bash
# Backend end-to-end API tests (needs a separate database whose name contains "test")
# set TEST_DATABASE_URL in backend/.env, then:
npm test
```
