import { createClient } from '@supabase/supabase-js';

// Supabase configuration using provided active credentials with environment variable support
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yidsfihagwttlmhfynmf.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlpZHNmaWhhZ3d0dGxtaGZ5bm1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI4MjM5NDUsImV4cCI6MjA5ODM5OTk0NX0.r-hhC-BT3WCf9JLq-HeTHXIFkulM5XkorUEfkqMhc-g';

const STORAGE_KEY = 'ralion-app-auth-token';

let client = (typeof globalThis !== 'undefined' ? globalThis.__ralion_website_supabase_instance__ : null);
if (!client) {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  // Intercept stale/revoked session state to prevent looping on HTTP 400
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try {
          window.localStorage?.removeItem(STORAGE_KEY);
          window.localStorage?.removeItem('sb-yidsfihagwttlmhfynmf-auth-token');
        } catch {}
      }
    });
  }

  if (typeof globalThis !== 'undefined') {
    globalThis.__ralion_website_supabase_instance__ = client;
  }
}

export const supabase = client;
