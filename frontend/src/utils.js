// Utility helpers shared across pages
export function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const iconMap = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning',
    primary: 'notifications_active'
  };
  const icon = iconMap[type] || 'check_circle';
  toast.innerHTML = `
    <span class="material-symbols-outlined text-[18px] shrink-0">${icon}</span>
    <span class="flex-1 leading-snug">${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-8px)';
    toast.style.transition = 'all 0.25s ease-out';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

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
  return `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full ${colorMap[color] || colorMap.gray} font-label-sm text-label-sm font-semibold">
    <span class="w-1.5 h-1.5 rounded-full ${dotMap[color] || dotMap.gray}"></span>
    ${status}
  </span>`;
}

export function operationIcon(type) {
  const icons = {
    'Receipt': { icon: 'move_to_inbox', color: 'text-emerald-600' },
    'Delivery': { icon: 'local_shipping', color: 'text-primary-container' },
    'Transfer': { icon: 'sync_alt', color: 'text-blue-500' },
    'Transfer Out': { icon: 'sync_alt', color: 'text-blue-500' },
    'Transfer In': { icon: 'sync_alt', color: 'text-blue-500' },
    'Adjustment': { icon: 'tune', color: 'text-secondary' },
  };
  const { icon, color } = icons[type] || { icon: 'help', color: 'text-secondary' };
  return `<span class="inline-flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] ${color}">${icon}</span>${type}</span>`;
}

export function qtyColor(qty) {
  if (typeof qty === 'string') {
    if (qty.startsWith('+')) return 'text-emerald-600';
    if (qty.startsWith('-')) return 'text-error';
  }
  return 'text-on-surface';
}

export function showModal(title, bodyHTML, actions = []) {
  const existing = document.querySelector('.modal-overlay-dynamic');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay modal-overlay-dynamic';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  const actionsHTML = actions.map(a =>
    `<button class="${a.primary
      ? 'px-4 py-2 bg-primary-container hover:bg-primary text-on-primary font-label-md text-label-md rounded-xl shadow-sm transition-all'
      : 'px-4 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md rounded-xl transition-colors'
    }" data-action="${a.id}">${a.label}</button>`
  ).join('');

  overlay.innerHTML = `
    <div class="modal-content">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-headline-md text-headline-md text-on-surface font-semibold">${title}</h3>
        <button class="modal-close p-1 rounded-lg hover:bg-surface-container text-secondary transition-colors">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      <div class="modal-body">${bodyHTML}</div>
      ${actions.length ? `<div class="flex items-center justify-end gap-space-sm mt-6 pt-4 border-t border-surface-container">${actionsHTML}</div>` : ''}
    </div>
  `;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').onclick = () => overlay.remove();

  // Wire action handlers
  actions.forEach(a => {
    const btn = overlay.querySelector(`[data-action="${a.id}"]`);
    if (btn && a.handler) {
      btn.onclick = () => { a.handler(); overlay.remove(); };
    }
  });

  return overlay;
}

export function formField(label, type, name, value = '', placeholder = '', options = []) {
  if (type === 'select') {
    return `
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">${label}</label>
        <select name="${name}" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all">
          <option value="">Select ${label.toLowerCase()}...</option>
          ${options.map(o => `<option value="${o}" ${o === value ? 'selected' : ''}>${o}</option>`).join('')}
        </select>
      </div>`;
  }
  if (type === 'textarea') {
    return `
      <div class="flex flex-col gap-1">
        <label class="font-label-md text-label-md text-secondary">${label}</label>
        <textarea name="${name}" rows="3" placeholder="${placeholder}" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all resize-none">${value}</textarea>
      </div>`;
  }
  return `
    <div class="flex flex-col gap-1">
      <label class="font-label-md text-label-md text-secondary">${label}</label>
      <input type="${type}" name="${name}" value="${value}" placeholder="${placeholder}" class="w-full bg-surface-container-low text-on-surface font-body-sm text-body-sm rounded-xl px-space-md py-2.5 outline-none focus:ring-2 focus:ring-primary-container transition-all"/>
    </div>`;
}
