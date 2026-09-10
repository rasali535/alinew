'use client';

import React, { useState, useEffect } from 'react';
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
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [currentUser, setCurrentUser] = useState<{
    fullName: string | null;
    email: string | null;
    orgName?: string | null;
    branchName?: string | null;
    tier?: string | null;
  } | null>(null);

  useEffect(() => {
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user) setCurrentUser(user);
      });
    });
  }, []);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const isPlatformAdmin = (currentUser as any)?.isPlatformAdmin || (currentUser as any)?.role === 'PLATFORM_ADMIN' || currentUser?.email === 'ali@rasalilabs.com';
  const organizationName = currentUser?.orgName || (currentUser?.fullName ? `${currentUser.fullName}'s Workspace` : (currentUser?.email ? `${currentUser.email.split('@')[0]}'s Workspace` : 'Ralion Workspace'));
  const branchName = currentUser?.branchName || 'Main HQ Branch';
  const displayTier = isPlatformAdmin ? 'PLATFORM_ADMIN' : (currentUser?.tier || 'COMMUNITY');

  const handleNavigate = (href: string) => {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    if (isDesktop) {
      window.location.href = href;
    } else {
      const route = href.startsWith('/ralion') ? href.replace('/ralion', '') : href;
      router.push(route || '/');
    }
  };

  return (
    <ProductAccessGuard>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
        <div className="hidden md:flex shrink-0">
          <Sidebar
            currentPath={pathname}
            orgName={organizationName}
            tier={displayTier}
            isPlatformAdmin={isPlatformAdmin}
            platformUrl={process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com'}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            onNavigate={handleNavigate}
            onOpenMariAI={() => setIsMariDrawerOpen(true)}
            onLogout={async () => {
              const { AuthService } = await import('@/lib/services/auth.service');
              await AuthService.logout();
            }}
          />
        </div>

        {isMobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
            <div className="relative z-50 flex flex-col w-64 max-w-[85vw] h-full bg-zinc-950 border-r border-zinc-800 shadow-2xl">
              <Sidebar
                currentPath={pathname}
                orgName={organizationName}
                tier={displayTier}
                isPlatformAdmin={isPlatformAdmin}
                platformUrl={process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com'}
                isCollapsed={false}
                onNavigate={handleNavigate}
                onOpenMariAI={() => {
                  setIsMobileSidebarOpen(false);
                  setIsMariDrawerOpen(true);
                }}
                onLogout={async () => {
                  const { AuthService } = await import('@/lib/services/auth.service');
                  await AuthService.logout();
                }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            user={{
              name: currentUser?.fullName || 'User',
              role: isPlatformAdmin ? 'PLATFORM_ADMIN' : currentUser?.tier === 'ENTERPRISE' ? 'ENTERPRISE_ADMIN' : currentUser?.tier === 'STANDARD' ? 'STANDARD_USER' : currentUser?.tier === 'PROFESSIONAL' ? 'PRO_OPERATOR' : 'ORGANIZATION_OWNER',
              email: currentUser?.email || 'user@example.com'
            }}
            orgName={organizationName}
            isAdmin={isPlatformAdmin}
            activeBranch={branchName}
            unreadNotifications={0}
            exitUrl={process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com'}
            onExit={() => {
              const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';
              window.location.href = platformUrl;
            }}
            onOpenAdmin={() => {
              handleNavigate('/ralion/admin');
            }}
            onOpenMariAI={() => setIsMariDrawerOpen(true)}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
            onLogout={async () => {
              const { AuthService } = await import('@/lib/services/auth.service');
              await AuthService.logout();
            }}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
            {children}
          </main>
        </div>

        <MariAiDrawer
          isOpen={isMariDrawerOpen}
          onClose={() => setIsMariDrawerOpen(false)}
        />

        <FloatingMariAi />
      </div>
    </ProductAccessGuard>
  );
}
