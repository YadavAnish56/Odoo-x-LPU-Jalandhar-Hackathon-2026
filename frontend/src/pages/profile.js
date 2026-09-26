import { api, getUser, isManager, updateSession } from '../api.js';
import { logout } from './auth.js';
import { invalidateLookups } from '../store.js';
import { errorHTML, esc, fmtDate, formField, getSetting, initials, loadingHTML, readForm, saveSettings, showError, showModal, showToast } from '../utils.js';

const ROLE_LABEL = { manager: 'Inventory Manager', staff: 'Warehouse Staff' };
const NOTIFICATIONS = [
  ['notifyLowStock', 'Show low stock alerts', true],
  ['notifyReceipts', 'Remind me about late receipts', true],
  ['notifyDeliveries', 'Delivery dispatch updates', false],
];

export default function renderProfile(container) {
  container.innerHTML = loadingHTML('Loading profile...');

  async function load() {
    try {
      const user = await api.get('/users/me');
      const team = isManager() ? await api.get('/users') : [];
      if (!container.isConnected) return;
      updateSession({ user });
      render(user, team);
    } catch (err) {
      if (container.isConnected) container.innerHTML = errorHTML(err);
    }
  }

  function render(user, team) {
    container.innerHTML = `
      <div class="flex flex-col w-full pb-16">
        <div class="pt-space-md mb-space-lg">
          <h1 class="font-headline-lg text-headline-lg text-on-surface tracking-tight">My Profile</h1>
          <p class="font-body-md text-body-md text-secondary mt-1">Manage your account and preferences.</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div class="lg:col-span-4">
            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm text-center">
              <div class="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-headline-lg text-headline-lg font-semibold mx-auto mb-4">${esc(initials(user.name))}</div>
              <h2 class="font-headline-md text-headline-md text-on-surface font-semibold">${esc(user.name)}</h2>
              <p class="font-body-sm text-body-sm text-secondary mt-1">${ROLE_LABEL[user.role]}</p>
              <div class="flex items-center justify-center gap-1.5 mt-2">
                <span class="w-2 h-2 rounded-full bg-green-500"></span>
                <span class="font-label-sm text-label-sm text-secondary">Online</span>
              </div>
              <div class="mt-6 pt-4 border-t border-surface-container space-y-3">
                ${profileItem('email', esc(user.email))}
                ${profileItem('badge', ROLE_LABEL[user.role])}
                ${profileItem('calendar_today', `Joined ${fmtDate(user.createdAt)}`)}
              </div>
            </div>
          </div>

          <div class="lg:col-span-8 flex flex-col gap-6">
            <form id="profile-form" class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Profile Details</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${formField('Full Name', 'text', 'name', user.name, '', [], { required: true })}
                ${formField('Email', 'email', 'email', user.email, '', [], { required: true })}
                <div class="flex flex-col gap-1"><label class="font-label-md text-label-md text-secondary">Role</label><input type="text" value="${ROLE_LABEL[user.role]}" readonly class="w-full bg-surface-container-low text-secondary font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none"/></div>
              </div>
              <div class="flex justify-end mt-4"><button type="submit" class="px-5 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all disabled:opacity-60">Update Profile</button></div>
            </form>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Security</h3>
              <div class="space-y-4">
                <div class="flex items-center justify-between py-3 border-b border-surface-container">
                  <div><div class="font-body-md text-body-md text-on-surface font-medium">Password</div><div class="font-body-sm text-body-sm text-secondary">Changing it signs you out on other devices</div></div>
                  <button id="change-password" class="px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors">Change Password</button>
                </div>
                <div class="flex items-center justify-between py-3">
                  <div><div class="font-body-md text-body-md text-on-surface font-medium">Active Session</div><div class="font-body-sm text-body-sm text-secondary">Signing out ends all your sessions</div></div>
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-label-sm text-label-sm"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Current</span>
                </div>
              </div>
            </div>

            ${team.length ? `
            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">Team</h3>
              <p class="font-body-sm text-body-sm text-secondary mb-4">Managers can manage products, warehouses and rules; staff run daily operations.</p>
              <div class="divide-y divide-surface-container">
                ${team.map((u) => `
                  <div class="flex items-center justify-between gap-3 py-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-label-md text-label-md font-semibold text-on-surface">${esc(initials(u.name))}</div>
                      <div class="min-w-0"><div class="font-body-sm text-body-sm text-on-surface font-medium truncate">${esc(u.name)}${u.id === user.id ? ' <span class="text-secondary">(you)</span>' : ''}</div><div class="font-label-sm text-label-sm text-secondary truncate">${esc(u.email)}</div></div>
                    </div>
                    <select data-role-user="${u.id}" ${u.id === user.id ? 'disabled' : ''} class="bg-surface-container-low text-on-surface font-label-md text-label-md rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-primary-container disabled:opacity-60">
                      ${Object.entries(ROLE_LABEL).map(([k, v]) => `<option value="${k}" ${u.role === k ? 'selected' : ''}>${v}</option>`).join('')}
                    </select>
                  </div>`).join('')}
              </div>
            </div>` : ''}

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              <h3 class="font-headline-sm text-headline-sm text-on-surface font-semibold mb-4">Notification Preferences</h3>
              <div class="space-y-3">${NOTIFICATIONS.map(([key, label, def]) => notifToggle(key, label, getSetting(key, def))).join('')}</div>
            </div>

            <div class="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-error-container">
              <h3 class="font-headline-sm text-headline-sm text-error font-semibold mb-2">Sign Out</h3>
              <p class="font-body-sm text-body-sm text-secondary mb-4">You will need to sign in again on every device.</p>
              <button id="sign-out" class="px-4 py-2 bg-error-container hover:bg-error text-on-error-container hover:text-on-error font-label-md text-label-md rounded-xl transition-all">Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    `;

    const form = container.querySelector('#profile-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const v = readForm(form);
        const updated = await api.put('/users/me', { name: v.name, email: v.email });
        updateSession({ user: updated });
        invalidateLookups();
        window.dispatchEvent(new CustomEvent('stocksense:profile-updated'));
        showToast('Profile updated!');
        render(updated, team.map((u) => (u.id === updated.id ? updated : u)));
      } catch (err) {
        showError(err);
        btn.disabled = false;
      }
    });

    container.querySelector('#change-password').addEventListener('click', openPasswordForm);
    container.querySelector('#sign-out').addEventListener('click', logout);

    container.querySelectorAll('[data-role-user]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          const updated = await api.patch(`/users/${select.dataset.roleUser}/role`, { role: select.value });
          showToast(`${updated.name} is now ${ROLE_LABEL[updated.role]}`);
          invalidateLookups();
        } catch (err) {
          showError(err);
          load();
        }
      });
    });

    container.querySelectorAll('[data-setting]').forEach((input) => {
      input.addEventListener('change', () => {
        saveSettings({ [input.dataset.setting]: input.checked });
        showToast('Preference saved');
      });
    });
  }

  load();
}

function openPasswordForm() {
  showModal('Change Password', `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${formField('Current password', 'password', 'currentPassword', '', '', [], { required: true })}
      ${formField('New password', 'password', 'newPassword', '', '', [], { required: true, hint: 'At least 8 characters, with a letter and a number' })}
      ${formField('Confirm new password', 'password', 'confirm', '', '', [], { required: true })}
    </form>`, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'save',
      label: 'Change Password',
      primary: true,
      handler: async (overlay) => {
        const v = readForm(overlay.querySelector('form'));
        if (v.newPassword !== v.confirm) throw new Error('New passwords do not match');
        const res = await api.put('/users/me/password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
        updateSession({ token: res.token, user: getUser() });
        showToast('Password changed');
      },
    },
  ]);
}

function profileItem(icon, text) {
  return `<div class="flex items-center gap-3 text-left"><span class="material-symbols-outlined text-[18px] text-secondary">${icon}</span><span class="font-body-sm text-body-sm text-on-surface">${text}</span></div>`;
}

function notifToggle(key, label, checked) {
  return `<div class="flex items-center justify-between py-2"><span class="font-body-sm text-body-sm text-on-surface">${label}</span><label class="relative inline-flex items-center cursor-pointer"><input type="checkbox" data-setting="${key}" ${checked ? 'checked' : ''} class="sr-only peer"/><div class="w-11 h-6 bg-surface-container-high rounded-full peer peer-checked:bg-primary-container peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div></label></div>`;
}
