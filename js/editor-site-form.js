function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

export function siteFieldDialogMarkup({ title, spanish = '', english = '', portuguese = '' }) {
  return `<form class="editor-form" novalidate>
    <h2 id="editor-dialog-title">${escapeHtml(title)}</h2>
    <p class="editor-form-help">Editá el texto en español. Las traducciones se pueden completar cuando estén listas.</p>
    <label>Texto en español <textarea name="site-es" required rows="5">${escapeHtml(spanish)}</textarea></label>
    <details><summary>Traducciones opcionales</summary><label>Texto en inglés <textarea name="site-en" rows="4">${escapeHtml(english)}</textarea></label><label>Texto en portugués <textarea name="site-ptbr" rows="4">${escapeHtml(portuguese)}</textarea></label></details>
    <p class="editor-form-error" role="alert" hidden></p>
    <div class="editor-form-actions"><button type="button" data-dialog-action="cancel">Cancelar</button><button type="submit">Guardar borrador</button></div>
  </form>`;
}

export function buildLocalizedField({ spanish = '', english = '', portuguese = '' }) {
  return { es: String(spanish).trim(), en: String(english).trim(), ptBR: String(portuguese).trim() };
}

export function updateLocalizedSection(section, field, value) {
  const draft = structuredClone(section?.draft_payload ?? section?.published_payload ?? {});
  draft[field] = value;
  const prior = section?.translation_state ?? {};
  const spanishChanged = (section?.draft_payload ?? section?.published_payload ?? {})[field]?.es !== value.es;
  return { draft, translationState: spanishChanged ? { ...prior, en: 'stale', ptBR: 'stale' } : prior };
}
