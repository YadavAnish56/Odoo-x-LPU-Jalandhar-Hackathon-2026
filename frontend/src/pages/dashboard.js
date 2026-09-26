// Inventory Dashboard: KPIs + dynamic filters + snapshot of operations (problem statement "Dashboard View").
import { api } from '../api.js';
import { getLookups, locationOptions, onDataChanged, reorder, setNextFilter, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  emptyHTML,
  errorHTML,
  esc,
  FILTER,
  fmtDate,
  fmtQty,
  loadingHTML,
  OP_STATUS,
  OP_TYPE,
  operationHref,
  operationLabel,
  optionsHTML,
  opStatusBadge,
  pagerHTML,
  ROW,
  sectionHeader,
  showError,
  stockBadge,
  tableHTML,
  TD,
} from '../utils.js';

const OPEN = 'draft,waiting,ready';

export default function renderDashboard(container) {
  const state = { type: '', status: '', warehouseId: '', locationId: '', categoryId: '', page: 1 };
  const $ = (sel) => container.querySelector(sel);
  let lookups = null;

  container.innerHTML = `
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <select id="f-type" class="${FILTER}" aria-label="Document type">
        ${optionsHTML(Object.entries(OP_TYPE).map(([k, v]) => ({ value: k, label: v.plural })), '', 'All documents')}
      </select>
      <select id="f-status" class="${FILTER}" aria-label="Status">
        ${optionsHTML(Object.entries(OP_STATUS).map(([k, v]) => ({ value: k, label: v.label })), '', 'All statuses')}
      </select>
      <select id="f-warehouse" class="${FILTER}" aria-label="Warehouse"><option value="">All warehouses</option></select>
      <select id="f-location" class="${FILTER}" aria-label="Location"><option value="">All locations</option></select>
      <select id="f-category" class="${FILTER}" aria-label="Product category"><option value="">All categories</option></select>
      ${button('Reset', { variant: 'ghost', attrs: 'id="f-reset"' })}
    </div>

    <section id="kpis" class="mb-4">${loadingHTML()}</section>

    <section class="${CARD} overflow-hidden mb-4">
      ${sectionHeader('Operations', '<span id="ops-count" class="text-[12px] text-secondary"></span>')}
      <div id="ops">${loadingHTML()}</div>
    </section>

    <section class="${CARD} overflow-hidden">
      ${sectionHeader('Low stock', '<a href="#reordering" class="text-[13px] text-primary hover:underline">Reordering rules</a>')}
      <div id="alerts">${loadingHTML()}</div>
    </section>`;

  const kpiFilters = () => ({ warehouseId: state.warehouseId, locationId: state.locationId, categoryId: state.categoryId });

  const kpi = (key, label, value, detail, alert = false) => `
    <button type="button" data-kpi="${key}" class="${CARD} p-4 text-left hover:border-surface-container-high transition-colors">
      <div class="text-[13px] text-secondary">${label}</div>
      <div class="kpi-value text-[28px] font-semibold tracking-tight mt-1.5 leading-none">${value}</div>
      <div class="text-[12px] mt-2 ${alert ? 'text-danger' : 'text-secondary'}">${detail}</div>
    </button>`;

  async function loadKpis() {
    try {
      const data = await api.get('/dashboard', kpiFilters());
      if (!container.isConnected) return;
      const k = data.kpis;
      const deliveryNote = [k.waitingDeliveries && `${k.waitingDeliveries} waiting`, k.lateDeliveries && `${k.lateDeliveries} late`].filter(Boolean).join(' · ');
      $('#kpis').innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          ${kpi('products', 'Total products in stock', fmtQty(k.productsInStock), `of ${fmtQty(k.totalProducts)} products`)}
          ${kpi('low', 'Low / out of stock items', `${fmtQty(k.lowStock)} <span class="text-secondary font-normal">/</span> ${fmtQty(k.outOfStock)}`, `${k.lowStock} low, ${k.outOfStock} out`, k.lowStock + k.outOfStock > 0)}
          ${kpi('receipt', 'Pending receipts', fmtQty(k.pendingReceipts), k.lateReceipts ? `${k.lateReceipts} late` : 'none late', k.lateReceipts > 0)}
          ${kpi('delivery', 'Pending deliveries', fmtQty(k.pendingDeliveries), deliveryNote || 'none late', Boolean(deliveryNote))}
          ${kpi('internal', 'Internal transfers scheduled', fmtQty(k.scheduledTransfers), k.lateTransfers ? `${k.lateTransfers} late` : 'none late', k.lateTransfers > 0)}
        </div>`;
      $('#kpis').querySelectorAll('[data-kpi]').forEach((card) => card.addEventListener('click', () => openKpi(card.dataset.kpi, k)));
      renderAlerts(data.lowStockAlerts);
    } catch (err) {
      if (container.isConnected) $('#kpis').innerHTML = `<div class="${CARD}">${errorHTML(err)}</div>`;
    }
  }

  function openKpi(key, k) {
    if (key === 'products' || key === 'low') {
      setNextFilter('products', key === 'low' ? { stockStatus: k.lowStock ? 'low' : 'out' } : {});
      window.location.hash = '#products';
      return;
    }
    setNextFilter(`operations:${key}`, { status: OPEN });
    window.location.hash = `#${OP_TYPE[key].route}`;
  }

  function renderAlerts(alerts) {
    const rows = alerts.map(
      (a, i) => `
      <tr class="${ROW}">
        <td class="${TD}"><a href="#products/${a.productId}" class="font-medium hover:text-primary">${esc(a.productName)}</a> <span class="font-mono text-[12px] text-secondary">${esc(a.sku)}</span></td>
        <td class="${TD}">${esc(a.warehouseName)}</td>
        <td class="${TD} text-right font-mono">${fmtQty(a.onHand)}</td>
        <td class="${TD} text-right font-mono text-secondary">${fmtQty(a.minQty)}</td>
        <td class="${TD}">${stockBadge(a.status)}</td>
        <td class="${TD} text-right">${button(`Reorder ${fmtQty(a.suggestedQty)}`, { small: true, attrs: `data-reorder="${i}"` })}</td>
      </tr>`,
    );
    $('#alerts').innerHTML = alerts.length
      ? tableHTML(['Product', 'Warehouse', { label: 'On hand', align: 'right' }, { label: 'Minimum', align: 'right' }, 'Status', ''], rows)
      : emptyHTML('Nothing is below its reorder level.');
    $('#alerts').querySelectorAll('[data-reorder]').forEach((btn) =>
      btn.addEventListener('click', () => reorder(alerts[Number(btn.dataset.reorder)]).catch(showError)),
    );
  }

  async function loadOps() {
    try {
      const res = await api.get('/operations', { ...kpiFilters(), type: state.type, status: state.status, page: state.page, limit: 10 });
      if (!container.isConnected) return;
      $('#ops-count').textContent = `${res.total} total`;
      const rows = res.items.map((o) => {
        const first = o.lineItems[0];
        return `
          <tr class="${ROW} cursor-pointer" data-href="${operationHref(o)}">
            <td class="${TD} font-mono whitespace-nowrap">${esc(o.reference)}</td>
            <td class="${TD} whitespace-nowrap">${operationLabel(o.type)}</td>
            <td class="${TD} whitespace-nowrap">${esc(o.partnerName || '—')}</td>
            <td class="${TD} whitespace-nowrap text-secondary">${esc(o.sourceLocationCode || 'Vendor')} → ${esc(o.type === 'adjustment' ? 'Adjusted' : o.destLocationCode || 'Customer')}</td>
            <td class="${TD} whitespace-nowrap">${esc(first?.productName ?? '—')}${o.lineItems.length > 1 ? ` <span class="text-secondary">+${o.lineItems.length - 1}</span>` : ''}</td>
            <td class="${TD} whitespace-nowrap">${fmtDate(o.scheduledDate)}${o.isLate ? ' <span class="text-danger">late</span>' : ''}</td>
            <td class="${TD}">${opStatusBadge(o.status)}</td>
          </tr>`;
      });
      $('#ops').innerHTML =
        tableHTML(['Reference', 'Type', 'Contact', 'From → To', 'Products', 'Scheduled', 'Status'], rows, 'No operations match these filters.') +
        pagerHTML(res);
    } catch (err) {
      if (container.isConnected) $('#ops').innerHTML = errorHTML(err);
    }
  }

  function fillLocations() {
    const list = lookups.locations.filter((l) => !state.warehouseId || String(l.warehouseId) === state.warehouseId);
    $('#f-location').innerHTML = optionsHTML(locationOptions(list), state.locationId, 'All locations');
  }

  const reload = () => {
    state.page = 1;
    loadKpis();
    loadOps();
  };

  getLookups()
    .then((data) => {
      lookups = data;
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(data.warehouses), '', 'All warehouses');
      $('#f-category').innerHTML = optionsHTML(data.categories.map((c) => ({ value: c.id, label: c.name })), '', 'All categories');
      fillLocations();
    })
    .catch(() => {});

  $('#f-type').addEventListener('change', (e) => {
    state.type = e.target.value;
    state.page = 1;
    loadOps();
  });
  $('#f-status').addEventListener('change', (e) => {
    state.status = e.target.value;
    state.page = 1;
    loadOps();
  });
  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    state.locationId = '';
    if (lookups) fillLocations();
    reload();
  });
  $('#f-location').addEventListener('change', (e) => {
    state.locationId = e.target.value;
    reload();
  });
  $('#f-category').addEventListener('change', (e) => {
    state.categoryId = e.target.value;
    reload();
  });
  $('#f-reset').addEventListener('click', () => {
    Object.assign(state, { type: '', status: '', warehouseId: '', locationId: '', categoryId: '' });
    container.querySelectorAll('select').forEach((s) => (s.value = ''));
    if (lookups) fillLocations();
    reload();
  });

  $('#ops').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      loadOps();
      return;
    }
    const row = e.target.closest('[data-href]');
    if (row) window.location.hash = row.dataset.href;
  });

  reload();
  return onDataChanged(reload);
}
