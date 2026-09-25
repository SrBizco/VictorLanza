import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const publicPage = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const adminPage = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('public page loads the visual editor controller as a module', () => {
  assert.match(publicPage, /type="module" src="js\/editor-mode\.js"/);
});

test('admin page has no standalone catalogue dashboard', () => {
  assert.doesNotMatch(adminPage, /id="dashboard"/);
});

test('visual mode page declares a fixed owner toolbar and dialog', () => {
  assert.match(publicPage, /id="editor-toolbar"/);
  assert.match(publicPage, /id="editor-status"/);
  assert.match(publicPage, /id="editor-dialog"/);
});

test('editor CSS scopes controls to editor-active and has mobile rules', () => {
  const css = fs.readFileSync(new URL('../css/editor.css', import.meta.url), 'utf8');
  assert.match(css, /body\.editor-active/);
  assert.match(css, /@media \(max-width: 560px\)/);
});

test('public app exposes an editor refresh bridge without enabling editor mode', () => {
  const app = fs.readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
  assert.match(app, /globalThis\.catalogEditorBridge/);
  assert.match(app, /updateProduct/);
});

test('public markup ships editor chrome hidden and never ships active controls', () => {
  assert.match(publicPage, /id="editor-toolbar"[^>]*hidden/);
  assert.doesNotMatch(publicPage, /class="editor-control"/);
});

test('editor controller includes visual media controls and separate publication actions', () => {
  const editor = fs.readFileSync(new URL('../js/editor-mode.js', import.meta.url), 'utf8');
  assert.match(editor, /attachSiteMediaControls/);
  assert.match(editor, /publishPendingSiteMedia/);
  assert.match(editor, /publishPendingProducts/);
});

test('editor pencil keeps a fixed icon font instead of inheriting heading size', () => {
  const css = fs.readFileSync(new URL('../css/editor.css', import.meta.url), 'utf8');
  assert.match(css, /\.editor-control[^}]*font:s*700 1rem\/1/);
});

test('editor styles provide immediate pressed and busy feedback', () => {
  const css = fs.readFileSync(new URL('../css/editor.css', import.meta.url), 'utf8');
  assert.match(css, /\.editor-control:active/);
  assert.match(css, /\[aria-busy="true"\]/);
});
