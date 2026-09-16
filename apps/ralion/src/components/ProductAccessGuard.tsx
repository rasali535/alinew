'use client';

import React from 'react';
import { useOrganization } from '@ralion/auth';
import { Button, Card, Badge } from '@ralion/ui';
import { ArrowRight, Building2, LogIn, RefreshCw, Shield } from 'lucide-react';

interface ProductAccessGuardProps {
  children: React.ReactNode;
}

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

  let targetHref = currentHref;
  if (!targetHref || targetHref.includes('onrender.com') || targetHref.endsWith('/login')) {
    targetHref = 'https://rasalilabs.com/ralion/dashboard';
  }
  return `https://rasalilabs.com/ralion/login?redirect=${encodeURIComponent(targetHref)}`;
}

function isLocalWorkspaceBypass(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    window.location.protocol === 'file:' ||
    process.env.NODE_ENV === 'development'
  );
}

export const ProductAccessGuard: React.FC<ProductAccessGuardProps> = ({ children }) => {
  const {
    user,
    organization,
    workspace,
    isLoading,
    isContextResolved,
    refreshOrganization,
  } = useOrganization();

  // OrganizationProvider already performs the canonical /api/auth/context lookup,
  // including token refresh coalescing and legacy workspace repair. Do not perform
  // a second Supabase session lookup or subscription query here.
  if (isLoading || !isContextResolved) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-purple-600 to-emerald-500 animate-spin flex items-center justify-center p-0.5">
          <div className="w-full h-full bg-zinc-950 rounded-[10px]" />
        </div>
        <div className="text-center">
          <div className="text-sm font-black tracking-wider text-white">RAS ALI LABS</div>
          <div className="text-xs text-zinc-400 mt-1">Opening your Ralion workspace...</div>
        </div>
      </div>
    );
  }

  // Preserve desktop/local development behavior without adding another network
  // round trip. Production access remains bound to canonical tenant context.
  if (isLocalWorkspaceBypass()) {
    return <>{children}</>;
  }

  if (user && organization && workspace) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
      <Card className="max-w-md w-full p-8 text-center border-blue-900/40 bg-zinc-900/60 backdrop-blur-xl shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <Badge variant="primary" className="mb-2">Workspace Access</Badge>
        <h2 className="text-xl font-black text-white">Sign In to Ralion</h2>
        <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
          Your canonical organization workspace could not be resolved. Retry once if your connection was interrupted, or sign in again.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Button
            variant="primary"
            size="sm"
            className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 font-bold"
            onClick={() => refreshOrganization()}
          >
            <RefreshCw className="w-4 h-4 mr-2" /> Retry Workspace
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
            <LogIn className="w-4 h-4 mr-2" /> Sign In <ArrowRight className="w-4 h-4 ml-1" />
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
};
