import '../../js/i18n.js';
import '../../js/catalog.js';

const { products } = globalThis.catalogStore;
const { getProductText, getText } = globalThis.i18nStore;

function localizedText(product, field, spanish) {
  return {
    es: spanish,
    en: getProductText('en', product.id, field) ?? '',
    ptBR: getProductText('pt-BR', product.id, field) ?? '',
  };
}

function mediaForProduct(product) {
  const sources = [
    { sourcePath: product.image, mediaType: 'image', isCover: true },
    ...product.gallery.map((file) => ({
      sourcePath: `assets/gallery/${file}`,
      mediaType: 'image',
      isCover: false,
    })),
    ...(product.video ? [{
      sourcePath: `assets/gallery/${product.video}`,
      mediaType: 'video',
      isCover: false,
    }] : []),
  ];
  const seen = new Set();

  return sources
    .filter(({ sourcePath }) => !seen.has(sourcePath) && seen.add(sourcePath))
    .map((media, sortOrder) => ({
      ...media,
      storagePath: `catalog/${product.id}/${media.sourcePath.split('/').at(-1)}`,
      sortOrder,
    }));
}

const entries = products.map((product, sortOrder) => {
  const payload = {
    name: localizedText(product, 'name', product.name),
    description: localizedText(product, 'description', product.description),
    category: product.category,
  };

  return {
    slug: product.id,
    status: 'published',
    draftPayload: payload,
    publishedPayload: payload,
    translationState: {
      en: payload.description.en ? 'current' : 'missing',
      ptBR: payload.description.ptBR ? 'current' : 'missing',
    },
    sortOrder,
    isDeleted: false,
    media: mediaForProduct(product),
  };
});

function siteText(key) {
  return { es: getText('es', key), en: getText('en', key), ptBR: getText('pt-BR', key) };
}

const siteSections = [
  { section: 'copy', status: 'published', published: Object.fromEntries(Object.keys(globalThis.i18nStore.copy.es).filter((key) => key !== 'document.title').map((key) => [key, siteText(key)])) },
  { section: 'hero', status: 'published', published: { heroTitle: siteText('hero.title'), heroIntro: siteText('hero.intro') } },
  { section: 'experience', status: 'published', published: { experienceTitle: siteText('experience.title'), experienceBody: siteText('experience.body'), mapCaption: siteText('map.caption') } },
  { section: 'footer', status: 'published', published: { footerBrand: siteText('footer.brand') } },
];

process.stdout.write(`${JSON.stringify({ version: 1, entries, siteSections }, null, 2)}\n`);
