import data from '../data.js';
import { statusBadge } from '../utils.js';

export default function renderWarehouses(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
        <div>
          <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Infrastructure</span></div>
          <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Warehouses & Reordering</h1>
          <p class="font-body-md text-body-md text-secondary mt-1">Manage storage locations and automated reorder thresholds.</p>
        </div>
      </div>

      <!-- Warehouse Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        ${data.warehouses.map(w => `
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
            <div class="absolute -right-8 -top-8 w-32 h-32 bg-surface-container-low rounded-full pointer-events-none group-hover:scale-125 transition-transform"></div>
            <div class="relative z-10">
              <div class="flex items-center justify-between mb-4">
                <div class="p-2.5 rounded-xl bg-surface-container text-on-surface"><span class="material-symbols-outlined text-[24px]">warehouse</span></div>
                ${w.lowStockCount > 0 ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>${w.lowStockCount} Low</span>` : '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Healthy</span>'}
              </div>
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-3">${w.name}</h3>
              <div class="grid grid-cols-3 gap-3 mb-4">
                <div class="text-center"><div class="font-headline-md text-headline-md text-on-surface font-semibold">${w.products}</div><div class="font-label-sm text-label-sm text-secondary">Products</div></div>
                <div class="text-center"><div class="font-headline-md text-headline-md text-on-surface font-semibold">${w.stockUnits.toLocaleString()}</div><div class="font-label-sm text-label-sm text-secondary">Units</div></div>
                <div class="text-center"><div class="font-headline-md text-headline-md ${w.lowStockCount > 0 ? 'text-primary-container' : 'text-emerald-600'} font-semibold">${w.lowStockCount}</div><div class="font-label-sm text-label-sm text-secondary">Low</div></div>
              </div>
              <div class="mb-3">
                <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="text-secondary">Capacity</span><span class="font-mono text-on-surface font-medium">${w.capacity}%</span></div>
                <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden"><div class="bg-primary-container h-full rounded-full transition-all" style="width:${w.capacity}%"></div></div>
              </div>
              <div class="flex flex-wrap gap-1.5">
                ${w.locations.slice(0, 4).map(l => `<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-secondary">${l}</span>`).join('')}
                ${w.locations.length > 4 ? `<span class="px-2 py-0.5 bg-surface-container-low rounded text-label-sm font-label-sm text-secondary">+${w.locations.length - 4} more</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Reordering Rules -->
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Reordering Rules</h2>
            <p class="font-body-sm text-body-sm text-secondary mt-0.5">Automated stock threshold monitoring</p>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                <th class="py-3 px-4 rounded-l-xl">Product</th>
                <th class="py-3 px-4">SKU</th>
                <th class="py-3 px-4">Location</th>
                <th class="py-3 px-4 text-right">Min Stock</th>
                <th class="py-3 px-4 text-right">Max Stock</th>
                <th class="py-3 px-4 text-right">Current</th>
                <th class="py-3 px-4 rounded-r-xl text-right">Status</th>
              </tr>
            </thead>
            <tbody class="font-body-sm text-body-sm text-on-surface">
              ${data.reorderRules.map(r => {
                const statusColor = r.status === 'OK' ? 'green' : r.status === 'Warning' ? 'amber' : 'red';
                const pct = r.maxStock > 0 ? (r.currentStock / r.maxStock) * 100 : 0;
                return `
                  <tr class="hover:bg-surface-container-low/50 transition-colors">
                    <td class="py-3.5 px-4 font-medium">${r.product}</td>
                    <td class="py-3.5 px-4 font-mono text-secondary">${r.sku}</td>
                    <td class="py-3.5 px-4 text-secondary">${r.location}</td>
                    <td class="py-3.5 px-4 text-right font-mono">${r.minStock}</td>
                    <td class="py-3.5 px-4 text-right font-mono">${r.maxStock}</td>
                    <td class="py-3.5 px-4 text-right">
                      <div class="flex items-center justify-end gap-2">
                        <div class="w-16 bg-surface-container-low h-1.5 rounded-full overflow-hidden"><div class="h-full rounded-full ${r.status === 'Critical' ? 'bg-error' : r.status === 'Warning' ? 'bg-amber-500' : 'bg-emerald-500'}" style="width:${pct}%"></div></div>
                        <span class="font-mono font-semibold ${r.status === 'Critical' ? 'text-error' : 'text-on-surface'}">${r.currentStock}</span>
                      </div>
                    </td>
                    <td class="py-3.5 px-4 text-right">${statusBadge(r.status, statusColor)}</td>
                  </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
