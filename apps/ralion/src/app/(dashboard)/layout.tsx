'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar, Header } from '@ralion/ui';
import { useOrganization } from '@ralion/auth';
import { ProductAccessGuard } from '../../components/ProductAccessGuard';
import { DesktopWorkspaceHome } from '../../components/DesktopWorkspaceHome';
import { MariConversationProvider, useMariConversation } from '@/context/MariConversationContext';
import { isRetailPosRoute } from '@/lib/retail/posRoute';
import { authFetch } from '@/lib/api-config';

const MariAiDrawer = dynamic(
  () => import('../../components/MariAiDrawer').then((mod) => mod.MariAiDrawer),
  { ssr: false }
);

const FloatingMariAi = dynamic(
  () => import('../../components/FloatingMariAi').then((mod) => mod.FloatingMariAi),
  { ssr: false }
);

const MariVoiceControl = dynamic(
  () => import('../../components/MariVoiceControl').then((mod) => mod.MariVoiceControl),
  { ssr: false }
);

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, workspace, activeBranch } = useOrganization();
  const { isDrawerOpen, openDrawer, closeDrawer, addVoiceTranscript, messages } = useMariConversation();

  const isPos = isRetailPosRoute(pathname);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDesktopRuntime, setIsDesktopRuntime] = useState(false);
  const [mariVoiceSignal, setMariVoiceSignal] = useState(0);
  const [stableMariVoiceContext, setStableMariVoiceContext] = useState<{ organizationId: string; workspaceId: string } | null>(null);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const desktopApi = typeof window !== 'undefined' ? (window as any).ralionDesktop : undefined;
    const desktop = Boolean(desktopApi?.isDesktop || (window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:' || window.location.protocol === 'app:');
    setIsDesktopRuntime(desktop);

    const openMari = () => openDrawer();
    const openMariVoice = () => {
      setMariVoiceSignal(Date.now());
    };
    const handleKeyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        openMari();
      }
    };
    const handleOpenMariEvent = () => openMari();
    const handleMariNavigation = (event: Event) => {
      const route = String((event as CustomEvent<{ route?: string }>).detail?.route || '');
      const approvedRoutes = new Set([
        '/dashboard', '/crm', '/customers', '/leads', '/growth', '/creatives',
        '/calendar', '/tasks', '/documents', '/workflows', '/reports', '/billing',
        '/marketplace', '/settings', '/workspace', '/mari-ai',
      ]);
      if (!approvedRoutes.has(route)) return;

      // Keep Mari Voice alive by navigating inside the persistent dashboard
      // layout instead of forcing a full renderer reload on desktop.
      router.push(route);
    };

    window.addEventListener('keydown', handleKeyboard);
    window.addEventListener('ralion:open-mari', handleOpenMariEvent as EventListener);
    window.addEventListener('ralion:mari-navigate', handleMariNavigation as EventListener);
    window.addEventListener('ralion:mari-voice-toggle', openMariVoice as EventListener);
    const removeNativeListener = desktopApi?.onMariToggle?.(openMari);
    const removeNativeVoiceListener = desktopApi?.onMariVoiceToggle?.(openMariVoice);

    return () => {
      window.removeEventListener('keydown', handleKeyboard);
      window.removeEventListener('ralion:open-mari', handleOpenMariEvent as EventListener);
      window.removeEventListener('ralion:mari-navigate', handleMariNavigation as EventListener);
      window.removeEventListener('ralion:mari-voice-toggle', openMariVoice as EventListener);
      if (typeof removeNativeListener === 'function') removeNativeListener();
      if (typeof removeNativeVoiceListener === 'function') removeNativeVoiceListener();
    };
  }, [router, openDrawer]);

  useEffect(() => {
    if (!organization?.id || !workspace?.id) return;
    setStableMariVoiceContext({
      organizationId: organization.id,
      workspaceId: workspace.id,
    });
  }, [organization?.id, workspace?.id]);

  // A trial is workspace-scoped. Never reuse a successful result after switching tenants.
  const [dbRetailEntitled, setDbRetailEntitled] = useState<{
    organizationId: string;
    workspaceId: string;
    isEntitled: boolean;
  } | null>(null);

  useEffect(() => {
    const organizationId = organization?.id;
    const workspaceId = workspace?.id;
    let active = true;
    let latestRequest = 0;

    if (!organizationId || !workspaceId) {
      setDbRetailEntitled(null);
      return;
    }

    const verifyRetail = async () => {
      const request = ++latestRequest;
      try {
        // authFetch attaches the verified bearer JWT, Hostinger proxy token mirror and
        // authoritative workspace/organization hints. Plain fetch silently returned 401.
        const url = `/api/retail/entitlement?workspaceId=${encodeURIComponent(workspaceId)}&organizationId=${encodeURIComponent(organizationId)}`;
        const res = await authFetch(url, { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (!active || request !== latestRequest) return;

        if (!res.ok) {
          console.warn('[RetailSidebar] Entitlement verification unavailable:', {
            status: res.status,
            code: typeof data?.code === 'string' ? data.code : 'API_ERROR',
          });
        }

        const isAdmin = user?.role === 'PLATFORM_ADMIN' || user?.email === 'ali@rasalilabs.com';
        if (res.ok && data?.isEntitled === true && data?.effectiveRole === 'CASHIER' && !isAdmin) {
          const target = typeof window !== 'undefined' && window.location.pathname.startsWith('/ralion')
            ? '/ralion/cashier'
            : '/cashier';
          router.replace(target);
          return;
        }

        setDbRetailEntitled({
          organizationId,
          workspaceId,
          isEntitled: Boolean(res.ok && data?.isEntitled === true && data?.status === 'ACTIVE'),
        });
      } catch (error) {
        if (!active || request !== latestRequest) return;
        console.warn('[RetailSidebar] Entitlement verification request failed.');
        setDbRetailEntitled({ organizationId, workspaceId, isEntitled: false });
      }
    };

    void verifyRetail();
    const onFocus = () => void verifyRetail();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void verifyRetail();
    };
    // Admin trial grants may occur while the customer is already logged in.
    // Recheck on return to the tab and periodically, without requiring logout.
    const onEntitlementUpdated = () => void verifyRetail();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('ralion:retail-entitlement-updated', onEntitlementUpdated);
    const refreshInterval = window.setInterval(() => void verifyRetail(), 60_000);

    return () => {
      active = false;
      ++latestRequest;
      window.clearInterval(refreshInterval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('ralion:retail-entitlement-updated', onEntitlementUpdated);
    };
  }, [workspace?.id, organization?.id]);

  const isPlatformAdmin = user?.role === 'PLATFORM_ADMIN' || user?.email === 'ali@rasalilabs.com';
  const enabledModules: string[] = Array.isArray(organization?.enabledModules)
    ? organization.enabledModules
    : ((organization as any)?.settings?.modules || []);
  const hasRetailEntitlement = Boolean(
    isPlatformAdmin ||
    (dbRetailEntitled !== null &&
      dbRetailEntitled.organizationId === organization?.id &&
      dbRetailEntitled.workspaceId === workspace?.id &&
      dbRetailEntitled.isEntitled)
  );
  const hasTradeEntitlement = isPlatformAdmin || enabledModules.includes('trade');
  const orgBranding = organization?.branding ? {
    brandName: organization.name,
    logoUrl: organization.branding.logoUrl,
    accentColor: organization.branding.accentColor,
  } : undefined;
  const organizationName =
    organization?.name ||
    (user?.displayName
      ? `${user.displayName}'s Workspace`
      : user?.email
        ? `${user.email.split('@')[0]}'s Workspace`
        : 'Ralion Workspace');
  const branchName = activeBranch?.name || 'Main HQ Branch';
  const displayTier = isPlatformAdmin ? 'PLATFORM_ADMIN' : (organization?.licenseTier || 'COMMUNITY');
  const isDashboardHome = pathname === '/dashboard' || pathname === '/ralion/dashboard';

  const handleNavigate = (href: string) => {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || (window as any).ralionDesktop?.isDesktop || window.location.protocol === 'file:' || window.location.protocol === 'app:');
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
      <div className="flex h-full min-h-0 bg-zinc-950 text-zinc-100 overflow-hidden">
        <div className="hidden md:flex shrink-0">
          <Sidebar
            currentPath={pathname}
            orgName={organizationName}
            tier={displayTier}
            isPlatformAdmin={isPlatformAdmin}
            hasRetailEntitlement={hasRetailEntitlement}
            hasTradeEntitlement={hasTradeEntitlement}
            entitledModules={enabledModules}
            branding={orgBranding}
            platformUrl={process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com'}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
            onNavigate={handleNavigate}
            onOpenMariAI={() => openDrawer()}
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
                hasRetailEntitlement={hasRetailEntitlement}
                hasTradeEntitlement={hasTradeEntitlement}
                entitledModules={enabledModules}
                branding={orgBranding}
                platformUrl={process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com'}
                isCollapsed={false}
                onNavigate={handleNavigate}
                onOpenMariAI={() => {
                  setIsMobileSidebarOpen(false);
                  openDrawer();
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
              if (isDesktopRuntime && (window as any).ralionDesktop?.openExternal) {
                void (window as any).ralionDesktop.openExternal(platformUrl);
                return;
              }
              window.location.href = platformUrl;
            }}
            onOpenAdmin={() => {
              handleNavigate('/ralion/admin');
            }}
            onOpenMariAI={() => openDrawer()}
            onToggleMobileSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 bg-zinc-950">
            {isDesktopRuntime && isDashboardHome && (
              <DesktopWorkspaceHome
                organizationName={organizationName}
                onNavigate={handleNavigate}
                onOpenMari={() => openDrawer()}
              />
            )}
            {children}
          </main>
        </div>

        {isDrawerOpen && (
          <MariAiDrawer
            isOpen={isDrawerOpen}
            onClose={() => closeDrawer()}
            onNavigate={handleNavigate}
          />
        )}

        {/*
          Voice Control remains permanently mounted in the same virtual DOM branch
          to preserve the WebRTC session, microphone permissions, and ongoing audio
          across route transitions. When entering Retail POS, its CSS coordinates
          shift seamlessly to the top header area so it never obstructs Cash, Card,
          or Transfer checkout controls.
        */}
        {stableMariVoiceContext && (
          <div
            className={
              isPos
                ? 'fixed top-2 right-24 sm:right-28 z-40 rounded-xl border border-purple-500/30 bg-zinc-950/95 p-1 shadow-2xl backdrop-blur transition-all duration-300 scale-90 sm:scale-95'
                : 'fixed bottom-20 right-5 z-40 rounded-xl border border-purple-500/30 bg-zinc-950/95 p-1.5 shadow-2xl backdrop-blur transition-all duration-300'
            }
          >
            <MariVoiceControl
              organizationId={stableMariVoiceContext.organizationId}
              workspaceId={stableMariVoiceContext.workspaceId}
              activationSignal={mariVoiceSignal}
              currentRoute={pathname || '/dashboard'}
              recentConversation={messages.slice(-12).map((m) => ({ sender: m.sender, text: m.text }))}
              onUserTranscript={(transcript) => {
                addVoiceTranscript('USER', transcript);
                window.dispatchEvent(new CustomEvent('ralion:mari-voice-user-transcript', { detail: { transcript } }));
              }}
              onMariTranscript={(transcript) => {
                addVoiceTranscript('MARI', transcript);
                window.dispatchEvent(new CustomEvent('ralion:mari-voice-mari-transcript', { detail: { transcript } }));
              }}
            />
          </div>
        )}

        {/*
          Floating Mari AI launcher follows the user throughout Ralion OS (Dashboard,
          CRM, Growth, Social, Inventory, Quotations, Reports), but is suppressed
          on Retail POS routes to guarantee 100% unobstructed payment controls.
        */}
        {!isPos && <FloatingMariAi />}
      </div>
    </ProductAccessGuard>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MariConversationProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </MariConversationProvider>
  );
}
