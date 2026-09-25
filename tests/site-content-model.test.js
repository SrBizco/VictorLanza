import assert from 'node:assert/strict';
import test from 'node:test';
import { localizeSiteContent } from '../js/site-content-model.js';

test('uses Spanish site copy when Portuguese site copy is empty', () => {
  const section = { published: { heroTitle: { es: 'Correas de cuero', ptBR: '' } } };

  assert.equal(localizeSiteContent(section, 'pt-BR').heroTitle, 'Correas de cuero');
});

test('uses Spanish site copy when a translation is stale', () => {
  const section = { published: { heroTitle: { es: 'Cuero', en: 'Leather' } }, translationState: { en: 'stale' } };
  assert.equal(localizeSiteContent(section, 'en').heroTitle, 'Cuero');
});
