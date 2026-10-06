'use client';

import React from 'react';
import { OrganizationProvider } from '@ralion/auth';
import { createClient } from '@/lib/supabase/client';

/**
 * Ensures the one canonical browser Supabase client is initialized before
 * OrganizationProvider attempts to resolve or refresh the persisted session.
 *
 * On a full page reload OrganizationProvider can otherwise encounter an expired
 * access token before __ralion_refresh_session__ has been registered, which can
 * incorrectly collapse a still-recoverable login into a signed-out state.
 */
export function RalionAuthProvider({ children }: { children: React.ReactNode }) {
  if (typeof window !== 'undefined') {
    createClient();
  }

  return <OrganizationProvider>{children}</OrganizationProvider>;
}
