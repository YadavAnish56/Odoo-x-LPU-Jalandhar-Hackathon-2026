// Simple hash-based SPA router with parameters, e.g. route('product-detail-:id', handler)
const routes = [];
let currentCleanup = null;
let started = false;
let guard = () => true;

export function route(path, handler, { nav = path } = {}) {
  const pattern = new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/?]+)')}$`);
  routes.push({ pattern, handler, nav });
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function getCurrentPath() {
  return window.location.hash.slice(1) || 'dashboard';
}

/** Pages are only rendered while the guard returns true (i.e. the user is logged in). */
export function setRouteGuard(fn) {
  guard = fn;
}

function setActiveNav(navKey) {
  document.querySelectorAll('[data-nav-path]').forEach((el) => {
    const active = el.dataset.navPath === navKey;
    el.classList.toggle('bg-primary-container', active);
    el.classList.toggle('text-on-primary-container', active);
    el.classList.toggle('font-semibold', active);
    el.classList.toggle('text-on-surface-variant', !active);
    el.classList.toggle('hover:text-on-surface', !active);
    el.classList.toggle('hover:bg-surface-container-high', !active);
  });
  document.querySelectorAll('[data-mobile-nav-path]').forEach((el) => {
    const active = el.dataset.mobileNavPath === navKey;
    el.classList.toggle('text-primary-container', active);
    el.classList.toggle('text-secondary', !active);
  });
}

async function handleRoute() {
  if (!guard()) return;
  const app = document.getElementById('app-content');
  if (!app) return;

  const path = getCurrentPath();
  const match = routes.map((r) => ({ r, m: r.pattern.exec(path) })).find((x) => x.m);
  if (!match) {
    navigate('dashboard');
    return;
  }

  if (typeof currentCleanup === 'function') currentCleanup();
  currentCleanup = null;
  setActiveNav(match.r.nav);

  // Each page renders into its own element, so a slow request from a page
  // the user already left cannot overwrite the new page.
  const page = document.createElement('div');
  page.className = 'flex flex-col w-full';
  app.replaceChildren(page);
  window.scrollTo(0, 0);

  try {
    const cleanup = await match.r.handler(page, match.m.groups || {});
    if (typeof cleanup === 'function') {
      if (page.isConnected) currentCleanup = cleanup;
      else cleanup();
    }
  } catch (err) {
    console.error(err);
    page.innerHTML = `<div class="p-12 text-center text-secondary">Something went wrong while opening this page.</div>`;
  }
}

/** Starts listening to URL changes (only once) and renders the current page. */
export function startRouter() {
  if (!started) {
    window.addEventListener('hashchange', handleRoute);
    started = true;
  }
  handleRoute();
}
