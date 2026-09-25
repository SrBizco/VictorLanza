# Catalog Administration Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a responsive, private content-management panel for Víctor and Maxi while preserving the current public catalogue and its fallback content.

**Architecture:** GitHub Pages remains the public static host. Supabase provides Auth, Postgres, and Storage; public pages read only published records, while `/admin` allows authenticated editors to save draft versions and publish them. The existing in-repository catalogue remains the runtime fallback whenever no published Supabase content is available.

**Tech Stack:** Existing static HTML/CSS/JavaScript, Node built-in test runner, Supabase Auth/Postgres/Storage, `@supabase/supabase-js` browser ESM import.

**Spec:** `docs/superpowers/specs/2026-09-21-catalog-admin-design.md`

## Global Constraints

- Preserve the current public design, filters, gallery, cart, WhatsApp consultation behavior, and mobile breakpoints.
- Do not add automated translation, Google Cloud, a billing profile, API keys for translators, or any paid API.
- Víctor and Maxi are the only initial editor accounts and both have full draft and publishing permission.
- Spanish is canonical; English and Portuguese are optional and fall back to Spanish when absent or stale.
- No public sign-up route exists.
- Anonymous visitors read published content only; authenticated editors manage drafts and storage.
- Do not commit or push. Maxi reviews and performs all commits and pushes.
- All mutation UI must work on desktop and mobile.

## Review Focus

- A visitor must never see a draft, deleted draft, or unpublished media URL even if they know its record identifier.
- A new model with English and Portuguese left blank must still render without blank labels or broken cards in every locale.
- Editing Spanish after translations exist must mark those translations stale and force a Spanish fallback until an editor renews them.
- A failed network request must leave the existing local catalogue visible and must show an actionable admin error without losing unsaved form values.
- A mobile editor must be able to add, reorder, remove, save, preview, and publish gallery media without horizontal overflow.

---

## File Structure

- `js/content-model.js`: Pure content normalization, locale fallback, stale-translation, and draft/published selection functions.
- `js/content-api.js`: Supabase reads for published content and editor draft/publish mutations.
- `js/public-content.js`: Bridges the public page from existing local catalogue data to published Supabase content without removing fallback behavior.
- `js/supabase-client.js`: Creates a browser client only when a valid public Supabase configuration is present.
- `js/supabase-config.js`: Versioned empty configuration shape; local project values are inserted only after Supabase setup.
- `js/admin-model.js`: Pure form serialization, validation, gallery ordering, and publish readiness helpers.
- `js/admin.js`: Auth gate and responsive panel behavior.
- `admin.html`: Private editor UI.
- `css/admin.css`: Mobile-first admin styles.
- `supabase/migrations/20260921_catalog_admin.sql`: Tables, versioning, RLS policies, storage bucket policies, and editor seed policy.
- `supabase/seed/initial-content.json`: Migration input generated from the current public data.
- `tests/content-model.test.js`: Locale fallback and published content tests.
- `tests/admin-model.test.js`: Draft, stale translation, gallery and publish validation tests.
- `tests/admin-page.test.js`: Static integration checks for authentication controls and responsive admin hooks.
- `index.html`, `js/app.js`, `js/catalog.js`, `css/styles.css`: Small integration changes only; current user-visible behavior remains unchanged if Supabase is unavailable.

### Task 1: Create the versioned content model

**Files:**
- Create: `js/content-model.js`
- Create: `tests/content-model.test.js`

**Interfaces:**
- Produces `localizeContent(record, language)`, `selectPublished(records)`, `markTranslationsStale(draft, changedFields)`, and `mergePublishedWithFallback(remote, fallback)`.
- Consumes records shaped as `{ id, status, draft, published, media }`, where locale fields are `{ es, en, ptBR }`.
- Later tasks consume the returned display object `{ name, description, category, media, translationState }`.

- [ ] **Step 1: Write the failing locale-fallback test**

```js
test('uses Spanish when a published English description is missing or stale', () => {
  const record = {
    published: { name: { es: 'Neo', en: 'Neo' }, description: { es: 'Cuero vacuno', en: '' }, category: 'acolchadas' },
    translationState: { en: 'missing', ptBR: 'missing' }, media: [], status: 'published',
  };
  assert.equal(localizeContent(record, 'en').description, 'Cuero vacuno');
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/content-model.test.js`

Expected: FAIL because `js/content-model.js` does not exist.

- [ ] **Step 3: Implement the smallest content model**

```js
export function localizeContent(record, language) {
  const locale = language === 'pt-BR' ? 'ptBR' : language;
  const published = record.published;
  const translated = published.description[locale];
  const usable = translated && record.translationState?.[locale] !== 'stale';
  return { ...published, description: usable ? translated : published.description.es };
}
```

Also implement `selectPublished`, `markTranslationsStale`, and `mergePublishedWithFallback` with immutable input/output behavior.

- [ ] **Step 4: Add tests for stale translations, published-only selection, and remote failure fallback**

```js
test('marks non-Spanish translations stale after a Spanish description changes', () => {
  const next = markTranslationsStale({ translationState: { en: 'current', ptBR: 'current' } }, ['description.es']);
  assert.deepEqual(next.translationState, { en: 'stale', ptBR: 'stale' });
});

test('keeps the local catalogue when no remote published records are available', () => {
  assert.deepEqual(mergePublishedWithFallback([], [{ id: 'neo' }]), [{ id: 'neo' }]);
});
```

- [ ] **Step 5: Run the focused tests and full suite**

Run: `node --test tests/content-model.test.js && npm test`

Expected: PASS.

- [ ] **Step 6: Leave changes uncommitted for Maxi review**

Run: `git status --short`

Expected: new model and test files are visible; do not run `git commit` or `git push`.

### Task 2: Define secure Supabase schema and access policies

**Files:**
- Create: `supabase/migrations/20260921_catalog_admin.sql`
- Create: `supabase/seed/initial-content.json`
- Test: `tests/content-model.test.js`

**Interfaces:**
- Produces tables `editor_profiles`, `catalog_entries`, `site_content`, and `catalog_media`.
- Produces storage bucket `catalog-media`.
- Public reads use only `published_payload` and `status = 'published'`.
- Authenticated profiles where `can_edit = true` may manage drafts and publish.

- [ ] **Step 1: Write the failing migration-contract test**

```js
test('documents published-only anonymous access and editor-only writes', () => {
  const migration = fs.readFileSync(new URL('../supabase/migrations/20260921_catalog_admin.sql', import.meta.url), 'utf8');
  assert.match(migration, /status = 'published'/);
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /enable row level security/i);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/content-model.test.js`

Expected: FAIL because the migration file does not exist.

- [ ] **Step 3: Write the migration**

Create the four tables with UUID primary keys, timestamps, JSONB `draft_payload` and `published_payload`, `status` constrained to `draft` or `published`, locale status fields, sort order, and soft deletion state. Enable RLS on every table.

Create policies with the following behavior:

```sql
create policy "public reads published entries"
on public.catalog_entries for select
to anon, authenticated
using (status = 'published' and is_deleted = false);

create policy "editors manage catalogue"
on public.catalog_entries for all
to authenticated
using (exists (select 1 from public.editor_profiles p where p.id = auth.uid() and p.can_edit = true))
with check (exists (select 1 from public.editor_profiles p where p.id = auth.uid() and p.can_edit = true));
```

Mirror the same published-only and editor-only distinction for site content, media metadata, and Storage objects. Keep unpublished media in a non-public path and issue authenticated editor URLs only.

- [ ] **Step 4: Create deterministic migration input**

Generate `initial-content.json` from the current 17 products and current site text. Include Spanish content, current gallery ordering, all existing media paths, `published` state, and `missing` translation state where a locale value is absent.

- [ ] **Step 5: Run focused contract tests and full suite**

Run: `node --test tests/content-model.test.js && npm test`

Expected: PASS; the migration contract confirms RLS and published-only access.

- [ ] **Step 6: Leave changes uncommitted for Maxi review**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; no commit or push.

### Task 3: Add safe Supabase client and public data loading

**Files:**
- Create: `js/supabase-config.js`
- Create: `js/supabase-client.js`
- Create: `js/content-api.js`
- Create: `js/public-content.js`
- Modify: `js/catalog.js`
- Modify: `js/app.js`
- Modify: `index.html`
- Test: `tests/content-model.test.js`

**Interfaces:**
- `createSupabaseClient(config)` returns `null` for blank configuration and a client otherwise.
- `loadPublishedCatalogue()` resolves to normalized published entries or `[]` on a network/configuration failure.
- `hydratePublicCatalogue(fallbackProducts)` resolves to remote entries only if at least one valid published record exists.

- [ ] **Step 1: Write failing public-load tests**

```js
test('does not replace the visible local catalogue when Supabase is unconfigured', async () => {
  const products = [{ id: 'neo' }];
  assert.deepEqual(await hydratePublicCatalogue(products, async () => []), products);
});

test('replaces fallback entries only with valid published remote entries', async () => {
  const remote = [{ id: 'neo', status: 'published', published: { name: { es: 'Neo' } } }];
  assert.equal((await hydratePublicCatalogue([], async () => remote))[0].id, 'neo');
});
```

- [ ] **Step 2: Run focused tests to verify failure**

Run: `node --test tests/content-model.test.js`

Expected: FAIL because the public data API functions do not exist.

- [ ] **Step 3: Implement configuration and read path**

Use a dedicated `js/supabase-config.js` that exports an empty configuration shape by default. `createSupabaseClient` must not issue any request for empty URL/key values. Load the Supabase browser client dynamically only when configuration is valid.

`content-api.js` queries only records exposed by the public RLS policy. It converts rows through `content-model.js`, catches errors, returns `[]`, and never logs keys or private payloads.

- [ ] **Step 4: Integrate without changing current page behavior**

Keep `products` in `catalog.js` as the immediate initial render. After `loadPublishedCatalogue` resolves, replace the in-memory public list only when valid remote content is returned, retain selected filters/cart IDs where possible, and re-render. Existing gallery, cart and WhatsApp logic must receive the same product shape.

- [ ] **Step 5: Run tests and manually verify failure fallback**

Run: `npm test`

Manual check: load `index.html` with empty Supabase config; the 17 existing product cards, filters, gallery, cart, languages, and WhatsApp flow must remain available.

- [ ] **Step 6: Leave changes uncommitted for Maxi review**

Run: `git diff --check && git status --short`

Expected: no commit or push.

### Task 4: Build authentication and the mobile-first admin shell

**Files:**
- Create: `admin.html`
- Create: `css/admin.css`
- Create: `js/admin-model.js`
- Create: `js/admin.js`
- Create: `tests/admin-model.test.js`
- Create: `tests/admin-page.test.js`

**Interfaces:**
- `validateDraft(payload)` returns `{ valid, errors }`.
- `reorderMedia(media, fromIndex, toIndex)` returns a new ordered media list.
- `publishableDraft(payload)` accepts Spanish-only records and rejects records without Spanish name, description, category, or cover media.
- `admin.js` exposes no public registration flow; it invokes `signInWithPassword`, `signOut`, and editor-only content API methods.

- [ ] **Step 1: Write failing admin-model tests**

```js
test('accepts a Spanish-only model for publication', () => {
  const result = publishableDraft({ name: { es: 'Neo', en: '', ptBR: '' }, description: { es: 'Cuero vacuno', en: '', ptBR: '' }, category: 'acolchadas', media: [{ kind: 'image', role: 'cover' }] });
  assert.equal(result.valid, true);
});

test('reorders gallery media immutably', () => {
  const media = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  assert.deepEqual(reorderMedia(media, 2, 0).map((item) => item.id), ['c', 'a', 'b']);
  assert.deepEqual(media.map((item) => item.id), ['a', 'b', 'c']);
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test tests/admin-model.test.js`

Expected: FAIL because `js/admin-model.js` does not exist.

- [ ] **Step 3: Implement pure admin helpers**

Require Spanish name, Spanish description, category, and one image cover. Do not require English or Portuguese. Return field-specific errors in Spanish suitable for inline form feedback.

- [ ] **Step 4: Implement the HTML and responsive shell**

`admin.html` contains:

```html
<main class="admin-shell">
  <section id="login-panel">
    <h1>Ingresar al panel</h1>
    <form id="login-form"><label>Email <input id="email" type="email" required></label><label>Contraseña <input id="password" type="password" required></label><button type="submit">Ingresar</button></form>
  </section>
  <section id="dashboard" hidden>
    <header><h1>Administrar catálogo</h1><button id="sign-out">Cerrar sesión</button></header>
    <nav aria-label="Acciones del catálogo"><button id="new-product">Agregar modelo</button><button id="edit-site">Editar página</button></nav>
    <section id="draft-list" aria-live="polite"></section>
    <form id="product-form" hidden><label>Nombre en español <input id="name-es" required></label><label>Descripción en español <textarea id="description-es" required></textarea></label><label>Categoría <select id="category" required></select></label><section id="media-editor"></section><section id="optional-translations" hidden></section><button id="save-draft" type="button">Guardar borrador</button><button id="preview-draft" type="button">Vista previa</button><button id="publish-draft" type="button">Publicar cambios</button></form>
  </section>
</main>
```

The product form provides Spanish fields first; English and Portuguese appear in a collapsed optional section labelled `Traducciones opcionales`. The actions read `Guardar borrador`, `Vista previa` and `Publicar cambios`.

- [ ] **Step 5: Implement authentication gate and editor checks**

On load, read the session. If absent, show only the login form. After sign-in, fetch the `editor_profiles` record and show the dashboard only when `can_edit` is true; otherwise sign out and display `Esta cuenta no tiene permiso para editar el catálogo.` Do not implement sign-up or password creation UI.

- [ ] **Step 6: Add static page and mobile behavior tests**

```js
test('admin page has login, draft, preview and publish controls without public registration', () => {
  assert.match(page, /id="login-panel"/);
  assert.match(page, />Guardar borrador</);
  assert.match(page, />Vista previa</);
  assert.match(page, />Publicar cambios</);
  assert.doesNotMatch(page, /Crear cuenta/);
});
```

Run: `npm test`

Expected: PASS.

- [ ] **Step 7: Leave changes uncommitted for Maxi review**

Run: `git status --short`

Expected: no commit or push.

### Task 5: Implement draft, media, preview and publication workflow

**Files:**
- Modify: `js/content-api.js`
- Modify: `js/admin.js`
- Modify: `css/admin.css`
- Modify: `tests/admin-model.test.js`
- Modify: `tests/content-model.test.js`

**Interfaces:**
- `saveDraft(entryId, payload)` persists only `draft_payload`.
- `publishEntry(entryId)` validates server-visible editor access, copies draft to published fields, sets `status = 'published'`, and updates `published_at`.
- `uploadMedia(entryId, file)` stores a draft-private object and returns `{ id, kind, path, sortOrder }`.
- `removeMedia(mediaId)` removes the database reference and authenticated storage object.

- [ ] **Step 1: Write failing publication-state tests**

```js
test('publication copies the draft while preserving a separate draft object for later edits', () => {
  const result = publishDraft({ draft: { name: { es: 'Neo nuevo' } }, published: { name: { es: 'Neo anterior' } } });
  assert.equal(result.published.name.es, 'Neo nuevo');
  assert.equal(result.draft.name.es, 'Neo nuevo');
});

test('changing Spanish marks existing optional translations stale but does not block publish', () => {
  const next = updateSpanishDraft(existingDraft, { description: 'Nueva descripción' });
  assert.equal(next.translationState.en, 'stale');
  assert.equal(publishableDraft(next).valid, true);
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test tests/admin-model.test.js`

Expected: FAIL because publication helpers do not exist.

- [ ] **Step 3: Implement save and publish calls**

Persist drafts with authenticated editor sessions. The publish operation must validate Spanish fields again in the client and database policy context, publish only the selected model/settings record, and return the server-confirmed published version.

- [ ] **Step 4: Implement media management**

Accept `image/*` and `video/mp4`, reject files larger than 45 MB before upload, render upload progress, and allow accessible move-up/move-down controls in addition to drag sorting. Do not expose storage paths for draft-only media to anonymous visitors.

- [ ] **Step 5: Implement preview and destructive-action confirmations**

Preview opens the draft record in the same visual card/gallery structure used publicly, marked `Vista previa: todavía no publicada`. Deleting a model or media prompts with the exact affected name and requires an explicit confirmation; closing the dialog makes no change.

- [ ] **Step 6: Run tests and manual desktop/mobile flow**

Run: `npm test`

Manual desktop and 390px-mobile flow: sign in, add Spanish-only model, upload two media files, reorder, save, preview, publish, switch public language to English and Portuguese, confirm Spanish fallback, remove a media item, save another draft, and confirm the public page still shows the prior published version.

- [ ] **Step 7: Leave changes uncommitted for Maxi review**

Run: `git diff --check && git status --short`

Expected: no commit or push.

### Task 6: Add editable site-wide content and migration tooling

**Files:**
- Create: `js/site-content-model.js`
- Create: `tests/site-content-model.test.js`
- Modify: `js/content-api.js`
- Modify: `js/public-content.js`
- Modify: `js/admin.js`
- Modify: `index.html`
- Modify: `js/i18n.js`
- Modify: `supabase/seed/initial-content.json`

**Interfaces:**
- `localizeSiteContent(section, language)` returns the requested locale or Spanish fallback.
- `saveSiteDraft(section, payload)` and `publishSiteSection(section)` use the same separation as catalogue entries.

- [ ] **Step 1: Write failing site-content fallback test**

```js
test('uses Spanish site copy when Portuguese site copy is empty', () => {
  const section = { published: { heroTitle: { es: 'Correas de cuero', ptBR: '' } } };
  assert.equal(localizeSiteContent(section, 'pt-BR').heroTitle, 'Correas de cuero');
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test tests/site-content-model.test.js`

Expected: FAIL because `js/site-content-model.js` does not exist.

- [ ] **Step 3: Implement site sections**

Create sections for contact, hero, promises, experience, map/destinations, shipping stories and footer. Keep all current text as local fallback until a valid published section exists. Reuse the existing `data-i18n` presentation where content remains fixed; dynamic section data overrides only the matching visible content.

- [ ] **Step 4: Add the admin page editor for site sections**

Render labeled cards such as `Portada`, `Datos de contacto`, `Experiencia y destinos`, and `Pie de página`. Each has Spanish first and optional locale fields, plus draft/preview/publish actions. Do not expose raw JSON, storage paths, HTML, or code terms.

- [ ] **Step 5: Generate and validate initial migration data**

Read current `index.html`, `js/catalog.js`, and `js/i18n.js` into deterministic seed data. Validate that every current product, gallery file, video, destination story and public text has a published Spanish representation before any remote data is enabled.

- [ ] **Step 6: Run full tests and manual regression checks**

Run: `npm test`

Manual check: with no Supabase configuration, compare the public home, filters, product gallery, cart count, WhatsApp message, language switcher, map and shipping section to the pre-admin site.

- [ ] **Step 7: Leave changes uncommitted for Maxi review**

Run: `git diff --check && git status --short`

Expected: no commit or push.

### Task 7: Provision, seed and verify the real Supabase project

**Files:**
- Modify: `js/supabase-config.js`
- Modify: `supabase/seed/initial-content.json`
- Create: `docs/superpowers/runbooks/supabase-editor-setup.md`
- Test: `tests/admin-page.test.js`

**Interfaces:**
- Uses the project URL and publishable key supplied after Maxi creates the free Supabase project.
- Uses two invited Auth accounts mapped to `editor_profiles.can_edit = true`.

- [ ] **Step 1: Write a failing configuration contract test**

```js
test('keeps production configuration free of Supabase secret keys', () => {
  const config = fs.readFileSync(new URL('../js/supabase-config.js', import.meta.url), 'utf8');
  assert.doesNotMatch(config, /service_role|sb_secret/i);
  assert.match(config, /publishableKey/);
});
```

- [ ] **Step 2: Run the focused test to verify failure**

Run: `node --test tests/admin-page.test.js`

Expected: FAIL until the public configuration module is created.

- [ ] **Step 3: Ask Maxi to create the external Supabase project and provide public values**

Do not request or handle passwords. Maxi creates a Supabase Free project, applies the SQL migration in the SQL Editor, creates/invites the two editor accounts, and provides only the project URL and publishable key. The runbook gives click-by-click instructions.

- [ ] **Step 4: Configure and seed**

Set the provided public URL/key in `js/supabase-config.js`. Upload existing catalogue assets through authenticated editor tooling or the Supabase Storage dashboard. Insert the generated published seed rows, verify both editor profile IDs have `can_edit = true`, and keep anonymous access restricted to published rows.

- [ ] **Step 5: Verify authorization boundaries**

Manual checks:

1. Signed out: `/admin` shows login only; public catalogue loads published entries.
2. Uninvited authenticated account: dashboard remains unavailable.
3. Víctor: can draft, upload, preview and publish a Spanish-only product.
4. Maxi: can perform the same actions.
5. Direct anonymous request for a draft row and draft storage path fails.

- [ ] **Step 6: Verify production-like public and mobile behavior**

Run: `npm test`

Manual check at 390px and desktop: current published site interactions remain intact; a newly published item appears; an unpublished subsequent edit is not visible; English/Portuguese fall back to Spanish when their optional values are missing or stale.

- [ ] **Step 7: Leave changes uncommitted for Maxi review**

Run: `git diff --check && git status --short`

Expected: no commit or push.

## Self-Review

### Spec coverage

- Private access for two full editors: Tasks 2, 4 and 7.
- Draft, preview and publish workflow: Tasks 4 and 5.
- Product/media/site content editing: Tasks 5 and 6.
- Optional translations with Spanish fallback and stale marking: Tasks 1, 5 and 6.
- Existing public UI and offline/remote failure fallback: Tasks 1 and 3.
- Desktop and mobile verification: Tasks 4, 5, 6 and 7.
- No translation API, no payment/billing integration, and no commit/push: Global Constraints and every task's final step.

### Placeholder scan

No placeholders or undefined interfaces remain. The only external prerequisite is deliberate account creation by Maxi in Task 7, which cannot be automated without his account authority.

### Type consistency

Locale keys are consistently `es`, `en`, and `ptBR` in stored content; browser language `pt-BR` is normalized in `localizeContent` and `localizeSiteContent`. Published content uses `published_payload` / `published`; draft content uses `draft_payload` / `draft` throughout.

### Review focus coverage

- Draft privacy: Task 2 policy contract and Task 7 authorization checks.
- Missing locale strings: Task 1 and Task 6 fallback tests.
- Stale translations: Task 1 and Task 5 tests.
- Network failure fallback: Task 3 tests and manual regression check.
- Mobile media editing: Task 5 manual 390px test.
