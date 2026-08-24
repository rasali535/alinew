'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { HeartPulse } from 'lucide-react';

export default function HealthcareOSPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Healthcare OS"
      category="Clinical & Practice Management"
      badgeText="Coming Soon • Early Access"
      description="HIPAA/POPIA-compliant patient intake records, appointment booking calendars, confidential medical case notes, and Mari AI triage assistance."
      icon={<HeartPulse className="w-6 h-6 text-rose-400" />}
      industryKey="healthcare-os"
      upcomingFeatures={[
        'Confidential patient medical records and electronic intake forms',
        'Multi-practitioner appointment booking and room scheduling calendars',
        'Clinical triage notes with zero-retention AI transcription',
        'Prescription tracking, medical aid claim invoicing & dispensary ledger',
      ]}
      estimatedLaunch="Q3 Enterprise Private Beta"
    />
  );
}
