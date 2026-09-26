// Products list with SKU search and smart filters.
import { api, isManager } from '../api.js';
import { getLookups, onDataChanged, takeNextFilter, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  debounce,
  errorHTML,
  esc,
  FILTER,
  fmtQty,
  loadingHTML,
  optionsHTML,
  pagerHTML,
  ROW,
  STOCK_STATUS,
  stockBadge,
  tableHTML,
  TD,
  toolbar,
} from '../utils.js';

export default function renderProducts(container) {
  const state = { search: '', categoryId: '', stockStatus: '', warehouseId: '', page: 1, ...takeNextFilter('products') };
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    ${toolbar(
      isManager() ? button('New', { variant: 'primary', icon: 'add', attrs: 'id="new-btn"' }) : '',
      `<input id="f-search" type="search" value="${esc(state.search)}" placeholder="Search SKU or name" class="${FILTER} w-56"/>
       <select id="f-category" class="${FILTER}"><option value="">All categories</option></select>
       <select id="f-status" class="${FILTER}">${optionsHTML(Object.entries(STOCK_STATUS).map(([k, v]) => ({ value: k, label: v.label })), state.stockStatus, 'All stock levels')}</select>
       <select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>`,
    )}
    <section class="${CARD} overflow-hidden"><div id="list">${loadingHTML()}</div></section>`;

  async function load() {
    try {
      const res = await api.get('/products', {
        search: state.search, categoryId: state.categoryId, stockStatus: state.stockStatus,
        warehouseId: state.warehouseId, page: state.page, limit: 20,
      });
      if (!container.isConnected) return;
      const rows = res.items.map(
        (p) => `
        <tr class="${ROW} cursor-pointer" data-id="${p.id}">
          <td class="${TD} font-medium">${esc(p.name)}</td>
          <td class="${TD} font-mono text-[12px]">${esc(p.sku)}</td>
          <td class="${TD}">${esc(p.categoryName ?? '—')}</td>
          <td class="${TD}">${esc(p.uom)}</td>
          <td class="${TD} text-right font-mono">${fmtQty(p.onHand)}</td>
          <td class="${TD} text-right font-mono">${fmtQty(p.freeToUse)}</td>
          <td class="${TD} text-right font-mono text-secondary">${p.reorderMinQty !== null ? fmtQty(p.reorderMinQty) : '—'}</td>
          <td class="${TD}">${stockBadge(p.stockStatus)}</td>
        </tr>`,
      );
      $('#list').innerHTML =
        tableHTML(['Product', 'SKU', 'Category', 'Unit', { label: 'On hand', align: 'right' }, { label: 'Free to use', align: 'right' }, { label: 'Reorder at', align: 'right' }, 'Status'], rows, 'No products match these filters.') +
        pagerHTML(res);
    } catch (err) {
      if (container.isConnected) $('#list').innerHTML = errorHTML(err);
    }
  }

  getLookups()
    .then(({ categories, warehouses }) => {
      $('#f-category').innerHTML = optionsHTML(categories.map((c) => ({ value: c.id, label: c.name })), state.categoryId, 'All categories');
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(warehouses), state.warehouseId, 'All warehouses');
    })
    .catch(() => {});

  const refilter = (changes) => {
    Object.assign(state, changes, { page: 1 });
    load();
  };
  $('#new-btn')?.addEventListener('click', () => (window.location.hash = '#products/new'));
  $('#f-search').addEventListener('input', debounce((e) => refilter({ search: e.target.value.trim() }), 300));
  $('#f-category').addEventListener('change', (e) => refilter({ categoryId: e.target.value }));
  $('#f-status').addEventListener('change', (e) => refilter({ stockStatus: e.target.value }));
  $('#f-warehouse').addEventListener('change', (e) => refilter({ warehouseId: e.target.value }));
  $('#list').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      load();
      return;
    }
    const row = e.target.closest('[data-id]');
    if (row) window.location.hash = `#products/${row.dataset.id}`;
  });

  load();
  return onDataChanged(load);
}
