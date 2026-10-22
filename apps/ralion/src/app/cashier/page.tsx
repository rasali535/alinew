'use client';

import React, { useEffect, useState } from 'react';
import { ProductAccessGuard } from '@/components/ProductAccessGuard';
import { authFetch } from '@/lib/api-config';
import RetailPOSPage from '../(dashboard)/retail/pos/page';

type AccessState = 'loading' | 'allowed' | 'denied';

function CashierTerminal() {
  const [state, setState] = useState<AccessState>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await authFetch('/api/retail/entitlement', { cache: 'no-store' });
        const data = await response.json();
        if (!active) return;
        if (response.ok && data.isEntitled === true && data.status === 'ACTIVE' && data.canAccessPOS === true) {
          setState('allowed');
        } else {
          setMessage(data.reason || data.message || 'Your account does not have access to the Retail cashier terminal.');
          setState('denied');
        }
      } catch {
        if (active) {
          setMessage('Could not verify cashier access. Check your connection and sign in again.');
          setState('denied');
        }
      }
    };
    void check();
    return () => { active = false; };
  }, []);

  if (state === 'loading') {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-300">Verifying cashier access…</div>;
  }
  if (state === 'denied') {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
      <div role="alert" className="max-w-md rounded-xl border border-red-500/30 bg-zinc-900 p-6 text-white">
        <h1 className="text-xl font-semibold">Cashier access unavailable</h1>
        <p className="text-sm text-zinc-300 mt-3">{message}</p>
        <button type="button" className="mt-5 rounded-lg bg-zinc-700 px-4 py-2" onClick={() => window.location.reload()}>Retry</button>
      </div>
    </div>;
  }

  // The POS itself uses the existing authenticated sales and shift APIs,
  // which must continue enforcing Retail permissions on every request.
  return <RetailPOSPage />;
}

export default function CashierPage() {
  return <ProductAccessGuard><CashierTerminal /></ProductAccessGuard>;
}
