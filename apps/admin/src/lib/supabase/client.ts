import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  var __ralion_admin_supabase_instance__: SupabaseClient | undefined;
}

let _supabaseAdminInstance: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (typeof window !== 'undefined' && (window as any).__ralion_admin_supabase_instance__) {
    return (window as any).__ralion_admin_supabase_instance__;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__ralion_admin_supabase_instance__) {
    return (globalThis as any).__ralion_admin_supabase_instance__;
  }
  if (_supabaseAdminInstance) return _supabaseAdminInstance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yidsfihagwttlmhfynmf.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

  const instance = createBrowserClient(url, key);

  _supabaseAdminInstance = instance;
  if (typeof window !== 'undefined') {
    (window as any).__ralion_admin_supabase_instance__ = instance;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__ralion_admin_supabase_instance__ = instance;
  }

  return instance;
}
