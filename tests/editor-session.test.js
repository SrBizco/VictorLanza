import assert from 'node:assert/strict';
import test from 'node:test';
import { isEditorMode, normalizeEditorRedirect } from '../js/editor-session.js';

test('recognizes only an explicit visual editing query parameter', () => {
  assert.equal(isEditorMode(new URL('https://example.test/index.html?modo=editar')), true);
  assert.equal(isEditorMode(new URL('https://example.test/index.html')), false);
  assert.equal(isEditorMode(new URL('https://example.test/index.html?modo=publico')), false);
});

test('keeps the editor redirect on the local page and removes unrelated query values', () => {
  assert.equal(normalizeEditorRedirect(new URL('https://example.test/admin.html?x=1')), 'index.html?modo=editar');
});
