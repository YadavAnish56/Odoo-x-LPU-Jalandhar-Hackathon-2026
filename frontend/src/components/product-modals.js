// Modals for products and reordering rules (manager only).
import { api } from '../api.js';
import { getLookups, locationOptions, notifyChanged, productOptions, warehouseOptions } from '../store.js';
import { formField, num, readForm, showError, showModal, showToast } from '../utils.js';

const UNITS = ['Units', 'pcs', 'kg', 'g', 'L', 'm', 'box'];

/** Create a product (product = null) or edit an existing one. */
export async function openProductForm(product = null) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }
  const editing = Boolean(product);
  const categories = lookups.categories.map((c) => ({ value: c.id, label: c.name }));
  const units = [...new Set([...UNITS, product?.uom].filter(Boolean))];

  const body = `
    <form class="flex flex-col gap-4" onsubmit="return false">
      ${formField('Product Name', 'text', 'name', product?.name ?? '', 'e.g. Steel Rod 12mm', [], { required: true })}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${formField('SKU / Code', 'text', 'sku', product?.sku ?? '', 'e.g. STL-001', [], { required: true })}
        ${formField('Unit of Measure', 'select', 'uom', product?.uom ?? 'Units', '', units, { placeholderOption: false })}
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        ${formField('Category', 'select', 'categoryId', product?.categoryId ?? '', '', categories, { placeholderOption: 'No category' })}
        ${formField('Or new category', 'text', 'newCategory', '', 'Type to create a new one')}
      </div>
      ${formField('Cost per unit', 'number', 'costPrice', product?.costPrice ?? '', '0')}
      ${editing ? '' : `
        <div class="p-4 rounded-xl bg-surface-container-low/60 flex flex-col gap-3">
          <div class="font-label-md text-label-md text-on-surface font-semibold">Initial stock (optional)</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${formField('Quantity', 'number', 'initialQty', '', '0')}
            ${formField('Location', 'select', 'initialLocationId', '', '', locationOptions(lookups.locations))}
          </div>
          <div class="font-label-md text-label-md text-on-surface font-semibold pt-1">Reordering rule (optional)</div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            ${formField('Warehouse', 'select', 'ruleWarehouseId', lookups.warehouses[0]?.id ?? '', '', warehouseOptions(lookups.warehouses))}
            ${formField('Min stock', 'number', 'minQty', '', 'e.g. 10')}
            ${formField('Max stock', 'number', 'maxQty', '', 'e.g. 50')}
          </div>
        </div>`}
    </form>`;

  const save = async (overlay) => {
    const v = readForm(overlay.querySelector('form'));
    if (!v.name || !v.sku) throw new Error('Name and SKU are required');

    let categoryId = v.categoryId ? num(v.categoryId) : null;
    if (v.newCategory) {
      const existing = lookups.categories.find((c) => c.name.toLowerCase() === v.newCategory.toLowerCase());
      categoryId = existing ? existing.id : (await api.post('/categories', { name: v.newCategory })).id;
    }

    const payload = { name: v.name, sku: v.sku, uom: v.uom, categoryId, costPrice: num(v.costPrice) ?? 0 };
    if (editing) {
      await api.put(`/products/${product.id}`, payload);
      showToast(`${v.name} updated`);
      notifyChanged();
      return;
    }

    const initialQty = num(v.initialQty);
    if (initialQty > 0 && !v.initialLocationId) throw new Error('Choose a location for the initial stock');
    const minQty = num(v.minQty);
    const maxQty = num(v.maxQty);
    if (minQty !== undefined && !v.ruleWarehouseId) throw new Error('Choose a warehouse for the reordering rule');
    if (minQty !== undefined && maxQty !== undefined && maxQty < minQty) throw new Error('Max stock must be at least the min stock');

    const created = await api.post('/products', {
      ...payload,
      initialStock: initialQty > 0 ? { locationId: num(v.initialLocationId), quantity: initialQty } : undefined,
    });
    if (minQty !== undefined) {
      try {
        await api.post('/reorder-rules', {
          productId: created.id,
          warehouseId: num(v.ruleWarehouseId),
          minQty,
          maxQty: maxQty ?? minQty * 4,
        });
      } catch (err) {
        showError(err);
      }
    }
    showToast(`${created.name} added`);
    notifyChanged();
  };

  showModal(editing ? `Edit: ${product.name}` : 'Add New Product', body, [
    { id: 'cancel', label: 'Cancel' },
    ...(editing && product.isActive
      ? [{
          id: 'archive',
          label: 'Archive',
          handler: async () => {
            if (!window.confirm(`Archive ${product.name}? It will be hidden from lists; its history is kept.`)) return false;
            await api.del(`/products/${product.id}`);
            showToast(`${product.name} archived`);
            notifyChanged();
            window.location.hash = '#products';
          },
        }]
      : []),
    { id: 'save', label: editing ? 'Update Product' : 'Save Product', primary: true, handler: save },
  ]);
}

/** Create or update a reordering rule. preset: { productId, warehouseId, minQty, maxQty } */
export async function openReorderRuleForm(preset = {}) {
  let lookups;
  try {
    lookups = await getLookups();
  } catch (err) {
    return showError(err);
  }
  const body = `
    <form class="flex flex-col gap-4" onsubmit="return false">
      <p class="font-body-sm text-body-sm text-secondary">When stock in the warehouse drops to the minimum, the product shows up in low stock alerts. The suggested order refills it up to the maximum.</p>
      ${formField('Product', 'select', 'productId', preset.productId ?? '', '', productOptions(lookups.products), { required: true })}
      ${formField('Warehouse', 'select', 'warehouseId', preset.warehouseId ?? lookups.warehouses[0]?.id ?? '', '', warehouseOptions(lookups.warehouses), { required: true })}
      <div class="grid grid-cols-2 gap-3">
        ${formField('Min stock', 'number', 'minQty', preset.minQty ?? '', '10', [], { required: true })}
        ${formField('Max stock', 'number', 'maxQty', preset.maxQty ?? '', '50', [], { required: true })}
      </div>
    </form>`;

  showModal(preset.id ? 'Edit Reordering Rule' : 'New Reordering Rule', body, [
    { id: 'cancel', label: 'Cancel' },
    {
      id: 'save',
      label: 'Save Rule',
      primary: true,
      handler: async (overlay) => {
        const v = readForm(overlay.querySelector('form'));
        if (!v.productId || !v.warehouseId || v.minQty === '' || v.maxQty === '') throw new Error('Fill in all fields');
        await api.post('/reorder-rules', {
          productId: num(v.productId),
          warehouseId: num(v.warehouseId),
          minQty: num(v.minQty),
          maxQty: num(v.maxQty),
        });
        showToast('Reordering rule saved');
        notifyChanged();
      },
    },
  ]);
}
