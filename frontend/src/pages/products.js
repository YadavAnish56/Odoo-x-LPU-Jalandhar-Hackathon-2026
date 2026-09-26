import data from '../data.js';
import { showToast, showModal, formField, statusBadge } from '../utils.js';

export default function renderProducts(container) {
  let activeCategory = 'All';
  let searchTerm = '';

  function getFiltered() {
    return data.products.filter(p => {
      const catMatch = activeCategory === 'All' || p.category === activeCategory;
      const searchMatch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      return catMatch && searchMatch;
    });
  }

  function render() {
    const products = getFiltered();
    const catCounts = {};
    data.products.forEach(p => { catCounts[p.category] = (catCounts[p.category] || 0) + 1; });

    container.innerHTML = `
      <div class="flex flex-col w-full pb-16">
        <!-- Header -->
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
              <input id="product-search" class="pl-10 pr-4 py-2 w-72 md:w-80 bg-surface-container-lowest text-on-surface text-body-sm font-body-sm rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" placeholder="Search products by SKU or name..." type="text" value="${searchTerm}"/>
            </div>
            <button id="add-product-btn" class="flex items-center gap-space-xs px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-md transition-all active:scale-[0.99]" type="button">
              <span class="material-symbols-outlined text-body-lg">add</span><span>Add Product</span>
            </button>
          </div>
        </div>

        <!-- Filters -->
        <div class="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm mb-8 flex flex-col gap-space-md">
          <div class="flex flex-wrap items-center justify-between gap-space-sm">
            <div class="flex flex-wrap items-center gap-space-xs bg-surface-container-low p-1 rounded-xl" id="cat-tabs">
              <button data-cat="All" class="cat-btn px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${activeCategory === 'All' ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'}">All Products <span class="ml-1 text-secondary font-normal">(${data.products.length})</span></button>
              ${Object.entries(catCounts).map(([cat, count]) =>
                `<button data-cat="${cat}" class="cat-btn px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all ${activeCategory === cat ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-secondary hover:text-on-surface'}">${cat} <span class="ml-1 opacity-70">(${count})</span></button>`
              ).join('')}
            </div>
          </div>
        </div>

        <!-- Featured Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-space-md mb-8">
          ${data.products.filter(p => p.status !== 'In Stock').slice(0, 3).map(p => productCard(p)).join('')}
          ${data.products.filter(p => p.status !== 'In Stock').length < 3 ? data.products.filter(p => p.totalStock > 200).slice(0, 3 - data.products.filter(p => p.status !== 'In Stock').length).map(p => productCard(p)).join('') : ''}
        </div>

        <!-- Table -->
        <div class="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div class="px-space-lg py-4 bg-surface-container-lowest flex items-center justify-between">
            <div class="flex items-center gap-space-sm">
              <span class="font-headline-sm text-headline-sm text-on-surface font-semibold">Inventory Register</span>
              <span class="px-2 py-0.5 bg-surface-container text-secondary rounded-full font-label-sm text-label-sm">Live</span>
            </div>
          </div>
          <div class="w-full overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <th class="py-3 px-space-lg font-medium">Product & SKU</th>
                  <th class="py-3 px-space-md font-medium">Category</th>
                  <th class="py-3 px-space-md font-medium text-right">Total Stock</th>
                  <th class="py-3 px-space-md font-medium">Locations</th>
                  <th class="py-3 px-space-md font-medium text-right">Reorder Level</th>
                  <th class="py-3 px-space-md font-medium">Status</th>
                  <th class="py-3 px-space-lg font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="font-body-md text-body-md text-on-surface">
                ${products.map(p => productRow(p)).join('')}
              </tbody>
            </table>
          </div>
          ${products.length === 0 ? `<div class="p-12 text-center"><span class="material-symbols-outlined text-[48px] text-surface-container-high mb-3">inventory_2</span><p class="font-body-md text-body-md text-secondary">No products found matching your criteria.</p></div>` : ''}
          <div class="px-space-lg py-4 bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
            <div class="font-body-sm text-body-sm text-secondary">Showing <span class="text-on-surface font-medium">${products.length}</span> of <span class="text-on-surface font-medium">${data.products.length}</span> products</div>
          </div>
        </div>
      </div>
    `;

    wireEvents();
  }

  function wireEvents() {
    // Category tabs
    container.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => { activeCategory = btn.dataset.cat; render(); });
    });

    // Search
    const searchInput = container.querySelector('#product-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => { searchTerm = e.target.value; render(); searchInput.focus(); });
    }

    // Add product
    container.querySelector('#add-product-btn')?.addEventListener('click', () => {
      showModal('Add New Product', `
        <div class="flex flex-col gap-4">
          ${formField('Product Name', 'text', 'name', '', 'e.g. Steel Rod 12mm')}
          <div class="grid grid-cols-2 gap-3">
            ${formField('SKU', 'text', 'sku', '', 'e.g. STL-001')}
            ${formField('Category', 'select', 'category', '', '', [...new Set(data.products.map(p => p.category))])}
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${formField('Unit', 'select', 'unit', '', '', ['kg', 'pcs', 'liters'])}
            ${formField('Initial Stock', 'number', 'stock', '', '0')}
          </div>
          <div class="grid grid-cols-2 gap-3">
            ${formField('Reorder Level', 'number', 'reorder', '', '10')}
            ${formField('Warehouse', 'select', 'warehouse', '', '', data.warehouses.map(w => w.name))}
          </div>
        </div>
      `, [
        { id: 'cancel', label: 'Cancel', primary: false, handler: () => {} },
        { id: 'save', label: 'Save Product', primary: true, handler: () => {
          showToast('Product added successfully!');
          window.addAppNotification?.('Product Created', 'New SKU catalog entry registered.', 'success', '#products');
        }},
      ]);
    });

    // View product detail
    container.querySelectorAll('[data-view-product]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.viewProduct);
        window.location.hash = `#product-detail-${id}`;
      });
    });

    // Edit product
    container.querySelectorAll('[data-edit-product]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.editProduct);
        const p = data.products.find(pr => pr.id === id);
        if (!p) return;
        showModal(`Edit: ${p.name}`, `
          <div class="flex flex-col gap-4">
            ${formField('Product Name', 'text', 'name', p.name)}
            <div class="grid grid-cols-2 gap-3">
              ${formField('SKU', 'text', 'sku', p.sku)}
              ${formField('Category', 'select', 'category', p.category, '', [...new Set(data.products.map(pr => pr.category))])}
            </div>
            <div class="grid grid-cols-2 gap-3">
              ${formField('Unit', 'select', 'unit', p.unit, '', ['kg', 'pcs', 'liters'])}
              ${formField('Reorder Level', 'number', 'reorder', p.reorderLevel)}
            </div>
          </div>
        `, [
          { id: 'cancel', label: 'Cancel', primary: false, handler: () => {} },
          { id: 'save', label: 'Update Product', primary: true, handler: () => {
            showToast(`${p.name} updated!`);
            window.addAppNotification?.('Product Updated', `${p.name} (${p.sku}) specifications updated.`, 'info', '#products');
          }},
        ]);
      });
    });
  }

  render();
}

function productCard(p) {
  const statusColor = p.status === 'Low Stock' ? 'orange' : p.status === 'Out of Stock' ? 'red' : 'green';
  const bgAccent = p.status === 'Low Stock' ? 'bg-error-container/30' : p.status === 'Out of Stock' ? 'bg-error-container/30' : 'bg-surface-container-low';
  return `
    <div class="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group cursor-pointer" data-view-product="${p.id}">
      <div class="absolute -right-6 -top-6 w-24 h-24 ${bgAccent} rounded-full pointer-events-none transition-transform group-hover:scale-125"></div>
      <div>
        <div class="flex items-start justify-between gap-space-sm mb-3">
          <div class="flex items-center gap-space-xs"><span class="px-2.5 py-0.5 rounded-full bg-surface-container text-secondary font-label-sm text-label-sm uppercase">${p.sku}</span><span class="text-secondary font-label-sm text-label-sm">${p.category}</span></div>
          ${statusBadge(p.status, statusColor)}
        </div>
        <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">${p.name}</h3>
        <p class="font-body-sm text-body-sm text-secondary mb-4">${p.totalStock} ${p.unit} total${p.locations.length ? ` across ${p.locations.length} location${p.locations.length > 1 ? 's' : ''}` : ''}</p>
        <div class="flex items-end justify-between mb-4">
          <div>
            <div class="font-label-sm text-label-sm text-secondary uppercase">Available Stock</div>
            <div class="font-metric-val text-metric-val ${p.status === 'Low Stock' ? 'text-primary' : p.status === 'Out of Stock' ? 'text-error' : 'text-on-surface'} leading-none font-semibold mt-1">${p.totalStock.toLocaleString()} <span class="font-body-md text-body-md text-secondary font-normal">${p.unit}</span></div>
          </div>
        </div>
      </div>
      <div class="pt-3 flex items-center justify-between">
        <span class="font-label-sm text-label-sm text-secondary">Reorder: <span class="text-on-surface font-medium">${p.reorderLevel} ${p.unit}</span></span>
        ${p.status !== 'In Stock'
          ? `<button class="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl font-medium shadow-sm transition-all flex items-center gap-1"><span class="material-symbols-outlined text-body-sm">shopping_cart_checkout</span>Reorder</button>`
          : `<button class="text-primary hover:text-primary-container font-label-md text-label-md font-semibold flex items-center gap-0.5 transition-colors">View<span class="material-symbols-outlined text-body-md">arrow_forward</span></button>`
        }
      </div>
    </div>`;
}

function productRow(p) {
  const statusColor = p.status === 'Low Stock' ? 'orange' : p.status === 'Out of Stock' ? 'red' : 'green';
  const iconBg = p.status === 'Out of Stock' ? 'bg-error-container/40 text-error' : p.status === 'Low Stock' ? 'bg-primary-fixed text-primary-container' : 'bg-surface-container text-secondary';
  return `
    <tr class="hover:bg-surface-container-low transition-colors group cursor-pointer" data-view-product="${p.id}">
      <td class="py-4 px-space-lg">
        <div class="flex items-center gap-space-sm">
          <div class="w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center transition-colors"><span class="material-symbols-outlined text-body-lg">${p.icon}</span></div>
          <div><div class="font-medium text-on-surface group-hover:text-primary transition-colors">${p.name}</div><div class="font-label-sm text-label-sm text-secondary font-mono tracking-tight">${p.sku}</div></div>
        </div>
      </td>
      <td class="py-4 px-space-md"><span class="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm">${p.category}</span></td>
      <td class="py-4 px-space-md text-right font-semibold font-mono ${p.status === 'Out of Stock' ? 'text-error' : p.status === 'Low Stock' ? 'text-primary' : 'text-on-surface'}">${p.totalStock.toLocaleString()} <span class="text-secondary font-normal font-body-sm">${p.unit}</span></td>
      <td class="py-4 px-space-md">
        <div class="flex items-center gap-1.5 flex-wrap">
          ${p.locations.length ? p.locations.map(l => `<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-on-surface">${l.warehouse.split(' ')[0]}: ${l.qty}${p.unit}</span>`).join('') : '<span class="text-secondary font-label-sm text-label-sm italic">None assigned</span>'}
        </div>
      </td>
      <td class="py-4 px-space-md text-right font-mono text-secondary text-body-sm">${p.reorderLevel} ${p.unit}</td>
      <td class="py-4 px-space-md">${statusBadge(p.status, statusColor)}</td>
      <td class="py-4 px-space-lg text-right">
        <div class="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
          <button class="p-1.5 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Transfer" onclick="event.stopPropagation()"><span class="material-symbols-outlined text-body-md">swap_horiz</span></button>
          <button class="p-1.5 rounded-lg hover:bg-surface-container text-secondary hover:text-on-surface transition-colors" title="Edit" data-edit-product="${p.id}" onclick="event.stopPropagation()"><span class="material-symbols-outlined text-body-md">edit</span></button>
        </div>
      </td>
    </tr>`;
}
