'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Store } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <EarlyAccessLockout
      title="Ralion Ecosystem Marketplace"
      category="Ecosystem & Third-Party Extensions"
      badgeText="Coming Soon • Early Access"
      description="Community plugins, certified ERP connectors (Sage, Xero, SAP), specialized AI agents, and industry workflow templates."
      icon={<Store className="w-6 h-6 text-purple-400" />}
      industryKey="ecosystem-marketplace"
      upcomingFeatures={[
        '1-click verified ERP & accounting integrations (Xero, Sage, QuickBooks)',
        'Domain-specific Mari AI agent skills and autonomous automations',
        'Custom workflow and reporting template directory',
        'Third-party developer monetization and plugin licensing',
      ]}
      estimatedLaunch="Q4 Ecosystem Phase"
    />
  );
}
