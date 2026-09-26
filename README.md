# StockSense — Modern Inventory Management System
> Odoo x LPU Jalandhar Hackathon 2026

StockSense is an enterprise-grade inventory management system designed for multi-warehouse physical operations, immutable stock ledgers, and automated replenishment.

---

## 🚀 Quick Start (Frontend)

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will be live at: **`http://localhost:3000/`**

---

## 🔑 Demo Login Credentials

- **Email**: `admin@stocksense.com`
- **Password**: `admin123`
- *(Or click the **"Auto Login"** button directly on the sign-in screen)*

---

## 🌟 Pages & Architecture

| Module | URL / Route | Description |
|---|---|---|
| **Marketing Landing Page** | `/landing.html` | High-fidelity product landing page with live telemetry simulation, bento grid, pricing, and demo scheduling. |
| **Authentication** | `/#auth` | Split-screen authentication with login, signup, forgot password, OTP verification, and quick demo login. |
| **Dashboard** | `/#dashboard` | Real-time inventory KPIs, quick action modals, active corridor tracking, and live operations feed. |
| **Product Catalog** | `/#products` | Visual grid with category filtering, real-time stock levels, live search, and Add Product modal. |
| **Product Detail** | `/#product-detail-:id` | Deep SKU analytics, per-warehouse stock breakdowns, reorder thresholds, and adjustment modal. |
| **Operations Hub** | `/#operations` | Receipts, Delivery Orders, Internal Transfers, and Physical Adjustments workflow. |
| **Warehouses & Rules** | `/#warehouses` | Facility capacity monitors, warehouse storage visualization, and automated reorder rules. |
| **Stock Ledger** | `/#ledger` | Audit trail with timestamps, user signatures, in/out tracking, and cryptographic reference tags. |
| **Settings & Profile** | `/#settings`, `/#profile` | User preferences, active sessions, and inventory settings. |

---

## 🛠️ Tech Stack
- **Framework / Runtime**: Vanilla HTML5, ES Modules, Vite 6
- **Styling**: TailwindCSS & Custom Design Tokens
- **Icons & Typography**: Material Symbols Outlined & Geist Font
- **State Management**: Reactive in-memory state & event-driven architecture