function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

export function defaultCategories() {
  return [
    ['acolchadas', 'Acolchadas'], ['planas', 'Planas'], ['texturadas', 'Texturadas'], ['especiales', 'Especiales'], ['cierres', 'Cierres'],
  ].map(([id, name]) => ({ id, name: { es: name, en: '', ptBR: '' } }));
}

export function categoryId(name) {
  return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 48);
}

export function categoryDialogMarkup(categories) {
  return `<form class="editor-form" novalidate>
    <h2 id="editor-dialog-title">Categorías del catálogo</h2>
    <p class="editor-form-help">Podés cambiar nombres, eliminar categorías sin modelos o agregar una nueva. Las traducciones son opcionales.</p>
    <div class="editor-category-list">${categories.map((category) => `<fieldset data-category-id="${escapeHtml(category.id)}"><legend>${escapeHtml(category.name?.es ?? category.id)}</legend><label>Nombre en español <input name="category-${escapeHtml(category.id)}-es" required value="${escapeHtml(category.name?.es)}"></label><details><summary>Traducciones opcionales</summary><label>Nombre en inglés <input name="category-${escapeHtml(category.id)}-en" value="${escapeHtml(category.name?.en)}"></label><label>Nombre en portugués <input name="category-${escapeHtml(category.id)}-ptbr" value="${escapeHtml(category.name?.ptBR)}"></label></details><button type="button" data-category-action="remove" data-category-id="${escapeHtml(category.id)}">Eliminar categoría</button></fieldset>`).join('')}</div>
    <fieldset><legend>Nueva categoría</legend><label>Nombre en español <input name="category-name-es" placeholder="Ej.: Vintage"></label><details><summary>Traducciones opcionales</summary><label>Nombre en inglés <input name="category-name-en"></label><label>Nombre en portugués <input name="category-name-ptbr"></label></details></fieldset>
    <p class="editor-form-error" role="alert" hidden></p>
    <div class="editor-form-actions"><button type="button" data-dialog-action="cancel">Cancelar</button><button type="submit">Agregar categoría</button></div>
  </form>`;
}

export function buildCategoriesDraft({ nameEs = '', nameEn = '', namePtBR = '' }, categories = []) {
  const spanish = String(nameEs).trim();
  const id = categoryId(spanish);
  if (!spanish || !id || categories.some((category) => category.id === id)) return [...categories];
  return [...categories, { id, name: { es: spanish, en: String(nameEn).trim(), ptBR: String(namePtBR).trim() } }];
}

export function updateCategoriesDraft(categories = [], values = {}) {
  return categories.map((category) => ({
    ...category,
    name: {
      es: String(values[`category-${category.id}-es`] ?? category.name?.es ?? '').trim(),
      en: String(values[`category-${category.id}-en`] ?? category.name?.en ?? '').trim(),
      ptBR: String(values[`category-${category.id}-ptbr`] ?? category.name?.ptBR ?? '').trim(),
    },
  })).filter((category) => category.name.es);
}

export function removeCategory(categories = [], id) {
  return categories.filter((category) => category.id !== id);
}
