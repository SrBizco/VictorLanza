import assert from 'node:assert/strict';
import test from 'node:test';
import '../js/i18n.js';

const { getText, getProductText, supportedLanguages } = globalThis.i18nStore;

test('supports Spanish, English and Brazilian Portuguese interface copy', () => {
  assert.deepEqual(supportedLanguages, ['es', 'en', 'pt-BR']);
  assert.equal(getText('en', 'catalog.viewModels'), 'View models');
  assert.equal(getText('pt-BR', 'cart.consultation'), 'Consulta');
});

test('localizes dynamic catalogue descriptions without translating model names', () => {
  assert.equal(
    getProductText('en', 'acolchadas-doble-costura', 'description'),
    'Double-stitched, made from a single piece of leather, without joins or synthetics.',
  );
  assert.equal(getProductText('pt-BR', 'neo', 'name'), 'Neo');
});

test('builds a localized WhatsApp request for the selected language', async () => {
  await import('../js/catalog.js');
  const { buildWhatsAppUrl, products } = globalThis.catalogStore;
  const message = new URL(buildWhatsAppUrl([products[0]], '5491112345678', 'en')).searchParams.get('text');

  assert.match(message, /Hello, I would like to ask about these models:/);
  assert.match(message, /price, color, and available size/);
});
