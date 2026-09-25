import { hasSupabaseConfig } from './supabase-config.js';

let clientPromise;

export async function createSupabaseClient(config) {
  if (!hasSupabaseConfig(config)) return null;

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  return createClient(config.url, config.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

export function getSupabaseClient(config) {
  if (!clientPromise) clientPromise = createSupabaseClient(config);
  return clientPromise;
}
