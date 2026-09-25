import { supabaseConfig } from './supabase-config.js';
import { getSupabaseClient } from './supabase-client.js';

function normalizedMedia(media, signedUrls) {
  return (media ?? [])
    .map((item) => ({
      id: item.id,
      type: item.media_type,
      isCover: item.is_cover,
      sortOrder: item.sort_order,
      url: signedUrls.get(item.storage_path),
    }))
    .filter((item) => item.url)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export async function loadPublishedCatalogue() {
  try {
    const client = await getSupabaseClient(supabaseConfig);
    if (!client) return [];

    const { data: rows, error } = await client
      .from('catalog_entries')
      .select('id, slug, status, published_payload, translation_state, sort_order, catalog_media(id, storage_path, media_type, sort_order, is_cover)')
      .order('sort_order');
    if (error || !rows?.length) return [];

    const paths = rows.flatMap((row) => (row.catalog_media ?? []).map((media) => media.storage_path));
    const { data: signed, error: signedError } = await client.storage
      .from('catalog-media')
      .createSignedUrls(paths, 3600);
    if (signedError) return [];

    const signedUrls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      status: row.status,
      published: row.published_payload,
      translationState: row.translation_state,
      sortOrder: row.sort_order,
      media: normalizedMedia(row.catalog_media, signedUrls),
    }));
  } catch {
    return [];
  }
}

async function requiredEditorClient() {
  const client = await getSupabaseClient(supabaseConfig);
  if (!client) throw new Error('El panel todavía no está conectado.');
  return client;
}

export async function listEditorEntries() {
  const client = await requiredEditorClient();
  const { data, error } = await client
    .from('catalog_entries')
    .select('id, slug, status, draft_payload, published_payload, translation_state, sort_order, catalog_media(id, storage_path, media_type, sort_order, is_cover, is_published)')
    .eq('is_deleted', false)
    .order('sort_order');
  if (error) throw error;
  const rows = data ?? [];
  const paths = rows.flatMap((row) => (row.catalog_media ?? []).map((media) => media.storage_path));
  if (!paths.length) return rows;
  const { data: signed, error: signedError } = await client.storage.from('catalog-media').createSignedUrls(paths, 3600);
  if (signedError) throw signedError;
  const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
  return rows.map((row) => ({ ...row, editor_media: (row.catalog_media ?? []).map((media) => ({
    id: media.id, previewUrl: urls.get(media.storage_path), kind: media.media_type, isPublished: media.is_published,
  })) }));
}

export async function saveDraft(entryId, { slug, draft, translationState, sortOrder = 0 }) {
  const client = await requiredEditorClient();
  const changes = {
    slug,
    draft_payload: draft,
    translation_state: translationState,
    sort_order: sortOrder,
  };
  const query = entryId
    ? client.from('catalog_entries').update(changes).eq('id', entryId)
    : client.from('catalog_entries').insert({ ...changes, status: 'draft' });
  const { data, error } = await query.select().single();
  if (error) throw error;
  return data;
}

export async function publishEntry(entryId) {
  const client = await requiredEditorClient();
  const { data: entry, error: loadError } = await client
    .from('catalog_entries')
    .select('id, draft_payload, translation_state')
    .eq('id', entryId)
    .single();
  if (loadError) throw loadError;

  const { data, error } = await client
    .from('catalog_entries')
    .update({ status: 'published', published_payload: entry.draft_payload, published_at: new Date().toISOString() })
    .eq('id', entryId)
    .select()
    .single();
  if (error) throw error;

  const visibleMedia = (entry.draft_payload.media ?? []).filter((media) => media.id);
  await client.from('catalog_media').update({ is_published: false }).eq('entry_id', entryId);
  for (const [sortOrder, media] of visibleMedia.entries()) {
    const { error: mediaError } = await client.from('catalog_media').update({
      is_published: true,
      is_cover: media.role === 'cover',
      sort_order: sortOrder,
    }).eq('id', media.id);
    if (mediaError) throw mediaError;
  }
  return data;
}

export async function uploadMedia(entryId, file) {
  if (!file || (!file.type.startsWith('image/') && file.type !== 'video/mp4')) throw new Error('Elegí una imagen o un video MP4.');
  if (file.size > 45 * 1024 * 1024) throw new Error('Cada archivo puede pesar hasta 45 MB.');
  const client = await requiredEditorClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `draft/${entryId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage.from('catalog-media').upload(storagePath, file);
  if (uploadError) throw uploadError;
  const { data, error } = await client.from('catalog_media').insert({
    entry_id: entryId,
    storage_path: storagePath,
    media_type: file.type === 'video/mp4' ? 'video' : 'image',
  }).select().single();
  if (error) throw error;
  return { id: data.id, kind: data.media_type, path: data.storage_path, sortOrder: data.sort_order };
}

export async function removeMedia(mediaId) {
  const client = await requiredEditorClient();
  const { data: media, error: loadError } = await client.from('catalog_media').select('id, storage_path, is_published').eq('id', mediaId).single();
  if (loadError) throw loadError;
  if (media.is_published) throw new Error('Esta foto se quitará al publicar los cambios.');
  const { error } = await client.from('catalog_media').delete().eq('id', mediaId);
  if (error) throw error;
  await client.storage.from('catalog-media').remove([media.storage_path]);
}

export async function loadPublishedSiteContent() {
  try {
    const client = await getSupabaseClient(supabaseConfig);
    if (!client) return [];
    const { data, error } = await client.from('site_content').select('section, status, published_payload, translation_state');
    if (error) return [];
    return (data ?? []).map((row) => ({ section: row.section, status: row.status, published: row.published_payload, translationState: row.translation_state }));
  } catch { return []; }
}

export async function loadPublishedSiteMedia() {
  try {
    const client = await getSupabaseClient(supabaseConfig);
    if (!client) return [];
    const { data, error } = await client.from('site_media').select('slot, published_storage_path, media_type').not('published_storage_path', 'is', null);
    if (error || !data?.length) return [];
    const { data: signed, error: signedError } = await client.storage.from('site-media').createSignedUrls(data.map((item) => item.published_storage_path), 3600);
    if (signedError) return [];
    const urls = new Map((signed ?? []).map((item) => [item.path, item.signedUrl]));
    return data.map((item) => ({ slot: item.slot, type: item.media_type, url: urls.get(item.published_storage_path) })).filter((item) => item.url);
  } catch { return []; }
}

export async function listEditorSiteSections() {
  const client = await requiredEditorClient();
  const { data, error } = await client.from('site_content').select('*').order('section');
  if (error) throw error;
  return data ?? [];
}

export async function saveSiteDraft(section, payload, translationState) {
  const client = await requiredEditorClient();
  const { data, error } = await client.from('site_content').upsert({
    section,
    draft_payload: payload,
    translation_state: translationState,
  }, { onConflict: 'section' }).select().single();
  if (error) throw error;
  return data;
}

export async function publishSiteSection(section) {
  const client = await requiredEditorClient();
  const { data: current, error: currentError } = await client.from('site_content').select('draft_payload').eq('section', section).single();
  if (currentError) throw currentError;
  const { data, error } = await client.from('site_content').update({
    status: 'published', published_payload: current.draft_payload, published_at: new Date().toISOString(),
  }).eq('section', section).select().single();
  if (error) throw error;
  return data;
}

export async function listEditorSiteMedia() {
  const client = await requiredEditorClient();
  const { data, error } = await client.from('site_media').select('*').order('slot');
  if (error) throw error;
  return data ?? [];
}

export async function uploadSiteMedia(slot, file) {
  if (!file || (!file.type.startsWith('image/') && file.type !== 'video/mp4')) throw new Error('Elegí una imagen o un video MP4.');
  if (file.size > 45 * 1024 * 1024) throw new Error('Cada archivo puede pesar hasta 45 MB.');
  const client = await requiredEditorClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const storagePath = `draft/${slot}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await client.storage.from('site-media').upload(storagePath, file);
  if (uploadError) throw uploadError;
  const { data, error } = await client.from('site_media').upsert({
    slot, draft_storage_path: storagePath, media_type: file.type === 'video/mp4' ? 'video' : 'image',
  }, { onConflict: 'slot' }).select().single();
  if (error) throw error;
  return data;
}

export async function publishSiteMedia(slot) {
  const client = await requiredEditorClient();
  const { data: row, error: readError } = await client.from('site_media').select('draft_storage_path').eq('slot', slot).single();
  if (readError) throw readError;
  const { data: published, error: publishError } = await client.from('site_media').update({
    published_storage_path: row.draft_storage_path, published_at: new Date().toISOString(),
  }).eq('slot', slot).select().single();
  if (publishError) throw publishError;
  return published;
}
