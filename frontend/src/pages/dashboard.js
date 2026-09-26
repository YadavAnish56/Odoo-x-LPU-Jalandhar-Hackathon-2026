import data from '../data.js';

export default function renderDashboard(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full">
      <!-- Top Hero Section -->
      <section class="w-full pt-4 pb-10">
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <!-- Left Hero -->
          <div class="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-6">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-fixed text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse"></span>
              Inventory Overview
            </div>
            <h1 class="font-display text-display text-on-surface font-semibold tracking-tight mt-4 leading-[1.08] max-w-xl">
              Know your stock.<br/>
              <span class="text-on-surface-variant font-light">Control every movement.</span>
            </h1>
            <p class="font-body-lg text-body-lg text-secondary max-w-lg mt-4 leading-relaxed">
              Track inventory precision, warehouse floor throughput, and synchronized stock transitions from a unified command deck.
            </p>
            <div class="flex flex-wrap items-center gap-3 mt-7">
              <button onclick="window.location.hash='#operations'" class="group inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md transition-all shadow-[0_2px_8px_rgba(249,115,22,0.22)] active:scale-[0.99]" type="button">
                <span class="material-symbols-outlined text-[18px] transition-transform group-hover:rotate-90">add</span>
                <span>New Operation</span>
              </button>
              <button class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low text-on-surface font-label-md text-label-md transition-all shadow-sm active:scale-[0.99]" type="button">
                <span class="material-symbols-outlined text-[18px] text-secondary">file_download</span>
                <span>Export Report</span>
              </button>
            </div>
            <div class="flex items-center gap-6 mt-6 pt-5 text-secondary font-label-sm text-label-sm">
              <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Sync speed 14ms</span>
              <span class="text-surface-variant">•</span>
              <span>Buffer health: 99.4%</span>
              <span class="text-surface-variant">•</span>
              <span>${data.warehouses.length} Connected hubs</span>
            </div>
          </div>
          <!-- Right Floating Card -->
          <div class="lg:col-span-5 relative flex items-center justify-center p-4 lg:p-8">
            <div class="absolute inset-0 bg-gradient-to-tr from-primary-container/10 via-primary-fixed/20 to-transparent blur-3xl -z-10 rounded-full scale-90"></div>
            <div class="relative w-full max-w-md">
              <div class="absolute -top-4 -right-3 z-20 flex items-center gap-2 bg-surface-container-lowest text-emerald-700 px-3.5 py-2 rounded-xl shadow-lg font-label-sm text-label-sm backdrop-blur-md animate-bounce [animation-duration:3.8s]">
                <span class="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700"><span class="material-symbols-outlined text-[12px]">south_west</span></span>
                <span class="font-semibold">+100 kg</span> Received
              </div>
              <div class="relative z-10 bg-surface-container-lowest rounded-2xl p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)] transition-all cursor-pointer group" onclick="window.location.hash='#product-detail-1'">
                <div class="flex items-start justify-between">
                  <div>
                    <span class="font-label-sm text-label-sm font-mono tracking-wider text-secondary uppercase">SKU: STL-001</span>
                    <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5 group-hover:text-primary transition-colors">High-Yield Steel Rod</h3>
                  </div>
                  <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>In Stock</span>
                </div>
                <div class="mt-6 flex items-baseline justify-between">
                  <div>
                    <div class="font-metric-val text-metric-val text-on-surface font-semibold tracking-tight">500 <span class="text-headline-sm text-secondary font-normal">kg</span></div>
                    <p class="font-body-sm text-body-sm text-secondary mt-0.5">Physical Count • Bay 04-A</p>
                  </div>
                  <svg class="w-24 h-10 text-primary-container" fill="none" viewBox="0 0 100 40"><path d="M0 32 Q25 35 40 18 T75 22 T100 8" stroke="currentColor" stroke-linecap="round" stroke-width="2.5"></path><path d="M0 32 Q25 35 40 18 T75 22 T100 8 L100 40 L0 40 Z" fill="currentColor" fill-opacity="0.08"></path></svg>
                </div>
                <div class="mt-5 w-full bg-surface-container-low rounded-full h-2 overflow-hidden">
                  <div class="bg-primary-container h-full rounded-full transition-all duration-1000" style="width: 72%;"></div>
                </div>
                <div class="mt-2 flex items-center justify-between text-secondary font-label-sm text-label-sm">
                  <span>Safety Threshold: 120 kg</span><span class="text-primary font-medium flex items-center gap-0.5">View details <span class="material-symbols-outlined text-[13px]">arrow_forward</span></span>
                </div>
              </div>
              <div class="absolute -bottom-4 -left-4 z-20 flex items-center gap-2 bg-surface-container-lowest text-on-surface px-3.5 py-2 rounded-xl shadow-lg font-label-sm text-label-sm backdrop-blur-md">
                <span class="flex items-center justify-center w-4 h-4 rounded-full bg-surface-container-high text-secondary"><span class="material-symbols-outlined text-[12px]">north_east</span></span>
                <span class="font-semibold text-error">-20 kg</span> Dispatched
              </div>
              <div class="absolute -bottom-6 right-2 z-20 flex items-center gap-2 bg-primary-fixed text-primary px-3.5 py-2 rounded-xl shadow-md font-label-sm text-label-sm">
                <span class="material-symbols-outlined text-[14px]">sync_alt</span>
                <span class="font-semibold">40 kg</span> Transferred
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- KPI Grid -->
      <section class="w-full mt-2 mb-10">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <!-- Hero Card -->
          <div onclick="window.location.hash='#products'" class="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-on-background via-inverse-surface to-[#222121] text-surface p-6 shadow-md flex flex-col justify-between min-h-[170px] group cursor-pointer hover:shadow-lg transition-all">
            <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-primary-container/25 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
            <div class="flex items-start justify-between relative z-10">
              <div>
                <div class="font-label-sm text-label-sm tracking-wider uppercase text-surface-variant font-medium">Total Inventory Value & Units</div>
                <div class="font-metric-val text-metric-val text-surface font-semibold tracking-tight mt-1.5">${data.kpis.totalStock.toLocaleString()} <span class="font-headline-sm text-surface-variant font-normal">units</span></div>
              </div>
              <span class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-label-sm text-label-sm">
                <span class="material-symbols-outlined text-[13px]">trending_up</span>+${data.kpis.growthPercent}%
              </span>
            </div>
            <div class="relative z-10 pt-4 flex items-center justify-between">
              <div class="font-headline-sm text-headline-sm text-inverse-on-surface font-medium tracking-tight">$${data.kpis.totalValue.toLocaleString()} <span class="text-surface-variant font-body-sm text-body-sm font-normal">Active Value</span></div>
              <div class="w-2.5 h-2.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_12px_#f97316]"></div>
            </div>
          </div>
          ${kpiCard('Low Stock', data.kpis.lowStockItems, 'items', 'Below buffer threshold', 'warning', 'primary-fixed', 'primary', false, '#products')}
          ${kpiCard('Out of Stock', data.kpis.outOfStockItems, 'SKUs', '', 'block', 'error-container', 'error', true, '#products')}
          ${kpiCard('Pending Receipts', data.kpis.pendingReceipts, '', 'Incoming freight dock', 'move_to_inbox', 'surface-container', 'on-surface', false, '#operations')}
          ${kpiCard('Pending Outbound', data.kpis.pendingDeliveries, '', 'Scheduled today', 'local_shipping', 'surface-container', 'on-surface', false, '#operations')}
        </div>
      </section>

      <!-- Main Workspace -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <!-- LEFT 2/3 -->
        <div class="lg:col-span-8 flex flex-col gap-8">
          <!-- Chart Card -->
          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Inventory Movement</h2>
                <p class="font-body-sm text-body-sm text-secondary mt-0.5">Physical intake vs. fulfillment velocity</p>
              </div>
              <div class="inline-flex items-center bg-surface-container-low p-1 rounded-xl font-label-md text-label-md">
                <button class="px-3 py-1 rounded-lg text-secondary hover:text-on-surface transition-colors">7 Days</button>
                <button class="px-3 py-1 rounded-lg bg-surface-container-lowest text-on-surface font-semibold shadow-sm">30 Days</button>
                <button class="px-3 py-1 rounded-lg text-secondary hover:text-on-surface transition-colors">90 Days</button>
              </div>
            </div>
            <div class="flex flex-wrap items-center justify-between gap-4 mt-6 pt-3">
              <div class="flex items-center gap-5 font-label-sm text-label-sm">
                <span class="flex items-center gap-2 text-on-surface"><span class="w-3 h-1 bg-on-background rounded-full"></span>Inbound Receipts</span>
                <span class="flex items-center gap-2 text-on-surface"><span class="w-3 h-1 bg-primary-container rounded-full"></span>Outbound Dispatches</span>
              </div>
              <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-high text-on-surface font-label-sm text-label-sm">
                <span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span>Peak: <span class="font-semibold text-primary">+480 kg</span> (Sep 21)
              </div>
            </div>
            <div class="relative w-full h-64 mt-4 select-none">
              <svg class="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 680 200">
                <defs><linearGradient id="orangeGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#f97316" stop-opacity="0.18"/><stop offset="100%" stop-color="#f97316" stop-opacity="0"/></linearGradient></defs>
                <line stroke="#efeded" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="680" y1="30" y2="30"/>
                <line stroke="#efeded" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="680" y1="85" y2="85"/>
                <line stroke="#efeded" stroke-dasharray="3 3" stroke-width="1" x1="0" x2="680" y1="140" y2="140"/>
                <line stroke="#efeded" stroke-width="1" x1="0" x2="680" y1="195" y2="195"/>
                <path d="M0,165 C80,150 140,80 220,95 C300,110 360,170 440,110 C510,55 580,45 680,80 L680,195 L0,195 Z" fill="url(#orangeGrad)"/>
                <path d="M0,140 C90,130 160,50 240,65 C320,80 390,140 480,90 C560,45 610,60 680,30" fill="none" stroke="#1b1c1c" stroke-linecap="round" stroke-width="2.5"/>
                <path d="M0,165 C80,150 140,80 220,95 C300,110 360,170 440,110 C510,55 580,45 680,80" fill="none" stroke="#f97316" stroke-linecap="round" stroke-width="2.5"/>
                <circle cx="560" cy="50" fill="#f97316" r="4.5" stroke="#ffffff" stroke-width="2"/>
                <line stroke="#f97316" stroke-dasharray="2 2" stroke-opacity="0.6" stroke-width="1" x1="560" x2="560" y1="50" y2="195"/>
              </svg>
              <div class="absolute top-4 left-[75%] -translate-x-1/2 bg-surface-container-lowest text-on-surface shadow-xl rounded-xl p-2.5 font-label-sm text-label-sm pointer-events-none">
                <div class="text-secondary">Thu, 21 Sep</div>
                <div class="font-semibold text-primary-container">+480 kg Peak Flow</div>
                <div class="text-secondary text-[10px]">Main Warehouse Hub</div>
              </div>
            </div>
            <div class="flex items-center justify-between text-secondary font-label-sm text-label-sm mt-3 pt-2">
              <span>01 Sep</span><span>07 Sep</span><span>14 Sep</span><span>21 Sep</span><span>28 Sep</span><span>Today</span>
            </div>
          </div>

          <!-- Transit Corridor -->
          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Active Transit Corridor</h3>
                <p class="font-body-sm text-body-sm text-secondary">Physical inter-facility balance transfer</p>
              </div>
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-ping"></span>Transfer in progress</span>
            </div>
            <div class="mt-6 p-6 rounded-2xl bg-surface-container-low flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div class="w-full md:w-56 bg-surface-container-lowest rounded-xl p-4 shadow-sm relative z-10">
                <div class="flex items-center justify-between"><span class="font-label-sm text-label-sm font-semibold text-secondary uppercase">Source Hub</span><span class="material-symbols-outlined text-[16px] text-secondary">warehouse</span></div>
                <div class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">Main Warehouse</div>
                <div class="flex items-baseline justify-between mt-2 pt-2"><span class="font-body-sm text-body-sm text-secondary">Remaining</span><span class="font-headline-sm text-headline-sm text-on-surface font-semibold">300 <span class="font-label-md text-label-md text-secondary">kg</span></span></div>
                <div class="w-full bg-surface-container-high rounded-full h-1.5 mt-2"><div class="bg-on-surface h-full rounded-full" style="width:60%"></div></div>
              </div>
              <div class="flex-1 flex flex-col items-center justify-center relative w-full my-2 md:my-0">
                <div class="w-full h-0.5 border-t-2 border-dashed border-outline-variant relative">
                  <div class="absolute -top-1.5 left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <span class="px-3 py-1 rounded-full bg-primary text-on-primary font-label-sm text-label-sm font-semibold shadow-md flex items-center gap-1.5"><span class="material-symbols-outlined text-[14px]">arrow_forward</span>40 kg transfer</span>
                  </div>
                </div>
                <span class="text-secondary font-label-sm text-label-sm mt-5">Transit Ref: TRF-012 • Pallet #3</span>
              </div>
              <div class="w-full md:w-56 bg-surface-container-lowest rounded-xl p-4 shadow-sm relative z-10">
                <div class="flex items-center justify-between"><span class="font-label-sm text-label-sm font-semibold text-secondary uppercase">Destination</span><span class="material-symbols-outlined text-[16px] text-primary-container">precision_manufacturing</span></div>
                <div class="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">Production Floor</div>
                <div class="flex items-baseline justify-between mt-2 pt-2"><span class="font-body-sm text-body-sm text-secondary">Post Intake</span><span class="font-headline-sm text-headline-sm text-primary font-semibold">240 <span class="font-label-md text-label-md text-secondary">kg</span></span></div>
                <div class="w-full bg-surface-container-high rounded-full h-1.5 mt-2"><div class="bg-primary-container h-full rounded-full" style="width:80%"></div></div>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT 1/3 -->
        <div class="lg:col-span-4 flex flex-col gap-6">
          <!-- Low Stock Alert -->
          <div class="w-full bg-primary-fixed/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div class="flex items-center justify-between">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-container text-on-primary font-label-sm text-label-sm font-semibold uppercase tracking-wider"><span class="material-symbols-outlined text-[13px]">notification_important</span>Urgent Reorder</span>
              <span class="font-label-sm text-label-sm font-mono text-primary font-semibold">Critical Level</span>
            </div>
            <div class="mt-4 bg-surface-container-lowest rounded-xl p-4 shadow-sm">
              <div class="flex items-start justify-between">
                <div><span class="font-label-sm text-label-sm font-mono text-secondary">STL-001</span><h4 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Steel Rod 12mm</h4></div>
                <span class="px-2 py-0.5 rounded bg-error-container text-error font-label-sm text-label-sm font-semibold">-25% Deficit</span>
              </div>
              <div class="mt-3 flex items-baseline justify-between">
                <div><div class="font-headline-md text-headline-md text-primary font-semibold">15 kg</div><div class="font-body-sm text-body-sm text-secondary">Safety Min: 20 kg</div></div>
                <button onclick="window.location.hash='#products'" class="px-4 py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md font-semibold transition-all shadow-sm">Review Stock</button>
              </div>
            </div>
            <div class="mt-3 bg-surface-container-lowest/80 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div class="font-label-sm text-label-sm font-mono text-secondary">ALM-089</div>
                <div class="font-body-md text-body-md text-on-surface font-medium">Aluminum Alloy 6061</div>
                <div class="font-body-sm text-body-sm text-error font-medium mt-0.5">15 kg left (Reorder: 40 kg)</div>
              </div>
              <button class="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors" title="Quick PO"><span class="material-symbols-outlined text-[18px]">add_shopping_cart</span></button>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h4 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Quick Actions</h4>
            <p class="font-body-sm text-body-sm text-secondary mt-0.5">Immediate logistical triggers</p>
            <div class="mt-5 flex flex-col gap-2.5">
              ${quickAction('barcode_scanner', 'Scan Barcode / Batch', 'Mobile camera or reader')}
              ${quickAction('sync_alt', 'Internal Transfer Order', 'Move stock between bays', '#operations')}
              ${quickAction('checklist', 'Launch Cycle Count', 'Initiate spot audit')}
            </div>
          </div>

          <!-- Hub Capacity -->
          <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Hub Capacity</h4>
              <span class="font-label-sm text-label-sm text-secondary">Total: ${data.warehouses.length} Sites</span>
            </div>
            <div class="space-y-4">
              ${data.warehouses.map(w => `
                <div>
                  <div class="flex justify-between font-label-sm text-label-sm mb-1"><span class="font-medium text-on-surface">${w.name}</span><span class="text-secondary font-mono">${w.capacity}%</span></div>
                  <div class="w-full bg-surface-container-low h-2 rounded-full overflow-hidden"><div class="bg-primary-container h-full rounded-full" style="width:${w.capacity}%"></div></div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Operations Table -->
      <section class="w-full mt-8">
        <div class="w-full bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5">
            <div>
              <h3 class="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">Recent Operations</h3>
              <p class="font-body-sm text-body-sm text-secondary mt-0.5">Live inventory activity audit</p>
            </div>
            <div class="flex items-center gap-3">
              <a onclick="window.location.hash='#ledger'" class="inline-flex items-center gap-1 font-label-md text-label-md text-primary hover:text-primary-container font-semibold transition-colors cursor-pointer">
                View full ledger<span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </a>
            </div>
          </div>
          <div class="w-full overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
                  <th class="py-3 px-4 rounded-l-xl">Ref Code</th>
                  <th class="py-3 px-4">Operation</th>
                  <th class="py-3 px-4">Item</th>
                  <th class="py-3 px-4 text-right">Delta</th>
                  <th class="py-3 px-4">Location</th>
                  <th class="py-3 px-4">Status</th>
                  <th class="py-3 px-4 rounded-r-xl text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody class="font-body-sm text-body-sm text-on-surface">
                ${data.moveHistory.slice(0, 4).map(m => `
                  <tr onclick="window.location.hash='#ledger'" class="hover:bg-surface-container-low/70 transition-colors cursor-pointer group">
                    <td class="py-3.5 px-4 font-mono font-semibold ${m.opColor === 'green' ? 'text-primary' : 'text-on-surface'} group-hover:text-primary transition-colors">${m.ref}</td>
                    <td class="py-3.5 px-4"><span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] ${opIconColor(m.opColor)}">${opIcon(m.operation)}</span>${m.operation}</span></td>
                    <td class="py-3.5 px-4 font-medium">${m.product}</td>
                    <td class="py-3.5 px-4 text-right font-mono font-semibold ${m.qty.startsWith('+') ? 'text-emerald-600' : m.qty.startsWith('-') ? 'text-error' : 'text-on-surface'}">${m.qty}</td>
                    <td class="py-3.5 px-4 text-secondary">${m.to !== '—' ? m.to : m.from}</td>
                    <td class="py-3.5 px-4">${statusBadgeSmall(m.status, m.opColor)}</td>
                    <td class="py-3.5 px-4 text-right text-secondary font-mono">${m.timestamp}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  `;
}

function kpiCard(title, value, unit, subtitle, icon, iconBg, iconColor, showLink = false, targetRoute = '#products') {
  return `
    <div onclick="window.location.hash='${targetRoute}'" class="lg:col-span-1 rounded-2xl bg-surface-container-lowest p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col justify-between cursor-pointer group">
      <div class="flex items-center justify-between">
        <span class="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-medium">${title}</span>
        <span class="p-1 rounded-lg bg-${iconBg} text-${iconColor} group-hover:scale-110 transition-transform"><span class="material-symbols-outlined text-[16px]">${icon}</span></span>
      </div>
      <div class="mt-3">
        <div class="font-metric-val text-metric-val ${title === 'Low Stock' ? 'text-primary-container' : 'text-on-surface'} font-semibold tracking-tight">${value} ${unit ? `<span class="text-body-md text-secondary font-normal">${unit}</span>` : ''}</div>
        ${subtitle ? `<p class="font-body-sm text-body-sm text-secondary mt-0.5">${subtitle}</p>` : ''}
        ${showLink ? `<span class="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary group-hover:text-primary-container mt-1 font-semibold">Prompt reorder<span class="material-symbols-outlined text-[12px]">arrow_forward</span></span>` : ''}
      </div>
    </div>`;
}

function quickAction(icon, title, subtitle, href = '#') {
  return `
    <button onclick="${href !== '#' ? `window.location.hash='${href}'` : ''}" class="w-full flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all group text-left cursor-pointer" type="button">
      <div class="flex items-center gap-3">
        <span class="p-2 rounded-lg bg-surface-container-lowest text-primary-container shadow-sm group-hover:scale-105 transition-transform"><span class="material-symbols-outlined text-[20px]">${icon}</span></span>
        <div><div class="font-body-md text-body-md text-on-surface font-medium">${title}</div><div class="font-label-sm text-label-sm text-secondary">${subtitle}</div></div>
      </div>
      <span class="material-symbols-outlined text-secondary group-hover:translate-x-1 transition-transform">chevron_right</span>
    </button>`;
}

function opIcon(type) {
  const map = { Receipt: 'move_to_inbox', Delivery: 'local_shipping', Transfer: 'sync_alt', Adjustment: 'tune' };
  return map[type] || 'help';
}
function opIconColor(color) {
  const map = { green: 'text-emerald-600', orange: 'text-primary-container', blue: 'text-secondary', gray: 'text-secondary' };
  return map[color] || 'text-secondary';
}
function statusBadgeSmall(status, color) {
  const bgMap = { green: 'bg-emerald-50 text-emerald-700', orange: 'bg-primary-fixed text-primary', gray: 'bg-surface-container text-on-surface', blue: 'bg-blue-50 text-blue-700' };
  const dotMap = { green: 'bg-emerald-500', orange: 'bg-primary-container', gray: 'bg-on-surface', blue: 'bg-blue-500' };
  return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full ${bgMap[color] || bgMap.gray} font-label-sm text-label-sm font-semibold"><span class="w-1.5 h-1.5 rounded-full ${dotMap[color] || dotMap.gray}"></span>${status}</span>`;
}
