import data from '../data.js';
import { showToast, showModal, formField, statusBadge, operationIcon } from '../utils.js';

export default function renderOperations(container) {
  let activeTab = 'overview';

  function render() {
    container.innerHTML = `
      <div class="flex flex-col w-full pb-space-xl">
        <!-- Title -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
          <div>
            <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Real-time Logistics Ledger</span></div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Operations & Movement</h1>
            <p class="font-body-md text-body-md text-secondary mt-1">Track incoming receipts, outgoing delivery orders, and internal transfers.</p>
          </div>
          <div class="relative inline-block text-left">
            <button id="create-op-trigger" class="inline-flex items-center gap-space-xs bg-primary-container hover:bg-primary text-white font-label-md text-label-md px-space-md py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.99]"><span class="material-symbols-outlined text-[18px]">add</span><span>Create Operation</span><span class="material-symbols-outlined text-[18px]">arrow_drop_down</span></button>
            <div class="hidden absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-xl z-30 p-1.5" id="create-op-menu">
              <div class="px-space-sm py-1 font-label-sm text-label-sm text-secondary uppercase tracking-wider">New Transaction</div>
              <button data-create="receipt" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">move_to_inbox</span><span>Inbound Receipt</span></button>
              <button data-create="delivery" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">local_shipping</span><span>Delivery Order</span></button>
              <button data-create="transfer" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">sync_alt</span><span>Internal Transfer</span></button>
              <div class="my-1 h-px bg-surface-container"></div>
              <button data-create="adjustment" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-outline text-body-lg">tune</span><span>Stock Adjustment</span></button>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex items-center gap-space-xs overflow-x-auto pb-1 mb-space-lg">
          ${['overview', 'receipts', 'deliveries', 'transfers', 'adjustments'].map(tab => `
            <button data-tab="${tab}" class="px-space-md py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-primary-container text-white shadow-sm' : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface'}">${tab.charAt(0).toUpperCase() + tab.slice(1)} ${tab !== 'overview' ? `<span class="ml-1 px-1.5 py-0.5 rounded-full bg-surface-container text-on-surface font-label-sm text-label-sm">${getTabCount(tab)}</span>` : ''}</button>
          `).join('')}
        </div>

        <!-- Tab Content -->
        <div id="tab-content">${renderTabContent()}</div>
      </div>
    `;
    wireEvents();
  }

  function getTabCount(tab) {
    const counts = { receipts: data.receipts.length, deliveries: data.deliveries.length, transfers: data.transfers.length, adjustments: data.adjustments.length };
    return counts[tab] || 0;
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'receipts': return renderReceipts();
      case 'deliveries': return renderDeliveries();
      case 'transfers': return renderTransfers();
      case 'adjustments': return renderAdjustments();
      default: return renderOverview();
    }
  }

  function renderOverview() {
    return `
      <!-- Transfer Flow -->
      <div class="relative overflow-hidden bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg mb-space-lg">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
          <div class="flex items-center gap-space-sm">
            <div class="p-2 rounded-xl bg-surface-container-low text-primary-container"><span class="material-symbols-outlined text-[20px]">sync_alt</span></div>
            <div><span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider block">Active Relocation</span><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Visual Transfer & Logistics Flow</h2></div>
          </div>
          <div class="flex flex-wrap items-center gap-space-sm">
            <span class="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-semibold"><span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-container opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-primary-container"></span></span>Moving</span>
            <span class="font-body-sm text-body-sm text-secondary">Ref <strong class="text-on-surface font-medium">#TRF-012</strong></span>
          </div>
        </div>
        <div class="my-space-md p-space-lg rounded-xl bg-surface-container-low/70 flex flex-col lg:flex-row items-center justify-between gap-space-lg">
          ${transferNode('Source Hub', 'warehouse', 'Main Warehouse', '300 kg Available', 60, 'green')}
          <div class="flex-1 w-full flex flex-col items-center justify-center px-space-sm">
            <div class="w-full flex items-center justify-between text-secondary font-label-sm text-label-sm mb-1.5">
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">local_shipping</span>Unit #4</span>
              <span class="text-primary-container font-semibold">40 kg Steel Rod (STL-001)</span>
              <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">schedule</span>15 min ETA</span>
            </div>
            <div class="relative w-full h-3 bg-surface-container rounded-full overflow-hidden flex items-center">
              <div class="absolute inset-0 bg-gradient-to-r from-primary-container/20 via-primary-container to-primary-container/40 rounded-full w-2/3 animate-[pulse_2s_ease-in-out_infinite]"></div>
              <div class="absolute left-[58%] -translate-y-0.5 w-4 h-4 bg-primary-container rounded-full shadow-md flex items-center justify-center text-white"><span class="material-symbols-outlined text-[10px]">chevron_right</span></div>
            </div>
          </div>
          ${transferNode('Destination', 'precision_manufacturing', 'Production Floor', '200 kg Current', 80, 'orange')}
        </div>
      </div>

      <!-- Split: Receipts & Adjustments -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
        <div class="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
          <div class="flex items-center justify-between pb-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="p-2 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[20px]">input</span></div>
              <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Receipts: Inbound</h2><p class="font-body-sm text-body-sm text-secondary">Vendor purchase commitments</p></div>
            </div>
          </div>
          <div class="flex flex-col gap-space-xs mt-space-sm">
            ${data.receipts.slice(0, 3).map(r => receiptRow(r)).join('')}
          </div>
        </div>

        <div class="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
          <div class="flex items-center justify-between pb-space-sm">
            <div class="flex items-center gap-space-sm">
              <div class="p-2 rounded-xl bg-primary-fixed text-primary-container"><span class="material-symbols-outlined text-[20px]">scale</span></div>
              <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Physical vs Recorded</h2><span class="font-label-sm text-label-sm text-secondary uppercase">Stock Variance</span></div>
            </div>
          </div>
          ${data.adjustments.length ? (() => {
            const a = data.adjustments[0];
            return `
              <div class="p-space-sm rounded-xl bg-surface-container-low/50 my-space-sm">
                <span class="font-label-sm text-label-sm text-secondary uppercase block">Audited Item</span>
                <div class="flex items-baseline justify-between mt-0.5"><span class="font-headline-sm text-headline-sm text-on-surface font-semibold">${a.product}</span><span class="font-mono text-label-md text-primary-container bg-primary-fixed px-2 py-0.5 rounded">${a.sku}</span></div>
              </div>
              <div class="grid grid-cols-3 gap-space-xs my-space-sm">
                <div class="bg-surface-container-low p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-secondary block">Recorded</span><span class="font-headline-md text-headline-md text-on-surface font-bold mt-1 block">${a.recorded}<span class="font-body-sm text-body-sm font-normal text-secondary"> ${a.unit}</span></span></div>
                <div class="bg-surface-container-low p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-secondary block">Physical</span><span class="font-headline-md text-headline-md text-on-surface font-bold mt-1 block">${a.physical}<span class="font-body-sm text-body-sm font-normal text-secondary"> ${a.unit}</span></span></div>
                <div class="bg-primary-fixed/40 p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-primary font-medium block">Difference</span><span class="font-headline-md text-headline-md text-primary-container font-bold mt-1 block">${a.difference}<span class="font-body-sm text-body-sm font-normal text-primary-container"> ${a.unit}</span></span></div>
              </div>
              <div class="mt-space-md"><label class="font-label-md text-label-md text-secondary block mb-1">Reason</label><div class="relative"><input class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none" readonly value="${a.reason}"/></div><p class="font-label-sm text-label-sm text-secondary mt-1">By ${a.user}</p></div>
            `;
          })() : ''}
        </div>
      </div>

      <!-- Delivery Orders Table -->
      <div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
        <div class="flex items-center gap-space-sm pb-space-md">
          <div class="p-2 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[20px]">local_shipping</span></div>
          <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Recent Delivery Orders</h2><p class="font-body-sm text-body-sm text-secondary">Outbound dispatch status</p></div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left font-body-sm text-body-sm">
            <thead><tr class="text-secondary font-label-sm text-label-sm uppercase tracking-wider bg-surface-container-low/50 rounded-lg">
              <th class="py-2.5 px-space-md rounded-l-lg">Order Ref</th><th class="py-2.5 px-space-md">Recipient</th><th class="py-2.5 px-space-md">Product</th><th class="py-2.5 px-space-md">Source</th><th class="py-2.5 px-space-md text-right rounded-r-lg">Status</th>
            </tr></thead>
            <tbody class="divide-y divide-surface-container/60">
              ${data.deliveries.map(d => `
                <tr class="hover:bg-surface-container-low/50 transition-colors">
                  <td class="py-space-md px-space-md font-mono font-medium text-on-surface">${d.id}</td>
                  <td class="py-space-md px-space-md"><span class="font-medium text-on-surface block">${d.customer}</span></td>
                  <td class="py-space-md px-space-md text-on-surface-variant"><span class="font-semibold text-on-surface">${d.qty} ${d.unit}</span> ${d.product}</td>
                  <td class="py-space-md px-space-md text-secondary">${d.source}</td>
                  <td class="py-space-md px-space-md text-right">${statusBadge(d.status, d.statusColor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function renderReceipts() {
    return `<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-6">
        <h2 class="font-headline-md text-headline-md text-on-surface font-semibold">All Receipts</h2>
        <button id="new-receipt-btn" class="flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>New Receipt</button>
      </div>
      <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider"><th class="py-3 px-4 rounded-l-xl">Ref</th><th class="py-3 px-4">Supplier</th><th class="py-3 px-4">Product</th><th class="py-3 px-4 text-right">Qty</th><th class="py-3 px-4">Destination</th><th class="py-3 px-4">Date</th><th class="py-3 px-4 rounded-r-xl text-right">Status</th></tr></thead>
      <tbody class="font-body-sm text-body-sm">${data.receipts.map(r => `<tr class="hover:bg-surface-container-low/50 transition-colors"><td class="py-3 px-4 font-mono font-semibold text-on-surface">${r.id}</td><td class="py-3 px-4 text-on-surface font-medium">${r.supplier}</td><td class="py-3 px-4 text-on-surface-variant">${r.product}</td><td class="py-3 px-4 text-right font-mono text-emerald-600 font-semibold">+${r.qty} ${r.unit}</td><td class="py-3 px-4 text-secondary">${r.destination}</td><td class="py-3 px-4 text-secondary font-mono">${r.date}</td><td class="py-3 px-4 text-right">${statusBadge(r.status, r.statusColor)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  }

  function renderDeliveries() {
    return `<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-6"><h2 class="font-headline-md text-headline-md text-on-surface font-semibold">All Delivery Orders</h2><button id="new-delivery-btn" class="flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>New Delivery</button></div>
      <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider"><th class="py-3 px-4 rounded-l-xl">Ref</th><th class="py-3 px-4">Customer</th><th class="py-3 px-4">Product</th><th class="py-3 px-4 text-right">Qty</th><th class="py-3 px-4">Source</th><th class="py-3 px-4">Date</th><th class="py-3 px-4 rounded-r-xl text-right">Status</th></tr></thead>
      <tbody class="font-body-sm text-body-sm">${data.deliveries.map(d => `<tr class="hover:bg-surface-container-low/50 transition-colors"><td class="py-3 px-4 font-mono font-semibold text-on-surface">${d.id}</td><td class="py-3 px-4 text-on-surface font-medium">${d.customer}</td><td class="py-3 px-4 text-on-surface-variant">${d.product}</td><td class="py-3 px-4 text-right font-mono text-error font-semibold">-${d.qty} ${d.unit}</td><td class="py-3 px-4 text-secondary">${d.source}</td><td class="py-3 px-4 text-secondary font-mono">${d.date}</td><td class="py-3 px-4 text-right">${statusBadge(d.status, d.statusColor)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  }

  function renderTransfers() {
    return `<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-6"><h2 class="font-headline-md text-headline-md text-on-surface font-semibold">Internal Transfers</h2><button id="new-transfer-btn" class="flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>New Transfer</button></div>
      <div class="p-4 mb-4 bg-surface-container-low rounded-xl flex items-center gap-2"><span class="material-symbols-outlined text-primary-container">info</span><span class="font-body-sm text-body-sm text-secondary">Internal transfers move stock between your warehouses. <strong class="text-on-surface">Total company stock does not change.</strong></span></div>
      <div class="overflow-x-auto"><table class="w-full text-left"><thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider"><th class="py-3 px-4 rounded-l-xl">Ref</th><th class="py-3 px-4">Product</th><th class="py-3 px-4 text-right">Qty</th><th class="py-3 px-4">From</th><th class="py-3 px-4">To</th><th class="py-3 px-4">Date</th><th class="py-3 px-4 rounded-r-xl text-right">Status</th></tr></thead>
      <tbody class="font-body-sm text-body-sm">${data.transfers.map(t => `<tr class="hover:bg-surface-container-low/50 transition-colors"><td class="py-3 px-4 font-mono font-semibold text-on-surface">${t.id}</td><td class="py-3 px-4 text-on-surface font-medium">${t.product}</td><td class="py-3 px-4 text-right font-mono font-semibold text-on-surface">${t.qty} ${t.unit}</td><td class="py-3 px-4 text-secondary">${t.from}</td><td class="py-3 px-4 text-secondary">${t.to}</td><td class="py-3 px-4 text-secondary font-mono">${t.date}</td><td class="py-3 px-4 text-right">${statusBadge(t.status, t.statusColor)}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
  }

  function renderAdjustments() {
    return `<div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
      <div class="flex items-center justify-between mb-6"><h2 class="font-headline-md text-headline-md text-on-surface font-semibold">Inventory Adjustments</h2></div>
      <div class="space-y-4">${data.adjustments.map(a => `
        <div class="p-5 rounded-xl bg-surface-container-low/50 hover:bg-surface-container-low transition-colors">
          <div class="flex items-start justify-between mb-3">
            <div><span class="font-mono font-semibold text-on-surface">${a.id}</span><span class="mx-2 text-secondary">•</span><span class="text-on-surface font-medium">${a.product}</span><span class="mx-2 text-secondary">•</span><span class="font-mono text-secondary">${a.sku}</span></div>
            ${statusBadge(a.status, a.status === 'Approved' ? 'green' : 'amber')}
          </div>
          <div class="grid grid-cols-3 gap-3 mb-3">
            <div class="bg-surface-container-lowest p-3 rounded-xl text-center"><div class="font-label-sm text-label-sm text-secondary">Recorded</div><div class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">${a.recorded} ${a.unit}</div></div>
            <div class="bg-surface-container-lowest p-3 rounded-xl text-center"><div class="font-label-sm text-label-sm text-secondary">Physical</div><div class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">${a.physical} ${a.unit}</div></div>
            <div class="bg-primary-fixed/40 p-3 rounded-xl text-center"><div class="font-label-sm text-label-sm text-primary">Difference</div><div class="font-headline-sm text-headline-sm text-primary-container font-semibold mt-1">${a.difference > 0 ? '+' : ''}${a.difference} ${a.unit}</div></div>
          </div>
          <div class="flex items-center justify-between text-secondary font-body-sm text-body-sm"><span>Reason: <span class="text-on-surface font-medium">${a.reason}</span></span><span>${a.date} • ${a.user}</span></div>
        </div>
      `).join('')}</div>
    </div>`;
  }

  function wireEvents() {
    // Tab switching
    container.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; render(); });
    });

    // Dropdown
    const trigger = container.querySelector('#create-op-trigger');
    const menu = container.querySelector('#create-op-menu');
    if (trigger && menu) {
      trigger.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('hidden'); });
    }

    // Create operations
    container.querySelectorAll('[data-create]').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.create;
        menu?.classList.add('hidden');
        showCreateModal(type);
      });
    });

    // New receipt/delivery/transfer buttons
    container.querySelector('#new-receipt-btn')?.addEventListener('click', () => showCreateModal('receipt'));
    container.querySelector('#new-delivery-btn')?.addEventListener('click', () => showCreateModal('delivery'));
    container.querySelector('#new-transfer-btn')?.addEventListener('click', () => showCreateModal('transfer'));
  }

  function showCreateModal(type) {
    const titles = { receipt: 'New Inbound Receipt', delivery: 'New Delivery Order', transfer: 'New Internal Transfer', adjustment: 'New Stock Adjustment' };
    const fields = {
      receipt: `${formField('Supplier', 'select', 'supplier', '', '', data.suppliers)}${formField('Destination', 'select', 'destination', '', '', data.warehouses.map(w => w.name))}${formField('Expected Date', 'date', 'date')}${formField('Product', 'select', 'product', '', '', data.products.map(p => p.name))}${formField('Quantity', 'number', 'qty', '', '100')}`,
      delivery: `${formField('Customer', 'select', 'customer', '', '', data.customers)}${formField('Source', 'select', 'source', '', '', data.warehouses.map(w => w.name))}${formField('Product', 'select', 'product', '', '', data.products.map(p => p.name))}${formField('Quantity', 'number', 'qty', '', '10')}`,
      transfer: `${formField('From', 'select', 'from', '', '', data.warehouses.map(w => w.name))}${formField('To', 'select', 'to', '', '', data.warehouses.map(w => w.name))}${formField('Product', 'select', 'product', '', '', data.products.map(p => p.name))}${formField('Quantity', 'number', 'qty', '', '50')}`,
      adjustment: `${formField('Product', 'select', 'product', '', '', data.products.map(p => p.name))}${formField('Location', 'select', 'location', '', '', data.warehouses.map(w => w.name))}${formField('Physical Count', 'number', 'physical', '', '97')}${formField('Reason', 'textarea', 'reason', '', 'Explain the discrepancy...')}`,
    };
    showModal(titles[type], `<div class="flex flex-col gap-4">${fields[type]}</div>`, [
      { id: 'cancel', label: 'Cancel', primary: false, handler: () => {} },
      { id: 'draft', label: 'Save Draft', primary: false, handler: () => {
        showToast(`${titles[type]} saved as draft`);
        window.addAppNotification?.('Draft Operation Saved', `${titles[type]} recorded in pending queue.`, 'info', '#operations');
      }},
      { id: 'validate', label: type === 'adjustment' ? 'Apply Adjustment' : 'Validate', primary: true, handler: () => {
        showToast(`${titles[type]} validated successfully!`);
        window.addAppNotification?.('Operation Validated', `${titles[type]} completed and registered into ledger.`, 'success', '#ledger');
      }},
    ]);
  }

  // Close the create menu on outside clicks. Added once per page visit (not on every
  // tab re-render) and removed by the router when leaving the page.
  function closeMenuOnOutsideClick(e) {
    const trigger = container.querySelector('#create-op-trigger');
    const menu = container.querySelector('#create-op-menu');
    if (menu && !menu.contains(e.target) && !trigger?.contains(e.target)) menu.classList.add('hidden');
  }
  document.addEventListener('click', closeMenuOnOutsideClick);

  render();
  return () => document.removeEventListener('click', closeMenuOnOutsideClick);
}

function transferNode(label, icon, name, detail, pct, color) {
  return `<div class="w-full lg:w-72 bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md">
    <div class="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface shrink-0"><span class="material-symbols-outlined text-2xl">${icon}</span></div>
    <div class="min-w-0"><span class="font-label-sm text-label-sm text-secondary uppercase block">${label}</span><p class="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">${name}</p><div class="flex items-center gap-1.5 text-secondary font-body-sm text-body-sm mt-0.5"><span class="w-1.5 h-1.5 rounded-full bg-${color === 'green' ? 'green-500' : 'secondary'}"></span><span>${detail}</span></div></div>
  </div>`;
}

function receiptRow(r) {
  return `<div class="group p-space-sm rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
    <div class="flex items-center gap-space-sm">
      <div class="px-2.5 py-1 rounded-md bg-surface-container font-mono text-label-sm font-semibold text-on-surface">${r.id}</div>
      <div><p class="font-body-md text-body-md font-medium text-on-surface">${r.supplier}</p><div class="flex items-center gap-space-xs text-secondary font-body-sm text-body-sm"><span class="text-on-surface-variant font-medium">${r.product}</span><span>•</span><span class="text-green-600 font-medium">+${r.qty} ${r.unit}</span><span>•</span><span>${r.destination}</span></div></div>
    </div>
    <div class="flex items-center justify-between sm:justify-end gap-space-sm">${statusBadge(r.status, r.statusColor)}</div>
  </div>`;
}
