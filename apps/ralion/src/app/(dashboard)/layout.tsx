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
  const [currentUser, setCurrentUser] = useState<{
    fullName: string | null;
    email: string | null;
  } | null>(null);

  React.useEffect(() => {
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user) setCurrentUser(user);
      });
    });
  }, []);

  return (
    <ProductAccessGuard>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        {/* Universal Sidebar */}
        <Sidebar
          currentPath={pathname}
          orgName="Ras Ali Enterprises"
          onNavigate={(href) => {
            // Sidebar hrefs are absolute like '/ralion/dashboard'
            // Since next.config.js has basePath: '/ralion', we strip the prefix for Next.js router
            const route = href.startsWith('/ralion') ? href.replace('/ralion', '') : href;
            router.push(route || '/');
          }}
          onOpenMariAI={() => setIsMariDrawerOpen(true)}
        />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            user={{
              name: currentUser?.fullName || 'User',
              role: 'ORGANIZATION_OWNER',
              email: currentUser?.email || 'user@example.com'
            }}
            orgName="Ras Ali Enterprises"
            activeBranch="Gaborone Main Branch"
            unreadNotifications={0}
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
