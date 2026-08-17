'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Button, Badge } from '@ralion/ui';
import { Lock, Sparkles, ShieldCheck, ArrowRight, Zap, TrendingUp, Layers } from 'lucide-react';
import { AuthService, UserProfile } from '@/lib/services/auth.service';

interface TierAccessGateProps {
  requiredTier: 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export const TierAccessGate: React.FC<TierAccessGateProps> = ({
  requiredTier,
  featureName,
  description,
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AuthService.getCurrentUser().then((user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        const localTier = typeof window !== 'undefined' ? localStorage.getItem('ralion_user_tier') : null;
        if (localTier) {
          setCurrentUser({
            id: 'local',
            fullName: 'User',
            avatarUrl: null,
            email: null,
            tier: localTier,
          });
        }
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isDevOrLocal = process.env.NODE_ENV === 'development' || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || (window as any).__RALION_DESKTOP__));
  const userTier = (currentUser?.tier || (typeof window !== 'undefined' ? localStorage.getItem('ralion_user_tier') : null) || (isDevOrLocal ? 'ENTERPRISE' : 'COMMUNITY')).toUpperCase();

  // Tier Hierarchy: ENTERPRISE > PROFESSIONAL > STANDARD > COMMUNITY
  const isAllowed =
    userTier === 'ENTERPRISE' ||
    (userTier === 'PROFESSIONAL' && (requiredTier === 'PROFESSIONAL' || requiredTier === 'STANDARD')) ||
    (userTier === 'STANDARD' && requiredTier === 'STANDARD');

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-6 max-w-2xl mx-auto text-center animate-fadeIn">
      <Card className="w-full p-8 bg-zinc-900/90 border-zinc-800 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-600/20 via-blue-600/20 to-purple-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto mb-5 shadow-lg shadow-blue-500/10">
          <Lock className="w-7 h-7" />
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          {requiredTier} Plan Required
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-2">
          Unlock {featureName}
        </h2>

        <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed mb-6">
          {description ||
            `You are currently on the ${userTier} plan. Upgrade to ${requiredTier} to unlock ${featureName}, live automation, and advanced operational modules.`}
        </p>

        {/* Feature Comparison Box */}
        <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-left mb-6 space-y-2.5">
          <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
            Included in {requiredTier}:
          </div>
          {requiredTier === 'STANDARD' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>5 AI Social Posts/Reels per day</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>3 Visual Automated Workflows</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>10,000 Mari AI Executions / mo</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>$1/day, $5/week, or $19/month</span>
              </div>
            </div>
          ) : requiredTier === 'PROFESSIONAL' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Unlimited Growth AI & Social Campaigns</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Unlimited Visual No-Code Workflows</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>50,000 Mari AI Executions / mo</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Advanced BI Reports & Exports</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>All Industry Plugins (Health, Logistics, Trade, Funeral)</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Multi-Branch Enterprise SSO & SADC Corridors</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <span>Unlimited Mari AI & Dedicated SLA</span>
              </div>
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Sovereign Government Cloud Deployment</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {userTier === 'COMMUNITY' && (
            <Link href="/billing?tier=standard" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="sm"
                className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                Get Standard ($1/day) <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}

          <Link href={`/billing?tier=${requiredTier.toLowerCase()}`} className="w-full sm:w-auto">
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto py-2.5 px-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              Upgrade to {requiredTier} <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>

          <Link href="/dashboard" className="w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto py-2.5 px-4 text-xs font-semibold border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
            >
              Dashboard
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
};
