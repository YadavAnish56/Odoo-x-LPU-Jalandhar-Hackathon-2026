// Product categories: list, create, edit, delete.
import { api, isManager } from '../api.js';
import { notifyChanged, onDataChanged, setNextFilter } from '../store.js';
import {
  button,
  CARD,
  errorHTML,
  esc,
  field,
  iconButton,
  inputHTML,
  loadingHTML,
  readForm,
  ROW,
  showError,
  showModal,
  showToast,
  tableHTML,
  TD,
  textareaHTML,
  toolbar,
} from '../utils.js';

export default function renderCategories(container) {
  const manager = isManager();
  let categories = [];

  container.innerHTML = `
    ${manager ? toolbar(button('New', { variant: 'primary', icon: 'add', attrs: 'id="new-btn"' })) : ''}
    <section id="list" class="${CARD} overflow-hidden">${loadingHTML()}</section>`;

  async function load() {
    try {
      categories = await api.get('/categories');
      if (!container.isConnected) return;
      const rows = categories.map(
        (c) => `
        <tr class="${ROW}">
          <td class="${TD} font-medium">${esc(c.name)}</td>
          <td class="${TD} text-secondary">${esc(c.description || '—')}</td>
          <td class="${TD} text-right"><button type="button" data-products="${c.id}" class="font-mono text-primary hover:underline">${c.productCount}</button></td>
          <td class="${TD} text-right whitespace-nowrap">${manager ? iconButton('edit', 'Edit', `data-edit="${c.id}"`) + iconButton('delete', 'Delete', `data-delete="${c.id}"`) : ''}</td>
        </tr>`,
      );
      container.querySelector('#list').innerHTML = tableHTML(['Name', 'Description', { label: 'Products', align: 'right' }, ''], rows, 'No categories yet.');
    } catch (err) {
      if (container.isConnected) container.querySelector('#list').innerHTML = errorHTML(err);
    }
  }

  function openForm(category = null) {
    showModal(category ? 'Edit category' : 'New category', `
      <form class="flex flex-col gap-4" onsubmit="return false">
        ${field('Name', inputHTML('name', category?.name ?? '', 'placeholder="e.g. Raw Materials"'), { required: true })}
        ${field('Description', textareaHTML('description', category?.description ?? '', 'placeholder="Optional"'))}
      </form>`, [
      { id: 'cancel', label: 'Cancel' },
      {
        id: 'save',
        label: 'Save',
        variant: 'primary',
        handler: async (overlay) => {
          const v = readForm(overlay.querySelector('form'));
          if (!v.name) throw new Error('Name is required');
          if (category) await api.put(`/categories/${category.id}`, { name: v.name, description: v.description });
          else await api.post('/categories', { name: v.name, description: v.description || undefined });
          showToast(`Category "${v.name}" saved`);
          notifyChanged();
        },
      },
    ]);
  }

  container.querySelector('#new-btn')?.addEventListener('click', () => openForm());
  container.querySelector('#list').addEventListener('click', async (e) => {
    const products = e.target.closest('[data-products]');
    if (products) {
      setNextFilter('products', { categoryId: products.dataset.products });
      window.location.hash = '#products';
      return;
    }
    const edit = e.target.closest('[data-edit]');
    if (edit) return openForm(categories.find((c) => String(c.id) === edit.dataset.edit));
    const del = e.target.closest('[data-delete]');
    if (del) {
      const c = categories.find((x) => String(x.id) === del.dataset.delete);
      if (!window.confirm(`Delete the category "${c.name}"? Its ${c.productCount} product(s) become uncategorized.`)) return;
      try {
        await api.del(`/categories/${c.id}`);
        showToast('Category deleted');
        notifyChanged();
      } catch (err) {
        showError(err);
      }
    }
  });

  load();
  return onDataChanged(load);
}
