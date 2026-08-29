'use client';

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck,
  CheckSquare, 
  Calendar, 
  Folder, 
  Zap, 
  CreditCard, 
  TrendingUp, 
  Sparkles, 
  HeartPulse, 
  Shield, 
  Truck, 
  ShoppingBag, 
  Settings, 
  ChevronRight,
  ChevronDown,
  Building2,
  BarChart2,
  Code,
  Globe,
  Store,
  ArrowLeft,
  Grid,
  Layers,
  Lock,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Briefcase
} from 'lucide-react';
import { cn } from './utils';
import { Badge } from './Badge';

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

export interface SidebarProps {
  currentPath?: string;
  tier?: string;
  orgName?: string;
  userName?: string;
  platformUrl?: string;
  isCollapsed?: boolean;
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
  platformUrl = 'https://portal.rasalilabs.com',
  isCollapsed = false,
  onToggleCollapse,
  onNavigate = (href) => { window.location.href = href; },
  onOpenMariAI,
  onLogout,
}) => {
  const userTier = (tier || 'COMMUNITY').toUpperCase();
  const displayName = userName || orgName || 'Workspace Member';
  const displayInitials = (displayName.split(' ').map((s) => s[0]).join('') || 'WS').substring(0, 2).toUpperCase();

  // State for collapsible sections
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Normalizes path matching for active state
  const isItemActive = (itemHref: string, itemId: string) => {
    const cleanCurrent = currentPath.replace(/\/+$/, '');
    const cleanItem = itemHref.replace(/\/+$/, '');
    
    if (cleanCurrent === cleanItem) return true;
    if (cleanCurrent === cleanItem.replace('/ralion', '')) return true;
    if (cleanItem !== '/ralion/dashboard' && cleanItem !== '/dashboard' && cleanCurrent.startsWith(cleanItem)) return true;
    if (itemId && cleanCurrent.includes(`/${itemId}`)) return true;
    
    return false;
  };

  // 1. CORE OS Navigation Items (Active & In-Use)
  const coreNav: SidebarItem[] = [
    { id: 'dashboard', label: 'Home', href: '/ralion/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'mari-ai', label: 'Mari AI Command', href: '/ralion/mari-ai', icon: <Sparkles className="w-4 h-4 text-purple-400" />, badge: 'Live AI', badgeVariant: 'purple' },
    { id: 'growth', label: 'Growth & Social', href: '/ralion/growth', icon: <TrendingUp className="w-4 h-4 text-indigo-400" />, badge: 'Command', badgeVariant: 'primary' },
    { id: 'crm', label: 'CRM & Pipeline', href: '/ralion/crm', icon: <UserCheck className="w-4 h-4 text-blue-400" /> },
    { id: 'workflows', label: 'Workflows', href: '/ralion/workflows', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { id: 'calendar', label: 'Calendar', href: '/ralion/calendar', icon: <Calendar className="w-4 h-4 text-cyan-400" /> },
    { id: 'tasks', label: 'Tasks', href: '/ralion/tasks', icon: <CheckSquare className="w-4 h-4 text-emerald-400" /> },
    { id: 'documents', label: 'Documents', href: '/ralion/documents', icon: <Folder className="w-4 h-4 text-zinc-300" /> },
    { id: 'reports', label: 'Reports & BI', href: '/ralion/reports', icon: <BarChart2 className="w-4 h-4 text-emerald-400" />, badge: userTier === 'COMMUNITY' ? 'PRO' : undefined },
  ];

  // 2. ECOSYSTEM Navigation Items
  const ecosystemNav: SidebarItem[] = [
    { id: 'integrations', label: 'Integrations Hub', href: '/ralion/settings/integrations', icon: <Globe className="w-4 h-4 text-indigo-400" />, badge: 'Meta/OAuth' },
    { id: 'marketplace', label: 'Marketplace & AI', href: '/ralion/marketplace', icon: <Store className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true },
    { id: 'developer', label: 'Developer Platform', href: '/ralion/developer', icon: <Code className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true },
  ];

  // 3. INDUSTRY SOLUTIONS Items (Locked with Coming Soon for Early Access)
  const industryNav: SidebarItem[] = [
    { id: 'industry-hub', label: 'Solutions Hub', href: '/ralion/industry', icon: <Building2 className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true },
    { id: 'health', label: 'Healthcare OS', href: '/ralion/industry/health', icon: <HeartPulse className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true, isIndustryPlugin: true },
    { id: 'funeral', label: 'Funeral Services OS', href: '/ralion/industry/funeral', icon: <Shield className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true, isIndustryPlugin: true },
    { id: 'logistics', label: 'Logistics & Fleet OS', href: '/ralion/industry/logistics', icon: <Truck className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true, isIndustryPlugin: true },
    { id: 'trade', label: 'Trade & Retail OS', href: '/ralion/industry/trade', icon: <ShoppingBag className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true, isIndustryPlugin: true },
    { id: 'government', label: 'Government Edition', href: '/ralion/government', icon: <Layers className="w-4 h-4 text-zinc-400" />, badge: 'Coming Soon', isLocked: true, isIndustryPlugin: true },
  ];

  // 4. ADMINISTRATION Items
  const adminNav: SidebarItem[] = [
    { id: 'billing', label: 'Billing & Plans', href: '/ralion/billing', icon: <CreditCard className="w-4 h-4 text-amber-400" /> },
    { id: 'settings', label: 'Settings', href: '/ralion/settings', icon: <Settings className="w-4 h-4 text-zinc-300" /> },
    { id: 'security', label: 'Security & Compliance', href: '/ralion/enterprise/security', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
    { id: 'ai-privacy', label: 'AI Privacy & Safety', href: '/ralion/settings/ai-privacy', icon: <Lock className="w-4 h-4 text-cyan-400" /> },
    { id: 'workspace', label: 'Workspace Shell', href: '/ralion/workspace', icon: <Grid className="w-4 h-4 text-zinc-400" /> },
  ];

  const renderNavSection = (items: SidebarItem[]) => {
    return items.map((item) => {
      const active = isItemActive(item.href, item.id);
      return (
        <button
          key={item.id}
          onClick={() => onNavigate(item.href)}
          title={isCollapsed ? (item.isLocked ? `${item.label} (Coming Soon)` : item.label) : undefined}
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
              <span className={cn(
                "truncate text-left",
                item.isLocked && "text-zinc-400 group-hover:text-zinc-300"
              )}>
                {item.label}
              </span>
            )}
          </div>
          {!isCollapsed && item.isLocked && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0 shadow-sm">
              <Lock className="w-2.5 h-2.5" />
              Soon
            </span>
          )}
          {!isCollapsed && !item.isLocked && item.badge && (
            <span className={cn(
              "px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0",
              item.badgeVariant === 'purple' ? "bg-purple-950/60 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10" :
              item.badgeVariant === 'primary' ? "bg-indigo-950/60 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10" :
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
            <img src="/logo.png" alt="Ralion OS" className="w-full h-full object-contain" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs text-white tracking-tight leading-none truncate">Ralion OS</span>
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

      {/* Exit / Return Portal Link */}
      {!isCollapsed && (
        <div className="px-3 pt-2.5">
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

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* 1. Core OS */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Core OS
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavSection(coreNav)}
          </div>
        </div>

        {/* 2. Ecosystem */}
        <div>
          {!isCollapsed && (
            <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Ecosystem
            </div>
          )}
          <div className="space-y-0.5">
            {renderNavSection(ecosystemNav)}
          </div>
        </div>

        {/* 3. Industry Solutions (Collapsible) */}
        <div>
          {!isCollapsed ? (
            <div>
              <button
                onClick={() => setIsSolutionsOpen(prev => !prev)}
                className="w-full px-2 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span>Industry Solutions</span>
                {isSolutionsOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isSolutionsOpen && (
                <div className="space-y-0.5">
                  {renderNavSection(industryNav)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderNavSection(industryNav.slice(0, 2))}
            </div>
          )}
        </div>

        {/* 4. Administration (Collapsible) */}
        <div>
          {!isCollapsed ? (
            <div>
              <button
                onClick={() => setIsAdminOpen(prev => !prev)}
                className="w-full px-2 mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <span>Administration</span>
                {isAdminOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
              {isAdminOpen && (
                <div className="space-y-0.5">
                  {renderNavSection(adminNav)}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-0.5">
              {renderNavSection(adminNav.slice(0, 2))}
            </div>
          )}
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

      {/* User Footer */}
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
              title="Settings"
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
            title="Settings"
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
