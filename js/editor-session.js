export function isEditorMode(url = window.location) {
  return new URL(url).searchParams.get('modo') === 'editar';
}

export function normalizeEditorRedirect() {
  return 'index.html?modo=editar';
}

export async function requireEditorSession(client) {
  const { data: { user } } = await client.auth.getUser();
  if (!user) return { allowed: false, reason: 'Ingresá para editar la página.' };
  const { data } = await client.from('editor_profiles').select('can_edit').eq('id', user.id).maybeSingle();
  return data?.can_edit
    ? { allowed: true }
    : { allowed: false, reason: 'Esta cuenta no tiene permiso para editar la página.' };
}
