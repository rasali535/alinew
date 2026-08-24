'use client';

import React from 'react';
import { EarlyAccessLockout } from '@/components/EarlyAccessLockout';
import { ShoppingBag } from 'lucide-react';

export default function TradeRetailOSPage() {
  return (
    <EarlyAccessLockout
      title="Ralion Trade & Retail OS"
      category="Multi-Location Inventory & POS"
      badgeText="Coming Soon • Early Access"
      description="Multi-warehouse barcode inventory, supplier purchase order matching, margin analytics, POS retail checkout, and wholesale distribution."
      icon={<ShoppingBag className="w-6 h-6 text-emerald-400" />}
      industryKey="trade-retail-os"
      upcomingFeatures={[
        'Barcode / SKU catalog with live cross-branch stock levels',
        'Supplier purchase orders, automated replenishment & goods received notes',
        'Retail POS terminal checkout with receipt printing & barcode scanning',
        'B2B wholesale pricing tiers, volume discounts & credit account ledgers',
      ]}
      estimatedLaunch="Q4 Enterprise Private Beta"
    />
  );
}
