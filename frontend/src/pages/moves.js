// Move history and stock ledger (every stock change is logged).
import { api } from '../api.js';
import { getLookups, onDataChanged, takeNextFilter, warehouseOptions } from '../store.js';
import {
  CARD,
  debounce,
  errorHTML,
  esc,
  fmtDateTime,
  fmtQty,
  FILTER,
  loadingHTML,
  OP_TYPE,
  optionsHTML,
  pagerHTML,
  ROW,
  segmented,
  tableHTML,
  TD,
  toolbar,
} from '../utils.js';

const partyLabel = (m, side) => {
  const code = side === 'from' ? m.fromLocationCode : m.toLocationCode;
  if (code) return `<span class="font-mono text-[12px]">${esc(code)}</span>`;
  if (m.moveType === 'adjustment') return '<span class="text-secondary">Inventory adjustment</span>';
  return `<span class="text-secondary">${esc(m.partnerName || (side === 'from' ? 'Vendor' : 'Customer'))}</span>`;
};

export default function renderMoves(container) {
  const state = { view: 'moves', search: '', type: '', warehouseId: '', dateFrom: '', dateTo: '', page: 1, ...takeNextFilter('moves') };
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    ${toolbar(
      '<div id="tabs"></div>',
      `<input id="f-search" type="search" value="${esc(state.search)}" placeholder="Search reference or SKU" class="${FILTER} w-52"/>
       <select id="f-type" class="${FILTER}">${optionsHTML(Object.entries(OP_TYPE).map(([k, v]) => ({ value: k, label: v.plural })), '', 'All operations')}</select>
       <select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>
       <label class="flex items-center gap-1.5 text-[13px] text-secondary">From <input id="f-from" type="date" class="${FILTER}"/></label>
       <label class="flex items-center gap-1.5 text-[13px] text-secondary">To <input id="f-to" type="date" class="${FILTER}"/></label>`,
    )}
    <section class="${CARD} overflow-hidden"><div id="list">${loadingHTML()}</div></section>`;

  function renderTabs() {
    $('#tabs').innerHTML = segmented([['moves', 'Moves'], ['ledger', 'Stock ledger']], state.view, 'data-view');
  }

  async function load() {
    renderTabs();
    const params = { search: state.search, type: state.type, warehouseId: state.warehouseId, dateFrom: state.dateFrom, dateTo: state.dateTo, page: state.page, limit: 25 };
    try {
      if (state.view === 'moves') {
        const res = await api.get('/moves', params);
        if (!container.isConnected) return;
        const rows = res.items.map((m) => {
          const sign = m.direction === 'in' ? '+' : m.direction === 'out' ? '-' : '';
          const color = m.direction === 'in' ? 'text-success' : m.direction === 'out' ? 'text-danger' : '';
          return `
            <tr class="${ROW} cursor-pointer" data-href="#${OP_TYPE[m.moveType].route}/${m.operationId}">
              <td class="${TD} whitespace-nowrap">${fmtDateTime(m.createdAt)}</td>
              <td class="${TD} font-mono whitespace-nowrap">${esc(m.reference)}</td>
              <td class="${TD}"><div class="font-medium">${esc(m.productName)}</div><div class="text-[12px] text-secondary font-mono">${esc(m.sku)}</div></td>
              <td class="${TD} whitespace-nowrap">${partyLabel(m, 'from')}</td>
              <td class="${TD} whitespace-nowrap">${partyLabel(m, 'to')}</td>
              <td class="${TD} text-right font-mono whitespace-nowrap ${color}">${sign}${fmtQty(m.quantity)} <span class="text-secondary">${esc(m.uom)}</span></td>
              <td class="${TD} whitespace-nowrap">${esc(m.createdByName ?? '—')}</td>
            </tr>`;
        });
        $('#list').innerHTML = tableHTML(['Date', 'Reference', 'Product', 'From', 'To', { label: 'Quantity', align: 'right' }, 'Done by'], rows, 'No stock moves found.') + pagerHTML(res);
      } else {
        const res = await api.get('/moves/ledger', params);
        if (!container.isConnected) return;
        const rows = res.items.map((l) => {
          const operation = l.moveType === 'internal' ? (l.quantityOut > 0 ? 'Transfer out' : 'Transfer in') : OP_TYPE[l.moveType].label;
          return `
            <tr class="${ROW} cursor-pointer" data-href="#${OP_TYPE[l.moveType].route}/${l.operationId}">
              <td class="${TD} whitespace-nowrap">${fmtDateTime(l.createdAt)}</td>
              <td class="${TD} font-mono whitespace-nowrap">${esc(l.reference)}</td>
              <td class="${TD}">${esc(operation)}</td>
              <td class="${TD} font-medium">${esc(l.productName)}</td>
              <td class="${TD} font-mono text-[12px]">${esc(l.locationCode)}</td>
              <td class="${TD} text-right font-mono ${l.quantityIn ? 'text-success' : 'text-secondary'}">${l.quantityIn ? `+${fmtQty(l.quantityIn)}` : '—'}</td>
              <td class="${TD} text-right font-mono ${l.quantityOut ? 'text-danger' : 'text-secondary'}">${l.quantityOut ? `-${fmtQty(l.quantityOut)}` : '—'}</td>
              <td class="${TD} text-right font-mono whitespace-nowrap">${fmtQty(l.balance)} <span class="text-secondary">${esc(l.uom)}</span></td>
            </tr>`;
        });
        $('#list').innerHTML = tableHTML(['Date', 'Reference', 'Operation', 'Product', 'Location', { label: 'In', align: 'right' }, { label: 'Out', align: 'right' }, { label: 'Balance', align: 'right' }], rows, 'No stock moves found.') + pagerHTML(res);
      }
    } catch (err) {
      if (container.isConnected) $('#list').innerHTML = errorHTML(err);
    }
  }

  getLookups()
    .then(({ warehouses }) => {
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(warehouses), '', 'All warehouses');
    })
    .catch(() => {});

  const refilter = (changes) => {
    Object.assign(state, changes, { page: 1 });
    load();
  };
  $('#tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('[data-view]');
    if (tab) refilter({ view: tab.dataset.view });
  });
  $('#f-search').addEventListener('input', debounce((e) => refilter({ search: e.target.value.trim() }), 300));
  $('#f-type').addEventListener('change', (e) => refilter({ type: e.target.value }));
  $('#f-warehouse').addEventListener('change', (e) => refilter({ warehouseId: e.target.value }));
  $('#f-from').addEventListener('change', (e) => refilter({ dateFrom: e.target.value }));
  $('#f-to').addEventListener('change', (e) => refilter({ dateTo: e.target.value }));
  $('#list').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      load();
      return;
    }
    const row = e.target.closest('[data-href]');
    if (row) window.location.hash = row.dataset.href;
  });

  load();
  return onDataChanged(load);
}
