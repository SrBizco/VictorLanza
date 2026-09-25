function localeKey(language) {
  return language === 'pt-BR' ? 'ptBR' : language;
}

function localizedValue(values, locale, state) {
  const translated = values?.[locale];
  return translated && state !== 'stale' ? translated : values?.es ?? '';
}

export function localizeContent(record, language) {
  const locale = localeKey(language);
  const published = record.published ?? {};
  const translationState = record.translationState ?? {};

  return {
    ...published,
    name: localizedValue(published.name, locale, translationState[locale]),
    description: localizedValue(published.description, locale, translationState[locale]),
    media: [...(record.media ?? [])],
    translationState: { ...translationState },
  };
}

export function selectPublished(records) {
  return records.filter((record) => record.status === 'published' && !record.isDeleted);
}

export function markTranslationsStale(draft, changedFields) {
  const changedSpanish = changedFields.some((field) => field.endsWith('.es'));
  if (!changedSpanish) return { ...draft, translationState: { ...(draft.translationState ?? {}) } };

  return {
    ...draft,
    translationState: {
      ...(draft.translationState ?? {}),
      en: 'stale',
      ptBR: 'stale',
    },
  };
}

export function mergePublishedWithFallback(remote, fallback) {
  return selectPublished(remote).length > 0 ? selectPublished(remote) : [...fallback];
}
