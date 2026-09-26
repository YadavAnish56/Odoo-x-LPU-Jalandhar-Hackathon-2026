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
import data from './data.js';
import { showToast } from './utils.js';

// Register routes
route('dashboard', (el) => renderDashboard(el));
route('products', (el) => renderProducts(el));
route('operations', (el) => renderOperations(el));
route('warehouses', (el) => renderWarehouses(el));
route('ledger', (el) => renderLedger(el));
route('settings', (el) => renderSettings(el));
route('profile', (el) => renderProfile(el));

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

// --- Interactive Notifications ---
const notifTrigger = document.getElementById('notif-trigger');
const notifDropdown = document.getElementById('notif-dropdown');
const notifBadge = document.getElementById('notif-badge');
const notifCountBadge = document.getElementById('notif-count-badge');
const notifList = document.getElementById('notif-list');
const markAllReadBtn = document.getElementById('mark-all-read-btn');
const notifWrapper = document.getElementById('notif-wrapper');

function getNotificationStyles(type) {
  switch (type) {
    case 'warning':
      return { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'warning' };
    case 'success':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600', icon: 'check_circle' };
    case 'info':
      return { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'info' };
    case 'primary':
    default:
      return { bg: 'bg-orange-50', text: 'text-primary-container', icon: 'notifications_active' };
  }
}

function updateNotificationBadges() {
  const unreadCount = data.notifications ? data.notifications.filter(n => n.unread).length : 0;
  if (notifBadge) {
    if (unreadCount > 0) {
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }
  }
  if (notifCountBadge) {
    notifCountBadge.textContent = `${unreadCount} Unread`;
    if (unreadCount === 0) {
      notifCountBadge.classList.remove('bg-primary-fixed', 'text-primary');
      notifCountBadge.classList.add('bg-surface-container', 'text-secondary');
    } else {
      notifCountBadge.classList.add('bg-primary-fixed', 'text-primary');
      notifCountBadge.classList.remove('bg-surface-container', 'text-secondary');
    }
  }
}

function renderNotificationItems() {
  if (!notifList) return;
  if (!data.notifications || data.notifications.length === 0) {
    notifList.innerHTML = `
      <div class="p-6 text-center text-secondary">
        <span class="material-symbols-outlined text-3xl mb-1 text-outline-variant">notifications_paused</span>
        <p class="font-body-sm text-body-sm">No new notifications</p>
      </div>
    `;
    return;
  }

  notifList.innerHTML = data.notifications.map(n => {
    const style = getNotificationStyles(n.type);
    const iconName = n.icon || style.icon;
    return `
      <div data-notif-id="${n.id}" class="p-3.5 flex items-start gap-3 hover:bg-surface-container-low transition-colors cursor-pointer group ${n.unread ? 'bg-primary-fixed/10' : ''}">
        <div class="w-9 h-9 rounded-xl ${style.bg} ${style.text} flex items-center justify-center shrink-0 mt-0.5">
          <span class="material-symbols-outlined text-[20px]">${iconName}</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-1 mb-0.5">
            <span class="font-body-sm text-body-sm font-semibold text-on-surface truncate ${n.unread ? 'text-primary' : ''}">${n.title}</span>
            <span class="font-label-sm text-label-sm text-secondary shrink-0 font-mono">${n.time}</span>
          </div>
          <p class="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">${n.message}</p>
        </div>
        ${n.unread ? `<span class="w-2 h-2 rounded-full bg-primary-container shrink-0 mt-2"></span>` : ''}
      </div>
    `;
  }).join('');

  // Wire click to navigate and mark as read
  notifList.querySelectorAll('[data-notif-id]').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.getAttribute('data-notif-id'));
      const notif = data.notifications.find(n => n.id === id);
      if (notif) {
        notif.unread = false;
        updateNotificationBadges();
        renderNotificationItems();
        if (notifDropdown) notifDropdown.classList.add('hidden');
        if (notif.link) {
          window.location.hash = notif.link;
          showToast(`Viewing: ${notif.title}`, notif.type === 'error' ? 'error' : 'info');
        }
      }
    });
  });
}

function toggleNotificationDropdown() {
  if (!notifDropdown) return;
  const isHidden = notifDropdown.classList.contains('hidden');
  if (isHidden) {
    renderNotificationItems();
    updateNotificationBadges();
    notifDropdown.classList.remove('hidden');
  } else {
    notifDropdown.classList.add('hidden');
  }
}

notifTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleNotificationDropdown();
});

markAllReadBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  if (data.notifications) {
    data.notifications.forEach(n => { n.unread = false; });
  }
  updateNotificationBadges();
  renderNotificationItems();
  showToast('All notifications marked as read', 'success');
});

// Close when clicking outside or pressing Escape
document.addEventListener('click', (e) => {
  if (notifDropdown && !notifDropdown.classList.contains('hidden')) {
    if (!notifWrapper?.contains(e.target)) {
      notifDropdown.classList.add('hidden');
    }
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && notifDropdown && !notifDropdown.classList.contains('hidden')) {
    notifDropdown.classList.add('hidden');
  }
});

// Global notification trigger helper for all pages
window.addAppNotification = function(title, message, type = 'info', link = '#ledger') {
  const newNotif = {
    id: Date.now(),
    title,
    message,
    time: 'Just now',
    type,
    icon: type === 'warning' ? 'warning' : type === 'success' ? 'check_circle' : 'info',
    unread: true,
    link
  };
  if (!data.notifications) data.notifications = [];
  data.notifications.unshift(newNotif);
  updateNotificationBadges();
  renderNotificationItems();
  showToast(title, type);
};

// Initialize badges on app load
updateNotificationBadges();
