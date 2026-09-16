'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Header } from '@ralion/ui';
import { useOrganization } from '@ralion/auth';
import { ProductAccessGuard } from '../../components/ProductAccessGuard';

const MariAiDrawer = dynamic(
  () => import('../../components/MariAiDrawer').then((mod) => mod.MariAiDrawer),
  { ssr: false }
);

const FloatingMariAi = dynamic(
  () => import('../../components/FloatingMariAi').then((mod) => mod.FloatingMariAi),
  { ssr: false }
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, activeBranch } = useOrganization();
  const [isMariDrawerOpen, setIsMariDrawerOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN' || user?.email === 'ali@rasalilabs.com';
  const organizationName =
    organization?.name ||
    (user?.displayName
      ? `${user.displayName}'s Workspace`
      : user?.email
        ? `${user.email.split('@')[0]}'s Workspace`
        : 'Ralion Workspace');
  const branchName = activeBranch?.name || 'Main HQ Branch';
  const displayTier = isPlatformAdmin ? 'PLATFORM_ADMIN' : (organization?.licenseTier || 'COMMUNITY');

  const handleNavigate = (href: string) => {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    if (isDesktop) {
      window.location.href = href;
    } else {
      const route = href.startsWith('/ralion') ? href.replace('/ralion', '') : href;
      router.push(route || '/');
    }
  };

  const handleLogout = async () => {
    const { AuthService } = await import('@/lib/services/auth.service');
    await AuthService.logout();
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
            onLogout={handleLogout}
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
                onLogout={handleLogout}
              />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header
            user={{
              name: user?.displayName || 'User',
              role: isPlatformAdmin ? 'PLATFORM_ADMIN' : (user?.role || 'ORGANIZATION_OWNER'),
              email: user?.email || 'user@example.com'
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
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
            {children}
          </main>
        </div>

        {isMariDrawerOpen && (
          <MariAiDrawer
            isOpen={isMariDrawerOpen}
            onClose={() => setIsMariDrawerOpen(false)}
          />
        )}

        <FloatingMariAi />
      </div>
    </ProductAccessGuard>
  );
}
