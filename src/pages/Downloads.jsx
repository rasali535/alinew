import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllReleases } from '../data/releases';
import { triggerBinaryDownload } from '../lib/downloadValidator';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Download,
  Monitor,
  ShieldCheck,
  Check,
  Laptop,
  Copy,
  ExternalLink,
  Cloud,
  FileCheck,
  RefreshCw
} from 'lucide-react';

const Downloads = () => {
  const [userOS, setUserOS] = useState('Windows');
  const [copiedSha, setCopiedSha] = useState('');

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

  const releases = getAllReleases();

  const handleCopySha = (checksum) => {
    navigator.clipboard.writeText(checksum);
    setCopiedSha(checksum);
    setTimeout(() => setCopiedSha(''), 2000);
  };

  const handleDownload = (rel) => {
    analytics.trackDownload(rel.platform, rel.version, rel.product || 'Ralion Desktop');
    triggerBinaryDownload(rel.downloadUrl, rel.filename);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Download Ralion Desktop 2.4.1 | External CDN Verified Binary | Ras Ali Labs"
        description="Download production Ralion Desktop 2.4.1 installers for Windows 10/11 x64, macOS, and Linux. Served via high-speed external cloud CDN."
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Cloud size={14} /> Production Storage CDN • Version 2.4.1
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Ralion Desktop App
          </h1>
          <p className="text-brand-gold font-bold text-sm uppercase tracking-widest mb-4">
            Empowered to Prosper — External Cloud Storage & Auto-Update Engine Active
          </p>
          <p className="text-white/60 text-lg leading-relaxed mb-6">
            High-throughput desktop shell for business operations, Mari AI reasoning, and local workspace caching.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold">
            <Link
              to="/downloads/releases"
              className="inline-flex items-center gap-1.5 text-brand-gold hover:underline"
            >
              <ExternalLink size={14} /> View All Version Releases
            </Link>
            <span className="text-white/30">•</span>
            <a
              href="/latest.json"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-purple-400 hover:underline font-mono"
            >
              <RefreshCw size={14} /> Desktop Auto-Update Manifest (latest.json)
            </a>
          </div>
        </div>

        {/* OS Auto-Detected Banner */}
        <div className="bg-brand-gold/10 border border-brand-gold/30 rounded-2xl p-4 mb-8 flex items-center justify-between gap-4 max-w-3xl mx-auto text-xs">
          <div className="flex items-center gap-3 text-brand-gold">
            <ShieldCheck size={20} className="shrink-0" />
            <span>Detected OS: <strong className="text-white">{userOS}</strong>. Serving verified 64-bit installer via external high-speed cloud CDN.</span>
          </div>
        </div>

        {/* Dynamic Desktop Installers Grid (Windows x64, macOS, Linux) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {releases.map((rel) => {
            const isDetected = userOS.toLowerCase() === rel.platform.toLowerCase();
            return (
              <div
                key={rel.platform}
                className={`relative bg-[#252525] border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  isDetected
                    ? 'border-brand-gold shadow-2xl shadow-brand-gold/15 ring-1 ring-brand-gold/50'
                    : 'border-white/10 hover:border-white/30'
                }`}
              >
                {isDetected && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest">
                    Recommended for your Device
                  </span>
                )}

                <div>
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-6">
                    <Monitor size={24} />
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-2xl font-bold text-white">{rel.platform}</h3>
                    <span className="px-2.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-[10px] font-bold">
                      v{rel.version}
                    </span>
                  </div>

                  <p className="text-white/50 text-xs mb-3">{rel.product || 'Ralion Desktop'}</p>

                  <span className="inline-block px-2.5 py-0.5 rounded bg-white/10 text-white/80 font-mono text-[10px] font-bold mb-4">
                    {rel.filename}
                  </span>

                  <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-4 mb-6">
                    <div className="flex justify-between">
                      <span>Architecture:</span>
                      <span className="text-white font-medium">{rel.architecture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="text-white font-medium">{rel.filesizeFormatted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Release Date:</span>
                      <span className="text-brand-gold font-medium">{rel.releaseDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Storage Provider:</span>
                      <span className="text-emerald-400 font-medium">External Cloud CDN</span>
                    </div>
                  </div>

                  {/* SHA-256 Checksum Display */}
                  <div className="bg-black/50 border border-white/10 p-3 rounded-xl mb-6">
                    <div className="flex items-center justify-between text-[10px] text-white/50 mb-1">
                      <span>SHA-256 Checksum</span>
                      <button
                        onClick={() => handleCopySha(rel.checksum)}
                        className="text-brand-gold hover:underline flex items-center gap-1 font-sans"
                      >
                        {copiedSha === rel.checksum ? (
                          <><Check size={12} /> Copied</>
                        ) : (
                          <><Copy size={12} /> Copy Hash</>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-[9px] text-white/70 truncate">{rel.checksum}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownload(rel)}
                  className={`w-full py-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                    isDetected
                      ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-lg shadow-brand-gold/20 hover:scale-105'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Download size={16} /> Download {rel.filename}
                </button>
              </div>
            );
          })}
        </div>

        {/* Release Notes Overview */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl mb-12">
          <div className="flex items-center gap-2 text-brand-gold font-bold text-sm mb-4">
            <FileCheck size={18} /> Ralion v2.4.1 Release Notes & Production Verification
          </div>
          <ul className="space-y-2 text-xs text-white/80 list-disc list-inside leading-relaxed">
            {releases[0]?.releaseNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
