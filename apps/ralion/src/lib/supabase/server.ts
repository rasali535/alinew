import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Cookie-aware client for Server Components and Route Handlers. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot write cookies; middleware handles refresh.
          }
        },
      },
    }
  );
}

export const CANONICAL_SUPABASE_URL = 'https://yidsfihagwttlmhfynmf.supabase.co';

type PrivilegedKeySource =
  | 'SUPABASE_SECRET_KEY'
  | 'SUPABASE_SERVICE_ROLE_KEY'
  | 'SUPABASE_SERVICE_KEY';

export interface PrivilegedSupabaseKey {
  key: string;
  source: PrivilegedKeySource;
}

export function resolveSupabaseUrl(): string {
  const configuredUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isUnsafeProductionUrl =
    process.env.NODE_ENV === 'production' &&
    (!configuredUrl || configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1'));

  return isUnsafeProductionUrl ? CANONICAL_SUPABASE_URL : configuredUrl || CANONICAL_SUPABASE_URL;
}

/**
 * Resolves server-only Supabase credentials without ever falling back to a
 * publishable or anonymous key. Modern sb_secret_* keys take precedence.
 */
export function resolvePrivilegedSupabaseKey(): PrivilegedSupabaseKey {
  const candidates: Array<[PrivilegedKeySource, string | undefined]> = [
    ['SUPABASE_SECRET_KEY', process.env.SUPABASE_SECRET_KEY],
    ['SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY],
    ['SUPABASE_SERVICE_KEY', process.env.SUPABASE_SERVICE_KEY],
  ];
  const selected = candidates.find(([, value]) => Boolean(value?.trim()));

  if (!selected) {
    const error = new Error(
      '[SupabaseServer] A privileged server credential is required (SUPABASE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, or SUPABASE_SERVICE_KEY).'
    );
    (error as Error & { code?: string }).code = 'SUPABASE_CONFIG_ERROR';
    throw error;
  }

  return { source: selected[0], key: selected[1]!.trim() };
}

let privilegedClient: SupabaseClient | null = null;
let privilegedClientSource: PrivilegedKeySource | null = null;

export function getPrivilegedSupabase(): SupabaseClient {
  const credential = resolvePrivilegedSupabaseKey();

  if (!privilegedClient || privilegedClientSource !== credential.source) {
    privilegedClient = createSupabaseClient(resolveSupabaseUrl(), credential.key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    privilegedClientSource = credential.source;
    console.info(`[SupabaseServer] Privileged client initialized using ${credential.source}.`);
  }

  return privilegedClient;
}
