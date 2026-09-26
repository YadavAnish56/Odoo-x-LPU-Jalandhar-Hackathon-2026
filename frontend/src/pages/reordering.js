// Reordering rules: min / max stock per product and warehouse, with low stock status.
import { api, isManager } from '../api.js';
import { openReorderRuleForm } from '../components/reorder-rule-form.js';
import { getLookups, notifyChanged, onDataChanged, reorder, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  errorHTML,
  esc,
  fmtQty,
  iconButton,
  loadingHTML,
  optionsHTML,
  ROW,
  FILTER,
  showError,
  showToast,
  statusBadge,
  tableHTML,
  TD,
  toolbar,
} from '../utils.js';

const RULE_STATUS = { ok: ['OK', 'green'], low: ['Low stock', 'amber'], out: ['Out of stock', 'red'] };

export default function renderReordering(container) {
  const manager = isManager();
  const state = { warehouseId: '', status: '' };
  let rules = [];
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    ${toolbar(
      manager ? button('New', { variant: 'primary', icon: 'add', attrs: 'id="new-btn"' }) : '',
      `<select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>
       <select id="f-status" class="${FILTER}">${optionsHTML(Object.entries(RULE_STATUS).map(([k, [label]]) => ({ value: k, label })), '', 'All statuses')}</select>`,
    )}
    <section class="${CARD} overflow-hidden"><div id="list">${loadingHTML()}</div></section>`;

  async function load() {
    try {
      rules = await api.get('/reorder-rules', { warehouseId: state.warehouseId, status: state.status });
      if (!container.isConnected) return;
      const rows = rules.map((r, i) => {
        const [label, color] = RULE_STATUS[r.status];
        return `
          <tr class="${ROW}">
            <td class="${TD}"><a href="#products/${r.productId}" class="font-medium hover:text-primary">${esc(r.productName)}</a></td>
            <td class="${TD} font-mono text-[12px]">${esc(r.sku)}</td>
            <td class="${TD}">${esc(r.warehouseName)}</td>
            <td class="${TD} text-right font-mono">${fmtQty(r.minQty)}</td>
            <td class="${TD} text-right font-mono">${fmtQty(r.maxQty)}</td>
            <td class="${TD} text-right font-mono ${r.status === 'ok' ? '' : 'text-danger'}">${fmtQty(r.onHand)} <span class="text-secondary">${esc(r.uom)}</span></td>
            <td class="${TD}">${statusBadge(label, color)}</td>
            <td class="${TD} text-right whitespace-nowrap">
              ${r.status !== 'ok' ? button(`Reorder ${fmtQty(r.suggestedQty)}`, { small: true, attrs: `data-reorder="${i}"` }) : ''}
              ${manager ? iconButton('edit', 'Edit', `data-edit="${i}"`) + iconButton('delete', 'Delete', `data-delete="${i}"`) : ''}
            </td>
          </tr>`;
      });
      $('#list').innerHTML = tableHTML(
        ['Product', 'SKU', 'Warehouse', { label: 'Min', align: 'right' }, { label: 'Max', align: 'right' }, { label: 'On hand', align: 'right' }, 'Status', ''],
        rows,
        'No reordering rules yet.',
      );
    } catch (err) {
      if (container.isConnected) $('#list').innerHTML = errorHTML(err);
    }
  }

  getLookups()
    .then(({ warehouses }) => {
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(warehouses), '', 'All warehouses');
    })
    .catch(() => {});

  $('#new-btn')?.addEventListener('click', () => openReorderRuleForm());
  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    load();
  });
  $('#f-status').addEventListener('change', (e) => {
    state.status = e.target.value;
    load();
  });
  $('#list').addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-reorder], [data-edit], [data-delete]');
    if (!btn) return;
    const r = rules[Number(btn.dataset.reorder ?? btn.dataset.edit ?? btn.dataset.delete)];
    if (btn.dataset.reorder !== undefined) return reorder(r).catch(showError);
    if (btn.dataset.edit !== undefined) {
      return openReorderRuleForm({ id: r.id, productId: r.productId, warehouseId: r.warehouseId, minQty: r.minQty, maxQty: r.maxQty });
    }
    if (!window.confirm(`Delete the reordering rule for ${r.productName} in ${r.warehouseName}?`)) return;
    try {
      await api.del(`/reorder-rules/${r.id}`);
      showToast('Rule deleted');
      notifyChanged();
    } catch (err) {
      showError(err);
    }
  });

  load();
  return onDataChanged(load);
}
