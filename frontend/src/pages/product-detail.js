import data from '../data.js';
import { statusBadge } from '../utils.js';

export default function renderProductDetail(container, productId) {
  const p = data.products.find(pr => pr.id === productId);
  if (!p) { container.innerHTML = `<div class="p-12 text-center"><p class="text-secondary">Product not found.</p><a href="#products" class="text-primary font-semibold mt-2 inline-block">← Back to Products</a></div>`; return; }
  const statusColor = p.status === 'Low Stock' ? 'orange' : p.status === 'Out of Stock' ? 'red' : 'green';
  const movements = data.moveHistory.filter(m => m.product.toLowerCase().includes(p.name.toLowerCase().split(' ')[0]));

  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <!-- Breadcrumb -->
      <div class="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm mb-6 pt-2">
        <a href="#products" class="hover:text-on-surface transition-colors cursor-pointer">Products</a>
        <span class="material-symbols-outlined text-[14px]">chevron_right</span>
        <span class="text-on-surface font-medium">${p.name}</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-start justify-between gap-space-md mb-8">
        <div class="flex items-center gap-space-md">
          <div class="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-secondary">
            <span class="material-symbols-outlined text-[32px]">${p.icon}</span>
          </div>
          <div>
            <div class="flex items-center gap-space-sm mb-1">
              <h1 class="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">${p.name}</h1>
              ${statusBadge(p.status, statusColor)}
            </div>
            <div class="flex items-center gap-space-sm text-secondary font-body-sm text-body-sm">
              <span class="font-mono">${p.sku}</span><span>•</span><span>${p.category}</span><span>•</span><span>${p.unit}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-space-sm">
          <button class="px-4 py-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">edit</span>Edit</button>
          <button class="px-4 py-2 bg-surface-container-lowest hover:bg-surface-container text-on-surface font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">sync_alt</span>Transfer</button>
          <button class="px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all flex items-center gap-1.5"><span class="material-symbols-outlined text-[18px]">tune</span>Adjust Stock</button>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Left -->
        <div class="lg:col-span-8 flex flex-col gap-6">
          <!-- Stock Summary -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock Summary</h2>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="bg-surface-container-low rounded-xl p-4 text-center">
                <div class="font-label-sm text-label-sm text-secondary uppercase mb-1">Total Stock</div>
                <div class="font-metric-val text-metric-val text-on-surface font-semibold">${p.totalStock.toLocaleString()}</div>
                <div class="font-body-sm text-body-sm text-secondary">${p.unit}</div>
              </div>
              <div class="bg-surface-container-low rounded-xl p-4 text-center">
                <div class="font-label-sm text-label-sm text-secondary uppercase mb-1">Available</div>
                <div class="font-headline-md text-headline-md text-emerald-600 font-semibold">${p.totalStock}</div>
                <div class="font-body-sm text-body-sm text-secondary">${p.unit}</div>
              </div>
              <div class="bg-surface-container-low rounded-xl p-4 text-center">
                <div class="font-label-sm text-label-sm text-secondary uppercase mb-1">Reorder Level</div>
                <div class="font-headline-md text-headline-md text-on-surface font-semibold">${p.reorderLevel}</div>
                <div class="font-body-sm text-body-sm text-secondary">${p.unit}</div>
              </div>
              <div class="bg-surface-container-low rounded-xl p-4 text-center">
                <div class="font-label-sm text-label-sm text-secondary uppercase mb-1">Locations</div>
                <div class="font-headline-md text-headline-md text-on-surface font-semibold">${p.locations.length}</div>
                <div class="font-body-sm text-body-sm text-secondary">warehouses</div>
              </div>
            </div>
          </div>

          <!-- Stock by Location -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock by Location</h2>
            ${p.locations.length ? `
              <div class="space-y-3">
                ${p.locations.map(l => `
                  <div class="flex items-center justify-between p-4 bg-surface-container-low rounded-xl">
                    <div class="flex items-center gap-3">
                      <span class="material-symbols-outlined text-secondary">warehouse</span>
                      <div>
                        <div class="font-body-md text-body-md text-on-surface font-medium">${l.warehouse}</div>
                        <div class="font-body-sm text-body-sm text-secondary">${l.location}</div>
                      </div>
                    </div>
                    <div class="text-right">
                      <div class="font-headline-sm text-headline-sm text-on-surface font-semibold">${l.qty} <span class="font-body-sm text-secondary font-normal">${p.unit}</span></div>
                      <div class="w-24 bg-surface-container h-1.5 rounded-full mt-1"><div class="bg-primary-container h-full rounded-full" style="width:${(l.qty / (p.totalStock || 1)) * 100}%"></div></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="p-8 text-center text-secondary font-body-sm text-body-sm"><span class="material-symbols-outlined text-[32px] text-surface-container-high block mb-2">location_off</span>No locations assigned</div>`}
          </div>

          <!-- Movement History -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Movement History</h2>
            ${movements.length ? `
              <div class="space-y-2">
                ${movements.map(m => `
                  <div class="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/40 hover:bg-surface-container-low transition-colors">
                    <div class="flex items-center gap-3">
                      <span class="px-2 py-0.5 rounded bg-surface-container font-mono text-label-sm font-semibold text-on-surface">${m.ref}</span>
                      <div>
                        <div class="font-body-sm text-body-sm text-on-surface font-medium">${m.operation}</div>
                        <div class="font-label-sm text-label-sm text-secondary">${m.timestamp}</div>
                      </div>
                    </div>
                    <span class="font-mono font-semibold ${m.qty.startsWith('+') ? 'text-emerald-600' : m.qty.startsWith('-') ? 'text-error' : 'text-on-surface'}">${m.qty}</span>
                  </div>
                `).join('')}
              </div>
            ` : `<div class="p-8 text-center text-secondary font-body-sm text-body-sm">No movement history for this product</div>`}
          </div>
        </div>

        <!-- Right Sidebar -->
        <div class="lg:col-span-4 flex flex-col gap-6">
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Product Information</h3>
            <div class="space-y-3">
              ${infoRow('SKU', p.sku)}
              ${infoRow('Category', p.category)}
              ${infoRow('Unit', p.unit)}
              ${infoRow('Reorder Level', `${p.reorderLevel} ${p.unit}`)}
              ${infoRow('Status', p.status)}
              ${infoRow('Locations', p.locations.length ? p.locations.map(l => l.warehouse).join(', ') : 'None')}
            </div>
          </div>

          <!-- Stock Health -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Stock Health</h3>
            <div class="relative pt-2">
              <div class="w-full bg-surface-container-low rounded-full h-3 overflow-hidden">
                <div class="h-full rounded-full transition-all ${p.status === 'Out of Stock' ? 'bg-error' : p.status === 'Low Stock' ? 'bg-primary-container' : 'bg-emerald-500'}" style="width:${p.totalStock > 0 ? Math.min((p.totalStock / (p.reorderLevel * 5)) * 100, 100) : 0}%"></div>
              </div>
              <div class="flex justify-between mt-2 font-label-sm text-label-sm text-secondary">
                <span>0</span>
                <span class="text-primary-container font-medium">Reorder: ${p.reorderLevel}</span>
                <span>Max</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function infoRow(label, value) {
  return `<div class="flex items-center justify-between py-2 border-b border-surface-container last:border-0"><span class="font-body-sm text-body-sm text-secondary">${label}</span><span class="font-body-sm text-body-sm text-on-surface font-medium">${value}</span></div>`;
}
