import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance — prevents multiple GoTrueClient instances sharing
// the same localStorage key, which causes undefined auth behavior.
let _supabaseInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_supabaseInstance) return _supabaseInstance;

  _supabaseInstance = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    }
  );

  return _supabaseInstance;
}
