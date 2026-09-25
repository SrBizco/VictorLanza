import { loadPublishedCatalogue, loadPublishedSiteContent, loadPublishedSiteMedia } from './content-api.js';
import { hydratePublicCatalogue, publishedSiteSections, remoteRecordToProduct } from './public-content.js';
import { localizeSiteContent } from './site-content-model.js';
import { defaultCategories } from './editor-category-form.js';

const { buildWhatsAppUrl, products: fallbackProducts, removeFromCart, toggleCart } = globalThis.catalogStore;
const { getProductText, getText, supportedLanguages } = globalThis.i18nStore;

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
const filtersContainer = document.querySelector('.filters');
let filters = [];
const languageButtons = [...document.querySelectorAll('[data-language]')];
const whatsappNumber = document.body.dataset.whatsappPhone;

let selectedFilter = 'all';
let cart = [];
let products = [...fallbackProducts];
let remoteRecords = [];
let remoteSiteSections = [];
let categories = defaultCategories();
let activeGalleryProduct = null;
let activeGalleryIndex = 0;
let toastTimeout;
let language = supportedLanguages.includes(localStorage.getItem('victor-lanza-language'))
  ? localStorage.getItem('victor-lanza-language')
  : 'es';

function t(key) {
  return getText(language, key);
}

function localizedProduct(product, field) {
  return getProductText(language, product.id, field) ?? product[field];
}

function categoryLabel(categoryId) {
  const category = categories.find((item) => item.id === categoryId);
  const locale = language === 'pt-BR' ? 'ptBR' : language;
  return category?.name?.[locale] || category?.name?.es || t(`category.${categoryId}`);
}

function renderFilters() {
  filtersContainer.innerHTML = '';
  const all = [{ id: 'all', name: { es: t('filter.all') } }, ...categories];
  all.forEach((category) => {
    const button = document.createElement('button');
    button.className = `filter${selectedFilter === category.id ? ' is-active' : ''}`;
    button.type = 'button'; button.dataset.filter = category.id;
    button.textContent = category.id === 'all' ? t('filter.all') : categoryLabel(category.id);
    button.addEventListener('click', () => { selectedFilter = category.id; renderFilters(); renderCatalog(); });
    filtersContainer.append(button);
  });
  filters = [...filtersContainer.querySelectorAll('[data-filter]')];
  document.dispatchEvent(new Event('catalog:filters-rendered'));
}

function productsWithRemoteOverrides() {
  if (!remoteRecords.length) return [...fallbackProducts];
  const remoteProducts = remoteRecords.map((record) => remoteRecordToProduct(record, language));
  const overridden = new Set(remoteProducts.map((product) => product.id));
  return [...fallbackProducts.filter((product) => !overridden.has(product.id)), ...remoteProducts];
}

function renderStaticCopy() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-content]').forEach((element) => {
    element.content = t(element.dataset.i18nContent);
  });
  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
  });
  languageButtons.forEach((button) => {
    const selected = button.dataset.language === language;
    button.classList.toggle('is-active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  remoteSiteSections.forEach((section) => {
    const fields = localizeSiteContent(section, language);
    Object.entries(fields).forEach(([field, value]) => {
      if (section.section === 'copy') {
        const locale = language === 'pt-BR' ? 'pt-BR' : language;
        if (globalThis.i18nStore.copy[locale]) globalThis.i18nStore.copy[locale][field] = value;
        const copyTarget = document.querySelector(`[data-i18n="${CSS.escape(field)}"]`);
        if (copyTarget && value) copyTarget.textContent = value;
        return;
      }
      const target = document.querySelector(`[data-site-field="${section.section}.${field}"]`);
      if (target && value) target.textContent = value;
    });
  });
}

function galleryMedia(product) {
  if (product.media) return product.media.map((item) => ({ type: item.type, src: item.url }));
  const photos = product.gallery.map((file) => ({ type: 'image', src: `assets/gallery/${file}` }));
  return product.video ? [...photos, { type: 'video', src: `assets/gallery/${product.video}` }] : photos;
}

function productCard(product) {
  const mediaCount = galleryMedia(product).length;
  const isSelected = cart.some((item) => item.id === product.id);
  return `
    <article class="product-card">
      <button class="product-photo-button" type="button" data-open-gallery="${product.id}" aria-label="${t('product.gallery')} ${product.name}">
        <img src="${product.image}" alt="${product.name}" loading="lazy" />
        <span>${mediaCount} ${mediaCount === 1 ? t('product.view') : t('product.views')} · ${t('product.gallery')}</span>
      </button>
      <div class="product-content">
        <p class="product-category">${categoryLabel(product.category)}</p>
        <h3>${product.name}</h3>
        <p>${localizedProduct(product, 'description')}</p>
        <button class="add-button${isSelected ? ' is-selected' : ''}" type="button" data-add-product="${product.id}">${isSelected ? t('product.added') : t('product.add')} <span aria-hidden="true">${isSelected ? '✓' : '+'}</span></button>
      </div>
    </article>
  `;
}

function renderCatalog() {
  if (selectedFilter !== 'all' && !categories.some((category) => category.id === selectedFilter)) selectedFilter = 'all';
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
    <li><span>${product.name}</span><button type="button" data-remove-product="${product.id}" aria-label="${t('cart.remove')} ${product.name}">×</button></li>
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
    ? `<video controls autoplay src="${current.src}"></video>`
    : `<img src="${current.src}" alt="${activeGalleryProduct.name}, ${t('gallery.viewImage').toLowerCase()} ${activeGalleryIndex + 1}" />`;
  galleryThumbnails.innerHTML = media.map((item, index) => `
    <button class="gallery-thumbnail${index === activeGalleryIndex ? ' is-active' : ''}" type="button" data-gallery-index="${index}" aria-label="${item.type === 'video' ? t('gallery.viewVideo') : `${t('gallery.viewImage')} ${index + 1}`}">
      ${item.type === 'video' ? `<span class="video-thumb">▶ ${t('gallery.viewVideo')}</span>` : `<img src="${item.src}" alt="" />`}
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
  showToast(`${product.name} ${alreadyAdded ? t('toast.removed') : t('toast.added')}`);
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

[floatingCart, headerCart].forEach((button) => button.addEventListener('click', openCart));
closeCart.addEventListener('click', closeCartDrawer);

whatsappButton.addEventListener('click', () => {
  const url = buildWhatsAppUrl(cart, whatsappNumber, language);
  if (url) window.open(url, '_blank', 'noopener');
});

languageButtons.forEach((button) => {
  button.addEventListener('click', () => {
    language = button.dataset.language;
    localStorage.setItem('victor-lanza-language', language);
    if (remoteRecords.length) {
      products = productsWithRemoteOverrides();
      cart = cart.map((item) => products.find((product) => product.id === item.id) ?? item);
    }
    renderStaticCopy();
    renderFilters();
    renderCatalog();
    renderCart();
    if (activeGalleryProduct) renderGallery();
  });
});

renderStaticCopy();
renderFilters();
renderCatalog();
renderCart();

globalThis.catalogEditorBridge = {
  getProducts: () => products.map((product) => ({ ...product })),
  updateProduct: (id, changes) => {
    products = products.map((product) => product.id === id ? { ...product, ...changes } : product);
    cart = cart.map((item) => products.find((product) => product.id === item.id) ?? item);
    renderCatalog();
    renderCart();
  },
  addProduct: (product) => { products = [...products, product]; renderCatalog(); },
  getCategories: () => categories.map((category) => structuredClone(category)),
  setCategories: (next) => { categories = next.map((category) => structuredClone(category)); renderFilters(); renderCatalog(); },
  render: () => { renderStaticCopy(); renderFilters(); renderCatalog(); renderCart(); },
};

hydratePublicCatalogue(fallbackProducts, loadPublishedCatalogue).then((loaded) => {
  if (!loaded.length || !loaded[0]?.published) return;
  remoteRecords = loaded;
  products = productsWithRemoteOverrides();
  cart = cart.map((item) => products.find((product) => product.id === item.id) ?? item);
  renderCatalog();
  renderCart();
});

loadPublishedSiteContent().then((loaded) => {
  remoteSiteSections = publishedSiteSections(loaded);
  const categorySection = remoteSiteSections.find((section) => section.section === 'categories');
  if (Array.isArray(categorySection?.published?.items) && categorySection.published.items.length) categories = categorySection.published.items;
  if (remoteSiteSections.length) renderStaticCopy();
  renderFilters();
  renderCatalog();
});

loadPublishedSiteMedia().then((media) => {
  media.forEach((item) => {
    const target = document.querySelector(`[data-editor-media="${CSS.escape(item.slot)}"]`);
    if (target && item.url) target.src = item.url;
  });
});
