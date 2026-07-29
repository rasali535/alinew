import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllReleases, getCurrentVersion } from '../data/releases';
import { triggerBinaryDownload } from '../lib/downloadValidator';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { Download, Monitor, Check, Copy, ShieldCheck, ChevronRight, FileCode, Layers } from 'lucide-react';

const Releases = () => {
  const releases = getAllReleases();
  const currentVersion = getCurrentVersion();
  const [copiedSha, setCopiedSha] = useState('');

  const handleCopySha = (checksum) => {
    navigator.clipboard.writeText(checksum);
    setCopiedSha(checksum);
    setTimeout(() => setCopiedSha(''), 2000);
  };

  const handleDownload = (rel) => {
    analytics.trackDownload(rel.platform, rel.version, 'Ralion Desktop');
    triggerBinaryDownload(rel.downloadUrl, rel.filename);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title={`Ralion ${currentVersion} Release Management | Ras Ali Labs`}
        description="Public release management page for Ralion Desktop installers. Download verified binaries for Windows, macOS, and Linux."
      />

      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/downloads" className="hover:text-white transition-colors">Downloads</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">Releases</span>
        </div>

        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
            Release Management Platform
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            Ralion Version {currentVersion}
          </h1>
          <p className="text-white/60 text-lg">
            Official versioned release packages for Windows x64, macOS, and Linux. Verified PE binary signatures.
          </p>
        </div>

        {/* Platform Downloads List */}
        <div className="space-y-6 mb-16">
          {releases.map((rel) => (
            <div
              key={rel.platform}
              className="bg-[#252525] border border-white/10 p-6 md:p-8 rounded-3xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 hover:border-brand-gold/30 transition-all shadow-xl"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0 mt-1">
                  <Monitor size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-white">{rel.platform} Installer</h3>
                    <span className="px-2.5 py-0.5 rounded bg-brand-gold text-black text-[10px] font-bold">
                      v{rel.version}
                    </span>
                    <span className="px-2.5 py-0.5 rounded bg-white/10 text-white/70 text-[10px] font-mono">
                      {rel.architecture}
                    </span>
                  </div>
                  <p className="text-white/50 text-xs mb-3">{rel.filename} • {rel.filesizeFormatted} • Released {rel.releaseDate}</p>

                  {/* SHA-256 Copy Action */}
                  <div className="flex items-center gap-2 text-xs text-white/70 bg-black/40 p-2.5 rounded-xl border border-white/5 font-mono max-w-xl">
                    <span className="text-white/40 text-[10px]">SHA256:</span>
                    <span className="truncate text-[10px]">{rel.checksum}</span>
                    <button
                      onClick={() => handleCopySha(rel.checksum)}
                      className="ml-auto text-brand-gold hover:underline flex items-center gap-1 font-sans text-[11px] shrink-0"
                    >
                      {copiedSha === rel.checksum ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDownload(rel)}
                className="py-3.5 px-7 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2 shrink-0 self-stretch lg:self-auto justify-center shadow-lg shadow-brand-gold/20"
              >
                <Download size={16} /> Download Package
              </button>
            </div>
          ))}
        </div>

        {/* System Requirements */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-4">Minimum System Requirements</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-white/70">
            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
              <h4 className="text-white font-bold mb-2">Windows 10 / 11 (x64)</h4>
              <p>Requires 64-bit Architecture, 4GB RAM minimum, 500MB free disk space. PE binary validated.</p>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
              <h4 className="text-white font-bold mb-2">macOS 11.0+</h4>
              <p>Universal Binary supporting Apple Silicon (M1/M2/M3/M4) & Intel Macs. 4GB RAM minimum.</p>
            </div>

            <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
              <h4 className="text-white font-bold mb-2">Linux (x86_64)</h4>
              <p>Ubuntu 20.04+, Debian 11+, or Fedora. AppImage & Debian package. 4GB RAM minimum.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Releases;
