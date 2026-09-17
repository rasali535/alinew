'use client';

import React from 'react';
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckSquare,
  FileText,
  Megaphone,
  Sparkles,
  Users,
} from 'lucide-react';

interface DesktopWorkspaceHomeProps {
  organizationName: string;
  onNavigate: (href: string) => void;
  onOpenMari: () => void;
}

const quickActions = [
  { label: 'Customers', description: 'CRM & pipeline', href: '/crm', icon: Users },
  { label: 'Growth', description: 'Strategy & campaigns', href: '/growth', icon: BriefcaseBusiness },
  { label: 'Social', description: 'Content & publishing', href: '/social', icon: Megaphone },
  { label: 'Tasks', description: 'Work that needs action', href: '/tasks', icon: CheckSquare },
  { label: 'Documents', description: 'Business knowledge', href: '/documents', icon: FileText },
];

export function DesktopWorkspaceHome({ organizationName, onNavigate, onOpenMari }: DesktopWorkspaceHomeProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-zinc-900 via-zinc-950 to-blue-950/30 shadow-2xl shadow-blue-950/10">
      <div className="grid gap-5 p-5 lg:grid-cols-[1.45fr_1fr] lg:p-6">
        <div className="flex min-w-0 flex-col justify-between gap-5">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
                Ralion OS Desktop
              </span>
              <span className="text-[11px] text-zinc-500">{organizationName}</span>
            </div>
            <h1 className="max-w-2xl text-2xl font-black tracking-tight text-white sm:text-3xl">
              Your business, with Mari at the centre.
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Ask Mari what needs attention, then move straight into the Ralion tools that execute the work. One company context, one operating workspace.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenMari}
            className="group flex w-full items-center gap-4 rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-left transition hover:border-blue-400/40 hover:bg-blue-500/15"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 text-white shadow-lg shadow-blue-950/40">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">Ask Mari</span>
              <span className="block truncate text-xs text-zinc-400">“What should I focus on in the business today?”</span>
            </span>
            <ArrowRight className="h-4 w-4 text-blue-300 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-black/20 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-violet-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Workspace</span>
            </div>
            <span className="text-[10px] text-emerald-400">Business context connected</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {quickActions.map(({ label, description, href, icon: Icon }) => (
              <button
                key={href}
                type="button"
                onClick={() => onNavigate(href)}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 text-left transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-300">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-white">{label}</span>
                  <span className="block truncate text-[10px] text-zinc-500">{description}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-zinc-600">
            Mari follows the signed-in user’s Ralion permissions. Sensitive business actions remain behind the existing Ralion access controls and approval flows.
          </p>
        </div>
      </div>
    </section>
  );
}
