'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Shield } from 'lucide-react';

export default function FuneralServicesOSPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Funeral Services OS"
      category="Bereavement & Mortuary Operations"
      badgeText="Coming Soon • Early Access"
      description="End-to-end case intake management, cold storage mortuary vault tracking, family policy claims ledger, vehicle dispatch, and memorial documentation."
      icon={<Shield className="w-6 h-6 text-purple-400" />}
      industryKey="funeral-services-os"
      upcomingFeatures={[
        'Deceased registry and dignified case management workflow',
        'Mortuary vault bay allocation, temperature logs & custody verification',
        'Hearse fleet dispatch, route scheduling & driver manifests',
        'Funeral policy premium payment reconciliation and death claim payouts',
      ]}
      estimatedLaunch="Q3 Enterprise Private Beta"
    />
  );
}
