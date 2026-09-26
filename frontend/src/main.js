import { api, errorMessage, getToken, getUser, onUnauthorized, updateSession } from './api.js';
import renderAdjustments from './pages/adjustments.js';
import { hideAuth, initAuth, logout, showAuth } from './pages/auth.js';
import renderCategories from './pages/categories.js';
import renderDashboard from './pages/dashboard.js';
import renderMoves from './pages/moves.js';
import renderOperationForm from './pages/operation-form.js';
import renderOperationList from './pages/operation-list.js';
import renderProduct from './pages/product.js';
import renderProducts from './pages/products.js';
import renderProfile from './pages/profile.js';
import renderReordering from './pages/reordering.js';
import renderSettings from './pages/settings.js';
import renderStock from './pages/stock.js';
import { route, setRouteGuard, startRouter } from './router.js';
import { onDataChanged, reorder } from './store.js';
import {
  button,
  debounce,
  emptyHTML,
  esc,
  fmtQty,
  initials,
  loadingHTML,
  OP_TYPE,
  operationHref,
  opStatusBadge,
  showModal,
  showToast,
  stockBadge,
  tableHTML,
  TD,
} from './utils.js';

// ---------------------------------------------------------------------------
// Pages (see the Navigation section of the problem statement)
// ---------------------------------------------------------------------------
route('dashboard', renderDashboard, { title: 'Dashboard' });

for (const type of ['receipt', 'delivery', 'internal']) {
  const { route: path, plural, label } = OP_TYPE[type];
  route(path, (el) => renderOperationList(el, type), { title: plural });
  const parent = { label: plural, href: `#${path}` };
  route(`${path}/new`, (el) => renderOperationForm(el, type, null), { nav: path, title: 'New', parent });
  route(`${path}/:id`, (el, { id }) => renderOperationForm(el, type, Number(id)), { nav: path, title: label, parent });
}
route('adjustments', renderAdjustments, { title: 'Inventory Adjustment' });
route('adjustments/:id', (el, { id }) => renderOperationForm(el, 'adjustment', Number(id)), {
  nav: 'adjustments',
  title: 'Adjustment',
  parent: { label: 'Inventory Adjustment', href: '#adjustments' },
});

route('products', renderProducts, { title: 'Products' });
const productsParent = { label: 'Products', href: '#products' };
route('products/new', (el) => renderProduct(el, null), { nav: 'products', title: 'New', parent: productsParent });
route('products/:id', (el, { id }) => renderProduct(el, Number(id)), { nav: 'products', title: 'Product', parent: productsParent });
route('stock', renderStock, { title: 'Stock by Location' });
route('categories', renderCategories, { title: 'Product Categories' });
route('reordering', renderReordering, { title: 'Reordering Rules' });
route('moves', renderMoves, { title: 'Move History' });
route('settings', renderSettings, { title: 'Warehouses' });
route('profile', renderProfile, { title: 'My Profile' });

setRouteGuard(() => Boolean(getToken()));

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
function updateUserInfo(user = getUser()) {
  if (!user) return;
  document.getElementById('user-avatar').textContent = initials(user.name);
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-role').textContent = user.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff';
}

function enterApp(user, { fromLogin = false } = {}) {
  hideAuth();
  updateUserInfo(user);
  // After signing in the user is redirected to the dashboard; a page reload keeps the current page.
  const path = window.location.hash.slice(1);
  if (fromLogin || !path || path === 'auth') window.history.replaceState(null, '', '#dashboard');
  startRouter();
  refreshAlerts();
}

initAuth({ onLogin: (user) => enterApp(user, { fromLogin: true }) });
onUnauthorized(() => {
  showToast('Your session has ended — please sign in again', 'info');
  showAuth('login');
});
window.addEventListener('stocksense:profile-updated', () => updateUserInfo());
document.getElementById('logout-btn').addEventListener('click', logout);

// Dark / light mode (the button exists on the sign-in page and in the top bar)
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-theme-toggle]')) return;
  const dark = document.documentElement.classList.toggle('dark');
  try {
    localStorage.setItem('stocksense_theme', dark ? 'dark' : 'light');
  } catch {
    /* the choice just isn't remembered */
  }
});

// Mobile sidebar
document.getElementById('menu-btn').addEventListener('click', () => document.body.classList.add('sidebar-open'));
document.getElementById('sidebar-backdrop').addEventListener('click', () => document.body.classList.remove('sidebar-open'));

// ---------------------------------------------------------------------------
// Low stock alerts (bell)
// ---------------------------------------------------------------------------
let alerts = [];

async function refreshAlerts() {
  if (!getToken()) return;
  try {
    alerts = await api.get('/alerts/low-stock');
  } catch {
    alerts = [];
  }
  const dot = document.getElementById('notif-dot');
  dot.textContent = alerts.length > 9 ? '9+' : alerts.length;
  dot.classList.toggle('hidden', alerts.length === 0);
}
onDataChanged(refreshAlerts);

document.getElementById('notif-btn').addEventListener('click', async () => {
  await refreshAlerts();
  const rows = alerts.map(
    (a, i) => `
      <tr>
        <td class="${TD}"><div class="font-medium">${esc(a.productName)}</div><div class="text-[12px] text-secondary font-mono">${esc(a.sku)}</div></td>
        <td class="${TD}">${esc(a.warehouseName)}</td>
        <td class="${TD} text-right font-mono">${fmtQty(a.onHand)} / ${fmtQty(a.minQty)}</td>
        <td class="${TD}">${stockBadge(a.status)}</td>
        <td class="${TD} text-right">${button(`Reorder ${fmtQty(a.suggestedQty)}`, { small: true, attrs: `data-reorder="${i}"` })}</td>
      </tr>`,
  );
  const overlay = showModal(
    'Low stock',
    alerts.length
      ? `${tableHTML([{ label: 'Product' }, { label: 'Warehouse' }, { label: 'On hand / min', align: 'right' }, { label: 'Status' }, { label: '' }], rows)}`
      : emptyHTML('Nothing is below its reorder level.'),
    [],
    { wide: true },
  );
  overlay.querySelectorAll('[data-reorder]').forEach((btn) =>
    btn.addEventListener('click', () => {
      overlay.remove();
      reorder(alerts[Number(btn.dataset.reorder)]).catch((err) => showToast(errorMessage(err), 'error'));
    }),
  );
});

// ---------------------------------------------------------------------------
// SKU / product search (Ctrl + K)
// ---------------------------------------------------------------------------
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchHint = emptyHTML('Type a SKU, product name or operation reference', 'search');

function openSearch() {
  if (!getToken()) return;
  searchResults.innerHTML = searchHint;
  searchModal.classList.remove('hidden');
  setTimeout(() => searchInput.focus(), 50);
}

function closeSearch() {
  searchModal.classList.add('hidden');
  searchInput.value = '';
}

document.getElementById('search-trigger').addEventListener('click', openSearch);
document.getElementById('search-trigger-mobile').addEventListener('click', openSearch);
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeSearch();
    document.querySelector('.modal-overlay-dynamic')?.remove();
  }
});

let searchSeq = 0;
const resultRow = (href, icon, title, subtitle, badge) => `
  <a href="${href}" data-search-result class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low">
    <span class="material-symbols-outlined text-secondary">${icon}</span>
    <div class="flex-1 min-w-0"><div class="font-medium truncate">${title}</div><div class="text-[12px] text-secondary truncate">${subtitle}</div></div>
    ${badge}
  </a>`;

const runSearch = debounce(async (q) => {
  const seq = ++searchSeq;
  if (!q) {
    searchResults.innerHTML = searchHint;
    return;
  }
  searchResults.innerHTML = loadingHTML('Searching...');
  try {
    const [products, operations] = await Promise.all([
      api.get('/products', { search: q, limit: 6 }),
      api.get('/operations', { search: q, limit: 4 }),
    ]);
    if (seq !== searchSeq) return;
    const section = (title) => `<div class="px-3 pt-2 pb-1 text-[12px] font-medium text-secondary">${title}</div>`;
    let html = '';
    if (products.items.length) {
      html += section('Products');
      html += products.items
        .map((p) => resultRow(`#products/${p.id}`, 'inventory_2', esc(p.name), `${esc(p.sku)} · ${fmtQty(p.onHand)} ${esc(p.uom)} on hand`, stockBadge(p.stockStatus)))
        .join('');
    }
    if (operations.items.length) {
      html += section('Operations');
      html += operations.items
        .map((o) => resultRow(operationHref(o), OP_TYPE[o.type].icon, esc(o.reference), `${esc(OP_TYPE[o.type].label)}${o.partnerName ? ` · ${esc(o.partnerName)}` : ''}`, opStatusBadge(o.status)))
        .join('');
    }
    searchResults.innerHTML = html || emptyHTML(`No results for "${q}"`, 'search_off');
  } catch (err) {
    if (seq === searchSeq) searchResults.innerHTML = `<div class="p-4 text-center text-error text-[13px]">${esc(errorMessage(err))}</div>`;
  }
}, 250);

searchInput.addEventListener('input', (e) => runSearch(e.target.value.trim()));
searchResults.addEventListener('click', (e) => {
  if (e.target.closest('[data-search-result]')) closeSearch();
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function boot() {
  if (!getToken()) {
    showAuth('login');
    return;
  }
  try {
    const user = await api.get('/auth/me');
    updateSession({ user });
    enterApp(user);
  } catch (err) {
    if (err.status !== 401) {
      showToast(errorMessage(err), 'error');
      showAuth('login');
    }
  }
}

boot();
