// Simple hash-based router with parameters, e.g. route('receipts/:id', handler)
import { esc } from './utils.js';

const routes = [];
let currentCleanup = null;
let started = false;
let guard = () => true;

/**
 * Registers a page. options: { nav } = sidebar item to highlight, { title } = page title,
 * { parent } = { label, href } shown as a breadcrumb before the title.
 * Routes are matched in the order they are registered.
 */
export function route(path, handler, { nav = path, title = '', parent = null } = {}) {
  const pattern = new RegExp(`^${path.replace(/:(\w+)/g, '(?<$1>[^/?]+)')}$`);
  routes.push({ pattern, handler, nav, title, parent });
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

/** Sets the title in the top bar, e.g. "Receipts / WH/IN/0005" when a parent is given. */
export function setPageTitle(title, parent = null) {
  const el = document.getElementById('page-title');
  if (el) {
    el.innerHTML = parent
      ? `<a href="${parent.href}" class="font-normal text-secondary hover:text-on-surface">${esc(parent.label)}</a><span class="font-normal text-secondary whitespace-pre"> / </span>${esc(title)}`
      : esc(title);
  }
  document.title = `${title} · StockSense`;
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

  document.querySelectorAll('[data-nav-path]').forEach((el) => {
    el.classList.toggle('active', el.dataset.navPath === match.r.nav);
  });
  document.body.classList.remove('sidebar-open');
  setPageTitle(match.r.title, match.r.parent);

  // Each page renders into its own element, so a slow request from a page
  // the user already left cannot overwrite the new page.
  const page = document.createElement('div');
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
    page.innerHTML = '<div class="p-12 text-center text-secondary">Something went wrong while opening this page.</div>';
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
