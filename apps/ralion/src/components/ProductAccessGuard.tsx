'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AuthService } from '@/lib/services/auth.service';
import { ProductService, ProductAccessResult } from '@/lib/services/product.service';
import { Button, Card, Badge } from '@ralion/ui';
import { Lock, Shield, ArrowRight, RefreshCw, LogIn, AlertCircle, Building2 } from 'lucide-react';

interface ProductAccessGuardProps {
  children: React.ReactNode;
}

type GuardState = 'loading' | 'authenticated' | 'unauthenticated' | 'unauthorized' | 'no_workspace' | 'error';

function getCanonicalLoginUrl(currentHref?: string): string {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocalhost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      window.location.protocol === 'file:';

    if (isLocalhost) {
      const port = window.location.port;
      const base = port === '3000' ? '/login' : '/ralion/login';
      const redirectParam = currentHref ? `?redirect=${encodeURIComponent(currentHref)}` : '';
      return `${base}${redirectParam}`;
    }
  }

  // Canonical production platform URL — ensure we never redirect to onrender.com
  let targetHref = currentHref;
  if (!targetHref || targetHref.includes('onrender.com') || targetHref.endsWith('/login')) {
    targetHref = 'https://rasalilabs.com/ralion/dashboard';
  }
  return `https://rasalilabs.com/ralion/login?redirect=${encodeURIComponent(targetHref)}`;
}

export const ProductAccessGuard: React.FC<ProductAccessGuardProps> = ({ children }) => {
  const [guardState, setGuardState] = useState<GuardState>('loading');
  const [access, setAccess] = useState<ProductAccessResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const checkCompletedRef = useRef(false);

  const checkAccess = useCallback(async () => {
    setGuardState('loading');
    setErrorMessage(null);
    checkCompletedRef.current = false;

    // Safety timeout: Never hang longer than 3.5 seconds
    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) =>
      setTimeout(() => resolve({ isTimeout: true }), 3500)
    );

    try {
      const isDesktop =
        typeof window !== 'undefined' &&
        ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');

      const isLocalhost =
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' ||
          window.location.hostname === '127.0.0.1' ||
          window.location.protocol === 'file:');

      // 1. Fetch Session with timeout protection
      const sessionResult = await Promise.race([
        AuthService.getSession(),
        timeoutPromise,
      ]);

      if (sessionResult && 'isTimeout' in sessionResult) {
        // If session fetch timed out: on local/desktop allow access, on web trigger unauthenticated state
        if (isDesktop || isLocalhost || process.env.NODE_ENV === 'development') {
          setAccess({ hasAccess: true, edition: isDesktop ? 'desktop_enterprise' : 'community', status: 'active' });
          setGuardState('authenticated');
        } else {
          setGuardState('unauthenticated');
        }
        checkCompletedRef.current = true;
        return;
      }

      const session = sessionResult;

      // 2. Unauthenticated check
      if (!session) {
        if (isDesktop || isLocalhost || process.env.NODE_ENV === 'development') {
          // On Desktop app or local development, grant default workspace access
          setAccess({ hasAccess: true, edition: isDesktop ? 'desktop_enterprise' : 'community', status: 'active' });
          setGuardState('authenticated');
        } else {
          // Remote unauthenticated user: Trigger redirect to canonical login and show sign-in prompt
          setGuardState('unauthenticated');
          if (typeof window !== 'undefined') {
            const currentHref = window.location.href;
            const loginUrl = getCanonicalLoginUrl(currentHref);
            try {
              window.location.href = loginUrl;
            } catch {
              // Navigation caught
            }
          }
        }
        checkCompletedRef.current = true;
        return;
      }

      // 3. Authenticated: Check Organization & Workspace Access
      const orgId: string | undefined =
        session.user?.user_metadata?.organization_id ||
        session.user?.user_metadata?.org_id;

      if (orgId) {
        const verifyResult = await Promise.race([
          ProductService.verifyProductAccess(orgId),
          timeoutPromise,
        ]);

        if (verifyResult && !('isTimeout' in verifyResult)) {
          setAccess(verifyResult);
          if (verifyResult.hasAccess) {
            setGuardState('authenticated');
          } else {
            setGuardState('unauthorized');
          }
        } else {
          // Timeout or fallback: default to Community active access
          setAccess({ hasAccess: true, edition: 'community', status: 'active' });
          setGuardState('authenticated');
        }
      } else {
        // User is authenticated but has no org yet: default to Community active access
        setAccess({ hasAccess: true, edition: isDesktop ? 'desktop_enterprise' : 'community', status: 'active' });
        setGuardState('authenticated');
      }
    } catch (err: any) {
      console.error('[ProductAccessGuard] Verification error:', err);
      setErrorMessage(err?.message || 'Failed to verify workspace credentials');
      setGuardState('error');
    } finally {
      checkCompletedRef.current = true;
    }
  }, []);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Loading State: "Verifying Ralion Workspace Access..."
  if (guardState === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 animate-spin flex items-center justify-center p-0.5">
          <div className="w-full h-full bg-zinc-950 rounded-[10px]" />
        </div>
        <div className="text-center">
          <div className="text-sm font-black tracking-wider text-white">RAS ALI LABS</div>
          <div className="text-xs text-zinc-400 mt-1">Verifying Ralion Workspace Access...</div>
        </div>
      </div>
    );
  }

  // Unauthenticated State: Clean login action card
  if (guardState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <Card className="max-w-md w-full p-8 text-center border-blue-900/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <Badge variant="primary" className="mb-2">Authentication Required</Badge>
          <h2 className="text-xl font-black text-white">Sign In to Ralion</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Please sign in with your enterprise credentials or organization SSO to access your Ralion workspace.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 font-bold"
              onClick={() => {
                const currentHref = typeof window !== 'undefined' ? window.location.href : '/ralion/dashboard';
                window.location.href = getCanonicalLoginUrl(currentHref);
              }}
            >
              <LogIn className="w-4 h-4 mr-2" /> Sign In to Workspace <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              onClick={() => {
                window.location.href = '/ralion/register';
              }}
            >
              <Building2 className="w-4 h-4 mr-2" /> Create New Organization
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Unauthorized State: Subscription Required
  if (guardState === 'unauthorized' || (access && !access.hasAccess)) {
    const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <Card className="max-w-md w-full p-8 text-center border-red-900/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <Badge variant="danger" className="mb-2">Subscription Required</Badge>
          <h2 className="text-xl font-black text-white">Ralion is Not Activated</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your organization does not have an active Ralion subscription or license key. Choose a plan to unlock your business operating system.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 font-bold"
              onClick={() => window.location.href = `${platformUrl}/portal/subscription`}
            >
              Choose a Ralion Plan <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              onClick={() => AuthService.logout()}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // No Workspace / Onboarding Required State
  if (guardState === 'no_workspace') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <Card className="max-w-md w-full p-8 text-center border-amber-900/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-4">
            <Building2 className="w-6 h-6" />
          </div>
          <Badge variant="warning" className="mb-2">Workspace Setup Required</Badge>
          <h2 className="text-xl font-black text-white">No Active Workspace</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your account is authenticated, but no active organization workspace was found. Complete setup to create your enterprise environment.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center bg-gradient-to-r from-amber-600 to-orange-600 font-bold"
              onClick={() => window.location.href = '/ralion/onboarding'}
            >
              Complete Workspace Setup <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              onClick={() => AuthService.logout()}
            >
              Sign Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Error State: Recoverable Retry Card
  if (guardState === 'error') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <Card className="max-w-md w-full p-8 text-center border-zinc-800 bg-zinc-900/80 backdrop-blur-xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-400 mx-auto mb-4">
            <AlertCircle className="w-6 h-6 text-amber-400" />
          </div>
          <Badge variant="default" className="mb-2">Connection Notice</Badge>
          <h2 className="text-xl font-black text-white">Workspace Access Verification</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            {errorMessage || 'Unable to complete workspace authorization. Please verify your connection or try signing in again.'}
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 font-bold"
              onClick={() => checkAccess()}
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Verification
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              onClick={() => {
                const currentHref = typeof window !== 'undefined' ? window.location.href : '/ralion/dashboard';
                window.location.href = getCanonicalLoginUrl(currentHref);
              }}
            >
              <LogIn className="w-4 h-4 mr-2" /> Go to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Authenticated: Render Ralion Workspace
  return <>{children}</>;
};
