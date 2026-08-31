'use client';

import React from 'react';
import { Search, Bell, Sparkles, User, MapPin, ArrowLeft, LogOut, Menu, Command } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export interface HeaderProps {
  userName?: string;
  userRole?: string;
  user?: { name: string; role: string; email?: string };
  orgName?: string;
  isAdmin?: boolean;
  activeBranch?: string;
  unreadNotifications?: number;
  exitUrl?: string;
  onExit?: () => void;
  onOpenSearch?: () => void;
  onOpenMariAI?: () => void;
  onOpenAdmin?: () => void;
  onLogout?: () => void;
  onToggleMobileSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = "Ras Ali Admin",
  userRole = "ORGANIZATION_OWNER",
  user,
  orgName,
  isAdmin = false,
  activeBranch = "Main HQ",
  unreadNotifications = 0,
  exitUrl = "https://rasalilabs.com",
  onExit,
  onOpenSearch,
  onOpenMariAI,
  onOpenAdmin,
  onLogout,
  onToggleMobileSidebar,
}) => {
  const displayName = user?.name || userName;
  const displayRole = user?.role || userRole;

  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Left Area: Mobile Menu, Search & Context */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Toggle */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            title="Toggle Navigation Menu"
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Global Command / Search Input Bar */}
        <div className="flex items-center w-56 sm:w-72 lg:w-80">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-300 transition-all shadow-inner"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="truncate">Search commands, pages, data...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500 border border-zinc-700/60">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </button>
        </div>
      </div>

      {/* Right Area: System Status & User Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Branch / Workspace Indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400">
          <MapPin className="w-3 h-3 text-indigo-400" />
          <span className="font-medium text-zinc-300">{activeBranch}</span>
        </div>

        {/* Quick Platform Admin Trigger */}
        {isAdmin && (
          <button
            onClick={() => {
              if (onOpenAdmin) {
                onOpenAdmin();
              } else if (typeof window !== 'undefined') {
                window.location.href = '/admin';
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 hover:text-amber-100 hover:border-amber-400 hover:bg-amber-500/25 text-xs font-bold transition-all shadow-sm shadow-amber-500/10 cursor-pointer"
          >
            <span>👑</span>
            <span className="hidden sm:inline">Admin Portal</span>
          </button>
        )}

        {/* Quick Mari AI Trigger */}
        <button
          onClick={onOpenMariAI}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-500/60 hover:bg-indigo-900/40 text-xs font-medium transition-all cursor-pointer"
        >
          <Sparkles className="w-3 h-3 text-indigo-400" />
          <span className="hidden sm:inline">Mari AI</span>
        </button>

        {/* Notifications */}
        <button
          title="Notifications"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors relative"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-indigo-500" />
          )}
        </button>

        {/* User Avatar Menu */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-800/80">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center text-white font-bold text-xs shadow-sm">
            {displayName.charAt(0)}
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-medium text-zinc-200 leading-none truncate max-w-[120px]">{displayName}</span>
            <span className="text-[9px] text-zinc-500 font-mono mt-0.5 truncate max-w-[120px]">{displayRole}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign Out of Ralion OS"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/30 hover:bg-rose-500/10 text-xs font-medium transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        )}
      </div>
    </header>
  );
};
