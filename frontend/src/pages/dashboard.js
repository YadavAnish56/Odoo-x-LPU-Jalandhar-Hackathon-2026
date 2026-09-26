import { api, fetchAll } from '../api.js';
import { openAdjustmentForm, openOperationDetail, openOperationForm } from '../components/operation-modals.js';
import { getLookups, onDataChanged, setNextFilter, warehouseOptions } from '../store.js';
import {
  downloadCSV,
  emptyHTML,
  errorHTML,
  esc,
  fmtDate,
  fmtMoney,
  fmtQty,
  loadingHTML,
  OP_STATUS,
  OP_TYPE,
  operationIcon,
  opStatusBadge,
  productIcon,
  showError,
  showModal,
  stockBadge,
} from '../utils.js';

const selectClass =
  'bg-surface-container-lowest text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 shadow-sm outline-none focus:ring-2 focus:ring-primary-container';

export default function renderDashboard(container) {
  const state = { warehouseId: '', categoryId: '', days: 30, opType: '', opStatus: '' };
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    <div class="flex flex-col w-full">
      <section class="w-full pt-4 pb-8">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div class="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
              Inventory Overview
            </div>
            <h1 class="font-display text-display text-on-surface font-semibold tracking-tight mt-4 leading-[1.08] max-w-xl">
              Know your stock.<br/>
              <span class="text-on-surface-variant font-light">Control every movement.</span>
            </h1>
            <p class="font-body-lg text-body-lg text-secondary max-w-lg mt-4 leading-relaxed">
              Track receipts, deliveries, transfers and adjustments across every warehouse from one live dashboard.
            </p>
            <div class="flex flex-wrap items-center gap-3 mt-7">
              <button id="new-op-btn" class="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-all shadow-[0_2px_8px_rgba(249,115,22,0.22)] active:scale-[0.99]" type="button">
                <span class="material-symbols-outlined text-[18px] transition-transform group-hover:rotate-90">add</span>
                <span>New Operation</span>
              </button>
              <button id="export-btn" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md transition-all shadow-sm active:scale-[0.99]" type="button">
                <span class="material-symbols-outlined text-[18px] text-secondary">file_download</span>
                <span>Export Report</span>
              </button>
            </div>
            <div id="hero-stats" class="flex flex-wrap items-center gap-x-6 gap-y-2 mt-6 pt-5 text-secondary font-label-sm text-label-sm"></div>
          </div>
          <div id="spotlight" class="lg:col-span-5 relative flex items-center justify-center p-4 lg:p-8"></div>
        </div>
      </section>

      <!-- Filters -->
      <section class="flex flex-wrap items-center gap-3 mb-4">
        <span class="font-label-sm text-label-sm text-secondary uppercase tracking-wider flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">filter_alt</span>Filters</span>
        <select id="f-warehouse" class="${selectClass}"><option value="">All warehouses</option></select>
        <select id="f-category" class="${selectClass}"><option value="">All categories</option></select>
      </section>

      <section id="kpis" class="w-full mb-10">${loadingHTML()}</section>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div class="lg:col-span-8 flex flex-col gap-8">
          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Inventory Movement</h2>
                <p class="font-body-sm text-body-sm text-secondary mt-0.5">Quantities received vs. delivered per day</p>
              </div>
              <div id="range-tabs" class="inline-flex items-center bg-surface-container-low p-1 rounded-xl font-label-md text-label-md">
                ${[7, 30, 90].map((d) => `<button data-days="${d}" class="px-3 py-1 rounded-lg transition-colors">${d} Days</button>`).join('')}
              </div>
            </div>
            <div id="chart" class="mt-4">${loadingHTML()}</div>
          </div>

          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Next Internal Transfer</h3>
                <p class="font-body-sm text-body-sm text-secondary">Stock moving between locations</p>
              </div>
              <a href="#operations" id="all-transfers" class="font-label-md text-label-md text-primary font-semibold hover:text-primary-container">All transfers</a>
            </div>
            <div id="corridor" class="mt-6">${loadingHTML()}</div>
          </div>
        </div>

        <div class="lg:col-span-4 flex flex-col gap-6">
          <div id="alerts" class="w-full bg-primary-fixed/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">${loadingHTML()}</div>

          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h4 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Quick Actions</h4>
            <p class="font-body-sm text-body-sm text-secondary mt-0.5">Common warehouse tasks</p>
            <div class="mt-5 flex flex-col gap-2.5">
              ${quickAction('scan', 'barcode_scanner', 'Scan Barcode / SKU', 'Find a product by its code')}
              ${quickAction('transfer', 'sync_alt', 'Internal Transfer Order', 'Move stock between locations')}
              ${quickAction('count', 'checklist', 'Launch Cycle Count', 'Record a physical count')}
            </div>
          </div>

          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Stock by Warehouse</h4>
              <span id="hub-count" class="font-label-sm text-label-sm text-secondary"></span>
            </div>
            <div id="hubs" class="space-y-4">${loadingHTML()}</div>
          </div>
        </div>
      </div>

      <section class="w-full mt-8">
        <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5">
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Recent Operations</h3>
              <p class="font-body-sm text-body-sm text-secondary mt-0.5">Filter by document type and status</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <div id="type-chips" class="flex flex-wrap items-center gap-1 bg-surface-container-low p-1 rounded-xl">
                ${[['', 'All'], ...Object.entries(OP_TYPE).map(([k, v]) => [k, v.plural])].map(([k, label]) => `<button data-type="${k}" class="px-3 py-1 rounded-lg font-label-md text-label-md transition-colors">${label}</button>`).join('')}
              </div>
              <select id="f-status" class="${selectClass}">
                <option value="">All statuses</option>
                ${Object.entries(OP_STATUS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
              </select>
              <a href="#ledger" class="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors ml-2">
                View full ledger<span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>
          <div id="ops">${loadingHTML()}</div>
        </div>
      </section>
    </div>
  `;

  const filters = () => ({ warehouseId: state.warehouseId, categoryId: state.categoryId });

  // ---------------------------------------------------------------- summary
  async function loadSummary() {
    try {
      const data = await api.get('/dashboard', filters());
      if (!container.isConnected) return;
      const k = data.kpis;
      $('#kpis').innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4">
          <div class="col-span-2 md:col-span-3 xl:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-on-background via-inverse-surface to-[#222121] text-surface p-6 shadow-md flex flex-col justify-between min-h-[170px] group">
            <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-primary-container/25 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            <div class="relative z-10">
              <div class="font-label-sm text-label-sm tracking-wider uppercase text-surface-variant font-medium">Products in Stock</div>
              <div class="font-metric-val text-metric-val text-surface font-semibold tracking-tight mt-1.5">${fmtQty(k.productsInStock)} <span class="font-headline-sm text-surface-variant font-normal">of ${fmtQty(k.totalProducts)}</span></div>
            </div>
            <div class="relative z-10 pt-4 flex items-center justify-between gap-2">
              <div class="font-headline-sm text-headline-sm text-inverse-on-surface font-medium tracking-tight">${fmtMoney(k.stockValue)} <span class="text-surface-variant font-body-sm text-body-sm font-normal">· ${fmtQty(k.totalQuantity)} units</span></div>
              <div class="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_12px_#f97316]"></div>
            </div>
          </div>
          ${kpiCard('low', 'Low Stock', k.lowStock, 'items', 'At or below reorder level', 'warning', 'primary-fixed', 'primary')}
          ${kpiCard('out', 'Out of Stock', k.outOfStock, 'items', 'Nothing on hand', 'block', 'error-container', 'error')}
          ${kpiCard('receipt', 'Pending Receipts', k.pendingReceipts, '', k.lateReceipts ? `${k.lateReceipts} late` : 'Incoming goods', 'move_to_inbox', 'surface-container', 'on-surface', k.lateReceipts > 0)}
          ${kpiCard('delivery', 'Pending Deliveries', k.pendingDeliveries, '', k.waitingDeliveries ? `${k.waitingDeliveries} waiting for stock` : 'Outgoing goods', 'local_shipping', 'surface-container', 'on-surface', k.waitingDeliveries > 0)}
          ${kpiCard('internal', 'Transfers Scheduled', k.scheduledTransfers, '', k.lateTransfers ? `${k.lateTransfers} late` : 'Internal moves', 'sync_alt', 'surface-container', 'on-surface', k.lateTransfers > 0)}
        </div>`;
      $('#kpis').querySelectorAll('[data-kpi]').forEach((card) => card.addEventListener('click', () => openKpi(card.dataset.kpi)));

      renderHeroStats(k);
      renderSpotlight(data.lowStockAlerts, data.recentMoves, k);
      renderAlerts(data.lowStockAlerts);
    } catch (err) {
      if (container.isConnected) $('#kpis').innerHTML = errorHTML(err);
    }
  }

  function openKpi(kind) {
    if (kind === 'low' || kind === 'out') {
      setNextFilter('products', { stockStatus: kind });
      window.location.hash = '#products';
    } else {
      setNextFilter('operations', { tab: { receipt: 'receipts', delivery: 'deliveries', internal: 'transfers' }[kind], status: 'draft,waiting,ready' });
      window.location.hash = '#operations';
    }
  }

  function renderHeroStats(k) {
    $('#hero-stats').innerHTML = `
      <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Live data</span>
      <span class="text-surface-variant">•</span>
      <span>${fmtQty(k.totalProducts)} products tracked</span>
      <span class="text-surface-variant">•</span>
      <span id="hero-hubs">— warehouses</span>`;
    loadHubs();
  }

  function renderSpotlight(alerts, moves, k) {
    const chip = (move, cls, icon, position) =>
      move
        ? `<div class="absolute ${position} z-20 flex items-center gap-2 ${cls} px-3.5 py-2 rounded-xl shadow-lg font-label-sm text-label-sm">
            <span class="material-symbols-outlined text-[14px]">${icon}</span>
            <span class="font-semibold">${move.moveType === 'delivery' ? '-' : move.moveType === 'receipt' ? '+' : ''}${fmtQty(move.quantity)}</span> ${esc(move.productName)}
          </div>`
        : '';
    const inMove = moves.find((m) => m.moveType === 'receipt');
    const outMove = moves.find((m) => m.moveType === 'delivery');
    const intMove = moves.find((m) => m.moveType === 'internal');
    const a = alerts[0];

    const card = a
      ? `<div class="flex items-start justify-between">
          <div>
            <span class="font-label-sm text-label-sm font-mono tracking-wider text-secondary uppercase">SKU: ${esc(a.sku)}</span>
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">${esc(a.productName)}</h3>
          </div>
          ${stockBadge(a.status)}
        </div>
        <div class="mt-6 flex items-baseline justify-between">
          <div>
            <div class="font-metric-val text-metric-val text-on-surface font-semibold tracking-tight">${fmtQty(a.onHand)} <span class="text-headline-sm text-secondary font-normal">${esc(a.uom)}</span></div>
            <p class="font-body-sm text-body-sm text-secondary mt-0.5">On hand • ${esc(a.warehouseName)}</p>
          </div>
          <span class="material-symbols-outlined text-[40px] text-primary-container">${productIcon(a)}</span>
        </div>
        <div class="mt-5 w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
          <div class="bg-primary-container h-full rounded-full" style="width:${Math.min(100, (a.onHand / (a.maxQty || 1)) * 100)}%"></div>
        </div>
        <div class="mt-2 flex items-center justify-between text-secondary font-label-sm text-label-sm">
          <span>Reorder at: ${fmtQty(a.minQty)} ${esc(a.uom)}</span><span>Max: ${fmtQty(a.maxQty)} ${esc(a.uom)}</span>
        </div>`
      : `<div class="flex items-start justify-between">
          <div>
            <span class="font-label-sm text-label-sm font-mono tracking-wider text-secondary uppercase">Stock health</span>
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">All products above reorder level</h3>
          </div>
          ${stockBadge('in')}
        </div>
        <div class="mt-6 font-metric-val text-metric-val text-on-surface font-semibold tracking-tight">${fmtQty(k.totalQuantity)} <span class="text-headline-sm text-secondary font-normal">units</span></div>
        <p class="font-body-sm text-body-sm text-secondary mt-0.5">Across ${fmtQty(k.productsInStock)} products in stock</p>`;

    $('#spotlight').innerHTML = `
      <div class="absolute inset-0 bg-gradient-to-tr from-primary-container/10 via-primary-fixed/20 to-transparent blur-3xl -z-10 rounded-full scale-90"></div>
      <div class="relative w-full max-w-md">
        ${chip(inMove, 'bg-surface-container-lowest text-emerald-700', 'south_west', '-top-4 -right-3 animate-bounce [animation-duration:3.8s]')}
        <div class="relative z-10 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ${a ? 'cursor-pointer hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]' : ''} transition-all" ${a ? `data-product="${a.productId}"` : ''}>${card}</div>
        ${chip(outMove, 'bg-surface-container-lowest text-error', 'north_east', '-bottom-4 -left-4')}
        ${chip(intMove, 'bg-primary-fixed text-primary', 'sync_alt', '-bottom-6 right-2')}
      </div>`;
    $('#spotlight [data-product]')?.addEventListener('click', (e) => {
      window.location.hash = `#product-detail-${e.currentTarget.dataset.product}`;
    });
  }

  function renderAlerts(alerts) {
    const top = alerts.slice(0, 3);
    $('#alerts').innerHTML = `
      <div class="flex items-center justify-between">
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${alerts.length ? 'bg-primary-container text-on-primary' : 'bg-emerald-600 text-white'} font-label-sm text-label-sm font-semibold uppercase tracking-wider">
          <span class="material-symbols-outlined text-[13px]">${alerts.length ? 'notification_important' : 'check_circle'}</span>${alerts.length ? 'Reorder Needed' : 'Stock Healthy'}
        </span>
        <span class="font-label-sm text-label-sm font-mono text-primary font-semibold">${alerts.length} alert${alerts.length === 1 ? '' : 's'}</span>
      </div>
      ${top.length ? top.map((a) => `
        <div class="mt-3 bg-surface-container-lowest rounded-xl p-4 shadow-sm">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0"><span class="font-label-sm text-label-sm font-mono text-secondary">${esc(a.sku)}</span><h4 class="font-body-md text-body-md text-on-surface font-semibold truncate">${esc(a.productName)}</h4></div>
            ${stockBadge(a.status)}
          </div>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div><div class="font-headline-sm text-headline-sm text-primary font-semibold">${fmtQty(a.onHand)} ${esc(a.uom)}</div><div class="font-body-sm text-body-sm text-secondary">Min: ${fmtQty(a.minQty)} · ${esc(a.warehouseCode)}</div></div>
            <button data-reorder="${a.id}" class="px-3 py-1.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm">Reorder ${fmtQty(a.suggestedQty)}</button>
          </div>
        </div>`).join('') : `<p class="mt-4 font-body-sm text-body-sm text-secondary">Every product with a reordering rule is above its minimum.</p>`}`;
    $('#alerts').querySelectorAll('[data-reorder]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const a = alerts.find((x) => String(x.id) === btn.dataset.reorder);
        const { locations } = await getLookups();
        openOperationForm('receipt', {
          destLocationId: locations.find((l) => l.warehouseId === a.warehouseId)?.id,
          lines: [{ productId: a.productId, quantity: a.suggestedQty }],
        });
      });
    });
  }

  async function loadHubs() {
    try {
      const warehouses = await api.get('/warehouses');
      if (!container.isConnected) return;
      const total = warehouses.reduce((s, w) => s + w.totalQuantity, 0) || 1;
      $('#hub-count').textContent = `Total: ${warehouses.length} site${warehouses.length === 1 ? '' : 's'}`;
      const heroHubs = $('#hero-hubs');
      if (heroHubs) heroHubs.textContent = `${warehouses.length} warehouse${warehouses.length === 1 ? '' : 's'} connected`;
      $('#hubs').innerHTML = warehouses.length
        ? warehouses.map((w) => {
            const pct = Math.round((w.totalQuantity / total) * 100);
            return `<div>
              <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="font-medium text-on-surface">${esc(w.name)}</span><span class="text-secondary font-mono">${fmtQty(w.totalQuantity)} · ${pct}%</span></div>
              <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden"><div class="bg-primary-container h-full rounded-full" style="width:${pct}%"></div></div>
            </div>`;
          }).join('')
        : emptyHTML('No warehouses yet', 'warehouse');
    } catch (err) {
      if (container.isConnected) $('#hubs').innerHTML = errorHTML(err);
    }
  }

  // ------------------------------------------------------------------ chart
  async function loadChart() {
    container.querySelectorAll('[data-days]').forEach((b) => {
      const active = Number(b.dataset.days) === state.days;
      b.className = `px-3 py-1 rounded-lg transition-colors ${active ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm' : 'text-secondary hover:text-on-surface'}`;
    });
    try {
      const series = await api.get('/dashboard/movement', { days: state.days, warehouseId: state.warehouseId });
      if (container.isConnected) $('#chart').innerHTML = chartHTML(series);
    } catch (err) {
      if (container.isConnected) $('#chart').innerHTML = errorHTML(err);
    }
  }

  // --------------------------------------------------------------- corridor
  async function loadCorridor() {
    try {
      const res = await api.get('/operations', {
        type: 'internal', status: 'draft,waiting,ready', warehouseId: state.warehouseId, sort: 'scheduled', limit: 1,
      });
      if (!container.isConnected) return;
      const t = res.items[0];
      if (!t) {
        $('#corridor').innerHTML = emptyHTML('No internal transfers scheduled', 'sync_alt');
        return;
      }
      const first = t.lineItems[0];
      const node = (label, icon, code, name) => `
        <div class="w-full md:w-56 bg-surface-container-lowest rounded-xl p-4 shadow-sm relative z-10">
          <div class="flex items-center justify-between"><span class="font-label-sm text-label-sm font-semibold text-secondary uppercase">${label}</span><span class="material-symbols-outlined text-[16px] text-secondary">${icon}</span></div>
          <div class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1 truncate">${esc(name)}</div>
          <div class="font-mono font-label-sm text-label-sm text-secondary mt-1">${esc(code)}</div>
        </div>`;
      $('#corridor').innerHTML = `
        <div class="p-6 rounded-2xl bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-6 cursor-pointer hover:bg-surface-container transition-colors" data-op="${t.id}">
          ${node('From', 'warehouse', t.sourceLocationCode, t.sourceLocationName)}
          <div class="flex-1 flex flex-col items-center justify-center relative w-full my-2 md:my-0">
            <div class="w-full h-0.5 border-t-2 border-dashed border-outline-variant relative">
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span class="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-md flex items-center gap-1.5 whitespace-nowrap"><span class="material-symbols-outlined text-[14px]">arrow_forward</span>${fmtQty(first?.quantity)} ${esc(first?.uom ?? '')} ${esc(first?.productName ?? '')}${t.lineItems.length > 1 ? ` +${t.lineItems.length - 1}` : ''}</span>
              </div>
            </div>
            <span class="text-secondary font-label-sm text-label-sm mt-5 flex items-center gap-2">${esc(t.reference)} • ${fmtDate(t.scheduledDate)} ${opStatusBadge(t.status)}</span>
          </div>
          ${node('To', 'precision_manufacturing', t.destLocationCode, t.destLocationName)}
        </div>`;
      $('#corridor [data-op]').addEventListener('click', () => openOperationDetail(t.id));
    } catch (err) {
      if (container.isConnected) $('#corridor').innerHTML = errorHTML(err);
    }
  }

  // ------------------------------------------------------ recent operations
  async function loadOps() {
    container.querySelectorAll('[data-type]').forEach((b) => {
      const active = b.dataset.type === state.opType;
      b.className = `px-3 py-1 rounded-lg font-label-md text-label-md transition-colors ${active ? 'bg-surface-container-lowest text-on-surface font-semibold shadow-sm' : 'text-secondary hover:text-on-surface'}`;
    });
    try {
      const res = await api.get('/operations', { ...filters(), type: state.opType, status: state.opStatus, limit: 8 });
      if (!container.isConnected) return;
      $('#ops').innerHTML = res.items.length
        ? `<div class="w-full overflow-x-auto"><table class="w-full text-left border-collapse">
            <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <th class="py-3 px-4 rounded-l-xl">Reference</th><th class="py-3 px-4">Operation</th><th class="py-3 px-4">Item</th>
              <th class="py-3 px-4 text-right">Quantity</th><th class="py-3 px-4">Location</th><th class="py-3 px-4">Status</th><th class="py-3 px-4 rounded-r-xl text-right">Scheduled</th>
            </tr></thead>
            <tbody class="font-body-sm text-body-sm text-on-surface">${res.items.map(opRow).join('')}</tbody>
          </table></div>
          <div class="pt-3 font-body-sm text-body-sm text-secondary">Showing ${res.items.length} of ${res.total}</div>`
        : emptyHTML('No operations match these filters', 'receipt_long');
      $('#ops').querySelectorAll('[data-op]').forEach((row) => row.addEventListener('click', () => openOperationDetail(Number(row.dataset.op))));
    } catch (err) {
      if (container.isConnected) $('#ops').innerHTML = errorHTML(err);
    }
  }

  function loadAll() {
    loadSummary();
    loadChart();
    loadCorridor();
    loadOps();
  }

  // --------------------------------------------------------------- wiring
  getLookups()
    .then(({ warehouses, categories }) => {
      $('#f-warehouse').insertAdjacentHTML('beforeend', warehouseOptions(warehouses).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''));
      $('#f-category').insertAdjacentHTML('beforeend', categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join(''));
    })
    .catch(() => {});

  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    loadAll();
  });
  $('#f-category').addEventListener('change', (e) => {
    state.categoryId = e.target.value;
    loadSummary();
    loadOps();
  });
  $('#f-status').addEventListener('change', (e) => {
    state.opStatus = e.target.value;
    loadOps();
  });
  container.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
    state.opType = b.dataset.type;
    loadOps();
  }));
  container.querySelectorAll('[data-days]').forEach((b) => b.addEventListener('click', () => {
    state.days = Number(b.dataset.days);
    loadChart();
  }));
  $('#all-transfers').addEventListener('click', () => setNextFilter('operations', { tab: 'transfers' }));

  $('#new-op-btn').addEventListener('click', chooseOperation);
  $('#export-btn').addEventListener('click', exportReport);
  container.querySelector('[data-quick="scan"]').addEventListener('click', scanSku);
  container.querySelector('[data-quick="transfer"]').addEventListener('click', () => openOperationForm('internal'));
  container.querySelector('[data-quick="count"]').addEventListener('click', () => openAdjustmentForm());

  loadAll();
  return onDataChanged(loadAll);
}

// ---------------------------------------------------------------------------
function kpiCard(key, title, value, unit, subtitle, icon, iconBg, iconColor, highlight = false) {
  return `
    <button type="button" data-kpi="${key}" class="text-left rounded-2xl bg-surface-container-lowest p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
      <div class="flex items-center justify-between gap-2">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-medium">${title}</span>
        <span class="p-1 rounded-lg bg-${iconBg} text-${iconColor}"><span class="material-symbols-outlined text-[16px]">${icon}</span></span>
      </div>
      <div class="mt-3">
        <div class="font-metric-val text-metric-val ${key === 'low' && value ? 'text-primary-container' : key === 'out' && value ? 'text-error' : 'text-on-surface'} font-semibold tracking-tight">${fmtQty(value)} ${unit ? `<span class="text-body-md text-secondary font-normal">${value === 1 ? unit.replace(/s$/, '') : unit}</span>` : ''}</div>
        <p class="font-body-sm text-body-sm ${highlight ? 'text-error font-medium' : 'text-secondary'} mt-0.5">${esc(subtitle)}</p>
      </div>
    </button>`;
}

function quickAction(key, icon, title, subtitle) {
  return `
    <button data-quick="${key}" class="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group text-left" type="button">
      <div class="flex items-center gap-3">
        <span class="p-2 rounded-lg bg-surface-container-lowest text-primary-container shadow-sm group-hover:scale-105 transition-transform"><span class="material-symbols-outlined text-[20px]">${icon}</span></span>
        <div><div class="font-body-md text-body-md text-on-surface font-medium">${title}</div><div class="font-label-sm text-label-sm text-secondary">${subtitle}</div></div>
      </div>
      <span class="material-symbols-outlined text-secondary group-hover:translate-x-1 transition-transform">chevron_right</span>
    </button>`;
}

function opRow(o) {
  const first = o.lineItems[0];
  const sign = o.type === 'receipt' ? '+' : o.type === 'delivery' ? '-' : '';
  const color = o.type === 'receipt' ? 'text-emerald-600' : o.type === 'delivery' ? 'text-error' : 'text-on-surface';
  return `
    <tr class="hover:bg-surface-container-low/70 transition-colors cursor-pointer" data-op="${o.id}">
      <td class="py-3.5 px-4 font-mono font-semibold text-on-surface whitespace-nowrap">${esc(o.reference)}</td>
      <td class="py-3.5 px-4">${operationIcon(o.type)}</td>
      <td class="py-3.5 px-4 font-medium">${esc(first?.productName ?? '—')}${o.lineItems.length > 1 ? ` <span class="text-secondary font-normal">+${o.lineItems.length - 1} more</span>` : ''}</td>
      <td class="py-3.5 px-4 text-right font-mono font-semibold ${color} whitespace-nowrap">${o.type === 'adjustment' ? '' : sign}${fmtQty(o.totalQuantity)}</td>
      <td class="py-3.5 px-4 text-secondary whitespace-nowrap">${esc(o.type === 'receipt' ? o.destLocationCode : o.sourceLocationCode)}${o.type === 'internal' ? ` → ${esc(o.destLocationCode)}` : ''}</td>
      <td class="py-3.5 px-4">${opStatusBadge(o.status)}${o.isLate ? ' <span class="text-error font-label-sm text-label-sm font-semibold">Late</span>' : ''}</td>
      <td class="py-3.5 px-4 text-right text-secondary font-mono whitespace-nowrap">${fmtDate(o.scheduledDate)}</td>
    </tr>`;
}

function chartHTML(series) {
  const totalIn = series.reduce((s, d) => s + d.inbound, 0);
  const totalOut = series.reduce((s, d) => s + d.outbound, 0);
  if (!totalIn && !totalOut) return emptyHTML('No stock movements in this period', 'show_chart');

  const W = 680;
  const top = 15;
  const bottom = 195;
  const max = Math.max(1, ...series.flatMap((d) => [d.inbound, d.outbound]));
  const x = (i) => (series.length === 1 ? W / 2 : (i / (series.length - 1)) * W);
  const y = (v) => bottom - (v / max) * (bottom - top);
  const line = (key) => series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const peak = series.reduce((best, d, i) => (d.inbound > series[best].inbound ? i : best), 0);
  const labelEvery = Math.max(1, Math.ceil(series.length / 6));
  const dayLabel = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

  const points = series
    .map((d, i) => `<circle cx="${x(i)}" cy="${y(Math.max(d.inbound, d.outbound))}" r="10" fill="transparent"><title>${dayLabel(d.date)} — received ${fmtQty(d.inbound)}, delivered ${fmtQty(d.outbound)}, moved ${fmtQty(d.internal)}</title></circle>`)
    .join('');

  return `
    <div class="flex flex-wrap items-center justify-between gap-4 pt-3">
      <div class="flex items-center gap-5 font-label-sm text-label-sm">
        <span class="flex items-center gap-2 text-on-surface"><span class="w-3 h-1 bg-on-background rounded-full"></span>Received (${fmtQty(totalIn)})</span>
        <span class="flex items-center gap-2 text-on-surface"><span class="w-3 h-1 bg-primary-container rounded-full"></span>Delivered (${fmtQty(totalOut)})</span>
      </div>
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
        <span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Peak intake: <span class="font-semibold text-primary">+${fmtQty(series[peak].inbound)}</span> (${dayLabel(series[peak].date)})
      </div>
    </div>
    <div class="relative w-full h-64 mt-4 select-none">
      <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 ${W} 200">
        <defs><linearGradient id="orangeGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f97316" stop-opacity="0.18"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></linearGradient></defs>
        ${[30, 85, 140].map((yy) => `<line stroke="#efeded" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="${W}" y1="${yy}" y2="${yy}"/>`).join('')}
        <line stroke="#efeded" stroke-width="1" x1="0" x2="${W}" y1="195" y2="195"/>
        <path d="${line('outbound')} L${W},${bottom} L0,${bottom} Z" fill="url(#orangeGrad)"/>
        <path d="${line('inbound')}" fill="none" stroke="#1b1c1c" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
        <path d="${line('outbound')}" fill="none" stroke="#f97316" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
        ${points}
      </svg>
    </div>
    <div class="flex items-center justify-between text-secondary font-label-sm text-label-sm mt-3 pt-2">
      ${series.filter((_, i) => i % labelEvery === 0 || i === series.length - 1).map((d, i, arr) => `<span>${i === arr.length - 1 ? 'Today' : dayLabel(d.date)}</span>`).join('')}
    </div>`;
}

function chooseOperation() {
  const option = (type, icon, title, text) => `
    <button data-choose="${type}" class="flex items-center gap-3 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container text-left transition-colors">
      <span class="p-2 rounded-lg bg-surface-container-lowest text-primary-container shadow-sm"><span class="material-symbols-outlined">${icon}</span></span>
      <div><div class="font-body-md text-body-md text-on-surface font-semibold">${title}</div><div class="font-label-sm text-label-sm text-secondary">${text}</div></div>
    </button>`;
  const overlay = showModal('New Operation', `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      ${option('receipt', 'move_to_inbox', 'Receipt', 'Goods arriving from a vendor')}
      ${option('delivery', 'local_shipping', 'Delivery Order', 'Goods leaving to a customer')}
      ${option('internal', 'sync_alt', 'Internal Transfer', 'Move stock between locations')}
      ${option('adjustment', 'tune', 'Stock Adjustment', 'Fix counted vs recorded stock')}
    </div>`);
  overlay.querySelectorAll('[data-choose]').forEach((btn) => btn.addEventListener('click', () => {
    overlay.remove();
    if (btn.dataset.choose === 'adjustment') openAdjustmentForm();
    else openOperationForm(btn.dataset.choose);
  }));
}

async function exportReport() {
  try {
    const products = await fetchAll('/products');
    downloadCSV(`stocksense-stock-${new Date().toISOString().slice(0, 10)}.csv`, [
      ['SKU', 'Product', 'Category', 'Unit', 'On hand', 'Reserved', 'Free to use', 'Reorder min', 'Status', 'Cost', 'Stock value'],
      ...products.map((p) => [p.sku, p.name, p.categoryName ?? '', p.uom, p.onHand, p.reserved, p.freeToUse, p.reorderMinQty ?? '', p.stockStatus, p.costPrice, p.stockValue]),
    ]);
  } catch (err) {
    showError(err);
  }
}

function scanSku() {
  const overlay = showModal('Scan Barcode / SKU', `
    <form class="flex flex-col gap-3" id="scan-form">
      <p class="font-body-sm text-body-sm text-secondary">Scan the barcode with a USB scanner or type the SKU, then press Enter.</p>
      <input name="sku" autofocus placeholder="e.g. STL-ROD-01" class="w-full bg-surface-container-low text-on-surface font-mono text-body-md rounded-xl px-space-md py-3 outline-none focus:ring-2 focus:ring-primary-container uppercase"/>
      <button type="submit" class="py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl">Find Product</button>
    </form>`);
  const form = overlay.querySelector('#scan-form');
  setTimeout(() => form.sku.focus(), 50);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const sku = form.sku.value.trim();
    if (!sku) return;
    try {
      const product = await api.get(`/products/sku/${encodeURIComponent(sku)}`);
      overlay.remove();
      window.location.hash = `#product-detail-${product.id}`;
    } catch (err) {
      showError(err);
      form.sku.select();
    }
  });
}
