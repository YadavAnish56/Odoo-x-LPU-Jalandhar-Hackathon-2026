// My Profile (profile menu): view / update my details, change password, logout.
import { api, getUser, updateSession } from '../api.js';
import { rememberDemoEmail, rememberDemoPassword } from '../demo.js';
import { invalidateLookups } from '../store.js';
import { button, CARD, errorHTML, esc, field, fmtDate, initials, inputHTML, loadingHTML, readForm, showError, showToast } from '../utils.js';
import { logout } from './auth.js';

const ROLE_LABEL = { manager: 'Inventory Manager', staff: 'Warehouse Staff' };

export default function renderProfile(container) {
  container.innerHTML = loadingHTML();

  async function load() {
    try {
      const user = await api.get('/users/me');
      if (!container.isConnected) return;
      updateSession({ user });
      render(user);
    } catch (err) {
      if (container.isConnected) container.innerHTML = errorHTML(err);
    }
  }

  function render(user) {
    container.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section class="${CARD} p-5 self-start">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-[16px] font-semibold shrink-0">${esc(initials(user.name))}</div>
            <div class="min-w-0">
              <h2 class="text-[16px] font-semibold truncate">${esc(user.name)}</h2>
              <p class="text-[13px] text-secondary">${ROLE_LABEL[user.role]}</p>
            </div>
          </div>
          <dl class="mt-4 pt-4 border-t border-surface-container text-[13px] grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
            <dt class="text-secondary">Email</dt><dd class="truncate">${esc(user.email)}</dd>
            <dt class="text-secondary">Member since</dt><dd>${fmtDate(user.createdAt)}</dd>
          </dl>
          <div class="mt-5">${button('Logout', { variant: 'danger', icon: 'logout', attrs: 'id="logout"' })}</div>
        </section>

        <div class="lg:col-span-2 flex flex-col gap-4">
          <form id="profile-form" class="${CARD} p-5" onsubmit="return false">
            <h3 class="text-[14px] font-semibold mb-4">Details</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${field('Full name', inputHTML('name', user.name), { required: true })}
              ${field('Email', inputHTML('email', user.email, 'type="email"'), { required: true })}
              ${field('Role', inputHTML('role', ROLE_LABEL[user.role], 'disabled'))}
            </div>
            <div class="flex justify-end mt-4">${button('Save', { variant: 'primary', attrs: 'id="save-profile"' })}</div>
          </form>

          <form id="password-form" class="${CARD} p-5" onsubmit="return false">
            <h3 class="text-[14px] font-semibold mb-4">Change password</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              ${field('Current password', inputHTML('currentPassword', '', 'type="password" autocomplete="current-password"'), { required: true })}
              ${field('New password', inputHTML('newPassword', '', 'type="password" autocomplete="new-password"'), { required: true })}
              ${field('Confirm new password', inputHTML('confirm', '', 'type="password" autocomplete="new-password"'), { required: true })}
            </div>
            <div class="flex items-center justify-between gap-3 mt-4">
              <p class="text-[12px] text-secondary">Other devices will be signed out.</p>
              ${button('Change password', { variant: 'primary', attrs: 'id="save-password"' })}
            </div>
          </form>
        </div>
      </div>`;

    container.querySelector('#logout').addEventListener('click', logout);

    container.querySelector('#save-profile').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        const v = readForm(container.querySelector('#profile-form'));
        const updated = await api.put('/users/me', { name: v.name, email: v.email });
        rememberDemoEmail(user.email, updated.email);
        updateSession({ user: updated });
        invalidateLookups();
        window.dispatchEvent(new CustomEvent('stocksense:profile-updated'));
        showToast('Profile saved');
        render(updated);
      } catch (err) {
        showError(err);
        btn.disabled = false;
      }
    });

    container.querySelector('#save-password').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const form = container.querySelector('#password-form');
      const v = readForm(form);
      if (v.newPassword !== v.confirm) return showError(new Error('The new passwords do not match'));
      btn.disabled = true;
      try {
        const res = await api.put('/users/me/password', { currentPassword: v.currentPassword, newPassword: v.newPassword });
        updateSession({ token: res.token });
        rememberDemoPassword(getUser()?.email ?? user.email, v.newPassword);
        form.reset();
        showToast('Password changed');
      } catch (err) {
        showError(err);
      } finally {
        btn.disabled = false;
      }
    });
  }

  load();
}
