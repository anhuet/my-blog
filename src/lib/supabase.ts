import {createClient, type SupabaseClient} from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(
  url: string | undefined,
  key: string | undefined,
): SupabaseClient | null {
  if (!url || !key) return null;
  if (!client) {
    client = createClient(url, key, {
      auth: {persistSession: false},
    });
  }
  return client;
}
