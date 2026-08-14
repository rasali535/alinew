import React from 'react';
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
  Building2,
  BarChart2,
  Filter,
  Layers,
  Code,
  Globe,
  Store,
  ArrowLeft,
  User,
  Grid
} from 'lucide-react';
import { cn } from './utils';
import { Badge } from './Badge';

export interface SidebarItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  isIndustryPlugin?: boolean;
}

export interface SidebarProps {
  currentPath: string;
  orgName?: string;
  onNavigate: (href: string) => void;
  onOpenMariAI?: () => void;
  enabledModules?: string[];
  tier?: 'COMMUNITY' | 'PROFESSIONAL' | 'ENTERPRISE' | string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  orgName = "Ralion Enterprise",
  onNavigate,
  onOpenMariAI,
  enabledModules = ['workspace', 'mari', 'demos', 'customers', 'leads', 'crm', 'tasks', 'calendar', 'documents', 'reports', 'workflows', 'billing', 'growth', 'health', 'funeral', 'logistics', 'trade', 'marketplace', 'developer', 'enterprise', 'government'],
  tier = 'COMMUNITY'
}) => {
  const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';
  const userTier = (tier || 'COMMUNITY').toUpperCase();

  const demoNav: SidebarItem[] = [
    { id: 'workspace', label: 'Ralion App Shell', href: '/ralion/workspace', icon: <Grid className="w-4 h-4 text-emerald-400" />, badge: 'Shell' },
    { id: 'demos', label: 'Showcase Demos', href: '/ralion/demos', icon: <Layers className="w-4 h-4 text-purple-400" /> },
  ];

  const coreNav: SidebarItem[] = [
    { id: 'dashboard', label: 'Dashboard', href: '/ralion/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'customers', label: 'Customers', href: '/ralion/customers', icon: <Users className="w-4 h-4 text-blue-400" /> },
    { id: 'leads', label: 'Leads', href: '/ralion/leads', icon: <Filter className="w-4 h-4 text-amber-400" /> },
    { id: 'crm', label: 'Sales Pipeline (CRM)', href: '/ralion/crm', icon: <UserCheck className="w-4 h-4" /> },
    { id: 'tasks', label: 'Tasks', href: '/ralion/tasks', icon: <CheckSquare className="w-4 h-4" /> },
    { id: 'calendar', label: 'Calendar', href: '/ralion/calendar', icon: <Calendar className="w-4 h-4" /> },
    { id: 'documents', label: 'Documents', href: '/ralion/documents', icon: <Folder className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & BI', href: '/ralion/reports', icon: <BarChart2 className="w-4 h-4 text-emerald-400" />, badge: userTier === 'COMMUNITY' ? 'PRO' : undefined },
    { id: 'workflows', label: 'No-Code Workflows', href: '/ralion/workflows', icon: <Zap className="w-4 h-4" />, badge: userTier === 'COMMUNITY' ? 'PRO' : undefined },
    { id: 'billing', label: 'Billing & Plans', href: '/ralion/billing', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const growthNav: SidebarItem[] = [
    { id: 'growth', label: 'Ralion Growth AI', href: '/ralion/growth', icon: <TrendingUp className="w-4 h-4" />, badge: userTier === 'COMMUNITY' ? 'PRO' : 'AI' },
  ];

  const industryNav: SidebarItem[] = [
    { id: 'health', label: 'Ralion Health', href: '/ralion/industry/health', icon: <HeartPulse className="w-4 h-4" />, isIndustryPlugin: true, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
    { id: 'funeral', label: 'Ralion Funeral', href: '/ralion/industry/funeral', icon: <Shield className="w-4 h-4" />, isIndustryPlugin: true, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
    { id: 'logistics', label: 'Ralion Logistics', href: '/ralion/industry/logistics', icon: <Truck className="w-4 h-4" />, isIndustryPlugin: true, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
    { id: 'trade', label: 'Ralion Trade', href: '/ralion/industry/trade', icon: <ShoppingBag className="w-4 h-4" />, isIndustryPlugin: true, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
  ];

  const ecosystemNav: SidebarItem[] = [
    { id: 'integrations', label: 'Integration Hub', href: '/ralion/settings/integrations', icon: <Globe className="w-4 h-4 text-purple-400" />, badge: 'OAuth' },
    { id: 'marketplace', label: 'Marketplace', href: '/ralion/marketplace', icon: <Store className="w-4 h-4 text-purple-400" /> },
    { id: 'developer', label: 'Developer Platform', href: '/ralion/developer', icon: <Code className="w-4 h-4 text-blue-400" />, badge: userTier === 'COMMUNITY' ? 'PRO' : undefined },
    { id: 'enterprise', label: 'Enterprise SSO', href: '/ralion/enterprise', icon: <Shield className="w-4 h-4 text-emerald-400" />, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
    { id: 'government', label: 'Government Edition', href: '/ralion/government', icon: <Globe className="w-4 h-4 text-amber-400" />, badge: userTier !== 'ENTERPRISE' ? 'ENTERPRISE' : undefined },
  ];

  const renderNavSection = (items: SidebarItem[]) => {
    return items
      .filter(item => item.id === 'dashboard' || enabledModules.includes(item.id))
      .map((item) => {
        const isActive = currentPath === item.href || (item.href !== '/' && currentPath.startsWith(item.href));
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.href)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 group",
              isActive
                ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 font-semibold"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
            )}
          >
            <div className="flex items-center gap-2.5">
              <span className={cn(isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300")}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {item.badge}
              </span>
            )}
          </button>
        );
      });
  };

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-md shadow-blue-500/20">
            <img src="/logo.png" alt="Ralion OS Logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white tracking-tight leading-none">Ralion Platform</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">{orgName}</span>
          </div>
        </div>
        <Badge
          variant={userTier === 'ENTERPRISE' ? 'primary' : userTier === 'PROFESSIONAL' ? 'purple' : userTier === 'STANDARD' ? 'warning' : 'default'}
          className="text-[9px] px-1.5 py-0 uppercase font-mono tracking-wider"
        >
          {userTier === 'ENTERPRISE' ? 'Enterprise' : userTier === 'PROFESSIONAL' ? 'Pro' : userTier === 'STANDARD' ? 'Standard' : 'Community'}
        </Badge>
      </div>

      {/* Exit / Back to Ras Ali Labs Link */}
      <div className="px-3 pt-3">
        <a
          href={platformUrl}
          title="Return to Ras Ali Labs main portal"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/40 hover:bg-zinc-800/80 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Ras Ali Labs</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono group-hover:text-amber-400">Portal</span>
        </a>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        {/* Workspace & Demos */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Ralion App Shell
          </div>
          <div className="space-y-1">
            {renderNavSection(demoNav)}
          </div>
        </div>

        {/* Core Platform Modules */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Core Modules
          </div>
          <div className="space-y-1">
            {renderNavSection(coreNav)}
          </div>
        </div>

        {/* Growth AI */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Growth & Marketing
          </div>
          <div className="space-y-1">
            {renderNavSection(growthNav)}
          </div>
        </div>

        {/* Industry Plugins */}
        <div>
          <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            <span>Industry Verticals</span>
            <Badge variant="purple" className="text-[9px] py-0 px-1 font-mono text-white">Plugins</Badge>
          </div>
          <div className="space-y-1 mt-1">
            {renderNavSection(industryNav)}
          </div>
        </div>

        {/* Platform Ecosystem */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Ecosystem & APIs
          </div>
          <div className="space-y-1">
            {renderNavSection(ecosystemNav)}
          </div>
        </div>
      </div>

      {/* Plan Card (Community or Standard Upgrade) */}
      {userTier === 'COMMUNITY' && (
        <div className="p-3 border-t border-zinc-800/80 bg-gradient-to-b from-blue-950/20 to-zinc-950">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-zinc-900 border border-blue-500/30 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-white mb-0.5">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Community Plan
            </div>
            <p className="text-[9px] text-zinc-400 leading-tight">
              Unlock Starter Growth AI ($1/day) or Pro
            </p>
            <div className="mt-2 flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('/ralion/billing?tier=standard')}
                className="flex-1 py-1 px-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-all"
              >
                Standard ($1/d)
              </button>
              <button
                onClick={() => onNavigate('/ralion/billing?tier=professional')}
                className="flex-1 py-1 px-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 text-white text-[10px] font-bold transition-all shadow-md shadow-blue-500/20"
              >
                Pro ($49/mo)
              </button>
            </div>
          </div>
        </div>
      )}

      {userTier === 'STANDARD' && (
        <div className="p-3 border-t border-zinc-800/80 bg-gradient-to-b from-amber-950/20 to-zinc-950">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-600/10 via-zinc-900 to-zinc-950 border border-amber-500/30 text-center">
            <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-300 mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Standard Plan Active
            </div>
            <p className="text-[9px] text-zinc-400 leading-tight">
              5 AI posts/day & 3 active workflows
            </p>
            <button
              onClick={() => onNavigate('/ralion/billing')}
              className="mt-2 w-full py-1 px-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-95 text-white text-[10px] font-bold transition-all shadow-md shadow-blue-500/20"
            >
              Upgrade to Pro for Unlimited
            </button>
          </div>
        </div>
      )}

      {/* Mari AI Drawer Trigger */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/40">
        <button
          onClick={onOpenMariAI}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-gradient-to-r from-blue-600/20 via-indigo-600/20 to-purple-600/20 border border-blue-500/30 text-white font-medium text-xs hover:border-blue-500/50 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-bold text-xs">Mari AI Assistant</span>
              <span className="text-[9px] text-zinc-400">Contextual Intent Agent</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {/* User Footer */}
      <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold text-xs">
            RA
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-white">Ras Ali Admin</span>
            <span className="text-[10px] text-zinc-500 font-mono">admin@rasalilabs.com</span>
          </div>
        </div>
        <a
          href={platformUrl}
          title="Exit Ralion OS & Return to Ras Ali Labs"
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-800 text-zinc-400 hover:text-white text-[11px] font-semibold transition-all group"
        >
          <ArrowLeft className="w-3 h-3 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Exit</span>
        </a>
      </div>
    </aside>
  );
};
