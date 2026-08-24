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
  ChevronRight, 
  Activity, 
  Settings, 
  Flame, 
  Bot, 
  DollarSign, 
  Zap, 
  Target, 
  Compass, 
  BookOpen, 
  ArrowUpRight 
} from 'lucide-react';
import { 
  BusinessContextService, 
  MariBriefingService, 
  BusinessGrowthProfileService,
  MariBriefing, 
  BusinessContext, 
  BusinessGrowthProfile,
  callMariAiApi, 
  processMariQuery, 
  executeMariAction, 
  mariKnowledgeManager, 
  MariActionPayload, 
  KnowledgeDocument,
  DataProvenance
} from '@ralion/ai';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'MARI';
  text: string;
  actionsSuggested?: MariActionPayload[];
  ragContext?: string;
  timestamp: string;
}

export default function MariAiPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'GROWTH_PARTNER' | 'KNOWLEDGE' | 'ADMIN_INFRA'>('GROWTH_PARTNER');

  // Greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Context & live telemetry states
  const [userName, setUserName] = useState('Ras Ali');
  const [userTier, setUserTier] = useState('COMMUNITY');
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [growthProfile, setGrowthProfile] = useState<BusinessGrowthProfile | null>(null);
  const [briefing, setBriefing] = useState<MariBriefing | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Knowledge Documents State
  const [documentsList, setDocumentsList] = useState<KnowledgeDocument[]>(mariKnowledgeManager.getDocuments());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'SOP' as const, content: '' });

  // Load Business Context, Growth Profile, and Briefing on Mount
  const loadGrowthIntelligence = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      let savedContacts: any[] = [];
      let savedTasks: any[] = [];
      let savedDocs: any[] = [];
      let savedFbPage: any = null;

      if (typeof window !== 'undefined') {
        const rawC = localStorage.getItem('ralion_contacts');
        if (rawC) savedContacts = JSON.parse(rawC);

        const rawT = localStorage.getItem('ralion_tasks');
        if (rawT) savedTasks = JSON.parse(rawT);

        const rawD = localStorage.getItem('ralion_documents');
        if (rawD) savedDocs = JSON.parse(rawD);

        const rawP = localStorage.getItem('ralion_selected_fb_page');
        if (rawP) savedFbPage = JSON.parse(rawP);
      }

      const context = await BusinessContextService.assembleContext('ras-ali-labs', {
        activeScreen: { route: '/mari-ai', label: 'Mari Business Growth Partner' },
        forceRefresh,
        localOverrides: {
          contacts: savedContacts,
          tasks: savedTasks,
          documents: savedDocs,
          fbPage: savedFbPage,
          tier: userTier,
        },
      });

      setBusinessContext(context);

      const profile = BusinessGrowthProfileService.getOrCreateGrowthProfile(context);
      setGrowthProfile(profile);

      const generatedBriefing = MariBriefingService.generateBriefing(context);
      setBriefing(generatedBriefing);

      // Set initial greeting grounded in the business growth partner role
      if (messages.length === 0) {
        setMessages([
          {
            id: 'm-welcome',
            sender: 'MARI',
            text: `Good day, ${userName}! I'm up to date with your business. Your active pipeline is $${profile.activePipelineValue.toLocaleString()} across commercial deals, and Facebook audience reach is surging +${profile.marketingChannels[0]?.reachGrowthPct || 38.4}%. What is our primary growth target for today?`,
            timestamp: 'Just now',
            actionsSuggested: [
              { type: 'NAVIGATE', label: 'Draft Prospect Follow-ups', payload: { route: '/crm' } },
              { type: 'NAVIGATE', label: 'Create Growth Campaign', payload: { route: '/growth' } },
            ],
          }
        ]);
      }
    } catch (e) {
      console.error('Failed to assemble growth intelligence:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    import('@/lib/services/auth.service').then(({ AuthService }) => {
      AuthService.getCurrentUser().then((user) => {
        if (user?.fullName) setUserName(user.fullName);
        if (user?.tier) setUserTier(user.tier.toUpperCase());
      });
    });

    loadGrowthIntelligence();
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
      const apiResult = await callMariAiApi(queryText, undefined, businessContext);

      const answerText = apiResult?.text || ruleResponse.answer;

      const mariMsg: ChatMessage = {
        id: `mari-${Date.now()}`,
        sender: 'MARI',
        text: answerText,
        actionsSuggested: ruleResponse.suggestedActions as MariActionPayload[],
        ragContext: ragSearch.includes('No matching') ? undefined : ragSearch,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, mariMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `mari-err-${Date.now()}`,
        sender: 'MARI',
        text: `Mari encountered an unexpected connection notice: ${err.message || 'Please retry your query.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Action Execution & Record Growth Learning
  const handleActionExecute = async (action: MariActionPayload) => {
    const res = await executeMariAction(action);
    const actionLabel = action.label || action.title || action.type;
    if (res.success) {
      // Record outcome into Growth Memory
      BusinessGrowthProfileService.recordGrowthOutcome('ras-ali-labs', {
        recommendation: actionLabel,
        decision: 'ACCEPTED',
        actionTaken: `Executed ${actionLabel} in Ralion OS`,
        expectedOutcome: 'Commercial progression and audience expansion',
        lessonsLearned: 'User actively executes recommended business growth workflows.',
      });

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
    loadGrowthIntelligence(true);
  };

  const getProvenanceBadge = (prov: DataProvenance) => {
    switch (prov) {
      case 'VERIFIED':
        return <Badge variant="success" className="text-[9px] font-mono">Verified Fact</Badge>;
      case 'USER_PROVIDED':
        return <Badge variant="primary" className="text-[9px] font-mono">User Specified</Badge>;
      case 'INFERRED':
        return <Badge variant="purple" className="text-[9px] font-mono">Analyzed Pattern</Badge>;
      case 'AI_RECOMMENDATION':
        return <Badge variant="warning" className="text-[9px] font-mono">Recommendation</Badge>;
      default:
        return null;
    }
  };

  // Growth-First Suggestion Chips
  const growthPromptChips = [
    'Find Growth Opportunities',
    'Analyse My Business',
    'Find Revenue Opportunities',
    'Find Sales Risks',
    'Improve Marketing',
    'Create Growth Plan',
    'Analyse Customers',
    'Review My Pipeline',
    'What Should We Do Today?'
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. HERO — MARI: YOUR AI BUSINESS GROWTH PARTNER
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-950/50 via-zinc-900 to-indigo-950/50 border border-purple-500/30 p-6 md:p-8 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-500/30 border border-purple-400/40">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Mari Online
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Compass className="w-3 h-3" />
                  AI Business Growth Partner
                </span>
                <span className="text-xs text-zinc-400 font-mono">
                  {businessContext?.organizationName || 'Ras Ali Labs'} • Live Context Active
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {greeting}, {userName}.
              </h1>
              <p className="text-xs md:text-sm text-zinc-300 max-w-2xl mt-1 leading-relaxed">
                I'm up to date with your business. Here is what deserves your strategic attention today to drive revenue and audience growth.
              </p>
            </div>
          </div>

          {/* Credits & Tab Switcher */}
          <div className="shrink-0 flex flex-col items-start md:items-end gap-2.5 w-full md:w-auto">
            <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center gap-3 shadow-inner">
              <div className="flex flex-col text-left md:text-right">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">Mari Credits</span>
                <span className="text-xs font-bold text-white font-mono">
                  {businessContext?.credits.remaining.toLocaleString() || '8,420'} / {businessContext?.credits.totalAllocated.toLocaleString() || '10,000'}
                </span>
              </div>
              <div className="w-16 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 w-[84%]" />
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950/90 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setActiveTab('GROWTH_PARTNER')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'GROWTH_PARTNER'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Growth Command
              </button>
              <button
                onClick={() => setActiveTab('KNOWLEDGE')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'KNOWLEDGE'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Mari Knowledge ({documentsList.length})
              </button>
              <button
                onClick={() => setActiveTab('ADMIN_INFRA')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'ADMIN_INFRA'
                    ? 'bg-zinc-800 text-zinc-200 shadow-md'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
                title="Admin Diagnostics & Infrastructure"
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
          2. HIGHEST IMPACT MOVE & GROWTH SCORE CARD
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GROWTH_PARTNER' && growthProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Priority Growth Move (2 Cols) */}
          <Card className="lg:col-span-2 bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-purple-950/40 border-indigo-500/30 shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 border-b border-zinc-800/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">
                      Highest-Impact Move Today
                    </span>
                    <CardTitle className="text-base font-bold text-white">
                      {growthProfile.highestImpactMove.title}
                    </CardTitle>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Badge variant="purple" className="text-[10px] font-mono">Impact: High</Badge>
                  <Badge variant="warning" className="text-[10px] font-mono">Urgency: High</Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-5 flex-1 flex flex-col justify-between gap-4">
              <p className="text-xs text-zinc-200 leading-relaxed font-medium">
                {growthProfile.highestImpactMove.summary}
              </p>

              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="text-[11px] text-zinc-300">
                  <span className="font-bold text-indigo-400 block">Why Mari recommends this:</span>
                  {growthProfile.highestImpactMove.whyMariRecommends}
                </div>
                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                  <Link href={growthProfile.highestImpactMove.action.route} className="w-full sm:w-auto">
                    <Button variant="primary" size="sm" className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md">
                      {growthProfile.highestImpactMove.action.label} <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Link href="/growth" className="w-full sm:w-auto">
                    <Button variant="outline" size="sm" className="w-full text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-950/40 flex items-center justify-center gap-1.5">
                      Create Reel <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Explainable Growth Score (1 Col) */}
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl flex flex-col justify-between">
            <CardHeader className="p-5 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-purple-400" /> Business Growth Score
                </CardTitle>
                <span className="text-xl font-black text-white font-mono">
                  {growthProfile.growthScore.score} <span className="text-xs text-zinc-500 font-normal">/ 100</span>
                </span>
              </div>
              <CardDescription className="text-[11px] text-zinc-400 mt-1">
                Grounded in verified reach, CRM portfolio, and SLA
              </CardDescription>
            </CardHeader>

            <CardContent className="p-4 space-y-2 flex-1 flex flex-col justify-center">
              <div className="space-y-1.5">
                {growthProfile.growthScore.drivers.positive.map((pos, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
                    <span className="text-emerald-400 font-bold">+</span>
                    <span className="truncate">{pos}</span>
                  </div>
                ))}
                {growthProfile.growthScore.drivers.negative.map((neg, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px] text-amber-300 font-medium">
                    <span className="text-amber-400 font-bold">−</span>
                    <span className="truncate">{neg}</span>
                  </div>
                ))}
              </div>
            </CardContent>

            <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/60 flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 font-mono">Evaluated realtime</span>
              <button
                onClick={() => handleSendQuery('Analyse my growth score drivers and recommend improvements')}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5"
              >
                Deep Analysis <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          3. GROWTH OPPORTUNITIES & STRATEGIC INSIGHTS
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GROWTH_PARTNER' && growthProfile && (
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-amber-400" />
              Mari Growth Opportunities & Diagnostics
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
              3 High-Priority Actions
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {growthProfile.opportunities.map((opp) => (
              <Card 
                key={opp.id} 
                className="bg-zinc-900/80 border-zinc-800 hover:border-purple-500/40 transition-all flex flex-col justify-between"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="purple" className="text-[9px] uppercase font-mono">
                        {opp.category.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-emerald-400 font-bold font-mono">
                          Impact: {opp.impact}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white mb-1.5">
                      {opp.title}
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      {opp.summary}
                    </p>

                    <div className="mt-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-[11px] text-zinc-400 space-y-1">
                      <div><strong className="text-zinc-300">Expected Outcome:</strong> {opp.expectedOutcome}</div>
                      <div><strong className="text-zinc-300">Evidence:</strong> {opp.evidence}</div>
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-zinc-800">
                    <Link href={opp.action.route}>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-950/40 flex items-center justify-center gap-1"
                      >
                        {opp.action.label} <ArrowUpRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          4. ASK MARI COMMAND CENTER — GROWTH FOCUSED
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GROWTH_PARTNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Conversation Area (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            <Card className="bg-zinc-900/90 border-zinc-800 shadow-2xl flex flex-col min-h-[480px]">
              <CardHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <CardTitle className="text-sm font-bold text-white">Strategic Growth Planning with Mari</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadGrowthIntelligence(true)}
                    title="Refresh growth context"
                    className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" /> Refresh
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
                              {act.label || act.title || act.type}
                            </button>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-zinc-500 font-mono">
                        <span>{m.timestamp}</span>
                        <span className="text-purple-400/80">Mari Growth Intelligence</span>
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
                      Mari is analyzing your business intelligence...
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>

              {/* Growth-First Chips & Composer */}
              <div className="p-3 border-t border-zinc-800/80 bg-zinc-950/80 space-y-2">
                {/* Growth Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {growthPromptChips.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendQuery(s)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white shrink-0 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Growth Input Bar */}
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
                    placeholder="What should we focus on today to grow the business?"
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

          {/* Right Column: Growth Memory & Knowledge Sources (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Mari Growth Memory (Learning Feedback Loop) */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
              <CardHeader className="p-4 border-b border-zinc-800/80">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" /> Mari Growth Memory
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-400">
                  Learned outcomes and closed feedback loops
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[220px] overflow-y-auto">
                {(growthProfile?.growthMemory || []).map((mem) => (
                  <div key={mem.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate">{mem.recommendation}</span>
                      <Badge variant={mem.decision === 'ACCEPTED' ? 'success' : 'default'} className="text-[9px]">
                        {mem.decision}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-zinc-400">{mem.lessonsLearned}</p>
                    {mem.actualOutcome && (
                      <span className="text-[10px] text-indigo-400 font-mono block">
                        Outcome: {mem.actualOutcome}
                      </span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Grounded Knowledge Sources */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
              <CardHeader className="p-4 border-b border-zinc-800/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-purple-400" /> Mari Knowledge
                  </CardTitle>
                  <CardDescription className="text-[11px] text-zinc-400">
                    {documentsList.length} Connected reference sources
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
              <CardContent className="p-3 space-y-2 max-h-[140px] overflow-y-auto">
                {documentsList.slice(0, 3).map((doc) => (
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
              <Settings className="w-4 h-4 text-zinc-400" /> Mari Infrastructure & Diagnostics
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Admin telemetry for model routing, failover gateways, and vector memory.
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
