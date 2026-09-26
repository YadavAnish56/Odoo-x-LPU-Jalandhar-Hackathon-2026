// Modals for operations: create receipt / delivery / transfer, stock adjustment,
// and the operation detail view with its workflow buttons.
import { api, getUser } from '../api.js';
import { getLookups, locationOptions, notifyChanged, productOptions } from '../store.js';
import {
  errorHTML,
  esc,
  fmtDate,
  fmtDateTime,
  fmtQty,
  formField,
  loadingHTML,
  num,
  OP_TYPE,
  opStatusBadge,
  operationIcon,
  readForm,
  showError,
  showModal,
  showToast,
  statusBadge,
  toDateInput,
} from '../utils.js';

const inputClass =
  'w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all';

const FORM_TITLES = { receipt: 'New Receipt', delivery: 'New Delivery Order', internal: 'New Internal Transfer' };

function lineRowHTML(products, line = {}) {
  const options = productOptions(products)
    .map((o) => `<option value="${o.value}" ${String(o.value) === String(line.productId) ? 'selected' : ''}>${esc(o.label)}</option>`)
    .join('');
  return `
    <div class="op-line grid grid-cols-12 gap-2 items-start">
      <div class="col-span-7 flex flex-col gap-0.5">
        <select name="lineProduct" class="${inputClass}"><option value="">Select product...</option>${options}</select>
        <span class="line-hint font-label-sm text-label-sm text-secondary min-h-[14px]"></span>
      </div>
      <input type="number" name="lineQty" min="0" step="any" placeholder="Qty" value="${esc(line.quantity ?? '')}" class="col-span-4 ${inputClass}"/>
      <button type="button" class="remove-line col-span-1 p-2 rounded-lg hover:bg-surface-container text-secondary" title="Remove">
        <span class="material-symbols-outlined text-[18px]">delete</span>
      </button>
    </div>`;
}

/** End of the chosen day, so an operation is only "late" after its scheduled day has passed. */
const scheduledIso = (dateValue) => (dateValue ? new Date(`${dateValue}T23:59:59`).toISOString() : undefined);

/**
 * Create a receipt, delivery order or internal transfer.
 * preset: { sourceLocationId, destLocationId, partnerName, lines: [{ productId, quantity }] }
 */
export async function openOperationForm(type, preset = {}) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }
  const { locations, users } = lookups;
  const products = lookups.products;
  const locOpts = locationOptions(locations);
  const me = getUser();

  const partnerField =
    type === 'receipt'
      ? formField('Supplier', 'text', 'partnerName', preset.partnerName ?? '', 'e.g. Tata Steel Ltd')
      : type === 'delivery'
        ? formField('Customer', 'text', 'partnerName', preset.partnerName ?? '', 'e.g. Acme Corp')
        : '';
  const sourceField =
    type !== 'receipt'
      ? formField(type === 'internal' ? 'From location' : 'Source location', 'select', 'sourceLocationId', preset.sourceLocationId ?? '', '', locOpts, { required: true })
      : '';
  const destField =
    type !== 'delivery'
      ? formField(type === 'internal' ? 'To location' : 'Destination location', 'select', 'destLocationId', preset.destLocationId ?? '', '', locOpts, { required: true })
      : '';
  const lines = preset.lines?.length ? preset.lines : [{}];

  const body = `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${partnerField}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${sourceField}${destField}</div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${formField('Scheduled date', 'date', 'scheduledDate', toDateInput())}
        ${formField('Responsible', 'select', 'responsibleId', me?.id ?? '', '', users.map((u) => ({ value: u.id, label: u.name })), { placeholderOption: false })}
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="font-label-md text-label-md text-secondary">Products <span class="text-error">*</span></label>
          <button type="button" class="add-line inline-flex items-center gap-1 font-label-md text-label-md text-primary font-semibold hover:text-primary-container">
            <span class="material-symbols-outlined text-[16px]">add</span>Add product
          </button>
        </div>
        <div class="op-lines flex flex-col gap-2">${lines.map((l) => lineRowHTML(products, l)).join('')}</div>
      </div>
      ${formField('Notes', 'textarea', 'notes', '', 'Optional notes...')}
    </form>`;

  const collect = (overlay) => {
    const v = readForm(overlay.querySelector('form'));
    const opLines = [...overlay.querySelectorAll('.op-line')]
      .map((row) => ({ productId: num(row.querySelector('[name=lineProduct]').value), quantity: num(row.querySelector('[name=lineQty]').value) }))
      .filter((l) => l.productId || l.quantity);
    if (!opLines.length) throw new Error('Add at least one product');
    if (opLines.some((l) => !l.productId || !(l.quantity > 0))) throw new Error('Every product line needs a product and a quantity above 0');
    if (new Set(opLines.map((l) => l.productId)).size !== opLines.length) throw new Error('Each product can be added only once');
    if (type !== 'receipt' && !v.sourceLocationId) throw new Error('Choose the source location');
    if (type !== 'delivery' && !v.destLocationId) throw new Error('Choose the destination location');
    return {
      type,
      partnerName: v.partnerName || undefined,
      sourceLocationId: num(v.sourceLocationId),
      destLocationId: num(v.destLocationId),
      scheduledDate: scheduledIso(v.scheduledDate),
      responsibleId: num(v.responsibleId),
      notes: v.notes || undefined,
      lines: opLines,
    };
  };

  const save = async (overlay, validateNow) => {
    const op = await api.post('/operations', collect(overlay));
    if (!validateNow) {
      showToast(`${op.reference} saved as draft`);
      notifyChanged();
      return;
    }
    try {
      await api.post(`/operations/${op.id}/validate`);
      showToast(`${op.reference} validated — stock updated`);
    } catch (err) {
      showError(err);
      showToast(`${op.reference} was saved as draft`, 'info');
    }
    notifyChanged();
  };

  const overlay = showModal(FORM_TITLES[type], body, [
    { id: 'cancel', label: 'Cancel' },
    { id: 'draft', label: 'Save Draft', handler: (o) => save(o, false) },
    { id: 'validate', label: 'Validate', primary: true, handler: (o) => save(o, true) },
  ]);

  // Dynamic product lines + "available at source" hints
  const linesEl = overlay.querySelector('.op-lines');
  let available = null; // productId -> { free, uom } at the chosen source location

  const updateHints = () => {
    overlay.querySelectorAll('.op-line').forEach((row) => {
      const hint = row.querySelector('.line-hint');
      const productId = num(row.querySelector('[name=lineProduct]').value);
      if (!available || !productId) return (hint.textContent = '');
      const info = available.get(productId);
      const uom = products.find((p) => p.id === productId)?.uom ?? '';
      hint.textContent = `Available here: ${fmtQty(info?.free ?? 0)} ${uom}`;
      hint.classList.toggle('text-error', !(info?.free > 0));
    });
  };

  const sourceSelect = overlay.querySelector('[name=sourceLocationId]');
  const loadAvailability = async () => {
    const locationId = num(sourceSelect?.value);
    if (!locationId) {
      available = null;
      return updateHints();
    }
    try {
      const res = await api.get('/stock', { locationId, includeZero: true, limit: 100 });
      available = new Map(res.items.map((i) => [i.productId, { free: i.freeToUse }]));
    } catch {
      available = null;
    }
    updateHints();
  };
  sourceSelect?.addEventListener('change', loadAvailability);
  if (sourceSelect?.value) loadAvailability();

  overlay.querySelector('.add-line').addEventListener('click', () => {
    linesEl.insertAdjacentHTML('beforeend', lineRowHTML(products));
    updateHints();
  });
  linesEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.remove-line');
    if (!btn) return;
    if (linesEl.querySelectorAll('.op-line').length > 1) btn.closest('.op-line').remove();
    else btn.closest('.op-line').querySelectorAll('select, input').forEach((el) => (el.value = ''));
    updateHints();
  });
  linesEl.addEventListener('change', updateHints);
}

/** Stock adjustment: enter the physically counted quantity. preset: { productId, locationId } */
export async function openAdjustmentForm(preset = {}) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }

  const body = `
    <form class="flex flex-col gap-4" onsubmit="return false">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${formField('Location', 'select', 'locationId', preset.locationId ?? '', '', locationOptions(lookups.locations), { required: true })}
        ${formField('Product', 'select', 'productId', preset.productId ?? '', '', productOptions(lookups.products), { required: true })}
      </div>
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-surface-container-low p-3 rounded-xl text-center"><span class="font-label-sm text-label-sm text-secondary block">Recorded</span><span id="adj-recorded" class="font-headline-sm text-headline-sm text-on-surface font-semibold block mt-1">—</span></div>
        <div class="flex flex-col gap-1">
          <label class="font-label-md text-label-md text-secondary">Physical count <span class="text-error">*</span></label>
          <input type="number" name="counted" min="0" step="any" placeholder="0" class="${inputClass}"/>
        </div>
        <div class="bg-primary-fixed/40 p-3 rounded-xl text-center"><span class="font-label-sm text-label-sm text-primary block">Difference</span><span id="adj-diff" class="font-headline-sm text-headline-sm text-primary-container font-semibold block mt-1">—</span></div>
      </div>
      ${formField('Reason', 'textarea', 'reason', '', 'e.g. 3 kg damaged during handling')}
    </form>`;

  let recorded = null;
  const overlay = showModal('Stock Adjustment', body, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'apply',
      label: 'Apply Adjustment',
      primary: true,
      handler: async (o) => {
        const v = readForm(o.querySelector('form'));
        if (!v.locationId || !v.productId) throw new Error('Choose a location and a product');
        if (v.counted === '' || Number(v.counted) < 0) throw new Error('Enter the physical count (0 or more)');
        const op = await api.post('/adjustments', {
          locationId: num(v.locationId),
          notes: v.reason || undefined,
          lines: [{ productId: num(v.productId), countedQuantity: num(v.counted) }],
        });
        const line = op.lines[0];
        const diff = line.quantity - line.systemQuantity;
        showToast(`${op.reference}: stock ${diff === 0 ? 'unchanged' : `${diff > 0 ? '+' : ''}${fmtQty(diff)}`}`);
        notifyChanged();
      },
    },
  ]);

  const form = overlay.querySelector('form');
  const recordedEl = overlay.querySelector('#adj-recorded');
  const diffEl = overlay.querySelector('#adj-diff');

  const updateDiff = () => {
    const counted = num(form.counted.value);
    if (recorded === null || counted === undefined) return (diffEl.textContent = '—');
    const diff = Math.round((counted - recorded) * 1000) / 1000;
    diffEl.textContent = `${diff > 0 ? '+' : ''}${fmtQty(diff)}`;
  };
  const loadRecorded = async () => {
    const locationId = num(form.locationId.value);
    const productId = num(form.productId.value);
    recorded = null;
    recordedEl.textContent = '—';
    if (locationId && productId) {
      try {
        const res = await api.get('/stock', { locationId, productId, includeZero: true });
        recorded = res.items[0]?.onHand ?? 0;
        const uom = lookups.products.find((p) => p.id === productId)?.uom ?? '';
        recordedEl.textContent = `${fmtQty(recorded)} ${uom}`;
      } catch (err) {
        showError(err);
      }
    }
    updateDiff();
  };
  form.locationId.addEventListener('change', loadRecorded);
  form.productId.addEventListener('change', loadRecorded);
  form.counted.addEventListener('input', updateDiff);
  loadRecorded();
}

// ---------------------------------------------------------------------------
// Operation detail with workflow actions
// ---------------------------------------------------------------------------
const ACTION_BUTTONS = {
  confirm: { label: 'Mark as To Do', icon: 'task_alt' },
  'check-availability': { label: 'Check Availability', icon: 'refresh' },
  pick: { label: 'Pick Items', icon: 'shopping_basket' },
  pack: { label: 'Pack Items', icon: 'package_2' },
  validate: { label: 'Validate', icon: 'check_circle', primary: true },
  cancel: { label: 'Cancel', icon: 'block' },
  delete: { label: 'Delete', icon: 'delete', danger: true },
};

const ACTION_TOASTS = {
  confirm: (op) => (op.status === 'waiting' ? `${op.reference} is waiting for stock` : `${op.reference} is ready`),
  'check-availability': (op) => (op.status === 'ready' ? `${op.reference} is ready` : `${op.reference} is still waiting for stock`),
  pick: (op) => `${op.reference}: items picked`,
  pack: (op) => `${op.reference}: items packed`,
  validate: (op) => `${op.reference} validated — stock updated`,
  cancel: (op) => `${op.reference} canceled`,
};

function availableActions(op) {
  if (op.type === 'adjustment') return [];
  switch (op.status) {
    case 'draft':
      return ['confirm', 'validate', 'cancel', 'delete'];
    case 'waiting':
      return ['check-availability', 'validate', 'cancel'];
    case 'ready':
      if (op.type === 'delivery') {
        return [!op.pickedAt && 'pick', op.pickedAt && !op.packedAt && 'pack', 'validate', 'cancel'].filter(Boolean);
      }
      return ['validate', 'cancel'];
    case 'canceled':
      return ['delete'];
    default:
      return [];
  }
}

function infoItem(label, value) {
  return `<div><div class="font-label-sm text-label-sm text-secondary uppercase">${esc(label)}</div><div class="font-body-sm text-body-sm text-on-surface font-medium mt-0.5">${value}</div></div>`;
}

function progressHTML(op) {
  const steps = op.status === 'waiting' ? ['draft', 'waiting', 'done'] : ['draft', 'ready', 'done'];
  if (op.status === 'canceled') return `<div class="mt-1">${opStatusBadge('canceled')}</div>`;
  const current = steps.indexOf(op.status);
  return `<div class="flex items-center gap-2 flex-wrap">${steps
    .map((s, i) => `<span class="px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold ${i <= current ? 'bg-primary-container text-on-primary' : 'bg-surface-container text-secondary'}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>${i < steps.length - 1 ? '<span class="material-symbols-outlined text-[16px] text-secondary">chevron_right</span>' : ''}`)
    .join('')}</div>`;
}

function detailHTML(op, shortages = []) {
  const isAdj = op.type === 'adjustment';
  const partnerLabel = op.type === 'receipt' ? 'Supplier' : 'Customer';
  const lineRows = op.lines
    .map((l) => {
      const diff = isAdj ? l.quantity - (l.systemQuantity ?? 0) : 0;
      return `<tr class="border-b border-surface-container last:border-0">
        <td class="py-2.5 px-3"><div class="font-medium text-on-surface">${esc(l.productName)}</div><div class="font-mono text-label-sm text-secondary">${esc(l.sku)}</div></td>
        ${isAdj
          ? `<td class="py-2.5 px-3 text-right font-mono">${fmtQty(l.systemQuantity)} ${esc(l.uom)}</td>
             <td class="py-2.5 px-3 text-right font-mono">${fmtQty(l.quantity)} ${esc(l.uom)}</td>
             <td class="py-2.5 px-3 text-right font-mono font-semibold ${diff < 0 ? 'text-error' : diff > 0 ? 'text-emerald-600' : 'text-secondary'}">${diff > 0 ? '+' : ''}${fmtQty(diff)}</td>`
          : `<td class="py-2.5 px-3 text-right font-mono font-semibold">${fmtQty(l.quantity)} ${esc(l.uom)}</td>
             <td class="py-2.5 px-3 text-right font-mono text-secondary">${fmtQty(l.onHand)} ${esc(l.uom)}</td>`}
      </tr>`;
    })
    .join('');

  const actions = availableActions(op)
    .map((a) => {
      const b = ACTION_BUTTONS[a];
      const cls = b.primary
        ? 'bg-primary-container hover:bg-primary text-on-primary shadow-sm'
        : b.danger
          ? 'bg-error-container hover:bg-error text-on-error-container hover:text-on-error'
          : 'bg-surface-container hover:bg-surface-container-high text-on-surface';
      return `<button type="button" data-op-action="${a}" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-label-md text-label-md transition-all disabled:opacity-60 ${cls}"><span class="material-symbols-outlined text-[18px]">${b.icon}</span>${b.label}</button>`;
    })
    .join('');

  return `
    <div class="flex flex-col gap-5">
      <div class="flex flex-wrap items-center gap-2">
        ${operationIcon(op.type)} ${opStatusBadge(op.status)}
        ${op.isLate ? statusBadge('Late', 'red') : ''}
        ${op.pickedAt ? statusBadge('Picked', 'green') : ''} ${op.packedAt ? statusBadge('Packed', 'green') : ''}
      </div>
      ${isAdj ? '' : progressHTML(op)}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-container-low/60">
        ${op.type === 'receipt' || op.type === 'delivery' ? infoItem(partnerLabel, esc(op.partnerName || '—')) : ''}
        ${op.sourceLocationCode && !isAdj ? infoItem('From', esc(op.sourceLocationCode)) : ''}
        ${op.destLocationCode ? infoItem(isAdj ? 'Location' : 'To', esc(op.destLocationCode)) : ''}
        ${infoItem(isAdj ? 'Date' : 'Scheduled', esc(fmtDate(op.scheduledDate)))}
        ${infoItem('Responsible', esc(op.responsibleName || '—'))}
        ${op.doneAt ? infoItem('Done at', esc(fmtDateTime(op.doneAt))) : infoItem('Created by', esc(op.createdByName || '—'))}
      </div>
      ${shortages.length ? `<div class="p-3 rounded-xl bg-amber-50 text-amber-800 font-body-sm text-body-sm"><strong>Not enough stock:</strong> ${shortages.map((s) => `${esc(s.productName)} (need ${fmtQty(s.required)}, available ${fmtQty(s.available)})`).join(', ')}</div>` : ''}
      <div class="overflow-x-auto">
        <table class="w-full text-left font-body-sm text-body-sm">
          <thead><tr class="bg-surface-container-low/60 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
            <th class="py-2 px-3 rounded-l-lg">Product</th>
            ${isAdj ? '<th class="py-2 px-3 text-right">Recorded</th><th class="py-2 px-3 text-right">Counted</th><th class="py-2 px-3 text-right rounded-r-lg">Difference</th>' : `<th class="py-2 px-3 text-right">Quantity</th><th class="py-2 px-3 text-right rounded-r-lg">${op.type === 'receipt' ? 'At destination' : 'At source'}</th>`}
          </tr></thead>
          <tbody>${lineRows}</tbody>
        </table>
      </div>
      ${op.notes ? `<div class="font-body-sm text-body-sm text-secondary"><span class="font-medium text-on-surface">Notes:</span> ${esc(op.notes)}</div>` : ''}
      ${actions ? `<div class="flex flex-wrap items-center justify-end gap-2 pt-4 border-t border-surface-container">${actions}</div>` : ''}
    </div>`;
}

export async function openOperationDetail(id) {
  const overlay = showModal('Operation', loadingHTML(), [], { wide: true });
  const body = overlay.querySelector('.modal-body');
  const title = overlay.querySelector('h3');

  const render = (op, shortages) => {
    title.textContent = `${op.reference} · ${OP_TYPE[op.type]?.label ?? op.type}`;
    body.innerHTML = detailHTML(op, shortages);
    body.querySelectorAll('[data-op-action]').forEach((btn) => {
      btn.addEventListener('click', () => runAction(op, btn.dataset.opAction, btn));
    });
  };

  const runAction = async (op, action, btn) => {
    if (action === 'delete' && !window.confirm(`Delete ${op.reference}? This cannot be undone.`)) return;
    if (action === 'cancel' && !window.confirm(`Cancel ${op.reference}?`)) return;
    body.querySelectorAll('[data-op-action]').forEach((b) => (b.disabled = true));
    btn.textContent = 'Please wait...';
    try {
      if (action === 'delete') {
        await api.del(`/operations/${op.id}`);
        showToast(`${op.reference} deleted`);
        overlay.remove();
      } else {
        const result = await api.post(`/operations/${op.id}/${action}`);
        showToast(ACTION_TOASTS[action](result), result.status === 'waiting' ? 'info' : 'success');
        render(result, result.shortages ?? []);
      }
      notifyChanged();
    } catch (err) {
      showError(err);
      render(op, err.status === 409 && Array.isArray(err.details) ? err.details : []);
    }
  };

  try {
    render(await api.get(`/operations/${id}`));
  } catch (err) {
    body.innerHTML = errorHTML(err);
  }
}
