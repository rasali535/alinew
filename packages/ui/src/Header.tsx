import React from 'react';
import { Search, Bell, Sparkles, User, MapPin, ArrowLeft, LogOut } from 'lucide-react';
import { Button } from './Button';
import { Badge } from './Badge';

export interface HeaderProps {
  userName?: string;
  userRole?: string;
  user?: { name: string; role: string; email?: string };
  orgName?: string;
  activeBranch?: string;
  unreadNotifications?: number;
  exitUrl?: string;
  onExit?: () => void;
  onOpenSearch?: () => void;
  onOpenMariAI?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userName = "Ras Ali Admin",
  userRole = "ORGANIZATION_OWNER",
  user,
  orgName,
  activeBranch = "Main Branch",
  unreadNotifications,
  exitUrl = "https://rasalilabs.com",
  onExit,
  onOpenSearch,
  onOpenMariAI,
  onLogout
}) => {
  const displayName = user?.name || userName;
  const displayRole = user?.role || userRole;

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Area: Exit Button & Search */}
      <div className="flex items-center gap-3">
        {/* Back / Exit Button */}
        <a
          href={exitUrl}
          onClick={(e) => {
            if (onExit) {
              e.preventDefault();
              onExit();
            }
          }}
          title="Return to Ras Ali Labs Website"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 transition-all shadow-sm group shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-amber-400 group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden sm:inline font-medium">Back to Ras Ali Labs</span>
          <span className="sm:hidden">Exit</span>
        </a>

        {/* Search Input Bar */}
        <div className="flex items-center gap-4 w-72 lg:w-96">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:border-zinc-700 transition-colors shadow-inner"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search contacts, deals, tasks...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-500 border border-zinc-700">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Branch Selector Badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800/80 text-xs text-zinc-300">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium">{activeBranch}</span>
        </div>

        {/* Quick Mari AI Button */}
        <Button
          variant="glass"
          size="sm"
          onClick={onOpenMariAI}
          className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 border-blue-500/40 text-blue-300 hover:text-white"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
          <span>Ask Mari AI</span>
        </Button>

        {/* Notifications Icon */}
        <button className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 animate-ping" />
        </button>

        {/* User Info Avatar & Menu */}
        <div className="flex items-center gap-3 pl-2 border-l border-zinc-800">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
            {userName.charAt(0)}
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-xs font-semibold text-white leading-tight">{userName}</span>
            <span className="text-[10px] text-zinc-500 font-mono">{userRole}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
