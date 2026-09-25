# Visual Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authorized owner edit the live Victor Lanza catalogue visually, using the public page itself rather than a separate administrative dashboard.

**Architecture:** `admin.html` remains the private authentication entry point and redirects an authorized session to `index.html?modo=editar`. A small editor controller loads only in that mode, rechecks editor authorization, and injects a toolbar, edit affordances and dialogs over the existing public DOM. The public app keeps its current data/rendering path; editor actions use the existing draft/publication content API and never activate in a normal public URL.

**Tech Stack:** Static HTML/CSS, browser ES modules, Supabase Auth/Postgres/Storage, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-21-visual-editor-design.md`

## Global Constraints

- Preserve the public desktop and mobile catalogue appearance and behavior when `modo=editar` is absent.
- Require an authenticated Supabase user with `editor_profiles.can_edit = true` before showing any editing control.
- Use Spanish first; English and Brazilian Portuguese are optional and public content falls back to Spanish.
- Keep draft and published data separate; only `Publicar cambios` changes public content.
- Do not expose Supabase private keys, raw storage paths, IDs, JSON or database terminology in the owner interface.
- Allow only images and MP4 videos up to 45 MB for uploads.
- Do not commit or push: Maxi reviews and performs all Git operations.

## Review Focus

- A visitor manually appending `?modo=editar` receives no controls without an authorized session; Task 1 test pins this.
- On a 390 px screen, the toolbar and edit buttons do not cover the consultation cart or content; Task 2 owns visual/mobile checks.
- Editing Spanish while English/Portuguese are blank leaves the product publishable and public locales fall back to Spanish; Task 3 test pins this.
- Cancelling a removal leaves the model/media unchanged; Task 3 test pins the controller decision helper.
- A failed upload leaves the draft and published gallery unchanged and shows a plain-language error; Task 3 test pins upload input validation and API error propagation.

---

### Task 1: Add an authenticated visual-editing entry route

**Files:**
- Create: `js/editor-session.js`
- Create: `js/editor-mode.js`
- Modify: `admin.html`
- Modify: `js/admin.js`
- Modify: `index.html`
- Test: `tests/editor-session.test.js`
- Test: `tests/editor-page.test.js`

**Interfaces:**
- Produces `isEditorMode(url = window.location): boolean`.
- Produces `requireEditorSession(client): Promise<{ allowed: boolean, reason?: string }>`.
- Produces `startEditorMode(): Promise<boolean>`; returns `false` and leaves the public DOM unchanged when authorization fails.
- Consumes `getSupabaseClient()` and the existing `editor_profiles` RLS policy.

- [ ] **Step 1: Write failing route and authorization tests**

```js
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
```

Add a static-page assertion that `index.html` loads `js/editor-mode.js` as an ES module and that `admin.html` has no dashboard markup after the login form.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/editor-session.test.js tests/editor-page.test.js`

Expected: FAIL because the editor session module and mode module do not exist.

- [ ] **Step 3: Implement route and permission helpers**

Create `js/editor-session.js` with pure URL parsing and an Auth check that does not reveal profile details to a denied user:

```js
export function isEditorMode(url) {
  return new URL(url).searchParams.get('modo') === 'editar';
}

export function normalizeEditorRedirect() {
  return 'index.html?modo=editar';
}

export async function requireEditorSession(client) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { allowed: false, reason: 'Ingresá para editar la página.' };
  const { data } = await client.from('editor_profiles').select('can_edit').eq('id', user.id).maybeSingle();
  return data?.can_edit ? { allowed: true } : { allowed: false, reason: 'Esta cuenta no tiene permiso para editar la página.' };
}
```

Refactor `admin.html` to retain the login card only. On authorized sign-in, `admin.js` navigates to `normalizeEditorRedirect()`. A denied user is signed out and remains on the login card.

Load `editor-mode.js` from `index.html`; its first action is a no-op unless `isEditorMode(location)` is true. In visual mode, it obtains the Supabase client, calls `requireEditorSession`, then adds `editor-active` to `<body>`. On failure it removes `modo` with `location.replace('index.html')`.

- [ ] **Step 4: Run focused tests to verify pass**

Run: `node --test tests/editor-session.test.js tests/editor-page.test.js`

Expected: PASS.

- [ ] **Step 5: Run the full suite and leave work uncommitted**

Run: `npm test && git diff --check && git status --short`

Expected: all tests pass; no whitespace errors; no commit or push.

### Task 2: Render the page-level visual editing layer

**Files:**
- Create: `css/editor.css`
- Modify: `index.html`
- Modify: `js/editor-mode.js`
- Test: `tests/editor-page.test.js`

**Interfaces:**
- Consumes `startEditorMode()` authorization result from Task 1.
- Produces `mountEditorChrome({ onSave, onPreview, onPublish, onClose }): void`.
- Produces `attachEditButton(element, { label, action }): HTMLButtonElement`.
- Later tasks register `action` callbacks for text, model, story and media forms.

- [ ] **Step 1: Write failing visual-layer tests**

```js
test('visual mode page declares a fixed owner toolbar and no public-page toolbar', () => {
  const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(page, /id="editor-toolbar"/);
  assert.match(page, /id="editor-status"/);
  assert.match(page, /id="editor-dialog"/);
});

test('editor CSS keeps controls scoped to editor-active', () => {
  const css = fs.readFileSync(new URL('../css/editor.css', import.meta.url), 'utf8');
  assert.match(css, /body\.editor-active/);
  assert.match(css, /@media \(max-width: 560px\)/);
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/editor-page.test.js`

Expected: FAIL because the toolbar, dialog and stylesheet do not exist.

- [ ] **Step 3: Add static chrome and responsive styles**

Add, immediately before `</body>` in `index.html`:

```html
<aside id="editor-toolbar" class="editor-toolbar" hidden aria-label="Edición de la página">
  <p id="editor-status" role="status">Sin cambios pendientes</p>
  <div>
    <button type="button" data-editor-action="save">Guardar borrador</button>
    <button type="button" data-editor-action="preview">Vista previa</button>
    <button type="button" data-editor-action="publish">Publicar cambios</button>
    <button type="button" data-editor-action="close">Cerrar edición</button>
  </div>
</aside>
<dialog id="editor-dialog" class="editor-dialog" aria-labelledby="editor-dialog-title"></dialog>
```

Create `editor.css` with all selectors rooted in `body.editor-active`. The toolbar is fixed at the bottom on desktop, becomes a full-width compact stack at `max-width: 560px`, and reserves bottom padding on `main` and `footer`. `.editor-control` is an absolute circular pencil control with visible focus styles; it is hidden until hover/focus on desktop and always visible but low-opacity on touch widths.

`mountEditorChrome` unhides the toolbar only after authorization, binds the four action callbacks, and `attachEditButton` adds a `button.editor-control` as the last child of a relatively positioned target. Every button uses a specific accessible label, such as `Editar título de portada`.

- [ ] **Step 4: Register non-mutating public-content controls**

In `editor-mode.js`, attach placeholder actions that open the dialog with the matching heading for: hero title/intro, each promise, catalogue heading/intro, experience title/body, map caption, each shipping story caption, header phone and footer brand. Do not alter public content in this task; this establishes exact control placement without duplicating markup.

- [ ] **Step 5: Run tests and manual layout checks**

Run: `npm test`

Manual check: visit `http://127.0.0.1:4173/index.html?modo=editar` while signed in. Confirm the public card layout, filters, gallery and consultation still work; at 390 px confirm the toolbar does not hide the floating consultation button.

- [ ] **Step 6: Leave work uncommitted**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no commit or push.

### Task 3: Add visual product editing, creation and draft actions

**Files:**
- Create: `js/editor-product-form.js`
- Modify: `js/editor-mode.js`
- Modify: `js/content-api.js`
- Modify: `js/admin-model.js`
- Modify: `css/editor.css`
- Test: `tests/editor-product-form.test.js`
- Test: `tests/admin-model.test.js`

**Interfaces:**
- Produces `productDialogMarkup(draft, { isNew }): string` with Spanish fields first and collapsed optional locales.
- Produces `buildProductDraft(form, existingDraft): object`.
- Produces `confirmRemoval(name, confirm = window.confirm): boolean`.
- Consumes `saveDraft(entryId, input)`, `uploadMedia(entryId, file)`, `removeMedia(mediaId)` and `publishEntry(entryId)`.
- Extends the editor controller with `editorState.dirtyEntryIds: Set<string>` and `editorState.newEntryIds: Set<string>`.

- [ ] **Step 1: Write failing product-dialog and removal tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { confirmRemoval, productDialogMarkup } from '../js/editor-product-form.js';

test('new product dialog asks for Spanish fields before optional translations', () => {
  const markup = productDialogMarkup({ name: { es: '' }, description: { es: '' }, media: [] }, { isNew: true });
  assert.match(markup, /Nombre del modelo/);
  assert.match(markup, /Agregar fotos o video/);
  assert.match(markup, /Traducciones opcionales/);
});

test('cancelling an exact-name removal makes no removal decision', () => {
  assert.equal(confirmRemoval('Neo', () => false), false);
  assert.equal(confirmRemoval('Neo', () => true), true);
});
```

Add a test that `publishableDraft` still accepts Spanish-only content after `updateSpanishDraft` marks optional locales stale.

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/editor-product-form.test.js tests/admin-model.test.js`

Expected: FAIL because the dialog helper does not exist.

- [ ] **Step 3: Implement the product dialog and draft state**

Create a product dialog with: name, description, category, a file input (`accept="image/*,video/mp4"`), visible media list, move-up/move-down controls, `Usar como portada`, `Quitar`, and `<details>` for optional translations. It uses `textContent`/DOM APIs when rendering existing values rather than interpolating owner text into `innerHTML`.

`buildProductDraft` returns the same shape used by `publishableDraft`:

```js
{
  name: { es, en, ptBR },
  description: { es, en, ptBR },
  category,
  media,
  translationState
}
```

On a Spanish content change, call `updateSpanishDraft` so optional locales become stale. Upload only after a draft entry exists; for a new model, save its initial draft first, then upload selected files. Reject invalid type or files larger than 45 MB before calling the API and display the API error in the dialog.

- [ ] **Step 4: Wire product controls into the real catalogue**

After `app.js` renders the grid, editor mode adds an `Editar modelo` pencil to every `.product-card`; the action opens that product's draft. Add a final `.editor-add-product-card` with `+ Agregar modelo` after the current catalogue cards only while `editor-active` is present.

Save closes neither the dialog nor publishes content; it records the returned entry ID, marks the toolbar as `Borrador guardado`, and refreshes the public editor view from the current draft. Preview applies pending draft content only inside editor mode and adds a `Vista previa: todavía no publicada` label. Publish validates each dirty entry with `publishableDraft`, calls `publishEntry` only for valid dirty entries, then refreshes the public render and clears only successful IDs from `dirtyEntryIds`.

For a remove action, call `confirmRemoval(productName)` first. On cancel, do nothing. On confirmation, remove an unpublished media object with `removeMedia`; for a previously published media object, remove it from the draft array so it disappears only on the next explicit publish.

- [ ] **Step 5: Run focused and full tests**

Run: `node --test tests/editor-product-form.test.js tests/admin-model.test.js && npm test`

Expected: all tests pass.

- [ ] **Step 6: Leave work uncommitted**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no commit or push.

### Task 4: Add visual editing for page copy and evidence media

**Files:**
- Create: `js/editor-site-form.js`
- Modify: `js/editor-mode.js`
- Modify: `js/content-api.js`
- Modify: `js/site-content-model.js`
- Modify: `index.html`
- Modify: `css/editor.css`
- Test: `tests/editor-site-form.test.js`
- Test: `tests/site-content-model.test.js`

**Interfaces:**
- Produces `siteFieldDialogMarkup({ title, spanish, english, portuguese }): string`.
- Produces `buildLocalizedField(form): { es: string, en: string, ptBR: string }`.
- Consumes `saveSiteDraft(section, payload, translationState)` and `publishSiteSection(section)`.
- Uses `editorState.dirtySiteSections: Map<string, object>` from Task 3 controller state.

- [ ] **Step 1: Write failing text fallback and field-dialog tests**

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLocalizedField, siteFieldDialogMarkup } from '../js/editor-site-form.js';

test('site text dialog keeps English and Portuguese optional', () => {
  const markup = siteFieldDialogMarkup({ title: 'Título de portada', spanish: 'Cuero', english: '', portuguese: '' });
  assert.match(markup, /Texto en español/);
  assert.match(markup, /Traducciones opcionales/);
});

test('localized site content falls back to Spanish when a translation is stale', () => {
  const section = { published: { heroTitle: { es: 'Cuero', en: 'Leather' } }, translationState: { en: 'stale' } };
  assert.equal(localizeSiteContent(section, 'en').heroTitle, 'Cuero');
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `node --test tests/editor-site-form.test.js tests/site-content-model.test.js`

Expected: FAIL because the dialog form helper and stale-site fallback do not exist.

- [ ] **Step 3: Implement localized-field editing**

Create a dialog helper with a Spanish textarea and a collapsed `Traducciones opcionales` group. Build a localized field object without HTML markup. Extend `localizeSiteContent` to read `translationState` and prefer Spanish when the selected locale is stale, using the same `pt-BR` → `ptBR` normalization as product content.

In editor mode, map each control to its human-facing label and existing section/field key. A save updates only that field in the relevant site draft payload, marks non-Spanish locales stale when Spanish changed, and records that section in `dirtySiteSections`. It leaves the public DOM unchanged until preview or publish.

- [ ] **Step 4: Implement evidence media affordances**

For the hero photo, client commercial video and each shipping story image, attach `Cambiar foto o video` controls in visual mode. The dialog permits a replacement upload, shows its file name and offers `Quitar` only after `confirmRemoval` returns true. Store the resulting media reference in the corresponding site section payload and keep the existing public asset visible until that section publishes.

Do not expose source paths in the visible interface. If a site-media replacement cannot be stored with the existing `catalog_media` structure, add a focused `site_media` table plus RLS policies in a new migration, following the same editor-only/private-draft and published-public-read conditions as `catalog_media`; add a migration test asserting those policies.

- [ ] **Step 5: Extend toolbar save, preview and publish**

`Guardar borrador` persists all dirty site sections and entries, reporting which remains unsaved on an error. `Vista previa` applies all pending drafts in editor mode only. `Publicar cambios` calls `publishSiteSection` for each dirty site section after its Spanish fields are nonempty, then calls product publication from Task 3. The status text names the outcome in plain Spanish.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/editor-site-form.test.js tests/site-content-model.test.js && npm test`

Expected: all tests pass.

- [ ] **Step 7: Leave work uncommitted**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no commit or push.

### Task 5: Verify public isolation, owner flow and mobile behavior

**Files:**
- Modify: `tests/editor-page.test.js`
- Modify: `tests/content-model.test.js`
- Modify: `docs/superpowers/runbooks/supabase-editor-setup.md`

**Interfaces:**
- Consumes the authorization guard, visual controls and publication APIs from Tasks 1–4.
- Produces a runbook that distinguishes the public URL from the private visual editor URL.

- [ ] **Step 1: Write final isolation tests**

```js
test('public markup ships the editor chrome hidden and controls are activated only by editor-active', () => {
  assert.match(page, /id="editor-toolbar"[^>]*hidden/);
  assert.doesNotMatch(page, /class="editor-control"/);
});

test('seeded public catalogue retains Spanish fallback when remote optional translations are missing', () => {
  const localized = localizeContent({ published: { name: { es: 'Neo' }, description: { es: 'Cuero' } }, translationState: { en: 'missing' } }, 'en');
  assert.equal(localized.description, 'Cuero');
});
```

- [ ] **Step 2: Run tests to verify failure or extend existing coverage**

Run: `node --test tests/editor-page.test.js tests/content-model.test.js`

Expected: any missing isolation assertion fails before its implementation; pre-existing fallback assertions remain passing.

- [ ] **Step 3: Update the owner runbook**

Add concise instructions:

```markdown
1. Visit `/admin.html` and sign in.
2. The visual editor opens automatically; do not share that URL as an editing shortcut.
3. Use Guardar borrador while working.
4. Use Vista previa to inspect private changes.
5. Use Publicar cambios only when the page should change for visitors.
```

Also document the test URL `http://127.0.0.1:4173/admin.html` and the public local URL `http://127.0.0.1:4173/`.

- [ ] **Step 4: Verify all checks**

Run: `npm test && node --check js/editor-mode.js && node --check js/editor-product-form.js && node --check js/editor-site-form.js && git diff --check`

Expected: all tests pass, syntax checks succeed and no whitespace errors appear.

- [ ] **Step 5: Manual acceptance flow**

At `http://127.0.0.1:4173`:

1. Confirm `/index.html` has no editing controls while signed out and signed in.
2. Sign in through `/admin.html`; confirm it redirects to `index.html?modo=editar`.
3. At desktop and 390 px, edit a title, save draft, preview, publish and confirm the ordinary public URL reflects only published content.
4. Edit an existing model, create a Spanish-only model from the final `+ Agregar modelo` card, upload an image, choose cover, save and publish.
5. Try removing a media item, cancel the confirmation and confirm the item remains.
6. Close editing and sign out; confirm a manually-entered editor query cannot reveal controls.

- [ ] **Step 6: Leave all work uncommitted for Maxi**

Run: `git status --short`

Expected: all changes remain uncommitted and no push occurs.
