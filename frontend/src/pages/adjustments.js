// Inventory Adjustment: select product + location, enter the counted quantity, the system
// updates the stock and logs the difference in the stock ledger.
import { api } from '../api.js';
import { getLookups, locationOptions, notifyChanged, onDataChanged, productOptions, takeNextFilter } from '../store.js';
import {
  button,
  CARD,
  changeColor,
  errorHTML,
  esc,
  field,
  fmtDateTime,
  fmtQty,
  INPUT,
  loadingHTML,
  num,
  optionsHTML,
  pagerHTML,
  ROW,
  sectionHeader,
  SELECT,
  showError,
  showToast,
  tableHTML,
  TD,
} from '../utils.js';

export default function renderAdjustments(container) {
  const preset = takeNextFilter('adjustment') ?? {};
  const state = { page: 1 };
  let lookups = null;
  let recorded = null;
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    <form id="adj-form" class="${CARD} p-5 mb-5" onsubmit="return false">
      <h3 class="text-[14px] font-semibold mb-4">Count stock</h3>
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 items-end">
        ${field('Location', `<select name="locationId" class="${SELECT}"><option value="">Loading...</option></select>`, { required: true })}
        ${field('Product', `<select name="productId" class="${SELECT}"><option value="">Loading...</option></select>`, { required: true })}
        <div class="flex flex-col gap-1.5"><span class="text-[13px] font-medium text-secondary">Recorded quantity</span><div id="adj-recorded" class="px-3 py-2 rounded-md bg-surface-container-low font-mono">—</div></div>
        ${field('Counted quantity', `<input type="number" name="counted" min="0" step="any" placeholder="0" class="${INPUT}"/>`, { required: true })}
        <div class="flex flex-col gap-1.5"><span class="text-[13px] font-medium text-secondary">Difference</span><div id="adj-diff" class="px-3 py-2 rounded-md bg-surface-container-low font-mono font-medium">—</div></div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end mt-4">
        ${field('Reason', `<input name="reason" placeholder="e.g. 3 kg damaged during handling" class="${INPUT}"/>`)}
        ${button('Apply Adjustment', { variant: 'primary', icon: 'check_circle', attrs: 'id="apply-btn"' })}
      </div>
    </form>

    <section class="${CARD} overflow-hidden">
      ${sectionHeader('History')}
      <div id="history">${loadingHTML()}</div>
    </section>`;

  const form = $('#adj-form');

  function updateDiff() {
    const counted = num(form.counted.value);
    const diffEl = $('#adj-diff');
    if (recorded === null || counted === undefined) {
      diffEl.textContent = '—';
      diffEl.className = 'px-3 py-2 rounded-md bg-surface-container-low font-mono font-medium';
      return;
    }
    const diff = Math.round((counted - recorded) * 1000) / 1000;
    diffEl.textContent = `${diff > 0 ? '+' : ''}${fmtQty(diff)}`;
    diffEl.className = `px-3 py-2 rounded-md font-mono font-medium ${diff < 0 ? 'bg-danger-soft text-danger' : diff > 0 ? 'bg-success-soft text-success' : 'bg-surface-container-low'}`;
  }

  async function loadRecorded() {
    const locationId = num(form.locationId.value);
    const productId = num(form.productId.value);
    recorded = null;
    $('#adj-recorded').textContent = '—';
    if (locationId && productId) {
      try {
        const res = await api.get('/stock', { locationId, productId, includeZero: true });
        recorded = res.items[0]?.onHand ?? 0;
        const uom = lookups.products.find((p) => p.id === productId)?.uom ?? '';
        $('#adj-recorded').textContent = `${fmtQty(recorded)} ${uom}`;
      } catch (err) {
        showError(err);
      }
    }
    updateDiff();
  }

  async function loadHistory() {
    try {
      const res = await api.get('/adjustments', { page: state.page, limit: 10 });
      if (!container.isConnected) return;
      const rows = res.items.flatMap((a) =>
        a.lineItems.map((l) => {
          const diff = l.quantity - (l.systemQuantity ?? 0);
          return `
            <tr class="${ROW} cursor-pointer" data-id="${a.id}">
              <td class="${TD} font-mono whitespace-nowrap">${esc(a.reference)}</td>
              <td class="${TD} whitespace-nowrap">${fmtDateTime(a.doneAt)}</td>
              <td class="${TD}">${esc(l.productName)}</td>
              <td class="${TD} font-mono text-[12px]">${esc(a.destLocationCode)}</td>
              <td class="${TD} text-right font-mono">${fmtQty(l.systemQuantity)}</td>
              <td class="${TD} text-right font-mono">${fmtQty(l.quantity)}</td>
              <td class="${TD} text-right font-mono ${changeColor(diff)}">${diff > 0 ? '+' : ''}${fmtQty(diff)} ${esc(l.uom)}</td>
              <td class="${TD}">${esc(a.notes || '—')}</td>
              <td class="${TD} whitespace-nowrap">${esc(a.responsibleName ?? '—')}</td>
            </tr>`;
        }),
      );
      $('#history').innerHTML =
        tableHTML(['Reference', 'Date', 'Product', 'Location', { label: 'Recorded', align: 'right' }, { label: 'Counted', align: 'right' }, { label: 'Difference', align: 'right' }, 'Reason', 'By'], rows, 'No adjustments yet.') +
        pagerHTML(res);
    } catch (err) {
      if (container.isConnected) $('#history').innerHTML = errorHTML(err);
    }
  }

  $('#apply-btn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const v = { locationId: num(form.locationId.value), productId: num(form.productId.value), counted: num(form.counted.value) };
    if (!v.locationId || !v.productId) return showError(new Error('Choose a location and a product'));
    if (v.counted === undefined || v.counted < 0) return showError(new Error('Enter the counted quantity (0 or more)'));
    btn.disabled = true;
    try {
      const op = await api.post('/adjustments', {
        locationId: v.locationId,
        notes: form.reason.value.trim() || undefined,
        lines: [{ productId: v.productId, countedQuantity: v.counted }],
      });
      const line = op.lines[0];
      const diff = line.quantity - line.systemQuantity;
      showToast(`${op.reference}: stock ${diff === 0 ? 'unchanged' : `${diff > 0 ? '+' : ''}${fmtQty(diff)} ${line.uom}`}`);
      form.counted.value = '';
      form.reason.value = '';
      notifyChanged();
      loadRecorded();
    } catch (err) {
      showError(err);
    } finally {
      btn.disabled = false;
    }
  });

  form.locationId.addEventListener('change', loadRecorded);
  form.productId.addEventListener('change', loadRecorded);
  form.counted.addEventListener('input', updateDiff);
  $('#history').addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn) {
      state.page = Number(pageBtn.dataset.page);
      loadHistory();
      return;
    }
    const row = e.target.closest('[data-id]');
    if (row) window.location.hash = `#adjustments/${row.dataset.id}`;
  });

  getLookups()
    .then((data) => {
      lookups = data;
      form.locationId.innerHTML = optionsHTML(locationOptions(data.locations), preset.locationId, 'Select a location...');
      form.productId.innerHTML = optionsHTML(productOptions(data.products), preset.productId, 'Select a product...');
      loadRecorded();
    })
    .catch(showError);

  loadHistory();
  return onDataChanged(loadHistory);
}
