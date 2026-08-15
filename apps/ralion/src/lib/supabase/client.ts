import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Singleton instance — prevents multiple GoTrueClient instances sharing
// the same localStorage key, which causes undefined auth behavior.
let _supabaseInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_supabaseInstance) return _supabaseInstance;

  const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://yidsfihagwttlmhfynmf.supabase.co';

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

  _supabaseInstance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isDesktop, // Required on web so Supabase processes OAuth callback tokens
    },
  });

  return _supabaseInstance;
}

