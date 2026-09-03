import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

// Global singleton instance — prevents multiple GoTrueClient instances across
// Webpack chunks, hot module reloads, and micro-frontends from competing on the same localStorage auth key.
declare global {
  var __ralion_supabase_instance__: SupabaseClient | undefined;
}

let _supabaseInstance: SupabaseClient | null = null;

function getOrCreateBrowserClient(): SupabaseClient {
  if (typeof window !== 'undefined' && (window as any).__ralion_supabase_instance__) {
    return (window as any).__ralion_supabase_instance__;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__ralion_supabase_instance__) {
    return (globalThis as any).__ralion_supabase_instance__;
  }
  if (_supabaseInstance) return _supabaseInstance;

  const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://yidsfihagwttlmhfynmf.supabase.co';

  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const instance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'ralion-app-auth-token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isDesktop, // Required on web so Supabase processes OAuth callback tokens
    },
  });

  _supabaseInstance = instance;
  if (typeof window !== 'undefined') {
    (window as any).__ralion_supabase_instance__ = instance;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__ralion_supabase_instance__ = instance;
  }

  return instance;
}

// Eagerly instantiate once when module loads in the browser
if (typeof window !== 'undefined' && !(window as any).__ralion_supabase_instance__) {
  getOrCreateBrowserClient();
}

export function createClient(): SupabaseClient {
  return getOrCreateBrowserClient();
}

