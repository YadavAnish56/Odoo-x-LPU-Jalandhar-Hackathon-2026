# StockSense API Reference

Base URL (local): `http://localhost:5000/api`

## Conventions

- **Auth:** every endpoint except `/auth/signup`, `/auth/login`, `/auth/forgot-password`, `/auth/verify-otp`, `/auth/reset-password` and `/health` needs the header
  `Authorization: Bearer <token>`. The token comes from signup / login.
- **JSON:** requests and responses use JSON with camelCase keys. Dates are ISO strings.
- **Roles:** `manager` or `staff`. The first account ever created is a manager; later signups are staff.
  (M) = manager only (products, categories, warehouses, locations, reorder rules, user roles).
  Everyone can run operations (receipts, deliveries, transfers, adjustments).
- **Lists with paging** accept `page` (default 1) and `limit` (default 20, max 100) and return:
  ```json
  { "items": [...], "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
  ```
- **Errors** always look like this:
  ```json
  { "error": "Validation failed", "details": [{ "field": "email", "message": "Invalid email address" }] }
  ```
  | Status | Meaning |
  |---|---|
  | 400 | Invalid input (see `details`) |
  | 401 | Not logged in / token expired → send the user to the login page |
  | 403 | Logged in, but the role is not allowed |
  | 404 | Not found |
  | 409 | Conflict: duplicate SKU/email, not enough stock, wrong status for this action |

---

## 1. Authentication

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/auth/signup` | `{ name, email, password }` | `201 { token, user }` |
| POST | `/auth/login` | `{ email, password }` | `{ token, user }` |
| GET | `/auth/me` | – | `user` |
| POST | `/auth/logout` | – | `{ message }` (all tokens of the user stop working) |
| POST | `/auth/forgot-password` | `{ email }` | `{ message, devOtp?, demoAccount? }` |
| POST | `/auth/verify-otp` | `{ email, otp }` | `{ valid: true }` or 400 |
| POST | `/auth/reset-password` | `{ email, otp, newPassword }` | `{ message }` |

- Password rules: 8–72 characters, at least one letter and one number.
- `user` = `{ id, name, email, role, createdAt }`
- OTP: 6 digits, valid 10 minutes, max 5 wrong tries. Without SMTP configured (development) the
  response includes `devOtp` so you can test the screens without email.
- Demo accounts (`DEMO_EMAILS`, by default manager@ and staff@stocksense.com) have no real inbox: their
  response always includes `devOtp` and `demoAccount: true` (also in production), nothing is emailed, and a
  new code can be asked for right away.

**Reset password screens:** (1) enter email → `forgot-password`, (2) enter OTP → `verify-otp`,
(3) enter new password → `reset-password`, then go to login.

## 2. Profile (left sidebar menu)

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/users/me` | – | `user` |
| PUT | `/users/me` | `{ name?, email? }` | `user` |
| PUT | `/users/me/password` | `{ currentPassword, newPassword }` | `{ message, token }` ← save the new token |
| GET | `/users` | – | `user[]` (for "Responsible" dropdowns) |
| PATCH | `/users/:id/role` (M) | `{ role: "manager" \| "staff" }` | `user` |

## 3. Dashboard

`GET /dashboard?warehouseId=&locationId=&categoryId=` (all filters optional)

With `locationId`, stock KPIs count the stock in that location (compared with the reorder rules of its
warehouse) and the operation KPIs count operations that start or end there.

```json
{
  "filters": { "warehouseId": 1 },
  "kpis": {
    "totalProducts": 8, "productsInStock": 7, "lowStock": 1, "outOfStock": 1,
    "totalQuantity": 482, "stockValue": 251505,
    "pendingReceipts": 2, "lateReceipts": 1,
    "pendingDeliveries": 3, "lateDeliveries": 0, "waitingDeliveries": 1,
    "scheduledTransfers": 2, "lateTransfers": 0
  },
  "operations": {
    "receipt":    { "pending": 2, "late": 1, "draft": 1, "waiting": 0, "ready": 1, "done": 4, "canceled": 1 },
    "delivery":   { "...": "same shape" },
    "internal":   { "...": "same shape" },
    "adjustment": { "...": "same shape" }
  },
  "lowStockAlerts": [ "reorder rule objects, see section 6 (max 10)" ],
  "recentMoves": [ { "reference": "WH/OUT/0002", "moveType": "delivery", "productName": "Steel Rods", "quantity": 20, "fromLocationCode": "WH/STOCK", "toLocationCode": null, "createdAt": "..." } ]
}
```

- *Pending* = status draft, waiting or ready. *Late* = pending and the scheduled date has passed.
- For the document type / status filters on the dashboard, use `GET /operations` (section 7).

`GET /alerts/low-stock?warehouseId=&categoryId=` → every reorder rule at or below its minimum.

`GET /dashboard/movement?days=30&warehouseId=` → one row per day (1–365 days, default 30) for the movement chart:

```json
[ { "date": "2026-09-20", "inbound": 160, "outbound": 0, "internal": 0 },
  { "date": "2026-09-21", "inbound": 55, "outbound": 10, "internal": 40 } ]
```

`inbound` = quantity received from outside (receipts, adjustment gains), `outbound` = quantity that left
(deliveries, adjustment losses), `internal` = quantity moved between locations.

## 4. Products

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/products` | `?search=&categoryId=&warehouseId=&stockStatus=in\|low\|out&includeInactive=true&page=&limit=` | page of products |
| GET | `/products/:id` | – | product + `stockByLocation`, `reorderRules`, `recentMoves` |
| GET | `/products/sku/:sku` | – | same as above, exact SKU match |
| POST | `/products` (M) | see below | `201 product` |
| PUT | `/products/:id` (M) | any of `{ name, sku, categoryId, uom, costPrice, description, isActive }` | product |
| DELETE | `/products/:id` (M) | – | `204` (archives it; history is kept) |

`search` matches the name or SKU. Create body:

```json
{
  "name": "Steel Rods", "sku": "STL-ROD-01", "categoryId": 1, "uom": "kg", "costPrice": 65,
  "description": "optional",
  "initialStock": { "locationId": 1, "quantity": 50 }
}
```

Only `name` and `sku` are required. The SKU is saved in uppercase and must be unique.
`initialStock` is optional; it is recorded as an adjustment in the stock ledger.

Product object:

```json
{
  "id": 1, "name": "Steel Rods", "sku": "STL-ROD-01", "uom": "kg", "costPrice": 65,
  "categoryId": 1, "categoryName": "Raw Materials", "isActive": true,
  "onHand": 77, "reserved": 0, "freeToUse": 77,
  "reorderMinQty": 50, "reorderMaxQty": 200,
  "stockStatus": "in", "stockValue": 5005
}
```

- `onHand`: total stock (in `warehouseId` if that filter is given)
- `reserved`: stock promised to deliveries / transfers that are *ready*
- `freeToUse` = onHand − reserved
- `stockStatus`: `out` (0 on hand), `low` (at or below the reorder minimum) or `in`

### Stock per location

`GET /stock?warehouseId=&locationId=&productId=&categoryId=&search=&includeZero=true&page=&limit=`

```json
{ "items": [ { "productId": 1, "productName": "Steel Rods", "sku": "STL-ROD-01", "uom": "kg",
  "locationId": 4, "locationCode": "WH/PROD", "locationName": "Production Floor",
  "warehouseId": 1, "warehouseName": "Main Warehouse",
  "onHand": 40, "reserved": 0, "freeToUse": 40 } ], "total": 1, "page": 1, "limit": 20, "totalPages": 1 }
```

## 5. Categories

| Method | Path | Body | Returns |
|---|---|---|---|
| GET | `/categories` | – | `[{ id, name, description, productCount }]` |
| GET | `/categories/:id` | – | category |
| POST | `/categories` (M) | `{ name, description? }` | `201 category` |
| PUT | `/categories/:id` (M) | `{ name?, description? }` | category |
| DELETE | `/categories/:id` (M) | – | `204` (its products become uncategorized) |

## 6. Reordering rules

A rule says: *in this warehouse, alert me when the product drops to `minQty`, and refill up to `maxQty`.*

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/reorder-rules` | `?productId=&warehouseId=&status=ok\|low\|out` | rule[] |
| POST | `/reorder-rules` (M) | `{ productId, warehouseId, minQty, maxQty }` | `201 rule` (updates the rule if one already exists for that product + warehouse) |
| PUT | `/reorder-rules/:id` (M) | `{ minQty?, maxQty? }` | rule |
| DELETE | `/reorder-rules/:id` (M) | – | `204` |

Rule object: `{ id, productId, productName, sku, uom, warehouseId, warehouseName, warehouseCode, minQty, maxQty, onHand, status, suggestedQty }`
(`suggestedQty` = how much to order to get back to `maxQty`).

## 7. Operations: receipts, delivery orders, internal transfers

One endpoint for all three types (`type`: `receipt`, `delivery` or `internal`).

| Type | Reference | Needs | Stock effect on validate |
|---|---|---|---|
| receipt | `WH/IN/0001` | `destLocationId`, `partnerName` = supplier | + at destination |
| delivery | `WH/OUT/0001` | `sourceLocationId`, `partnerName` = customer | − at source |
| internal | `WH/INT/0001` | `sourceLocationId` and `destLocationId` (different) | − source, + destination |

**Status flow**

```
draft ──confirm──> ready ──validate──> done
          │          ▲
          └> waiting ┘  (not enough stock; becomes ready automatically when stock arrives)
draft / waiting / ready ──cancel──> canceled
```

| Method | Path | Body / Query | Notes |
|---|---|---|---|
| GET | `/operations` | filters below | page of operations |
| GET | `/operations/:id` | – | operation with `lines` |
| POST | `/operations` | see below | `201`, status `draft` |
| PUT | `/operations/:id` | same fields as create except `type` (all optional) | only while draft / waiting / ready; changing `lines` or locations sends it back to draft |
| POST | `/operations/:id/confirm` | – | → `ready` or `waiting`; the response also has `shortages` |
| POST | `/operations/:id/check-availability` | – | same as confirm (re-check a waiting one) |
| POST | `/operations/:id/pick` | – | delivery only, must be ready |
| POST | `/operations/:id/pack` | – | delivery only, after pick |
| POST | `/operations/:id/validate` | – | → `done`, moves the stock; 409 with `details` = shortages if stock is missing |
| POST | `/operations/:id/cancel` | – | not allowed once done |
| DELETE | `/operations/:id` | – | only draft or canceled |

Validating a delivery also completes pick and pack, so a single "Validate" button works too.

**Create body**

```json
{
  "type": "receipt",
  "partnerName": "Tata Steel Ltd",
  "destLocationId": 1,
  "scheduledDate": "2026-09-30T10:00:00Z",
  "responsibleId": 2,
  "notes": "optional",
  "lines": [ { "productId": 1, "quantity": 50 }, { "productId": 2, "quantity": 10 } ]
}
```

`scheduledDate` defaults to now, `responsibleId` defaults to the current user. Each product can appear
only once per operation.

**Filters for `GET /operations`**

| Query | Example | Meaning |
|---|---|---|
| `type` | `receipt` / `delivery` / `internal` / `adjustment` | document type |
| `status` | `ready` or `draft,waiting,ready` | one or more statuses |
| `warehouseId` | `1` | warehouse |
| `locationId` | `4` | source or destination location |
| `categoryId` | `2` | contains a product of this category |
| `productId` | `1` | contains this product |
| `search` | `WH/IN` | reference, partner, product name or SKU |
| `dateFrom`, `dateTo` | `2026-09-01` | scheduled date range (YYYY-MM-DD) |
| `late` | `true` | only late operations |
| `sort` | `scheduled` | scheduled date ascending (default: newest first) |

**Operation object**

```json
{
  "id": 5, "reference": "WH/IN/0005", "type": "receipt", "status": "ready",
  "warehouseId": 1, "warehouseName": "Main Warehouse", "warehouseCode": "WH",
  "sourceLocationId": null, "sourceLocationName": null, "sourceLocationCode": null,
  "destLocationId": 1, "destLocationName": "Stock", "destLocationCode": "WH/STOCK",
  "partnerName": "Dell India", "scheduledDate": "...", "isLate": true,
  "responsibleId": 1, "responsibleName": "Inventory Manager", "createdByName": "Inventory Manager",
  "pickedAt": null, "packedAt": null, "doneAt": null, "notes": null,
  "lineCount": 2, "totalQuantity": 40,
  "lines": [ { "id": 9, "productId": 5, "productName": "24\" LED Monitor", "sku": "ELC-MON-24", "uom": "Units", "quantity": 10, "onHand": 12 } ]
}
```

`lines` is only included by `GET /operations/:id` and the action endpoints. `lines[].onHand` is the
current stock at the source location (at the destination for receipts).

List results (`GET /operations`, `GET /adjustments`) include a compact `lineItems` array instead:
`[{ "productId": 5, "productName": "24\" LED Monitor", "sku": "ELC-MON-24", "uom": "Units", "quantity": 10, "systemQuantity": null }]`.

## 8. Stock adjustments

Fix differences between recorded stock and a physical count. Adjustments are applied immediately (status `done`).

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/adjustments` | same filters as `/operations` | page of adjustments |
| POST | `/adjustments` | see below | `201 operation` (type `adjustment`, reference `WH/ADJ/0001`) |

```json
{
  "locationId": 1,
  "notes": "Monthly count",
  "lines": [
    { "productId": 1, "countedQuantity": 97 },
    { "productId": 2, "difference": -3 }
  ]
}
```

Each line gives either `countedQuantity` (what was physically counted) or `difference` (+/− change,
e.g. `-3` for 3 damaged units). In the result, `lines[].systemQuantity` is the stock before the adjustment.

## 9. Move history (stock ledger)

`GET /moves?productId=&locationId=&warehouseId=&categoryId=&operationId=&type=&search=&dateFrom=&dateTo=&page=&limit=`

```json
{ "items": [ {
  "id": 11, "reference": "WH/ADJ/0001", "moveType": "adjustment", "operationId": 8,
  "productId": 1, "productName": "Steel Rods", "sku": "STL-ROD-01", "uom": "kg",
  "fromLocationCode": "WH/STOCK", "toLocationCode": null, "quantity": 3,
  "direction": "out", "partnerName": null, "createdByName": "Warehouse Staff", "createdAt": "..."
} ], "total": 11, "page": 1, "limit": 20, "totalPages": 1 }
```

`direction`: `in` (entered the company: receipt / adjustment gain), `out` (left: delivery / adjustment loss),
`internal` (moved between locations).

### Stock ledger with running balance

`GET /moves/ledger?productId=&locationId=&warehouseId=&categoryId=&type=&search=&dateFrom=&dateTo=&page=&limit=`

One row per stock change **per location** (an internal transfer gives an "out" row at the source and an
"in" row at the destination), newest first, with the product's balance in that location after the change:

```json
{ "items": [ {
  "moveId": 4, "operationId": 5, "reference": "WH/INT/0001", "moveType": "internal", "createdAt": "...",
  "productId": 1, "productName": "Steel Rods", "sku": "STL-ROD-01", "uom": "kg",
  "locationId": 1, "locationCode": "WH/STOCK", "locationName": "Stock", "warehouseId": 1, "warehouseName": "Main Warehouse",
  "quantityIn": 0, "quantityOut": 40, "balance": 60
} ], "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
```

## 10. Settings: warehouses and locations

| Method | Path | Body / Query | Returns |
|---|---|---|---|
| GET | `/warehouses` | `?includeInactive=true` | `[{ id, name, code, address, isActive, locationCount, totalQuantity }]` |
| GET | `/warehouses/:id` | – | warehouse + `locations` |
| POST | `/warehouses` (M) | `{ name, code, address? }` | `201` (also creates its "Stock" location) |
| PUT | `/warehouses/:id` (M) | `{ name?, code?, address?, isActive? }` | warehouse |
| DELETE | `/warehouses/:id` (M) | – | `204` archive (409 if it still has stock or open operations) |
| GET | `/locations` | `?warehouseId=&includeInactive=true` | `[{ id, warehouseId, warehouseName, name, code, fullCode, totalQuantity }]` |
| GET | `/locations/:id` | – | location + `stock` in it |
| POST | `/locations` (M) | `{ warehouseId, name, code }` | `201 location` |
| PUT | `/locations/:id` (M) | `{ name?, code?, isActive? }` | location |
| DELETE | `/locations/:id` (M) | – | `204` archive (409 if it still has stock or open operations) |

Codes are saved in uppercase. `fullCode` = warehouse code + location code, e.g. `WH/RACK-A`.

## Health

`GET /api/health` → `{ "status": "ok", "database": "connected" }` (no token needed)
