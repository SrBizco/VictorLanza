export function validateDraft(payload) {
  const errors = {};
  if (!payload?.name?.es?.trim()) errors.nameEs = 'Ingresá el nombre en español.';
  if (!payload?.description?.es?.trim()) errors.descriptionEs = 'Ingresá una descripción en español.';
  if (!payload?.category) errors.category = 'Elegí una categoría.';
  if (!payload?.media?.some((item) => item.kind === 'image' && item.role === 'cover')) {
    errors.media = 'Agregá una foto de portada.';
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

export function publishableDraft(payload) {
  return validateDraft(payload);
}

export function reorderMedia(media, fromIndex, toIndex) {
  const next = [...media];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return next;
  next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, moved);
  return next;
}

export function publishDraft(entry) {
  const draft = structuredClone(entry.draft);
  return { ...entry, draft, published: structuredClone(draft) };
}

export function updateSpanishDraft(draft, changes) {
  const next = structuredClone(draft);
  for (const [field, value] of Object.entries(changes)) {
    next[field] = { ...(next[field] ?? {}), es: value };
  }
  next.translationState = {
    ...(next.translationState ?? {}),
    en: 'stale',
    ptBR: 'stale',
  };
  return next;
}
