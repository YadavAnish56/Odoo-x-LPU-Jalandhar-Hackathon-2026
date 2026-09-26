import { api, errorMessage, getToken, getUser, onUnauthorized, updateSession } from './api.js';
import { openOperationDetail, openOperationForm } from './components/operation-modals.js';
import { hideAuth, initAuth, logout, showAuth } from './pages/auth.js';
import renderDashboard from './pages/dashboard.js';
import renderLanding from './pages/landing.js';
import renderLedger from './pages/ledger.js';
import renderOperations from './pages/operations.js';
import renderProductDetail from './pages/product-detail.js';
import renderProducts from './pages/products.js';
import renderProfile from './pages/profile.js';
import renderSettings from './pages/settings.js';
import renderWarehouses from './pages/warehouses.js';
import { route, setRouteGuard, startRouter } from './router.js';
import { getLookups, onDataChanged } from './store.js';
import {
  debounce,
  emptyHTML,
  esc,
  fmtQty,
  initials,
  loadingHTML,
  opStatusBadge,
  OP_TYPE,
  productIcon,
  showError,
  showModal,
  showToast,
  stockBadge,
} from './utils.js';

// Routes
route('dashboard', renderDashboard);
route('products', renderProducts);
route('product-detail-:id', (el, { id }) => renderProductDetail(el, Number(id)), { nav: 'products' });
route('operations', renderOperations);
route('warehouses', renderWarehouses);
route('ledger', renderLedger);
route('settings', renderSettings);
route('profile', renderProfile);
route('landing', renderLanding);
setRouteGuard(() => Boolean(getToken()));

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------
export function updateHeader(user = getUser()) {
  if (!user) return;
  document.getElementById('user-avatar').textContent = initials(user.name);
  document.getElementById('user-menu-name').textContent = user.name;
  document.getElementById('user-menu-email').textContent = user.email;
  document.getElementById('user-menu-role').textContent = user.role === 'manager' ? 'Inventory Manager' : 'Warehouse Staff';
}

function enterApp(user, { fromLogin = false } = {}) {
  hideAuth();
  updateHeader(user);
  // After signing in the user lands on the dashboard; a reload keeps the current page.
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
window.addEventListener('stocksense:profile-updated', () => updateHeader());

// ---------------------------------------------------------------------------
// Account menu
// ---------------------------------------------------------------------------
const userMenu = document.getElementById('user-menu');
document.getElementById('user-menu-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  userMenu.classList.toggle('hidden');
});
userMenu.addEventListener('click', () => userMenu.classList.add('hidden'));
document.addEventListener('click', (e) => {
  if (!userMenu.contains(e.target)) userMenu.classList.add('hidden');
});
document.getElementById('logout-btn').addEventListener('click', logout);

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
  const rows = alerts
    .map(
      (a, i) => `
      <div class="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-low/60">
        <div class="flex items-center gap-3 min-w-0">
          <span class="material-symbols-outlined text-secondary">${productIcon(a)}</span>
          <div class="min-w-0">
            <div class="font-body-sm text-body-sm text-on-surface font-medium truncate">${esc(a.productName)} <span class="font-mono text-secondary">${esc(a.sku)}</span></div>
            <div class="font-label-sm text-label-sm text-secondary">${esc(a.warehouseName)} · ${fmtQty(a.onHand)} / min ${fmtQty(a.minQty)} ${esc(a.uom)}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${stockBadge(a.status)}
          <button data-reorder="${i}" class="px-3 py-1.5 bg-primary-container hover:bg-primary text-on-primary font-label-sm text-label-sm rounded-lg font-semibold">Reorder ${fmtQty(a.suggestedQty)}</button>
        </div>
      </div>`,
    )
    .join('');
  const overlay = showModal(
    'Low Stock Alerts',
    alerts.length ? `<div class="flex flex-col gap-2">${rows}</div>` : emptyHTML('All products are above their reorder levels', 'check_circle'),
  );
  overlay.querySelectorAll('[data-reorder]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const alert = alerts[Number(btn.dataset.reorder)];
      try {
        const { locations } = await getLookups();
        const dest = locations.find((l) => l.warehouseId === alert.warehouseId);
        openOperationForm('receipt', {
          destLocationId: dest?.id,
          lines: [{ productId: alert.productId, quantity: alert.suggestedQty }],
        });
      } catch (err) {
        showError(err);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Server status (footer)
// ---------------------------------------------------------------------------
async function checkHealth() {
  const dot = document.getElementById('api-status-dot');
  const text = document.getElementById('api-status');
  try {
    await api.get('/health');
    dot.className = 'w-2 h-2 rounded-full bg-green-500';
    text.textContent = 'All systems operational';
  } catch {
    dot.className = 'w-2 h-2 rounded-full bg-error';
    text.textContent = 'Server unreachable';
  }
}

// ---------------------------------------------------------------------------
// Global search (Ctrl/⌘ + K)
// ---------------------------------------------------------------------------
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchHint = '<div class="p-4 text-center text-secondary font-body-sm text-body-sm">Type to search across products and operations...</div>';

function openSearch() {
  if (!getToken()) return;
  searchModal.classList.remove('hidden');
  setTimeout(() => searchInput?.focus(), 100);
}

function closeSearch() {
  searchModal.classList.add('hidden');
  searchInput.value = '';
  searchResults.innerHTML = searchHint;
}

document.getElementById('search-trigger')?.addEventListener('click', openSearch);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeSearch();
    document.querySelector('.modal-overlay-dynamic')?.remove();
    userMenu.classList.add('hidden');
  }
});

let searchSeq = 0;
const runSearch = debounce(async (q) => {
  const seq = ++searchSeq;
  if (!q) {
    searchResults.innerHTML = searchHint;
    return;
  }
  searchResults.innerHTML = loadingHTML('Searching...');
  try {
    const [products, operations] = await Promise.all([
      api.get('/products', { search: q, limit: 5 }),
      api.get('/operations', { search: q, limit: 4 }),
    ]);
    if (seq !== searchSeq) return;

    let html = '';
    if (products.items.length) {
      html += `<div class="px-3 py-1.5 font-label-sm text-label-sm text-secondary uppercase">Products</div>`;
      html += products.items
        .map(
          (p) => `
        <button data-search-product="${p.id}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left">
          <span class="material-symbols-outlined text-secondary text-[20px]">${productIcon(p)}</span>
          <div class="flex-1 min-w-0">
            <div class="font-body-sm text-body-sm text-on-surface font-medium truncate">${esc(p.name)}</div>
            <div class="font-label-sm text-label-sm text-secondary">${esc(p.sku)} • ${fmtQty(p.onHand)} ${esc(p.uom)}</div>
          </div>
          ${stockBadge(p.stockStatus)}
        </button>`,
        )
        .join('');
    }
    if (operations.items.length) {
      html += `<div class="px-3 py-1.5 font-label-sm text-label-sm text-secondary uppercase mt-1">Operations</div>`;
      html += operations.items
        .map(
          (o) => `
        <button data-search-op="${o.id}" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left">
          <span class="material-symbols-outlined text-secondary text-[20px]">${OP_TYPE[o.type]?.icon ?? 'receipt_long'}</span>
          <div class="flex-1 min-w-0">
            <div class="font-body-sm text-body-sm text-on-surface font-medium">${esc(o.reference)} — ${esc(OP_TYPE[o.type]?.label ?? o.type)}</div>
            <div class="font-label-sm text-label-sm text-secondary truncate">${esc(o.partnerName || o.destLocationCode || o.sourceLocationCode || '')} • ${fmtQty(o.totalQuantity)} units</div>
          </div>
          ${opStatusBadge(o.status)}
        </button>`,
        )
        .join('');
    }
    searchResults.innerHTML = html || `<div class="p-4 text-center text-secondary font-body-sm text-body-sm">No results found for "${esc(q)}"</div>`;
  } catch (err) {
    if (seq === searchSeq) searchResults.innerHTML = `<div class="p-4 text-center text-error font-body-sm text-body-sm">${esc(errorMessage(err))}</div>`;
  }
}, 250);

searchInput?.addEventListener('input', (e) => runSearch(e.target.value.trim()));

searchResults.addEventListener('click', (e) => {
  const product = e.target.closest('[data-search-product]');
  const op = e.target.closest('[data-search-op]');
  if (product) {
    closeSearch();
    window.location.hash = `#product-detail-${product.dataset.searchProduct}`;
  } else if (op) {
    closeSearch();
    openOperationDetail(Number(op.dataset.searchOp));
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
async function boot() {
  checkHealth();
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
