// Simple hash-based SPA router
const routes = {};
let currentCleanup = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || 'dashboard';
}

export function startRouter() {
  async function handleRoute() {
    const path = getCurrentPath();
    const app = document.getElementById('app-content');
    if (!app) return;

    // Run cleanup from previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    // Update nav active states
    document.querySelectorAll('[data-nav-path]').forEach(el => {
      if (el.dataset.navPath === path) {
        el.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
        el.classList.remove('text-on-surface-variant', 'hover:text-on-surface', 'hover:bg-surface-container-high');
      } else {
        el.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold');
        el.classList.add('text-on-surface-variant', 'hover:text-on-surface', 'hover:bg-surface-container-high');
      }
    });

    // Update mobile nav
    document.querySelectorAll('[data-mobile-nav-path]').forEach(el => {
      if (el.dataset.mobileNavPath === path) {
        el.classList.add('text-primary-container');
        el.classList.remove('text-secondary');
      } else {
        el.classList.remove('text-primary-container');
        el.classList.add('text-secondary');
      }
    });

    const handler = routes[path];
    if (handler) {
      const result = await handler(app);
      if (typeof result === 'function') {
        currentCleanup = result;
      }
    } else {
      // Fallback to dashboard
      navigate('dashboard');
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
