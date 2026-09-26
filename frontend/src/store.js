// Cached lists used by forms and filters (dropdowns), plus small cross-page helpers.
import { api, fetchAll } from './api.js';

let cache = null;
let pending = null;

/** { warehouses, locations, categories, users, products } - loaded once, reloaded after changes. */
export function getLookups(force = false) {
  if (cache && !force) return Promise.resolve(cache);
  if (pending && !force) return pending;
  pending = Promise.all([
    api.get('/warehouses'),
    api.get('/locations'),
    api.get('/categories'),
    api.get('/users'),
    fetchAll('/products'),
  ])
    .then(([warehouses, locations, categories, users, products]) => {
      cache = { warehouses, locations, categories, users, products };
      return cache;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function invalidateLookups() {
  cache = null;
}

/** Tells every open page that data changed (they reload what they show). */
export function notifyChanged() {
  invalidateLookups();
  window.dispatchEvent(new CustomEvent('stocksense:changed'));
}

/** Runs `handler` whenever data changes; returns a function that stops listening. */
export function onDataChanged(handler) {
  window.addEventListener('stocksense:changed', handler);
  return () => window.removeEventListener('stocksense:changed', handler);
}

// Lets one page open another with something already filled in,
// e.g. dashboard "Low stock" card -> products page filtered to low stock.
const nextFilters = {};

export function setNextFilter(page, filter) {
  nextFilters[page] = filter;
}

export function takeNextFilter(page) {
  const filter = nextFilters[page];
  delete nextFilters[page];
  return filter;
}

/** Opens a new receipt pre-filled with the suggested quantity of a low stock alert / reordering rule. */
export async function reorder(rule) {
  const { locations } = await getLookups();
  setNextFilter('receipt-new', {
    destLocationId: locations.find((l) => l.warehouseId === rule.warehouseId)?.id,
    lines: [{ productId: rule.productId, quantity: rule.suggestedQty }],
  });
  window.location.hash = '#receipts/new';
}

export const locationOptions = (locations) =>
  locations.map((l) => ({ value: l.id, label: `${l.fullCode} — ${l.name}` }));

export const productOptions = (products) => products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }));

export const warehouseOptions = (warehouses) => warehouses.map((w) => ({ value: w.id, label: `${w.name} (${w.code})` }));
