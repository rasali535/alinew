'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Globe2 } from 'lucide-react';

export default function DeveloperLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const widgetActive = pathname.includes('/developer/widgets');

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-5">
        <nav className="inline-flex rounded-2xl border border-white/10 bg-white/[0.025] p-1" aria-label="Developer tools">
          <Link
            href="/developer"
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              !widgetActive ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" /> API Keys
          </Link>
          <Link
            href="/developer/widgets"
            className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              widgetActive ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Globe2 className="h-3.5 w-3.5" /> Website Widget
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
