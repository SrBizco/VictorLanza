import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync(new URL('../admin.html', import.meta.url), 'utf8');

test('admin page is a private visual-editor entry without a standalone dashboard', () => {
  assert.match(page, /id="login-panel"/);
  assert.match(page, />Editar la página</);
  assert.doesNotMatch(page, /id="dashboard"/);
  assert.doesNotMatch(page, /Crear cuenta/);
});

test('keeps production configuration free of Supabase secret keys', () => {
  const config = fs.readFileSync(new URL('../js/supabase-config.js', import.meta.url), 'utf8');

  assert.doesNotMatch(config, /service_role|sb_secret/i);
  assert.match(config, /publishableKey/);
});
