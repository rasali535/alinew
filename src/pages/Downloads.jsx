import React from 'react';
import { Download, Monitor, Smartphone, Terminal, ShieldCheck, ArrowRight } from 'lucide-react';

const Downloads = () => {
  const downloadItems = [
    {
      title: 'Ralion Enterprise Desktop Client',
      platform: 'Windows (x64 / ARM64)',
      version: 'v2.4.0',
      size: '84.2 MB',
      description: 'Native desktop shell for high-throughput Ralion workspace execution with offline local caching.',
      icon: Monitor,
      link: '/ralion'
    },
    {
      title: 'Ras Ali Labs CLI Toolchain',
      platform: 'Cross-Platform (npm / cargo / binary)',
      version: 'v1.1.2',
      size: '12.4 MB',
      description: 'Command line utilities for managing Supabase database migrations, USSD webhooks, and AI agent deployments.',
      icon: Terminal,
      link: '/developers'
    },
    {
      title: 'Mari AI Agent SDK',
      platform: 'JavaScript / Python / Go',
      version: 'v0.9.5-beta',
      size: '3.1 MB',
      description: 'Developer SDKs to embed Mari AI conversational intelligence directly into web apps and USSD handlers.',
      icon: Smartphone,
      link: '/developers'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-gold text-xs font-semibold uppercase tracking-widest block mb-3">
            Software Hub
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Downloads & Developer Resources
          </h1>
          <p className="text-white/60 text-lg">
            Access official desktop binaries, SDK libraries, and CLI tools for the Ras Ali Labs product ecosystem.
          </p>
        </div>

        <div className="space-y-6">
          {downloadItems.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-[#252525] border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-brand-gold/30 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 mt-1">
                    <Icon size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-white">{item.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/70 text-[10px] font-mono">
                        {item.version}
                      </span>
                    </div>
                    <p className="text-white/50 text-xs mb-2">{item.platform} • {item.size}</p>
                    <p className="text-white/70 text-sm max-w-2xl">{item.description}</p>
                  </div>
                </div>

                <a
                  href={item.link}
                  className="py-3 px-6 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2 shrink-0 self-stretch md:self-auto justify-center"
                >
                  <Download size={16} /> Access Download
                </a>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Downloads;
