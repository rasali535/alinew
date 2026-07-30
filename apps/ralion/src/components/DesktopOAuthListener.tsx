'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function DesktopOAuthListener() {
  const router = useRouter();

  useEffect(() => {
    // Only run if we are inside the Desktop Electron app
    if (typeof window !== 'undefined' && (window as any).ralionDesktop) {
      const desktopApi = (window as any).ralionDesktop;
      
      if (desktopApi.onOAuthCallback) {
        desktopApi.onOAuthCallback(async (data: { access_token: string; refresh_token: string; provider_token?: string }) => {
          if (data.access_token && data.refresh_token) {
            console.log('[DesktopOAuthListener] Received tokens from deep link. Setting session...');
            const supabase = createClient();
            
            const { error } = await supabase.auth.setSession({
              access_token: data.access_token,
              refresh_token: data.refresh_token,
            });

            if (error) {
              console.error('[DesktopOAuthListener] Error setting session:', error);
              return;
            }

            console.log('[DesktopOAuthListener] Session set successfully. Redirecting...');
            
            // Redirect to dashboard
            window.location.href = '/ralion/dashboard';
          }
        });
      }
    }
  }, [router]);

  return null;
}
