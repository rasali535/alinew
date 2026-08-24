'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Sparkles } from 'lucide-react';

export default function DemosPage() {
  return (
    <EarlyAccessLockout
      title="Industry Showcase & Sandbox Environments"
      category="Interactive Showcase Demos"
      badgeText="Coming Soon • Early Access"
      description="Pre-populated industry case study showcases for Healthcare, Funeral Services, Logistics, and Retail. Join early access to get dedicated sandbox access."
      icon={<Sparkles className="w-6 h-6 text-purple-400" />}
      industryKey="industry-demos"
      upcomingFeatures={[
        'Interactive sandbox with simulated patients, cases and inventory',
        'Pre-configured business intelligence dashboards for enterprise trials',
        'Demonstration data generators for sales and operational testing',
      ]}
      estimatedLaunch="Q3 / Q4 2026 Staged Rollout"
    />
  );
}
