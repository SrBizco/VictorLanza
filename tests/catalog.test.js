import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import '../js/catalog.js';

const getCatalog = () => globalThis.catalogStore;

test('adds a selected model once instead of duplicating it', () => {
  const { addToCart, products } = getCatalog();
  const cart = addToCart([], products[0]);

  assert.deepEqual(cart.map(({ id }) => id), ['acolchadas-doble-costura']);
  assert.equal(addToCart(cart, products[0]).length, 1);
});

test('removes only the selected model from the consultation cart', () => {
  const { products, removeFromCart } = getCatalog();
  const cart = [products[0], products[1]];

  assert.deepEqual(
    removeFromCart(cart, products[0].id).map(({ id }) => id),
    ['costura-full'],
  );
});

test('toggles a model in and out of the consultation cart from the same action', () => {
  const { products, toggleCart } = getCatalog();
  const model = products[0];

  const selected = toggleCart([], model);
  const deselected = toggleCart(selected, model);

  assert.deepEqual(selected, [model]);
  assert.deepEqual(deselected, []);
});

test('creates a WhatsApp message asking for price, color and size for each model', () => {
  const { buildWhatsAppUrl, products } = getCatalog();
  const url = new URL(buildWhatsAppUrl([products[0], products[1]], '5491112345678'));
  const message = url.searchParams.get('text');

  assert.equal(url.origin, 'https://wa.me');
  assert.match(message, /Acolchadas doble costura/);
  assert.match(message, /Costura Full/);
  assert.match(message, /precio, color y medida/);
});

test('uses percent-encoded spaces so WhatsApp receives every model name intact', () => {
  const { buildWhatsAppUrl, products } = getCatalog();
  const rawUrl = buildWhatsAppUrl([products[0], products[11], products[7]], '5491112345678');

  assert.match(rawUrl, /Acolchadas%20doble%20costura/);
  assert.match(rawUrl, /Neo/);
  assert.match(rawUrl, /Mezo/);
  assert.doesNotMatch(rawUrl, /\+/);
});

test('does not create a WhatsApp URL for an empty cart', () => {
  const { buildWhatsAppUrl } = getCatalog();
  assert.equal(buildWhatsAppUrl([], '5491112345678'), null);
});

test('exposes the catalogue store for the non-module browser script used by index.html', () => {
  assert.equal(typeof globalThis.catalogStore?.buildWhatsAppUrl, 'function');
  assert.equal(globalThis.catalogStore?.products.length, 17);
});

test('does not collide with app variables when loaded as a classic browser script', () => {
  const context = { globalThis: null };
  context.globalThis = context;
  const source = fs.readFileSync(new URL('../js/catalog.js', import.meta.url), 'utf8');

  vm.runInNewContext(source, context);

  assert.doesNotThrow(() => {
    vm.runInNewContext('const { addToCart, products } = globalThis.catalogStore;', context);
  });
});
