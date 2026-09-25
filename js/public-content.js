import { localizeContent, selectPublished } from './content-model.js';

function isValidPublishedRecord(record) {
  const content = record?.published;
  return Boolean(
    record?.status === 'published'
    && record.slug
    && content?.name?.es
    && content?.description?.es
    && content?.category
    && record.media?.some((media) => media.type === 'image' && media.isCover && media.url),
  );
}

export async function hydratePublicCatalogue(fallbackProducts, loader) {
  try {
    const remote = await loader();
    const published = selectPublished(remote ?? []).filter(isValidPublishedRecord);
    return published.length ? published : fallbackProducts;
  } catch {
    return fallbackProducts;
  }
}

export function remoteRecordToProduct(record, language) {
  const localized = localizeContent(record, language);
  const media = [...record.media].sort((left, right) => left.sortOrder - right.sortOrder);
  const cover = media.find((item) => item.type === 'image' && item.isCover) ?? media[0];

  return {
    id: record.slug,
    name: localized.name,
    description: localized.description,
    category: localized.category,
    image: cover.url,
    media,
  };
}

export function publishedSiteSections(records) {
  return (records ?? []).filter((record) => record.status === 'published' && record.published);
}
