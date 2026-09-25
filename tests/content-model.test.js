import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import test from 'node:test';
import {
  localizeContent,
  markTranslationsStale,
  mergePublishedWithFallback,
  selectPublished,
} from '../js/content-model.js';
import { hydratePublicCatalogue } from '../js/public-content.js';

test('uses Spanish when a published English description is missing or stale', () => {
  const record = {
    published: {
      name: { es: 'Neo', en: 'Neo' },
      description: { es: 'Cuero vacuno', en: '' },
      category: 'acolchadas',
    },
    translationState: { en: 'missing', ptBR: 'missing' },
    media: [],
    status: 'published',
  };

  assert.equal(localizeContent(record, 'en').description, 'Cuero vacuno');
});

test('marks non-Spanish translations stale after a Spanish description changes', () => {
  const next = markTranslationsStale(
    { translationState: { en: 'current', ptBR: 'current' } },
    ['description.es'],
  );

  assert.deepEqual(next.translationState, { en: 'stale', ptBR: 'stale' });
});

test('selects only visible published entries', () => {
  const entries = [
    { id: 'published', status: 'published', isDeleted: false },
    { id: 'draft', status: 'draft', isDeleted: false },
    { id: 'removed', status: 'published', isDeleted: true },
  ];

  assert.deepEqual(selectPublished(entries).map((entry) => entry.id), ['published']);
});

test('keeps the local catalogue when no remote published records are available', () => {
  const fallback = [{ id: 'neo' }];

  assert.deepEqual(mergePublishedWithFallback([], fallback), fallback);
});

test('documents published-only anonymous access and editor-only writes', () => {
  const migration = fs.readFileSync(
    new URL('../supabase/migrations/20260921_catalog_admin.sql', import.meta.url),
    'utf8',
  );

  assert.match(migration, /status = 'published'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /enable row level security/i);
});

test('keeps site media in a dedicated private bucket with published-only reads', () => {
  const migration = fs.readFileSync(new URL('../supabase/migrations/20260921_site_media.sql', import.meta.url), 'utf8');
  assert.match(migration, /site-media/);
  assert.match(migration, /published_storage_path is not null/);
  assert.match(migration, /public\.is_catalog_editor\(\)/);
});

test('generates the current published Spanish catalogue as Supabase seed data', () => {
  const output = execFileSync(process.execPath, ['supabase/seed/build-initial-content.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });
  const seed = JSON.parse(output);

  assert.equal(seed.entries.length, 17);
  assert.ok(seed.entries.every((entry) => entry.status === 'published'));
  assert.ok(seed.entries.every((entry) => entry.publishedPayload.name.es));
  assert.ok(seed.entries.every((entry) => entry.media.length > 0));
  assert.deepEqual(seed.siteSections.map((section) => section.section), ['copy', 'hero', 'experience', 'footer']);
});

test('does not replace the visible local catalogue when Supabase is unconfigured', async () => {
  const products = [{ id: 'neo' }];

  assert.deepEqual(await hydratePublicCatalogue(products, async () => []), products);
});

test('replaces fallback entries only with valid published remote entries', async () => {
  const remote = [{
    id: 'neo',
    slug: 'neo',
    status: 'published',
    published: { name: { es: 'Neo' }, description: { es: 'Cuero vacuno' }, category: 'acolchadas' },
    media: [{ type: 'image', url: 'https://example.test/neo.jpg', isCover: true }],
  }];

  assert.equal((await hydratePublicCatalogue([], async () => remote))[0].id, 'neo');
});
