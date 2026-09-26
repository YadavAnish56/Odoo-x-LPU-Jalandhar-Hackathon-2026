// List page for receipts, delivery orders and internal transfers.
import { api } from '../api.js';
import { getLookups, onDataChanged, takeNextFilter, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  debounce,
  errorHTML,
  esc,
  FILTER,
  fmtDate,
  loadingHTML,
  OP_STATUS,
  OP_TYPE,
  optionsHTML,
  opStatusBadge,
  pagerHTML,
  ROW,
  segmented,
  tableHTML,
  TD,
  toolbar,
} from '../utils.js';

const STATUS_TABS = [['', 'All'], ['draft,waiting,ready', 'To do'], ...Object.entries(OP_STATUS).map(([k, v]) => [k, v.label])];

export default function renderOperationList(container, type) {
  const meta = OP_TYPE[type];
  const state = { status: '', search: '', warehouseId: '', categoryId: '', late: false, page: 1, ...takeNextFilter(`operations:${type}`) };
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    ${toolbar(
      button('New', { variant: 'primary', icon: 'add', attrs: 'id="new-btn"' }),
      `<input id="f-search" type="search" value="${esc(state.search)}" placeholder="Search reference, contact, SKU" class="${FILTER} w-60"/>
       <select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>
       <select id="f-category" class="${FILTER}"><option value="">All categories</option></select>
       <label class="flex items-center gap-2 text-[13px] text-secondary cursor-pointer"><input id="f-late" type="checkbox" ${state.late ? 'checked' : ''} class="w-4 h-4 accent-primary-container"/>Late</label>`,
    )}
    <div id="status-tabs" class="mb-3"></div>
    <section class="${CARD} overflow-hidden"><div id="list">${loadingHTML()}</div></section>`;

  async function load() {
    $('#status-tabs').innerHTML = segmented(STATUS_TABS, state.status, 'data-status');
    try {
      const res = await api.get('/operations', {
        type,
        status: state.status,
        search: state.search,
        warehouseId: state.warehouseId,
        categoryId: state.categoryId,
        late: state.late || undefined,
        sort: state.status === 'draft,waiting,ready' ? 'scheduled' : undefined,
        page: state.page,
        limit: 15,
      });
      if (!container.isConnected) return;

      const columns = ['Reference', ...(meta.partner ? ['Contact'] : []), 'From', 'To', 'Products', 'Scheduled', 'Status'];
      const rows = res.items.map((o) => {
        const first = o.lineItems[0];
        return `
          <tr class="${ROW} cursor-pointer" data-id="${o.id}">
            <td class="${TD} font-mono whitespace-nowrap">${esc(o.reference)}</td>
            ${meta.partner ? `<td class="${TD} whitespace-nowrap">${esc(o.partnerName || '—')}</td>` : ''}
            <td class="${TD} whitespace-nowrap ${o.sourceLocationCode ? 'font-mono text-[12px]' : 'text-secondary'}">${esc(o.sourceLocationCode || 'Vendor')}</td>
            <td class="${TD} whitespace-nowrap ${o.destLocationCode ? 'font-mono text-[12px]' : 'text-secondary'}">${esc(o.destLocationCode || 'Customer')}</td>
            <td class="${TD}">${esc(first?.productName ?? '—')}${o.lineItems.length > 1 ? ` <span class="text-secondary">+${o.lineItems.length - 1} more</span>` : ''}</td>
            <td class="${TD} whitespace-nowrap">${fmtDate(o.scheduledDate)}${o.isLate ? ' <span class="text-danger">late</span>' : ''}</td>
            <td class="${TD}">${opStatusBadge(o.status)}</td>
          </tr>`;
      });
      $('#list').innerHTML = tableHTML(columns, rows, `No ${meta.plural.toLowerCase()} found.`) + pagerHTML(res);
    } catch (err) {
      if (container.isConnected) $('#list').innerHTML = errorHTML(err);
    }
  }

  getLookups()
    .then(({ warehouses, categories }) => {
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(warehouses), state.warehouseId, 'All warehouses');
      $('#f-category').innerHTML = optionsHTML(categories.map((c) => ({ value: c.id, label: c.name })), state.categoryId, 'All categories');
    })
    .catch(() => {});

  const refilter = (changes) => {
    Object.assign(state, changes, { page: 1 });
    load();
  };
  $('#new-btn').addEventListener('click', () => (window.location.hash = `#${meta.route}/new`));
  $('#f-search').addEventListener('input', debounce((e) => refilter({ search: e.target.value.trim() }), 300));
  $('#f-warehouse').addEventListener('change', (e) => refilter({ warehouseId: e.target.value }));
  $('#f-category').addEventListener('change', (e) => refilter({ categoryId: e.target.value }));
  $('#f-late').addEventListener('change', (e) => refilter({ late: e.target.checked }));
  $('#status-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-status]');
    if (tab) refilter({ status: tab.dataset.status });
  });
  $('#list').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      load();
      return;
    }
    const row = e.target.closest('[data-id]');
    if (row) window.location.hash = `#${meta.route}/${row.dataset.id}`;
  });

  load();
  return onDataChanged(load);
}
