import { route, startRouter, getCurrentPath } from './router.js';
import { initAuth } from './pages/auth.js';
import renderDashboard from './pages/dashboard.js';
import renderProducts from './pages/products.js';
import renderProductDetail from './pages/product-detail.js';
import renderOperations from './pages/operations.js';
import renderWarehouses from './pages/warehouses.js';
import renderLedger from './pages/ledger.js';
import renderSettings from './pages/settings.js';
import renderProfile from './pages/profile.js';
import renderLanding from './pages/landing.js';
import data from './data.js';

// Register routes
route('dashboard', (el) => renderDashboard(el));
route('products', (el) => renderProducts(el));
route('operations', (el) => renderOperations(el));
route('warehouses', (el) => renderWarehouses(el));
route('ledger', (el) => renderLedger(el));
route('settings', (el) => renderSettings(el));
route('profile', (el) => renderProfile(el));
route('landing', (el) => renderLanding(el));

// Initialize auth screen
initAuth();

// Handle dynamic routes (product detail)
const originalHashChange = window.onhashchange;
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.slice(1);
  if (hash.startsWith('product-detail-')) {
    const id = parseInt(hash.replace('product-detail-', ''));
    const el = document.getElementById('app-content');
    if (el) {
      el.innerHTML = '';
      renderProductDetail(el, id);
      // Update nav
      document.querySelectorAll('[data-nav-path]').forEach(nav => {
        if (nav.dataset.navPath === 'products') {
          nav.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
          nav.classList.remove('text-on-surface-variant');
        } else {
          nav.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold');
          nav.classList.add('text-on-surface-variant');
        }
      });
    }
  }
});

// Start router
startRouter();

// Global Search (⌘K)
const searchModal = document.getElementById('search-modal');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');
const searchTrigger = document.getElementById('search-trigger');

function openSearch() {
  searchModal.classList.remove('hidden');
  setTimeout(() => searchInput?.focus(), 100);
}

function closeSearch() {
  searchModal.classList.add('hidden');
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.innerHTML = '<div class="p-4 text-center text-secondary font-body-sm text-body-sm">Type to search across products and operations...</div>';
}

searchTrigger?.addEventListener('click', openSearch);

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    openSearch();
  }
  if (e.key === 'Escape') {
    closeSearch();
  }
});

searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    searchResults.innerHTML = '<div class="p-4 text-center text-secondary font-body-sm text-body-sm">Type to search across products and operations...</div>';
    return;
  }

  const productHits = data.products.filter(p =>
    p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  ).slice(0, 5);

  const opHits = data.moveHistory.filter(m =>
    m.ref.toLowerCase().includes(q) || m.product.toLowerCase().includes(q)
  ).slice(0, 3);

  let html = '';

  if (productHits.length) {
    html += `<div class="px-3 py-1.5 font-label-sm text-label-sm text-secondary uppercase">Products</div>`;
    html += productHits.map(p => `
      <button onclick="window.location.hash='#product-detail-${p.id}'; document.getElementById('search-modal').classList.add('hidden')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left">
        <span class="material-symbols-outlined text-secondary text-[20px]">${p.icon}</span>
        <div class="flex-1 min-w-0">
          <div class="font-body-sm text-body-sm text-on-surface font-medium truncate">${p.name}</div>
          <div class="font-label-sm text-label-sm text-secondary">${p.sku} • ${p.totalStock} ${p.unit}</div>
        </div>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-sm text-label-sm ${p.status === 'In Stock' ? 'bg-emerald-50 text-emerald-700' : p.status === 'Low Stock' ? 'bg-primary-fixed text-primary' : 'bg-error-container text-error'}">${p.status}</span>
      </button>
    `).join('');
  }

  if (opHits.length) {
    html += `<div class="px-3 py-1.5 font-label-sm text-label-sm text-secondary uppercase mt-1">Operations</div>`;
    html += opHits.map(m => `
      <button onclick="window.location.hash='#ledger'; document.getElementById('search-modal').classList.add('hidden')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container-low transition-colors text-left">
        <span class="material-symbols-outlined text-secondary text-[20px]">receipt_long</span>
        <div class="flex-1 min-w-0">
          <div class="font-body-sm text-body-sm text-on-surface font-medium">${m.ref} — ${m.operation}</div>
          <div class="font-label-sm text-label-sm text-secondary">${m.product} • ${m.qty} • ${m.timestamp}</div>
        </div>
      </button>
    `).join('');
  }

  if (!productHits.length && !opHits.length) {
    html = '<div class="p-4 text-center text-secondary font-body-sm text-body-sm">No results found for "' + q + '"</div>';
  }

  searchResults.innerHTML = html;
});
