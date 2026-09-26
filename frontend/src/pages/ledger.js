import { api, fetchAll } from '../api.js';
import { openOperationDetail } from '../components/operation-modals.js';
import { getLookups, onDataChanged, takeNextFilter, warehouseOptions } from '../store.js';
import { debounce, downloadCSV, emptyHTML, errorHTML, esc, fmtDateTime, fmtQty, loadingHTML, OP_TYPE, operationIcon, showError, statusBadge } from '../utils.js';

const selectClass =
  'bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-primary-container';

export default function renderLedger(container) {
  const state = { view: 'history', search: '', type: '', warehouseId: '', page: 1, ...takeNextFilter('ledger') };
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
        <div>
          <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Audit & Traceability</span></div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Move History & Stock Ledger</h1>
          <p class="font-body-md text-body-md text-secondary mt-1">Every inventory movement, fully traceable and auditable.</p>
        </div>
        <div class="flex flex-wrap items-center gap-space-sm">
          <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary">search</span><input id="ledger-search" value="${esc(state.search)}" class="pl-9 pr-4 py-2 w-64 rounded-xl bg-surface-container-lowest text-on-surface text-body-sm font-body-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" placeholder="Search by ref, product, SKU..." type="text"/></div>
          <button id="ledger-export" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md shadow-sm"><span class="material-symbols-outlined text-[18px] text-secondary">file_download</span>Export</button>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div class="flex items-center gap-space-xs">
          <button data-ledger-tab="history" class="px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors">Move History</button>
          <button data-ledger-tab="ledger" class="px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors">Stock Ledger</button>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <select id="f-type" class="${selectClass}">
            <option value="">All operations</option>
            ${Object.entries(OP_TYPE).map(([k, v]) => `<option value="${k}">${v.plural}</option>`).join('')}
          </select>
          <select id="f-warehouse" class="${selectClass}"><option value="">All warehouses</option></select>
        </div>
      </div>

      <div id="ledger-body" class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">${loadingHTML()}</div>
    </div>
  `;

  const params = () => ({ search: state.search, type: state.type, warehouseId: state.warehouseId });

  function renderTabs() {
    container.querySelectorAll('[data-ledger-tab]').forEach((btn) => {
      const active = btn.dataset.ledgerTab === state.view;
      btn.className = `px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${active ? 'bg-primary-container text-white shadow-sm' : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface'}`;
    });
  }

  async function load() {
    renderTabs();
    const body = $('#ledger-body');
    try {
      const path = state.view === 'history' ? '/moves' : '/moves/ledger';
      const res = await api.get(path, { ...params(), page: state.page, limit: 25 });
      if (!container.isConnected) return;
      body.innerHTML = res.items.length
        ? (state.view === 'history' ? historyTable(res.items) : ledgerTable(res.items)) + pager(res)
        : emptyHTML('No stock movements found', 'menu_book');
    } catch (err) {
      if (container.isConnected) body.innerHTML = errorHTML(err);
    }
  }

  container.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-ledger-tab]');
    if (tab) {
      state.view = tab.dataset.ledgerTab;
      state.page = 1;
      $('#ledger-body').innerHTML = loadingHTML();
      load();
      return;
    }
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn && !pageBtn.disabled) {
      state.page = Number(pageBtn.dataset.page);
      load();
      return;
    }
    const row = e.target.closest('[data-operation]');
    if (row?.dataset.operation) openOperationDetail(Number(row.dataset.operation));
  });

  $('#ledger-search').addEventListener('input', debounce((e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    load();
  }, 300));
  $('#f-type').addEventListener('change', (e) => {
    state.type = e.target.value;
    state.page = 1;
    load();
  });
  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    state.page = 1;
    load();
  });
  $('#ledger-export').addEventListener('click', async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      if (state.view === 'history') {
        const rows = await fetchAll('/moves', params());
        downloadCSV(`stocksense-move-history-${date}.csv`, [
          ['Date', 'Reference', 'Operation', 'Product', 'SKU', 'Quantity', 'Unit', 'From', 'To', 'User'],
          ...rows.map((m) => [m.createdAt, m.reference, OP_TYPE[m.moveType]?.label, m.productName, m.sku, signed(m), m.uom, fromLabel(m), toLabel(m), m.createdByName ?? '']),
        ]);
      } else {
        const rows = await fetchAll('/moves/ledger', params());
        downloadCSV(`stocksense-stock-ledger-${date}.csv`, [
          ['Date', 'Reference', 'Operation', 'Product', 'SKU', 'Location', 'In', 'Out', 'Balance', 'Unit'],
          ...rows.map((l) => [l.createdAt, l.reference, ledgerOperation(l), l.productName, l.sku, l.locationCode, l.quantityIn, l.quantityOut, l.balance, l.uom]),
        ]);
      }
    } catch (err) {
      showError(err);
    }
  });

  getLookups()
    .then(({ warehouses }) => {
      $('#f-warehouse').insertAdjacentHTML('beforeend', warehouseOptions(warehouses).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''));
    })
    .catch(() => {});

  load();
  return onDataChanged(load);
}

const signed = (m) => (m.direction === 'in' ? m.quantity : m.direction === 'out' ? -m.quantity : m.quantity);

function fromLabel(m) {
  if (m.fromLocationCode) return m.fromLocationCode;
  return m.moveType === 'adjustment' ? 'Inventory adjustment' : m.partnerName || 'Vendor';
}

function toLabel(m) {
  if (m.toLocationCode) return m.toLocationCode;
  return m.moveType === 'adjustment' ? 'Inventory adjustment' : m.partnerName || 'Customer';
}

function ledgerOperation(l) {
  if (l.moveType === 'internal') return l.quantityOut > 0 ? 'Transfer Out' : 'Transfer In';
  return OP_TYPE[l.moveType]?.label ?? l.moveType;
}

function historyTable(items) {
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
          <th class="py-3 px-4 rounded-l-xl">Timestamp</th><th class="py-3 px-4">Reference</th><th class="py-3 px-4">Operation</th><th class="py-3 px-4">Product</th><th class="py-3 px-4 text-right">Quantity</th><th class="py-3 px-4">From</th><th class="py-3 px-4">To</th><th class="py-3 px-4">User</th><th class="py-3 px-4 rounded-r-xl text-right">Direction</th>
        </tr></thead>
        <tbody class="font-body-sm text-body-sm text-on-surface">
          ${items.map((m) => `
            <tr class="hover:bg-surface-container-low/70 transition-colors ${m.operationId ? 'cursor-pointer' : ''}" data-operation="${m.operationId ?? ''}">
              <td class="py-3.5 px-4 text-secondary font-mono whitespace-nowrap">${fmtDateTime(m.createdAt)}</td>
              <td class="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">${esc(m.reference)}</td>
              <td class="py-3.5 px-4">${operationIcon(m.moveType)}</td>
              <td class="py-3.5 px-4 font-medium">${esc(m.productName)} <span class="font-mono text-secondary font-normal">${esc(m.sku)}</span></td>
              <td class="py-3.5 px-4 text-right font-mono font-semibold whitespace-nowrap ${m.direction === 'in' ? 'text-emerald-600' : m.direction === 'out' ? 'text-error' : 'text-on-surface'}">${m.direction === 'in' ? '+' : m.direction === 'out' ? '-' : ''}${fmtQty(m.quantity)} ${esc(m.uom)}</td>
              <td class="py-3.5 px-4 text-secondary">${esc(fromLabel(m))}</td>
              <td class="py-3.5 px-4 text-secondary">${esc(toLabel(m))}</td>
              <td class="py-3.5 px-4 text-secondary whitespace-nowrap">${esc(m.createdByName ?? '—')}</td>
              <td class="py-3.5 px-4 text-right">${m.direction === 'in' ? statusBadge('In', 'green') : m.direction === 'out' ? statusBadge('Out', 'orange') : statusBadge('Internal', 'blue')}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function ledgerTable(items) {
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
          <th class="py-3 px-4 rounded-l-xl">Date</th><th class="py-3 px-4">Reference</th><th class="py-3 px-4">Operation</th><th class="py-3 px-4">Product</th><th class="py-3 px-4">Location</th><th class="py-3 px-4 text-right">In</th><th class="py-3 px-4 text-right">Out</th><th class="py-3 px-4 rounded-r-xl text-right">Balance</th>
        </tr></thead>
        <tbody class="font-body-sm text-body-sm text-on-surface">
          ${items.map((l) => `
            <tr class="hover:bg-surface-container-low/70 transition-colors ${l.operationId ? 'cursor-pointer' : ''}" data-operation="${l.operationId ?? ''}">
              <td class="py-3.5 px-4 text-secondary font-mono whitespace-nowrap">${fmtDateTime(l.createdAt)}</td>
              <td class="py-3.5 px-4 font-mono font-semibold whitespace-nowrap">${esc(l.reference)}</td>
              <td class="py-3.5 px-4 whitespace-nowrap">${operationIcon(l.moveType).replace(esc(OP_TYPE[l.moveType]?.label ?? ''), esc(ledgerOperation(l)))}</td>
              <td class="py-3.5 px-4 font-medium">${esc(l.productName)}</td>
              <td class="py-3.5 px-4 text-secondary font-mono">${esc(l.locationCode)}</td>
              <td class="py-3.5 px-4 text-right font-mono ${l.quantityIn > 0 ? 'text-emerald-600 font-semibold' : 'text-secondary'}">${l.quantityIn > 0 ? `+${fmtQty(l.quantityIn)}` : '—'}</td>
              <td class="py-3.5 px-4 text-right font-mono ${l.quantityOut > 0 ? 'text-error font-semibold' : 'text-secondary'}">${l.quantityOut > 0 ? `-${fmtQty(l.quantityOut)}` : '—'}</td>
              <td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface whitespace-nowrap">${fmtQty(l.balance)} <span class="font-normal text-secondary">${esc(l.uom)}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

function pager(res) {
  return `
    <div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span class="font-body-sm text-body-sm text-secondary">Showing ${res.items.length} of ${res.total}</span>
      ${res.totalPages > 1 ? `<div class="flex items-center gap-2">
        <button data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Previous</button>
        <span class="font-label-md text-label-md text-secondary">Page ${res.page} of ${res.totalPages}</span>
        <button data-page="${res.page + 1}" ${res.page >= res.totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Next</button>
      </div>` : ''}
    </div>`;
}
