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
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  orgName = "Ralion Enterprise",
  onNavigate,
  onOpenMariAI,
  enabledModules = ['workspace', 'mari', 'demos', 'customers', 'leads', 'crm', 'tasks', 'calendar', 'documents', 'reports', 'workflows', 'billing', 'growth', 'health', 'funeral', 'logistics', 'trade', 'marketplace', 'developer', 'enterprise', 'government']
}) => {
  const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';

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
    { id: 'reports', label: 'Reports', href: '/ralion/reports', icon: <BarChart2 className="w-4 h-4 text-emerald-400" /> },
    { id: 'workflows', label: 'No-Code Workflows', href: '/ralion/workflows', icon: <Zap className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & Licenses', href: '/ralion/billing', icon: <CreditCard className="w-4 h-4" /> },
  ];

  const growthNav: SidebarItem[] = [
    { id: 'growth', label: 'Ralion Growth AI', href: '/ralion/growth', icon: <TrendingUp className="w-4 h-4" />, badge: 'AI' },
  ];

  const industryNav: SidebarItem[] = [
    { id: 'health', label: 'Ralion Health', href: '/ralion/industry/health', icon: <HeartPulse className="w-4 h-4" />, isIndustryPlugin: true },
    { id: 'funeral', label: 'Ralion Funeral', href: '/ralion/industry/funeral', icon: <Shield className="w-4 h-4" />, isIndustryPlugin: true },
    { id: 'logistics', label: 'Ralion Logistics', href: '/ralion/industry/logistics', icon: <Truck className="w-4 h-4" />, isIndustryPlugin: true },
    { id: 'trade', label: 'Ralion Trade', href: '/ralion/industry/trade', icon: <ShoppingBag className="w-4 h-4" />, isIndustryPlugin: true },
  ];

  const ecosystemNav: SidebarItem[] = [
    { id: 'marketplace', label: 'Marketplace', href: '/ralion/marketplace', icon: <Store className="w-4 h-4 text-purple-400" /> },
    { id: 'developer', label: 'Developer Platform', href: '/ralion/developer', icon: <Code className="w-4 h-4 text-blue-400" /> },
    { id: 'enterprise', label: 'Enterprise SSO', href: '/ralion/enterprise', icon: <Shield className="w-4 h-4 text-emerald-400" /> },
    { id: 'government', label: 'Government Edition', href: '/ralion/government', icon: <Globe className="w-4 h-4 text-amber-400" /> },
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
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-blue-500/20">
            R
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm text-white tracking-tight leading-none">Ralion Platform</span>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-0.5">{orgName}</span>
          </div>
        </div>
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
        <a href={platformUrl} target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-300 p-1">
          <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
        </a>
      </div>
    </aside>
  );
};
