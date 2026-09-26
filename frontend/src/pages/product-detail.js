import { api, isManager } from '../api.js';
import { openAdjustmentForm, openOperationForm } from '../components/operation-modals.js';
import { openProductForm, openReorderRuleForm } from '../components/product-modals.js';
import { onDataChanged, setNextFilter } from '../store.js';
import { errorHTML, esc, fmtDate, fmtDateTime, fmtMoney, fmtQty, loadingHTML, OP_TYPE, productIcon, stockBadge } from '../utils.js';

export default function renderProductDetail(container, productId) {
  const manager = isManager();

  async function load() {
    container.innerHTML = container.innerHTML || loadingHTML('Loading product...');
    let p;
    try {
      p = await api.get(`/products/${productId}`);
    } catch (err) {
      container.innerHTML = err.status === 404
        ? `<div class="p-12 text-center"><p class="text-secondary">Product not found.</p><a href="#products" class="text-primary font-semibold mt-2 inline-block">← Back to Products</a></div>`
        : errorHTML(err);
      return;
    }
    if (!container.isConnected) return;
    render(p);
  }

  function render(p) {
    const locations = p.stockByLocation;
    const max = p.reorderMaxQty || (p.reorderMinQty ? p.reorderMinQty * 2 : Math.max(p.onHand, 1));
    const healthPct = Math.min(100, (p.onHand / (max || 1)) * 100);
    const minPct = p.reorderMinQty ? Math.min(100, (p.reorderMinQty / (max || 1)) * 100) : null;

    container.innerHTML = `
      <div class="flex flex-col w-full pb-16">
        <div class="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm mb-6 pt-2">
          <a href="#products" class="hover:text-on-surface transition-colors cursor-pointer">Products</a>
          <span class="material-symbols-outlined text-[14px]">chevron_right</span>
          <span class="text-on-surface font-medium">${esc(p.name)}</span>
        </div>

        <div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md mb-8">
          <div class="flex items-center gap-space-md">
            <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-secondary">
              <span class="material-symbols-outlined text-[32px]">${productIcon(p)}</span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-space-sm mb-1">
                <h1 class="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">${esc(p.name)}</h1>
                ${stockBadge(p.stockStatus)}
                ${p.isActive ? '' : '<span class="px-2 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm">Archived</span>'}
              </div>
              <div class="flex items-center gap-space-sm text-secondary font-body-sm text-body-sm">
                <span class="font-mono">${esc(p.sku)}</span><span>•</span><span>${esc(p.categoryName ?? 'Uncategorized')}</span><span>•</span><span>${esc(p.uom)}</span>
              </div>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-space-sm">
            ${manager ? `<button id="edit-btn" class="px-4 py-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">edit</span>Edit</button>` : ''}
            <button id="transfer-btn" class="px-4 py-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">sync_alt</span>Transfer</button>
            <button id="adjust-btn" class="px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">tune</span>Adjust Stock</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-8 flex flex-col gap-6">
            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock Summary</h2>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                ${summaryTile('On Hand', fmtQty(p.onHand), p.uom, 'text-on-surface', true)}
                ${summaryTile('Free to Use', fmtQty(p.freeToUse), p.uom, 'text-emerald-600')}
                ${summaryTile('Reserved', fmtQty(p.reserved), p.uom, 'text-on-surface')}
                ${summaryTile('Reorder Level', p.reorderMinQty !== null ? fmtQty(p.reorderMinQty) : '—', p.reorderMinQty !== null ? p.uom : 'not set', 'text-on-surface')}
              </div>
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock by Location</h2>
              ${locations.length ? `
                <div class="space-y-3">
                  ${locations.map((l) => `
                    <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                      <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-secondary">warehouse</span>
                        <div>
                          <div class="font-body-md text-body-md text-on-surface font-medium">${esc(l.warehouseName)}</div>
                          <div class="font-body-sm text-body-sm text-secondary">${esc(l.locationName)} · <span class="font-mono">${esc(l.locationCode)}</span></div>
                        </div>
                      </div>
                      <div class="text-right">
                        <div class="font-headline-sm text-headline-sm text-on-surface font-semibold">${fmtQty(l.quantity)} <span class="font-body-sm text-secondary font-normal">${esc(p.uom)}</span></div>
                        <div class="w-24 bg-surface-container h-1.5 rounded-full mt-1"><div class="bg-primary-container h-full rounded-full" style="width:${(l.quantity / (p.onHand || 1)) * 100}%"></div></div>
                      </div>
                    </div>`).join('')}
                </div>
              ` : `<div class="p-8 text-center text-secondary font-body-sm text-body-sm"><span class="material-symbols-outlined text-[32px] text-surface-container-high block mb-2">location_off</span>No stock in any location yet</div>`}
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Movement History</h2>
                <a href="#ledger" id="ledger-link" class="font-label-md text-label-md text-primary font-semibold hover:text-primary-container">View all</a>
              </div>
              ${p.recentMoves.length ? `
                <div class="space-y-2">
                  ${p.recentMoves.map((m) => {
                    const dir = !m.fromLocationCode ? 'in' : !m.toLocationCode ? 'out' : 'internal';
                    return `
                    <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                      <div class="flex items-center gap-3">
                        <span class="px-2 py-0.5 rounded bg-surface-container font-mono text-label-sm font-semibold text-on-surface">${esc(m.reference)}</span>
                        <div>
                          <div class="font-body-sm text-body-sm text-on-surface font-medium">${esc(OP_TYPE[m.moveType]?.label ?? m.moveType)} · <span class="text-secondary font-normal">${esc(m.fromLocationCode ?? 'Outside')} → ${esc(m.toLocationCode ?? 'Outside')}</span></div>
                          <div class="font-label-sm text-label-sm text-secondary">${fmtDateTime(m.createdAt)}</div>
                        </div>
                      </div>
                      <span class="font-mono font-semibold ${dir === 'in' ? 'text-emerald-600' : dir === 'out' ? 'text-error' : 'text-on-surface'}">${dir === 'in' ? '+' : dir === 'out' ? '-' : ''}${fmtQty(m.quantity)} ${esc(p.uom)}</span>
                    </div>`;
                  }).join('')}
                </div>
              ` : `<div class="p-8 text-center text-secondary font-body-sm text-body-sm">No movement history for this product</div>`}
            </div>
          </div>

          <div class="lg:col-span-4 flex flex-col gap-6">
            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Product Information</h3>
              <div class="space-y-3">
                ${infoRow('SKU', esc(p.sku))}
                ${infoRow('Category', esc(p.categoryName ?? 'Uncategorized'))}
                ${infoRow('Unit of Measure', esc(p.uom))}
                ${infoRow('Cost per Unit', fmtMoney(p.costPrice))}
                ${infoRow('Stock Value', fmtMoney(p.stockValue))}
                ${infoRow('Locations', String(locations.length))}
                ${infoRow('Created', fmtDate(p.createdAt))}
              </div>
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <div class="flex items-center justify-between mb-4">
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Reordering Rules</h3>
                ${manager ? `<button id="add-rule-btn" class="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-semibold hover:text-primary-container"><span class="material-symbols-outlined text-[16px]">add</span>Add</button>` : ''}
              </div>
              ${p.reorderRules.length ? `<div class="space-y-2">${p.reorderRules.map((r) => `
                <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/60 ${manager ? 'cursor-pointer hover:bg-surface-container-low' : ''}" data-rule="${r.id}">
                  <span class="font-body-sm text-body-sm text-on-surface font-medium">${esc(r.warehouseName)}</span>
                  <span class="font-mono font-label-md text-label-md text-secondary">min ${fmtQty(r.minQty)} · max ${fmtQty(r.maxQty)}</span>
                </div>`).join('')}</div>`
                : '<p class="font-body-sm text-body-sm text-secondary">No reordering rule yet — this product will only alert when it is out of stock.</p>'}
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock Health</h3>
              <div class="relative pt-2">
                <div class="relative w-full bg-surface-container-low rounded-full h-3 overflow-hidden">
                  <div class="h-full rounded-full transition-all ${p.stockStatus === 'out' ? 'bg-error' : p.stockStatus === 'low' ? 'bg-primary-container' : 'bg-emerald-500'}" style="width:${healthPct}%"></div>
                </div>
                ${minPct !== null ? `<div class="absolute top-1 h-5 w-0.5 bg-on-surface" style="left:${minPct}%" title="Reorder level"></div>` : ''}
                <div class="flex justify-between mt-2 font-label-sm text-label-sm text-secondary">
                  <span>0</span>
                  <span class="text-primary-container font-medium">${p.reorderMinQty !== null ? `Reorder: ${fmtQty(p.reorderMinQty)}` : 'No reorder level'}</span>
                  <span>${p.reorderMaxQty ? `Max: ${fmtQty(p.reorderMaxQty)}` : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const topLocation = [...locations].sort((a, b) => b.quantity - a.quantity)[0]?.locationId;
    container.querySelector('#edit-btn')?.addEventListener('click', () => openProductForm(p));
    container.querySelector('#transfer-btn').addEventListener('click', () =>
      openOperationForm('internal', { sourceLocationId: topLocation, lines: [{ productId: p.id }] }),
    );
    container.querySelector('#adjust-btn').addEventListener('click', () =>
      openAdjustmentForm({ productId: p.id, locationId: topLocation }),
    );
    container.querySelector('#ledger-link').addEventListener('click', () => setNextFilter('ledger', { search: p.sku }));
    container.querySelector('#add-rule-btn')?.addEventListener('click', () => openReorderRuleForm({ productId: p.id }));
    if (manager) {
      container.querySelectorAll('[data-rule]').forEach((el) => el.addEventListener('click', () => {
        const r = p.reorderRules.find((x) => String(x.id) === el.dataset.rule);
        openReorderRuleForm({ id: r.id, productId: p.id, warehouseId: r.warehouseId, minQty: r.minQty, maxQty: r.maxQty });
      }));
    }
  }

  load();
  return onDataChanged(load);
}

function summaryTile(label, value, unit, color, big = false) {
  return `
    <div class="bg-surface-container-low rounded-xl p-4 text-center">
      <div class="font-label-sm text-label-sm text-secondary uppercase mb-1">${label}</div>
      <div class="${big ? 'font-metric-val text-metric-val' : 'font-headline-md text-headline-md'} ${color} font-semibold">${value}</div>
      <div class="font-body-sm text-body-sm text-secondary">${esc(unit)}</div>
    </div>`;
}

function infoRow(label, value) {
  return `<div class="flex items-center justify-between py-2 border-b border-surface-container last:border-0"><span class="font-body-sm text-body-sm text-secondary">${label}</span><span class="font-body-sm text-body-sm text-on-surface font-medium text-right">${value}</span></div>`;
}
