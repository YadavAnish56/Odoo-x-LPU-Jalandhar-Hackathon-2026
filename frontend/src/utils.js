// Shared helpers and small UI building blocks used by every page.
import { errorMessage } from './api.js';

/** Escapes text for safe use inside HTML (all data from the API goes through this). */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  while (container.children.length >= 3) container.firstElementChild.remove();
  container.appendChild(toast);
  setTimeout(() => toast.remove(), type === 'error' ? 5000 : 3000);
}

export const showError = (err) => showToast(errorMessage(err), 'error');

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export const fmtQty = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Value for <input type="date"> in local time. */
export function toDateInput(value = new Date()) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export const initials = (name = '') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

/** Returns a number, or undefined for an empty value. */
export const num = (value) => (value === '' || value === undefined || value === null ? undefined : Number(value));

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Operation / stock labels
// ---------------------------------------------------------------------------
export const OP_TYPE = {
  receipt: { label: 'Receipt', plural: 'Receipts', route: 'receipts', icon: 'move_to_inbox', partner: 'Receive From' },
  delivery: { label: 'Delivery Order', plural: 'Delivery Orders', route: 'deliveries', icon: 'local_shipping', partner: 'Deliver To' },
  internal: { label: 'Internal Transfer', plural: 'Internal Transfers', route: 'transfers', icon: 'sync_alt', partner: null },
  adjustment: { label: 'Inventory Adjustment', plural: 'Inventory Adjustments', route: 'adjustments', icon: 'tune', partner: null },
};

export const OP_STATUS = {
  draft: { label: 'Draft', color: 'gray' },
  waiting: { label: 'Waiting', color: 'amber' },
  ready: { label: 'Ready', color: 'blue' },
  done: { label: 'Done', color: 'green' },
  canceled: { label: 'Canceled', color: 'red' },
};

export const STOCK_STATUS = {
  in: { label: 'In Stock', color: 'green' },
  low: { label: 'Low Stock', color: 'amber' },
  out: { label: 'Out of Stock', color: 'red' },
};

const BADGE = {
  green: 'bg-success-soft text-success',
  amber: 'bg-warning-soft text-warning',
  red: 'bg-danger-soft text-danger',
  blue: 'bg-info-soft text-info',
  orange: 'bg-primary-fixed text-on-primary-fixed-variant',
  gray: 'bg-surface-container-low text-secondary',
};

export function statusBadge(label, color = 'gray') {
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-medium whitespace-nowrap ${BADGE[color] ?? BADGE.gray}">${esc(label)}</span>`;
}

export const opStatusBadge = (status) => statusBadge(OP_STATUS[status]?.label ?? status, OP_STATUS[status]?.color);
export const stockBadge = (status) => statusBadge(STOCK_STATUS[status]?.label ?? status, STOCK_STATUS[status]?.color);
export const operationLabel = (type) => esc(OP_TYPE[type]?.label ?? type);

/** Link to the page of an operation, e.g. #receipts/12 */
export const operationHref = (op) => `#${OP_TYPE[op.type]?.route ?? 'dashboard'}/${op.id}`;

/** Text colour for a stock change: positive = green, negative = red. */
export const changeColor = (n) => (n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-secondary');

// ---------------------------------------------------------------------------
// UI building blocks (the Tailwind classes live here so pages stay consistent)
// ---------------------------------------------------------------------------
const FIELD_BASE =
  'rounded-md border border-surface-container-high bg-surface-container-lowest outline-none transition-colors focus:border-primary-container focus:ring-2 focus:ring-primary-container/20 disabled:bg-surface-container-low disabled:text-secondary';
export const INPUT = `w-full px-3 py-2 text-[14px] ${FIELD_BASE}`;
export const SELECT = INPUT;
/** Compact control for toolbars and filter rows. */
export const FILTER = `h-9 px-3 text-[13px] ${FIELD_BASE}`;
export const LABEL = 'text-[13px] font-medium text-secondary';

const BUTTON = {
  primary: 'bg-primary-container text-on-primary hover:bg-primary-container/90',
  secondary: 'bg-surface-container-lowest border border-surface-container-high text-on-surface hover:bg-surface-container-low',
  danger: 'bg-surface-container-lowest border border-danger/40 text-danger hover:bg-danger-soft',
  ghost: 'text-secondary hover:bg-surface-container-low hover:text-on-surface',
};

/** Button HTML. options: { variant, icon, attrs, type, small } */
export function button(label, { variant = 'secondary', icon, attrs = '', type = 'button', small = false } = {}) {
  const size = small ? 'h-7 px-2.5 text-[12px]' : 'h-9 px-3.5 text-[13px]';
  return `<button type="${type}" ${attrs} class="inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${size} ${BUTTON[variant]}">${icon ? `<span class="material-symbols-outlined !text-[18px]">${icon}</span>` : ''}${esc(label)}</button>`;
}

export const iconButton = (icon, title, attrs = '') =>
  `<button type="button" title="${esc(title)}" aria-label="${esc(title)}" ${attrs} class="p-1.5 rounded-md text-secondary hover:bg-surface-container-low hover:text-on-surface"><span class="material-symbols-outlined !text-[18px]">${icon}</span></button>`;

/** <option> list. options: strings or { value, label } */
export function optionsHTML(options, selected = '', placeholder) {
  const list = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
  return (
    (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '') +
    list.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(selected ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
  );
}

/** Label + control wrapper. */
export function field(label, control, { required = false, hint = '' } = {}) {
  return `<label class="flex flex-col gap-1.5"><span class="${LABEL}">${esc(label)}${required ? ' <span class="text-danger">*</span>' : ''}</span>${control}${hint ? `<span class="text-[12px] text-secondary">${esc(hint)}</span>` : ''}</label>`;
}

export const inputHTML = (name, value = '', attrs = '') => `<input name="${name}" value="${esc(value)}" ${attrs} class="${INPUT}"/>`;
export const selectHTML = (name, options, selected, placeholder, attrs = '') =>
  `<select name="${name}" ${attrs} class="${SELECT}">${optionsHTML(options, selected, placeholder)}</select>`;
export const textareaHTML = (name, value = '', attrs = '') =>
  `<textarea name="${name}" rows="3" ${attrs} class="${INPUT} resize-y">${esc(value)}</textarea>`;

export const CARD = 'bg-surface-container-lowest border border-surface-container rounded-lg';

/** Row above a page's content: actions on the left, filters on the right. */
export const toolbar = (left = '', right = '') => `
  <div class="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
    <div class="flex flex-wrap items-center gap-2">${left}</div>
    <div class="flex flex-wrap items-center gap-2 lg:ml-auto">${right}</div>
  </div>`;

/** Segmented control / tabs. items: [[value, label]]; each button gets `attr="value"`. */
export function segmented(items, active, attr) {
  return `<div class="inline-flex flex-wrap gap-0.5 rounded-md border border-surface-container-high bg-surface-container-lowest p-0.5">${items
    .map(([value, label]) => `<button type="button" ${attr}="${esc(value)}" class="h-8 px-3 rounded text-[13px] font-medium transition-colors ${String(value) === String(active) ? 'bg-primary-fixed text-on-primary-fixed-variant' : 'text-secondary hover:text-on-surface'}">${esc(label)}</button>`)
    .join('')}</div>`;
}

/** Card section title row, optionally with something on the right. */
export const sectionHeader = (title, right = '') =>
  `<div class="flex items-center justify-between gap-3 px-4 py-3"><h3 class="text-[14px] font-semibold">${esc(title)}</h3>${right}</div>`;

/** Table HTML. columns: strings or { label, align: 'right' }; rows: array of <tr> strings. */
export function tableHTML(columns, rows, emptyText = 'Nothing here yet') {
  if (!rows.length) return emptyHTML(emptyText);
  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left text-[13px]">
        <thead><tr class="bg-surface-container-low/60 text-[12px] text-secondary">
          ${columns.map((c) => `<th class="px-4 py-2.5 font-medium whitespace-nowrap ${c.align === 'right' ? 'text-right' : ''}">${esc(c.label ?? c)}</th>`).join('')}
        </tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
}

export const TD = 'px-4 py-2.5 border-t border-surface-container';
export const ROW = 'hover:bg-surface-container-low/70 transition-colors';

/** "1–10 of 16" + previous / next buttons for paginated API results. */
export function pagerHTML(res) {
  if (!res.total) return '';
  return `
    <div class="flex flex-col sm:flex-row items-center justify-between gap-2 px-4 py-2.5 border-t border-surface-container text-[13px] text-secondary">
      <span>${(res.page - 1) * res.limit + 1}–${(res.page - 1) * res.limit + res.items.length} of ${res.total}</span>
      ${res.totalPages > 1 ? `<div class="flex items-center gap-2">
        ${button('Previous', { small: true, attrs: `data-page="${res.page - 1}" ${res.page <= 1 ? 'disabled' : ''}` })}
        ${button('Next', { small: true, attrs: `data-page="${res.page + 1}" ${res.page >= res.totalPages ? 'disabled' : ''}` })}
      </div>` : ''}
    </div>`;
}

export const loadingHTML = () =>
  '<div class="p-8 flex flex-col items-center gap-2.5"><div class="skeleton w-48 h-3"></div><div class="skeleton w-32 h-3"></div></div>';

export const emptyHTML = (text) => `<div class="px-4 py-10 text-center text-secondary text-[13px]">${esc(text)}</div>`;

export const errorHTML = (err) =>
  `<div class="px-4 py-10 text-center text-[13px]"><p class="font-medium text-danger">Could not load data</p><p class="text-secondary mt-1">${esc(errorMessage(err))}</p></div>`;

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------
/**
 * Opens a modal. actions: [{ id, label, variant, handler(overlay) }].
 * If a handler returns false (or throws) the modal stays open; errors are shown as a toast.
 */
export function showModal(title, bodyHTML, actions = [], { wide = false } = {}) {
  document.querySelector('.modal-overlay-dynamic')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay-dynamic';
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };
  overlay.innerHTML = `
    <div class="modal-content" style="${wide ? 'max-width: 820px;' : ''}">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-[16px] font-semibold">${esc(title)}</h3>
        ${iconButton('close', 'Close', 'data-close')}
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${actions.length ? `<div class="flex flex-wrap justify-end gap-2 mt-5 pt-4 border-t border-surface-container">
        ${actions.map((a) => button(a.label, { variant: a.variant ?? 'secondary', attrs: `data-action="${a.id}"` })).join('')}
      </div>` : ''}
    </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('[data-close]').onclick = () => overlay.remove();

  actions.forEach((a) => {
    const btn = overlay.querySelector(`[data-action="${a.id}"]`);
    btn.onclick = async () => {
      if (!a.handler) return overlay.remove();
      const label = btn.textContent;
      overlay.querySelectorAll('[data-action]').forEach((b) => (b.disabled = true));
      btn.textContent = 'Saving...';
      try {
        if ((await a.handler(overlay)) !== false) overlay.remove();
      } catch (err) {
        showError(err);
      } finally {
        if (overlay.isConnected) {
          overlay.querySelectorAll('[data-action]').forEach((b) => (b.disabled = false));
          btn.textContent = label;
        }
      }
    };
  });
  overlay.querySelector('input:not([disabled]), select:not([disabled]), textarea')?.focus();
  return overlay;
}

/** Reads all named fields inside `root` into an object of trimmed strings. */
export function readForm(root) {
  const values = {};
  root.querySelectorAll('[name]').forEach((el) => {
    values[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return values;
}
