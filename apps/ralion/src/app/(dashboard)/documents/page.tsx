'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Database, Search, Folder, FileText, Upload, Sparkles, Download, Trash2, Plus, Loader2 } from 'lucide-react';
import { authFetch } from '@/lib/api-config';

interface DocItem {
  id: string;
  name: string;
  category: string;
  mime_type?: string | null;
  size_bytes: number;
  rag_status: 'PENDING' | 'READY' | 'UNSUPPORTED' | 'FAILED';
  created_at: string;
  updated_at: string;
}

interface SearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  document?: { name?: string; category?: string; rag_status?: string };
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('GENERAL');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState({ name: '', category: 'KNOWLEDGE', content: '' });

  const loadDocs = async () => {
    setLoading(true);
    setError(null);
    const res = await authFetch('/api/documents');
    const body = await res.json().catch(() => ({}));
    if (!res.ok) setError(body.error || 'Failed to load documents.');
    else setDocs(body.documents || []);
    setLoading(false);
  };

  useEffect(() => { void loadDocs(); }, []);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    docs.forEach(d => map.set(d.category || 'GENERAL', (map.get(d.category || 'GENERAL') || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [docs]);

  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append('file', file);
    form.append('category', category);
    const res = await authFetch('/api/documents', { method: 'POST', body: form });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) return setError(body.error || 'Upload failed.');
    setDocs(prev => [body.document, ...prev]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const createKnowledgeNote = async () => {
    if (!note.name.trim() || !note.content.trim()) return;
    setUploading(true);
    const res = await authFetch('/api/documents', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: note.name.endsWith('.txt') ? note.name : `${note.name}.txt`, category: note.category, content: note.content, mimeType: 'text/plain' }),
    });
    const body = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) return setError(body.error || 'Failed to create knowledge note.');
    setDocs(prev => [body.document, ...prev]);
    setNote({ name: '', category: 'KNOWLEDGE', content: '' });
    setNoteOpen(false);
  };

  const downloadDoc = async (id: string) => {
    const res = await authFetch(`/api/documents?downloadId=${encodeURIComponent(id)}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.url) return setError(body.error || 'Failed to prepare download.');
    window.open(body.url, '_blank', 'noopener,noreferrer');
  };

  const deleteDoc = async (id: string) => {
    const res = await authFetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setError(body.error || 'Delete failed.');
    setDocs(prev => prev.filter(d => d.id !== id));
    setSearchResults(prev => prev.filter(r => r.documentId !== id));
  };

  const searchKnowledge = async () => {
    if (!searchQuery.trim()) return setSearchResults([]);
    setSearching(true);
    const res = await authFetch(`/api/documents/search?q=${encodeURIComponent(searchQuery.trim())}`);
    const body = await res.json().catch(() => ({}));
    setSearching(false);
    if (!res.ok) return setError(body.error || 'Knowledge search failed.');
    setSearchResults(body.results || []);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div><div className="flex items-center gap-2"><h1 className="text-2xl font-black tracking-tight text-white">Central Document Management</h1><Badge variant="success">Private Storage</Badge></div><p className="text-xs text-zinc-400 mt-1">Private files, signed downloads, metadata and tenant-scoped knowledge retrieval for Mari.</p></div>
        <div className="flex gap-2"><Button variant="glass" size="sm" onClick={() => setNoteOpen(true)}><Plus className="w-4 h-4" /> Knowledge Note</Button><Button variant="primary" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload Files'}</Button><input ref={fileRef} type="file" className="hidden" onChange={e => e.target.files?.[0] && void uploadFile(e.target.files[0])} /></div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-xs text-rose-300">{error}</div>}

      <div className="flex items-center gap-3"><label className="text-xs text-zinc-400">Upload category</label><select value={category} onChange={e => setCategory(e.target.value)} className="rounded-lg bg-zinc-900 border border-zinc-800 px-3 py-2 text-xs text-white"><option>GENERAL</option><option>CONTRACT</option><option>FINANCE</option><option>POLICY</option><option>MARKETING</option><option>KNOWLEDGE</option></select></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{categories.length ? categories.map(([name, count]) => <Card key={name} className="p-4"><div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400"><Folder className="w-5 h-5" /></div><div><h4 className="text-xs font-bold text-white">{name}</h4><p className="text-[10px] text-zinc-400">{count} file{count === 1 ? '' : 's'}</p></div></div></Card>) : <Card className="p-4 sm:col-span-2 lg:col-span-4"><p className="text-xs text-zinc-500 text-center">No folders yet — categories appear as documents are added.</p></Card>}</div>

      <Card><CardHeader><CardTitle>Workspace Document Storage</CardTitle><CardDescription>Text-readable uploads are indexed automatically. Binary formats that cannot be safely extracted are shown as unsupported instead of being misreported as indexed.</CardDescription></CardHeader><CardContent className="p-0">{loading ? <div className="flex justify-center py-12 text-zinc-400"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs text-zinc-300"><thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400"><tr><th className="p-4">Document</th><th className="p-4">Category</th><th className="p-4">Size</th><th className="p-4">Knowledge Status</th><th className="p-4">Uploaded</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-zinc-800/60">{docs.map(doc => <tr key={doc.id}><td className="p-4 font-bold text-white"><span className="flex items-center gap-2"><FileText className="w-4 h-4 text-blue-400" />{doc.name}</span></td><td className="p-4">{doc.category}</td><td className="p-4 font-mono">{formatBytes(Number(doc.size_bytes || 0))}</td><td className="p-4"><Badge variant={doc.rag_status === 'READY' ? 'purple' : doc.rag_status === 'FAILED' ? 'danger' : 'default'}>{doc.rag_status === 'READY' ? <><Sparkles className="w-3 h-3 mr-1" /> Searchable</> : doc.rag_status}</Badge></td><td className="p-4">{new Date(doc.created_at).toLocaleString()}</td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => void downloadDoc(doc.id)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"><Download className="w-3.5 h-3.5" /></button><button onClick={() => void deleteDoc(doc.id)} className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button></div></td></tr>)}{!docs.length && <tr><td colSpan={6} className="p-10 text-center text-zinc-500">No documents uploaded yet.</td></tr>}</tbody></table></div>}</CardContent></Card>

      <Card className="border-purple-500/30"><CardHeader><CardTitle className="flex items-center gap-2"><Database className="w-5 h-5 text-purple-400" /> Workspace Knowledge Retrieval</CardTitle><CardDescription>Search indexed document chunks. Results are isolated to the active workspace.</CardDescription></CardHeader><CardContent><div className="flex gap-2"><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void searchKnowledge()} placeholder="Search policies, notes, contracts or uploaded knowledge…" className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white" /><Button variant="primary" disabled={searching} onClick={() => void searchKnowledge()}><Search className="w-4 h-4" /> {searching ? 'Searching…' : 'Search'}</Button></div><div className="space-y-2 mt-4">{searchResults.map(result => <div key={result.id} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800"><div className="flex justify-between gap-3"><p className="text-[11px] text-white leading-relaxed">{result.content}</p><Badge>{result.document?.name || 'Document'}</Badge></div></div>)}{searchQuery && !searching && !searchResults.length && <p className="text-xs text-zinc-500 text-center py-4">No indexed matches.</p>}</div></CardContent></Card>

      <Modal isOpen={noteOpen} onClose={() => setNoteOpen(false)} title="Add Searchable Knowledge Note"><div className="flex flex-col gap-4"><input value={note.name} onChange={e => setNote(v => ({ ...v, name: e.target.value }))} placeholder="Note name" className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><select value={note.category} onChange={e => setNote(v => ({ ...v, category: e.target.value }))} className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"><option>KNOWLEDGE</option><option>POLICY</option><option>MARKETING</option><option>GENERAL</option></select><textarea value={note.content} onChange={e => setNote(v => ({ ...v, content: e.target.value }))} placeholder="Paste company knowledge here…" className="min-h-48 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" /><div className="flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => setNoteOpen(false)}>Cancel</Button><Button variant="primary" size="sm" disabled={uploading} onClick={() => void createKnowledgeNote()}>Save & Index</Button></div></div></Modal>
    </div>
  );
}
