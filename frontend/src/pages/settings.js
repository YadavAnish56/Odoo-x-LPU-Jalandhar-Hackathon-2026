import { api, getUser } from '../api.js';
import { logout } from './auth.js';
import { emptyHTML, errorHTML, esc, fmtQty, getSetting, loadingHTML, saveSettings, showToast } from '../utils.js';

const CURRENCIES = [
  ['INR', 'Indian Rupee (₹)'],
  ['USD', 'US Dollar ($)'],
  ['EUR', 'Euro (€)'],
  ['GBP', 'British Pound (£)'],
];

const inputClass =
  'w-64 max-w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2 outline-none focus:ring-2 focus:ring-primary-container transition-all text-right';

export default function renderSettings(container) {
  const user = getUser();
  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="pt-space-md mb-space-lg">
        <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Settings</h1>
        <p class="font-body-md text-body-md text-secondary mt-1">Configure your StockSense workspace.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div class="lg:col-span-3">
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm lg:sticky lg:top-24">
            <nav class="flex flex-col gap-1">
              ${navItem('general', 'General', 'settings')}
              ${navItem('warehouses', 'Warehouses', 'warehouse')}
              ${navItem('account', 'Account', 'person')}
            </nav>
          </div>
        </div>

        <div class="lg:col-span-9 flex flex-col gap-6">
          <section id="section-general" class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">General Settings</h2>
            <p class="font-body-sm text-body-sm text-secondary mb-4">Saved in this browser.</p>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-surface-container">
                <label class="font-body-md text-body-md text-on-surface font-medium">Company Name</label>
                <input id="set-company" type="text" value="${esc(getSetting('companyName', 'StockSense Industries'))}" class="${inputClass}"/>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 py-3 border-b border-surface-container">
                <label class="font-body-md text-body-md text-on-surface font-medium">Currency</label>
                <select id="set-currency" class="${inputClass}">
                  ${CURRENCIES.map(([code, label]) => `<option value="${code}" ${getSetting('currency', 'INR') === code ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
              </div>
              <div class="flex flex-wrap items-center justify-between gap-2 py-3">
                <label class="font-body-md text-body-md text-on-surface font-medium">Timezone</label>
                <input type="text" readonly value="${esc(Intl.DateTimeFormat().resolvedOptions().timeZone)}" class="${inputClass} text-secondary"/>
              </div>
            </div>
            <div class="flex justify-end mt-4">
              <button id="save-settings" class="px-6 py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all active:scale-[0.99]">Save Changes</button>
            </div>
          </section>

          <section id="section-warehouses" class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold">Warehouses</h2>
                <p class="font-body-sm text-body-sm text-secondary">Your warehouses and their storage locations</p>
              </div>
              <a href="#warehouses" class="inline-flex items-center gap-1 px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm">Manage<span class="material-symbols-outlined text-[16px]">arrow_forward</span></a>
            </div>
            <div id="settings-warehouses">${loadingHTML()}</div>
          </section>

          <section id="section-account" class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Account</h2>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="font-body-md text-body-md text-on-surface font-medium">${esc(user?.name ?? '')}</div>
                <div class="font-body-sm text-body-sm text-secondary">${esc(user?.email ?? '')} · ${user?.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff'}</div>
              </div>
              <div class="flex items-center gap-2">
                <a href="#profile" class="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl">My Profile</a>
                <button id="settings-logout" class="px-4 py-2 bg-error-container hover:bg-error text-on-error-container hover:text-on-error font-label-md text-label-md rounded-xl transition-all">Sign Out</button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-section]').forEach((link) => {
    link.addEventListener('click', () => {
      container.querySelector(`#section-${link.dataset.section}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  container.querySelector('#save-settings').addEventListener('click', () => {
    saveSettings({
      companyName: container.querySelector('#set-company').value.trim(),
      currency: container.querySelector('#set-currency').value,
    });
    showToast('Settings saved successfully!');
  });
  container.querySelector('#settings-logout').addEventListener('click', logout);

  api
    .get('/warehouses')
    .then((warehouses) => {
      if (!container.isConnected) return;
      container.querySelector('#settings-warehouses').innerHTML = warehouses.length
        ? `<div class="divide-y divide-surface-container">${warehouses.map((w) => `
            <div class="flex items-center justify-between py-3">
              <div class="flex items-center gap-3">
                <span class="material-symbols-outlined text-secondary">warehouse</span>
                <div><div class="font-body-md text-body-md text-on-surface font-medium">${esc(w.name)} <span class="font-mono text-secondary text-label-md">${esc(w.code)}</span></div>
                <div class="font-body-sm text-body-sm text-secondary">${esc(w.address || 'No address')}</div></div>
              </div>
              <div class="text-right font-body-sm text-body-sm text-secondary">${w.locationCount} location${w.locationCount === 1 ? '' : 's'} · ${fmtQty(w.totalQuantity)} units</div>
            </div>`).join('')}</div>`
        : emptyHTML('No warehouses yet', 'warehouse');
    })
    .catch((err) => {
      if (container.isConnected) container.querySelector('#settings-warehouses').innerHTML = errorHTML(err);
    });
}

function navItem(section, label, icon) {
  return `<button data-section="${section}" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-secondary hover:text-on-surface hover:bg-surface-container-low font-label-md text-label-md transition-colors text-left"><span class="material-symbols-outlined text-[20px]">${icon}</span>${label}</button>`;
}
