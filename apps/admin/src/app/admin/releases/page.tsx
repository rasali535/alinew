'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Upload, Download, Shield, Plus, Check, RefreshCw, Layers, Monitor, HardDrive } from 'lucide-react';

interface ReleaseRecord {
  id: string;
  version: string;
  platform: string;
  fileName: string;
  fileSize: number;
  isLatest: boolean;
  status: 'published' | 'draft' | 'archived';
  createdAt: string;
}

const initialReleases: ReleaseRecord[] = [
  { id: 'rel-1', version: '2.4.2', platform: 'windows', fileName: 'ralion-desktop-2.4.2-setup.exe', fileSize: 152048576, isLatest: true, status: 'published', createdAt: '2026-07-28' },
  { id: 'rel-2', version: '2.4.1', platform: 'windows', fileName: 'ralion-desktop-2.4.1-setup.exe', fileSize: 148900000, isLatest: false, status: 'archived', createdAt: '2026-07-20' },
];

export default function AdminReleasesPage() {
  const [releases, setReleases] = useState(initialReleases);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newVersion, setNewVersion] = useState('2.4.3');
  const [newPlatform, setNewPlatform] = useState('windows');
  const [newFileName, setNewFileName] = useState('ralion-desktop-2.4.3-setup.exe');
  const [newNotes, setNewNotes] = useState('');

  const toggleLatest = (id: string) => {
    setReleases(prev => prev.map(r => ({
      ...r,
      isLatest: r.id === id
    })));
  };

  const handlePublish = () => {
    if (!newVersion || !newFileName) return;
    const created: ReleaseRecord = {
      id: `rel-${Date.now()}`,
      version: newVersion,
      platform: newPlatform,
      fileName: newFileName,
      fileSize: 155000000,
      isLatest: true,
      status: 'published',
      createdAt: new Date().toISOString().split('T')[0]
    };

    setReleases(prev => [created, ...prev.map(r => r.platform === newPlatform ? { ...r, isLatest: false } : r)]);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-red-900/30 bg-red-950/20 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-red-400" />
            <span className="font-black text-sm text-white">Ras Ali Labs Admin — Release Management</span>
            <Badge variant="danger" className="text-[10px]">INTERNAL</Badge>
          </div>
          <Button variant="primary" size="sm" onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4" /> Publish New Release
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-black text-white">Release Management & Downloads</h1>
          <p className="text-xs text-zinc-400 mt-1">Manage desktop installer versions, inspect release metadata, and monitor download analytics.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Release', value: 'v2.4.2', icon: Monitor, color: 'emerald' },
            { label: 'Total Downloads', value: '1,428', icon: Download, color: 'blue' },
            { label: 'Registered Devices', value: '7', icon: HardDrive, color: 'purple' },
            { label: 'Storage Bucket', value: '152 MB', icon: Layers, color: 'amber' },
          ].map((s, i) => (
            <Card key={i} className="p-5">
              <div className="text-xl mb-1">{<s.icon className="w-5 h-5 text-blue-400" />}</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-2">{s.label}</div>
              <div className="text-xl font-black text-white mt-0.5">{s.value}</div>
            </Card>
          ))}
        </div>

        {/* Releases Table */}
        <Card>
          <CardHeader><CardTitle>Release History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4 text-left">Version</th>
                  <th className="p-4 text-left">Platform</th>
                  <th className="p-4 text-left">File Name</th>
                  <th className="p-4 text-left">File Size</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Published</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {releases.map(r => (
                  <tr key={r.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      {r.version}
                      {r.isLatest && <Badge variant="success" className="text-[9px]">LATEST</Badge>}
                    </td>
                    <td className="p-4 uppercase font-mono text-zinc-400">{r.platform}</td>
                    <td className="p-4 font-mono text-zinc-300">{r.fileName}</td>
                    <td className="p-4 font-mono text-zinc-400">{(r.fileSize / (1024 * 1024)).toFixed(0)} MB</td>
                    <td className="p-4"><Badge variant={r.status === 'published' ? 'success' : 'default'} className="capitalize">{r.status}</Badge></td>
                    <td className="p-4 font-mono text-zinc-500">{r.createdAt}</td>
                    <td className="p-4 text-right">
                      {!r.isLatest && (
                        <Button variant="outline" size="sm" onClick={() => toggleLatest(r.id)}>Make Latest</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Publish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4">
            <h2 className="font-black text-white text-lg">Publish New Release</h2>
            
            <div>
              <label className="text-xs font-semibold text-zinc-300">Version Number</label>
              <input type="text" value={newVersion} onChange={e => setNewVersion(e.target.value)} placeholder="e.g. 2.4.3" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Platform</label>
              <select value={newPlatform} onChange={e => setNewPlatform(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white">
                <option value="windows">Windows (x64 NSIS)</option>
                <option value="mac">macOS (DMG)</option>
                <option value="linux">Linux (AppImage)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">File Name</label>
              <input type="text" value={newFileName} onChange={e => setNewFileName(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white font-mono" />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Release Notes</label>
              <textarea rows={3} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Release highlights..." className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white resize-none" />
            </div>

            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handlePublish}>Publish & Set as Latest</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
