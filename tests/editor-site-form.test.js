import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLocalizedField, siteFieldDialogMarkup } from '../js/editor-site-form.js';

test('site text dialog keeps English and Portuguese optional', () => {
  const markup = siteFieldDialogMarkup({ title: 'Título de portada', spanish: 'Cuero', english: '', portuguese: '' });
  assert.match(markup, /Texto en español/);
  assert.match(markup, /Traducciones opcionales/);
});

test('localized field contains each supported locale', () => {
  assert.deepEqual(buildLocalizedField({ spanish: 'Cuero', english: 'Leather', portuguese: 'Couro' }), { es: 'Cuero', en: 'Leather', ptBR: 'Couro' });
});
