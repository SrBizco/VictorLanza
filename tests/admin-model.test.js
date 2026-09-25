import assert from 'node:assert/strict';
import test from 'node:test';
import { publishDraft, publishableDraft, reorderMedia, updateSpanishDraft } from '../js/admin-model.js';

test('accepts a Spanish-only model for publication', () => {
  const result = publishableDraft({
    name: { es: 'Neo', en: '', ptBR: '' },
    description: { es: 'Cuero vacuno', en: '', ptBR: '' },
    category: 'acolchadas',
    media: [{ kind: 'image', role: 'cover' }],
  });

  assert.equal(result.valid, true);
});

test('reorders gallery media immutably', () => {
  const media = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  assert.deepEqual(reorderMedia(media, 2, 0).map((item) => item.id), ['c', 'a', 'b']);
  assert.deepEqual(media.map((item) => item.id), ['a', 'b', 'c']);
});

test('publication copies the draft while preserving a separate draft object for later edits', () => {
  const result = publishDraft({ draft: { name: { es: 'Neo nuevo' } }, published: { name: { es: 'Neo anterior' } } });

  assert.equal(result.published.name.es, 'Neo nuevo');
  assert.equal(result.draft.name.es, 'Neo nuevo');
  assert.notEqual(result.published, result.draft);
});

test('changing Spanish marks existing optional translations stale but does not block publish', () => {
  const next = updateSpanishDraft({
    name: { es: 'Neo', en: 'Neo', ptBR: 'Neo' },
    description: { es: 'Cuero vacuno', en: 'Leather', ptBR: 'Couro' },
    category: 'acolchadas',
    media: [{ kind: 'image', role: 'cover' }],
    translationState: { en: 'current', ptBR: 'current' },
  }, { description: 'Nueva descripción' });

  assert.equal(next.translationState.en, 'stale');
  assert.equal(publishableDraft(next).valid, true);
});
