'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Code } from 'lucide-react';

export default function DeveloperPlatformPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Developer Platform & Open APIs"
      category="Developer Ecosystem & Webhooks"
      badgeText="Coming Soon • Early Access"
      description="REST & GraphQL endpoints, bi-directional event webhooks, OAuth 2.0 application keys, and custom plugin development SDKs."
      icon={<Code className="w-6 h-6 text-emerald-400" />}
      industryKey="developer-platform"
      upcomingFeatures={[
        'Comprehensive REST & GraphQL APIs with scoped token permissions',
        'Real-time webhook subscriptions for CRM, social and workflow events',
        'Developer sandbox environments with pre-loaded mock data',
        'Official TypeScript, Python, and Go client SDKs',
      ]}
      estimatedLaunch="Q4 Developer Platform Beta"
    />
  );
}
