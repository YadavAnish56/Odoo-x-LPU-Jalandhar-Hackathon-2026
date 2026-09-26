# StockSense Frontend - Test & Verification Checklist

This is a working checklist for going through the StockSense frontend build and making sure everything in the PRD actually got built and works the way it's supposed to. Go screen by screen, tick things off as you confirm them, and leave anything broken unchecked so it's easy to spot.

Keep in mind this is a frontend-only prototype. There's no real backend, no real auth, no real OTP delivery, and no payments here, so mock or local state is fine everywhere below.

---

## 1. Navigation and overall structure

- [ ] All sections from the IA are actually reachable: Dashboard, Products, Categories, Stock Overview, Receipts, Delivery Orders, Internal Transfers, Inventory Adjustments, Move History, Stock Ledger, Warehouses, Reordering Rules, Settings, My Profile, Logout
- [ ] Nav stays visible/persistent on desktop
- [ ] Nav collapses properly on tablet
- [ ] Nav turns into a compact header or bottom bar on mobile
- [ ] Every screen can get back to the nav, nothing is a dead end
- [ ] Logout actually sends you back to the login screen

## 2. Authentication (UI only, nothing real behind it)

- [ ] Login screen has email, password, remember me, forgot password, and a sign up link, and all of it works as UI
- [ ] Sign Up screen collects name, email, password, confirm password, and role
- [ ] OTP screen: six digit input works, resend timer counts down, and the verified state shows correctly
- [ ] Reset Password screen validates new password and confirmation
- [ ] Logging in successfully takes you to the Dashboard
- [ ] Validation errors are clear and shown with text or an icon, not just a color change

## 3. Dashboard

- [ ] All 6 KPIs show up with mock data: Total Products in Stock, Low Stock Items, Out of Stock Items, Pending Receipts, Pending Deliveries, Internal Transfers Scheduled
- [ ] Inventory movement chart/visualization renders properly
- [ ] Recent operations list actually populates
- [ ] Low stock / reorder attention module highlights the right items
- [ ] Recent stock movements list is there
- [ ] Warehouse and date filters actually change what's shown
- [ ] Quick actions work: Add Product, New Receipt, New Delivery, New Transfer

## 4. Products

- [ ] Search works by both name and SKU
- [ ] Filters for category, warehouse, stock status, and unit all work, including combined
- [ ] Table has every required column: Product, SKU, Category, Total Stock, Location, Reorder Level, Status, Actions
- [ ] Add Product form captures name, SKU, category, unit, initial stock, reorder level, and warehouse/location
- [ ] Edit Product form loads existing values correctly and saves changes
- [ ] Product Details shows total stock, available/reserved if that's modeled, and locations
- [ ] Product Details shows stock broken down by location
- [ ] Product Details shows movement history
- [ ] Product Details actions work: Edit, Transfer, Adjust Stock

## 5. Receipts

- [ ] List shows supplier, products, quantity, destination, status, date
- [ ] Create Receipt form captures supplier, destination, expected date, and products with quantities
- [ ] Save Draft actually keeps the draft
- [ ] Validate Receipt changes the status and shows a success state with stock added
- [ ] The mock suppliers show up as options: ABC Steel Suppliers, Metro Industrial Supplies, Global Components

## 6. Delivery Orders

- [ ] List shows customer, products, quantity, source, status, date
- [ ] Create Delivery form works start to finish
- [ ] Pick, Pack, Validate workflow steps render and progress correctly
- [ ] Insufficient stock warning shows up when quantity requested is more than what's available
- [ ] Mock customers show up as options: XYZ Manufacturing, Nova Industries, TechBuild Pvt Ltd

## 7. Internal Transfers

- [ ] List shows product, quantity, from, to, status, date
- [ ] Create Transfer form works start to finish
- [ ] The source to destination flow is visually clear
- [ ] It's clear in the UI that total company stock doesn't change from a transfer

## 8. Inventory Adjustments

- [ ] Recorded quantity and physical count both show up
- [ ] Difference between them is calculated and shown automatically
- [ ] Reason/notes field is required before you can submit
- [ ] There's a confirmation step before the adjustment actually applies

## 9. Move History and Stock Ledger

- [ ] Search and filters work on both screens
- [ ] Move History has all the required columns: Timestamp, Reference, Operation, Product, Quantity, From, To, User, Status
- [ ] Ledger has all the required columns: Date, Reference, Operation, Product, Location, In, Out, Balance
- [ ] Incoming, outgoing, transfer, and adjustment operations look visually different from each other, not just by color

## 10. Warehouses and Reordering Rules

- [ ] Warehouse cards show products, stock units, and low stock counts
- [ ] Warehouse detail view shows locations and recent movements
- [ ] Reordering Rules table has: Product, SKU, Location, Minimum Stock, Maximum Stock, Current Stock, Status
- [ ] Mock warehouses show up: Main Warehouse, Production Floor, Finished Goods Warehouse

## 11. Settings and Profile

- [ ] My Profile loads and can be edited
- [ ] Settings loads and options actually persist in local/mock state

## 12. States to check on every major screen

- [ ] Loading state
- [ ] Empty state
- [ ] Error state
- [ ] Success state
- [ ] Confirmation state, for anything destructive or important

## 13. Visual design system

- [ ] Cards use 18 to 24px corner radius with a subtle border or shadow
- [ ] Buttons have a clear primary vs secondary hierarchy
- [ ] Tables have spacious rows, subtle separators, and numbers are aligned properly
- [ ] Filters are rounded/pill style with a clear selected state
- [ ] Badges are small, used with a real meaning, not just decoration
- [ ] Typography is Inter, Geist, or Manrope, using weights 400/500/600/700
- [ ] Icons follow one consistent outline style
- [ ] The warm orange accent is used for key actions and highlights, not spread across the whole UI
- [ ] No gradients, no glassmorphism, no neon, nothing that looks like a generic ERP or generic AI dashboard

## 14. Responsive behavior

- [ ] Desktop: nav stays visible, dashboard is multi-column, tables show in full
- [ ] Tablet: nav collapses, cards adjust, tables scroll horizontally when they need to
- [ ] Mobile: compact or bottom nav, stacked cards, full screen forms, controls are touch friendly
- [ ] Critical stock numbers and statuses stay readable at every screen size

## 15. Accessibility

- [ ] Text and controls have enough contrast
- [ ] Keyboard focus is visible everywhere
- [ ] Status is never shown with color alone, always paired with text or an icon
- [ ] Form labels and error messages are clear
- [ ] Buttons use real, meaningful labels, like "Validate Receipt" instead of just "Submit"

## 16. Final acceptance check (PRD sections 17 and 18)

- [ ] Every required screen exists and is connected through navigation
- [ ] Dashboard has all the required KPIs and summaries
- [ ] Products support search, filtering, viewing details, adding, and editing
- [ ] Receipts, deliveries, transfers, and adjustments each have a full working flow
- [ ] Move History and Stock Ledger clearly show inventory traceability
- [ ] Warehouse and Reordering Rules screens are present
- [ ] Loading, empty, error, success, and confirmation states show up where they should
- [ ] Responsive layouts checked on desktop, tablet, and mobile
- [ ] The visual system stays consistent with the reference direction across every screen
- [ ] A user can go through the whole flow: log in, check the dashboard, look at products and stock, create a receipt, delivery, transfer, and adjustment, check Move History and the Ledger, review warehouses and reorder rules, and get through Settings/Profile

---

## How to use this

1. Go through each section against your local build or preview link.
2. Check off what's confirmed working, leave the rest unchecked.
3. For anything broken, open a GitHub issue and reference the section number, for example "Section 6, Dashboard KPIs not updating when the filter changes."
4. Run through this again before every release or demo.
