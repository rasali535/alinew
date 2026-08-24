'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Layers } from 'lucide-react';

export default function GovernmentEditionPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Government Edition"
      category="Public Sector & Citizen Workflows"
      badgeText="Coming Soon • Early Access"
      description="Citizen request workflows, multi-ministry case routing, immutable tamper-evident audit logs, and sovereign cloud infrastructure compliance."
      icon={<Layers className="w-6 h-6 text-blue-400" />}
      industryKey="government-edition"
      upcomingFeatures={[
        'Digital citizen self-service intake portal and permit workflows',
        'Cross-departmental case routing with SLA escalation timers',
        'Immutable cryptographic audit logging for sovereign compliance',
        'Air-gapped and sovereign local cloud deployment support',
      ]}
      estimatedLaunch="Q4 / Government Staged Rollout"
    />
  );
}
