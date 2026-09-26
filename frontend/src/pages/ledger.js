import data from '../data.js';
import { operationIcon, statusBadge } from '../utils.js';

export default function renderLedger(container) {
  let activeView = 'history'; // history | ledger

  function render() {
    container.innerHTML = `
      <div class="flex flex-col w-full pb-16">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-space-md pt-space-md mb-space-lg">
          <div>
            <div class="flex items-center gap-space-xs mb-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container"></span><span class="font-label-sm text-label-sm text-secondary uppercase tracking-widest">Audit & Traceability</span></div>
            <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Move History & Stock Ledger</h1>
            <p class="font-body-md text-body-md text-secondary mt-1">Every inventory movement, fully traceable and auditable.</p>
          </div>
          <div class="flex items-center gap-space-sm">
            <div class="relative"><span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-secondary">search</span><input class="pl-9 pr-4 py-2 w-64 rounded-xl bg-surface-container-lowest text-on-surface text-body-sm font-body-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-container transition-all" placeholder="Search by ref, product..." type="text"/></div>
          </div>
        </div>

        <!-- Tab Toggle -->
        <div class="flex items-center gap-space-xs mb-6">
          <button data-ledger-tab="history" class="px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${activeView === 'history' ? 'bg-primary-container text-white shadow-sm' : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface'}">Move History</button>
          <button data-ledger-tab="ledger" class="px-space-md py-1.5 rounded-full font-label-md text-label-md transition-colors ${activeView === 'ledger' ? 'bg-primary-container text-white shadow-sm' : 'bg-surface-container-lowest hover:bg-surface-container text-secondary hover:text-on-surface'}">Stock Ledger</button>
        </div>

        ${activeView === 'history' ? renderMoveHistory() : renderStockLedger()}
      </div>
    `;

    container.querySelectorAll('[data-ledger-tab]').forEach(btn => {
      btn.addEventListener('click', () => { activeView = btn.dataset.ledgerTab; render(); });
    });
  }

  function renderMoveHistory() {
    return `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <th class="py-3 px-4 rounded-l-xl">Timestamp</th><th class="py-3 px-4">Reference</th><th class="py-3 px-4">Operation</th><th class="py-3 px-4">Product</th><th class="py-3 px-4 text-right">Quantity</th><th class="py-3 px-4">From</th><th class="py-3 px-4">To</th><th class="py-3 px-4">User</th><th class="py-3 px-4 rounded-r-xl text-right">Status</th>
            </tr></thead>
            <tbody class="font-body-sm text-body-sm text-on-surface">
              ${data.moveHistory.map(m => `
                <tr class="hover:bg-surface-container-low/70 transition-colors">
                  <td class="py-3.5 px-4 text-secondary font-mono">${m.timestamp}</td>
                  <td class="py-3.5 px-4 font-mono font-semibold">${m.ref}</td>
                  <td class="py-3.5 px-4">${operationIcon(m.operation)}</td>
                  <td class="py-3.5 px-4 font-medium text-on-surface hover:text-primary cursor-pointer transition-colors" onclick="window.location.hash='#products'">${m.product}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-semibold ${m.qty.startsWith('+') ? 'text-emerald-600' : m.qty.startsWith('-') ? 'text-error' : 'text-on-surface'}">${m.qty}</td>
                  <td class="py-3.5 px-4 text-secondary">${m.from}</td>
                  <td class="py-3.5 px-4 text-secondary">${m.to}</td>
                  <td class="py-3.5 px-4 text-secondary">${m.user}</td>
                  <td class="py-3.5 px-4 text-right">${statusBadge(m.status, m.opColor)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  function renderStockLedger() {
    return `
      <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead><tr class="bg-surface-container-low/50 text-secondary font-label-sm text-label-sm uppercase tracking-wider">
              <th class="py-3 px-4 rounded-l-xl">Date</th><th class="py-3 px-4">Reference</th><th class="py-3 px-4">Operation</th><th class="py-3 px-4">Product</th><th class="py-3 px-4">Location</th><th class="py-3 px-4 text-right">In</th><th class="py-3 px-4 text-right">Out</th><th class="py-3 px-4 rounded-r-xl text-right">Balance</th>
            </tr></thead>
            <tbody class="font-body-sm text-body-sm text-on-surface">
              ${data.stockLedger.map(l => `
                <tr class="hover:bg-surface-container-low/70 transition-colors">
                  <td class="py-3.5 px-4 text-secondary font-mono">${l.date}</td>
                  <td class="py-3.5 px-4 font-mono font-semibold">${l.ref}</td>
                  <td class="py-3.5 px-4">${operationIcon(l.operation)}</td>
                  <td class="py-3.5 px-4 font-medium text-on-surface hover:text-primary cursor-pointer transition-colors" onclick="window.location.hash='#products'">${l.product}</td>
                  <td class="py-3.5 px-4 text-secondary">${l.location}</td>
                  <td class="py-3.5 px-4 text-right font-mono ${l.inQty > 0 ? 'text-emerald-600 font-semibold' : 'text-secondary'}">${l.inQty > 0 ? `+${l.inQty}` : '—'}</td>
                  <td class="py-3.5 px-4 text-right font-mono ${l.outQty > 0 ? 'text-error font-semibold' : 'text-secondary'}">${l.outQty > 0 ? `-${l.outQty}` : '—'}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-semibold text-on-surface">${l.balance} <span class="font-normal text-secondary">${l.unit}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  render();
}
