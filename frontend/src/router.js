// Simple hash-based SPA router
const routes = {};
let currentCleanup = null;

// A path ending in "-" (e.g. "product-detail-") also matches "product-detail-3"
// and its handler receives "3" as the second argument.
// navPath is the menu item to highlight for the route (defaults to the path itself).
export function route(path, handler, navPath = path) {
  routes[path] = { handler, navPath };
}

function matchRoute(path) {
  if (routes[path]) return { ...routes[path], param: undefined };
  const prefix = Object.keys(routes).find(key => key.endsWith('-') && path.startsWith(key));
  return prefix ? { ...routes[prefix], param: path.slice(prefix.length) } : null;
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
    const match = matchRoute(path);
    const navPath = match ? match.navPath : path;

    // Run cleanup from previous page
    if (currentCleanup && typeof currentCleanup === 'function') {
      currentCleanup();
      currentCleanup = null;
    }

    // Update nav active states
    document.querySelectorAll('[data-nav-path]').forEach(el => {
      if (el.dataset.navPath === navPath) {
        el.classList.add('bg-primary-container', 'text-on-primary-container', 'font-semibold');
        el.classList.remove('text-on-surface-variant', 'hover:text-on-surface', 'hover:bg-surface-container-high');
      } else {
        el.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-semibold');
        el.classList.add('text-on-surface-variant', 'hover:text-on-surface', 'hover:bg-surface-container-high');
      }
    });

    // Update mobile nav
    document.querySelectorAll('[data-mobile-nav-path]').forEach(el => {
      if (el.dataset.mobileNavPath === navPath) {
        el.classList.add('text-primary-container');
        el.classList.remove('text-secondary');
      } else {
        el.classList.remove('text-primary-container');
        el.classList.add('text-secondary');
      }
    });

    if (match) {
      const result = await match.handler(app, match.param);
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
