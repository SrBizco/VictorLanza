import { getSupabaseClient } from './supabase-client.js';
import { supabaseConfig } from './supabase-config.js';
import { isEditorMode, requireEditorSession } from './editor-session.js';
import { buildProductDraft, confirmRemoval, moveMedia, needsLegacyMediaMigration, productDialogMarkup, setCover } from './editor-product-form.js';
import { buildLocalizedField, siteFieldDialogMarkup, updateLocalizedSection } from './editor-site-form.js';
import { buildCategoriesDraft, categoryDialogMarkup, defaultCategories, removeCategory, updateCategoriesDraft } from './editor-category-form.js';
import { listEditorEntries, listEditorSiteMedia, listEditorSiteSections, publishEntry, publishSiteMedia, publishSiteSection, removeMedia, saveDraft, saveSiteDraft, uploadMedia, uploadSiteMedia } from './content-api.js';
import { publishableDraft } from './admin-model.js';

const editorState = { entries: [], siteSections: [], siteMedia: [], categories: defaultCategories(), dirtyEntryIds: new Set(), dirtySiteSections: new Map(), dirtySiteMedia: new Set(), newEntryIds: new Set(), client: null };

function setStatus(message, isError = false) {
  const status = document.querySelector('#editor-status');
  status.textContent = message;
  status.classList.toggle('is-error', isError);
}

function attachEditButton(element, label, action) {
  if (!element || element.querySelector(':scope > .editor-control')) return;
  element.classList.add('editor-editable');
  const button = document.createElement('button');
  button.className = 'editor-control'; button.type = 'button'; button.setAttribute('aria-label', label); button.textContent = '✎';
  button.addEventListener('click', action); element.append(button);
}

function entryForProduct(product) { return product ? editorState.entries.find((entry) => entry.slug === product.id) : null; }

function legacyMedia(product) {
  if (!product?.image) return [];
  return [{ kind: 'image', role: 'cover', legacySrc: product.image }, ...(product.gallery ?? []).map((file) => ({ kind: 'image', role: 'gallery', legacySrc: `assets/gallery/${file}` })), ...(product.video ? [{ kind: 'video', role: 'gallery', legacySrc: `assets/gallery/${product.video}` }] : [])];
}

function currentDraft(product) {
  const entry = entryForProduct(product);
  if (entry?.draft_payload) {
    const mediaById = new Map((entry.editor_media ?? []).map((media) => [media.id, media]));
    return { ...entry.draft_payload, media: (entry.draft_payload.media ?? []).map((media) => ({ ...media, ...mediaById.get(media.id) })) };
  }
  return { name: { es: product.name, en: '', ptBR: '' }, description: { es: product.description, en: '', ptBR: '' }, category: product.category, media: legacyMedia(product), translationState: { en: 'missing', ptBR: 'missing' } };
}

function slugFromName(name) { return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80); }

function dialogError(dialog, message) {
  const target = dialog.querySelector('.editor-form-error'); target.hidden = !message; target.textContent = message ?? '';
}

function setButtonBusy(button, busy, busyLabel = 'Guardando…') {
  if (!button) return;
  if (busy) {
    button.dataset.label = button.textContent; button.textContent = busyLabel; button.disabled = true; button.setAttribute('aria-busy', 'true');
  } else {
    button.textContent = button.dataset.label ?? button.textContent; button.disabled = false; button.removeAttribute('aria-busy');
  }
}

function updateEntry(saved) {
  const index = editorState.entries.findIndex((entry) => entry.id === saved.id);
  if (index >= 0) editorState.entries.splice(index, 1, saved); else editorState.entries.push(saved);
}

function previewMedia(draft) {
  return draft.media.map((media) => ({ type: media.kind, url: media.previewUrl ?? media.legacySrc })).filter((media) => media.url);
}

function applyPreview(product, draft, previewUrl = null) {
  const changes = { name: draft.name.es, description: draft.description.es, category: draft.category };
  const media = previewMedia(draft);
  const cover = draft.media.find((item) => item.role === 'cover');
  changes.media = media;
  changes.image = previewUrl ?? cover?.previewUrl ?? cover?.legacySrc ?? product?.image;
  if (product) globalThis.catalogEditorBridge.updateProduct(product.id, changes);
  else globalThis.catalogEditorBridge.addProduct({ id: slugFromName(draft.name.es), ...changes, gallery: [], video: null });
}

function replaceForm(dialog, draft, options) {
  dialog.innerHTML = productDialogMarkup(draft, { ...options, categories: editorState.categories }); bindProductDialog(dialog, draft, options.product ?? null);
}

async function saveProductDraft(dialog, product, draft) {
  const form = dialog.querySelector('form'); const values = Object.fromEntries(new FormData(form));
  const normalized = {
    nameEs: String(values['name-es'] ?? '').trim(), descriptionEs: String(values['description-es'] ?? '').trim(), category: String(values.category ?? ''),
    nameEn: String(values['name-en'] ?? '').trim(), descriptionEn: String(values['description-en'] ?? '').trim(),
    namePtBR: String(values['name-ptbr'] ?? '').trim(), descriptionPtBR: String(values['description-ptbr'] ?? '').trim(),
  };
  if (!normalized.nameEs || !normalized.descriptionEs) throw new Error('Completá el nombre y la descripción en español.');
  const next = buildProductDraft(normalized, draft); const slug = product?.id ?? slugFromName(normalized.nameEs);
  if (!slug) throw new Error('Ingresá un nombre válido para el modelo.');
  let saved = await saveDraft(entryForProduct(product)?.id, { slug, draft: next, translationState: next.translationState, sortOrder: entryForProduct(product)?.sort_order ?? editorState.entries.length });
  if (!entryForProduct(product)) editorState.newEntryIds.add(saved.id);
  for (const [index, media] of next.media.entries()) {
    if (!needsLegacyMediaMigration(media)) continue;
    const response = await fetch(media.legacySrc);
    if (!response.ok) throw new Error('No se pudo preparar una foto existente para publicar. Volvé a intentarlo.');
    const blob = await response.blob();
    const filename = media.legacySrc.split('/').pop() || `archivo-${index}`;
    const file = new File([blob], filename, { type: blob.type || (media.kind === 'video' ? 'video/mp4' : 'image/jpeg') });
    const uploaded = await uploadMedia(saved.id, file);
    next.media[index] = { ...uploaded, role: media.role };
  }
  const files = draft.pendingFiles ?? [...(form.querySelector('[name="media-files"]').files ?? [])];
  for (const file of files) {
    const uploaded = await uploadMedia(saved.id, file);
    const index = next.media.findIndex((media) => media.pendingFile === file);
    const replacement = { ...uploaded, previewUrl: URL.createObjectURL(file), role: next.media[index]?.role ?? (next.media.some((item) => item.role === 'cover') ? 'gallery' : uploaded.kind === 'image' ? 'cover' : 'gallery') };
    if (index >= 0) next.media[index] = replacement; else next.media.push(replacement);
  }
  delete next.pendingFiles;
  const persistedDraft = { ...next, media: next.media.map(({ previewUrl, pendingFile, ...media }) => media) };
  saved = await saveDraft(saved.id, { slug, draft: persistedDraft, translationState: next.translationState, sortOrder: saved.sort_order });
  saved.draft_payload = next;
  updateEntry(saved); editorState.dirtyEntryIds.add(saved.id);
  applyPreview(product, next);
  setStatus('Borrador guardado. Todavía no está publicado.'); dialog.close();
}

function bindProductDialog(dialog, draft, product) {
  const form = dialog.querySelector('form');
  let saving = false;
  dialog.querySelector('[data-dialog-action="cancel"]').addEventListener('click', () => dialog.close());
  form.querySelector('[name="media-files"]').addEventListener('change', (event) => {
    const files = [...event.target.files]; if (!files.length) return;
    const next = { ...draft, pendingFiles: [...(draft.pendingFiles ?? []), ...files], media: [...draft.media] };
    files.forEach((file) => next.media.push({ kind: file.type === 'video/mp4' ? 'video' : 'image', previewUrl: URL.createObjectURL(file), pendingFile: file, role: next.media.some((media) => media.role === 'cover') ? 'gallery' : file.type.startsWith('image/') ? 'cover' : 'gallery' }));
    replaceForm(dialog, next, { isNew: !product, product });
  });
  form.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-media-action]'); if (!button) return;
    const index = Number(button.dataset.mediaIndex); let next = { ...draft, media: [...draft.media] };
    try {
      if (button.dataset.mediaAction === 'up') next.media = moveMedia(next.media, index, -1);
      if (button.dataset.mediaAction === 'down') next.media = moveMedia(next.media, index, 1);
      if (button.dataset.mediaAction === 'cover') next.media = setCover(next.media, index);
      if (button.dataset.mediaAction === 'remove') {
        const item = next.media[index]; if (!confirmRemoval(item.kind === 'video' ? 'este video' : 'esta foto')) return;
        if (item.id && !item.isPublished) await removeMedia(item.id); next.media.splice(index, 1);
      }
      replaceForm(dialog, next, { isNew: !product, product });
    } catch (error) { dialogError(dialog, error.message || 'No se pudo modificar este archivo.'); }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (saving) return; saving = true; dialogError(dialog, null);
    const submit = form.querySelector('[type="submit"]'); setButtonBusy(submit, true);
    try { await saveProductDraft(dialog, product, draft); }
    catch (error) { dialogError(dialog, error.message || 'No se pudo guardar el borrador.'); setButtonBusy(submit, false); saving = false; }
  });
}

function openProductDialog(product = null) {
  const dialog = document.querySelector('#editor-dialog');
  const draft = product ? currentDraft(product) : { name: { es: '' }, description: { es: '' }, category: 'acolchadas', media: [], translationState: { en: 'missing', ptBR: 'missing' } };
  replaceForm(dialog, draft, { isNew: !product, product }); dialog.showModal();
}

function attachProductControls() {
  document.querySelectorAll('.product-card').forEach((card) => {
    const productId = card.querySelector('[data-add-product]')?.dataset.addProduct;
    const product = globalThis.catalogEditorBridge.getProducts().find((item) => item.id === productId);
    if (product) attachEditButton(card, `Editar ${product.name}`, () => openProductDialog(product));
  });
  const grid = document.querySelector('#catalog-grid');
  if (grid && !grid.querySelector('.editor-add-product-card')) {
    const add = document.createElement('button'); add.className = 'editor-add-product-card'; add.type = 'button'; add.textContent = '+ Agregar modelo';
    add.addEventListener('click', () => openProductDialog()); grid.append(add);
  }
}

function currentCategoriesSection() {
  return editorState.dirtySiteSections.get('categories') ?? editorState.siteSections.find((section) => section.section === 'categories') ?? {
    section: 'categories', draft_payload: { items: structuredClone(editorState.categories) }, translation_state: {},
  };
}

function openCategoriesDialog() {
  const dialog = document.querySelector('#editor-dialog');
  let categories = structuredClone(editorState.categories);
  const render = () => {
    dialog.innerHTML = categoryDialogMarkup(categories);
    const form = dialog.querySelector('form');
    dialog.querySelector('[data-dialog-action="cancel"]').addEventListener('click', () => dialog.close());
    form.addEventListener('click', (event) => {
      const button = event.target.closest('[data-category-action="remove"]');
      if (!button) return;
      const id = button.dataset.categoryId;
      const usedBy = globalThis.catalogEditorBridge.getProducts().filter((product) => product.category === id).length;
      if (usedBy) { dialogError(dialog, `No podés eliminar esta categoría porque tiene ${usedBy} modelo${usedBy === 1 ? '' : 's'}. Cambialos de categoría antes.`); return; }
      if (!window.confirm('¿Eliminar esta categoría del borrador?')) return;
      categories = removeCategory(categories, id); setStatus('Categoría quitada del borrador. Guardá para confirmar el cambio.'); render();
    });
    let saving = false;
    form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (saving) return; saving = true; dialogError(dialog, null);
    const submit = form.querySelector('[type="submit"]'); setButtonBusy(submit, true);
    const values = new FormData(form);
    let nextItems = updateCategoriesDraft(categories, Object.fromEntries(values));
    const newName = String(values.get('category-name-es') ?? '').trim();
    if (newName) nextItems = buildCategoriesDraft({ nameEs: newName, nameEn: values.get('category-name-en'), namePtBR: values.get('category-name-ptbr') }, nextItems);
    const current = currentCategoriesSection();
    const payload = { ...(current.draft_payload ?? {}), items: nextItems };
    try {
      const saved = await saveSiteDraft('categories', payload, current.translation_state ?? {});
      const index = editorState.siteSections.findIndex((item) => item.section === 'categories');
      if (index >= 0) editorState.siteSections.splice(index, 1, saved); else editorState.siteSections.push(saved);
      editorState.categories = nextItems; editorState.dirtySiteSections.set('categories', saved);
      globalThis.catalogEditorBridge.setCategories(nextItems);
      attachCategoryControl(); setStatus('Categoría guardada como borrador. Todavía no está publicada.'); dialog.close();
    } catch (error) { dialogError(dialog, error.message || 'No se pudo guardar la categoría.'); setButtonBusy(submit, false); saving = false; }
    });
  };
  render();
  dialog.showModal();
}

function attachCategoryControl() {
  const filters = document.querySelector('.filters');
  attachEditButton(filters, 'Editar categorías del catálogo', openCategoriesDialog);
}

function currentCopySection() {
  return editorState.dirtySiteSections.get('copy') ?? editorState.siteSections.find((section) => section.section === 'copy') ?? {
    section: 'copy',
    draft_payload: Object.fromEntries(Object.keys(globalThis.i18nStore.copy.es).map((key) => [key, {
      es: globalThis.i18nStore.copy.es[key] ?? '', en: globalThis.i18nStore.copy.en[key] ?? '', ptBR: globalThis.i18nStore.copy['pt-BR'][key] ?? '',
    }])),
    translation_state: {},
  };
}

function localizedCopyValue(key, locale) {
  const section = currentCopySection();
  return (section.draft_payload?.[key] ?? section.published_payload?.[key] ?? globalThis.i18nStore.copy.es[key])?.[locale] ?? '';
}

function openTextDialog(element) {
  const key = element.dataset.i18n;
  if (!key) return;
  const dialog = document.querySelector('#editor-dialog');
  const title = `Editar texto: ${element.textContent.trim().slice(0, 70) || key}`;
  const show = () => {
    dialog.innerHTML = siteFieldDialogMarkup({ title, spanish: localizedCopyValue(key, 'es'), english: localizedCopyValue(key, 'en'), portuguese: localizedCopyValue(key, 'ptBR') });
    const form = dialog.querySelector('form');
    dialog.querySelector('[data-dialog-action="cancel"]').addEventListener('click', () => dialog.close());
    let saving = false;
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (saving) return; saving = true; dialogError(dialog, null);
      const submit = form.querySelector('[type="submit"]'); setButtonBusy(submit, true);
      const values = new FormData(form);
      const field = buildLocalizedField({ spanish: values.get('site-es'), english: values.get('site-en'), portuguese: values.get('site-ptbr') });
      if (!field.es) { dialogError(dialog, 'El texto en español no puede quedar vacío.'); setButtonBusy(submit, false); saving = false; return; }
      const section = currentCopySection();
      const next = updateLocalizedSection(section, key, field);
      try {
        const saved = await saveSiteDraft('copy', next.draft, next.translationState);
        const index = editorState.siteSections.findIndex((item) => item.section === 'copy');
        if (index >= 0) editorState.siteSections.splice(index, 1, saved); else editorState.siteSections.push(saved);
        editorState.dirtySiteSections.set('copy', saved);
        globalThis.i18nStore.copy.es[key] = field.es;
        globalThis.i18nStore.copy.en[key] = field.en || field.es;
        globalThis.i18nStore.copy['pt-BR'][key] = field.ptBR || field.es;
        globalThis.catalogEditorBridge.render();
        attachTextControls();
        attachSiteMediaControls();
        setStatus('Borrador guardado. Todavía no está publicado.'); dialog.close();
      } catch (error) { dialogError(dialog, error.message || 'No se pudo guardar el texto.'); setButtonBusy(submit, false); saving = false; }
    });
  };
  show(); dialog.showModal();
}

function attachTextControls() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    if (element.closest('head') || element.matches('title')) return;
    const target = element.closest('button, a')?.parentElement ?? element;
    attachEditButton(target, `Editar ${element.textContent.trim().slice(0, 45) || 'texto'}`, () => openTextDialog(element));
  });
}

function mediaTitle(slot) {
  return ({ 'hero-image': 'foto principal', 'commercial-video': 'video comercial', 'story-origin': 'foto de origen', 'story-testimonial': 'testimonio', 'story-bogota': 'envío a Bogotá', 'story-chile': 'envío a Chile', 'story-panama': 'envío a Panamá', 'story-brazil': 'envío a Brasil', 'story-spain': 'envío a España' })[slot] ?? 'archivo';
}

function openSiteMediaDialog(element) {
  const slot = element.dataset.editorMedia; const dialog = document.querySelector('#editor-dialog');
  dialog.innerHTML = `<form class="editor-form"><h2 id="editor-dialog-title">Cambiar ${mediaTitle(slot)}</h2><p class="editor-form-help">El archivo nuevo se verá sólo en tu borrador hasta publicar.</p><label>Elegí una imagen o video <input name="site-media-file" type="file" accept="image/*,video/mp4" required></label><p class="editor-form-error" role="alert" hidden></p><div class="editor-form-actions"><button type="button" data-dialog-action="cancel">Cancelar</button><button type="submit">Guardar borrador</button></div></form>`;
  const form = dialog.querySelector('form'); dialog.querySelector('[data-dialog-action="cancel"]').addEventListener('click', () => dialog.close());
  let saving = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (saving) return; saving = true; dialogError(dialog, null);
    const submit = form.querySelector('[type="submit"]'); setButtonBusy(submit, true, 'Subiendo…');
    const file = form.querySelector('[name="site-media-file"]').files?.[0];
    try {
      const saved = await uploadSiteMedia(slot, file);
      const index = editorState.siteMedia.findIndex((item) => item.slot === slot);
      if (index >= 0) editorState.siteMedia.splice(index, 1, saved); else editorState.siteMedia.push(saved);
      editorState.dirtySiteMedia.add(slot);
      if (element.tagName === 'VIDEO') element.src = URL.createObjectURL(file); else element.src = URL.createObjectURL(file);
      setStatus('Borrador guardado. Todavía no está publicado.'); dialog.close();
    } catch (error) { dialogError(dialog, error.message || 'No se pudo guardar el archivo.'); setButtonBusy(submit, false); saving = false; }
  });
  dialog.showModal();
}

function attachSiteMediaControls() {
  document.querySelectorAll('[data-editor-media]').forEach((element) => attachEditButton(element.parentElement, `Cambiar ${mediaTitle(element.dataset.editorMedia)}`, () => openSiteMediaDialog(element)));
}

async function publishPendingProducts() {
  const failed = [];
  for (const id of [...editorState.dirtyEntryIds]) {
    const entry = editorState.entries.find((item) => item.id === id); const validation = publishableDraft(entry?.draft_payload);
    if (!validation.valid) { failed.push(entry?.draft_payload?.name?.es ?? 'un modelo'); continue; }
    try { await publishEntry(id); editorState.dirtyEntryIds.delete(id); } catch { failed.push(entry?.draft_payload?.name?.es ?? 'un modelo'); }
  }
  if (failed.length) throw new Error(`Falta una foto de portada o no se pudo publicar: ${failed.join(', ')}.`);
}

async function publishPendingSiteSections() {
  const failed = [];
  for (const [section] of editorState.dirtySiteSections) {
    try { await publishSiteSection(section); editorState.dirtySiteSections.delete(section); }
    catch { failed.push(section); }
  }
  if (failed.length) throw new Error(`No se pudo publicar el texto de: ${failed.join(', ')}.`);
}

async function publishPendingSiteMedia() {
  const failed = [];
  for (const slot of [...editorState.dirtySiteMedia]) {
    try { await publishSiteMedia(slot); editorState.dirtySiteMedia.delete(slot); } catch { failed.push(mediaTitle(slot)); }
  }
  if (failed.length) throw new Error(`No se pudo publicar: ${failed.join(', ')}.`);
}

export async function startEditorMode() {
  if (!isEditorMode()) return false;
  const client = await getSupabaseClient(supabaseConfig);
  if (!client) { location.replace('index.html'); return false; }
  const access = await requireEditorSession(client);
  if (!access.allowed) { location.replace('index.html'); return false; }
  document.body.classList.add('editor-active'); editorState.client = client;
  try {
    editorState.entries = await listEditorEntries(); editorState.siteSections = await listEditorSiteSections(); editorState.siteMedia = await listEditorSiteMedia();
    const categories = editorState.siteSections.find((section) => section.section === 'categories')?.draft_payload?.items;
    if (Array.isArray(categories) && categories.length) { editorState.categories = categories; globalThis.catalogEditorBridge.setCategories(categories); }
  } catch { setStatus('No se pudieron cargar los borradores. Revisá la conexión.', true); }
  document.querySelector('#editor-toolbar').hidden = false;
  document.querySelector('[data-editor-action="close"]').addEventListener('click', () => location.assign('index.html'));
  document.querySelector('[data-editor-action="save"]').addEventListener('click', () => setStatus(editorState.dirtyEntryIds.size || editorState.dirtySiteSections.size || editorState.dirtySiteMedia.size ? 'Tus borradores ya están guardados. Usá Vista previa o Publicar cambios.' : 'No hay cambios pendientes.'));
  document.querySelector('[data-editor-action="preview"]').addEventListener('click', () => setStatus(editorState.dirtyEntryIds.size || editorState.dirtySiteSections.size || editorState.dirtySiteMedia.size ? 'Vista previa: estás viendo cambios que todavía no están publicados.' : 'No hay borradores nuevos para previsualizar.'));
  document.querySelector('[data-editor-action="publish"]').addEventListener('click', async () => {
    try { await publishPendingSiteSections(); await publishPendingSiteMedia(); await publishPendingProducts(); setStatus('Cambios publicados. Ya se ven para quienes visiten la página.'); }
    catch (error) { setStatus(error.message || 'No se pudieron publicar todos los cambios.', true); }
  });
  attachProductControls(); attachTextControls(); attachSiteMediaControls(); attachCategoryControl();
  document.addEventListener('catalog:filters-rendered', attachCategoryControl);
  new MutationObserver(attachProductControls).observe(document.querySelector('#catalog-grid'), { childList: true }); return true;
}

startEditorMode();
