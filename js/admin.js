import { getSupabaseClient } from './supabase-client.js';
import { supabaseConfig } from './supabase-config.js';
import { normalizeEditorRedirect, requireEditorSession } from './editor-session.js';

const loginForm = document.querySelector('#login-form');
const loginMessage = document.querySelector('#login-message');

async function clientOrMessage() {
  const client = await getSupabaseClient(supabaseConfig);
  if (!client) loginMessage.textContent = 'La conexión privada todavía no está disponible.';
  return client;
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const client = await clientOrMessage();
  if (!client) return;
  loginMessage.textContent = '';
  const { error } = await client.auth.signInWithPassword({
    email: document.querySelector('#email').value,
    password: document.querySelector('#password').value,
  });
  if (error) { loginMessage.textContent = 'No pudimos ingresar con esos datos.'; return; }
  const access = await requireEditorSession(client);
  if (!access.allowed) {
    await client.auth.signOut();
    loginMessage.textContent = access.reason;
    return;
  }
  location.assign(normalizeEditorRedirect());
});
