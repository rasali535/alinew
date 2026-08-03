'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { Sparkles, Send, Bot, User, Zap, Database, FileText, CheckCircle2, ArrowRight, CornerDownLeft, RefreshCw, Upload, Search, Plus } from 'lucide-react';
import { processMariQuery, callMariAiApi, executeMariAction, mariKnowledgeManager, MariActionPayload, KnowledgeDocument } from '@ralion/ai';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'MARI';
  text: string;
  actionsSuggested?: MariActionPayload[];
  ragContext?: string;
  timestamp: string;
  modelUsed?: string;
}

export default function MariAiPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-1',
      sender: 'MARI',
      text: 'Welcome to the Mari AI Intelligence Command Center by Ras Ali Labs. Powered by multi-model AI/ML API routing (DeepSeek R1, Claude 3.5 Sonnet, Qwen Coder, Gemini Flash, Flux & Kling AI Video).',
      timestamp: '12:00 PM'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [executedActions, setExecutedActions] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'KNOWLEDGE' | 'ACTIONS'>('CHAT');

  // Knowledge Base upload state
  const [documentsList, setDocumentsList] = useState<KnowledgeDocument[]>(mariKnowledgeManager.getDocuments());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'SOP' as const, content: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string>('');

  const promptSuggestions = [
    'Analyze CRM deals and sales performance',
    'Write a promotional social campaign draft',
    'Fix SQL query for customer order summary',
    'Generate an image of a modern executive dashboard',
    'Create a video of clouds over a mountain'
  ];

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    const ragSearch = mariKnowledgeManager.searchKnowledgeBase(queryText);
    const ruleResponse = processMariQuery(queryText);
    const apiResult = await callMariAiApi(queryText);

    let answerText = '';
    let modelUsedStr = '';

    if (apiResult) {
      answerText = apiResult.text;
      modelUsedStr = `${apiResult.modelInfo.category} (${apiResult.modelInfo.model})`;
    } else {
      answerText = ruleResponse.answer;
    }

    const mariMsg: ChatMessage = {
      id: `mari-${Date.now()}`,
      sender: 'MARI',
      text: answerText,
      actionsSuggested: ruleResponse.suggestedActions as MariActionPayload[],
      ragContext: ragSearch.includes('No matching') ? undefined : ragSearch,
      modelUsed: modelUsedStr,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, mariMsg]);
    setIsProcessing(false);
  };

  const handleActionExecute = async (action: MariActionPayload) => {
    const res = await executeMariAction(action);
    const actionLabel = action.label || action.title || action.type;
    if (res.success) {
      setExecutedActions(prev => [`Executed: ${actionLabel} — ${res.message}`, ...prev]);
      if (action.type === 'NAVIGATE' && res.outputData?.route) {
        router.push(res.outputData.route);
      }
    }
  };

  const handleUploadDoc = () => {
    if (!newDoc.title || !newDoc.content) return;
    const created = mariKnowledgeManager.addDocument(newDoc);
    setDocumentsList([...mariKnowledgeManager.getDocuments()]);
    setIsUploadModalOpen(false);
    setNewDoc({ title: '', category: 'SOP', content: '' });
  };

  const handleTestSearch = () => {
    if (!searchQuery.trim()) return;
    const res = mariKnowledgeManager.searchKnowledgeBase(searchQuery);
    setSearchResults(res);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto h-[calc(100vh-6rem)]">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5 shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Mari AI Platform Workspace</h1>
            <Badge variant="purple" className="font-mono">Build Prompt 3</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Mari helps you make smarter decisions, automate daily tasks, and unlock new opportunities.
          </p>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('CHAT')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'CHAT' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
          >
            Conversational Workspace
          </button>
          <button
            onClick={() => setActiveTab('KNOWLEDGE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'KNOWLEDGE' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
          >
            RAG Knowledge Base ({documentsList.length})
          </button>
          <button
            onClick={() => setActiveTab('ACTIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${activeTab === 'ACTIONS' ? 'bg-blue-600 text-white' : 'text-zinc-400'}`}
          >
            Mari Action Log ({executedActions.length})
          </button>
        </div>
      </div>

      {/* Main Workspace Body */}
      {activeTab === 'CHAT' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0 overflow-hidden">
          {/* Chat Messages Panel */}
          <Card className="lg:col-span-2 flex flex-col h-full bg-zinc-900/50 border-zinc-800/80">
            <CardHeader className="py-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-white">Live Mari AI Conversation Thread</span>
              </div>
              <Badge variant="success">AI/ML API Active (37d9bb...)</Badge>
            </CardHeader>

            {/* Scrollable Chat */}
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col gap-2 ${msg.sender === 'USER' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      msg.sender === 'USER'
                        ? 'bg-blue-600 text-white font-medium shadow-md rounded-tr-none'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-100 shadow-xl rounded-tl-none'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 gap-4 text-[10px] font-mono text-zinc-400 border-b border-zinc-800/60 pb-1">
                      <span className="font-bold text-blue-400 flex items-center gap-1">
                        {msg.sender === 'USER' ? <User className="w-3 h-3 text-white" /> : <Bot className="w-3 h-3 text-blue-400" />}
                        {msg.sender === 'USER' ? 'Enterprise User' : 'Mari AI Assistant'}
                        {msg.modelUsed && <Badge variant="purple" className="text-[9px] py-0 px-1.5 ml-1">{msg.modelUsed}</Badge>}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <p className="mt-1 whitespace-pre-wrap">{msg.text}</p>

                    {/* RAG Context Quote */}
                    {msg.ragContext && (
                      <div className="mt-3 p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200">
                        <span className="font-bold text-purple-400 flex items-center gap-1 mb-1">
                          <Database className="w-3 h-3" /> RAG Knowledge Vector Quote:
                        </span>
                        {msg.ragContext}
                      </div>
                    )}
                  </div>

                  {/* Executable Action Chips */}
                  {msg.actionsSuggested && msg.actionsSuggested.length > 0 && (
                    <div className="flex flex-wrap gap-2 max-w-[85%] mt-1">
                      {msg.actionsSuggested.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleActionExecute(action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-blue-500/40 text-xs font-semibold text-blue-300 hover:bg-blue-600/20 hover:border-blue-400 transition-all shadow-md group"
                        >
                          <Zap className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                          <span>{action.label || action.title || 'Execute Action'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {isProcessing && (
                <div className="flex items-center gap-2 text-xs text-blue-400 italic">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Mari AI is inspecting database context and RAG vectors...
                </div>
              )}
            </CardContent>

            {/* Input & Prompt Suggestions */}
            <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider shrink-0 mr-1">Suggested:</span>
                {promptSuggestions.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(prompt)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 font-medium whitespace-nowrap transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery(inputQuery)}
                  placeholder="Ask Mari: 'Show sales this month', 'Who has overdue payments?', or 'Summarize SLA policy'..."
                  className="w-full pl-4 pr-12 py-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 shadow-inner"
                />
                <button
                  onClick={() => handleSendQuery(inputQuery)}
                  disabled={!inputQuery.trim()}
                  className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </Card>

          {/* AI Intelligence Insights Side Panel */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" /> Mari AI RAG Status
                </CardTitle>
                <CardDescription>Vector index coverage for organization knowledge</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">Indexed Documents</span>
                  <span className="font-mono font-bold text-white">{documentsList.length} Documents</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-zinc-400">RAG Vector Chunks</span>
                  <span className="font-mono font-bold text-purple-400">{documentsList.reduce((s, d) => s + d.chunkCount, 0)} Chunks</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">Semantic Search Model</span>
                  <Badge variant="purple">GPT-4o Mini + RAG</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 overflow-y-auto">
              <CardHeader>
                <CardTitle className="text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Executed Mari Actions ({executedActions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {executedActions.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-mono">
                    {log}
                  </div>
                ))}
                {executedActions.length === 0 && (
                  <p className="text-xs text-zinc-500 italic text-center py-4">
                    No actions executed yet. Click any suggested action button in the conversation thread to execute.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Knowledge Base Tab */}
      {activeTab === 'KNOWLEDGE' && (
        <div className="flex flex-col gap-6 flex-1 min-h-0">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Organization RAG Knowledge Base</CardTitle>
                <CardDescription>Upload company SOPs, manuals, and policies for Mari AI contextual search</CardDescription>
              </div>
              <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
                <Plus className="w-4 h-4" /> Upload Knowledge Doc
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-4">Document Title</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Vector Chunks</th>
                      <th className="p-4">Indexed Status</th>
                      <th className="p-4">Created Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {documentsList.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400" />
                          {doc.title}
                        </td>
                        <td className="p-4 text-zinc-400">{doc.category}</td>
                        <td className="p-4 font-mono text-purple-400">{doc.chunkCount} Chunks</td>
                        <td className="p-4">
                          <Badge variant="purple">Vector Indexed</Badge>
                        </td>
                        <td className="p-4 font-mono text-zinc-400">{doc.createdAt.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* RAG Vector Search Tester */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-400" /> Test Semantic RAG Vector Search
              </CardTitle>
              <CardDescription>Simulate vector retrieval over indexed company knowledge</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 'What is the SLA uptime guarantee?' or 'Customs border procedure'"
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white"
                />
                <Button variant="primary" size="sm" onClick={handleTestSearch}>Search Vectors</Button>
              </div>

              {searchResults && (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-purple-300 whitespace-pre-wrap">
                  {searchResults}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Action Logs Tab */}
      {activeTab === 'ACTIONS' && (
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Mari AI Action Execution History</CardTitle>
            <CardDescription>Audit log of all automated Mari AI task and report dispatches</CardDescription>
          </CardHeader>
          <CardContent className="p-4 flex flex-col gap-3">
            {executedActions.map((log, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                {log}
              </div>
            ))}
            {executedActions.length === 0 && (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No actions have been triggered in this session yet.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Upload Modal */}
      <Modal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} title="Upload Organization Knowledge Document">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Document Title</label>
            <input
              type="text"
              value={newDoc.title}
              onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
              placeholder="e.g. Standard Operating Procedure for Client Intake"
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Category</label>
            <select
              value={newDoc.category}
              onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            >
              <option value="SOP">Standard Operating Procedure (SOP)</option>
              <option value="POLICY">Company Policy</option>
              <option value="MANUAL">Manual / User Guide</option>
              <option value="PRODUCT">Product Specification</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Document Content (Text for Vector Chunking)</label>
            <textarea
              rows={5}
              value={newDoc.content}
              onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
              placeholder="Paste full text of policy or manual..."
              className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white"
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleUploadDoc} className="bg-purple-600 hover:bg-purple-500 font-bold">
              <Upload className="w-4 h-4" /> Index Vector & Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
