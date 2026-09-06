import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('shows the WhatsApp contact number in the header as a tap-to-call link', () => {
  assert.match(page, /class="header-contact"/);
  assert.match(page, /href="tel:\+5491125531967"/);
  assert.match(page, />\+54 9 11 2553-1967</);
});
