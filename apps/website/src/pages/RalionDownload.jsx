import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllReleases, getCurrentVersion, fetchLatestReleaseFromSupabase } from '../data/releases';
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
  Sparkles,
  Bot,
  ArrowRight
} from 'lucide-react';

const RalionDownload = () => {
  const [userOS, setUserOS] = useState('Windows');
  const [copiedSha, setCopiedSha] = useState('');
  const [releases, setReleases] = useState(getAllReleases());
  const currentVersion = getCurrentVersion();

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.includes('mac')) {
      setUserOS('macOS');
    } else if (userAgent.includes('linux')) {
      setUserOS('Linux');
    } else {
      setUserOS('Windows');
    }

    fetchLatestReleaseFromSupabase('Ralion OS', 'Windows').then((latest) => {
      if (latest) setReleases(getAllReleases());
    });
  }, []);

  const handleCopySha = (checksum) => {
    if (!checksum) return;
    navigator.clipboard.writeText(checksum);
    setCopiedSha(checksum);
    setTimeout(() => setCopiedSha(''), 2000);
  };

  const handleDownload = (rel) => {
    if (!rel?.downloadUrl) return;
    analytics.trackDownload(rel.platform, rel.version || currentVersion, 'Ralion OS');
    triggerBinaryDownload(rel.downloadUrl, rel.filename);
  };

  const detectedRelease = releases.find(
    (r) => r.platform.toLowerCase() === userOS.toLowerCase()
  );
  const windowsRelease = releases.find(
    (r) => r.platform.toLowerCase() === 'windows'
  ) || releases[0];
  const recommendedRelease = detectedRelease || windowsRelease;
  const hasNativeRelease = Boolean(detectedRelease);

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title={`Ralion OS Downloads — v${currentVersion} | Ras Ali Labs`}
        description={`Download the official Ralion OS ${currentVersion} Windows desktop app. Online-first, offline-capable, with Mari AI and automatic cloud sync.`}
        canonical="https://rasalilabs.com/downloads/ralion"
      />

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products/ralion-os" className="hover:text-white transition-colors">Ralion OS</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">Download v{currentVersion}</span>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Official Download Center • Version {currentVersion}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            Download Ralion OS
          </h1>
          <p className="text-brand-gold font-bold text-sm uppercase tracking-widest mb-4">
            Empowered to Prosper — AI Business Operating System
          </p>
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            Install the full Ralion OS desktop workspace for Mari AI, business operations, cloud sync and supported offline work.
          </p>
        </div>

        <div className="bg-[#252525] border border-brand-gold/50 rounded-3xl p-8 md:p-10 mb-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 px-6 py-2 bg-brand-gold text-black text-xs font-extrabold uppercase tracking-wider rounded-bl-2xl">
            {hasNativeRelease ? 'Recommended for your device' : 'Windows release available'}
          </div>

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-xs font-bold">
                <ShieldCheck size={16} /> Detected: {userOS === 'Windows' ? 'Windows 11 / 10 x64' : userOS}
              </div>

              <h2 className="text-3xl font-extrabold text-white">
                {hasNativeRelease
                  ? `Download Ralion OS for ${userOS}`
                  : 'Ralion OS for Windows is available now'}
              </h2>

              {!hasNativeRelease && (
                <p className="text-amber-300/80 text-xs max-w-xl">
                  We detected {userOS}. The current public desktop build is Windows x64; native macOS and Linux packages will be published separately when validated.
                </p>
              )}

              <p className="text-white/70 text-xs font-mono">
                Package: {recommendedRelease?.filename} • Version {recommendedRelease?.version || currentVersion} • Size: {recommendedRelease?.filesizeFormatted || '85.06 MB'}
              </p>

              <p className="text-white/50 text-xs max-w-xl">
                Official Windows x64 installer built and validated by the Ralion OS release pipeline. Online-first, offline-capable, and designed to sync supported local changes when connectivity returns.
              </p>
            </div>

            <button
              onClick={() => handleDownload(recommendedRelease)}
              className="py-5 px-9 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-3 shrink-0"
            >
              <Download size={20} /> Download Windows Installer (v{recommendedRelease?.version || currentVersion})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mb-16">
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-6">
              <Monitor size={24} />
            </div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-xl font-bold text-white">Windows 10 / 11</h3>
              <span className="px-2.5 py-0.5 rounded bg-white/10 text-brand-gold text-[10px] font-bold">v{windowsRelease?.version || currentVersion}</span>
            </div>
            <p className="text-white/50 text-xs font-mono mb-4">{windowsRelease?.filename}</p>

            <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-4 mb-6">
              <div className="flex justify-between"><span>Architecture:</span><span className="text-white font-medium">{windowsRelease?.architecture || 'x64'}</span></div>
              <div className="flex justify-between"><span>File Size:</span><span className="text-white font-medium">{windowsRelease?.filesizeFormatted || '85.06 MB'}</span></div>
              <div className="flex justify-between"><span>Release:</span><span className="text-white font-medium">{windowsRelease?.releaseDate || '2026-09-17'}</span></div>
            </div>

            <div className="bg-black/50 border border-white/10 p-3 rounded-xl mb-6">
              <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                <span>SHA-256 Checksum</span>
                <button
                  onClick={() => handleCopySha(windowsRelease?.checksum)}
                  className="text-brand-gold hover:underline flex items-center gap-1 font-sans"
                >
                  {copiedSha === windowsRelease?.checksum ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Hash</>}
                </button>
              </div>
              <div className="font-mono text-[9px] text-white/70 break-all">{windowsRelease?.checksum}</div>
            </div>

            <button
              onClick={() => handleDownload(windowsRelease)}
              className="w-full py-4 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} /> Download Ralion OS for Windows
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-[#252525] border border-purple-400/20 rounded-3xl p-8 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/20 text-purple-300 flex items-center justify-center mb-6">
                <Bot size={24} />
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-purple-300 mb-2">Desktop optional</div>
              <h3 className="text-2xl font-extrabold text-white mb-3">Only need Mari AI?</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-6">
                You do not need to install Ralion OS to use Mari. Start in the browser, deploy the Mari website widget, or use API access where included. You can move into the full Ralion OS workspace later without starting your business setup again.
              </p>
            </div>
            <Link
              to="/mari-ai"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-500 hover:bg-purple-400 px-5 py-4 text-xs font-extrabold transition-colors"
            >
              Explore Mari AI <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionDownload;
