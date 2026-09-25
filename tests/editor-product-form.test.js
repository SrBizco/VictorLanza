import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProductDraft, confirmRemoval, needsLegacyMediaMigration, productDialogMarkup } from '../js/editor-product-form.js';
import { publishableDraft } from '../js/admin-model.js';

test('new product dialog asks for Spanish fields before optional translations', () => {
  const markup = productDialogMarkup({ name: { es: '' }, description: { es: '' }, media: [] }, { isNew: true });
  assert.match(markup, /Nombre del modelo/);
  assert.match(markup, /Agregar fotos o video/);
  assert.match(markup, /Traducciones opcionales/);
});

test('cancelling an exact-name removal makes no removal decision', () => {
  assert.equal(confirmRemoval('Neo', () => false), false);
  assert.equal(confirmRemoval('Neo', () => true), true);
});

test('builds a Spanish-first draft and marks translations stale after Spanish edits', () => {
  const draft = buildProductDraft({ nameEs: 'Neo nuevo', descriptionEs: 'Cuero', category: 'acolchadas' }, {
    name: { es: 'Neo', en: 'Neo' }, description: { es: 'Leather', en: 'Leather' }, media: [], translationState: { en: 'current', ptBR: 'current' },
  });
  assert.equal(draft.name.es, 'Neo nuevo');
  assert.equal(draft.translationState.en, 'stale');
});

test('dialog renders existing media controls without exposing storage paths', () => {
  const markup = productDialogMarkup({
    name: { es: 'Neo' }, description: { es: 'Cuero' }, category: 'acolchadas',
    media: [{ id: 'media-1', kind: 'image', role: 'cover', path: 'draft/private-name.jpg' }],
  });
  assert.match(markup, /Es la portada/);
  assert.match(markup, /Mover arriba/);
  assert.match(markup, /Quitar/);
  assert.doesNotMatch(markup, /private-name\.jpg/);
});

test('Spanish-only draft remains publishable after optional locales become stale', () => {
  const draft = buildProductDraft({ nameEs: 'Neo', descriptionEs: 'Cuero vacuno', category: 'acolchadas' }, {
    name: { es: 'Viejo', en: 'Old' }, description: { es: 'Viejo', en: 'Old' },
    media: [{ id: 'cover', kind: 'image', role: 'cover' }], translationState: { en: 'current', ptBR: 'current' },
  });
  assert.equal(publishableDraft(draft).valid, true);
  assert.equal(draft.translationState.ptBR, 'stale');
});

test('recognizes a local catalogue asset that must be copied before publication', () => {
  assert.equal(needsLegacyMediaMigration({ legacySrc: 'assets/products/neo.jpg' }), true);
  assert.equal(needsLegacyMediaMigration({ id: 'stored-media', kind: 'image' }), false);
});

test('product dialog accepts categories provided by the visual editor', () => {
  const markup = productDialogMarkup({ name: { es: '' }, description: { es: '' }, media: [] }, {
    categories: [{ id: 'vintage', name: { es: 'Vintage' } }],
  });
  assert.match(markup, /value="vintage"/);
  assert.match(markup, />Vintage</);
});

test('media list displays its preview and identifies the selected cover', () => {
  const markup = productDialogMarkup({
    name: { es: 'Neo' }, description: { es: 'Cuero' }, media: [{ kind: 'image', role: 'cover', previewUrl: 'blob:preview' }],
  });
  assert.match(markup, /blob:preview/);
  assert.match(markup, /Portada/);
});
