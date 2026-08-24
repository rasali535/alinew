'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { Truck } from 'lucide-react';

export default function LogisticsOSPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Logistics & Fleet OS"
      category="Freight & Cross-Border Dispatch"
      badgeText="Coming Soon • Early Access"
      description="Commercial vehicle fleet telemetry, real-time driver dispatching, SADC trade corridor waybills, fuel monitoring, and preventative maintenance."
      icon={<Truck className="w-6 h-6 text-amber-400" />}
      industryKey="logistics-os"
      upcomingFeatures={[
        'Real-time GPS vehicle tracking and route optimization',
        'Digital consignment manifests, waybills & proof of delivery (POD)',
        'Fuel level telemetry, consumption anomaly alerts & card reconciliation',
        'Vehicle service schedules, COF renewal tracking & driver license alerts',
      ]}
      estimatedLaunch="Q4 Enterprise Private Beta"
    />
  );
}
