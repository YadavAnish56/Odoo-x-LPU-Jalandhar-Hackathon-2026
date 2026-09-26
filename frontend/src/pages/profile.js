import { showToast } from '../utils.js';

export default function renderProfile(container) {
  container.innerHTML = `
    <div class="flex flex-col w-full pb-16">
      <div class="pt-space-md mb-space-lg">
        <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">My Profile</h1>
        <p class="font-body-md text-body-md text-secondary mt-1">Manage your account and preferences.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Profile Card -->
        <div class="lg:col-span-4">
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center">
            <div class="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-headline-lg text-headline-lg font-semibold mx-auto mb-4">RS</div>
            <h2 class="font-headline-md text-headline-md text-on-surface font-semibold">Rajesh Sharma</h2>
            <p class="font-body-sm text-body-sm text-secondary mt-1">Inventory Manager</p>
            <div class="flex items-center justify-center gap-1.5 mt-2">
              <span class="w-2 h-2 rounded-full bg-green-500"></span>
              <span class="font-label-sm text-label-sm text-secondary">Online</span>
            </div>
            <div class="mt-6 pt-4 border-t border-surface-container space-y-3">
              ${profileItem('email', 'rajesh@stocksense.com')}
              ${profileItem('badge', 'Inventory Manager')}
              ${profileItem('calendar_today', 'Joined Sep 2024')}
              ${profileItem('location_on', 'Mumbai, India')}
            </div>
          </div>
        </div>

        <!-- Details -->
        <div class="lg:col-span-8 flex flex-col gap-6">
          <!-- Profile Details -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Profile Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="flex flex-col gap-1"><label class="font-label-md text-label-md text-secondary">Full Name</label><input type="text" value="Rajesh Sharma" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/></div>
              <div class="flex flex-col gap-1"><label class="font-label-md text-label-md text-secondary">Email</label><input type="email" value="rajesh@stocksense.com" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/></div>
              <div class="flex flex-col gap-1"><label class="font-label-md text-label-md text-secondary">Phone</label><input type="tel" value="+91 98765 43210" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/></div>
              <div class="flex flex-col gap-1"><label class="font-label-md text-label-md text-secondary">Role</label><input type="text" value="Inventory Manager" readonly class="w-full bg-surface-container-low text-secondary font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none"/></div>
            </div>
            <div class="flex justify-end mt-4"><button id="save-profile" class="px-5 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all">Update Profile</button></div>
          </div>

          <!-- Security -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Security</h3>
            <div class="space-y-4">
              <div class="flex items-center justify-between py-3 border-b border-surface-container">
                <div><div class="font-body-md text-body-md text-on-surface font-medium">Password</div><div class="font-body-sm text-body-sm text-secondary">Last changed 30 days ago</div></div>
                <button class="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors">Change Password</button>
              </div>
              <div class="flex items-center justify-between py-3 border-b border-surface-container">
                <div><div class="font-body-md text-body-md text-on-surface font-medium">Two-Factor Authentication</div><div class="font-body-sm text-body-sm text-secondary">Add extra security to your account</div></div>
                <button class="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors">Enable</button>
              </div>
              <div class="flex items-center justify-between py-3">
                <div><div class="font-body-md text-body-md text-on-surface font-medium">Active Sessions</div><div class="font-body-sm text-body-sm text-secondary">1 active session on this device</div></div>
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Current</span>
              </div>
            </div>
          </div>

          <!-- Notification Preferences -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Notification Preferences</h3>
            <div class="space-y-3">
              ${notifToggle('Email notifications for low stock alerts', true)}
              ${notifToggle('Push notifications for receipt arrivals', true)}
              ${notifToggle('Weekly inventory digest', false)}
              ${notifToggle('Monthly performance report', true)}
            </div>
          </div>

          <!-- Danger Zone -->
          <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-error-container">
            <h3 class="font-headline-sm text-headline-sm text-error font-semibold mb-2">Danger Zone</h3>
            <p class="font-body-sm text-body-sm text-secondary mb-4">Irreversible actions. Proceed with caution.</p>
            <div class="flex items-center gap-3">
              <button onclick="document.getElementById('auth-screen').classList.remove('hidden'); document.getElementById('app-shell').classList.add('hidden')" class="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors">Sign Out</button>
              <button class="px-4 py-2 bg-error-container hover:bg-error text-on-error-container hover:text-on-error font-label-md text-label-md rounded-xl transition-all">Delete Account</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#save-profile')?.addEventListener('click', () => showToast('Profile updated!'));
}

function profileItem(icon, text) {
  return `<div class="flex items-center gap-3 text-left"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span><span class="font-body-sm text-body-sm text-on-surface">${text}</span></div>`;
}

function notifToggle(label, checked) {
  return `<div class="flex items-center justify-between py-2"><span class="font-body-sm text-body-sm text-on-surface">${label}</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" ${checked ? 'checked' : ''} class="sr-only peer"/><div class="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary-container peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label></div>`;
}
