import { reorderMedia, updateSpanishDraft } from './admin-model.js';

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function selectedCategory(category, value) {
  return category === value ? ' selected' : '';
}

function mediaList(media = []) {
  if (!media.length) return '<p class="editor-media-empty">Todavía no agregaste fotos ni videos.</p>';
  return `<ul class="editor-media-list">${media.map((item, index) => {
    const kind = item.kind === 'video' ? 'Video' : 'Foto';
    const cover = item.role === 'cover';
    const source = item.previewUrl ?? item.legacySrc ?? '';
    const thumbnail = source ? (item.kind === 'video' ? `<video muted preload="metadata" src="${escapeHtml(source)}"></video>` : `<img src="${escapeHtml(source)}" alt="Vista previa de ${kind.toLowerCase()}">`) : `<span class="editor-media-placeholder">${kind}</span>`;
    return `<li data-media-index="${index}"><div class="editor-media-preview">${thumbnail}</div><div class="editor-media-details"><strong>${kind}${cover ? ' · Portada' : ''}</strong><div><button type="button" data-media-action="up" data-media-index="${index}" aria-label="Mover arriba"${index === 0 ? ' disabled' : ''}>↑</button><button type="button" data-media-action="down" data-media-index="${index}" aria-label="Mover abajo"${index === media.length - 1 ? ' disabled' : ''}>↓</button><button type="button" data-media-action="cover" data-media-index="${index}"${item.kind !== 'image' || cover ? ' disabled' : ''}>${cover ? 'Es la portada' : 'Usar como portada'}</button><button type="button" data-media-action="remove" data-media-index="${index}">Quitar</button></div></div></li>`;
  }).join('')}</ul>`;
}

export function confirmRemoval(name, confirm = window.confirm) {
  return confirm(`¿Quitar ${name} del borrador?`);
}

export function productDialogMarkup(draft, { isNew = false, categories = null } = {}) {
  const name = draft.name?.es ?? '';
  const description = draft.description?.es ?? '';
  const nameEn = draft.name?.en ?? '';
  const namePtBR = draft.name?.ptBR ?? '';
  const descriptionEn = draft.description?.en ?? '';
  const descriptionPtBR = draft.description?.ptBR ?? '';
  const category = draft.category ?? 'acolchadas';
  const availableCategories = categories ?? [
    { id: 'acolchadas', name: { es: 'Acolchadas' } }, { id: 'planas', name: { es: 'Planas' } }, { id: 'texturadas', name: { es: 'Texturadas' } }, { id: 'especiales', name: { es: 'Especiales' } }, { id: 'cierres', name: { es: 'Cierres' } },
  ];
  const categoryOptions = availableCategories.map((item) => `<option value="${escapeHtml(item.id)}"${selectedCategory(category, item.id)}>${escapeHtml(item.name?.es ?? item.id)}</option>`).join('');
  return `<form class="editor-form" novalidate>
    <h2 id="editor-dialog-title">${isNew ? 'Agregar modelo' : 'Editar modelo'}</h2>
    <p class="editor-form-help">Los cambios quedan guardados como borrador hasta que elijas publicar.</p>
    <label>Nombre del modelo <input name="name-es" required value="${escapeHtml(name)}"></label>
    <label>Descripción <textarea name="description-es" required rows="4">${escapeHtml(description)}</textarea></label>
    <label>Categoría <select name="category">${categoryOptions}</select></label>
    <fieldset class="editor-media-field"><legend>Fotos y video</legend>${mediaList(draft.media)}<label>Agregar fotos o video <input name="media-files" type="file" accept="image/*,video/mp4" multiple></label></fieldset>
    <details><summary>Traducciones opcionales</summary><label>Nombre en inglés <input name="name-en" value="${escapeHtml(nameEn)}"></label><label>Descripción en inglés <textarea name="description-en" rows="3">${escapeHtml(descriptionEn)}</textarea></label><label>Nombre en portugués <input name="name-ptbr" value="${escapeHtml(namePtBR)}"></label><label>Descripción en portugués <textarea name="description-ptbr" rows="3">${escapeHtml(descriptionPtBR)}</textarea></label></details>
    <p class="editor-form-error" role="alert" hidden></p>
    <div class="editor-form-actions"><button type="button" data-dialog-action="cancel">Cancelar</button><button type="submit">Guardar borrador</button></div>
  </form>`;
}

export function buildProductDraft(values, previous = {}) {
  const spanishChanged = previous.name?.es !== values.nameEs || previous.description?.es !== values.descriptionEs;
  let next = {
    ...previous,
    name: { ...(previous.name ?? {}), es: values.nameEs, en: values.nameEn ?? previous.name?.en ?? '', ptBR: values.namePtBR ?? previous.name?.ptBR ?? '' },
    description: { ...(previous.description ?? {}), es: values.descriptionEs, en: values.descriptionEn ?? previous.description?.en ?? '', ptBR: values.descriptionPtBR ?? previous.description?.ptBR ?? '' },
    category: values.category,
    media: [...(previous.media ?? [])],
    translationState: { ...(previous.translationState ?? {}) },
  };
  if (spanishChanged) next = updateSpanishDraft(next, { name: values.nameEs, description: values.descriptionEs });
  if (values.nameEn || values.descriptionEn) next.translationState.en = 'current';
  if (values.namePtBR || values.descriptionPtBR) next.translationState.ptBR = 'current';
  return next;
}

export function setCover(media, index) {
  return media.map((item, itemIndex) => ({ ...item, role: item.kind === 'image' && itemIndex === index ? 'cover' : item.role === 'cover' ? 'gallery' : item.role ?? 'gallery' }));
}

export function moveMedia(media, index, direction) {
  return reorderMedia(media, index, index + direction);
}

export function needsLegacyMediaMigration(media) {
  return Boolean(media?.legacySrc && !media?.id);
}
