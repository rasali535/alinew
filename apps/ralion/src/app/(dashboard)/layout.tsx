'use client';

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Header } from '@ralion/ui';
import { MariAiDrawer } from '../../components/MariAiDrawer';
import { FloatingMariAi } from '../../components/FloatingMariAi';
import { ProductAccessGuard } from '../../components/ProductAccessGuard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMariDrawerOpen, setIsMariDrawerOpen] = useState(false);

  return (
    <ProductAccessGuard>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        {/* Universal Sidebar */}
        <Sidebar
          currentPath={pathname}
          orgName="Ras Ali Enterprises"
          onNavigate={(href) => {
            window.location.href = '/ralion' + href;
          }}
          onOpenMariAI={() => setIsMariDrawerOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            user={{
              name: 'Ras Ali Admin',
              role: 'ORGANIZATION_OWNER',
              email: 'admin@rasalilabs.com'
            }}
            orgName="Ras Ali Enterprises"
            activeBranch="Gaborone Main Branch"
            unreadNotifications={3}
            onOpenMariAI={() => setIsMariDrawerOpen(true)}
          />

          <main className="flex-1 overflow-y-auto p-6 bg-zinc-950/60">
            {children}
          </main>
        </div>

        {/* Slide-over Mari AI Drawer */}
        <MariAiDrawer
          isOpen={isMariDrawerOpen}
          onClose={() => setIsMariDrawerOpen(false)}
        />

        {/* Floating Mari AI Assistant Widget */}
        <FloatingMariAi />
      </div>
    </ProductAccessGuard>
  );
}
