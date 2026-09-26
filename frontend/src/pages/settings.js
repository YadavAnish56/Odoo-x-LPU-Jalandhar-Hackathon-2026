import { showToast } from '../utils.js';

export default function renderSettings(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="pt-space-md mb-space-lg">
        <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">Settings</h1>
        <p class="font-body-md text-body-md text-secondary mt-1">Configure your StockSense workspace.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sidebar Nav -->
        <div class="lg:col-span-3">
          <div class="bg-surface-container-lowest rounded-2xl p-4 shadow-sm">
            <nav class="flex flex-col gap-1">
              ${settingsNavItem('General', 'settings', true)}
              ${settingsNavItem('Inventory', 'inventory_2')}
              ${settingsNavItem('Warehouses', 'warehouse')}
              ${settingsNavItem('Notifications', 'notifications')}
              ${settingsNavItem('Account', 'person')}
            </nav>
          </div>
        </div>

        <!-- Content -->
        <div class="lg:col-span-9 flex flex-col gap-6">
          <!-- General Settings -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">General Settings</h2>
            <div class="space-y-4">
              ${settingRow('Company Name', 'text', 'StockSense Industries')}
              ${settingRow('Currency', 'text', 'USD ($)')}
              ${settingRow('Date Format', 'text', 'DD MMM YYYY')}
              ${settingRow('Timezone', 'text', 'UTC+5:30 (IST)')}
            </div>
          </div>

          <!-- Inventory Settings -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Inventory Settings</h2>
            <div class="space-y-4">
              ${settingToggle('Auto-generate SKU codes', true)}
              ${settingToggle('Enable low stock email alerts', true)}
              ${settingToggle('Require reason for stock adjustments', true)}
              ${settingToggle('Enable barcode scanning', false)}
            </div>
          </div>

          <!-- Notification Preferences -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h2 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Notification Preferences</h2>
            <div class="space-y-4">
              ${settingToggle('Low stock alerts', true)}
              ${settingToggle('Receipt validation reminders', true)}
              ${settingToggle('Delivery dispatch updates', false)}
              ${settingToggle('Weekly inventory summary', true)}
            </div>
          </div>

          <div class="flex justify-end">
            <button id="save-settings" class="px-6 py-2.5 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all active:scale-[0.99]">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#save-settings')?.addEventListener('click', () => showToast('Settings saved successfully!'));
}

function settingsNavItem(label, icon, active = false) {
  return `<a class="flex items-center gap-3 px-3 py-2.5 rounded-xl ${active ? 'bg-primary-fixed text-primary font-semibold' : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'} font-label-md text-label-md transition-colors cursor-pointer"><span class="material-symbols-outlined text-[20px]">${icon}</span>${label}</a>`;
}

function settingRow(label, type, value) {
  return `<div class="flex items-center justify-between py-3 border-b border-surface-container last:border-0"><label class="font-body-md text-body-md text-on-surface font-medium">${label}</label><input type="${type}" value="${value}" class="w-64 bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2 outline-none focus:ring-2 focus:ring-primary-container transition-all text-right"/></div>`;
}

function settingToggle(label, checked) {
  return `<div class="flex items-center justify-between py-3 border-b border-surface-container last:border-0">
    <span class="font-body-md text-body-md text-on-surface">${label}</span>
    <label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer"/><div class="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary-container peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label>
  </div>`;
}
