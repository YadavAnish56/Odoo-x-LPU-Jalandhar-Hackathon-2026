export default {
  // PRODUCTS
  products: [
    { id: 1, name: 'Steel Rod', sku: 'STL-001', category: 'Raw Material', unit: 'kg', totalStock: 500, reorderLevel: 100, status: 'In Stock', icon: 'precision_manufacturing', locations: [{ warehouse: 'Main Warehouse', location: 'Bay 04-A', qty: 300 }, { warehouse: 'Production Floor', location: 'Rack 02', qty: 200 }] },
    { id: 2, name: 'Steel Sheet', sku: 'STL-002', category: 'Raw Material', unit: 'kg', totalStock: 320, reorderLevel: 80, status: 'In Stock', icon: 'view_in_ar', locations: [{ warehouse: 'Main Warehouse', location: 'Bay 06-B', qty: 320 }] },
    { id: 3, name: 'Office Chair', sku: 'CHR-001', category: 'Furniture', unit: 'pcs', totalStock: 45, reorderLevel: 10, status: 'In Stock', icon: 'chair', locations: [{ warehouse: 'Finished Goods Warehouse', location: 'Section A', qty: 45 }] },
    { id: 4, name: 'Executive Desk', sku: 'DSK-001', category: 'Furniture', unit: 'pcs', totalStock: 8, reorderLevel: 5, status: 'Low Stock', icon: 'desk', locations: [{ warehouse: 'Finished Goods Warehouse', location: 'Section B', qty: 8 }] },
    { id: 5, name: 'Laptop', sku: 'LAP-001', category: 'Electronics', unit: 'pcs', totalStock: 0, reorderLevel: 15, status: 'Out of Stock', icon: 'laptop_mac', locations: [] },
    { id: 6, name: 'Monitor', sku: 'MON-001', category: 'Electronics', unit: 'pcs', totalStock: 22, reorderLevel: 10, status: 'In Stock', icon: 'monitor', locations: [{ warehouse: 'Main Warehouse', location: 'Shelf C3', qty: 12 }, { warehouse: 'Finished Goods Warehouse', location: 'Section D', qty: 10 }] },
    { id: 7, name: 'Copper Coil 12mm', sku: 'CPR-031', category: 'Raw Material', unit: 'kg', totalStock: 18, reorderLevel: 50, status: 'Low Stock', icon: 'motion_photos_on', locations: [{ warehouse: 'Main Warehouse', location: 'Bay 02-C', qty: 18 }] },
    { id: 8, name: 'Precision Bearings', sku: 'BRG-902', category: 'Hardware', unit: 'pcs', totalStock: 0, reorderLevel: 100, status: 'Out of Stock', icon: 'donut_large', locations: [] },
    { id: 9, name: 'Titanium Fasteners', sku: 'TTN-110', category: 'Hardware', unit: 'pcs', totalStock: 1420, reorderLevel: 300, status: 'In Stock', icon: 'hardware', locations: [{ warehouse: 'Production Floor', location: 'Rack 05', qty: 1420 }] },
    { id: 10, name: 'Galvanized Pipe 3m', sku: 'PIP-303', category: 'Construction', unit: 'pcs', totalStock: 65, reorderLevel: 20, status: 'In Stock', icon: 'view_in_ar', locations: [{ warehouse: 'Main Warehouse', location: 'East Yard', qty: 65 }] },
    { id: 11, name: 'Industrial Valve 2-Inch', sku: 'VLV-204', category: 'Components', unit: 'pcs', totalStock: 840, reorderLevel: 150, status: 'In Stock', icon: 'tune', locations: [{ warehouse: 'Main Warehouse', location: 'West Depot', qty: 840 }] },
    { id: 12, name: 'Aluminum Alloy 6061', sku: 'ALM-089', category: 'Raw Material', unit: 'kg', totalStock: 15, reorderLevel: 40, status: 'Low Stock', icon: 'science', locations: [{ warehouse: 'Main Warehouse', location: 'Bay 08-D', qty: 15 }] },
  ],

  // CATEGORIES
  categories: [
    { name: 'Raw Material', count: 4, totalStock: 853, unit: 'mixed' },
    { name: 'Furniture', count: 2, totalStock: 53, unit: 'pcs' },
    { name: 'Electronics', count: 2, totalStock: 22, unit: 'pcs' },
    { name: 'Hardware', count: 2, totalStock: 1420, unit: 'pcs' },
    { name: 'Components', count: 1, totalStock: 840, unit: 'pcs' },
    { name: 'Construction', count: 1, totalStock: 65, unit: 'pcs' },
  ],

  // WAREHOUSES
  warehouses: [
    { id: 1, name: 'Main Warehouse', products: 8, stockUnits: 1578, lowStockCount: 2, locations: ['Bay 04-A', 'Bay 06-B', 'Bay 02-C', 'Bay 08-D', 'Shelf C3', 'East Yard', 'West Depot'], capacity: 82 },
    { id: 2, name: 'Production Floor', products: 2, stockUnits: 1620, lowStockCount: 0, locations: ['Rack 02', 'Rack 05'], capacity: 45 },
    { id: 3, name: 'Finished Goods Warehouse', products: 3, stockUnits: 63, lowStockCount: 1, locations: ['Section A', 'Section B', 'Section D'], capacity: 28 },
  ],

  // SUPPLIERS
  suppliers: ['ABC Steel Suppliers', 'Metro Industrial Supplies', 'Global Components'],

  // CUSTOMERS
  customers: ['XYZ Manufacturing', 'Nova Industries', 'TechBuild Pvt Ltd'],

  // RECEIPTS
  receipts: [
    { id: 'REC-001', supplier: 'ABC Steel Suppliers', product: 'Steel Rod', sku: 'STL-001', qty: 100, unit: 'kg', destination: 'Main Warehouse', status: 'Done', date: '2025-09-26', statusColor: 'green' },
    { id: 'REC-002', supplier: 'Global Components', product: 'Aluminum Ingot', sku: 'ALM-089', qty: 250, unit: 'kg', destination: 'Main Warehouse', status: 'In Inspection', date: '2025-09-25', statusColor: 'amber' },
    { id: 'REC-003', supplier: 'Metro Industrial Supplies', product: 'Hex Bolts M8', sku: 'BLT-008', qty: 5000, unit: 'pcs', destination: 'Main Warehouse', status: 'Pending', date: '2025-09-24', statusColor: 'gray' },
    { id: 'REC-004', supplier: 'ABC Steel Suppliers', product: 'Steel Sheet', sku: 'STL-002', qty: 200, unit: 'kg', destination: 'Main Warehouse', status: 'Draft', date: '2025-09-23', statusColor: 'gray' },
  ],

  // DELIVERY ORDERS
  deliveries: [
    { id: 'DEL-001', customer: 'XYZ Manufacturing', product: 'Steel Rod', sku: 'STL-001', qty: 20, unit: 'pcs', source: 'Main Warehouse', status: 'Ready for Dispatch', date: '2025-09-26', statusColor: 'orange' },
    { id: 'DEL-002', customer: 'Nova Industries', product: 'Industrial Valve', sku: 'VLV-204', qty: 4, unit: 'pcs', source: 'Main Warehouse', status: 'Dispatched', date: '2025-09-25', statusColor: 'green' },
    { id: 'DEL-003', customer: 'TechBuild Pvt Ltd', product: 'Galvanized Pipe', sku: 'PIP-303', qty: 50, unit: 'pcs', source: 'Main Warehouse', status: 'Processing', date: '2025-09-24', statusColor: 'amber' },
    { id: 'DEL-004', customer: 'XYZ Manufacturing', product: 'Copper Wire Reel', sku: 'CPR-031', qty: 35, unit: 'kg', source: 'Main Warehouse', status: 'In Transit', date: '2025-09-26', statusColor: 'orange' },
  ],

  // INTERNAL TRANSFERS
  transfers: [
    { id: 'TRF-012', product: 'Steel Rod', sku: 'STL-001', qty: 40, unit: 'kg', from: 'Main Warehouse', to: 'Production Floor', status: 'In Transit', date: '2025-09-26', statusColor: 'orange' },
    { id: 'TRF-011', product: 'Titanium Fasteners', sku: 'TTN-110', qty: 200, unit: 'pcs', from: 'Production Floor', to: 'Finished Goods Warehouse', status: 'Done', date: '2025-09-25', statusColor: 'green' },
    { id: 'TRF-010', product: 'Office Chair', sku: 'CHR-001', qty: 5, unit: 'pcs', from: 'Main Warehouse', to: 'Finished Goods Warehouse', status: 'Done', date: '2025-09-24', statusColor: 'green' },
  ],

  // INVENTORY ADJUSTMENTS
  adjustments: [
    { id: 'ADJ-003', product: 'Steel Rod', sku: 'STL-001', recorded: 100, physical: 97, difference: -3, unit: 'kg', location: 'Main Warehouse', reason: 'Damaged in transit / offcut loss', status: 'Approved', date: '2025-09-24', user: 'Quality Control Lead #88' },
    { id: 'ADJ-002', product: 'Precision Bearings', sku: 'BRG-902', recorded: 12, physical: 0, difference: -12, unit: 'pcs', location: 'Production Floor', reason: 'Used in prototype assembly (unlogged)', status: 'Approved', date: '2025-09-22', user: 'Floor Supervisor' },
    { id: 'ADJ-001', product: 'Monitor', sku: 'MON-001', recorded: 20, physical: 22, difference: 2, unit: 'pcs', location: 'Finished Goods Warehouse', reason: 'Incoming receipt not logged', status: 'Pending Review', date: '2025-09-21', user: 'Warehouse Staff' },
  ],

  // MOVE HISTORY
  moveHistory: [
    { timestamp: '26 Sep, 14:22', ref: 'REC-001', operation: 'Receipt', product: 'Steel Rod', qty: '+100 kg', from: 'ABC Steel Suppliers', to: 'Main Warehouse', user: 'John D.', status: 'Done', opColor: 'green' },
    { timestamp: '26 Sep, 11:05', ref: 'DEL-004', operation: 'Delivery', product: 'Copper Wire Reel', qty: '-35 kg', from: 'Main Warehouse', to: 'XYZ Manufacturing', user: 'Sarah K.', status: 'In Transit', opColor: 'orange' },
    { timestamp: '25 Sep, 16:40', ref: 'TRF-012', operation: 'Transfer', product: 'Brass Fitting #4', qty: '40 kg', from: 'Main Warehouse', to: 'Production Rack 02', user: 'Mike R.', status: 'Done', opColor: 'blue' },
    { timestamp: '24 Sep, 09:12', ref: 'ADJ-003', operation: 'Adjustment', product: 'Steel Plate Cold-Rolled', qty: '-3 kg', from: 'Main Warehouse', to: '—', user: 'QC Lead #88', status: 'Approved', opColor: 'gray' },
    { timestamp: '23 Sep, 15:30', ref: 'REC-002', operation: 'Receipt', product: 'Aluminum Ingot', qty: '+250 kg', from: 'Global Alloys Co.', to: 'West Depot', user: 'John D.', status: 'In Inspection', opColor: 'green' },
    { timestamp: '22 Sep, 10:45', ref: 'TRF-011', operation: 'Transfer', product: 'Titanium Fasteners', qty: '200 pcs', from: 'Production Floor', to: 'Finished Goods', user: 'Lisa M.', status: 'Done', opColor: 'blue' },
    { timestamp: '21 Sep, 08:00', ref: 'DEL-002', operation: 'Delivery', product: 'Industrial Valves', qty: '-4 pcs', from: 'West Depot', to: 'Apex Robotics', user: 'Sarah K.', status: 'Dispatched', opColor: 'orange' },
    { timestamp: '20 Sep, 14:10', ref: 'ADJ-002', operation: 'Adjustment', product: 'Precision Bearings', qty: '-12 pcs', from: 'Production Floor', to: '—', user: 'Floor Supervisor', status: 'Approved', opColor: 'gray' },
  ],

  // STOCK LEDGER
  stockLedger: [
    { date: '26 Sep 2025', ref: 'REC-001', operation: 'Receipt', product: 'Steel Rod', location: 'Main Warehouse', inQty: 100, outQty: 0, balance: 500, unit: 'kg', opColor: 'green' },
    { date: '26 Sep 2025', ref: 'DEL-004', operation: 'Delivery', product: 'Copper Wire Reel', location: 'Main Warehouse', inQty: 0, outQty: 35, balance: 18, unit: 'kg', opColor: 'orange' },
    { date: '25 Sep 2025', ref: 'TRF-012', operation: 'Transfer Out', product: 'Steel Rod', location: 'Main Warehouse', inQty: 0, outQty: 40, balance: 300, unit: 'kg', opColor: 'blue' },
    { date: '25 Sep 2025', ref: 'TRF-012', operation: 'Transfer In', product: 'Steel Rod', location: 'Production Floor', inQty: 40, outQty: 0, balance: 240, unit: 'kg', opColor: 'blue' },
    { date: '24 Sep 2025', ref: 'ADJ-003', operation: 'Adjustment', product: 'Steel Rod', location: 'Main Warehouse', inQty: 0, outQty: 3, balance: 340, unit: 'kg', opColor: 'gray' },
    { date: '23 Sep 2025', ref: 'REC-002', operation: 'Receipt', product: 'Aluminum Ingot', location: 'Main Warehouse', inQty: 250, outQty: 0, balance: 265, unit: 'kg', opColor: 'green' },
    { date: '22 Sep 2025', ref: 'TRF-011', operation: 'Transfer Out', product: 'Titanium Fasteners', location: 'Production Floor', inQty: 0, outQty: 200, balance: 1420, unit: 'pcs', opColor: 'blue' },
    { date: '21 Sep 2025', ref: 'DEL-002', operation: 'Delivery', product: 'Industrial Valves', location: 'Main Warehouse', inQty: 0, outQty: 4, balance: 840, unit: 'pcs', opColor: 'orange' },
  ],

  // REORDERING RULES
  reorderRules: [
    { product: 'Steel Rod', sku: 'STL-001', location: 'Main Warehouse', minStock: 100, maxStock: 700, currentStock: 500, status: 'OK' },
    { product: 'Steel Sheet', sku: 'STL-002', location: 'Main Warehouse', minStock: 80, maxStock: 500, currentStock: 320, status: 'OK' },
    { product: 'Executive Desk', sku: 'DSK-001', location: 'Finished Goods', minStock: 5, maxStock: 30, currentStock: 8, status: 'Warning' },
    { product: 'Laptop', sku: 'LAP-001', location: 'Main Warehouse', minStock: 15, maxStock: 100, currentStock: 0, status: 'Critical' },
    { product: 'Copper Coil 12mm', sku: 'CPR-031', location: 'Main Warehouse', minStock: 50, maxStock: 300, currentStock: 18, status: 'Critical' },
    { product: 'Precision Bearings', sku: 'BRG-902', location: 'Production Floor', minStock: 100, maxStock: 500, currentStock: 0, status: 'Critical' },
    { product: 'Aluminum Alloy 6061', sku: 'ALM-089', location: 'Main Warehouse', minStock: 40, maxStock: 200, currentStock: 15, status: 'Critical' },
    { product: 'Monitor', sku: 'MON-001', location: 'Main Warehouse', minStock: 10, maxStock: 80, currentStock: 22, status: 'OK' },
  ],

  // KPI Summary
  kpis: {
    totalProducts: 12,
    totalStock: 3253,
    totalValue: 482900,
    lowStockItems: 3,
    outOfStockItems: 2,
    pendingReceipts: 18,
    pendingDeliveries: 12,
    scheduledTransfers: 6,
    growthPercent: 8.4,
  },
};
