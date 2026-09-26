// Form page for a receipt, delivery order or internal transfer (and read-only view of adjustments).
//   new:      #receipts/new     -> fill in contact, locations, products -> Save / Validate
//   existing: #receipts/12      -> workflow buttons (To Do, Pick, Pack, Validate, Cancel)
import { api, fetchAll, getUser } from '../api.js';
import { setPageTitle } from '../router.js';
import { getLookups, locationOptions, notifyChanged, onDataChanged, productOptions, takeNextFilter } from '../store.js';
import {
  button,
  CARD,
  changeColor,
  errorHTML,
  esc,
  field,
  fmtDate,
  fmtDateTime,
  fmtQty,
  INPUT,
  inputHTML,
  loadingHTML,
  num,
  OP_TYPE,
  optionsHTML,
  opStatusBadge,
  readForm,
  selectHTML,
  showError,
  showToast,
  statusBadge,
  TD,
  textareaHTML,
  toDateInput,
} from '../utils.js';

const OPEN = ['draft', 'waiting', 'ready'];

const ACTIONS = {
  confirm: { label: 'Mark as To Do', icon: 'task_alt' },
  'check-availability': { label: 'Check Availability', icon: 'refresh' },
  pick: { label: 'Pick', icon: 'shopping_basket', variant: 'primary' },
  pack: { label: 'Pack', icon: 'package_2', variant: 'primary' },
  validate: { label: 'Validate', icon: 'check_circle', variant: 'primary' },
  cancel: { label: 'Cancel', icon: 'block', variant: 'danger' },
  delete: { label: 'Delete', icon: 'delete', variant: 'danger' },
};

function availableActions(op) {
  if (op.type === 'adjustment') return [];
  switch (op.status) {
    case 'draft':
      return ['confirm', 'validate', 'cancel', 'delete'];
    case 'waiting':
      return ['check-availability', 'validate', 'cancel'];
    case 'ready':
      if (op.type === 'delivery' && !op.pickedAt) return ['pick', 'validate', 'cancel'];
      if (op.type === 'delivery' && !op.packedAt) return ['pack', 'validate', 'cancel'];
      return ['validate', 'cancel'];
    case 'canceled':
      return ['delete'];
    default:
      return [];
  }
}

/** End of the chosen day, so an operation only becomes "late" after its scheduled day. */
const scheduledIso = (dateValue) => new Date(`${dateValue}T23:59:59`).toISOString();

function statusBar(type, status) {
  if (type === 'adjustment') return opStatusBadge(status);
  if (status === 'canceled') return statusBadge('Canceled', 'red');
  const steps = type === 'delivery' ? ['draft', 'waiting', 'ready', 'done'] : ['draft', 'ready', 'done'];
  const current = steps.indexOf(status);
  return `<div class="flex items-center text-[12px] font-medium">${steps
    .map((s, i) => `<span class="px-3 py-1.5 ${i === 0 ? 'rounded-l-md' : ''} ${i === steps.length - 1 ? 'rounded-r-md' : ''} ${i === current ? 'bg-primary-container text-on-primary' : i < current ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'bg-surface-container-low text-secondary'}">${s.charAt(0).toUpperCase() + s.slice(1)}</span>`)
    .join('')}</div>`;
}

export default async function renderOperationForm(container, type, id) {
  const meta = OP_TYPE[type];
  const isNew = !id;
  let lookups;
  let op = null;
  let preset = {};
  let available = new Map(); // productId -> { onHand, free } at the relevant location
  let partners = [];
  let dirty = false;

  container.innerHTML = loadingHTML();

  async function load() {
    try {
      lookups = await getLookups();
      if (isNew) {
        preset = takeNextFilter(`${type}-new`) ?? {};
      } else {
        op = await api.get(`/operations/${id}`);
        if (op.type !== type) {
          window.location.replace(`#${OP_TYPE[op.type].route}/${op.id}`);
          return;
        }
      }
      if (!container.isConnected) return;
      dirty = false;
      render();
      loadAvailability();
      loadPartners();
    } catch (err) {
      container.innerHTML = err.status === 404
        ? `<div class="p-12 text-center text-secondary">This ${meta.label.toLowerCase()} does not exist. <a class="text-primary font-semibold" href="#${meta.route}">Back to ${meta.plural}</a></div>`
        : errorHTML(err);
    }
  }

  const editable = () => type !== 'adjustment' && (isNew || OPEN.includes(op.status));
  const locationField = () => (type === 'receipt' ? 'destLocationId' : 'sourceLocationId');

  function lineRow(line = {}) {
    const products = lookups.products;
    if (!editable()) {
      if (type === 'adjustment') {
        const diff = line.quantity - (line.systemQuantity ?? 0);
        return `<tr>
          <td class="${TD}"><div class="font-medium">${esc(line.productName)}</div><div class="text-[12px] text-secondary font-mono">${esc(line.sku)}</div></td>
          <td class="${TD} text-right font-mono">${fmtQty(line.systemQuantity)} ${esc(line.uom)}</td>
          <td class="${TD} text-right font-mono">${fmtQty(line.quantity)} ${esc(line.uom)}</td>
          <td class="${TD} text-right font-mono font-semibold ${changeColor(diff)}">${diff > 0 ? '+' : ''}${fmtQty(diff)}</td>
        </tr>`;
      }
      return `<tr>
        <td class="${TD}"><div class="font-medium">${esc(line.productName)}</div><div class="text-[12px] text-secondary font-mono">${esc(line.sku)}</div></td>
        <td class="${TD} text-right font-mono font-semibold">${fmtQty(line.quantity)} ${esc(line.uom)}</td>
      </tr>`;
    }
    return `<tr class="op-line">
      <td class="${TD} min-w-[240px]"><select name="lineProduct" class="${INPUT}">${optionsHTML(productOptions(products), line.productId, 'Select a product...')}</select></td>
      <td class="${TD} w-40"><input type="number" name="lineQty" min="0" step="any" value="${esc(line.quantity ?? '')}" placeholder="0" class="${INPUT} text-right"/></td>
      <td class="${TD} w-44 text-right text-[13px] line-available text-secondary">—</td>
      <td class="${TD} w-12 text-right"><button type="button" class="remove-line p-1.5 rounded-lg text-secondary hover:bg-surface-container" title="Remove line"><span class="material-symbols-outlined !text-[18px]">delete</span></button></td>
    </tr>`;
  }

  function render() {
    setPageTitle(op ? op.reference : 'New', { label: meta.plural, href: `#${meta.route}` });
    const lines = op ? op.lines : preset.lines?.length ? preset.lines : [{}];
    const me = getUser();
    const users = lookups.users.map((u) => ({ value: u.id, label: u.name }));
    const locOpts = locationOptions(lookups.locations);
    const canEdit = editable();
    const dis = canEdit ? '' : 'disabled';

    const fields = [];
    if (meta.partner) {
      fields.push(field(meta.partner, inputHTML('partnerName', op?.partnerName ?? preset.partnerName ?? '', `list="partner-list" placeholder="${type === 'receipt' ? 'Supplier name' : 'Customer name'}" ${dis}`)));
    }
    if (type === 'adjustment') {
      fields.push(field('Location', inputHTML('x', `${op.destLocationCode} — ${op.destLocationName}`, 'disabled')));
    }
    if (type !== 'receipt' && type !== 'adjustment') {
      fields.push(field('Source Location', selectHTML('sourceLocationId', locOpts, op?.sourceLocationId ?? preset.sourceLocationId, 'Select a location...', dis), { required: canEdit }));
    }
    if (type === 'receipt' || type === 'internal') {
      fields.push(field('Destination Location', selectHTML('destLocationId', locOpts, op?.destLocationId ?? preset.destLocationId, 'Select a location...', dis), { required: canEdit }));
    }
    fields.push(field(type === 'adjustment' ? 'Date' : 'Scheduled Date', type === 'adjustment' ? inputHTML('x', fmtDateTime(op.doneAt), 'disabled') : `<input type="date" name="scheduledDate" value="${toDateInput(op?.scheduledDate ?? new Date())}" ${dis} class="${INPUT}"/>`));
    fields.push(field('Responsible', selectHTML('responsibleId', users, op?.responsibleId ?? me?.id, undefined, dis)));

    const lineHeaders = type === 'adjustment'
      ? ['Product', 'Recorded', 'Counted', 'Difference']
      : canEdit ? ['Product', 'Quantity', type === 'receipt' ? 'On hand at destination' : 'Available at source', ''] : ['Product', 'Quantity'];

    const actions = isNew
      ? button('Save Draft', { icon: 'save', attrs: 'data-save="draft"' }) + button('Validate', { variant: 'primary', icon: 'check_circle', attrs: 'data-save="validate"' })
      : availableActions(op).map((a) => button(ACTIONS[a].label, { variant: ACTIONS[a].variant ?? 'secondary', icon: ACTIONS[a].icon, attrs: `data-action="${a}"` })).join('');

    container.innerHTML = `
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div class="flex flex-wrap items-center gap-2" id="action-bar">${actions}</div>
        <div class="flex flex-wrap items-center gap-2">
          ${op?.isLate ? statusBadge('Late', 'red') : ''}
          ${op?.pickedAt ? statusBadge('Picked', 'green') : ''}${op?.packedAt ? statusBadge('Packed', 'green') : ''}
          ${statusBar(type, op?.status ?? 'draft')}
        </div>
      </div>

      <form id="op-form" class="${CARD} p-5" onsubmit="return false">
        <div class="mb-5">
          <h2 class="text-[20px] font-semibold tracking-tight ${op ? 'font-mono' : ''}">${esc(op ? op.reference : `New ${meta.label.toLowerCase()}`)}</h2>
          ${op ? `<p class="text-[12px] text-secondary mt-0.5">Created by ${esc(op.createdByName ?? '—')} on ${fmtDate(op.createdAt)}${op.doneAt ? `, done ${fmtDateTime(op.doneAt)}` : ''}</p>` : ''}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">${fields.join('')}</div>
        <datalist id="partner-list"></datalist>

        <h3 class="text-[14px] font-semibold mb-2">Products</h3>
        <div class="border border-surface-container rounded-md overflow-x-auto">
          <table class="w-full text-left text-[13px]">
            <thead><tr class="bg-surface-container-low/60 text-[12px] text-secondary">
              ${lineHeaders.map((h, i) => `<th class="px-4 py-2.5 font-medium ${i > 0 ? 'text-right' : ''}">${h}</th>`).join('')}
            </tr></thead>
            <tbody id="op-lines">${lines.map(lineRow).join('')}</tbody>
          </table>
          ${canEdit ? `<button type="button" id="add-line" class="w-full text-left px-4 py-2.5 border-t border-surface-container text-[13px] text-primary hover:bg-surface-container-low">+ Add a product</button>` : ''}
        </div>

        <div class="mt-5">${type === 'adjustment' ? field('Reason', inputHTML('x', op.notes ?? '—', 'disabled')) : field('Notes', textareaHTML('notes', op?.notes ?? '', `placeholder="Optional notes" ${dis}`))}</div>

        <div id="save-bar" class="hidden flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-surface-container">
          ${button('Discard', { attrs: 'data-discard' })}
          ${button('Save', { variant: 'primary', icon: 'save', attrs: 'data-save="update"' })}
        </div>
      </form>`;

    wire();
    updateAvailability();
    fillPartners();
  }

  // ------------------------------------------------------------ availability
  async function loadAvailability() {
    if (!editable()) return;
    const locationId = num(container.querySelector(`[name=${locationField()}]`)?.value);
    available = new Map();
    if (locationId) {
      try {
        const stock = await fetchAll('/stock', { locationId, includeZero: true });
        stock.forEach((s) => available.set(s.productId, { onHand: s.onHand, free: s.freeToUse }));
      } catch {
        /* hints are optional */
      }
    }
    if (container.isConnected) updateAvailability();
  }

  function updateAvailability() {
    if (!editable()) return;
    container.querySelectorAll('.op-line').forEach((row) => {
      const cell = row.querySelector('.line-available');
      const productId = num(row.querySelector('[name=lineProduct]').value);
      const qty = num(row.querySelector('[name=lineQty]').value) ?? 0;
      const uom = lookups.products.find((p) => p.id === productId)?.uom ?? '';
      if (!productId || !num(container.querySelector(`[name=${locationField()}]`)?.value)) {
        cell.textContent = '—';
        cell.className = `${TD} w-44 text-right text-[13px] line-available text-secondary`;
        return;
      }
      const info = available.get(productId) ?? { onHand: 0, free: 0 };
      if (type === 'receipt') {
        cell.textContent = `${fmtQty(info.onHand)} ${uom}`;
        return;
      }
      // A ready operation already reserves its own quantity: add it back.
      const own = op?.status === 'ready' ? op.lines.find((l) => l.productId === productId)?.quantity ?? 0 : 0;
      const free = info.free + own;
      const short = qty > free;
      cell.textContent = `${fmtQty(free)} ${uom}${short ? ' — not enough' : ''}`;
      cell.className = `${TD} w-44 text-right text-[13px] line-available ${short ? 'text-danger font-medium' : 'text-secondary'}`;
      row.classList.toggle('bg-danger-soft/40', short);
    });
  }

  async function loadPartners() {
    if (!meta.partner || !editable()) return;
    try {
      const res = await api.get('/operations', { type, limit: 100 });
      partners = [...new Set(res.items.map((o) => o.partnerName).filter(Boolean))].sort();
      fillPartners();
    } catch {
      /* suggestions are optional */
    }
  }

  function fillPartners() {
    const list = container.querySelector('#partner-list');
    if (list) list.innerHTML = partners.map((p) => `<option value="${esc(p)}"></option>`).join('');
  }

  // ----------------------------------------------------------------- saving
  function collect() {
    const v = readForm(container.querySelector('#op-form'));
    const lines = [...container.querySelectorAll('.op-line')]
      .map((row) => ({ productId: num(row.querySelector('[name=lineProduct]').value), quantity: num(row.querySelector('[name=lineQty]').value) }))
      .filter((l) => l.productId || l.quantity);
    if (type !== 'receipt' && !v.sourceLocationId) throw new Error('Choose the source location');
    if (type !== 'delivery' && !v.destLocationId) throw new Error('Choose the destination location');
    if (!lines.length) throw new Error('Add at least one product');
    if (lines.some((l) => !l.productId || !(l.quantity > 0))) throw new Error('Every line needs a product and a quantity greater than 0');
    if (new Set(lines.map((l) => l.productId)).size !== lines.length) throw new Error('Each product can be added only once');
    if (!v.scheduledDate) throw new Error('Choose the scheduled date');
    return { v, lines };
  }

  async function saveNew(validateNow) {
    const { v, lines } = collect();
    const created = await api.post('/operations', {
      type,
      partnerName: v.partnerName || undefined,
      sourceLocationId: num(v.sourceLocationId),
      destLocationId: num(v.destLocationId),
      scheduledDate: scheduledIso(v.scheduledDate),
      responsibleId: num(v.responsibleId),
      notes: v.notes || undefined,
      lines,
    });
    if (validateNow) {
      try {
        await api.post(`/operations/${created.id}/validate`);
        showToast(`${created.reference} validated — stock updated`);
      } catch (err) {
        showError(err);
        showToast(`${created.reference} was saved as a draft`, 'info');
      }
    } else {
      showToast(`${created.reference} saved as draft`);
    }
    notifyChanged();
    window.location.hash = `#${meta.route}/${created.id}`;
  }

  async function saveChanges() {
    const { v, lines } = collect();
    const body = { notes: v.notes, responsibleId: num(v.responsibleId) };
    if (meta.partner) body.partnerName = v.partnerName;
    if (num(v.sourceLocationId) !== (op.sourceLocationId ?? undefined)) body.sourceLocationId = num(v.sourceLocationId);
    if (num(v.destLocationId) !== (op.destLocationId ?? undefined)) body.destLocationId = num(v.destLocationId);
    if (v.scheduledDate !== toDateInput(op.scheduledDate)) body.scheduledDate = scheduledIso(v.scheduledDate);
    const original = op.lines.map((l) => `${l.productId}:${l.quantity}`).join('|');
    if (lines.map((l) => `${l.productId}:${l.quantity}`).join('|') !== original) body.lines = lines;
    op = await api.put(`/operations/${op.id}`, body);
    showToast(`${op.reference} saved${op.status === 'draft' && body.lines ? ' — mark it as To Do again' : ''}`);
    notifyChanged();
    dirty = false;
    render();
    loadAvailability();
  }

  async function runAction(action) {
    if (action === 'delete' && !window.confirm(`Delete ${op.reference}? This cannot be undone.`)) return;
    if (action === 'cancel' && !window.confirm(`Cancel ${op.reference}?`)) return;
    if (action === 'delete') {
      await api.del(`/operations/${op.id}`);
      showToast(`${op.reference} deleted`);
      notifyChanged();
      window.location.hash = `#${meta.route}`;
      return;
    }
    try {
      const result = await api.post(`/operations/${op.id}/${action}`);
      op = await api.get(`/operations/${op.id}`);
      const messages = {
        confirm: result.status === 'waiting' ? 'is waiting for stock' : 'is ready',
        'check-availability': result.status === 'ready' ? 'is ready' : 'is still waiting for stock',
        pick: 'items picked',
        pack: 'items packed',
        validate: 'validated — stock updated',
        cancel: 'canceled',
      };
      showToast(`${op.reference} ${messages[action]}`, result.status === 'waiting' ? 'info' : 'success');
      notifyChanged();
    } catch (err) {
      showError(err);
      op = await api.get(`/operations/${op.id}`).catch(() => op);
    }
    render();
    loadAvailability();
  }

  // ------------------------------------------------------------------ events
  function markDirty() {
    if (isNew || dirty) return;
    dirty = true;
    container.querySelector('#save-bar').classList.remove('hidden');
    container.querySelectorAll('#action-bar [data-action]').forEach((b) => {
      b.disabled = true;
      b.title = 'Save or discard your changes first';
    });
  }

  function wire() {
    const form = container.querySelector('#op-form');
    const linesEl = container.querySelector('#op-lines');

    container.querySelectorAll('[data-action]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        container.querySelectorAll('[data-action]').forEach((b) => (b.disabled = true));
        try {
          await runAction(btn.dataset.action);
        } catch (err) {
          showError(err);
          render();
        }
      }),
    );

    container.querySelectorAll('[data-save]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        const buttons = container.querySelectorAll('[data-save]');
        buttons.forEach((b) => (b.disabled = true));
        try {
          if (btn.dataset.save === 'update') await saveChanges();
          else await saveNew(btn.dataset.save === 'validate');
        } catch (err) {
          showError(err);
        } finally {
          buttons.forEach((b) => b.isConnected && (b.disabled = false));
        }
      }),
    );

    container.querySelector('[data-discard]')?.addEventListener('click', () => {
      dirty = false;
      render();
      loadAvailability();
    });

    if (!editable()) return;
    form.addEventListener('input', markDirty);
    form.addEventListener('change', (e) => {
      markDirty();
      if (e.target.name === locationField()) loadAvailability();
      else updateAvailability();
    });
    form.addEventListener('input', (e) => {
      if (e.target.name === 'lineQty') updateAvailability();
    });

    container.querySelector('#add-line').addEventListener('click', () => {
      linesEl.insertAdjacentHTML('beforeend', lineRow());
      markDirty();
      updateAvailability();
    });
    linesEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.remove-line');
      if (!btn) return;
      if (linesEl.querySelectorAll('.op-line').length > 1) btn.closest('.op-line').remove();
      else btn.closest('.op-line').querySelectorAll('select, input').forEach((el) => (el.value = ''));
      markDirty();
      updateAvailability();
    });
  }

  await load();
  return onDataChanged(() => {
    // Refresh stock hints when other tabs/pages change stock (but never throw away unsaved edits).
    if (!dirty && container.isConnected) loadAvailability();
  });
}
