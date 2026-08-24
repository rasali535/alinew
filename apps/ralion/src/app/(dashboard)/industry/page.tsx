'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Building2 } from 'lucide-react';

export default function IndustrySolutionsHubPage() {
  return (
    <EarlyAccessLockout
      title="Industry Solutions & Vertical Operating Systems"
      category="Industrial Solutions Hub"
      badgeText="Coming Soon • Early Access"
      description="Tailored vertical operating systems for Healthcare, Funeral Services, Logistics & Fleet, Trade & Retail, and Public Sector agencies. Staged enterprise rollout in progress."
      icon={<Building2 className="w-6 h-6 text-amber-400" />}
      industryKey="industry-solutions-hub"
      upcomingFeatures={[
        'Healthcare OS: Confidential clinical records, appointment calendars & AI medical triage',
        'Funeral Services OS: Vault capacity ledger, fleet dispatch & policy claim synchronization',
        'Logistics & Fleet OS: Driver route manifests, fuel telemetry & maintenance scheduling',
        'Trade & Retail OS: Barcode SKU multi-warehouse inventory & POS checkout',
        'Government Edition: Sovereign citizen case workflows & air-gapped compliance trails',
      ]}
      estimatedLaunch="Q3 / Q4 2026 Enterprise Staged Rollout"
    />
  );
}
