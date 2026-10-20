'use client';

import React, { useEffect } from 'react';

export default function AdminClientsRedirect() {
  useEffect(() => {
    // If inside Next.js context and pathname matches /admin/clients,
    // ensure user reaches the canonical corporate website clients management SPA.
    if (typeof window !== 'undefined') {
      window.location.replace('/admin/clients');
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
          🏢
        </div>
        <h2 className="text-lg font-bold text-white">Opening Corporate Clients Portfolio...</h2>
        <p className="text-xs text-zinc-400">
          Redirecting to the verified Ras Ali Labs client portfolio manager.
        </p>
        <div className="pt-2">
          <a
            href="/admin/clients"
            className="inline-block px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition"
          >
            Open Clients Manager
          </a>
        </div>
      </div>
    </div>
  );
}
