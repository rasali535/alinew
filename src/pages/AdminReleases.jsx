import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAllReleases } from '../data/releases';
import SEO from '../components/common/SEO';
import { ShieldCheck, Plus, Check, Save, Lock, Edit3, Trash2, Download, AlertCircle } from 'lucide-react';

const AdminReleases = () => {
  const { user, openAuthModal } = useAuth();
  const [releases, setReleases] = useState(getAllReleases());
  const [newVersion, setNewVersion] = useState('2.4.2');
  const [newPlatform, setNewPlatform] = useState('Windows');
  const [newFilename, setNewFilename] = useState('ralion-desktop-2.4.2-setup.exe');
  const [newFilesize, setNewFilesize] = useState('155.0 MB');
  const [newChecksum, setNewChecksum] = useState('');
  const [newDownloadUrl, setNewDownloadUrl] = useState('');
  const [newNotes, setNewNotes] = useState('New bug fixes and performance updates');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleAddRelease = (e) => {
    e.preventDefault();
    const createdRelease = {
      version: newVersion,
      platform: newPlatform,
      architecture: newPlatform === 'Windows' ? 'x64' : newPlatform === 'macOS' ? 'Universal (M1/Intel)' : 'x86_64',
      filename: newFilename,
      filesizeFormatted: newFilesize,
      checksum: newChecksum || 'd4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5',
      releaseDate: new Date().toISOString().split('T')[0],
      downloadUrl: newDownloadUrl || `https://github.com/rasali535/ralion-os-/releases/download/v${newVersion}/${newFilename}`,
      enabled: true,
      releaseNotes: [newNotes]
    };

    setReleases([createdRelease, ...releases]);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const toggleReleaseState = (index) => {
    const updated = [...releases];
    updated[index].enabled = !updated[index].enabled;
    setReleases(updated);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO title="Admin Release Management | Ras Ali Labs" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10 pb-6 border-b border-white/10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-2">
              <ShieldCheck size={14} /> Ras Ali Labs Admin Control
            </div>
            <h1 className="text-3xl font-extrabold text-white">Admin Release Management</h1>
            <p className="text-white/50 text-xs mt-1">Publish desktop builds, manage SHA256 checksums, and toggle download availability.</p>
          </div>

          {!user && (
            <button
              onClick={() => openAuthModal('login')}
              className="py-2.5 px-5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Lock size={14} /> Admin SSO Sign In
            </button>
          )}
        </div>

        {savedSuccess && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check size={18} /> New Release Version Metadata Published Successfully!
          </div>
        )}

        {/* Add New Release Form */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 mb-12 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Plus size={20} className="text-brand-gold" /> Publish New Release Version
          </h3>

          <form onSubmit={handleAddRelease} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5">Version Number</label>
                <input
                  type="text"
                  required
                  value={newVersion}
                  onChange={(e) => setNewVersion(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5">Platform</label>
                <select
                  value={newPlatform}
                  onChange={(e) => {
                    setNewPlatform(e.target.value);
                    const ext = e.target.value === 'Windows' ? 'exe' : e.target.value === 'macOS' ? 'dmg' : 'AppImage';
                    setNewFilename(`ralion-desktop-${newVersion}-setup.${ext}`);
                  }}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold"
                >
                  <option value="Windows">Windows (x64 PE)</option>
                  <option value="macOS">macOS (dmg)</option>
                  <option value="Linux">Linux (AppImage)</option>
                </select>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5">Filename</label>
                <input
                  type="text"
                  required
                  value={newFilename}
                  onChange={(e) => setNewFilename(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5">Formatted File Size</label>
                <input
                  type="text"
                  value={newFilesize}
                  onChange={(e) => setNewFilesize(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5">SHA-256 Checksum</label>
                <input
                  type="text"
                  placeholder="Paste SHA256 binary hash..."
                  value={newChecksum}
                  onChange={(e) => setNewChecksum(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/70 text-xs font-semibold mb-1.5">Release Notes Summary</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-brand-gold"
              />
            </div>

            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center gap-2 shadow-lg shadow-brand-gold/20"
            >
              <Save size={16} /> Publish Release Version
            </button>
          </form>
        </div>

        {/* Existing Published Releases Table */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-xl font-bold text-white mb-6">Published Release History</h3>

          <div className="space-y-4">
            {releases.map((rel, idx) => (
              <div
                key={idx}
                className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-white text-sm">{rel.platform} — v{rel.version}</span>
                    <span className="text-white/40 text-xs font-mono">{rel.filename}</span>
                  </div>
                  <div className="text-white/50 text-xs truncate max-w-xl font-mono">
                    SHA256: {rel.checksum}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleReleaseState(idx)}
                    className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all ${
                      rel.enabled
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {rel.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReleases;
