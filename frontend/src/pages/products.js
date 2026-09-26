import { api, fetchAll, isManager } from '../api.js';
import { openOperationForm } from '../components/operation-modals.js';
import { openProductForm } from '../components/product-modals.js';
import { getLookups, onDataChanged, takeNextFilter, warehouseOptions } from '../store.js';
import { debounce, emptyHTML, errorHTML, esc, fmtQty, loadingHTML, productIcon, stockBadge, STOCK_STATUS } from '../utils.js';

const selectClass =
  'bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-container';

export default function renderProducts(container) {
  const state = { search: '', categoryId: '', stockStatus: '', warehouseId: '', page: 1, ...takeNextFilter('products') };
  const manager = isManager();
  const $ = (sel) => container.querySelector(sel);
  let current = { items: [], total: 0, totalPages: 1 };

  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md mb-8">
        <div>
          <div class="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider mb-1">
            <span>Catalog Registry</span><span>/</span><span class="text-primary font-semibold">Live Stock</span>
          </div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">Products</h1>
          <p class="font-body-md text-body-md text-on-surface-variant mt-1">Everything you store, organized in one place.</p>
        </div>
        <div class="flex flex-wrap items-center gap-space-sm">
          <div class="relative flex items-center">
            <span class="material-symbols-outlined absolute left-3 text-secondary text-body-lg pointer-events-none">search</span>
            <input id="product-search" class="pl-10 pr-4 py-2 w-72 md:w-80 bg-surface-container-lowest text-on-surface text-body-sm font-body-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" placeholder="Search products by SKU or name..." type="text" value="${esc(state.search)}"/>
          </div>
          ${manager ? `<button id="add-product-btn" class="flex items-center gap-space-xs px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md transition-all active:scale-[0.99]" type="button">
            <span class="material-symbols-outlined text-body-lg">add</span><span>Add Product</span>
          </button>` : ''}
        </div>
      </div>

      <div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-8 flex flex-col gap-space-md">
        <div class="flex flex-wrap items-center justify-between gap-space-sm">
          <div class="flex flex-wrap items-center gap-space-xs bg-surface-container-low p-1 rounded-xl" id="cat-tabs"></div>
          <div class="flex flex-wrap items-center gap-2">
            <select id="f-status" class="${selectClass}">
              <option value="">All stock levels</option>
              ${Object.entries(STOCK_STATUS).map(([k, v]) => `<option value="${k}" ${state.stockStatus === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            </select>
            <select id="f-warehouse" class="${selectClass}"><option value="">All warehouses</option></select>
          </div>
        </div>
      </div>

      <div id="product-cards" class="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-8"></div>

      <div class="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div class="px-space-lg py-4 bg-surface-container-lowest flex items-center justify-between">
          <div class="flex items-center gap-space-sm">
            <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">Inventory Register</span>
            <span class="px-2 py-0.5 bg-surface-container text-secondary rounded-full font-label-sm text-label-sm">Live</span>
          </div>
        </div>
        <div id="product-table">${loadingHTML()}</div>
      </div>
    </div>
  `;

  async function loadCategories() {
    try {
      const { categories, products, warehouses } = await getLookups();
      if (!container.isConnected) return;
      const tab = (id, label, count) =>
        `<button data-cat="${id}" class="cat-btn px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${String(state.categoryId) === String(id) ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'}">${esc(label)} <span class="ml-1 opacity-70">(${count})</span></button>`;
      $('#cat-tabs').innerHTML = tab('', 'All Products', products.length) + categories.map((c) => tab(c.id, c.name, c.productCount)).join('');
      $('#cat-tabs').querySelectorAll('.cat-btn').forEach((btn) =>
        btn.addEventListener('click', () => {
          state.categoryId = btn.dataset.cat;
          state.page = 1;
          loadCategories();
          loadProducts();
        }),
      );
      const whSelect = $('#f-warehouse');
      if (whSelect.options.length === 1) {
        whSelect.insertAdjacentHTML('beforeend', warehouseOptions(warehouses).map((o) => `<option value="${o.value}">${esc(o.label)}</option>`).join(''));
        whSelect.value = state.warehouseId;
      }
    } catch {
      /* the table shows the error */
    }
  }

  async function loadProducts() {
    try {
      const [res, stock] = await Promise.all([
        api.get('/products', {
          search: state.search, categoryId: state.categoryId, stockStatus: state.stockStatus,
          warehouseId: state.warehouseId, page: state.page, limit: 20,
        }),
        fetchAll('/stock', { warehouseId: state.warehouseId }),
      ]);
      if (!container.isConnected) return;
      current = res;
      const byProduct = new Map();
      stock.forEach((s) => byProduct.set(s.productId, [...(byProduct.get(s.productId) ?? []), s]));
      renderCards(res.items, byProduct);
      renderTable(res, byProduct);
    } catch (err) {
      if (container.isConnected) $('#product-table').innerHTML = errorHTML(err);
    }
  }

  function renderCards(items, byProduct) {
    const attention = items.filter((p) => p.stockStatus !== 'in');
    const healthy = [...items].filter((p) => p.stockStatus === 'in').sort((a, b) => b.onHand - a.onHand);
    const featured = [...attention, ...healthy].slice(0, 3);
    $('#product-cards').innerHTML = featured.map((p) => productCard(p, byProduct.get(p.id) ?? [])).join('');
    $('#product-cards').classList.toggle('hidden', featured.length === 0);
  }

  function renderTable(res, byProduct) {
    const { items } = res;
    $('#product-table').innerHTML = `
      <div class="w-full overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-surface-container-low text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <th class="py-3 px-space-lg font-medium">Product & SKU</th>
              <th class="py-3 px-space-md font-medium">Category</th>
              <th class="py-3 px-space-md font-medium text-right">On Hand</th>
              <th class="py-3 px-space-md font-medium">Locations</th>
              <th class="py-3 px-space-md font-medium text-right">Reorder Level</th>
              <th class="py-3 px-space-md font-medium">Status</th>
              <th class="py-3 px-space-lg font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="font-body-md text-body-md text-on-surface">
            ${items.map((p) => productRow(p, byProduct.get(p.id) ?? [], manager)).join('')}
          </tbody>
        </table>
      </div>
      ${items.length === 0 ? emptyHTML('No products found matching your criteria.', 'inventory_2') : ''}
      <div class="px-space-lg py-4 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
        <div class="font-body-sm text-body-sm text-secondary">Showing <span class="text-on-surface font-medium">${items.length}</span> of <span class="text-on-surface font-medium">${res.total}</span> products</div>
        ${res.totalPages > 1 ? `
          <div class="flex items-center gap-2">
            <button data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Previous</button>
            <span class="font-label-md text-label-md text-secondary">Page ${res.page} of ${res.totalPages}</span>
            <button data-page="${res.page + 1}" ${res.page >= res.totalPages ? 'disabled' : ''} class="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high font-label-md text-label-md disabled:opacity-40">Next</button>
          </div>` : ''}
      </div>`;
  }

  // Event delegation (rows are re-rendered on every load)
  container.addEventListener('click', (e) => {
    const pageBtn = e.target.closest('[data-page]');
    if (pageBtn && !pageBtn.disabled) {
      state.page = Number(pageBtn.dataset.page);
      loadProducts();
      return;
    }
    const transferBtn = e.target.closest('[data-transfer-product]');
    if (transferBtn) {
      const productId = Number(transferBtn.dataset.transferProduct);
      openOperationForm('internal', { sourceLocationId: transferBtn.dataset.fromLocation || undefined, lines: [{ productId }] });
      return;
    }
    const editBtn = e.target.closest('[data-edit-product]');
    if (editBtn) {
      const product = current.items.find((p) => p.id === Number(editBtn.dataset.editProduct));
      if (product) openProductForm(product);
      return;
    }
    const view = e.target.closest('[data-view-product]');
    if (view) window.location.hash = `#product-detail-${view.dataset.viewProduct}`;
  });

  $('#product-search').addEventListener('input', debounce((e) => {
    state.search = e.target.value.trim();
    state.page = 1;
    loadProducts();
  }, 300));
  $('#f-status').addEventListener('change', (e) => {
    state.stockStatus = e.target.value;
    state.page = 1;
    loadProducts();
  });
  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    state.page = 1;
    loadProducts();
  });
  $('#add-product-btn')?.addEventListener('click', () => openProductForm());

  loadCategories();
  loadProducts();
  return onDataChanged(() => {
    loadCategories();
    loadProducts();
  });
}

function locationChips(stock, uom) {
  if (!stock.length) return '<span class="text-secondary font-label-sm text-label-sm italic">No stock</span>';
  const chips = stock.slice(0, 3).map((s) => `<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-on-surface whitespace-nowrap">${esc(s.locationCode)}: ${fmtQty(s.onHand)}${esc(uom === 'Units' ? '' : ` ${uom}`)}</span>`);
  if (stock.length > 3) chips.push(`<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-secondary">+${stock.length - 3} more</span>`);
  return chips.join('');
}

function productCard(p, stock) {
  const bgAccent = p.stockStatus === 'in' ? 'bg-surface-container-low' : 'bg-error-container/30';
  const valueColor = p.stockStatus === 'low' ? 'text-primary' : p.stockStatus === 'out' ? 'text-error' : 'text-on-surface';
  return `
    <div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer" data-view-product="${p.id}">
      <div class="absolute -right-6 -top-6 w-24 h-24 ${bgAccent} rounded-full pointer-events-none transition-transform group-hover:scale-125"></div>
      <div class="relative">
        <div class="flex items-start justify-between gap-space-sm mb-3">
          <div class="flex items-center gap-space-xs min-w-0"><span class="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm uppercase whitespace-nowrap">${esc(p.sku)}</span><span class="text-secondary font-label-sm text-label-sm truncate">${esc(p.categoryName ?? 'Uncategorized')}</span></div>
          ${stockBadge(p.stockStatus)}
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">${esc(p.name)}</h3>
        <p class="font-body-sm text-body-sm text-secondary mb-4">${stock.length ? `Stored in ${stock.length} location${stock.length > 1 ? 's' : ''}` : 'No stock on hand'}</p>
        <div class="flex items-end justify-between mb-4">
          <div>
            <div class="font-label-sm text-label-sm text-secondary uppercase">Free to use</div>
            <div class="font-metric-val text-metric-val ${valueColor} leading-none font-semibold mt-1">${fmtQty(p.freeToUse)} <span class="font-body-md text-body-md text-secondary font-normal">${esc(p.uom)}</span></div>
          </div>
          <span class="material-symbols-outlined text-[36px] text-surface-container-high">${productIcon(p)}</span>
        </div>
      </div>
      <div class="relative pt-3 flex items-center justify-between">
        <span class="font-label-sm text-label-sm text-secondary">Reorder:<span class="text-on-surface font-medium">${p.reorderMinQty !== null ? `${fmtQty(p.reorderMinQty)} ${esc(p.uom)}` : 'not set'}</span></span>
        <span class="text-primary hover:text-primary-container font-label-md text-label-md font-semibold flex items-center gap-0.5 transition-colors">View<span class="material-symbols-outlined text-body-md">arrow_forward</span></span>
      </div>
    </div>`;
}

function productRow(p, stock, manager) {
  const iconBg = p.stockStatus === 'out' ? 'bg-error-container/40 text-error' : p.stockStatus === 'low' ? 'bg-primary-fixed text-primary-container' : 'bg-surface-container text-secondary';
  const qtyColor = p.stockStatus === 'out' ? 'text-error' : p.stockStatus === 'low' ? 'text-primary' : 'text-on-surface';
  const fromLocation = [...stock].sort((a, b) => b.freeToUse - a.freeToUse)[0]?.locationId ?? '';
  return `
    <tr class="hover:bg-surface-container-low transition-colors group cursor-pointer" data-view-product="${p.id}">
      <td class="py-4 px-space-lg">
        <div class="flex items-center gap-space-sm">
          <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-colors"><span class="material-symbols-outlined text-body-lg">${productIcon(p)}</span></div>
          <div><div class="font-medium text-on-surface group-hover:text-primary transition-colors">${esc(p.name)}</div><div class="font-label-sm text-label-sm text-secondary font-mono tracking-tight">${esc(p.sku)}</div></div>
        </div>
      </td>
      <td class="py-4 px-space-md"><span class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm whitespace-nowrap">${esc(p.categoryName ?? 'Uncategorized')}</span></td>
      <td class="py-4 px-space-md text-right font-semibold font-mono ${qtyColor} whitespace-nowrap">
        ${fmtQty(p.onHand)} <span class="text-secondary font-normal font-body-sm">${esc(p.uom)}</span>
        ${p.reserved > 0 ? `<div class="font-label-sm text-label-sm text-secondary font-normal">${fmtQty(p.reserved)} reserved</div>` : ''}
      </td>
      <td class="py-4 px-space-md"><div class="flex items-center gap-1.5 flex-wrap">${locationChips(stock, p.uom)}</div></td>
      <td class="py-4 px-space-md text-right font-mono text-secondary text-body-sm whitespace-nowrap">${p.reorderMinQty !== null ? `${fmtQty(p.reorderMinQty)} ${esc(p.uom)}` : '—'}</td>
      <td class="py-4 px-space-md">${stockBadge(p.stockStatus)}</td>
      <td class="py-4 px-space-lg text-right">
        <div class="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
          <button class="p-1.5 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Transfer" data-transfer-product="${p.id}" data-from-location="${fromLocation}"><span class="material-symbols-outlined text-body-md">swap_horiz</span></button>
          ${manager ? `<button class="p-1.5 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Edit" data-edit-product="${p.id}"><span class="material-symbols-outlined text-body-md">edit</span></button>` : ''}
        </div>
      </td>
    </tr>`;
}
