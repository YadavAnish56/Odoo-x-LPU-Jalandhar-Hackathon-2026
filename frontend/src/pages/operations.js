import { api } from '../api.js';
import { openAdjustmentForm, openOperationDetail, openOperationForm } from '../components/operation-modals.js';
import { onDataChanged, takeNextFilter } from '../store.js';
import {
  debounce,
  emptyHTML,
  errorHTML,
  esc,
  fmtDate,
  fmtQty,
  loadingHTML,
  OP_STATUS,
  opStatusBadge,
  statusBadge,
} from '../utils.js';

const TABS = {
  overview: { label: 'Overview' },
  receipts: { label: 'Receipts', type: 'receipt', newLabel: 'New Receipt' },
  deliveries: { label: 'Deliveries', type: 'delivery', newLabel: 'New Delivery' },
  transfers: { label: 'Transfers', type: 'internal', newLabel: 'New Transfer' },
  adjustments: { label: 'Adjustments', type: 'adjustment', newLabel: 'New Adjustment' },
};

export default function renderOperations(container) {
  const preset = takeNextFilter('operations') ?? {};
  const state = { tab: preset.tab ?? 'overview', status: preset.status ?? '', search: '', late: false, page: 1 };
  let counts = {};
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    <div class="flex flex-col w-full pb-space-xl">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
        <div>
          <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Real-time Logistics</span></div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Operations & Movement</h1>
          <p class="font-body-md text-body-md text-secondary mt-1">Receipts, delivery orders, internal transfers and stock adjustments.</p>
        </div>
        <div class="relative inline-block text-left">
          <button id="create-op-trigger" class="inline-flex items-center gap-space-xs bg-primary-container hover:bg-primary text-white font-label-md text-label-md px-space-md py-2.5 rounded-xl shadow-sm transition-all active:scale-[0.99]"><span class="material-symbols-outlined text-[18px]">add</span><span>Create Operation</span><span class="material-symbols-outlined text-[18px]">arrow_drop_down</span></button>
          <div class="hidden absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-xl shadow-xl z-30 p-1.5" id="create-op-menu">
            <div class="px-space-sm py-1 font-label-sm text-label-sm text-secondary uppercase tracking-wider">New Transaction</div>
            <button data-create="receipt" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">move_to_inbox</span><span>Inbound Receipt</span></button>
            <button data-create="delivery" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">local_shipping</span><span>Delivery Order</span></button>
            <button data-create="internal" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-primary-container text-body-lg">sync_alt</span><span>Internal Transfer</span></button>
            <div class="my-1 h-px bg-surface-container"></div>
            <button data-create="adjustment" class="w-full flex items-center gap-space-sm px-space-sm py-2 rounded-lg font-body-sm text-body-sm text-on-surface hover:bg-surface-container-low transition-colors text-left"><span class="material-symbols-outlined text-outline text-body-lg">tune</span><span>Stock Adjustment</span></button>
          </div>
        </div>
      </div>

      <div id="tabs" class="flex items-center gap-space-xs overflow-x-auto pb-1 mb-space-lg"></div>
      <div id="tab-content">${loadingHTML()}</div>
    </div>
  `;

  function renderTabs() {
    $('#tabs').innerHTML = Object.entries(TABS)
      .map(([key, tab]) => {
        const active = state.tab === key;
        const count = tab.type ? counts[tab.type] : undefined;
        return `<button data-tab="${key}" class="px-space-md py-1.5 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ${active ? 'bg-primary-container text-white shadow-sm' : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface'}">${tab.label}${count !== undefined ? ` <span class="ml-1 px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25 text-white' : 'bg-surface-container text-on-surface'} font-label-sm text-label-sm">${count}</span>` : ''}</button>`;
      })
      .join('');
  }

  async function loadCounts() {
    try {
      const data = await api.get('/dashboard');
      counts = Object.fromEntries(
        Object.entries(data.operations).map(([type, c]) => [type, c.draft + c.waiting + c.ready + c.done + c.canceled]),
      );
      if (container.isConnected) renderTabs();
    } catch {
      /* counts are optional */
    }
  }

  function load() {
    renderTabs();
    loadCounts();
    if (state.tab === 'overview') loadOverview();
    else loadList();
  }

  // ------------------------------------------------------------- overview
  async function loadOverview() {
    const content = $('#tab-content');
    try {
      const [transfers, receipts, adjustments, deliveries] = await Promise.all([
        api.get('/operations', { type: 'internal', status: 'draft,waiting,ready', sort: 'scheduled', limit: 1 }),
        api.get('/operations', { type: 'receipt', limit: 4 }),
        api.get('/operations', { type: 'adjustment', limit: 1 }),
        api.get('/operations', { type: 'delivery', limit: 5 }),
      ]);
      if (!container.isConnected || state.tab !== 'overview') return;
      const t = transfers.items[0];
      const adj = adjustments.items[0];
      content.innerHTML = `
        <div class="relative overflow-hidden bg-surface-container-lowest rounded-2xl shadow-sm p-space-lg mb-space-lg">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="p-2 rounded-xl bg-surface-container-low text-primary-container"><span class="material-symbols-outlined text-[20px]">sync_alt</span></div>
              <div><span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider block">Next Relocation</span><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Internal Transfer Flow</h2></div>
            </div>
            ${t ? `<div class="flex flex-wrap items-center gap-space-sm">${opStatusBadge(t.status)}<span class="font-body-sm text-body-sm text-secondary">Ref <strong class="text-on-surface font-medium">${esc(t.reference)}</strong> · ${fmtDate(t.scheduledDate)}</span></div>` : ''}
          </div>
          ${t ? `
            <div class="my-space-md p-space-lg rounded-xl bg-surface-container-low/70 flex flex-col lg:flex-row items-center justify-between gap-space-lg cursor-pointer hover:bg-surface-container-low transition-colors" data-op="${t.id}">
              ${transferNode('From', 'warehouse', t.sourceLocationName, t.sourceLocationCode)}
              <div class="flex-1 w-full flex flex-col items-center justify-center px-space-sm">
                <div class="w-full flex items-center justify-center text-primary-container font-label-sm text-label-sm font-semibold mb-1.5">${t.lineItems.map((l) => `${fmtQty(l.quantity)} ${esc(l.uom)} ${esc(l.productName)}`).join(' · ')}</div>
                <div class="relative w-full h-3 bg-surface-container rounded-full overflow-hidden flex items-center">
                  <div class="absolute inset-0 bg-gradient-to-r from-primary-container/20 via-primary-container to-primary-container/40 rounded-full w-2/3 animate-[pulse_2s_ease-in-out_infinite]"></div>
                </div>
              </div>
              ${transferNode('To', 'precision_manufacturing', t.destLocationName, t.destLocationCode)}
            </div>` : emptyHTML('No internal transfers are scheduled', 'sync_alt')}
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-lg">
          <div class="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
            <div class="flex items-center justify-between pb-space-md">
              <div class="flex items-center gap-space-sm">
                <div class="p-2 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[20px]">input</span></div>
                <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Receipts: Inbound</h2><p class="font-body-sm text-body-sm text-secondary">Latest goods from vendors</p></div>
              </div>
              <button data-tab-link="receipts" class="font-label-md text-label-md text-primary font-semibold">View all</button>
            </div>
            <div class="flex flex-col gap-space-xs mt-space-sm">
              ${receipts.items.length ? receipts.items.map(receiptRow).join('') : emptyHTML('No receipts yet', 'move_to_inbox')}
            </div>
          </div>

          <div class="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
            <div class="flex items-center gap-space-sm pb-space-sm">
              <div class="p-2 rounded-xl bg-primary-fixed text-primary-container"><span class="material-symbols-outlined text-[20px]">scale</span></div>
              <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Physical vs Recorded</h2><span class="font-label-sm text-label-sm text-secondary uppercase">Latest stock count</span></div>
            </div>
            ${adj ? varianceCard(adj) : emptyHTML('No stock adjustments yet', 'tune')}
          </div>
        </div>

        <div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm">
          <div class="flex items-center justify-between pb-space-md">
            <div class="flex items-center gap-space-sm">
              <div class="p-2 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[20px]">local_shipping</span></div>
              <div><h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Recent Delivery Orders</h2><p class="font-body-sm text-body-sm text-secondary">Outbound dispatch status</p></div>
            </div>
            <button data-tab-link="deliveries" class="font-label-md text-label-md text-primary font-semibold">View all</button>
          </div>
          ${deliveries.items.length ? `<div class="overflow-x-auto">
            <table class="w-full text-left font-body-sm text-body-sm">
              <thead><tr class="text-secondary font-label-sm text-label-sm uppercase tracking-wider bg-surface-container-low/50">
                <th class="py-2.5 px-space-md rounded-l-lg">Order Ref</th><th class="py-2.5 px-space-md">Customer</th><th class="py-2.5 px-space-md">Products</th><th class="py-2.5 px-space-md">Source</th><th class="py-2.5 px-space-md text-right rounded-r-lg">Status</th>
              </tr></thead>
              <tbody class="divide-y divide-surface-container/60">
                ${deliveries.items.map((d) => `
                  <tr class="hover:bg-surface-container-low/50 transition-colors cursor-pointer" data-op="${d.id}">
                    <td class="py-space-md px-space-md font-mono font-medium text-on-surface whitespace-nowrap">${esc(d.reference)}</td>
                    <td class="py-space-md px-space-md font-medium text-on-surface">${esc(d.partnerName || '—')}</td>
                    <td class="py-space-md px-space-md text-on-surface-variant">${itemsSummary(d)}</td>
                    <td class="py-space-md px-space-md text-secondary font-mono">${esc(d.sourceLocationCode)}</td>
                    <td class="py-space-md px-space-md text-right">${opStatusBadge(d.status)}</td>
                  </tr>`).join('')}
              </tbody>
            </table></div>` : emptyHTML('No delivery orders yet', 'local_shipping')}
        </div>`;
    } catch (err) {
      if (container.isConnected) content.innerHTML = errorHTML(err);
    }
  }

  // ----------------------------------------------------------------- lists
  function renderListShell() {
    const tab = TABS[state.tab];
    $('#tab-content').innerHTML = `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h2 class="font-headline-md text-headline-md text-on-surface font-semibold">${tab.label}</h2>
          <div class="flex flex-wrap items-center gap-2">
            <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary">search</span><input id="op-search" value="${esc(state.search)}" class="pl-9 pr-4 py-2 w-56 rounded-xl bg-surface-container-low text-on-surface text-body-sm font-body-sm focus:outline-none focus:ring-2 focus:ring-primary-container" placeholder="Reference, partner, product..." type="text"/></div>
            ${tab.type !== 'adjustment' ? `<label class="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-low font-label-md text-label-md text-secondary cursor-pointer"><input id="op-late" type="checkbox" ${state.late ? 'checked' : ''} class="accent-primary-container"/>Late only</label>` : ''}
            <button id="new-op-btn" class="flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>${tab.newLabel}</button>
          </div>
        </div>
        ${tab.type !== 'adjustment' ? `<div id="status-chips" class="flex flex-wrap items-center gap-1.5 mb-4">
          ${[['', 'All'], ['draft,waiting,ready', 'Open'], ...Object.entries(OP_STATUS).map(([k, v]) => [k, v.label])].map(([k, label]) => `<button data-status="${k}" class="px-3 py-1 rounded-full font-label-md text-label-md transition-colors ${state.status === k ? 'bg-on-surface text-surface' : 'bg-surface-container-low text-secondary hover:text-on-surface'}">${label}</button>`).join('')}
        </div>` : ''}
        ${tab.type === 'internal' ? '<div class="p-4 mb-4 bg-surface-container-low rounded-xl flex items-center gap-2"><span class="material-symbols-outlined text-primary-container">info</span><span class="font-body-sm text-body-sm text-secondary">Internal transfers move stock between locations. <strong class="text-on-surface">Total company stock does not change.</strong></span></div>' : ''}
        <div id="op-list">${loadingHTML()}</div>
      </div>`;

    $('#op-search').addEventListener('input', debounce((e) => {
      state.search = e.target.value.trim();
      state.page = 1;
      loadRows();
    }, 300));
    $('#op-late')?.addEventListener('change', (e) => {
      state.late = e.target.checked;
      state.page = 1;
      loadRows();
    });
    $('#new-op-btn').addEventListener('click', () => (tab.type === 'adjustment' ? openAdjustmentForm() : openOperationForm(tab.type)));
    container.querySelectorAll('[data-status]').forEach((b) => b.addEventListener('click', () => {
      state.status = b.dataset.status;
      state.page = 1;
      renderListShell();
      loadRows();
    }));
  }

  async function loadRows() {
    const tab = TABS[state.tab];
    const list = $('#op-list');
    if (!list) return;
    try {
      const res = await api.get('/operations', {
        type: tab.type, status: state.status, search: state.search, late: state.late || undefined,
        sort: state.status.includes('ready') ? 'scheduled' : undefined, page: state.page, limit: 15,
      });
      if (!container.isConnected || TABS[state.tab] !== tab) return;
      list.innerHTML = res.items.length ? listTable(tab.type, res) : emptyHTML('No operations found', 'receipt_long');
    } catch (err) {
      if (container.isConnected) list.innerHTML = errorHTML(err);
    }
  }

  function loadList() {
    if (!$('#op-list')) renderListShell();
    loadRows();
  }

  // ---------------------------------------------------------------- events
  const menu = $('#create-op-menu');
  $('#create-op-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('hidden');
  });
  const closeMenu = (e) => {
    if (!menu.contains(e.target)) menu.classList.add('hidden');
  };
  document.addEventListener('click', closeMenu);

  container.addEventListener('click', (e) => {
    const create = e.target.closest('[data-create]');
    if (create) {
      menu.classList.add('hidden');
      if (create.dataset.create === 'adjustment') openAdjustmentForm();
      else openOperationForm(create.dataset.create);
      return;
    }
    const tabBtn = e.target.closest('[data-tab], [data-tab-link]');
    if (tabBtn) {
      state.tab = tabBtn.dataset.tab || tabBtn.dataset.tabLink;
      Object.assign(state, { status: '', search: '', late: false, page: 1 });
      $('#tab-content').innerHTML = loadingHTML();
      load();
      return;
    }
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn && !pageBtn.disabled) {
      state.page = Number(pageBtn.dataset.page);
      loadRows();
      return;
    }
    const row = e.target.closest('[data-op]');
    if (row) openOperationDetail(Number(row.dataset.op));
  });

  load();
  const stopListening = onDataChanged(load);
  return () => {
    stopListening();
    document.removeEventListener('click', closeMenu);
  };
}

// ---------------------------------------------------------------------------
function itemsSummary(o) {
  const first = o.lineItems[0];
  if (!first) return '—';
  return `<span class="font-semibold text-on-surface">${fmtQty(first.quantity)} ${esc(first.uom)}</span> ${esc(first.productName)}${o.lineItems.length > 1 ? ` <span class="text-secondary">+${o.lineItems.length - 1} more</span>` : ''}`;
}

function listTable(type, res) {
  const partnerHead = type === 'receipt' ? 'Supplier' : type === 'delivery' ? 'Customer' : null;
  const headers = [
    'Reference',
    partnerHead,
    'Products',
    type === 'adjustment' ? 'Change' : 'Quantity',
    type === 'internal' ? 'From → To' : type === 'receipt' ? 'Destination' : type === 'delivery' ? 'Source' : 'Location',
    type === 'adjustment' ? 'Date' : 'Scheduled',
    'Status',
  ].filter(Boolean);

  const rows = res.items.map((o) => {
    let qty;
    if (type === 'adjustment') {
      const change = o.lineItems.reduce((s, l) => s + (l.quantity - (l.systemQuantity ?? 0)), 0);
      qty = `<span class="${change < 0 ? 'text-error' : change > 0 ? 'text-emerald-600' : 'text-secondary'}">${change > 0 ? '+' : ''}${fmtQty(change)}</span>`;
    } else {
      const sign = type === 'receipt' ? '+' : type === 'delivery' ? '-' : '';
      qty = `<span class="${type === 'receipt' ? 'text-emerald-600' : type === 'delivery' ? 'text-error' : 'text-on-surface'}">${sign}${fmtQty(o.totalQuantity)}</span>`;
    }
    const where = type === 'internal'
      ? `${esc(o.sourceLocationCode)} → ${esc(o.destLocationCode)}`
      : esc(type === 'delivery' ? o.sourceLocationCode : o.destLocationCode);
    return `
      <tr class="hover:bg-surface-container-low/50 transition-colors cursor-pointer" data-op="${o.id}">
        <td class="py-3 px-4 font-mono font-semibold text-on-surface whitespace-nowrap">${esc(o.reference)}</td>
        ${partnerHead ? `<td class="py-3 px-4 text-on-surface font-medium">${esc(o.partnerName || '—')}</td>` : ''}
        <td class="py-3 px-4 text-on-surface-variant">${type === 'adjustment' ? esc(o.lineItems.map((l) => l.productName).join(', ')) : itemsSummary(o)}</td>
        <td class="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">${qty}</td>
        <td class="py-3 px-4 text-secondary font-mono whitespace-nowrap">${where}</td>
        <td class="py-3 px-4 text-secondary font-mono whitespace-nowrap">${fmtDate(o.scheduledDate)}${o.isLate ? ' <span class="text-error font-sans font-semibold">Late</span>' : ''}</td>
        <td class="py-3 px-4 text-right">${opStatusBadge(o.status)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="overflow-x-auto"><table class="w-full text-left">
      <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
        ${headers.map((h, i) => `<th class="py-3 px-4 ${i === 0 ? 'rounded-l-xl' : ''} ${i === headers.length - 1 ? 'rounded-r-xl text-right' : ''} ${h === 'Quantity' || h === 'Change' ? 'text-right' : ''}">${h}</th>`).join('')}
      </tr></thead>
      <tbody class="font-body-sm text-body-sm">${rows}</tbody>
    </table></div>
    <div class="pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
      <span class="font-body-sm text-body-sm text-secondary">Showing ${res.items.length} of ${res.total}</span>
      ${res.totalPages > 1 ? `<div class="flex items-center gap-2">
        <button data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Previous</button>
        <span class="font-label-md text-label-md text-secondary">Page ${res.page} of ${res.totalPages}</span>
        <button data-page="${res.page + 1}" ${res.page >= res.totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Next</button>
      </div>` : ''}
    </div>`;
}

function transferNode(label, icon, name, code) {
  return `<div class="w-full lg:w-72 bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex items-center gap-space-md">
    <div class="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center text-on-surface shrink-0"><span class="material-symbols-outlined text-2xl">${icon}</span></div>
    <div class="min-w-0"><span class="font-label-sm text-label-sm text-secondary uppercase block">${label}</span><p class="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">${esc(name)}</p><div class="text-secondary font-mono font-body-sm text-body-sm mt-0.5">${esc(code)}</div></div>
  </div>`;
}

function receiptRow(r) {
  return `<div class="group p-space-sm rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm cursor-pointer" data-op="${r.id}">
    <div class="flex items-center gap-space-sm min-w-0">
      <div class="px-2.5 py-1 rounded-md bg-surface-container font-mono text-label-sm font-semibold text-on-surface whitespace-nowrap">${esc(r.reference)}</div>
      <div class="min-w-0"><p class="font-body-md text-body-md font-medium text-on-surface truncate">${esc(r.partnerName || 'Vendor')}</p><div class="flex items-center gap-space-xs text-secondary font-body-sm text-body-sm"><span class="text-green-600 font-medium">+${fmtQty(r.totalQuantity)}</span><span>•</span><span class="truncate">${esc(r.lineItems.map((l) => l.productName).join(', '))}</span><span>•</span><span class="font-mono">${esc(r.destLocationCode)}</span></div></div>
    </div>
    <div class="flex items-center justify-between sm:justify-end gap-space-sm">${r.isLate ? statusBadge('Late', 'red') : ''}${opStatusBadge(r.status)}</div>
  </div>`;
}

function varianceCard(a) {
  const line = a.lineItems[0];
  const diff = line.quantity - (line.systemQuantity ?? 0);
  return `
    <div class="cursor-pointer" data-op="${a.id}">
      <div class="p-space-sm rounded-xl bg-surface-container-low/50 my-space-sm">
        <span class="font-label-sm text-label-sm text-secondary uppercase block">Audited Item · ${esc(a.reference)}</span>
        <div class="flex items-baseline justify-between mt-0.5 gap-2"><span class="font-headline-sm text-headline-sm text-on-surface font-semibold truncate">${esc(line.productName)}</span><span class="font-mono text-label-md text-primary-container bg-primary-fixed px-2 py-0.5 rounded">${esc(line.sku)}</span></div>
      </div>
      <div class="grid grid-cols-3 gap-space-xs my-space-sm">
        <div class="bg-surface-container-low p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-secondary block">Recorded</span><span class="font-headline-md text-headline-md text-on-surface font-bold mt-1 block">${fmtQty(line.systemQuantity)}</span></div>
        <div class="bg-surface-container-low p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-secondary block">Physical</span><span class="font-headline-md text-headline-md text-on-surface font-bold mt-1 block">${fmtQty(line.quantity)}</span></div>
        <div class="bg-primary-fixed/40 p-space-sm rounded-xl text-center"><span class="font-label-sm text-label-sm text-primary font-medium block">Difference</span><span class="font-headline-md text-headline-md text-primary-container font-bold mt-1 block">${diff > 0 ? '+' : ''}${fmtQty(diff)}</span></div>
      </div>
      <p class="font-body-sm text-body-sm text-secondary mt-space-md">Reason: <span class="text-on-surface font-medium">${esc(a.notes || '—')}</span></p>
      <p class="font-label-sm text-label-sm text-secondary mt-1">${esc(a.destLocationCode)} · ${fmtDate(a.doneAt)} · by ${esc(a.responsibleName || '—')}</p>
    </div>`;
}
