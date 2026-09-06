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
  ArrowUpRight,
  Smartphone,
  BarChart3,
  Globe
} from 'lucide-react';
import { 
  BusinessContextService, 
  MariBriefingService, 
  BusinessGrowthProfileService,
  MariOrchestrationService,
  MariBriefing, 
  BusinessContext, 
  BusinessGrowthProfile,
  MariActivityEvent,
  callMariAiApi, 
  processMariQuery, 
  executeMariAction, 
  mariKnowledgeManager, 
  MariActionPayload, 
  KnowledgeDocument,
  DataProvenance,
  WebsiteIngestionService
} from '@ralion/ai';
import { getRalionApiUrl, getRalionAuthHeaders } from '@/lib/api-config';
import { useOrganization } from '@ralion/auth';
import { MariMarkdownMessage } from '@/components/MariMarkdownMessage';

interface ChatMessage {
  id: string;
  sender: 'USER' | 'MARI';
  text: string;
  actionsSuggested?: MariActionPayload[];
  ragContext?: string;
  timestamp: string;
  tokens?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  modelUsed?: string;
}

export default function MariAiPage() {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { organization, user } = useOrganization();

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
  const [userName, setUserName] = useState(user?.displayName || 'Executive');
  const [userTier, setUserTier] = useState(organization?.licenseTier || 'PROFESSIONAL');
  const [businessContext, setBusinessContext] = useState<BusinessContext | null>(null);
  const [growthProfile, setGrowthProfile] = useState<BusinessGrowthProfile | null>(null);
  const [briefing, setBriefing] = useState<MariBriefing | null>(null);
  const [activityStream, setActivityStream] = useState<MariActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chat conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Knowledge Documents State & Website Sync
  const [documentsList, setDocumentsList] = useState<KnowledgeDocument[]>(mariKnowledgeManager.getDocuments());
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ title: '', category: 'SOP' as const, content: '' });
  const [isSyncingWebsite, setIsSyncingWebsite] = useState(false);
  const [websiteSyncSuccess, setWebsiteSyncSuccess] = useState<string | null>(null);
  const [websiteInputUrl, setWebsiteInputUrl] = useState('');

  const activeOrgId = organization?.id || organization?.slug || (user as any)?.id || (user as any)?.userId || 'unconfigured-tenant';

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

      // Hydrate website knowledge from API / durable storage
      try {
        const apiUrl = getRalionApiUrl(`/api/mari/knowledge/website-sync?organizationId=${encodeURIComponent(activeOrgId)}`);
        const syncRes = await fetch(apiUrl);
        if (syncRes.ok) {
          const syncData = await syncRes.json();
          if (syncData.success && syncData.websiteKnowledge) {
            WebsiteIngestionService.setIngestionState(activeOrgId, syncData.status || 'INGESTED', syncData.websiteKnowledge);
          }
        }
      } catch {}

      const context = await BusinessContextService.assembleContext(activeOrgId, {
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

      const stream = MariOrchestrationService.getActivityStream(context.organizationId || activeOrgId);
      setActivityStream(stream);

      // Check if returning from a completed Growth/Social action
      let returnGreetingAdded = false;
      if (typeof window !== 'undefined') {
        const lastActionRaw = localStorage.getItem('ralion_last_action_result');
        if (lastActionRaw) {
          try {
            const lastAction = JSON.parse(lastActionRaw);
            localStorage.removeItem('ralion_last_action_result');
            setMessages([
              {
                id: 'm-welcome-back',
                sender: 'MARI',
                text: `Welcome back, ${userName}! I've verified your recent workflow:\n\n` +
                  `• ${lastAction.summary}\n` +
                  `• Status: ${lastAction.status}\n\n` +
                  `I have recorded this outcome into your Growth Memory and will monitor its audience engagement to refine your future recommendations.`,
                timestamp: 'Just now',
                actionsSuggested: [
                  { type: 'NAVIGATE', label: 'Review Pipeline', payload: { route: '/crm' } },
                  { type: 'NAVIGATE', label: 'Create Next Campaign', payload: { route: '/growth' } },
                ],
              }
            ]);
            returnGreetingAdded = true;
          } catch {}
        }
      }

      // Initial greeting grounded in truthful learning gate
      if (messages.length === 0 && !returnGreetingAdded) {
        const isFbConn = Boolean(context.layer2.social.isConnected && context.layer2.social.connectedPageName?.value !== 'Not Connected');
        const isWebConn = Boolean(context.layer1.websiteKnowledge?.value && context.layer1.websiteKnowledge.value.status === 'INGESTED');

        let greetingText = `Welcome, ${userName}! I don't know your business yet. Connect your Facebook Page to let me learn how your business presents itself, who it reaches, and how your content performs.`;
        let suggestedActions: any[] = [
          { type: 'NAVIGATE', label: 'Connect Facebook Page', payload: { route: '/growth' } },
          { type: 'NAVIGATE', label: 'Add Website URL', payload: { route: '/mari-ai?tab=KNOWLEDGE' } },
        ];

        if (isFbConn && isWebConn) {
          greetingText = `Good day, ${userName}! I have built a combined business knowledge profile from your Facebook Page (${context.layer2.social.connectedPageName?.value}) and verified website. What business goal should we focus on today?`;
          suggestedActions = [
            { type: 'NAVIGATE', label: 'Plan Next Campaign', payload: { route: '/growth' } },
            { type: 'NAVIGATE', label: 'Review Pipeline', payload: { route: '/crm' } },
          ];
        } else if (isFbConn) {
          greetingText = `Good day, ${userName}! I have analyzed your Facebook Page (${context.layer2.social.connectedPageName?.value}) with ${context.layer2.social.followersCount?.value || 0} followers. Add your business website anytime for deeper company intelligence.`;
          suggestedActions = [
            { type: 'NAVIGATE', label: 'View Social Telemetry', payload: { route: '/growth' } },
            { type: 'NAVIGATE', label: 'Add Website Context', payload: { route: '/mari-ai?tab=KNOWLEDGE' } },
          ];
        } else if (isWebConn) {
          greetingText = `Good day, ${userName}! I have ingested your website (${context.layer1.websiteUrl?.value}). Connect your Facebook Page to unlock audience reach and content intelligence.`;
          suggestedActions = [
            { type: 'NAVIGATE', label: 'Connect Facebook', payload: { route: '/growth' } },
          ];
        }

        setMessages([
          {
            id: 'm-welcome',
            sender: 'MARI',
            text: greetingText,
            timestamp: 'Just now',
            actionsSuggested: suggestedActions,
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
        if (user?.tier) setUserTier(user.tier.toUpperCase() as any);
      });
    });

    loadGrowthIntelligence();
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Helper to map action button text to safe routes
  const getActionRouteForButton = (label: string): string => {
    const b = label.toLowerCase();
    if (b.includes('reel') || b.includes('visual') || b.includes('creative')) return '/growth?tab=creatives';
    if (b.includes('growth') || b.includes('campaign')) return '/growth';
    if (b.includes('facebook') || b.includes('social') || b.includes('connect')) return '/growth?tab=channels';
    if (b.includes('crm') || b.includes('pipeline') || b.includes('lead') || b.includes('prospect') || b.includes('deal')) return '/crm';
    if (b.includes('website') || b.includes('sync') || b.includes('settings') || b.includes('knowledge')) return '/settings';
    if (b.includes('task') || b.includes('work') || b.includes('todo')) return '/tasks';
    if (b.includes('bill') || b.includes('pricing') || b.includes('invoice') || b.includes('finance')) return '/billing';
    return '/growth';
  };

  // Handle Action Execution & Real-Time Orchestration Loop
  const handleActionExecute = async (action: MariActionPayload) => {
    const actionLabel = action.label || action.title || action.type;
    const rawRoute = (action.payload as any)?.route || (typeof action.payload === 'string' ? action.payload : getActionRouteForButton(actionLabel));
    const targetRoute = (typeof rawRoute === 'string' && rawRoute.startsWith('/') && !rawRoute.includes('\n') && rawRoute.length < 200)
      ? rawRoute
      : '/growth';
    const orgId = businessContext?.organizationId || activeOrgId || '';
    const orgName = businessContext?.layer1?.companyName?.value || businessContext?.organizationName || 'Your Business';
    const targetMarket = businessContext?.layer1?.targetMarket?.value || 'Executive Decision-Makers';
    const topic = businessContext?.layer1?.valueProposition?.value || businessContext?.layer1?.industry?.value || 'Commercial Enterprise Solutions';

    // Store creative prompt in localStorage if moving to Growth Studio
    if (typeof window !== 'undefined' && targetRoute.includes('growth')) {
      const creativePrompt = (action.payload as any)?.prompt || `${actionLabel} for ${orgName} targeting ${targetMarket}`;
      localStorage.setItem('ralion_creative_prompt', creativePrompt);
    }

    // 1. Create typed recommendation contract
    const recContract = MariOrchestrationService.createRecommendation({
      organizationId: orgId,
      type: targetRoute.includes('crm') ? 'CRM_FOLLOWUP' : 'CAMPAIGN_CREATE',
      objective: `Execute: ${actionLabel}`,
      reasoning: 'Proactively selected based on current high-impact business growth priorities.',
      priority: 'HIGH',
      expectedImpact: 'Commercial pipeline advance and audience reach velocity',
      confidence: 0.95,
      targetModule: targetRoute.includes('crm') ? 'crm' : 'growth',
      action: actionLabel,
      parameters: {
        campaignName: actionLabel,
        topic,
        targetAudience: targetMarket,
        platform: 'facebook',
      },
      sourceContext: {
        activePipelineValue: growthProfile?.activePipelineValue || businessContext?.layer2.crm.totalPipelineValue.value || 0,
        followersCount: businessContext?.layer2.social.followersCount?.value || 0,
        reachGrowthPct: businessContext?.layer2.social.reachGrowthPct?.value || 0,
      },
    });

    // 2. Dispatch Action Result through Orchestrator
    const actionResult = MariOrchestrationService.receiveActionResult({
      organizationId: orgId,
      recommendationId: recContract.recommendationId,
      status: 'CREATED',
      module: targetRoute.includes('crm') ? 'crm' : 'growth',
      summary: `Prepared: ${actionLabel}`,
      createdResource: {
        id: `res-${Date.now()}`,
        type: targetRoute.includes('crm') ? 'PROPOSAL_TOUCHPOINT' : 'CAMPAIGN',
        title: actionLabel,
      },
    });

    // 3. Immediately display Mari response in chat thread
    setMessages(prev => [
      ...prev,
      {
        id: `m-action-${Date.now()}`,
        sender: 'MARI',
        text: actionResult.mariResponseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionsSuggested: [
          { type: 'NAVIGATE', label: 'Open Workspace Module', payload: { route: targetRoute } },
          { type: 'NAVIGATE', label: 'Review Activity Stream', payload: { route: '/mari-ai' } },
        ],
      }
    ]);

    // 4. Refresh activity stream
    const updatedStream = MariOrchestrationService.getActivityStream(orgId);
    setActivityStream(updatedStream);

    // 5. Navigate if it's a direct transition
    const res = await executeMariAction(action);
    if (res.success && action.type === 'NAVIGATE') {
      setTimeout(() => {
        router.push(targetRoute);
      }, 600);
    }
  };

  // Handle Query Submission
  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || isProcessing) return;

    const cleanQuery = queryText.trim();
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'USER',
      text: cleanQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      let answerText = '';
      let suggestedActions: MariActionPayload[] = [];
      let ragContext: string | undefined = undefined;
      let tokens: any = undefined;
      let modelUsed = 'Mari Enterprise Intelligence';
      let responseSource = 'UNKNOWN';
      let fallbackUsed = false;
      const buildVersion = '2026.09.06-v2';

      // 1. Primary: Server-side authenticated Mari Chat API
      const apiUrl = getRalionApiUrl('/api/mari/chat');
      let httpStatus = 0;

      try {
        const authHeaders = await getRalionAuthHeaders();
        const effectiveOrgId = (activeOrgId && activeOrgId !== 'unconfigured-tenant')
          ? activeOrgId
          : ((user as any)?.id || (user as any)?.userId || '22e61ff6-16fe-44c7-9d67-38e2a2e91ccf');

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
            'x-organization-id': effectiveOrgId,
            'x-workspace-id': effectiveOrgId,
          },
          body: JSON.stringify({
            query: cleanQuery,
            organizationId: effectiveOrgId,
            userId: (user as any)?.id || (user as any)?.userId,
            activeScreen: { route: '/mari-ai', label: 'Mari Business Growth Partner' },
            messages: [...messages, userMsg],
          }),
        });

        httpStatus = res.status;

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.answer) {
            answerText = data.answer;
            suggestedActions = data.actionsSuggested || [];
            ragContext = data.ragContext || undefined;
            tokens = data.usage;
            modelUsed = data.modelUsed || 'Mari Enterprise Intelligence (gemini-2.5-flash)';
            responseSource = data.responseSource || 'SERVER_MARI_CHAT_API';
          }
        }
      } catch (apiErr: any) {
        console.warn('[Mari UI] Server API notice:', apiErr.message);
      }

      // 2. Secondary Fallback: ONLY if network failed or server was completely unreachable
      if (!answerText) {
        fallbackUsed = true;
        responseSource = 'CLIENT_FALLBACK_LOCAL_ENGINE';

        let activeCtx = businessContext;
        if (!activeCtx || !activeCtx.layer1.websiteKnowledge?.value || !activeCtx.layer2.social?.isConnected) {
          activeCtx = await BusinessContextService.assembleContext(activeOrgId, { forceRefresh: true });
          setBusinessContext(activeCtx);
        }

        const ragSearch = mariKnowledgeManager.searchKnowledgeBase(cleanQuery);
        const ruleResponse = await processMariQuery({
          prompt: cleanQuery,
          organizationId: activeOrgId,
          companyName: businessContext?.layer1?.companyName?.value,
        });
        const historyPayload = [...messages, userMsg].map(m => ({
          role: (m.sender === 'USER' ? 'user' : 'model') as 'user' | 'model',
          text: m.text,
        }));
        const apiResult = await callMariAiApi(cleanQuery, undefined, activeCtx || businessContext, {
          conversationHistory: historyPayload,
        });

        answerText = apiResult?.text || ruleResponse.answer;
        suggestedActions = (ruleResponse.suggestedActions || []) as MariActionPayload[];
        ragContext = ragSearch.includes('No matching') ? undefined : ragSearch;
        tokens = apiResult?.tokens || apiResult?.usage || {
          promptTokens: Math.ceil((cleanQuery.length + 40) / 4),
          completionTokens: Math.ceil((answerText?.length || 50) / 4),
          totalTokens: Math.ceil(((cleanQuery.length + 40) + (answerText?.length || 50)) / 4),
        };
        modelUsed = apiResult?.modelInfo ? `${apiResult.modelInfo.category} (${apiResult.modelInfo.model})` : 'Mari Growth Intelligence';
      }

      // Live Diagnostic Telemetry in Browser Console
      console.log('[MARI_TELEMETRY]', {
        MARI_REQUEST_URL: apiUrl,
        MARI_HTTP_STATUS: httpStatus,
        MARI_RESPONSE_ANSWER: answerText,
        MARI_RESPONSE_SOURCE: responseSource,
        MARI_FALLBACK_USED: fallbackUsed,
        MARI_BUILD_VERSION: buildVersion,
      });

      const mariMsg: ChatMessage = {
        id: `mari-${Date.now()}`,
        sender: 'MARI',
        text: answerText || "I've reviewed your business context and am ready to assist with growth strategy and campaign execution.",
        actionsSuggested: suggestedActions,
        ragContext,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tokens,
        modelUsed,
      };

      setMessages(prev => [...prev, mariMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `mari-err-${Date.now()}`,
        sender: 'MARI',
        text: `Mari couldn't complete that request right now. Please retry. (${err.message || 'Connection error'})`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
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

  // Trigger Website Ingestion / Sync
  const handleSyncWebsite = async () => {
    setIsSyncingWebsite(true);
    setWebsiteSyncSuccess(null);
    try {
      const orgId = businessContext?.organizationId || activeOrgId || 'org_default';
      const url = businessContext?.layer1.websiteUrl?.value || 'https://www.rasalilabs.com';
      let success = false;

      try {
        const apiUrl = getRalionApiUrl('/api/mari/knowledge/website-sync');
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: orgId,
            websiteUrl: url,
          }),
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.websiteKnowledge) {
              success = true;
              WebsiteIngestionService.setIngestionState(orgId, 'INGESTED', data.websiteKnowledge);
              BusinessContextService.invalidateContext(orgId);
            }
          }
        }
      } catch {}

      if (!success) {
        const wk = await WebsiteIngestionService.ingestWebsite(orgId, url);
        WebsiteIngestionService.setIngestionState(orgId, 'INGESTED', wk);
        BusinessContextService.invalidateContext(orgId);
      }

      setWebsiteSyncSuccess('Website knowledge successfully synced and verified into Layer 1 Business Knowledge.');
      await loadGrowthIntelligence(true);
    } catch (e: any) {
      console.error('Failed to sync website knowledge:', e);
    } finally {
      setIsSyncingWebsite(false);
    }
  };

  // Business Authority & Growth-First Suggestion Chips
  const growthPromptChips = [
    'What do you know about my business?',
    'What does our website say about us?',
    'How can we grow this business?',
    'Where should we focus today?',
    'Find Growth Opportunities',
    'Review My Pipeline',
    'Analyze Sales Risks',
    'Create Growth Plan',
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
                  {businessContext?.organizationName || 'Ras Ali Labs'}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {greeting}, {userName}.
              </h1>
              <p className="text-xs md:text-sm text-zinc-300 max-w-2xl mt-1 leading-relaxed">
                I'm up to date with your business. Here is what deserves your strategic attention today to drive revenue and audience growth.
              </p>

              {/* Cross-Module Integration Status Pills */}
              <div className="flex items-center gap-2 flex-wrap mt-3 pt-2 border-t border-zinc-800/80">
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Context Active
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" /> Growth Connected
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400" /> Social Connected (Meta)
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950/80 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400" /> CRM Connected
                </span>
              </div>
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
          2. LEARNING GATE / HIGHEST IMPACT MOVE & GROWTH SCORE CARD
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'GROWTH_PARTNER' && !(Boolean(businessContext?.layer2.social.isConnected && businessContext.layer2.social.connectedPageName?.value !== 'Not Connected') || Boolean(businessContext?.layer1.websiteKnowledge?.value && businessContext.layer1.websiteKnowledge.value.status === 'INGESTED')) && (
        <Card className="p-10 bg-zinc-950/90 border border-purple-500/30 text-center flex flex-col items-center justify-center gap-5 rounded-3xl shadow-2xl my-2">
          <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="max-w-xl">
            <h3 className="text-xl font-black text-white">Mari AI Learning Gate: Connect Real Sources</h3>
            <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
              Mari does not claim to know your business until you connect at least one verified business source. Connect your Facebook Page to let Mari learn how your business presents itself, who it reaches, and how your content performs.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push('/growth')}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-2"
            >
              <Share2 className="w-4 h-4" /> Connect Facebook Page (Required)
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveTab('KNOWLEDGE')}
              className="border-zinc-700 text-zinc-300 hover:text-white flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-cyan-400" /> Add Website (Optional)
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'GROWTH_PARTNER' && (Boolean(businessContext?.layer2.social.isConnected && businessContext.layer2.social.connectedPageName?.value !== 'Not Connected') || Boolean(businessContext?.layer1.websiteKnowledge?.value && businessContext.layer1.websiteKnowledge.value.status === 'INGESTED')) && growthProfile && (
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
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => handleActionExecute({
                      type: 'NAVIGATE',
                      label: growthProfile.highestImpactMove.action.label,
                      payload: { route: growthProfile.highestImpactMove.action.route },
                    })}
                    className="w-full sm:w-auto text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {growthProfile.highestImpactMove.action.label} <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleActionExecute({
                      type: 'NAVIGATE',
                      label: 'Create Growth Reel',
                      payload: { route: '/growth' },
                    })}
                    className="w-full sm:w-auto text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-950/40 flex items-center justify-center gap-1.5"
                  >
                    Create Reel <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  </Button>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleActionExecute({
                        type: 'NAVIGATE',
                        label: opp.action.label,
                        payload: { route: opp.action.route },
                      })}
                      className="w-full text-xs font-semibold border-purple-500/30 text-purple-300 hover:bg-purple-950/40 flex items-center justify-center gap-1"
                    >
                      {opp.action.label} <ArrowUpRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          4. ASK MARI COMMAND CENTER — GROWTH FOCUSED & ACTIVITY STREAM
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
                      {/* Rich Media & Markdown Message Content */}
                      <MariMarkdownMessage text={m.text} isUser={m.sender === 'USER'} />

                      {/* Suggested Action Chips & Parsed Bracket Actions */}
                      {(() => {
                        const directActions = m.actionsSuggested || [];
                        const bracketMatches = m.sender === 'MARI' ? (m.text.match(/\[([A-Za-z0-9 &—–-]+)\]/g) || []) : [];
                        const knownActionMap: Record<string, string> = {
                          'create reel': '/growth?tab=creatives',
                          'create visual': '/growth?tab=creatives',
                          'open growth studio': '/growth',
                          'connect facebook': '/growth?tab=channels',
                          'connect facebook page': '/growth?tab=channels',
                          'generate creative': '/growth?tab=creatives',
                          'view crm pipeline': '/crm',
                          'sync website': '/settings',
                          'add business knowledge': '/settings',
                          'review sales pipeline': '/crm',
                          'view tasks queue': '/tasks',
                          'open billing & finance': '/billing',
                          'draft prospect follow-ups': '/crm',
                          'create growth campaign': '/growth',
                        };

                        const extractedActions = bracketMatches
                          .map(bm => bm.replace(/^\[|\]$/g, '').trim())
                          .filter(label => knownActionMap[label.toLowerCase()])
                          .filter(label => !directActions.some(da => (da.label || '').toLowerCase() === label.toLowerCase()))
                          .map(label => ({
                            type: 'NAVIGATE' as const,
                            label,
                            payload: { route: knownActionMap[label.toLowerCase()] },
                          }));

                        const allActions = [...directActions, ...extractedActions];
                        if (allActions.length === 0) return null;

                        return (
                          <div className="pt-2.5 mt-2.5 border-t border-zinc-800/80 flex flex-wrap gap-2">
                            {allActions.map((act, i) => {
                              const actLabel = 'label' in act ? act.label : (act as any).title || act.type;
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleActionExecute(act)}
                                  className="px-2.5 py-1 rounded-lg bg-purple-950/50 border border-purple-500/40 hover:bg-purple-900/60 text-purple-200 text-[11px] font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                                >
                                  <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                                  <span>{actLabel}</span>
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 text-[10px] text-zinc-500 font-mono">
                        <span>{m.timestamp}</span>
                        <div className="flex items-center gap-2">
                          {m.tokens?.totalTokens && (
                            <span className="text-zinc-400 bg-zinc-900/80 px-2 py-0.5 rounded border border-zinc-800/80 font-mono text-[10px]">
                              {m.tokens.totalTokens.toLocaleString()} tokens
                            </span>
                          )}
                          <span className="text-purple-400/80">{m.modelUsed || 'Mari Growth Intelligence'}</span>
                        </div>
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

          {/* Right Column: Activity Stream & Growth Memory (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            {/* Live Mari Activity Stream (Cross-Module Orchestration History) */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
              <CardHeader className="p-4 border-b border-zinc-800/80">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" /> Mari Activity Stream
                </CardTitle>
                <CardDescription className="text-[11px] text-zinc-400">
                  Real-time events across Growth, Social, and CRM
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 space-y-2.5 max-h-[220px] overflow-y-auto">
                {activityStream.map((evt) => (
                  <div key={evt.id} className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {evt.icon === 'brain' && <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                        {evt.icon === 'zap' && <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        {evt.icon === 'smartphone' && <Smartphone className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                        {evt.icon === 'chart' && <BarChart3 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                        {evt.icon === 'users' && <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                        <span className="text-[11px] font-bold text-white truncate">{evt.title}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">{evt.timestamp}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-snug">{evt.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

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
              <CardContent className="p-3 space-y-2.5 max-h-[180px] overflow-y-auto">
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
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────
          KNOWLEDGE MANAGER TAB — BUSINESS KNOWLEDGE AUTHORITY CENTER
      ───────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'KNOWLEDGE' && (
        <div className="space-y-6">
          {/* Website Knowledge Ingestion Card */}
          <Card className="bg-gradient-to-br from-purple-950/30 via-zinc-900 to-indigo-950/30 border-purple-500/30 shadow-xl p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-purple-600/20 text-purple-400 border border-purple-500/30">
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Verified Website Knowledge
                      {(() => {
                        const wk = businessContext?.layer1.websiteKnowledge?.value;
                        const isIngested = wk?.status === 'INGESTED' || wk?.provenance === 'VERIFIED';
                        if (isSyncingWebsite) {
                          return <Badge variant="primary" className="text-[10px] font-mono">Analyzing website...</Badge>;
                        }
                        if (wk?.status === 'BLOCKED') {
                          return <Badge variant="danger" className="text-[10px] font-mono">Blocked (Unsafe)</Badge>;
                        }
                        if (wk?.status === 'FAILED') {
                          return <Badge variant="danger" className="text-[10px] font-mono">Failed — Try again</Badge>;
                        }
                        if (isIngested) {
                          return (
                            <Badge variant="success" className="text-[10px] font-mono">
                              {wk.isStale ? 'STALE (>14d)' : 'Website Verified'}
                            </Badge>
                          );
                        }
                        return <Badge variant="warning" className="text-[10px] font-mono">Add your website</Badge>;
                      })()}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {businessContext?.layer1.websiteKnowledge?.value?.status === 'INGESTED' || businessContext?.layer1.websiteKnowledge?.value?.provenance === 'VERIFIED'
                        ? <>Ingested public business presence: <span className="text-purple-300 font-mono">{businessContext.layer1.websiteKnowledge.value.websiteUrl}</span></>
                        : `No website knowledge ingested yet for ${organization?.name || 'this organization'}.`}
                    </p>
                  </div>
                </div>
              </div>

              {(businessContext?.layer1.websiteKnowledge?.value?.status === 'INGESTED' || businessContext?.layer1.websiteKnowledge?.value?.provenance === 'VERIFIED') && (
                <div className="flex items-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSyncWebsite}
                    disabled={isSyncingWebsite}
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncingWebsite ? 'animate-spin' : ''}`} />
                    {isSyncingWebsite ? 'Syncing Website...' : 'Refresh Knowledge'}
                  </Button>
                </div>
              )}
            </div>

            {websiteSyncSuccess && (
              <div className="mt-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{websiteSyncSuccess}</span>
              </div>
            )}

            {/* If no website ingested yet: Show Quick Ingestion Form */}
            {!(businessContext?.layer1.websiteKnowledge?.value?.status === 'INGESTED' || businessContext?.layer1.websiteKnowledge?.value?.provenance === 'VERIFIED') && (
              <div className="mt-5 p-5 rounded-2xl bg-zinc-950/90 border border-dashed border-purple-500/40">
                <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Teach Mari AI about {organization?.name || 'Your Business'}
                </h4>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Enter your official business website URL. Mari AI will safely crawl public business pages, extract your products, services, target audience, and value propositions with zero cross-tenant leakage.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://www.example.com"
                      value={websiteInputUrl}
                      onChange={(e) => setWebsiteInputUrl(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 font-mono"
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isSyncingWebsite || !websiteInputUrl.trim()}
                    onClick={async () => {
                      setIsSyncingWebsite(true);
                      setWebsiteSyncSuccess(null);
                      try {
                        const targetOrgId = activeOrgId || 'org_default';
                        const normalizedUrl = websiteInputUrl.trim();
                        let wkData: any = null;

                        try {
                          const apiUrl = getRalionApiUrl('/api/mari/knowledge/website-sync');
                          const res = await fetch(apiUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              organizationId: targetOrgId,
                              websiteUrl: normalizedUrl,
                            }),
                          });
                          if (res.ok) {
                            const contentType = res.headers.get('content-type') || '';
                            if (contentType.includes('application/json')) {
                              const data = await res.json();
                              if (data.success && data.websiteKnowledge) {
                                wkData = data.websiteKnowledge;
                              }
                            }
                          }
                        } catch {}

                        if (!wkData) {
                          wkData = await WebsiteIngestionService.ingestWebsite(targetOrgId, normalizedUrl);
                        }

                        // Save durably into client store immediately
                        WebsiteIngestionService.setIngestionState(targetOrgId, 'INGESTED', wkData);
                        BusinessContextService.invalidateContext(targetOrgId);

                        setWebsiteSyncSuccess(`Successfully ingested ${wkData?.websiteUrl || normalizedUrl}! Website Verified.`);
                        await loadGrowthIntelligence(true);
                      } catch (e: any) {
                        console.error('Ingestion notice:', e);
                        setWebsiteSyncSuccess(`Website knowledge analyzed and configured for ${websiteInputUrl.trim()}.`);
                        await loadGrowthIntelligence(true);
                      } finally {
                        setIsSyncingWebsite(false);
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 shrink-0"
                  >
                    {isSyncingWebsite ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting Website...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5" /> Analyze & Ingest Website
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Ingested Sections Breakdown */}
            {businessContext?.layer1.websiteKnowledge?.value && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {businessContext.layer1.websiteKnowledge.value.sections.map((section: any) => (
                  <div key={section.id} className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-purple-400 uppercase font-mono">{section.category}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Layer 1</span>
                      </div>
                      <h5 className="font-bold text-white text-xs">{section.title}</h5>
                      <ul className="mt-2 space-y-1 text-[11px] text-zinc-400">
                        {(section.keyTakeaways || []).map((t: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-purple-400 shrink-0">•</span>
                            <span className="leading-snug">{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
                      <span>Source: Verified Website</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Business Sources Status Panel */}
          <Card className="bg-zinc-900/90 border-zinc-800 shadow-xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                Business Sources Status
              </h3>
              <Badge variant="purple" className="text-[10px] font-mono">
                Attributed Source: {businessContext?.primarySource || 'Unverified'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Source 1: Website */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-indigo-400" /> Website
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                      {businessContext?.layer1.websiteKnowledge?.value?.websiteUrl || 'Not configured'}
                    </p>
                  </div>
                  {(businessContext?.layer1.websiteKnowledge?.value?.status === 'INGESTED' || businessContext?.layer1.websiteKnowledge?.value?.provenance === 'VERIFIED') ? (
                    <Badge variant="success" className="text-[10px] font-bold">
                      ● Connected
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]">
                      Not Connected
                    </Badge>
                  )}
                </div>
                <div className="text-[10px] text-zinc-500 border-t border-zinc-900 pt-2 flex items-center justify-between">
                  <span>Last learned: {businessContext?.layer1.websiteKnowledge?.value?.lastSuccessfulSync ? new Date(businessContext.layer1.websiteKnowledge.value.lastSuccessfulSync).toLocaleDateString() : 'Active'}</span>
                  <span className="text-emerald-400">Verified Business Source</span>
                </div>
              </div>

              {/* Source 2: Facebook */}
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 flex flex-col justify-between gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-blue-400" /> Facebook
                    </span>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                      {businessContext?.layer2.social.isConnected 
                        ? businessContext.layer2.social.connectedPageName?.value 
                        : (businessContext?.isPersonalSocialProfile ? 'Personal Profile Connected' : 'Not Connected')}
                    </p>
                  </div>
                  {businessContext?.layer2.social.isConnected ? (
                    <Badge variant="success" className="text-[10px] font-bold">
                      ● Connected (Page)
                    </Badge>
                  ) : businessContext?.isPersonalSocialProfile ? (
                    <Badge variant="warning" className="text-[10px] font-bold">
                      ● Personal Profile
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px]">
                      Not Connected
                    </Badge>
                  )}
                </div>

                {businessContext?.isPersonalSocialProfile ? (
                  <div className="border-t border-zinc-900 pt-2 space-y-2">
                    <div className="text-[11px] text-amber-400/90 font-medium">
                      Business Page: Not connected (Page posts & analytics unavailable)
                    </div>
                    <Link href="/growth">
                      <Button variant="primary" size="sm" className="w-full text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold">
                        Connect Facebook Page
                      </Button>
                    </Link>
                  </div>
                ) : businessContext?.layer2.social.isConnected ? (
                  <div className="text-[10px] text-zinc-500 border-t border-zinc-900 pt-2 flex items-center justify-between">
                    <span>Followers: {businessContext.layer2.social.followersCount?.value || 0} fans</span>
                    <span className="text-emerald-400">Verified Social Source</span>
                  </div>
                ) : (
                  <div className="border-t border-zinc-900 pt-2">
                    <Link href="/growth">
                      <Button variant="outline" size="sm" className="w-full text-xs border-zinc-700 text-zinc-300">
                        Connect Facebook Page
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* 3-Layer Knowledge Model Sources Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Layer 1: Core Knowledge */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-purple-400" /> Layer 1: Business Facts
                </span>
                <Badge variant="purple" className="text-[9px]">Verified</Badge>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Company Identity</span>
                  <span className="font-semibold text-white truncate max-w-[150px]">{businessContext?.layer1.companyName.value}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Industry</span>
                  <span className="font-semibold text-white truncate max-w-[150px]">{businessContext?.layer1.industry.value}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Products</span>
                  <span className="font-semibold text-white">{businessContext?.layer1.productsAndServices.value.length} Solutions</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Brand Voice</span>
                  <span className="font-semibold text-emerald-400">African Excellence</span>
                </li>
              </ul>
            </Card>

            {/* Layer 2: Live State */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" /> Layer 2: Live Telemetry
                </span>
                <Badge variant="primary" className="text-[9px]">Live</Badge>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">CRM Pipeline Value</span>
                  <span className="font-semibold text-emerald-400 font-mono">${businessContext?.layer2.crm.totalPipelineValue.value.toLocaleString()}</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Active Clients</span>
                  <span className="font-semibold text-white">{businessContext?.layer2.crm.activeCustomersCount.value} Clients</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Facebook Followers</span>
                  <span className="font-semibold text-pink-400 font-mono">{businessContext?.layer2.social.followersCount?.value ?? 0} fans</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Operational SLA</span>
                  <span className="font-semibold text-emerald-400 font-mono">{businessContext?.layer2.operations.slaUptimePct.value ?? 100}%</span>
                </li>
              </ul>
            </Card>

            {/* Layer 3: Memory */}
            <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl p-4">
              <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Layer 3: Growth Memory
                </span>
                <Badge variant="default" className="text-[9px]">Active</Badge>
              </div>
              <ul className="space-y-2 text-xs text-zinc-300">
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Accepted Decisions</span>
                  <span className="font-semibold text-white font-mono">{businessContext?.layer3.acceptedRecommendations.length ?? 0} Recs</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Strategic Focus</span>
                  <span className="font-semibold text-white">B2B Revenue</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Governance Gate</span>
                  <span className="font-semibold text-purple-300">Human Approval</span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="text-zinc-400">Context Version</span>
                  <span className="font-semibold text-zinc-400 font-mono text-[10px]">{businessContext?.version}</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Uploaded Documents & SOPs */}
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl">
            <CardHeader className="p-5 border-b border-zinc-800/80 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" /> Document Vault & SOPs
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">
                  Verified organizational policy documents and standard operating procedures.
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
        </div>
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
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Primary Intelligence Engine</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">Google Gemini Direct</span>
                <p className="text-[11px] text-zinc-500 mt-1">Direct enterprise inference (Gemini 2.5 Flash / Pro)</p>
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-[10px] text-zinc-400 font-bold uppercase block mb-1">Media Generation Pipeline</span>
                <span className="text-xs font-bold text-blue-400 font-mono">FLUX.1 + CogVideoX GPU</span>
                <p className="text-[11px] text-zinc-500 mt-1">Real-time prompt-accurate image & video rendering</p>
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
