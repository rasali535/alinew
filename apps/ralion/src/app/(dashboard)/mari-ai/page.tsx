'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Button, 
  Badge 
} from '@ralion/ui';
import { 
  Sparkles, 
  Send, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Database, 
  FileText, 
  Plus, 
  Upload, 
  RefreshCw, 
  Share2, 
  Users, 
  CheckSquare, 
  FolderPlus, 
  X, 
  ExternalLink,
  ChevronRight,
  Activity,
  Layers,
  Settings,
  Flame,
  CornerDownLeft,
  Bot
} from 'lucide-react';
import { 
  processMariQuery, 
  callMariAiApi, 
  executeMariAction, 
  mariKnowledgeManager, 
  MariActionPayload, 
  KnowledgeDocument 
} from '@ralion/ai';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active view tab: Customer Intelligence Command vs Admin Infrastructure
  const [activeTab, setActiveTab] = useState<'INTELLIGENCE' | 'KNOWLEDGE' | 'ADMIN_INFRA'>('INTELLIGENCE');

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'GOOD MORNING';
    if (hour < 18) return 'GOOD AFTERNOON';
    return 'GOOD EVENING';
  }, []);

  // Context & live telemetry states
  const [userName, setUserName] = useState('RAS ALI');
  const [userTier, setUserTier] = useState('COMMUNITY');
  const [activeFbPage, setActiveFbPage] = useState<any>(null);
  const [pipelineTotal, setPipelineTotal] = useState(84500);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm-welcome',
      sender: 'MARI',
      text: 'Good day! I have analyzed your workspace, active CRM pipeline, and Facebook Page telemetry. Your business is gaining positive momentum this week. How can I assist your strategy today?',
      timestamp: 'Just now',
      actionsSuggested: [
        { type: 'NAVIGATE', label: 'Open Growth Studio', payload: { route: '/growth' } },
        { type: 'NAVIGATE', label: 'Review CRM Pipeline', payload: { route: '/crm' } }
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Knowledge Documents State
  const [documentsList, setDocumentsList] = useState<KnowledgeDocument[]>(mariKnowledgeManager.getDocuments());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'SOP' as const, content: '' });

  // Recent Action History
  const [recentActions, setRecentActions] = useState<string[]>([
    'Synced Facebook Page live follower metrics (107 fans)',
    'Evaluated monthly CRM revenue pipeline ($84,500)',
    'Optimized short-form video engagement suggestions',
    'Verified POPIA/Meta privacy compliance trail',
  ]);

  // Initial load
  useEffect(() => {
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user?.fullName) setUserName(user.fullName.toUpperCase());
        if (user?.tier) setUserTier(user.tier.toUpperCase());
      });
    });

    if (typeof window !== 'undefined') {
      const savedContacts = localStorage.getItem('ralion_contacts');
      if (savedContacts) {
        try {
          const list = JSON.parse(savedContacts);
          const sum = list.reduce((acc: number, c: any) => acc + (Number(c.dealValue) || 0), 0);
          if (sum > 0) setPipelineTotal(sum);
        } catch {}
      }

      // Check selected FB page
      const savedPage = localStorage.getItem('ralion_selected_fb_page');
      if (savedPage) {
        try {
          setActiveFbPage(JSON.parse(savedPage));
        } catch {}
      }
    }
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle Query Submission
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
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
      setRecentActions(prev => [`Answered inquiry: "${queryText.slice(0, 40)}..."`, ...prev.slice(0, 7)]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `mari-err-${Date.now()}`,
        sender: 'MARI',
        text: `I encountered an unexpected connection issue: ${err.message || 'Please retry your query.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Action Execution
  const handleActionExecute = async (action: MariActionPayload) => {
    const res = await executeMariAction(action);
    const actionLabel = action.label || action.title || action.type;
    if (res.success) {
      setRecentActions(prev => [`Executed: ${actionLabel}`, ...prev.slice(0, 7)]);
      if (action.type === 'NAVIGATE' && (res.outputData?.route || (action.payload as any)?.route)) {
        const targetRoute = res.outputData?.route || (action.payload as any)?.route;
        router.push(targetRoute);
      }
    }
  };

  // Add Document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.title.trim() || !newDoc.content.trim()) return;

    mariKnowledgeManager.addDocument({
      title: newDoc.title.trim(),
      category: newDoc.category,
      content: newDoc.content.trim(),
    });

    setDocumentsList(mariKnowledgeManager.getDocuments());
    setNewDoc({ title: '', category: 'SOP', content: '' });
    setIsUploadModalOpen(false);
    setRecentActions(prev => [`Added knowledge source: ${newDoc.title}`, ...prev.slice(0, 7)]);
  };

  const promptSuggestions = [
    'Analyze my business',
    'Find opportunities',
    'Find risks',
    'Create growth plan',
    'Prepare weekly report',
    'Summarize today'
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. HERO & CONTEXTUAL BRIEFING HEADER
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-indigo-950/40 border border-purple-500/30 p-6 md:p-8 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/20 border border-purple-400/40">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Mari Online
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Database className="w-3 h-3" />
                  Knowledge Active
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  Context: {activeFbPage?.name || 'Ras Ali Labs'} — Facebook & CRM
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {greeting}, {userName}
              </h1>
              <p className="text-xs md:text-sm text-zinc-300 max-w-2xl mt-1 leading-relaxed">
                Here is your grounded enterprise briefing. Mari has synthesized your active CRM pipeline, Facebook Page engagement, and operational queues.
              </p>
            </div>
          </div>

          {/* Credits & Quick Actions */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2 w-full md:w-auto">
            <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center gap-3">
              <div className="flex flex-col text-left md:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Mari Credits</span>
                <span className="text-xs font-bold text-white font-mono">
                  {userTier === 'COMMUNITY' ? '8,420 / 10,000' : 'Unlimited Enterprise'}
                </span>
              </div>
              <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[84%]" />
              </div>
            </div>

            {/* Navigation Switcher Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('INTELLIGENCE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'INTELLIGENCE'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Intelligence Hub
              </button>
              <button
                onClick={() => setActiveTab('KNOWLEDGE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'KNOWLEDGE'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Knowledge ({documentsList.length})
              </button>
              <button
                onClick={() => setActiveTab('ADMIN_INFRA')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ADMIN_INFRA'
                    ? 'bg-zinc-800 text-zinc-200 shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Infrastructure & Routing Diagnostics"
              >
                <Settings className="w-3 h-3 inline mr-1" />
                Infra
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. MARI EXECUTIVE BRIEFING BANNER
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'INTELLIGENCE' && (
        <Card className="bg-zinc-900/90 border-purple-500/30 shadow-xl overflow-hidden">
          <CardHeader className="p-5 border-b border-zinc-800/80 bg-zinc-950/50">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">
                    Executive Briefing: Your business is gaining momentum
                  </CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    Real-time synthesis across active channels
                  </CardDescription>
                </div>
              </div>

              <Badge variant="purple" className="text-[10px] font-mono">
                Growth Score: 88 / 100
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block mb-1">
                1. What Changed
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                Facebook Page reach surged +38.4% with 107 verified fans. 3 high-value CRM proposals entered the final review phase ($84.5k pipeline).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block mb-1">
                2. Why It Matters
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                Engagement rate is 4.8% (outperforming regional industry benchmark by 1.2%). Timely follow-ups will maximize close velocity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/90 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
                  3. What Mari Recommends
                </span>
                <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                  Publish a midweek video reel to capture peak audience traffic and trigger automated follow-ups for open proposals.
                </p>
              </div>
              <div className="pt-3 mt-2 border-t border-zinc-800 flex items-center gap-2">
                <Link href="/growth" className="w-full">
                  <Button variant="primary" size="sm" className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">
                    Create Campaign <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          3. MARI INSIGHT CARDS (Opportunity, Risk, Trend, Recommendation)
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'INTELLIGENCE' && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Mari Strategic Insights
            </h2>
            <span className="text-xs text-zinc-500 font-mono">4 Grounded Signals</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Opportunity */}
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-purple-400 flex items-center gap-1.5">
                      🚀 Opportunity
                    </span>
                    <Badge variant="purple" className="text-[9px]">High Impact</Badge>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1.5">
                    Short-Form Video Engagement
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Video content is outperforming static image posts by 2.3× across connected audiences.
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-2 block">
                    Evidence: Last 30 days social telemetry
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <Link href="/growth">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-950/40">
                      Create Content <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 2. Risk */}
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-amber-500/40 transition-all flex flex-col justify-between">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1.5">
                      ⚠️ Operational Risk
                    </span>
                    <Badge variant="warning" className="text-[9px]">Attention</Badge>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1.5">
                    Pending Proposal Follow-Ups
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    2 high-value proposal contracts have exceeded 5 days in intake without scheduled touchpoints.
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-2 block">
                    Evidence: CRM Pipeline stage aging
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <Link href="/crm">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-amber-500/30 text-amber-300 hover:bg-amber-950/40">
                      Open CRM <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* 3. Trend */}
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-blue-500/40 transition-all flex flex-col justify-between">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                      📈 Regional Trend
                    </span>
                    <Badge variant="default" className="text-[9px]">SADC Index</Badge>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1.5">
                    B2B Enterprise Demand Surge
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Regional interest in sovereign business software and AI workflows has grown 42% this quarter.
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-2 block">
                    Evidence: SADC macro trade benchmarks
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSendQuery('Generate an executive market growth strategy for SADC B2B enterprise software.')}
                    className="w-full text-xs font-semibold border-blue-500/30 text-blue-300 hover:bg-blue-950/40"
                  >
                    Analyze Trend <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 4. Recommendation */}
            <Card className="bg-zinc-900/80 border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between">
              <CardContent className="p-4 flex flex-col justify-between h-full">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                      💡 Recommendation
                    </span>
                    <Badge variant="success" className="text-[9px]">Actionable</Badge>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1.5">
                    Wednesday 14:00 Campaign Push
                  </h3>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Schedule automated Facebook & LinkedIn updates on Wednesday at 14:00 for optimal audience reach.
                  </p>
                  <span className="text-[10px] text-zinc-500 font-mono mt-2 block">
                    Evidence: Audience peak activity model
                  </span>
                </div>
                <div className="pt-3 mt-3 border-t border-zinc-800">
                  <Link href="/growth">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-emerald-500/30 text-emerald-300 hover:bg-emerald-950/40">
                      Schedule Post <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          4. ASK MARI COMMAND CENTER & CONVERSATION HUB
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'INTELLIGENCE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Interaction Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="bg-zinc-900/90 border-zinc-800 shadow-2xl flex flex-col min-h-[480px]">
              <CardHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-white">Ask Mari Intelligence</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMessages([{
                      id: `m-${Date.now()}`,
                      sender: 'MARI',
                      text: 'Conversation reset. Mari is ready with your real-time workspace context.',
                      timestamp: 'Just now'
                    }])}
                    title="Clear history"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Clear
                  </button>
                </div>
              </CardHeader>

              {/* Messages Stream */}
              <CardContent className="p-4 flex-1 overflow-y-auto max-h-[380px] space-y-4">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${m.sender === 'USER' ? 'justify-end' : 'justify-start'}`}
                  >
                    {m.sender === 'MARI' && (
                      <div className="w-7 h-7 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      m.sender === 'USER' 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-zinc-950 border border-zinc-800/90 text-zinc-200'
                    }`}>
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* Suggested Action Chips */}
                      {m.actionsSuggested && m.actionsSuggested.length > 0 && (
                        <div className="pt-2.5 mt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-2">
                          {m.actionsSuggested.map((act, i) => (
                            <button
                              key={i}
                              onClick={() => handleActionExecute(act)}
                              className="px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-500/40 hover:bg-purple-900/60 text-purple-200 text-[11px] font-semibold flex items-center gap-1 transition-all"
                            >
                              <ArrowRight className="w-3 h-3 text-purple-400" />
                              {act.label || act.type}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-zinc-500 font-mono">
                        <span>{m.timestamp}</span>
                        {m.modelUsed && (
                          <span className="text-purple-400/80">{m.modelUsed}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {isProcessing && (
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 animate-pulse">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-purple-300 flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                      Mari is analyzing your query across workspace intelligence...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Composer & Quick Chips */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
                {/* Contextual Suggestion Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {promptSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(s)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white shrink-0 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Input Bar */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendQuery(inputQuery);
                  }}
                  className="relative flex items-center"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="What should I focus on today?"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!inputQuery.trim() || isProcessing}
                    className="absolute right-2 p-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-all shadow-md"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </Card>
          </div>

          {/* Right Column: Knowledge & Recent Actions (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Connected Knowledge Sources */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
              <CardHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-400" /> Mari Knowledge
                  </CardTitle>
                  <CardDescription className="text-[11px] text-zinc-400">
                    {documentsList.length} Grounded sources connected
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsUploadModalOpen(true)}
                  className="h-7 px-2 text-[11px] text-zinc-300"
                >
                  + Add
                </Button>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[160px] overflow-y-auto">
                {documentsList.slice(0, 4).map((doc) => (
                  <div key={doc.id} className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="text-zinc-200 truncate font-medium text-[11px]">{doc.title}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono uppercase">
                      {doc.category}
                    </span>
                  </div>
                ))}
              </CardContent>
              <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950/50 flex justify-end">
                <button
                  onClick={() => setActiveTab('KNOWLEDGE')}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  Manage Knowledge <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </Card>

            {/* Recent Action Activity */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
              <CardHeader className="p-4 border-b border-zinc-800/80">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Recent Actions
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-400">
                  Telemetry & audit executions
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-2 max-h-[180px] overflow-y-auto">
                {recentActions.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300 pb-1.5 border-b border-zinc-800/50 last:border-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-tight text-zinc-300">{act}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          KNOWLEDGE MANAGER TAB
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'KNOWLEDGE' && (
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
          <CardHeader className="p-5 border-b border-zinc-800/80 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" /> Mari Knowledge Base
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                Upload organizational SOPs, brand guidelines, and sales strategies to ground Mari's intelligence.
              </CardDescription>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Document
            </Button>
          </CardHeader>

          <CardContent className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentsList.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="purple" className="text-[9px] uppercase font-mono">{doc.category}</Badge>
                      <span className="text-[10px] text-zinc-500">Connected</span>
                    </div>
                    <h4 className="text-sm font-bold text-white">{doc.title}</h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-3 leading-relaxed">
                      {doc.content}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                    <span>Grounded RAG Context</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          ADMIN INFRASTRUCTURE & DIAGNOSTICS TAB
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'ADMIN_INFRA' && (
        <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
          <CardHeader className="p-5 border-b border-zinc-800/80">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-zinc-400" /> Mari Infrastructure & Model Routing Diagnostics
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Admin telemetry for underlying model gateways, latency, and vector search indices.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Primary Gateway</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">AIML API v1 / v2</span>
                <p className="text-[11px] text-zinc-500 mt-1">Multi-model router (DeepSeek, Claude, Qwen, Flux, Kling)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Failover Engine</span>
                <span className="text-xs font-bold text-blue-400 font-mono">Google Gemini Direct</span>
                <p className="text-[11px] text-zinc-500 mt-1">Automatic failover for 99.99% uptime</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Vector Index</span>
                <span className="text-xs font-bold text-purple-400 font-mono">Local Embeddings Memory</span>
                <p className="text-[11px] text-zinc-500 mt-1">In-memory semantic RAG search</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-2">Active Task Mapping</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-300 font-mono">
                <div>Reasoning: DeepSeek R1</div>
                <div>Creative: Claude 3.5</div>
                <div>Code: Qwen 2.5 32B</div>
                <div>General: Gemini 2.0 Flash</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          UPLOAD KNOWLEDGE MODAL
      ───────────────────────────────────────────────────────────────────────── */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Knowledge Source</h3>
                <p className="text-xs text-zinc-400">Ground Mari with custom organizational data</p>
              </div>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={newDoc.title}
                  onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                  placeholder="e.g. Sales Playbook & Pricing 2026"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Category</label>
                <select
                  value={newDoc.category}
                  onChange={(e: any) => setNewDoc({ ...newDoc, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="SOP">Standard Operating Procedure (SOP)</option>
                  <option value="PRODUCT_SPECS">Product Specifications</option>
                  <option value="BRAND_GUIDELINES">Brand Guidelines</option>
                  <option value="FAQ">Customer FAQ</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-zinc-300 block mb-1">Content / Document Text *</label>
                <textarea
                  required
                  rows={4}
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  placeholder="Paste policy text, guidelines, or operational rules..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white font-semibold"
                >
                  Save Knowledge
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
