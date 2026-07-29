import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllReleases, fetchLatestReleaseFromSupabase } from '../data/releases';
import { triggerBinaryDownload } from '../lib/downloadValidator';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Download,
  Monitor,
  ShieldCheck,
  Check,
  Copy,
  ChevronRight,
  ExternalLink,
  Laptop,
  Sparkles,
  Cloud
} from 'lucide-react';

const RalionDownload = () => {
  const [userOS, setUserOS] = useState('Windows');
  const [copiedSha, setCopiedSha] = useState('');
  const [releases, setReleases] = useState(getAllReleases());

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

    fetchLatestReleaseFromSupabase('Ralion', 'Windows').then((latest) => {
      if (latest) {
        setReleases(getAllReleases());
      }
    });
  }, []);

  const handleCopySha = (checksum) => {
    navigator.clipboard.writeText(checksum);
    setCopiedSha(checksum);
    setTimeout(() => setCopiedSha(''), 2000);
  };

  const handleDownload = (rel) => {
    analytics.trackDownload(rel.platform, '2.4.2', 'Ralion');
    triggerBinaryDownload(rel.downloadUrl, rel.filename || `ralion-desktop-2.4.2-setup.exe`);
  };

  const detectedRelease = releases.find(
    (r) => r.platform.toLowerCase() === userOS.toLowerCase()
  ) || releases[0];

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Downloads — AI Business Operating System v2.4.2 | Ras Ali Labs"
        description="Download official Ralion Desktop 2.4.2 Community Edition for Windows 10/11 x64, macOS, and Linux. Empowered to Prosper."
      />

      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-white transition-colors">Products</Link>
          <ChevronRight size={12} />
          <Link to="/products/ralion" className="hover:text-white transition-colors">Ralion</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">Download v2.4.2</span>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Official Download Center • Version 2.4.2
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            Ralion Downloads
          </h1>
          <p className="text-brand-gold font-bold text-sm uppercase tracking-widest mb-4">
            Empowered to Prosper — AI-Powered Business Operating System
          </p>
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            Get the native Ralion desktop app for high-throughput business management, Mari AI reasoning, and local workspace caching.
          </p>
        </div>

        {/* Phase 5: OS Auto-Detection Recommendation Card */}
        <div className="bg-[#252525] border border-brand-gold/50 rounded-3xl p-8 md:p-10 mb-16 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-6 py-2 bg-brand-gold text-black text-xs font-extrabold uppercase tracking-wider rounded-bl-2xl">
            Auto-Detected System
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold">
                <ShieldCheck size={16} /> Detected: {userOS === 'Windows' ? 'Windows 11 / 10 x64' : userOS}
              </div>

              <h2 className="text-3xl font-extrabold text-white">
                Recommended: Download Ralion for {userOS}
              </h2>

              <p className="text-white/70 text-xs font-mono">
                Package: {detectedRelease.filename} • Version 2.4.2 • Size: {detectedRelease.filesizeFormatted || '152 MB'}
              </p>

              <p className="text-white/50 text-xs max-w-xl">
                PE binary validated for 64-bit architecture. Served directly via Supabase Storage bucket <code className="text-brand-gold font-mono">ralion-releases</code>.
              </p>
            </div>

            <button
              onClick={() => handleDownload(detectedRelease)}
              className="py-5 px-9 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-3 shrink-0"
            >
              <Download size={20} /> Download Ralion for {userOS} (v2.4.2)
            </button>
          </div>
        </div>

        {/* Manual Platform Selection Section */}
        <div className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h3 className="text-2xl font-bold text-white mb-2">Available Platforms & Package Formats</h3>
            <p className="text-white/50 text-xs">Looking for a different operating system? Select your preferred installer below.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {releases.map((rel) => {
              const isSelected = rel.platform.toLowerCase() === userOS.toLowerCase();
              return (
                <div
                  key={rel.platform}
                  className={`bg-[#252525] border rounded-3xl p-8 flex flex-col justify-between transition-all ${
                    isSelected ? 'border-brand-gold/60 shadow-xl' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-6">
                      <Monitor size={24} />
                    </div>

                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-xl font-bold text-white">{rel.platform}</h4>
                      <span className="px-2.5 py-0.5 rounded bg-white/10 text-brand-gold text-[10px] font-bold">
                        v2.4.2
                      </span>
                    </div>

                    <p className="text-white/50 text-xs font-mono mb-4">{rel.filename}</p>

                    <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-4 mb-6">
                      <div className="flex justify-between">
                        <span>Architecture:</span>
                        <span className="text-white font-medium">{rel.architecture}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>File Size:</span>
                        <span className="text-white font-medium">{rel.filesizeFormatted || '152 MB'}</span>
                      </div>
                    </div>

                    {/* SHA-256 Copy */}
                    <div className="bg-black/50 border border-white/10 p-3 rounded-xl mb-6">
                      <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                        <span>SHA-256 Checksum</span>
                        <button
                          onClick={() => handleCopySha(rel.checksum)}
                          className="text-brand-gold hover:underline flex items-center gap-1 font-sans"
                        >
                          {copiedSha === rel.checksum ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Hash</>}
                        </button>
                      </div>
                      <div className="font-mono text-[9px] text-white/70 truncate">{rel.checksum}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(rel)}
                    className="w-full py-4 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Download size={16} /> Download {rel.platform} Installer
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionDownload;
