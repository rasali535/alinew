'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Calendar, 
  Folder, 
  Zap, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  ShoppingBag, 
  Settings, 
  ChevronRight,
  ChevronDown,
  Building2,
  BarChart2,
  ArrowLeft,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Share2
} from 'lucide-react';
import { cn } from './utils';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  badgeVariant?: 'primary' | 'secondary' | 'purple' | 'warning' | 'default';
  isIndustryPlugin?: boolean;
  isLocked?: boolean;
}

export interface SidebarBranding {
  brandName?: string;
  logoUrl?: string;
  accentColor?: string;
}

export interface SidebarProps {
  currentPath?: string;
  tier?: string;
  orgName?: string;
  userName?: string;
  isPlatformAdmin?: boolean;
  hasRetailEntitlement?: boolean;
  hasTradeEntitlement?: boolean;
  entitledModules?: string[];
  platformUrl?: string;
  isCollapsed?: boolean;
  branding?: SidebarBranding;
  onToggleCollapse?: () => void;
  onNavigate?: (href: string) => void;
  onOpenMariAI?: () => void;
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath = '/ralion/dashboard',
  tier = 'COMMUNITY',
  orgName = 'Organization Workspace',
  userName,
  isPlatformAdmin = false,
  hasRetailEntitlement = false,
  hasTradeEntitlement = false,
  entitledModules = [],
  platformUrl = 'https://portal.rasalilabs.com',
  isCollapsed = false,
  branding,
  onToggleCollapse,
  onNavigate = (href) => { window.location.href = href; },
  onOpenMariAI,
  onLogout,
}) => {
  const userTier = (tier || 'COMMUNITY').toUpperCase();
  const displayName = userName || orgName || 'Workspace Member';
  const displayInitials = (displayName.split(' ').map((s) => s[0]).join('') || 'WS').substring(0, 2).toUpperCase();

  // Collapsible section states
  const [isOperationsOpen, setIsOperationsOpen] = useState(true);

  // Normalizes path matching for active state
  const isItemActive = (itemHref: string, itemId: string) => {
    const cleanCurrent = currentPath.split('?')[0].replace(/\/+$/, '');
    const cleanItem = itemHref.split('?')[0].replace(/\/+$/, '');
    
    if (cleanCurrent === cleanItem) return true;
    if (cleanCurrent === cleanItem.replace('/ralion', '')) return true;
    if (cleanItem !== '/ralion/dashboard' && cleanItem !== '/dashboard' && cleanCurrent.startsWith(cleanItem)) return true;
    if (itemId && cleanCurrent.includes(`/${itemId}`)) return true;
    
    return false;
  };

  // 1. MAIN WORKSPACE
  const mainWorkspaceNav: SidebarItem[] = [
    { id: 'dashboard', label: 'Overview', href: '/ralion/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'mari-ai', label: 'Mari AI', href: '/ralion/mari-ai', icon: <Sparkles className="w-4 h-4 text-purple-400" /> },
    { id: 'crm', label: 'Customers & CRM', href: '/ralion/crm', icon: <Users className="w-4 h-4 text-blue-400" /> },
    { id: 'growth', label: 'Growth', href: '/ralion/growth', icon: <TrendingUp className="w-4 h-4 text-indigo-400" /> },
    { id: 'social', label: 'Social', href: '/ralion/growth?tab=ACCOUNTS', icon: <Share2 className="w-4 h-4 text-cyan-400" /> },
  ];

  // 2. BUSINESS MODULES (Show only modules organization is entitled to access)
  const isRetailActive = Boolean(hasRetailEntitlement || (isPlatformAdmin && currentPath?.includes('/retail')) || entitledModules.includes('retail'));
  const isTradeActive = Boolean(hasTradeEntitlement || (isPlatformAdmin && currentPath?.includes('/trade')) || entitledModules.includes('trade'));

  const businessModulesNav: SidebarItem[] = [];
  if (isRetailActive) {
    businessModulesNav.push({
      id: 'retail',
      label: 'Retail',
      href: '/ralion/retail',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-400" />,
      badge: 'Pilot',
      badgeVariant: 'primary',
      isIndustryPlugin: true
    });
  }
  if (isTradeActive) {
    businessModulesNav.push({
      id: 'trade',
      label: 'Trade',
      href: '/ralion/industry/trade',
      icon: <Building2 className="w-4 h-4 text-amber-400" />,
      badge: 'Pilot',
      badgeVariant: 'secondary',
      isIndustryPlugin: true
    });
  }

  // 3. WORKSPACE OPERATIONS (Contextual tools preserving 100% existing functionality)
  const operationsNav: SidebarItem[] = [
    { id: 'workflows', label: 'Workflows', href: '/ralion/workflows', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { id: 'calendar', label: 'Calendar', href: '/ralion/calendar', icon: <Calendar className="w-4 h-4 text-cyan-400" /> },
    { id: 'tasks', label: 'Tasks', href: '/ralion/tasks', icon: <CheckSquare className="w-4 h-4 text-emerald-400" /> },
    { id: 'documents', label: 'Documents', href: '/ralion/documents', icon: <Folder className="w-4 h-4 text-zinc-300" /> },
    { id: 'reports', label: 'Reports & BI', href: '/ralion/reports', icon: <BarChart2 className="w-4 h-4 text-indigo-400" /> },
  ];

  // 4. ACCOUNT & SETTINGS
  const accountNav: SidebarItem[] = [
    { id: 'settings', label: 'Settings & Integrations', href: '/ralion/settings', icon: <Settings className="w-4 h-4 text-zinc-300" /> },
    { id: 'billing', label: 'Billing & Plan', href: '/ralion/billing', icon: <CreditCard className="w-4 h-4 text-amber-400" /> },
  ];

  const brandName = branding?.brandName || 'Ralion OS';
  const logoUrl = branding?.logoUrl || '/logo.png';
  const adminCommandCentreUrl = '/ralion/admin';

  const renderNavSection = (items: SidebarItem[]) => {
    return items.map((item) => {
      const active = isItemActive(item.href, item.id);
      return (
        <button
          key={item.id}
          onClick={() => onNavigate(item.href)}
          title={isCollapsed ? item.label : undefined}
          className={cn(
            "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 group relative",
            active
              ? "bg-zinc-900 text-white font-semibold border-l-2 border-indigo-500 pl-2 shadow-sm"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60 font-normal"
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={cn(
              "shrink-0 transition-colors",
              active ? "text-indigo-400" : "text-zinc-400 group-hover:text-zinc-200"
            )}>
              {item.icon}
            </span>
            {!isCollapsed && (
              <span className="truncate text-left">
                {item.label}
              </span>
            )}
          </div>
          {!isCollapsed && item.badge && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0",
              item.badgeVariant === 'purple' ? "bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10" :
              item.badgeVariant === 'primary' ? "bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10" :
              item.badgeVariant === 'secondary' ? "bg-amber-950/60 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10" :
              "bg-zinc-800 text-zinc-300 border border-zinc-700/60"
            )}>
              {item.badge}
            </span>
          )}
        </button>
      );
    });
  };

  return (
    <aside
      className={cn(
        "bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 select-none transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-black/80 border border-zinc-800 shrink-0 shadow-sm">
            <img src={logoUrl} alt={brandName} className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-white tracking-tight leading-none truncate">{brandName}</span>
              <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5 truncate">{orgName}</span>
            </div>
          )}
        </div>
        
        {onToggleCollapse && !isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
        {onToggleCollapse && isCollapsed && (
          <button
            onClick={onToggleCollapse}
            title="Expand sidebar"
            className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors mx-auto"
          >
            <PanelLeftOpen className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Exit / Admin Action Bar */}
      {!isCollapsed && (
        <div className="px-3 pt-2.5 space-y-1.5">
          {/* Admin Command Center Quick Access: ONLY FOR VERIFIED PLATFORM ADMINS */}
          {(isPlatformAdmin || userTier === 'PLATFORM_ADMIN') && (
            <button
              onClick={() => {
                if (onNavigate) {
                  onNavigate('/ralion/admin');
                } else if (typeof window !== 'undefined') {
                  window.location.href = adminCommandCentreUrl;
                }
              }}
              title="Open Ras Ali Labs Admin Command Centre"
              className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-600/20 border border-amber-500/40 text-xs font-bold text-amber-300 hover:text-amber-100 hover:border-amber-400 hover:bg-amber-500/30 transition-all shadow-md shadow-amber-500/10 cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm group-hover:scale-110 transition-transform">👑</span>
                <span>Admin Command Centre</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200 border border-amber-400/40 font-mono">INTERNAL</span>
            </button>
          )}

          <button
            onClick={() => { window.location.href = platformUrl || '/'; }}
            title="Exit Ralion OS"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/60 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900 transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-3 h-3 text-zinc-400 group-hover:-translate-x-0.5 transition-transform" />
              <span>Exit Platform</span>
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">Exit</span>
          </button>
        </div>
      )}

      {/* Collapsed Admin Icon Trigger (Platform Admins Only) */}
      {isCollapsed && (isPlatformAdmin || userTier === 'PLATFORM_ADMIN') && (
        <div className="px-2 pt-2">
          <button
            onClick={() => {
              if (onNavigate) {
                onNavigate('/ralion/admin');
              } else if (typeof window !== 'undefined') {
                window.location.href = adminCommandCentreUrl;
              }
            }}
            title="Ras Ali Labs Admin Command Centre"
            className="w-full flex items-center justify-center p-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all shadow-md"
          >
            <span className="text-sm">👑</span>
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* 1. MAIN WORKSPACE */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Main Workspace
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavSection(mainWorkspaceNav)}
          </div>
        </div>

        {/* 2. BUSINESS MODULES (Rendered strictly when entitled) */}
        {businessModulesNav.length > 0 && (
          <div>
            {!isCollapsed && (
              <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 flex items-center justify-between">
                <span>Business Modules</span>
                <span className="text-[9px] font-mono text-zinc-600 font-normal">{businessModulesNav.length} Active</span>
              </div>
            )}
            <div className="space-y-0.5">
              {renderNavSection(businessModulesNav)}
            </div>
          </div>
        )}

        {/* 3. WORKSPACE OPERATIONS (Collapsible) */}
        <div>
          {!isCollapsed ? (
            <div>
              <button
                onClick={() => setIsOperationsOpen(prev => !prev)}
                className="w-full px-2 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span>Operations</span>
                {isOperationsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isOperationsOpen && (
                <div className="space-y-0.5">
                  {renderNavSection(operationsNav)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderNavSection(operationsNav.slice(0, 3))}
            </div>
          )}
        </div>

        {/* 4. ACCOUNT & SETTINGS */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Account & Settings
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavSection(accountNav)}
          </div>
        </div>
      </div>

      {/* Mari AI Drawer Trigger */}
      <div className="p-2 border-t border-zinc-800/80 bg-zinc-950">
        <button
          onClick={onOpenMariAI}
          title={isCollapsed ? "Open Mari AI Assistant" : undefined}
          className={cn(
            "w-full flex items-center rounded-lg bg-zinc-900 border border-indigo-500/30 text-white font-medium text-xs hover:border-indigo-500/60 hover:bg-zinc-850 transition-all group",
            isCollapsed ? "justify-center p-2" : "justify-between px-2.5 py-2"
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white shrink-0">
              <Sparkles className="w-3 h-3" />
            </div>
            {!isCollapsed && (
              <div className="flex flex-col text-left">
                <span className="font-semibold text-xs leading-none">Mari AI</span>
                <span className="text-[9px] text-zinc-400 mt-0.5">Business Intelligence Agent</span>
              </div>
            )}
          </div>
          {!isCollapsed && (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>

      {/* User Profile & Sign Out Footer */}
      {!isCollapsed ? (
        <div className="p-2.5 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950 text-zinc-400">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-indigo-900/60 border border-indigo-700/60 flex items-center justify-center text-indigo-200 font-bold text-[10px] shrink-0">
              {displayInitials}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-zinc-200 truncate">{displayName}</span>
              <span className="text-[9px] text-zinc-500 font-mono truncate">{userTier} Tier</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onNavigate('/ralion/settings')}
              title="Settings & Integrations"
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-zinc-800/80 flex flex-col items-center gap-1.5 bg-zinc-950">
          <button
            onClick={() => onNavigate('/ralion/settings')}
            title="Settings & Integrations"
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          {onLogout && (
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
