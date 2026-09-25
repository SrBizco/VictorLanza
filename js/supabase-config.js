// Se completa únicamente al conectar el proyecto de Supabase en el paso final.
// La clave pública puede estar en el navegador; nunca agregar aquí credenciales privadas.
export const supabaseConfig = {
  url: 'https://oqwhvjbguywhsklyrzhu.supabase.co',
  publishableKey: 'sb_publishable_acQ-1AvsIS9b8-fBAcAXUQ_VxUdoAh7',
};

export function hasSupabaseConfig(config = supabaseConfig) {
  return Boolean(config.url?.startsWith('https://') && config.publishableKey?.trim());
}
