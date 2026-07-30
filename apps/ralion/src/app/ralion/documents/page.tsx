'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { generateEnterpriseDocument, GeneratedDocumentResult } from '@ralion/core';
import { Database, Search, Cpu, Folder, FileText, Upload, Sparkles, Download, Eye, Lock, Share2, Plus, FileCheck } from 'lucide-react';

interface DocItem {
  id: string;
  name: string;
  category: string;
  size: string;
  updated: string;
  ragIndexed: boolean;
}

const sampleDocs: DocItem[] = [
  { id: 'd1', name: 'Ras_Ali_Labs_Company_SOP_2026.pdf', category: 'Company Policy', size: '2.4 MB', updated: 'Yesterday', ragIndexed: true },
  { id: 'd2', name: 'Enterprise_Service_Agreement_Template.docx', category: 'Legal Contracts', size: '480 KB', updated: 'Jul 20', ragIndexed: true },
  { id: 'd3', name: 'Botswana_Customs_Clearance_Checklist.pdf', category: 'Logistics Docs', size: '1.1 MB', updated: 'Jul 18', ragIndexed: false },
  { id: 'd4', name: 'Ralion_Health_Clinical_Protocol_V1.pdf', category: 'Health Protocol', size: '3.8 MB', updated: 'Jul 15', ragIndexed: true },
];

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>(sampleDocs);
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genForm, setGenForm] = useState({
    templateType: 'QUOTE' as const,
    clientName: 'Kalahari Mining Ltd',
    clientEmail: 'lesedi@kalaharimining.bw',
    itemDesc: 'Ralion Platform Professional SaaS Subscription (Annual)',
    itemPrice: '45000'
  });
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocumentResult | null>(null);

  // Vector DB State
  const [memoryInput, setMemoryInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAddMemory = async () => {
    if (!memoryInput.trim()) return;
    setIsProcessing(true);
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      const res = await ipc.invoke('ai-memory-add', {
        content: memoryInput,
        metadata: { source: 'User Note', date: new Date().toISOString() }
      });
      if (res.success) {
        setMemoryInput('');
        alert('Added to local Ralion Memory successfully!');
      } else {
        alert('Failed to add memory: ' + res.error);
      }
    } else {
      alert('Local Vector DB is only available in the Ralion Desktop Application.');
    }
    setIsProcessing(false);
  };

  const handleSearchMemory = async () => {
    if (!searchQuery.trim()) return;
    setIsProcessing(true);
    const ipc = (window as any).electron?.ipcRenderer;
    if (ipc) {
      const res = await ipc.invoke('ai-memory-search', {
        query: searchQuery,
        limit: 3
      });
      if (res.success) {
        setSearchResults(res.results);
      } else {
        alert('Search failed: ' + res.error);
      }
    } else {
      alert('Local Vector DB is only available in the Ralion Desktop Application.');
    }
    setIsProcessing(false);
  };

  const handleGenerateDoc = () => {
    const res = generateEnterpriseDocument({
      templateType: genForm.templateType,
      orgName: 'Ras Ali Enterprises',
      clientName: genForm.clientName,
      clientEmail: genForm.clientEmail,
      items: [{ description: genForm.itemDesc, qty: 1, unitPrice: parseFloat(genForm.itemPrice) || 45000 }],
      notes: 'Payment due within 14 days of invoice issue.'
    });

    setGeneratedDoc(res);
    const newDocItem: DocItem = {
      id: res.documentId,
      name: res.fileName,
      category: 'Generated Document',
      size: '150 KB',
      updated: 'Just now',
      ragIndexed: true
    };
    setDocs(prev => [newDocItem, ...prev]);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Central Document Management</h1>
            <Badge variant="primary">Build Prompt 2</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Upload files, manage folder hierarchy, generate official PDF templates, and feed Mari AI Knowledge Base.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="glass" size="sm" onClick={() => setIsGenModalOpen(true)}>
            <FileCheck className="w-4 h-4 text-purple-400" /> Generate PDF Template
          </Button>
          <Button variant="primary" size="sm">
            <Upload className="w-4 h-4" /> Upload Files
          </Button>
        </div>
      </div>

      {/* Document Folders Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { name: 'Company SOPs', count: '14 Files' },
          { name: 'Legal Contracts', count: '8 Files' },
          { name: 'Financial Receipts', count: '42 Files' },
          { name: 'Mari AI Knowledge Base', count: '19 Indexed Docs' },
        ].map((folder, idx) => (
          <Card key={idx} className="p-4 hover:border-blue-500/40 cursor-pointer transition-all">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <Folder className="w-5 h-5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-bold text-white">{folder.name}</h4>
                <p className="text-[10px] text-zinc-400">{folder.count}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Document File Table */}
      <Card>
        <CardHeader>
          <CardTitle>Enterprise Document Storage</CardTitle>
          <CardDescription>Files stored with automatic Mari AI vector indexing</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Document Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">File Size</th>
                  <th className="p-4">Mari RAG Vector Status</th>
                  <th className="p-4">Updated</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      {doc.name}
                    </td>
                    <td className="p-4 text-zinc-400">{doc.category}</td>
                    <td className="p-4 font-mono text-zinc-400">{doc.size}</td>
                    <td className="p-4">
                      {doc.ragIndexed ? (
                        <Badge variant="purple" className="gap-1">
                          <Sparkles className="w-3 h-3" /> Mari RAG Ready
                        </Badge>
                      ) : (
                        <Badge variant="default">Pending Index</Badge>
                      )}
                    </td>
                    <td className="p-4 font-mono text-zinc-400">{doc.updated}</td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"><Eye className="w-3.5 h-3.5" /></button>
                        <button className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"><Download className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Ralion Knowledge Memory Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <Card className="border-purple-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" /> Ralion Knowledge Memory
            </CardTitle>
            <CardDescription>Add unstructured data to your offline vector database.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              className="w-full h-32 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
              placeholder="Paste any company knowledge, policies, or notes here. Mari AI will vectorize it locally."
              value={memoryInput}
              onChange={(e) => setMemoryInput(e.target.value)}
            />
            <Button variant="primary" onClick={handleAddMemory} disabled={isProcessing} className="w-full bg-purple-600 hover:bg-purple-700">
              {isProcessing ? 'Processing...' : 'Store in Local Vector DB'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-400" /> Vector Semantic Search
            </CardTitle>
            <CardDescription>Search offline data using semantic meaning instead of keywords.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                placeholder="Ask a question or search semantic context..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Button variant="primary" onClick={handleSearchMemory} disabled={isProcessing}>
                Search
              </Button>
            </div>
            
            <div className="space-y-2 mt-4 max-h-48 overflow-y-auto pr-2">
              {searchResults.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-4">No results yet.</p>
              ) : (
                searchResults.map((res: any, idx: number) => (
                  <div key={idx} className="p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <p className="text-[11px] text-white font-medium mb-1 line-clamp-3">{res.content}</p>
                    <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500">
                      <span>Source: {res.metadata?.source || 'Note'}</span>
                      <span className="text-emerald-400">Similarity: {(1 - res.distance).toFixed(4)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Document Generator Modal */}
      <Modal isOpen={isGenModalOpen} onClose={() => setIsGenModalOpen(false)} title="Enterprise PDF Document Generator">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Document Template Type</label>
            <select
              value={genForm.templateType}
              onChange={(e) => setGenForm({ ...genForm, templateType: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            >
              <option value="QUOTE">Official Quote / Proposal</option>
              <option value="INVOICE">Executive Tax Invoice</option>
              <option value="CLINICAL_INTAKE">Clinical Intake Record (Health)</option>
              <option value="TRANSPORT_MANIFEST">Transport Border Manifest (Logistics)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Client Name</label>
              <input
                type="text"
                value={genForm.clientName}
                onChange={(e) => setGenForm({ ...genForm, clientName: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">Client Email</label>
              <input
                type="email"
                value={genForm.clientEmail}
                onChange={(e) => setGenForm({ ...genForm, clientEmail: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Service Description & Pricing ($)</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <input
                type="text"
                value={genForm.itemDesc}
                onChange={(e) => setGenForm({ ...genForm, itemDesc: e.target.value })}
                className="col-span-2 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
              <input
                type="number"
                value={genForm.itemPrice}
                onChange={(e) => setGenForm({ ...genForm, itemPrice: e.target.value })}
                className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
              />
            </div>
          </div>

          <Button variant="primary" size="sm" onClick={handleGenerateDoc} className="mt-2 bg-gradient-to-r from-blue-600 to-purple-600 font-bold">
            <FileCheck className="w-4 h-4" /> Generate Official Document
          </Button>

          {/* Generated Document Text Output Preview */}
          {generatedDoc && (
            <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-zinc-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
              {generatedDoc.formattedText}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
