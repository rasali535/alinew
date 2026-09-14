import { createClient as createSupabaseClient, SupabaseClient, Session } from '@supabase/supabase-js';

// Global singleton instance — prevents multiple GoTrueClient instances across
// Webpack chunks, hot module reloads, and micro-frontends from competing on the same localStorage auth key.
declare global {
  var __ralion_supabase_instance__: SupabaseClient | undefined;
  var __ralion_refresh_promise__: Promise<{ data: { session: Session | null; user: any | null }; error: any | null }> | null | undefined;
}

let _supabaseInstance: SupabaseClient | null = null;
let _sharedRefreshPromise: Promise<{ data: { session: Session | null; user: any | null }; error: any | null }> | null = null;

export const CANONICAL_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';
export const CANONICAL_STORAGE_KEY = 'ralion-app-auth-token';

function resolveSupabaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isProdHost = hostname.includes('rasalilabs.com') || hostname.includes('onrender.com');
    if (isProdHost && (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      return CANONICAL_SUPABASE_URL;
    }
  }
  return envUrl || CANONICAL_SUPABASE_URL;
}

function pruneLegacyStorageKeys(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const canonicalValue = window.localStorage.getItem(CANONICAL_STORAGE_KEY);
    const keysToRemove: string[] = [];

    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      // Identify legacy supabase-generated auth keys that conflict with canonical storage
      if (key.startsWith('sb-') && key.endsWith('-auth-token') && key !== CANONICAL_STORAGE_KEY) {
        // If canonical storage is empty but legacy key has a session, migrate it first
        if (!canonicalValue) {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.access_token) {
                window.localStorage.setItem(CANONICAL_STORAGE_KEY, raw);
              }
            } catch {}
          }
        }
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}

function getOrCreateBrowserClient(): SupabaseClient {
  if (typeof window !== 'undefined' && (window as any).__ralion_supabase_instance__) {
    return (window as any).__ralion_supabase_instance__;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__ralion_supabase_instance__) {
    return (globalThis as any).__ralion_supabase_instance__;
  }
  if (_supabaseInstance) return _supabaseInstance;

  pruneLegacyStorageKeys();

  const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const instance = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: CANONICAL_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isDesktop, // Process OAuth callback tokens on web
    },
  });

  if (typeof window !== 'undefined') {
    instance.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try {
          window.localStorage?.removeItem(CANONICAL_STORAGE_KEY);
          window.localStorage?.removeItem('sb-yidsfihagwttlmhfynmf-auth-token');
        } catch {}
      }
    });
  }

  _supabaseInstance = instance;
  if (typeof window !== 'undefined') {
    (window as any).__ralion_supabase_instance__ = instance;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__ralion_supabase_instance__ = instance;
  }

  return instance;
}

// Deduplicated refresh function sharing one in-flight promise
export async function deduplicatedRefreshSession(client?: SupabaseClient): Promise<{
  data: { session: Session | null; user: any | null };
  error: any | null;
}> {
  const activeClient = client || getOrCreateBrowserClient();

  if (_sharedRefreshPromise) {
    return _sharedRefreshPromise;
  }

  if (typeof window !== 'undefined' && (window as any).__ralion_refresh_promise__) {
    return (window as any).__ralion_refresh_promise__;
  }

  const promise = (async () => {
    try {
      const result = await activeClient.auth.refreshSession();
      return result;
    } catch (err: any) {
      return {
        data: { session: null, user: null },
        error: err || { message: 'Refresh failed' },
      };
    } finally {
      _sharedRefreshPromise = null;
      if (typeof window !== 'undefined') {
        (window as any).__ralion_refresh_promise__ = null;
      }
      if (typeof globalThis !== 'undefined') {
        (globalThis as any).__ralion_refresh_promise__ = null;
      }
    }
  })();

  _sharedRefreshPromise = promise;
  if (typeof window !== 'undefined') {
    (window as any).__ralion_refresh_promise__ = promise;
  }
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__ralion_refresh_promise__ = promise;
  }

  return promise;
}

// Eagerly instantiate once when module loads in the browser
if (typeof window !== 'undefined' && !(window as any).__ralion_supabase_instance__) {
  getOrCreateBrowserClient();
}

export function createClient(): SupabaseClient {
  return getOrCreateBrowserClient();
}
