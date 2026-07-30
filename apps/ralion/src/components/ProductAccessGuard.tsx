'use client';

import React, { useEffect, useState } from 'react';
import { AuthService } from '@/lib/services/auth.service';
import { ProductService, ProductAccessResult } from '@/lib/services/product.service';
import { Button, Card, Badge } from '@ralion/ui';
import { Lock, Sparkles, Shield, ArrowRight } from 'lucide-react';

interface ProductAccessGuardProps {
  children: React.ReactNode;
}

export const ProductAccessGuard: React.FC<ProductAccessGuardProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<ProductAccessResult | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const session = await AuthService.getSession();
      const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';

      if (!session) {
        if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
          window.location.href = '/ralion/login';
        } else {
          // Redirect to Ras Ali Labs platform login if no session exists
          window.location.href = `${platformUrl}/login?redirect=${encodeURIComponent(window.location.href)}`;
        }
        return;
      }

      // Verify product access for default or active org
      // Using a zero UUID instead of 'default-org' to prevent PostgREST 400 cast errors
      const result = await ProductService.verifyProductAccess('00000000-0000-0000-0000-000000000000');
      setAccess(result);
      setLoading(false);
    }

    checkAccess();
  }, []);

  if (loading) {
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

  if (access && !access.hasAccess) {
    const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 text-white">
        <Card className="max-w-md w-full p-8 text-center border-red-900/40 bg-zinc-900/60 backdrop-blur-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <Badge variant="danger" className="mb-2">Subscription Required</Badge>
          <h2 className="text-xl font-black text-white">Ralion is Not Activated</h2>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            Your Ras Ali Labs account does not have an active Ralion subscription or license key. Choose a plan to unlock your business operating system.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="primary"
              size="sm"
              className="w-full justify-center"
              onClick={() => window.location.href = `${platformUrl}/portal/subscription`}
            >
              Choose a Ralion Plan <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center"
              onClick={() => AuthService.logout()}
            >
              Return to Ras Ali Labs Platform
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
