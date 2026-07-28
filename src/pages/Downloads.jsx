import React, { useState, useEffect } from 'react';
import { Download, Monitor, Terminal, Smartphone, ShieldCheck, Check, Laptop, Cpu } from 'lucide-react';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';

const Downloads = () => {
  const [userOS, setUserOS] = useState('Windows');

  useEffect(() => {
    // OS Auto-Detection
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setUserOS('macOS');
    } else if (userAgent.includes('linux')) {
      setUserOS('Linux');
    } else {
      setUserOS('Windows');
    }
  }, []);

  const desktopInstallers = [
    {
      os: 'Windows',
      file: 'Ralion-Desktop-2.4.0-Setup.exe',
      arch: 'x64 / ARM64',
      size: '84.2 MB',
      sha: 'a9f81c2b3e4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a',
      popular: userOS === 'Windows'
    },
    {
      os: 'macOS',
      file: 'Ralion-Desktop-2.4.0.dmg',
      arch: 'Apple Silicon (M1/M2/M3/M4) & Intel',
      size: '91.8 MB',
      sha: 'b8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9',
      popular: userOS === 'macOS'
    },
    {
      os: 'Linux',
      file: 'Ralion-Desktop-2.4.0.AppImage',
      arch: 'x86_64 (.AppImage & .deb)',
      size: '79.5 MB',
      sha: 'c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c9d8',
      popular: userOS === 'Linux'
    }
  ];

  const handleDownload = (platform, filename) => {
    analytics.trackDownload(platform, filename);

    // Trigger synthetic file download for demonstration
    const blob = new Blob(
      [
        `Ras Ali Labs — Ralion Desktop Installer (${platform})\nVersion: 2.4.0\nFile: ${filename}\nSHA256: ${desktopInstallers.find(i => i.os === platform)?.sha}`
      ],
      { type: 'text/plain;charset=utf-8' }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Download Ralion Desktop | Windows, macOS, Linux | Ras Ali Labs"
        description="Download the official Ralion Desktop App for Windows, macOS, and Linux. AI-powered Business Operating System."
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Laptop size={14} /> Official Download Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Ralion Desktop App
          </h1>
          <p className="text-brand-gold font-bold text-sm uppercase tracking-widest mb-6">
            Empowered to Prosper — Version 2.4.0 (Latest Release)
          </p>
          <p className="text-white/60 text-lg leading-relaxed">
            Native offline-capable desktop shell for high-throughput operational workflows, offline local caching, and low-latency Mari AI reasoning.
          </p>
        </div>

        {/* OS Auto-Detected Banner */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 mb-12 flex items-center justify-between gap-4 max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-3 text-brand-gold">
            <ShieldCheck size={20} />
            <span>Detected Operating System: <strong className="text-white">{userOS}</strong>. We recommend downloading the corresponding desktop build below.</span>
          </div>
        </div>

        {/* Desktop Installers Grid (Windows, macOS, Linux) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {desktopInstallers.map((installer) => (
            <div
              key={installer.os}
              className={`relative bg-[#252525] border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                installer.popular
                  ? 'border-brand-gold shadow-2xl shadow-brand-gold/15 ring-1 ring-brand-gold/50'
                  : 'border-white/10 hover:border-white/30'
              }`}
            >
              {installer.popular && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest">
                  Recommended for your Device
                </span>
              )}

              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-6">
                  <Monitor size={24} />
                </div>

                <h3 className="text-2xl font-bold text-white mb-1">{installer.os} Download</h3>
                <span className="inline-block px-2.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono mb-4">
                  {installer.file}
                </span>

                <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-4 mb-6">
                  <div className="flex justify-between">
                    <span>Architecture:</span>
                    <span className="text-white font-medium">{installer.arch}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>File Size:</span>
                    <span className="text-white font-medium">{installer.size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Release:</span>
                    <span className="text-brand-gold font-medium">v2.4.0 Stable</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(installer.os, installer.file)}
                className={`w-full py-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                  installer.popular
                    ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-lg shadow-brand-gold/20 hover:scale-105'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                <Download size={16} /> Download for {installer.os}
              </button>
            </div>
          ))}
        </div>

        {/* Developer CLI & SDK Section */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Developer Toolchains & SDKs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black/40 border border-white/10 p-6 rounded-2xl flex items-start gap-4">
              <Terminal size={24} className="text-purple-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-bold text-base mb-1">Ras Ali CLI Toolchain</h4>
                <p className="text-white/60 text-xs mb-3">
                  Command line utilities to run local Supabase migrations and register Mari AI agents.
                </p>
                <code className="bg-black p-2 rounded text-emerald-400 text-xs font-mono block mb-3">
                  npm install -g @rasali/cli
                </code>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 p-6 rounded-2xl flex items-start gap-4">
              <Cpu size={24} className="text-blue-400 shrink-0 mt-1" />
              <div>
                <h4 className="text-white font-bold text-base mb-1">Mari AI Agent SDK</h4>
                <p className="text-white/60 text-xs mb-3">
                  JS/TS & Python SDKs to embed Mari AI conversational reasoning into web & desktop apps.
                </p>
                <code className="bg-black p-2 rounded text-emerald-400 text-xs font-mono block mb-3">
                  npm install @rasali/mari-ai-sdk
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
