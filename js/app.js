const { buildWhatsAppUrl, products, removeFromCart, toggleCart } = globalThis.catalogStore;

const catalogGrid = document.querySelector('#catalog-grid');
const cartItems = document.querySelector('#cart-items');
const emptyCart = document.querySelector('#empty-cart');
const cartCount = document.querySelector('#cart-count');
const headerCartCount = document.querySelector('#header-cart-count');
const floatingCartCount = document.querySelector('#floating-cart-count');
const whatsappButton = document.querySelector('#whatsapp-button');
const consultation = document.querySelector('#consulta');
const floatingCart = document.querySelector('#floating-cart');
const headerCart = document.querySelector('#header-cart');
const closeCart = document.querySelector('#close-cart');
const galleryDialog = document.querySelector('#gallery-dialog');
const galleryTitle = document.querySelector('#gallery-title');
const galleryStage = document.querySelector('#gallery-stage');
const galleryThumbnails = document.querySelector('#gallery-thumbnails');
const galleryClose = document.querySelector('.gallery-close');
const toast = document.querySelector('#toast');
const filters = [...document.querySelectorAll('[data-filter]')];
const whatsappNumber = document.body.dataset.whatsappPhone;

let selectedFilter = 'all';
let cart = [];
let activeGalleryProduct = null;
let activeGalleryIndex = 0;
let toastTimeout;

function galleryMedia(product) {
  const photos = product.gallery.map((file) => ({ type: 'image', src: `assets/gallery/${file}` }));
  return product.video ? [...photos, { type: 'video', src: `assets/gallery/${product.video}` }] : photos;
}

function productCard(product) {
  const mediaCount = galleryMedia(product).length;
  const isSelected = cart.some((item) => item.id === product.id);
  return `
    <article class="product-card">
      <button class="product-photo-button" type="button" data-open-gallery="${product.id}" aria-label="Ver fotos de ${product.name}">
        <img src="${product.image}" alt="Modelo ${product.name} de correa de reloj" loading="lazy" />
        <span>${mediaCount} ${mediaCount === 1 ? 'vista' : 'vistas'} · Ver galería</span>
      </button>
      <div class="product-content">
        <p class="product-category">${product.category}</p>
        <h3>${product.name}</h3>
        <p>${product.description}</p>
        <button class="add-button${isSelected ? ' is-selected' : ''}" type="button" data-add-product="${product.id}">${isSelected ? 'Agregado a consulta' : 'Agregar a consulta'} <span aria-hidden="true">${isSelected ? '✓' : '+'}</span></button>
      </div>
    </article>
  `;
}

function renderCatalog() {
  const visibleProducts = selectedFilter === 'all'
    ? products
    : products.filter((product) => product.category === selectedFilter);
  catalogGrid.innerHTML = visibleProducts.map(productCard).join('');
}

function renderCart() {
  const count = cart.length;
  cartCount.textContent = count;
  headerCartCount.textContent = count;
  floatingCartCount.textContent = count;
  emptyCart.hidden = count > 0;
  whatsappButton.disabled = count === 0;
  cartItems.innerHTML = cart.map((product) => `
    <li><span>${product.name}</span><button type="button" data-remove-product="${product.id}" aria-label="Quitar ${product.name}">×</button></li>
  `).join('');
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('is-visible'), 2400);
}

function bumpCart() {
  floatingCart.classList.remove('is-bumping');
  void floatingCart.offsetWidth;
  floatingCart.classList.add('is-bumping');
}

function openCart() {
  consultation.hidden = false;
  consultation.classList.add('is-open');
  floatingCart.setAttribute('aria-expanded', 'true');
}

function closeCartDrawer() {
  consultation.classList.remove('is-open');
  floatingCart.setAttribute('aria-expanded', 'false');
  setTimeout(() => { consultation.hidden = true; }, 180);
}

function renderGallery() {
  const media = galleryMedia(activeGalleryProduct);
  const current = media[activeGalleryIndex];
  galleryTitle.textContent = activeGalleryProduct.name;
  galleryStage.innerHTML = current.type === 'video'
    ? `<video controls autoplay src="${current.src}">Tu navegador no puede reproducir este video.</video>`
    : `<img src="${current.src}" alt="${activeGalleryProduct.name}, imagen ${activeGalleryIndex + 1}" />`;
  galleryThumbnails.innerHTML = media.map((item, index) => `
    <button class="gallery-thumbnail${index === activeGalleryIndex ? ' is-active' : ''}" type="button" data-gallery-index="${index}" aria-label="${item.type === 'video' ? 'Ver video' : `Ver imagen ${index + 1}`}">
      ${item.type === 'video' ? '<span class="video-thumb">▶ Video</span>' : `<img src="${item.src}" alt="" />`}
    </button>
  `).join('');
}

function openGallery(product) {
  activeGalleryProduct = product;
  activeGalleryIndex = 0;
  renderGallery();
  galleryDialog.showModal();
}

catalogGrid.addEventListener('click', (event) => {
  const galleryButton = event.target.closest('[data-open-gallery]');
  if (galleryButton) {
    openGallery(products.find((item) => item.id === galleryButton.dataset.openGallery));
    return;
  }
  const button = event.target.closest('[data-add-product]');
  if (!button) return;
  const product = products.find((item) => item.id === button.dataset.addProduct);
  const alreadyAdded = cart.some((item) => item.id === product.id);
  cart = toggleCart(cart, product);
  renderCart();
  renderCatalog();
  bumpCart();
  showToast(alreadyAdded ? `${product.name} se quitó de la consulta.` : `${product.name} se agregó a la consulta.`);
});

cartItems.addEventListener('click', (event) => {
  const button = event.target.closest('[data-remove-product]');
  if (!button) return;
  cart = removeFromCart(cart, button.dataset.removeProduct);
  renderCart();
  renderCatalog();
});

galleryThumbnails.addEventListener('click', (event) => {
  const button = event.target.closest('[data-gallery-index]');
  if (!button) return;
  activeGalleryIndex = Number(button.dataset.galleryIndex);
  renderGallery();
});

galleryClose.addEventListener('click', () => galleryDialog.close());
galleryDialog.addEventListener('click', (event) => {
  if (event.target === galleryDialog) galleryDialog.close();
});

filters.forEach((filter) => {
  filter.addEventListener('click', () => {
    selectedFilter = filter.dataset.filter;
    filters.forEach((item) => item.classList.toggle('is-active', item === filter));
    renderCatalog();
  });
});

[floatingCart, headerCart].forEach((button) => button.addEventListener('click', openCart));
closeCart.addEventListener('click', closeCartDrawer);

whatsappButton.addEventListener('click', () => {
  const url = buildWhatsAppUrl(cart, whatsappNumber);
  if (url) window.open(url, '_blank', 'noopener');
});

renderCatalog();
renderCart();
