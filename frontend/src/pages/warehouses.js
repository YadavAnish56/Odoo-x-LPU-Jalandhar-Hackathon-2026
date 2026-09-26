import { api, fetchAll, isManager } from '../api.js';
import { openOperationForm } from '../components/operation-modals.js';
import { openReorderRuleForm } from '../components/product-modals.js';
import { getLookups, notifyChanged, onDataChanged, warehouseOptions } from '../store.js';
import { emptyHTML, errorHTML, esc, fmtQty, formField, loadingHTML, readForm, showError, showModal, showToast, statusBadge } from '../utils.js';

const RULE_STATUS = { ok: { label: 'OK', color: 'green' }, low: { label: 'Low', color: 'amber' }, out: { label: 'Out', color: 'red' } };

export default function renderWarehouses(container) {
  const manager = isManager();
  const $ = (sel) => container.querySelector(sel);
  let rules = [];

  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
        <div>
          <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Settings · Infrastructure</span></div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Warehouses & Reordering</h1>
          <p class="font-body-md text-body-md text-secondary mt-1">Manage warehouses, their storage locations and reorder thresholds.</p>
        </div>
        ${manager ? `<div class="flex flex-wrap items-center gap-2">
          <button id="add-location-btn" class="inline-flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add_location_alt</span>Add Location</button>
          <button id="add-warehouse-btn" class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>Add Warehouse</button>
        </div>` : ''}
      </div>

      <div id="wh-cards" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">${loadingHTML()}</div>

      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Reordering Rules</h2>
            <p class="font-body-sm text-body-sm text-secondary mt-0.5">Alert when stock drops to the minimum; refill up to the maximum</p>
          </div>
          ${manager ? `<button id="add-rule-btn" class="inline-flex items-center gap-1.5 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all"><span class="material-symbols-outlined text-[18px]">add</span>Add Rule</button>` : ''}
        </div>
        <div id="rules">${loadingHTML()}</div>
      </div>
    </div>
  `;

  async function load() {
    try {
      const [warehouses, locations, stock, ruleList] = await Promise.all([
        api.get('/warehouses'),
        api.get('/locations'),
        fetchAll('/stock'),
        api.get('/reorder-rules'),
      ]);
      if (!container.isConnected) return;
      rules = ruleList;
      renderCards(warehouses, locations, stock, ruleList);
      renderRules(ruleList);
    } catch (err) {
      if (container.isConnected) {
        $('#wh-cards').innerHTML = `<div class="md:col-span-3">${errorHTML(err)}</div>`;
        $('#rules').innerHTML = '';
      }
    }
  }

  function renderCards(warehouses, locations, stock, ruleList) {
    const totalUnits = warehouses.reduce((s, w) => s + w.totalQuantity, 0) || 1;
    if (!warehouses.length) {
      $('#wh-cards').innerHTML = `<div class="md:col-span-3">${emptyHTML('No warehouses yet — add your first one', 'warehouse')}</div>`;
      return;
    }
    $('#wh-cards').innerHTML = warehouses.map((w) => {
      const whLocations = locations.filter((l) => l.warehouseId === w.id);
      const products = new Set(stock.filter((s) => s.warehouseId === w.id).map((s) => s.productId)).size;
      const low = ruleList.filter((r) => r.warehouseId === w.id && r.status !== 'ok').length;
      const share = Math.round((w.totalQuantity / totalUnits) * 100);
      return `
        <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
          <div class="absolute -right-8 -top-8 w-32 h-32 bg-surface-container-low rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
          <div class="relative z-10">
            <div class="flex items-center justify-between mb-4">
              <div class="p-2.5 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[24px]">warehouse</span></div>
              ${low > 0
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>${low} Low</span>`
                : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Healthy</span>'}
            </div>
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">${esc(w.name)} <span class="font-mono font-label-md text-label-md text-secondary">${esc(w.code)}</span></h3>
            <p class="font-body-sm text-body-sm text-secondary mb-3 truncate">${esc(w.address || 'No address')}</p>
            <div class="grid grid-cols-3 gap-3 mb-4">
              <div class="text-center"><div class="font-headline-md text-headline-md text-on-surface font-semibold">${products}</div><div class="font-label-sm text-label-sm text-secondary">Products</div></div>
              <div class="text-center"><div class="font-headline-md text-headline-md text-on-surface font-semibold">${fmtQty(w.totalQuantity)}</div><div class="font-label-sm text-label-sm text-secondary">Units</div></div>
              <div class="text-center"><div class="font-headline-md text-headline-md ${low > 0 ? 'text-primary-container' : 'text-emerald-600'} font-semibold">${low}</div><div class="font-label-sm text-label-sm text-secondary">Low</div></div>
            </div>
            <div class="mb-3">
              <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="text-secondary">Share of total stock</span><span class="font-mono text-on-surface font-medium">${share}%</span></div>
              <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden"><div class="bg-primary-container h-full rounded-full transition-all" style="width:${share}%"></div></div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              ${whLocations.map((l) => `<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-secondary" title="${esc(l.name)} · ${fmtQty(l.totalQuantity)} units">${esc(l.fullCode)}</span>`).join('')}
              ${manager ? `<button data-add-location="${w.id}" class="px-2 py-0.5 rounded text-label-sm font-label-sm text-primary font-semibold hover:bg-primary-fixed/50">+ Location</button>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderRules(ruleList) {
    if (!ruleList.length) {
      $('#rules').innerHTML = emptyHTML('No reordering rules yet', 'rule');
      return;
    }
    $('#rules').innerHTML = `
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <th class="py-3 px-4 rounded-l-xl">Product</th>
              <th class="py-3 px-4">SKU</th>
              <th class="py-3 px-4">Warehouse</th>
              <th class="py-3 px-4 text-right">Min Stock</th>
              <th class="py-3 px-4 text-right">Max Stock</th>
              <th class="py-3 px-4 text-right">Current</th>
              <th class="py-3 px-4 text-right">Status</th>
              <th class="py-3 px-4 rounded-r-xl text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="font-body-sm text-body-sm text-on-surface">
            ${ruleList.map((r) => {
              const pct = r.maxQty > 0 ? Math.min(100, (r.onHand / r.maxQty) * 100) : 0;
              const s = RULE_STATUS[r.status];
              return `
                <tr class="hover:bg-surface-container-low/50 transition-colors">
                  <td class="py-3.5 px-4 font-medium"><a href="#product-detail-${r.productId}" class="hover:text-primary">${esc(r.productName)}</a></td>
                  <td class="py-3.5 px-4 font-mono text-secondary">${esc(r.sku)}</td>
                  <td class="py-3.5 px-4 text-secondary">${esc(r.warehouseName)}</td>
                  <td class="py-3.5 px-4 text-right font-mono">${fmtQty(r.minQty)}</td>
                  <td class="py-3.5 px-4 text-right font-mono">${fmtQty(r.maxQty)}</td>
                  <td class="py-3.5 px-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <div class="w-16 bg-surface-container-low h-1.5 rounded-full overflow-hidden"><div class="h-full rounded-full ${r.status === 'out' ? 'bg-error' : r.status === 'low' ? 'bg-amber-500' : 'bg-emerald-500'}" style="width:${pct}%"></div></div>
                      <span class="font-mono font-semibold ${r.status === 'ok' ? 'text-on-surface' : 'text-error'}">${fmtQty(r.onHand)}</span>
                    </div>
                  </td>
                  <td class="py-3.5 px-4 text-right">${statusBadge(s.label, s.color)}</td>
                  <td class="py-3.5 px-4 text-right whitespace-nowrap">
                    ${r.status !== 'ok' ? `<button data-reorder="${r.id}" class="px-2.5 py-1 rounded-lg bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm font-semibold" title="Create a receipt for the suggested quantity">Reorder ${fmtQty(r.suggestedQty)}</button>` : ''}
                    ${manager ? `<button data-edit-rule="${r.id}" class="p-1.5 rounded-lg hover:bg-surface-container text-secondary" title="Edit"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                    <button data-delete-rule="${r.id}" class="p-1.5 rounded-lg hover:bg-error-container/50 text-secondary hover:text-error" title="Delete"><span class="material-symbols-outlined text-[18px]">delete</span></button>` : ''}
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  container.addEventListener('click', async (e) => {
    const addLoc = e.target.closest('[data-add-location]');
    if (addLoc) return openLocationForm(Number(addLoc.dataset.addLocation));
    const reorder = e.target.closest('[data-reorder]');
    if (reorder) {
      const r = rules.find((x) => String(x.id) === reorder.dataset.reorder);
      const { locations } = await getLookups();
      return openOperationForm('receipt', {
        destLocationId: locations.find((l) => l.warehouseId === r.warehouseId)?.id,
        lines: [{ productId: r.productId, quantity: r.suggestedQty }],
      });
    }
    const edit = e.target.closest('[data-edit-rule]');
    if (edit) {
      const r = rules.find((x) => String(x.id) === edit.dataset.editRule);
      return openReorderRuleForm({ id: r.id, productId: r.productId, warehouseId: r.warehouseId, minQty: r.minQty, maxQty: r.maxQty });
    }
    const del = e.target.closest('[data-delete-rule]');
    if (del) {
      const r = rules.find((x) => String(x.id) === del.dataset.deleteRule);
      if (!window.confirm(`Delete the reordering rule for ${r.productName} in ${r.warehouseName}?`)) return;
      try {
        await api.del(`/reorder-rules/${r.id}`);
        showToast('Rule deleted');
        notifyChanged();
      } catch (err) {
        showError(err);
      }
    }
  });

  $('#add-warehouse-btn')?.addEventListener('click', openWarehouseForm);
  $('#add-location-btn')?.addEventListener('click', () => openLocationForm());
  $('#add-rule-btn')?.addEventListener('click', () => openReorderRuleForm());

  load();
  return onDataChanged(load);
}

function openWarehouseForm() {
  showModal('Add Warehouse', `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${formField('Warehouse name', 'text', 'name', '', 'e.g. Main Warehouse', [], { required: true })}
      ${formField('Short code', 'text', 'code', '', 'e.g. WH', [], { required: true, hint: 'Used in references like WH/IN/0001 (letters, numbers, dash)' })}
      ${formField('Address', 'textarea', 'address', '', 'Street, city')}
      <p class="font-body-sm text-body-sm text-secondary">A default <strong>Stock</strong> location is created automatically.</p>
    </form>`, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'save',
      label: 'Create Warehouse',
      primary: true,
      handler: async (overlay) => {
        const v = readForm(overlay.querySelector('form'));
        if (!v.name || !v.code) throw new Error('Name and code are required');
        const wh = await api.post('/warehouses', { name: v.name, code: v.code, address: v.address || undefined });
        showToast(`${wh.name} created`);
        notifyChanged();
      },
    },
  ]);
}

async function openLocationForm(warehouseId) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }
  showModal('Add Location', `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${formField('Warehouse', 'select', 'warehouseId', warehouseId ?? '', '', warehouseOptions(lookups.warehouses), { required: true })}
      ${formField('Location name', 'text', 'name', '', 'e.g. Rack A, Production Floor', [], { required: true })}
      ${formField('Short code', 'text', 'code', '', 'e.g. RACK-A', [], { required: true })}
    </form>`, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'save',
      label: 'Create Location',
      primary: true,
      handler: async (overlay) => {
        const v = readForm(overlay.querySelector('form'));
        if (!v.warehouseId || !v.name || !v.code) throw new Error('All fields are required');
        const loc = await api.post('/locations', { warehouseId: Number(v.warehouseId), name: v.name, code: v.code });
        showToast(`${loc.fullCode} created`);
        notifyChanged();
      },
    },
  ]);
}
