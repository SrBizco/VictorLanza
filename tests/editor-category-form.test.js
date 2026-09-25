import assert from 'node:assert/strict';
import test from 'node:test';
import { buildCategoriesDraft, categoryDialogMarkup, defaultCategories, removeCategory, updateCategoriesDraft } from '../js/editor-category-form.js';

test('category dialog includes a control to add a new category', () => {
  assert.match(categoryDialogMarkup(defaultCategories()), /Agregar categoría/);
});

test('builds a new Spanish-first category with a stable identifier', () => {
  const categories = buildCategoriesDraft({ nameEs: 'Vintage', nameEn: '', namePtBR: '' }, defaultCategories());
  const vintage = categories.find((category) => category.id === 'vintage');
  assert.deepEqual(vintage.name, { es: 'Vintage', en: '', ptBR: '' });
});

test('category dialog exposes each existing category for editing and removal', () => {
  const markup = categoryDialogMarkup(defaultCategories());
  assert.match(markup, /category-acolchadas-es/);
  assert.match(markup, /Eliminar categoría/);
});

test('updates category labels without changing their identifiers', () => {
  const updated = updateCategoriesDraft(defaultCategories(), { 'category-planas-es': 'Correas planas' });
  assert.equal(updated.find((category) => category.id === 'planas').name.es, 'Correas planas');
});

test('removes only the requested unused category', () => {
  assert.equal(removeCategory(defaultCategories(), 'planas').some((category) => category.id === 'planas'), false);
});
