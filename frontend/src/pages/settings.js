// Settings: warehouses and their locations (multi-warehouse support), plus user roles for managers.
import { api, getUser, isManager } from '../api.js';
import { invalidateLookups, notifyChanged, onDataChanged, warehouseOptions } from '../store.js';
import {
  button,
  CARD,
  errorHTML,
  esc,
  field,
  fmtQty,
  iconButton,
  inputHTML,
  loadingHTML,
  optionsHTML,
  readForm,
  ROW,
  FILTER,
  sectionHeader,
  selectHTML,
  showError,
  showModal,
  showToast,
  tableHTML,
  TD,
  textareaHTML,
  toolbar,
} from '../utils.js';

const ROLE_LABEL = { manager: 'Inventory Manager', staff: 'Warehouse Staff' };

export default function renderSettings(container) {
  const manager = isManager();
  const state = { warehouseId: '' };
  let warehouses = [];
  let locations = [];
  const $ = (sel) => container.querySelector(sel);

  container.innerHTML = `
    ${manager
      ? toolbar(button('New warehouse', { variant: 'primary', icon: 'add', attrs: 'id="add-warehouse"' }) + button('New location', { icon: 'add', attrs: 'id="add-location"' }))
      : ''}
    <section class="${CARD} overflow-hidden mb-4">
      ${sectionHeader('Warehouses')}
      <div id="warehouses">${loadingHTML()}</div>
    </section>
    <section class="${CARD} overflow-hidden mb-4">
      ${sectionHeader('Locations', `<select id="f-warehouse" class="${FILTER}"><option value="">All warehouses</option></select>`)}
      <div id="locations">${loadingHTML()}</div>
    </section>
    ${manager ? `<section class="${CARD} overflow-hidden">
      ${sectionHeader('Users and roles')}
      <div id="users">${loadingHTML()}</div>
    </section>` : ''}`;

  async function load() {
    try {
      [warehouses, locations] = await Promise.all([api.get('/warehouses'), api.get('/locations')]);
      if (!container.isConnected) return;
      $('#warehouses').innerHTML = tableHTML(
        ['Name', 'Short code', 'Address', { label: 'Locations', align: 'right' }, { label: 'Units in stock', align: 'right' }, ''],
        warehouses.map(
          (w) => `
          <tr class="${ROW}">
            <td class="${TD} font-medium">${esc(w.name)}</td>
            <td class="${TD} font-mono">${esc(w.code)}</td>
            <td class="${TD} text-secondary">${esc(w.address || '—')}</td>
            <td class="${TD} text-right font-mono">${w.locationCount}</td>
            <td class="${TD} text-right font-mono">${fmtQty(w.totalQuantity)}</td>
            <td class="${TD} text-right whitespace-nowrap">${manager ? iconButton('edit', 'Edit', `data-edit-warehouse="${w.id}"`) + iconButton('archive', 'Archive', `data-archive-warehouse="${w.id}"`) : ''}</td>
          </tr>`,
        ),
        'No warehouses yet.',
      );
      renderLocations();
      $('#f-warehouse').innerHTML = optionsHTML(warehouseOptions(warehouses), state.warehouseId, 'All warehouses');
      if (manager) loadUsers();
    } catch (err) {
      if (container.isConnected) $('#warehouses').innerHTML = errorHTML(err);
    }
  }

  function renderLocations() {
    const list = locations.filter((l) => !state.warehouseId || String(l.warehouseId) === state.warehouseId);
    $('#locations').innerHTML = tableHTML(
      ['Full code', 'Name', 'Short code', 'Warehouse', { label: 'Units in stock', align: 'right' }, ''],
      list.map(
        (l) => `
        <tr class="${ROW}">
          <td class="${TD} font-mono">${esc(l.fullCode)}</td>
          <td class="${TD}">${esc(l.name)}</td>
          <td class="${TD} font-mono">${esc(l.code)}</td>
          <td class="${TD}">${esc(l.warehouseName)}</td>
          <td class="${TD} text-right font-mono">${fmtQty(l.totalQuantity)}</td>
          <td class="${TD} text-right whitespace-nowrap">${manager ? iconButton('edit', 'Edit', `data-edit-location="${l.id}"`) + iconButton('archive', 'Archive', `data-archive-location="${l.id}"`) : ''}</td>
        </tr>`,
      ),
      'No locations yet.',
    );
  }

  async function loadUsers() {
    try {
      const users = await api.get('/users');
      const me = getUser();
      $('#users').innerHTML = tableHTML(
        ['Name', 'Email', 'Role'],
        users.map(
          (u) => `
          <tr class="${ROW}">
            <td class="${TD} font-medium">${esc(u.name)}${u.id === me?.id ? ' <span class="text-secondary font-normal">(you)</span>' : ''}</td>
            <td class="${TD}">${esc(u.email)}</td>
            <td class="${TD}"><select data-role-user="${u.id}" ${u.id === me?.id ? 'disabled' : ''} class="${FILTER} w-52">${optionsHTML(Object.entries(ROLE_LABEL).map(([value, label]) => ({ value, label })), u.role)}</select></td>
          </tr>`,
        ),
      );
    } catch (err) {
      $('#users').innerHTML = errorHTML(err);
    }
  }

  function openWarehouseForm(w = null) {
    showModal(w ? 'Edit warehouse' : 'New warehouse', `
      <form class="flex flex-col gap-4" onsubmit="return false">
        ${field('Name', inputHTML('name', w?.name ?? '', 'placeholder="e.g. Main Warehouse"'), { required: true })}
        ${field('Short code', inputHTML('code', w?.code ?? '', 'placeholder="e.g. WH"'), { required: true, hint: 'Used in references, e.g. WH/IN/0001' })}
        ${field('Address', textareaHTML('address', w?.address ?? '', 'placeholder="Street, city"'))}
        ${w ? '' : '<p class="text-[13px] text-secondary">A "Stock" location is added automatically.</p>'}
      </form>`, [
      { id: 'cancel', label: 'Cancel' },
      {
        id: 'save',
        label: 'Save',
        variant: 'primary',
        handler: async (overlay) => {
          const v = readForm(overlay.querySelector('form'));
          if (!v.name || !v.code) throw new Error('Name and short code are required');
          if (w) await api.put(`/warehouses/${w.id}`, { name: v.name, code: v.code, address: v.address });
          else await api.post('/warehouses', { name: v.name, code: v.code, address: v.address || undefined });
          showToast(`Warehouse ${v.name} saved`);
          notifyChanged();
        },
      },
    ]);
  }

  function openLocationForm(l = null) {
    showModal(l ? 'Edit location' : 'New location', `
      <form class="flex flex-col gap-4" onsubmit="return false">
        ${field('Warehouse', selectHTML('warehouseId', warehouseOptions(warehouses), l?.warehouseId ?? state.warehouseId, 'Select a warehouse...', l ? 'disabled' : ''), { required: true })}
        ${field('Name', inputHTML('name', l?.name ?? '', 'placeholder="e.g. Rack A, Production Floor"'), { required: true })}
        ${field('Short code', inputHTML('code', l?.code ?? '', 'placeholder="e.g. RACK-A"'), { required: true })}
      </form>`, [
      { id: 'cancel', label: 'Cancel' },
      {
        id: 'save',
        label: 'Save',
        variant: 'primary',
        handler: async (overlay) => {
          const v = readForm(overlay.querySelector('form'));
          if (!v.name || !v.code || (!l && !v.warehouseId)) throw new Error('Warehouse, name and short code are required');
          const saved = l
            ? await api.put(`/locations/${l.id}`, { name: v.name, code: v.code })
            : await api.post('/locations', { warehouseId: Number(v.warehouseId), name: v.name, code: v.code });
          showToast(`Location ${saved.fullCode} saved`);
          notifyChanged();
        },
      },
    ]);
  }

  async function archive(kind, item) {
    const label = kind === 'warehouses' ? item.name : item.fullCode;
    if (!window.confirm(`Archive ${label}? It will no longer be used for new operations; its history is kept.`)) return;
    try {
      await api.del(`/${kind}/${item.id}`);
      showToast(`${label} archived`);
      notifyChanged();
    } catch (err) {
      showError(err);
    }
  }

  $('#add-warehouse')?.addEventListener('click', () => openWarehouseForm());
  $('#add-location')?.addEventListener('click', () => openLocationForm());
  $('#f-warehouse').addEventListener('change', (e) => {
    state.warehouseId = e.target.value;
    renderLocations();
  });
  container.addEventListener('click', (e) => {
    const find = (list, key) => list.find((x) => String(x.id) === e.target.closest(`[${key}]`).getAttribute(key));
    if (e.target.closest('[data-edit-warehouse]')) openWarehouseForm(find(warehouses, 'data-edit-warehouse'));
    else if (e.target.closest('[data-archive-warehouse]')) archive('warehouses', find(warehouses, 'data-archive-warehouse'));
    else if (e.target.closest('[data-edit-location]')) openLocationForm(find(locations, 'data-edit-location'));
    else if (e.target.closest('[data-archive-location]')) archive('locations', find(locations, 'data-archive-location'));
  });
  container.addEventListener('change', async (e) => {
    const select = e.target.closest('[data-role-user]');
    if (!select) return;
    try {
      const updated = await api.patch(`/users/${select.dataset.roleUser}/role`, { role: select.value });
      showToast(`${updated.name} is now ${ROLE_LABEL[updated.role]}`);
      invalidateLookups();
    } catch (err) {
      showError(err);
      loadUsers();
    }
  });

  load();
  return onDataChanged(load);
}
