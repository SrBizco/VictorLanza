# Catálogo Victor Lanza Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una primera versión estática del catálogo de correas con carrito de consulta por WhatsApp.

**Architecture:** HTML semántico renderiza la estructura de una única página. JavaScript nativo importa los modelos desde `js/catalog.js`, gestiona filtros y carrito, y construye la URL de WhatsApp. CSS nativo aporta diseño responsive.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules y `node:test`.

**Spec:** `docs/superpowers/specs/2026-09-01-catalogo-victor-lanza-design.md`

## Global Constraints

- Publicar todos los modelos identificados como líneas separadas.
- Consultar por WhatsApp precio, color, medida y vigencia; no incluir precios ni stock.
- No usar dependencias externas, backend, commits ni pushes.
- Usar solo afirmaciones del relevamiento `docs/catalog-audit.md`.

---

### Task 1: Lógica de catálogo y consulta

**Files:**
- Create: `package.json`
- Create: `js/catalog.js`
- Create: `tests/catalog.test.js`

**Interfaces:**
- Produces: `products`, `addToCart(cart, product)`, `removeFromCart(cart, productId)`, `buildWhatsAppUrl(cart, phoneNumber)`.
- Consumes: objetos de producto con `id`, `name`, `category`, `description` e `image`.

- [x] **Step 1: Write the failing tests**

```js
test('adds a selected model once', () => {
  assert.deepEqual(addToCart([], products[0]).map(({ id }) => id), ['acolchadas-doble-costura']);
});

test('creates a WhatsApp message asking for price, color and size', () => {
  const url = new URL(buildWhatsAppUrl([products[0]], '5491112345678'));
  assert.match(url.searchParams.get('text'), /Acolchadas doble costura/);
  assert.match(url.searchParams.get('text'), /precio, color y medida/);
});
```

- [x] **Step 2: Run tests and verify they fail because `js/catalog.js` is missing**

Run: `npm test`

- [x] **Step 3: Implement the product data and pure cart helpers**

```js
export function addToCart(cart, product) {
  return cart.some((item) => item.id === product.id) ? cart : [...cart, product];
}
```

- [x] **Step 4: Run tests and verify they pass**

Run: `npm test`

### Task 2: Catálogo visual y carrito accesible

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/app.js`

**Interfaces:**
- Consumes: `products`, `addToCart`, `removeFromCart` y `buildWhatsAppUrl` de `js/catalog.js`.
- Produces: fichas filtrables, lista de carrito y botón de consulta.

- [x] **Step 1: Create semantic page landmarks and empty catalogue/cart containers**

```html
<main>
  <section id="catalogo" aria-labelledby="catalogo-title"></section>
  <aside aria-label="Carrito de consulta"><ul id="cart-items"></ul></aside>
</main>
```

- [x] **Step 2: Render all `products` into cards and connect add/remove/filter events**

```js
function renderCatalog() {
  catalogGrid.innerHTML = visibleProducts.map(productCard).join('');
}
```

- [x] **Step 3: Add responsive CSS for mobile-first card grid, filters and fixed cart summary**

- [x] **Step 4: Open the generated WhatsApp URL only when the cart contains at least one model**

```js
if (cart.length > 0) window.open(buildWhatsAppUrl(cart, whatsappNumber), '_blank', 'noopener');
```

### Task 3: Verify the static deliverable

**Files:**
- Verify: `index.html`, `css/styles.css`, `js/catalog.js`, `js/app.js`, `tests/catalog.test.js`

- [x] **Step 1: Run automated cart tests**

Run: `npm test`

- [x] **Step 2: Run static syntax checks**

Run: `node --check js/catalog.js; node --check js/app.js`

- [x] **Step 3: Inspect the HTML structure and source paths manually in a browser**

- [x] **Step 4: Report changed files and verification evidence without committing**
