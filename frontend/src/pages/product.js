// Product page: create a product (#products/new) or view / update one (#products/12)
// with its stock per location, reordering rules and recent moves.
import { api, isManager } from '../api.js';
import { openReorderRuleForm } from '../components/reorder-rule-form.js';
import { setPageTitle } from '../router.js';
import { getLookups, locationOptions, notifyChanged, onDataChanged, setNextFilter } from '../store.js';
import {
  button,
  CARD,
  emptyHTML,
  errorHTML,
  esc,
  field,
  fmtDateTime,
  fmtQty,
  iconButton,
  INPUT,
  inputHTML,
  loadingHTML,
  num,
  OP_TYPE,
  optionsHTML,
  readForm,
  ROW,
  sectionHeader,
  SELECT,
  selectHTML,
  showError,
  showToast,
  statusBadge,
  stockBadge,
  tableHTML,
  TD,
} from '../utils.js';

const UNITS = ['Units', 'pcs', 'kg', 'g', 'L', 'm', 'box'];
const PARENT = { label: 'Products', href: '#products' };

export default async function renderProduct(container, id) {
  const manager = isManager();
  const isNew = !id;
  let lookups;
  let product = null;

  container.innerHTML = loadingHTML();

  async function load() {
    try {
      lookups = await getLookups();
      if (!isNew) product = await api.get(`/products/${id}`);
      if (!container.isConnected) return;
      render();
    } catch (err) {
      container.innerHTML = err.status === 404
        ? '<div class="p-12 text-center text-secondary">Product not found. <a class="text-primary font-semibold" href="#products">Back to Products</a></div>'
        : errorHTML(err);
    }
  }

  function detailsForm() {
    const p = product ?? {};
    const dis = manager ? '' : 'disabled';
    const units = [...new Set([...UNITS, p.uom].filter(Boolean))];
    const categories = lookups.categories.map((c) => ({ value: c.id, label: c.name }));
    return `
      <form id="product-form" class="flex flex-col gap-4" onsubmit="return false">
        ${field('Name', inputHTML('name', p.name ?? '', `placeholder="e.g. Steel Rods" ${dis}`), { required: true })}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          ${field('SKU / Code', inputHTML('sku', p.sku ?? '', `placeholder="e.g. STL-ROD-01" ${dis}`), { required: true })}
          ${field('Unit of Measure', selectHTML('uom', units, p.uom ?? 'Units', undefined, dis))}
        </div>
        ${field('Category', `<select name="categoryId" ${dis} class="${SELECT}">${optionsHTML(categories, p.categoryId, 'No category')}${manager ? '<option value="__new">+ New category...</option>' : ''}</select>`)}
        <div id="new-category" class="hidden">${field('New category name', inputHTML('newCategory', '', 'placeholder="e.g. Raw Materials"'))}</div>
        ${isNew ? `
          <div class="p-4 rounded-lg bg-surface-container-low flex flex-col gap-3">
            <div class="text-[13px] font-semibold">Initial stock <span class="font-normal text-secondary">(optional)</span></div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${field('Quantity', `<input type="number" name="initialQty" min="0" step="any" placeholder="0" class="${INPUT}"/>`)}
              ${field('Location', selectHTML('initialLocationId', locationOptions(lookups.locations), '', 'Select a location...'))}
            </div>
          </div>` : ''}
        ${manager ? `<div class="flex flex-wrap justify-end gap-2">
          ${!isNew && product.isActive ? button('Archive', { variant: 'danger', icon: 'archive', attrs: 'id="archive-btn"' }) : ''}
          ${button(isNew ? 'Create Product' : 'Save Changes', { variant: 'primary', icon: 'save', attrs: 'id="save-btn"' })}
        </div>` : ''}
      </form>`;
  }

  function render() {
    if (isNew) {
      setPageTitle('New', PARENT);
      container.innerHTML = `
        ${manager ? `<section class="${CARD} p-5 max-w-2xl"><h3 class="text-[14px] font-semibold mb-4">New product</h3>${detailsForm()}</section>` : `<div class="${CARD}">${emptyHTML('Only an Inventory Manager can create products.')}</div>`}`;
      wire();
      return;
    }

    const p = product;
    setPageTitle(p.name, PARENT);
    const topLocation = [...p.stockByLocation].sort((a, b) => b.quantity - a.quantity)[0]?.locationId;
    const stockRows = p.stockByLocation.map(
      (s) => `<tr class="${ROW}">
        <td class="${TD} font-mono text-[12px]">${esc(s.locationCode)}</td>
        <td class="${TD}">${esc(s.locationName)}</td>
        <td class="${TD}">${esc(s.warehouseName)}</td>
        <td class="${TD} text-right font-mono font-semibold">${fmtQty(s.quantity)} ${esc(p.uom)}</td>
      </tr>`,
    );
    const ruleRows = p.reorderRules.map(
      (r) => `<tr class="${ROW}">
        <td class="${TD}">${esc(r.warehouseName)}</td>
        <td class="${TD} text-right font-mono">${fmtQty(r.minQty)}</td>
        <td class="${TD} text-right font-mono">${fmtQty(r.maxQty)}</td>
        <td class="${TD} text-right whitespace-nowrap">${manager ? iconButton('edit', 'Edit rule', `data-edit-rule="${r.id}"`) + iconButton('delete', 'Delete rule', `data-delete-rule="${r.id}"`) : ''}</td>
      </tr>`,
    );
    const moveRows = p.recentMoves.map((m) => {
      const dir = !m.fromLocationCode ? 'in' : !m.toLocationCode ? 'out' : 'internal';
      return `<tr class="${ROW}">
        <td class="${TD} whitespace-nowrap">${fmtDateTime(m.createdAt)}</td>
        <td class="${TD} font-mono">${esc(m.reference)}</td>
        <td class="${TD}">${esc(OP_TYPE[m.moveType]?.label ?? m.moveType)}</td>
        <td class="${TD} font-mono text-[12px] whitespace-nowrap">${esc(m.fromLocationCode ?? (m.moveType === 'adjustment' ? 'Adjustment' : 'Vendor'))} → ${esc(m.toLocationCode ?? (m.moveType === 'adjustment' ? 'Adjustment' : 'Customer'))}</td>
        <td class="${TD} text-right font-mono ${dir === 'in' ? 'text-success' : dir === 'out' ? 'text-danger' : ''}">${dir === 'in' ? '+' : dir === 'out' ? '-' : ''}${fmtQty(m.quantity)}</td>
      </tr>`;
    });

    container.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-[20px] font-semibold tracking-tight">${esc(p.name)}</h2>
            ${stockBadge(p.stockStatus)}
            ${p.isActive ? '' : statusBadge('Archived')}
          </div>
          <p class="text-[13px] text-secondary"><span class="font-mono">${esc(p.sku)}</span> · ${esc(p.categoryName ?? 'No category')} · ${esc(p.uom)}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          ${button('Transfer', { icon: 'sync_alt', attrs: 'id="transfer-btn"' })}
          ${button('Adjust stock', { variant: 'primary', icon: 'tune', attrs: 'id="adjust-btn"' })}
        </div>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        ${[
          ['On hand', fmtQty(p.onHand)],
          ['Free to use', fmtQty(p.freeToUse)],
          ['Reserved', fmtQty(p.reserved)],
          ['Reorder at', p.reorderMinQty !== null ? fmtQty(p.reorderMinQty) : '—'],
        ].map(([label, value]) => `<div class="${CARD} p-4"><div class="text-[13px] text-secondary">${label}</div><div class="text-[24px] font-semibold tracking-tight mt-1">${value} <span class="text-[13px] font-normal text-secondary">${label === 'Reorder at' && p.reorderMinQty === null ? '' : esc(p.uom)}</span></div></div>`).join('')}
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <section class="${CARD} p-5 xl:col-span-2 self-start">
          <h3 class="text-[14px] font-semibold mb-4">Details</h3>
          ${detailsForm()}
        </section>
        <div class="xl:col-span-3 flex flex-col gap-4">
          <section class="${CARD} overflow-hidden">
            ${sectionHeader('Stock by location')}
            ${tableHTML(['Location', 'Name', 'Warehouse', { label: 'On hand', align: 'right' }], stockRows, 'No stock yet.')}
          </section>
          <section class="${CARD} overflow-hidden">
            ${sectionHeader('Reordering rules', manager ? button('Add rule', { small: true, icon: 'add', attrs: 'id="add-rule-btn"' }) : '')}
            ${tableHTML(['Warehouse', { label: 'Min', align: 'right' }, { label: 'Max', align: 'right' }, ''], ruleRows, 'No reordering rules.')}
          </section>
          <section class="${CARD} overflow-hidden">
            ${sectionHeader('Recent moves', '<a href="#moves" id="moves-link" class="text-[13px] text-primary hover:underline">Move history</a>')}
            ${tableHTML(['Date', 'Reference', 'Operation', 'From → To', { label: 'Quantity', align: 'right' }], moveRows, 'No stock moves yet.')}
          </section>
        </div>
      </div>`;

    wire();
    container.querySelector('#transfer-btn').addEventListener('click', () => {
      setNextFilter('internal-new', { sourceLocationId: topLocation, lines: [{ productId: p.id }] });
      window.location.hash = '#transfers/new';
    });
    container.querySelector('#adjust-btn').addEventListener('click', () => {
      setNextFilter('adjustment', { productId: p.id, locationId: topLocation });
      window.location.hash = '#adjustments';
    });
    container.querySelector('#moves-link').addEventListener('click', () => setNextFilter('moves', { search: p.sku }));
    container.querySelector('#add-rule-btn')?.addEventListener('click', () => openReorderRuleForm({ productId: p.id }));
    container.querySelectorAll('[data-edit-rule]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const r = p.reorderRules.find((x) => String(x.id) === btn.dataset.editRule);
        openReorderRuleForm({ id: r.id, productId: p.id, warehouseId: r.warehouseId, minQty: r.minQty, maxQty: r.maxQty });
      }),
    );
    container.querySelectorAll('[data-delete-rule]').forEach((btn) =>
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this reordering rule?')) return;
        try {
          await api.del(`/reorder-rules/${btn.dataset.deleteRule}`);
          showToast('Rule deleted');
          notifyChanged();
        } catch (err) {
          showError(err);
        }
      }),
    );
  }

  function wire() {
    const form = container.querySelector('#product-form');
    if (!form) return;
    form.categoryId.addEventListener('change', () => {
      container.querySelector('#new-category').classList.toggle('hidden', form.categoryId.value !== '__new');
    });

    container.querySelector('#save-btn')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const v = readForm(form);
        if (!v.name || !v.sku) throw new Error('Name and SKU / Code are required');
        let categoryId = v.categoryId && v.categoryId !== '__new' ? num(v.categoryId) : null;
        if (v.categoryId === '__new') {
          if (!v.newCategory) throw new Error('Type the new category name');
          const existing = lookups.categories.find((c) => c.name.toLowerCase() === v.newCategory.toLowerCase());
          categoryId = existing ? existing.id : (await api.post('/categories', { name: v.newCategory })).id;
        }
        const payload = { name: v.name, sku: v.sku, uom: v.uom, categoryId };

        if (isNew) {
          const qty = num(v.initialQty);
          if (qty > 0 && !v.initialLocationId) throw new Error('Choose the location of the initial stock');
          const created = await api.post('/products', {
            ...payload,
            initialStock: qty > 0 ? { locationId: num(v.initialLocationId), quantity: qty } : undefined,
          });
          showToast(`${created.name} created`);
          notifyChanged();
          window.location.hash = `#products/${created.id}`;
        } else {
          await api.put(`/products/${product.id}`, payload);
          showToast('Product updated');
          notifyChanged();
        }
      } catch (err) {
        showError(err);
      } finally {
        if (btn.isConnected) btn.disabled = false;
      }
    });

    container.querySelector('#archive-btn')?.addEventListener('click', async () => {
      if (!window.confirm(`Archive ${product.name}? It will be hidden from lists; its history is kept.`)) return;
      try {
        await api.del(`/products/${product.id}`);
        showToast(`${product.name} archived`);
        notifyChanged();
        window.location.hash = '#products';
      } catch (err) {
        showError(err);
      }
    });
  }

  await load();
  if (!isNew) {
    return onDataChanged(async () => {
      try {
        product = await api.get(`/products/${id}`);
        lookups = await getLookups();
        if (container.isConnected) render();
      } catch {
        /* keep the current view */
      }
    });
  }
}
