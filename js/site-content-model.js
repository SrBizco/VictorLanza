function localeKey(language) { return language === 'pt-BR' ? 'ptBR' : language; }

export function localizeSiteContent(section, language) {
  const locale = localeKey(language);
  return Object.fromEntries(Object.entries(section?.published ?? {}).map(([key, value]) => [
    key,
    typeof value === 'object' ? (section?.translationState?.[locale] === 'stale' ? (value.es || '') : (value[locale] || value.es || '')) : value,
  ]));
}
