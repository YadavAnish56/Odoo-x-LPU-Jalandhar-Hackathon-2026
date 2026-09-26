// Stock availability per location.
import { api } from '../api.js';
import { getLookups, locationOptions, onDataChanged, setNextFilter, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  debounce,
  errorHTML,
  esc,
  fmtQty,
  FILTER,
  loadingHTML,
  optionsHTML,
  pagerHTML,
  ROW,
  tableHTML,
  TD,
  toolbar,
} from '../utils.js';

export default function renderStock(container) {
  const state = { search: '', warehouseId: '', locationId: '', categoryId: '', includeZero: false, page: 1 };
  const $ = (sel) => container.querySelector(sel);
  let lookups = null;
  let items = [];

  container.innerHTML = `
    ${toolbar(
      '',
      `<input id="f-search" type="search" placeholder="Search SKU or name" class="${FILTER} w-56"/>
       <select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>
       <select id="f-location" class="${FILTER}"><option value="">All locations</option></select>
       <select id="f-category" class="${FILTER}"><option value="">All categories</option></select>
       <label class="flex items-center gap-2 text-[13px] text-secondary cursor-pointer"><input id="f-zero" type="checkbox" class="w-4 h-4 accent-primary-container"/>Empty locations</label>`,
    )}
    <section class="${CARD} overflow-hidden"><div id="list">${loadingHTML()}</div></section>`;

  async function load() {
    try {
      const res = await api.get('/stock', {
        search: state.search, warehouseId: state.warehouseId, locationId: state.locationId,
        categoryId: state.categoryId, includeZero: state.includeZero || undefined, page: state.page, limit: 25,
      });
      if (!container.isConnected) return;
      items = res.items;
      const rows = items.map(
        (s, i) => `
        <tr class="${ROW}">
          <td class="${TD}"><a href="#products/${s.productId}" class="font-medium hover:text-primary">${esc(s.productName)}</a></td>
          <td class="${TD} font-mono text-[12px]">${esc(s.sku)}</td>
          <td class="${TD} font-mono text-[12px]">${esc(s.locationCode)}</td>
          <td class="${TD}">${esc(s.warehouseName)}</td>
          <td class="${TD} text-right font-mono">${fmtQty(s.onHand)} <span class="text-secondary">${esc(s.uom)}</span></td>
          <td class="${TD} text-right font-mono text-secondary">${fmtQty(s.reserved)}</td>
          <td class="${TD} text-right font-mono ${s.freeToUse > 0 ? '' : 'text-danger'}">${fmtQty(s.freeToUse)}</td>
          <td class="${TD} text-right">${button('Adjust', { small: true, icon: 'tune', attrs: `data-adjust="${i}"` })}</td>
        </tr>`,
      );
      $('#list').innerHTML =
        tableHTML(['Product', 'SKU', 'Location', 'Warehouse', { label: 'On hand', align: 'right' }, { label: 'Reserved', align: 'right' }, { label: 'Free to use', align: 'right' }, ''], rows, 'No stock found.') +
        pagerHTML(res);
    } catch (err) {
      if (container.isConnected) $('#list').innerHTML = errorHTML(err);
    }
  }

  function fillLocations() {
    const list = lookups.locations.filter((l) => !state.warehouseId || String(l.warehouseId) === state.warehouseId);
    $('#f-location').innerHTML = optionsHTML(locationOptions(list), state.locationId, 'All locations');
  }

  getLookups()
    .then((data) => {
      lookups = data;
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(data.warehouses), '', 'All warehouses');
      $('#f-category').innerHTML = optionsHTML(data.categories.map((c) => ({ value: c.id, label: c.name })), '', 'All categories');
      fillLocations();
    })
    .catch(() => {});

  const refilter = (changes) => {
    Object.assign(state, changes, { page: 1 });
    load();
  };
  $('#f-search').addEventListener('input', debounce((e) => refilter({ search: e.target.value.trim() }), 300));
  $('#f-warehouse').addEventListener('change', (e) => {
    state.locationId = '';
    state.warehouseId = e.target.value;
    if (lookups) fillLocations();
    refilter({});
  });
  $('#f-location').addEventListener('change', (e) => refilter({ locationId: e.target.value }));
  $('#f-category').addEventListener('change', (e) => refilter({ categoryId: e.target.value }));
  $('#f-zero').addEventListener('change', (e) => refilter({ includeZero: e.target.checked }));
  $('#list').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      load();
      return;
    }
    const adjust = e.target.closest('[data-adjust]');
    if (adjust) {
      const s = items[Number(adjust.dataset.adjust)];
      setNextFilter('adjustment', { productId: s.productId, locationId: s.locationId });
      window.location.hash = '#adjustments';
    }
  });

  load();
  return onDataChanged(load);
}
