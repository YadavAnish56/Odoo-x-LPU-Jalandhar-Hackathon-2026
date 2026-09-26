// Modal to create or edit a reordering rule (min / max stock of a product in a warehouse).
import { api } from '../api.js';
import { getLookups, notifyChanged, productOptions, warehouseOptions } from '../store.js';
import { field, INPUT, num, readForm, selectHTML, showError, showModal, showToast } from '../utils.js';

/** preset: { id, productId, warehouseId, minQty, maxQty } */
export async function openReorderRuleForm(preset = {}) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }
  const editing = Boolean(preset.id);
  const body = `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${field('Product', selectHTML('productId', productOptions(lookups.products), preset.productId, 'Select a product...', editing ? 'disabled' : ''), { required: true })}
      ${field('Warehouse', selectHTML('warehouseId', warehouseOptions(lookups.warehouses), preset.warehouseId ?? lookups.warehouses[0]?.id, 'Select a warehouse...', editing ? 'disabled' : ''), { required: true })}
      <div class="grid grid-cols-2 gap-3">
        ${field('Minimum', `<input type="number" name="minQty" min="0" step="any" value="${preset.minQty ?? ''}" class="${INPUT}"/>`, { required: true })}
        ${field('Maximum', `<input type="number" name="maxQty" min="0" step="any" value="${preset.maxQty ?? ''}" class="${INPUT}"/>`, { required: true })}
      </div>
    </form>`;

  showModal(editing ? 'Edit reordering rule' : 'New reordering rule', body, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'save',
      label: 'Save',
      variant: 'primary',
      handler: async (overlay) => {
        const v = readForm(overlay.querySelector('form'));
        const minQty = num(v.minQty);
        const maxQty = num(v.maxQty);
        if (minQty === undefined || maxQty === undefined) throw new Error('Enter the minimum and maximum stock');
        if (maxQty < minQty) throw new Error('The maximum must be at least the minimum');
        if (editing) {
          await api.put(`/reorder-rules/${preset.id}`, { minQty, maxQty });
        } else {
          if (!v.productId || !v.warehouseId) throw new Error('Choose a product and a warehouse');
          await api.post('/reorder-rules', { productId: num(v.productId), warehouseId: num(v.warehouseId), minQty, maxQty });
        }
        showToast('Reordering rule saved');
        notifyChanged();
      },
    },
  ]);
}
