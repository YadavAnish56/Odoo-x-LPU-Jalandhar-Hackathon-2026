// Utility helpers shared across pages
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
  container.appendChild(toast);
  setTimeout(() => toast.remove(), type === 'error' ? 5000 : 3000);
}

export function showError(err) {
  showToast(errorMessage(err), 'error');
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function fmtQty(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

export function fmtMoney(value) {
  const currency = getSetting('currency', 'INR');
  try {
    return Number(value || 0).toLocaleString('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 });
  } catch {
    return fmtQty(value);
  }
}

export function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

/** Value for <input type="date"> in local time. */
export function toDateInput(value = new Date()) {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
}

// ---------------------------------------------------------------------------
// Status / type labels
// ---------------------------------------------------------------------------
export const OP_STATUS = {
  draft: { label: 'Draft', color: 'gray' },
  waiting: { label: 'Waiting', color: 'amber' },
  ready: { label: 'Ready', color: 'blue' },
  done: { label: 'Done', color: 'green' },
  canceled: { label: 'Canceled', color: 'red' },
};

export const OP_TYPE = {
  receipt: { label: 'Receipt', plural: 'Receipts', icon: 'move_to_inbox', color: 'text-emerald-600' },
  delivery: { label: 'Delivery', plural: 'Deliveries', icon: 'local_shipping', color: 'text-primary-container' },
  internal: { label: 'Transfer', plural: 'Transfers', icon: 'sync_alt', color: 'text-blue-500' },
  adjustment: { label: 'Adjustment', plural: 'Adjustments', icon: 'tune', color: 'text-secondary' },
};

export const STOCK_STATUS = {
  in: { label: 'In Stock', color: 'green' },
  low: { label: 'Low Stock', color: 'orange' },
  out: { label: 'Out of Stock', color: 'red' },
};

export function statusBadge(status, color = 'green') {
  const colorMap = {
    green: 'bg-emerald-50 text-emerald-700',
    orange: 'bg-primary-fixed text-on-primary-fixed-variant',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-error-container text-on-error-container',
    gray: 'bg-surface-container text-secondary',
    blue: 'bg-blue-50 text-blue-700',
  };
  const dotMap = {
    green: 'bg-emerald-500',
    orange: 'bg-primary-container',
    amber: 'bg-amber-500',
    red: 'bg-error',
    gray: 'bg-secondary',
    blue: 'bg-blue-500',
  };
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${colorMap[color] || colorMap.gray} font-label-sm text-label-sm font-semibold whitespace-nowrap">
    <span class="w-1.5 h-1.5 rounded-full ${dotMap[color] || dotMap.gray}"></span>
    ${esc(status)}
  </span>`;
}

export const opStatusBadge = (status) => statusBadge(OP_STATUS[status]?.label ?? status, OP_STATUS[status]?.color);
export const stockBadge = (status) => statusBadge(STOCK_STATUS[status]?.label ?? status, STOCK_STATUS[status]?.color);

export function operationIcon(type) {
  const meta = OP_TYPE[type] ?? { label: type, icon: 'help', color: 'text-secondary' };
  return `<span class="inline-flex items-center gap-1.5 whitespace-nowrap"><span class="material-symbols-outlined text-[16px] ${meta.color}">${meta.icon}</span>${esc(meta.label)}</span>`;
}

/** Material icon for a product, based on its category / name. */
export function productIcon(product) {
  const text = `${product.categoryName ?? ''} ${product.name ?? product.productName ?? ''}`.toLowerCase();
  const icons = [
    [/steel|metal|raw|rod|alloy|copper|alumin/, 'precision_manufacturing'],
    [/chair|sofa|seat/, 'chair'],
    [/table|desk|furniture/, 'table_restaurant'],
    [/monitor|screen|display/, 'monitor'],
    [/laptop|computer/, 'laptop_mac'],
    [/keyboard/, 'keyboard'],
    [/electronic/, 'memory'],
    [/box|packag|carton/, 'inventory_2'],
    [/tape/, 'healing'],
    [/bolt|screw|fastener|hardware|bearing/, 'hardware'],
    [/pipe|valve/, 'plumbing'],
  ];
  return icons.find(([re]) => re.test(text))?.[1] ?? 'category';
}

// ---------------------------------------------------------------------------
// Page states
// ---------------------------------------------------------------------------
export const loadingHTML = (text = 'Loading...') =>
  `<div class="p-10 flex flex-col items-center gap-3 text-secondary font-body-sm text-body-sm"><div class="skeleton w-48 h-3"></div><div class="skeleton w-32 h-3"></div><span>${esc(text)}</span></div>`;

export const emptyHTML = (text, icon = 'inbox') =>
  `<div class="p-10 text-center text-secondary font-body-sm text-body-sm"><span class="material-symbols-outlined text-[40px] text-surface-container-high block mb-2">${icon}</span>${esc(text)}</div>`;

export const errorHTML = (err) =>
  `<div class="p-10 text-center font-body-sm text-body-sm"><span class="material-symbols-outlined text-[40px] text-error block mb-2">cloud_off</span><p class="text-on-surface font-medium">Could not load data</p><p class="text-secondary mt-1">${esc(errorMessage(err))}</p></div>`;

// ---------------------------------------------------------------------------
// Modal & forms
// ---------------------------------------------------------------------------
/**
 * Opens a modal. Each action: { id, label, primary, handler(overlay) }.
 * If a handler returns false (or throws) the modal stays open; errors are shown as a toast.
 */
export function showModal(title, bodyHTML, actions = [], { wide = false } = {}) {
  document.querySelector('.modal-overlay-dynamic')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay-dynamic';
  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.remove();
  };

  const actionsHTML = actions
    .map(
      (a) =>
        `<button type="button" class="${
          a.primary
            ? 'px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all disabled:opacity-60'
            : 'px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors disabled:opacity-60'
        }" data-action="${a.id}">${esc(a.label)}</button>`,
    )
    .join('');

  overlay.innerHTML = `
    <div class="modal-content" style="${wide ? 'max-width: 860px;' : ''}">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-headline-md text-headline-md text-on-surface font-semibold">${esc(title)}</h3>
        <button type="button" class="modal-close p-1 rounded-lg hover:bg-surface-container text-secondary transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${actions.length ? `<div class="flex flex-wrap items-center justify-end gap-space-sm mt-6 pt-4 border-t border-surface-container">${actionsHTML}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').onclick = () => overlay.remove();

  actions.forEach((a) => {
    const btn = overlay.querySelector(`[data-action="${a.id}"]`);
    if (!btn) return;
    btn.onclick = async () => {
      if (!a.handler) return overlay.remove();
      const label = btn.textContent;
      overlay.querySelectorAll('[data-action]').forEach((b) => (b.disabled = true));
      btn.textContent = 'Please wait...';
      try {
        const result = await a.handler(overlay);
        if (result !== false) overlay.remove();
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

  return overlay;
}

const inputClass =
  'w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all';

/**
 * Form field HTML. Options may be strings or { value, label }.
 * extra: { required, min, step, hint, placeholderOption }
 */
export function formField(label, type, name, value = '', placeholder = '', options = [], extra = {}) {
  const req = extra.required ? 'required' : '';
  const labelHTML = `<label class="font-label-md text-label-md text-secondary">${esc(label)}${extra.required ? ' <span class="text-error">*</span>' : ''}</label>`;
  const hint = extra.hint ? `<span class="font-label-sm text-label-sm text-secondary">${esc(extra.hint)}</span>` : '';

  if (type === 'select') {
    const opts = options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    return `
      <div class="flex flex-col gap-1">
        ${labelHTML}
        <select name="${name}" ${req} class="${inputClass}">
          ${extra.placeholderOption === false ? '' : `<option value="">${esc(extra.placeholderOption ?? `Select ${label.toLowerCase()}...`)}</option>`}
          ${opts.map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        </select>
        ${hint}
      </div>`;
  }
  if (type === 'textarea') {
    return `
      <div class="flex flex-col gap-1">
        ${labelHTML}
        <textarea name="${name}" rows="3" ${req} placeholder="${esc(placeholder)}" class="${inputClass} resize-none">${esc(value)}</textarea>
        ${hint}
      </div>`;
  }
  const numberAttrs = type === 'number' ? `min="${extra.min ?? 0}" step="${extra.step ?? 'any'}"` : '';
  return `
    <div class="flex flex-col gap-1">
      ${labelHTML}
      <input type="${type}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${req} ${numberAttrs} class="${inputClass}"/>
      ${hint}
    </div>`;
}

/** Reads all named fields inside `root` into an object of trimmed strings. */
export function readForm(root) {
  const values = {};
  root.querySelectorAll('[name]').forEach((el) => {
    values[el.name] = el.type === 'checkbox' ? el.checked : el.value.trim();
  });
  return values;
}

/** Returns a number, or undefined for an empty string. */
export const num = (value) => (value === '' || value === undefined || value === null ? undefined : Number(value));

export function debounce(fn, ms = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------------------------------------------------------
// Local preferences & export
// ---------------------------------------------------------------------------
export function getSetting(key, fallback) {
  try {
    const all = JSON.parse(localStorage.getItem('stocksense_settings') || '{}');
    return all[key] ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveSettings(values) {
  try {
    const all = JSON.parse(localStorage.getItem('stocksense_settings') || '{}');
    localStorage.setItem('stocksense_settings', JSON.stringify({ ...all, ...values }));
  } catch {
    /* ignore */
  }
}

/** Downloads rows (array of arrays) as a CSV file. */
export function downloadCSV(filename, rows) {
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
