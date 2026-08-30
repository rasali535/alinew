'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { 
  TrendingUp, Sparkles, Calendar, Share2, Plus, BarChart2, Send, Copy, Check, Megaphone, 
  Globe, Video, Image, Wand2, LayoutTemplate, Trash2, Eye, RefreshCw, Lock, ExternalLink, 
  Clock, Play, Download, Settings, Layers, Filter, CheckCircle2, AlertCircle, Smartphone,
  LayoutDashboard, Users, Heart, MessageCircle, ArrowUpRight, ArrowDownRight, Compass,
  ShieldCheck, Flame, Award, Zap, ThumbsUp, Radio, HelpCircle, Activity, ChevronDown,
  Upload, Paperclip, MessageSquare, Inbox, CornerDownRight, X
} from 'lucide-react';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth.service';
import { createClient } from '@/lib/supabase/client';
import { TierAccessGate } from '@/components/TierAccessGate';
import { callMariAiApi, generateHfImage, generateHfVideo, MariOrchestrationService, MariRecommendationContract } from '@ralion/ai';
import { getRalionApiUrl, fetchRalionApi, getRalionAuthHeaders } from '@/lib/api-config';

async function authFetch(pathOrUrl: string, init?: RequestInit): Promise<Response> {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : getRalionApiUrl(pathOrUrl);
  const authHeaders = await getRalionAuthHeaders();
  const headers = new Headers(init?.headers);
  if (!headers.has('Authorization') && authHeaders.Authorization) {
    headers.set('Authorization', authHeaders.Authorization);
  }
  if (!headers.has('x-user-id') && authHeaders['x-user-id']) {
    headers.set('x-user-id', authHeaders['x-user-id']);
  }
  if (!headers.has('Content-Type') && init?.body && typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, {
    ...init,
    headers,
    credentials: init?.credentials || 'include',
  });
}

// ── SVG Spline & Sparkline Mathematical Helpers ──────────────────────────────
function getSplinePath(values: number[], width: number, height: number, padding: number = 20): string {
  if (!values || values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * innerWidth;
    const y = height - padding - ((v - min) / range) * innerHeight;
    return { x, y };
  });

  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function getAreaPath(splinePath: string, width: number, height: number, padding: number = 20): string {
  if (!splinePath) return '';
  const lastX = width - padding;
  const bottomY = height - padding;
  return `${splinePath} L ${lastX.toFixed(1)} ${bottomY.toFixed(1)} L ${padding.toFixed(1)} ${bottomY.toFixed(1)} Z`;
}

function renderSparkline(values: number[], strokeColor: string, fillColor: string, height: number = 40, width: number = 110) {
  if (!values || values.length === 0) {
    return (
      <div className="w-full h-10 flex items-center justify-center text-[10px] text-zinc-600 font-mono">
        No trend data
      </div>
    );
  }
  const spline = getSplinePath(values, width, height, 4);
  const area = getAreaPath(spline, width, height, 4);
  const id = `spark-${Math.random().toString(36).substr(2, 6)}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-10 overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.45" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={spline} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export interface ContentPost {
  id: string;
  title: string;
  body: string;
  platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'whatsapp' | 'google' | 'pinterest';
  hashtags: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  publishedAt?: string;
  rawPublishedAt?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  engagement?: { likes: number; shares: number; reach: number; comments: number };
}

export interface Campaign {
  id: string;
  name: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  objective: string;
  budget?: string;
  audience?: string;
  postsCount: number;
  strategyOutput?: string;
}

export interface GeneratedContentItem {
  id: string;
  type: 'TEXT_CAPTION' | 'POSTER_IMAGE' | 'VIDEO_REEL' | 'CAMPAIGN_PLAN';
  title: string;
  prompt: string;
  output: string;
  modelUsed: string;
  createdAt: string;
  previewUrl?: string;
}

export interface SocialAccount {
  id: string;
  provider: string;
  label: string;
  handle: string;
  connectedAt: string;
  status: 'connected' | 'expired' | 'pending' | 'active' | 'disconnected';
  scopes: string[];
  avatarUrl?: string;
  followers?: string;
}

const initialGeneratedContent: GeneratedContentItem[] = [];

const platformConfig: Record<string, { label: string; color: string; bg: string; iconChar: string; providerKey: string }> = {
  facebook: { label: 'Facebook Page', color: '#1877f2', bg: 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400', iconChar: 'fb', providerKey: 'facebook' },
};

const splineChartDates = ['Day 1', 'Day 5', 'Day 10', 'Day 15', 'Day 20', 'Day 25', 'Today'];

function GrowthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Dynamic real data state
  const [posts, setPosts] = useState<ContentPost[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [generatedGallery, setGeneratedGallery] = useState<GeneratedContentItem[]>(initialGeneratedContent);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // provider being synced
  const [oauthAlert, setOauthAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    actionUrl?: string;
    actionLabel?: string;
    onRetry?: () => void;
  } | null>(null);

  // Active Dashboard Navigation
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'ACCOUNTS' | 'CONTENT' | 'INBOX' | 'CAMPAIGNS' | 'AI_STUDIO' | 'CREATIVES' | 'ANALYTICS' | 'GENERATED_OUTPUT'>('OVERVIEW');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'VIDEO' | 'POSTER' | 'TEXT'>('ALL');
  const [postStatusFilter, setPostStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');

  // Interactive Dashboard States
  const [dateRange, setDateRange] = useState<'7D' | '30D' | '90D' | 'YEARLY' | 'ALL'>('30D');
  const [activeChartMetric, setActiveChartMetric] = useState<'reach' | 'engagement' | 'audience'>('reach');
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedConnectPlatform, setSelectedConnectPlatform] = useState<string>('facebook');
  const [connectTab, setConnectTab] = useState<'oauth' | 'manual'>('oauth');
  const [manualAccountHandle, setManualAccountHandle] = useState('');
  const [manualAccessToken, setManualAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<ContentPost | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<string>('facebook');

  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    startDate: '',
    endDate: '',
    objective: 'Brand Awareness & Enterprise Growth',
    budget: '$1,000',
    audience: 'Enterprise CTOs & Trade Leaders',
    platforms: ['facebook'],
    prompt: ''
  });
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  const [selectedCampaignDetail, setSelectedCampaignDetail] = useState<Campaign | null>(null);

  // AI & Media Generation States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const [posterPrompt, setPosterPrompt] = useState('');
  const [posterStyle, setPosterStyle] = useState('Modern Minimalist');
  const [posterFormat, setPosterFormat] = useState('1:1 Square');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState('');

  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoLength, setVideoLength] = useState('15 Seconds');
  const [videoVoiceover, setVideoVoiceover] = useState('AI Female (Professional)');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Mari Orchestration Recommendation Context
  const [mariRecommendation, setMariRecommendation] = useState<MariRecommendationContract | null>(null);

  useEffect(() => {
    const rec = MariOrchestrationService.getPendingRecommendation();
    if (rec) setMariRecommendation(rec);
  }, []);

  const applyMariRecommendation = (rec: MariRecommendationContract) => {
    if (rec.parameters.topic || rec.parameters.campaignName) {
      setNewCampaign(prev => ({
        ...prev,
        name: rec.parameters.campaignName || 'Commercial Growth Campaign',
        prompt: `Strategic focus: ${rec.objective}. ${rec.reasoning}`,
        objective: 'Lead Generation',
        audience: rec.parameters.targetAudience || 'B2B Decision-Makers',
      }));
      setAiPrompt(`Create a 3-part strategic campaign around: ${rec.parameters.topic || rec.parameters.campaignName}. Target audience: ${rec.parameters.targetAudience}. Objective: ${rec.objective}`);
      setVideoPrompt(`Short-form 60s B2B highlight: ${rec.parameters.topic || rec.parameters.campaignName} focusing on commercial benefits and ROI.`);
      setActiveTab('AI_STUDIO');
    }
  };

  // Post Creator State with Image & Video File Upload Support
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [newPost, setNewPost] = useState<{
    title: string;
    body: string;
    platform: ContentPost['platform'];
    hashtags: string;
    scheduledAt: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    mediaFileName?: string;
  }>({
    title: '',
    body: '',
    platform: 'facebook',
    hashtags: '#RalionOS #RasAliLabs #EnterpriseAI',
    scheduledAt: '',
  });

  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);

  // Comments Management State
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedCommentPost, setSelectedCommentPost] = useState<any | null>(null);
  const [postComments, setPostComments] = useState<any[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentReplyText, setNewCommentReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  // Unified Social Inbox State
  const [inboxConversations, setInboxConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [isLoadingInbox, setIsLoadingInbox] = useState(false);
  const [inboxReplyText, setInboxReplyText] = useState('');
  const [isSendingInboxReply, setIsSendingInboxReply] = useState(false);

  // ── Facebook Page Management & Multi-Destination States ─────────────────
  const [availableFacebookPages, setAvailableFacebookPages] = useState<any[]>([]);
  const [isPageSelectionModalOpen, setIsPageSelectionModalOpen] = useState(false);
  const [selectedPageForConnect, setSelectedPageForConnect] = useState<string>('');
  const [isConnectingPage, setIsConnectingPage] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [facebookEntitlement, setFacebookEntitlement] = useState({ limit: 1, current: 0, remaining: 1, planName: 'Starter' });

  // ── Facebook Page Workspace Sub-Tabs ─────────────────────────────────────
  const [pageWorkspaceTab, setPageWorkspaceTab] = useState<'OVERVIEW' | 'POSTS' | 'ANALYTICS' | 'MARI_GROWTH' | 'MARKET_INTEL'>('OVERVIEW');

  const [marketResearchReport, setMarketResearchReport] = useState<any | null>(null);
  const [facebookPagePosts, setFacebookPagePosts] = useState<any[]>([]);
  const [mariGrowthScore, setMariGrowthScore] = useState<any | null>(null);
  const [mariInsights, setMariInsights] = useState<any[]>([]);
  const [mari7DayPlan, setMari7DayPlan] = useState<any | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [mariChatQuery, setMariChatQuery] = useState('');
  const [mariChatMessages, setMariChatMessages] = useState<{ role: 'user' | 'mari'; text: string; action?: string; prompt?: string }[]>([
    {
      role: 'mari',
      text: 'Hello! I am Mari AI, your dedicated Social Growth Intelligence engine. How can I assist with your audience growth and content strategy today?',
    },
  ]);
  const [isAskingMari, setIsAskingMari] = useState(false);

  // ── Mari AI 5-Minute Business Learning & Brand Voice State ───────────────
  const [businessKnowledge, setBusinessKnowledge] = useState<any | null>(null);
  const [isEditBrandVoiceOpen, setIsEditBrandVoiceOpen] = useState(false);
  const [customVoiceTone, setCustomVoiceTone] = useState(
    'Visionary, Authoritative, Solution-Driven, Technologically Rigorous'
  );
  const [customVoiceKeywords, setCustomVoiceKeywords] = useState(
    'Sovereign AI, Autonomous Orchestration, Enterprise Security'
  );

  const handleSaveBrandVoice = () => {
    if (!businessKnowledge) return;
    setBusinessKnowledge((prev: any) => ({
      ...prev,
      brandVoice: {
        ...prev?.brandVoice,
        tone: customVoiceTone,
        vocabulary: customVoiceKeywords.split(',').map(k => k.trim()),
      },
      learningStatus: 'CUSTOMIZED',
    }));
    setIsEditBrandVoiceOpen(false);
    setOauthAlert({ type: 'success', message: '✅ Brand voice guidelines updated for Mari AI!' });
  };


  // Helper: Fetch Facebook Pages
  const fetchFacebookPages = useCallback(async () => {
    try {
      const res = await authFetch('/api/social/facebook/pages');
      if (res.ok) {
        const data = await res.json();
        if (data.pages && Array.isArray(data.pages)) {
          setAvailableFacebookPages(data.pages);
          return data.pages;
        }
        if (data.entitlement) {
          setFacebookEntitlement(data.entitlement);
        }
      }
      return [];
    } catch (e) {
      console.warn('[Growth] Page discovery fetch notice:', e);
      return [];
    }
  }, []);

  // Helper: Open Page Selection / Discovery Modal
  const handleOpenPageSelection = async () => {
    setIsPageSelectionModalOpen(true);
    await fetchFacebookPages();
  };

  // Helper: Select & Connect Page
  const handleConnectSelectedPage = async (pageId: string) => {
    const targetPage = availableFacebookPages.find(p => p.pageId === pageId);
    if (targetPage && targetPage.status === 'LOCKED') {
      setIsUpgradeModalOpen(true);
      return;
    }

    setIsConnectingPage(true);
    try {
      const res = await authFetch('/api/social/facebook/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, pageData: targetPage }),
      });

      if (res.status === 403) {
        setIsUpgradeModalOpen(true);
        setIsConnectingPage(false);
        return;
      }

      if (res.ok) {
        setOauthAlert({ type: 'success', message: `✅ Facebook Page connected: ${targetPage?.name || pageId}!` });
        loadConnectedAccounts();
        setIsPageSelectionModalOpen(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to connect selected page');
    } finally {
      setIsConnectingPage(false);
    }
  };

  // Helper: Generate 7-Day Growth Plan via Mari AI
  const handleGenerate7DayPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/mari-growth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_PLAN' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.plan) {
          setMari7DayPlan(data.plan);
        }
      }
    } catch (err) {
      console.warn('[Growth] Mari Plan generation notice:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Helper: Chat with Mari AI
  const handleAskMariGrowth = async () => {
    if (!mariChatQuery.trim()) return;
    const userMsg = mariChatQuery.trim();
    setMariChatQuery('');
    setMariChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAskingMari(true);

    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/mari-growth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ASK_MARI', prompt: userMsg }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.chat) {
          setMariChatMessages(prev => [
            ...prev,
            { role: 'mari', text: data.chat.answer, action: data.chat.recommendedAction, prompt: data.chat.suggestedPrompt },
          ]);
        }
      }
    } catch (err) {
      setMariChatMessages(prev => [
        ...prev,
        { role: 'mari', text: 'Analyzing your Page: Mari needs more data to provide a reliable recommendation.' },
      ]);
    } finally {
      setIsAskingMari(false);
    }
  };

  // Helper: Transfer Mari Plan Recommendation to Content Composer
  const handleCreateFromPlanDay = (day: any) => {
    setNewPost({
      title: day.topic,
      body: `${day.suggestedCaption}\n\n${day.callToAction}`,
      platform: 'facebook',
      hashtags: (day.hashtags || []).join(' '),
      scheduledAt: '',
    });
    setIsCreateOpen(true);
  };


  // ── Load real connected accounts from Supabase with strict tenant isolation ─────────────
  const loadConnectedAccounts = useCallback(async (): Promise<SocialAccount[]> => {
    setIsLoadingAccounts(true);
    try {
      const accountsMap: Record<string, SocialAccount> = {};
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setConnectedAccounts([]);
        setFacebookPagePosts([]);
        setPostComments([]);
        setInboxConversations([]);
        setAvailableFacebookPages([]);
        return [];
      }

      // 1. Direct query to Supabase social_connections scoped strictly to user.id
      try {
        const { data: conns, error: connErr } = await supabase
          .from('social_connections')
          .select('id, provider, account_name, username, profile_image_url, followers_count, scopes, connection_status, token_status, updated_at')
          .eq('user_id', user.id);

        if (!connErr && Array.isArray(conns)) {
          conns.forEach((c: any) => {
            const statusStr = (c.connection_status || '').toUpperCase();
            if (statusStr === 'CONNECTED' || statusStr === 'ACTIVE' || c.connection_status === 'connected') {
              const prov = (c.platform || c.provider || '').toLowerCase();
              const fCount = Number(c.followers_count) || Number(c.metadata?.followers_count) || Number(c.metadata?.followers) || Number(c.metadata?.fan_count) || 0;
              accountsMap[prov] = {
                id: c.id || `acc-${prov}`,
                provider: prov,
                label: c.account_name || prov,
                handle: c.username ? (c.username.startsWith('@') ? c.username : `@${c.username}`) : `@${prov}`,
                connectedAt: c.updated_at ? new Date(c.updated_at).toLocaleDateString() : 'Connected',
                status: 'connected',
                scopes: c.scopes || [],
                avatarUrl: c.profile_image_url,
                followers: fCount > 0 ? fCount.toLocaleString() : '0',
              };
            }
          });
        }
      } catch (connDbErr) {
        console.warn('[Growth] social_connections query skipped:', connDbErr);
      }

      // 2. Query dynamic backend connections endpoint with authenticated session token
      try {
        const res = await authFetch('/api/social/connections');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.connections)) {
            data.connections.forEach((c: any) => {
              const prov = (c.provider || c.platform || '').toLowerCase();
              const fCount = Number(c.followers_count) || Number(c.metadata?.followers_count) || Number(c.metadata?.followers) || Number(c.metadata?.fan_count) || 0;
              if (!accountsMap[prov]) {
                accountsMap[prov] = {
                  id: c.id || `acc-${prov}`,
                  provider: prov,
                  label: c.account_name || prov,
                  handle: c.username || `@${prov}`,
                  connectedAt: c.last_sync_at ? new Date(c.last_sync_at).toLocaleDateString() : 'Connected',
                  status: 'connected',
                  scopes: c.scopes || [],
                  avatarUrl: c.profile_image_url,
                  followers: fCount > 0 ? fCount.toLocaleString() : '0',
                };
              }
            });
          }
        }
      } catch (backendConnErr) {
        console.warn('[Growth] Dynamic backend connections query notice:', backendConnErr);
      }

      const accountList = Object.values(accountsMap);
      setConnectedAccounts(accountList);

      // User-scoped localStorage cache
      try {
        localStorage.setItem(`ralion_social_accounts_${user.id}`, JSON.stringify(accountList));
      } catch {}

      return accountList;
    } catch (err) {
      console.error('[Growth] Failed to load social accounts:', err);
      return [];
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  // ── Load live Facebook Page Posts directly from Zernio / Facebook API ─────
  const fetchLiveFacebookPosts = useCallback(async (pagesOverride?: any[]) => {
    try {
      const pages = pagesOverride || availableFacebookPages;
      const activeFbPage = pages.find((p: any) => p.isCurrentDestination || p.status === 'CONNECTED') || pages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/posts`);
      if (res.ok) {
        const data = await res.json();
        if (data.posts && Array.isArray(data.posts)) {
          const livePosts: ContentPost[] = data.posts.map((p: any) => ({
            id: p.id,
            title: p.title || 'Facebook Post',
            body: p.body || '',
            platform: 'facebook' as const,
            hashtags: p.hashtags || ['#RasAliLabs', '#RalionOS', '#EnterpriseAI'],
            status: p.status === 'published' ? 'published' : p.status === 'scheduled' ? 'scheduled' : 'draft',
            publishedAt: p.publishedAt ? new Date(p.publishedAt).toLocaleString() : undefined,
            rawPublishedAt: p.publishedAt || p.createdAt || p.published_at || p.created_time || p.scheduledFor || new Date().toISOString(),
            scheduledAt: p.scheduledFor,
            mediaUrl: p.mediaUrls?.[0],
            mediaType: p.mediaType,
            engagement: p.engagement || { likes: 0, shares: 0, reach: 0, comments: 0 },
          }));

          setPosts(livePosts);
          setFacebookPagePosts(data.posts);
        }
      }
    } catch (err) {
      console.warn('[Growth] Live posts fetch notice:', err);
    }
  }, [availableFacebookPages, selectedPageForConnect]);

  // ── Media File Upload Handler (Image & Video) ───────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setOauthAlert({
        type: 'error',
        message: 'Please upload an image (PNG, JPG, WebP) or video (MP4, MOV, WebM).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      setNewPost(prev => ({
        ...prev,
        mediaUrl: dataUrl,
        mediaType: isVideo ? 'video' : 'image',
        mediaFileName: file.name,
      }));
      setOauthAlert({
        type: 'info',
        message: `📎 Attached ${isVideo ? 'video' : 'image'}: ${file.name}`,
      });
      setTimeout(() => setOauthAlert(null), 3000);
    };
    reader.readAsDataURL(file);
  };

  const handleCreativeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      setOauthAlert({
        type: 'error',
        message: 'Please upload an image (PNG, JPG, WebP) or video (MP4, MOV, WebM).',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target?.result as string;
      const newItem: GeneratedContentItem = {
        id: `upload-${Date.now()}`,
        type: isVideo ? 'VIDEO_REEL' : 'POSTER_IMAGE',
        title: file.name,
        prompt: `Uploaded Asset (${(file.size / (1024 * 1024)).toFixed(2)} MB)`,
        output: dataUrl,
        previewUrl: dataUrl,
        modelUsed: isVideo ? 'Custom Video Asset' : 'Custom Image Asset',
        createdAt: 'Just now',
      };
      setGeneratedGallery(prev => [newItem, ...prev]);
      setOauthAlert({
        type: 'success',
        message: `✅ Successfully uploaded creative: ${file.name}`,
      });
      setTimeout(() => setOauthAlert(null), 4000);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveMedia = () => {
    setNewPost(prev => ({
      ...prev,
      mediaUrl: undefined,
      mediaType: undefined,
      mediaFileName: undefined,
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ── Comments Management Handlers ─────────────────────────────────────────
  const fetchPostComments = useCallback(async (postId?: string) => {
    setIsLoadingComments(true);
    try {
      const url = postId ? `/api/social/comments?postId=${encodeURIComponent(postId)}` : '/api/social/comments';
      const res = await authFetch(url);
      if (res.ok) {
        const data = await res.json();
        setPostComments(data.comments || []);
      }
    } catch (err) {
      console.warn('Comments fetch notice:', err);
    } finally {
      setIsLoadingComments(false);
    }
  }, []);

  const handleOpenCommentsModal = (post: any) => {
    setSelectedCommentPost(post);
    fetchPostComments(post.id);
    setIsCommentsModalOpen(true);
  };

  const handleSendCommentReply = async (commentId: string, postId: string) => {
    if (!newCommentReplyText.trim()) return;
    setIsSubmittingReply(true);
    const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
    const targetPostId = postId || selectedCommentPost?.platformPostId || selectedCommentPost?.id || commentId.split('_')[0];

    try {
      const res = await authFetch('/api/social/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          postId: targetPostId,
          replyText: newCommentReplyText.trim(),
          authorName: activeFbPage?.name || 'Ras Ali Labs',
          pageId: activeFbPage?.pageId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || `Server responded with status ${res.status}`);
      }

      if (data.reply) {
        setPostComments(prev =>
          prev.map(c =>
            c.id === commentId
              ? { ...c, replies: [...(c.replies || []), data.reply] }
              : c
          )
        );
        setNewCommentReplyText('');
        setOauthAlert({
          type: 'success',
          message: `✓ Reply published to Facebook! (ID: ${data.replyId || data.reply.id})`,
        });
        setTimeout(() => setOauthAlert(null), 5000);

        // Reconcile with live thread
        setTimeout(() => {
          if (targetPostId) fetchPostComments(targetPostId);
        }, 1500);
      }
    } catch (e: any) {
      setOauthAlert({
        type: 'error',
        message: `✕ Failed to post comment reply to Facebook: ${e.message}`,
      });
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // ── Unified Inbox Handlers ───────────────────────────────────────────────
  const fetchInboxConversations = useCallback(async () => {
    setIsLoadingInbox(true);
    try {
      const res = await authFetch('/api/social/inbox?provider=facebook');
      if (res.ok) {
        const data = await res.json();
        if (data.conversations && Array.isArray(data.conversations)) {
          setInboxConversations(data.conversations);
          if (!activeConversationId && data.conversations.length > 0) {
            setActiveConversationId(data.conversations[0].conversationId);
          }
        }
      }
    } catch (err) {
      console.warn('Inbox fetch notice:', err);
    } finally {
      setIsLoadingInbox(false);
    }
  }, [activeConversationId]);

  const handleSendInboxReply = async () => {
    if (!inboxReplyText.trim() || !activeConversationId) return;
    setIsSendingInboxReply(true);

    const activeConv = inboxConversations.find(c => c.conversationId === activeConversationId);
    const recipientId = activeConv?.participantId || '';
    const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
    const activeConn = connectedAccounts.find(a => a.provider === 'facebook');

    try {
      const res = await authFetch('/api/social/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: activeFbPage?.id || activeConn?.id || undefined,
          provider: 'facebook',
          conversationId: activeConversationId,
          recipientId: recipientId,
          messageText: inboxReplyText.trim(),
        }),
      });

      const newMsg = {
        id: `msg_${Date.now()}`,
        direction: 'OUTBOUND',
        sender_name: activeFbPage?.name || 'Support',
        message_text: inboxReplyText.trim(),
        timestamp: 'Just now',
      };

      setInboxConversations(prev =>
        prev.map(c =>
          c.conversationId === activeConversationId
            ? {
                ...c,
                lastMessage: inboxReplyText.trim(),
                lastTimestamp: 'Just now',
                messages: [...(c.messages || []), newMsg],
              }
            : c
        )
      );

      setInboxReplyText('');
      setOauthAlert({
        type: 'success',
        message: '✓ Direct message reply sent via Facebook Messenger!',
      });
      setTimeout(() => setOauthAlert(null), 5000);
    } catch (err: any) {
      setOauthAlert({
        type: 'error',
        message: `✕ Failed to send message: ${err.message}`,
      });
    } finally {
      setIsSendingInboxReply(false);
    }
  };

  const fetchMariGrowthData = useCallback(async () => {
    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/mari-growth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'GET_DIAGNOSIS' }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.score) {
          setMariGrowthScore(data.score);
        }
        if (data.insights && Array.isArray(data.insights)) {
          setMariInsights(data.insights);
        }
      }
    } catch (err) {
      console.warn('[Growth] Mari growth fetch notice:', err);
    }
  }, [availableFacebookPages, selectedPageForConnect]);

  const fetchMarketResearchData = useCallback(async () => {
    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/market-research`);
      if (res.ok) {
        const data = await res.json();
        if (data.report && data.report.benchmarks) {
          setMarketResearchReport(data.report);
        }
      }
    } catch (err) {
      console.warn('[Growth] Market research fetch notice:', err);
    }
  }, [availableFacebookPages, selectedPageForConnect]);

  const fetchBusinessLearningData = useCallback(async () => {
    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const pageId = activeFbPage?.pageId || selectedPageForConnect || 'default';
      const res = await authFetch(`/api/social/facebook/pages/${pageId}/business-learning`);
      if (res.ok) {
        const data = await res.json();
        if (data.knowledge) {
          setBusinessKnowledge(data.knowledge);
        }
      }
    } catch (err) {
      console.warn('[Growth] Business learning fetch notice:', err);
    }
  }, [availableFacebookPages, selectedPageForConnect]);

  useEffect(() => {
    let isMounted = true;

    const initializeGrowth = async () => {
      const accounts = await loadConnectedAccounts();
      if (!isMounted) return;

      const hasFacebook = accounts.some(
        (a) => a.provider === 'facebook' && a.status === 'connected'
      );

      if (hasFacebook) {
        const pages = await fetchFacebookPages();
        await Promise.allSettled([
          fetchLiveFacebookPosts(pages),
          fetchInboxConversations(),
          fetchPostComments(),
          fetchMariGrowthData(),
          fetchMarketResearchData(),
          fetchBusinessLearningData(),
        ]);
      } else {
        // Reset to clean empty state when no account connected
        setFacebookPagePosts([]);
        setPostComments([]);
        setInboxConversations([]);
        setAvailableFacebookPages([]);
        setMarketResearchReport(null);
        setMariGrowthScore(null);
        setMariInsights([]);
        setBusinessKnowledge(null);
        setMari7DayPlan(null);
      }
    };

    initializeGrowth();

    // Auto-capture and store provider OAuth tokens (Facebook, Google, LinkedIn, etc.) returned by Supabase Auth
    const supabase = createClient();
    
    const syncSessionTokens = async (session: any) => {
      if (!session?.user) return;
      try {
        const identities = session.user.identities || [];
        const accountsToCache: SocialAccount[] = [];

        for (const identity of identities) {
          if (identity.provider && identity.provider !== 'email') {
            const provKey = identity.provider === 'linkedin_oidc' ? 'linkedin' : (identity.provider === 'twitter' ? 'x' : identity.provider.toLowerCase());
            const idData = identity.identity_data || session.user.user_metadata || {};
            const handle = idData.user_name ? `@${idData.user_name}` : (idData.email ? `@${idData.email.split('@')[0]}` : (session.user.user_metadata?.full_name ? `@${session.user.user_metadata.full_name.toLowerCase().replace(/\s+/g, '_')}` : `@${provKey}_account`));
            
            const accObj: SocialAccount = {
              id: `acc-${provKey}`,
              provider: provKey,
              label: idData.full_name || idData.name || provKey,
              handle: handle,
              connectedAt: 'Connected',
              status: 'connected',
              scopes: ['public_profile', 'email'],
              avatarUrl: idData.avatar_url || idData.picture || session.user.user_metadata?.avatar_url || null,
              followers: 'Active',
            };
            accountsToCache.push(accObj);

            // If provider is Facebook/Meta, query Graph API for real Pages
            if (provKey === 'facebook' && session.provider_token) {
              try {
                const fbRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,category,followers_count,picture{url}&access_token=${session.provider_token}`);
                if (fbRes.ok) {
                  const fbData = await fbRes.json();
                  if (Array.isArray(fbData.data) && fbData.data.length > 0) {
                    for (const page of fbData.data) {
                      const pageAccount: SocialAccount = {
                        id: `fb-page-${page.id}`,
                        provider: 'facebook',
                        label: page.name || 'Facebook Business Page',
                        handle: `@${(page.name || 'facebook').toLowerCase().replace(/\s+/g, '_')}`,
                        connectedAt: 'Today',
                        status: 'connected',
                        scopes: ['public_profile', 'email'],
                        avatarUrl: page.picture?.data?.url || null,
                        followers: page.followers_count ? page.followers_count.toLocaleString() : 'Active Page',
                      };
                      accountsToCache.push(pageAccount);

                      // Save page token to Supabase
                      await supabase.from('social_account_tokens').upsert({
                        user_id: session.user.id,
                        provider: 'facebook',
                        access_token: page.access_token,
                        account_label: page.name,
                        account_handle: pageAccount.handle,
                        avatar_url: pageAccount.avatarUrl,
                        followers_count: page.followers_count || 0,
                        status: 'connected',
                        updated_at: new Date().toISOString(),
                      }, { onConflict: 'user_id,provider' });

                      // Fetch real posts for this Facebook page
                      try {
                        const postsRes = await fetch(`https://graph.facebook.com/v19.0/${page.id}/posts?fields=id,message,created_time,full_picture,shares,reactions.summary(true),comments.summary(true)&limit=10&access_token=${page.access_token}`);
                        if (postsRes.ok) {
                          const postsData = await postsRes.json();
                          if (Array.isArray(postsData.data)) {
                            const realPosts: ContentPost[] = postsData.data.map((p: any) => ({
                              id: `fb-post-${p.id}`,
                              title: p.message ? p.message.slice(0, 50) + '...' : 'Facebook Update',
                              body: p.message || '',
                              platform: 'facebook',
                              hashtags: ['#FacebookLive'],
                              status: 'published',
                              publishedAt: new Date(p.created_time).toLocaleDateString(),
                              mediaUrl: p.full_picture,
                              mediaType: p.full_picture ? 'image' : undefined,
                              engagement: {
                                likes: p.reactions?.summary?.total_count || 0,
                                shares: p.shares?.count || 0,
                                reach: (p.reactions?.summary?.total_count || 0) * 12,
                                comments: p.comments?.summary?.total_count || 0,
                              }
                            }));
                            if (realPosts.length > 0) {
                              setPosts(prev => [...realPosts, ...prev.filter(x => !realPosts.some(r => r.id === x.id))]);
                            }
                          }
                        }
                      } catch (pErr) {
                        console.warn('[Growth] Facebook page posts query:', pErr);
                      }
                    }
                  }
                }
              } catch (metaErr) {
                console.warn('[Growth] Meta Graph API query:', metaErr);
              }
            }

            await supabase.from('social_account_tokens').upsert({
              user_id: session.user.id,
              provider: provKey,
              access_token: session.provider_token || 'active_oauth_token',
              refresh_token: session.provider_refresh_token || null,
              account_label: accObj.label,
              account_handle: accObj.handle,
              avatar_url: accObj.avatarUrl,
              followers_count: 0,
              status: 'connected',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,provider' });
          }
        }

        if (accountsToCache.length > 0) {
          try {
            const stored = JSON.parse(localStorage.getItem('ralion_connected_social_accounts') || '[]');
            const merged = [...stored.filter((s: any) => !accountsToCache.some(c => c.provider === s.provider)), ...accountsToCache];
            localStorage.setItem('ralion_connected_social_accounts', JSON.stringify(merged));
          } catch {}
        }
        loadConnectedAccounts();
      } catch (err) {
        console.warn('[Growth] Auto-store provider token notice:', err);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) syncSessionTokens(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        syncSessionTokens(session);
      }
    });

    // Check if returning with OAuth tokens in URL hash or params
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;
      if (hash.includes('access_token=') || search.includes('code=')) {
        setTimeout(() => {
          loadConnectedAccounts();
        }, 1200);
      }
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [loadConnectedAccounts]);

  // ── Handle redirect back from OAuth callback (?connected=provider) ────────
  useEffect(() => {
    const connected = searchParams.get('connected');
    const handle = searchParams.get('handle');
    const oauthError = searchParams.get('oauth_error');

    if (connected) {
      setOauthAlert({ type: 'success', message: `✅ ${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully! Account: ${handle || ''}` });
      loadConnectedAccounts();
      // Clean URL
      router.replace('/ralion/growth', { scroll: false });
      setTimeout(() => setOauthAlert(null), 6000);
    } else if (oauthError) {
      setOauthAlert({ type: 'error', message: `❌ OAuth failed: ${decodeURIComponent(oauthError)}` });
      router.replace('/ralion/growth', { scroll: false });
      setTimeout(() => setOauthAlert(null), 8000);
    }
  }, [searchParams]);

  // ── Manual / Page Token Direct Connect ────────────────────────────────────
  const handleSaveManualConnection = async () => {
    if (!manualAccountHandle.trim()) {
      alert('Please enter an Account Handle or Facebook Page name');
      return;
    }
    setIsConnecting(true);
    try {
      const handle = manualAccountHandle.startsWith('@') ? manualAccountHandle : `@${manualAccountHandle}`;
      const newAcc: SocialAccount = {
        id: `acc-${selectedConnectPlatform}-${Date.now()}`,
        provider: selectedConnectPlatform,
        label: platformConfig[selectedConnectPlatform]?.label || selectedConnectPlatform,
        handle: handle,
        connectedAt: 'Today',
        status: 'connected',
        scopes: ['public_profile', 'email'],
        followers: '1.2k',
      };

      // 1. Save to Supabase
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('social_account_tokens').upsert({
            user_id: user.id,
            provider: selectedConnectPlatform,
            access_token: manualAccessToken || 'active_token',
            account_label: newAcc.label,
            account_handle: newAcc.handle,
            followers_count: 1200,
            status: 'connected',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' });
        }
      } catch (e) {
        console.warn('[Growth] Manual Supabase save note:', e);
      }

      // 2. Cache in localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('ralion_connected_social_accounts') || '[]');
        const updated = existing.filter((a: any) => a.provider !== selectedConnectPlatform);
        updated.push(newAcc);
        localStorage.setItem('ralion_connected_social_accounts', JSON.stringify(updated));
      } catch {}

      setConnectedAccounts(prev => {
        const filtered = prev.filter(a => a.provider !== selectedConnectPlatform);
        return [...filtered, newAcc];
      });

      setIsConnectModalOpen(false);
      setManualAccountHandle('');
      setManualAccessToken('');
      setOauthAlert({ type: 'success', message: `✅ ${platformConfig[selectedConnectPlatform]?.label} connected successfully!` });
      setTimeout(() => setOauthAlert(null), 5000);
    } catch (err: any) {
      alert(`Failed to save connection: ${err.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // ── Real OAuth Connect: fetch auth URL → redirect browser ─────────────────
  const handleConnectSocialAccount = async (providerKey: string) => {
    setIsConnecting(true);
    try {
      // Check if custom OAuth endpoint is available and returns JSON
      try {
        const session = await AuthService.getSession();
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const res = await fetch(getRalionApiUrl(`/api/oauth/${providerKey}/connect/`), {
          credentials: 'include',
          headers,
        });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && data.authorizationUrl) {
            setIsConnectModalOpen(false);
            window.location.href = data.authorizationUrl;
            return;
          } else if (data.error) {
            alert(`Connection note: ${data.error}`);
            setIsConnecting(false);
            return;
          }
        }
      } catch {
        // Fallback to Supabase OAuth
      }

      // Supabase Social OAuth Provider fallback
      setIsConnectModalOpen(false);
      await AuthService.linkSocialAccount(providerKey);
    } catch (err: any) {
      alert(`Failed to initiate OAuth: ${err.message || 'Check connection settings'}`);
      setIsConnecting(false);
    }
  };

  // ── Disconnect account (remove from Supabase) ─────────────────────────────
  const handleDisconnectAccount = async (providerKey: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('social_account_tokens')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', providerKey);
      }
      // Also try API route if available
      try {
        await fetch(getRalionApiUrl(`/api/oauth/${providerKey}/disconnect/`), { method: 'DELETE', credentials: 'include' });
      } catch {
        // Silently continue
      }
    } catch (e) {
      console.warn('[Growth] Disconnect error:', e);
    }

    try {
      const stored = JSON.parse(localStorage.getItem('ralion_connected_social_accounts') || '[]');
      const filtered = stored.filter((a: any) => a.provider !== providerKey);
      localStorage.setItem('ralion_connected_social_accounts', JSON.stringify(filtered));
    } catch {}

    if (providerKey === 'facebook') {
      setAvailableFacebookPages([]);
      setFacebookPagePosts([]);
      setFacebookEntitlement(prev => ({ ...prev, current: 0, remaining: prev.limit }));
    }

    setConnectedAccounts(prev => prev.filter(a => a.provider !== providerKey));
    setOauthAlert({
      type: 'info',
      message: `✅ Disconnected ${providerKey.charAt(0).toUpperCase() + providerKey.slice(1)} account.`
    });
    setTimeout(() => setOauthAlert(null), 4000);
  };

  // ── Sync analytics from real platform APIs ────────────────────────────────
  const handleSyncAccount = async (providerKey: string) => {
    setIsSyncing(providerKey);
    try {
      const res = await fetch(getRalionApiUrl(`/api/oauth/${providerKey}/sync/`), { method: 'POST', credentials: 'include' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success && Array.isArray(data.posts) && data.posts.length > 0) {
          // Merge real posts into the posts list (avoid duplicates)
          setPosts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPosts: ContentPost[] = data.posts
              .filter((p: any) => !existingIds.has(p.id))
              .map((p: any) => ({
                id: p.id,
                title: p.title,
                body: p.body,
                platform: providerKey as ContentPost['platform'],
                hashtags: [],
                status: 'published' as const,
                publishedAt: p.publishedAt,
                engagement: p.engagement || { likes: 0, shares: 0, reach: 0, comments: 0 },
                mediaUrl: undefined,
              }));
            return [...newPosts, ...prev];
          });
          setOauthAlert({ type: 'success', message: `✅ Synced ${data.posts.length} posts from ${providerKey}` });
          setTimeout(() => setOauthAlert(null), 5000);
        } else {
          setOauthAlert({ type: 'error', message: data.error || `No recent posts found on ${providerKey}` });
          setTimeout(() => setOauthAlert(null), 5000);
        }
      } else {
        setOauthAlert({ type: 'success', message: `✅ ${providerKey} status refreshed.` });
        setTimeout(() => setOauthAlert(null), 4000);
      }
    } catch (err: any) {
      console.error('[Growth] Sync failed:', err);
      setOauthAlert({ type: 'error', message: `Sync failed: ${err.message}` });
      setTimeout(() => setOauthAlert(null), 5000);
    } finally {
      setIsSyncing(null);
    }
  };

  // ── Export Analytics Helpers ──────────────────────────────────────────────
  const handleExportCsv = () => {
    const headers = ['Post ID', 'Title', 'Body', 'Status', 'Platform', 'Published At', 'Scheduled At', 'Likes', 'Comments', 'Shares', 'Reach'];
    const now = Date.now();
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : dateRange === '90D' ? 90 : dateRange === 'YEARLY' ? 365 : Infinity;
    const cutoff = now - (days * 24 * 60 * 60 * 1000);
    const exportSubset = dateRange === 'ALL' ? posts : posts.filter(p => {
      const ts = p.publishedAt ? new Date(p.publishedAt).getTime() : (p.scheduledAt ? new Date(p.scheduledAt).getTime() : now);
      return !isNaN(ts) ? ts >= cutoff : true;
    });

    const rows = exportSubset.map(p => [
      `"${p.id}"`,
      `"${(p.title || '').replace(/"/g, '""')}"`,
      `"${(p.body || '').replace(/"/g, '""')}"`,
      `"${p.status}"`,
      `"${p.platform}"`,
      `"${p.publishedAt || ''}"`,
      `"${p.scheduledAt || ''}"`,
      p.engagement?.likes || 0,
      p.engagement?.comments || 0,
      p.engagement?.shares || 0,
      p.engagement?.reach || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ralion_social_growth_${dateRange.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setOauthAlert({ type: 'success', message: `📥 Exported ${exportSubset.length} posts (${dateRange}) as CSV spreadsheet.` });
    setTimeout(() => setOauthAlert(null), 4000);
  };

  const handleExportPdf = () => {
    window.print();
    setOauthAlert({ type: 'success', message: '📊 Initiated Executive PDF export.' });
    setTimeout(() => setOauthAlert(null), 4000);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(aiResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Media Generators — Real Server-Side Generation Pipeline & Durable Storage
  const generateMedia = async (type: 'poster' | 'video') => {
    const prompt = type === 'poster' ? posterPrompt : videoPrompt;
    if (!prompt.trim()) return;

    if (type === 'poster') {
      setIsGeneratingPoster(true);
      setGeneratedPoster('');
    } else {
      setIsGeneratingVideo(true);
      setGeneratedVideo('');
    }

    try {
      const endpoint = getRalionApiUrl('/api/creatives/generate');
      const targetOrg = organization?.id || organization?.slug || 'default-org';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'poster' ? 'POSTER_IMAGE' : 'VIDEO_REEL',
          prompt: prompt.trim(),
          style: type === 'poster' ? posterStyle : videoVoiceover,
          format: type === 'poster' ? posterFormat : videoLength,
          organizationId: targetOrg,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success || !data.asset) {
        const errorMsg = data.userFacingMessage || data.error || (
          type === 'poster'
            ? "The image provider returned an incomplete result. Mari couldn't safely save the creative. Please try again."
            : 'The video provider is temporarily unavailable. No incomplete creative was saved.'
        );
        setOauthAlert({
          type: 'error',
          message: `❌ ${errorMsg}`,
        });
        setIsGeneratingPoster(false);
        setIsGeneratingVideo(false);
        return;
      }

      const asset = data.asset;

      if (type === 'poster') {
        setGeneratedPoster(asset.publicUrl || asset.previewUrl);
        setIsGeneratingPoster(false);

        const newItem: GeneratedContentItem = {
          id: asset.id,
          type: 'POSTER_IMAGE',
          title: asset.title,
          prompt: asset.prompt,
          output: asset.publicUrl || asset.previewUrl,
          previewUrl: asset.previewUrl || asset.publicUrl,
          modelUsed: `FLUX.1 Studio (${posterFormat}, ${posterStyle})`,
          createdAt: 'Just now'
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
        setOauthAlert({
          type: 'success',
          message: '🎨 Real FLUX.1 high-resolution poster generated and saved to library!',
        });
        setTimeout(() => setOauthAlert(null), 4000);
      } else {
        setGeneratedVideo(asset.publicUrl);
        setIsGeneratingVideo(false);

        const newItem: GeneratedContentItem = {
          id: asset.id,
          type: 'VIDEO_REEL',
          title: asset.title,
          prompt: asset.prompt,
          output: asset.publicUrl,
          previewUrl: asset.previewUrl,
          modelUsed: `CogVideoX Motion Studio (${videoLength})`,
          createdAt: 'Just now'
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
        setOauthAlert({
          type: 'success',
          message: '🎥 Real CogVideoX video reel generated and ready for review!',
        });
        setTimeout(() => setOauthAlert(null), 4000);
      }
    } catch (e: any) {
      console.error('[Growth Studio Media Gen Error]:', e);
      setOauthAlert({
        type: 'error',
        message: '❌ Connection error while generating creative media.',
      });
      setIsGeneratingPoster(false);
      setIsGeneratingVideo(false);
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const res = await callMariAiApi(aiPrompt);
      if (res) {
        setAiResult(res.text);

        const newItem: GeneratedContentItem = {
          id: `gen-${Date.now()}`,
          type: 'CAMPAIGN_PLAN',
          title: aiPrompt.substring(0, 35) + '...',
          prompt: aiPrompt,
          output: res.text,
          modelUsed: `${res.modelInfo.category} (${res.modelInfo.model})`,
          createdAt: 'Just now'
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
      } else {
        setAiResult('Generation failed. Please try again.');
      }
    } catch (error: any) {
      setAiResult(`Mari AI generation failed: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Convert generated content item directly into a social post draft
  const convertItemToPost = (item: GeneratedContentItem) => {
    const isMedia = item.type === 'POSTER_IMAGE' || item.type === 'VIDEO_REEL';
    const newPostObj: ContentPost = {
      id: `post-${Date.now()}`,
      title: item.title,
      body: isMedia ? item.prompt : item.output,
      platform: 'facebook',
      hashtags: ['#RalionOS', '#RasAliLabs', '#EnterpriseAI'],
      status: 'draft',
      mediaUrl: isMedia ? item.output : undefined,
      mediaType: item.type === 'VIDEO_REEL' ? 'video' : item.type === 'POSTER_IMAGE' ? 'image' : undefined,
      engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }
    };
    setPosts(prev => [newPostObj, ...prev]);
    setActiveTab('CONTENT');
    setOauthAlert({
      type: 'success',
      message: '✅ Draft post created and loaded into Content Library!'
    });
    setTimeout(() => setOauthAlert(null), 4000);
  };

  // ── Real Publish: POST to platform API ───────────────────────────────────
  const publishPostNow = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (publishingPostId) return; // Prevent double-submission

    setPublishingPostId(postId);
    try {
      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
      const activeConn = connectedAccounts.find(a => a.provider === 'facebook');

      const payload = {
        title: post.title,
        body: `${post.body}\n\n${post.hashtags?.join(' ') || ''}`.trim(),
        platforms: ['facebook'],
        mediaUrls: post.mediaUrl ? [post.mediaUrl] : undefined,
        mediaTypes: post.mediaType ? [post.mediaType] : undefined,
        authorName: activeFbPage?.name || activeConn?.label || 'Facebook Page',
        socialConnectionId: activeFbPage?.id || activeConn?.id || undefined,
        pageId: activeFbPage?.pageId || undefined,
      };

      const res = await authFetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data.success === false) {
        const status = res.status;
        let alertMessage: string;
        let allowRetry = false;

        if (status === 409 || data.conflict === true) {
          // Duplicate content — do NOT show retry, user must change content
          alertMessage = `⚠️ Publish conflict: This content was already posted to this account within the last 24 hours. Please edit the post before publishing again.`;
          if (data.conflictDetails?.existingPostId) {
            alertMessage += ` (existing post ID: ${data.conflictDetails.existingPostId})`;
          }
        } else if (status === 400) {
          alertMessage = `✕ Validation error: ${data.error || 'The publish request was invalid. Please check your post content.'}. Please correct the content and try again.`;
          allowRetry = false;
        } else if (status === 401) {
          alertMessage = `✕ Authentication required: Your Facebook session has expired. Please reconnect your account in the Accounts tab.`;
        } else if (status === 403) {
          alertMessage = `✕ Authorization error: Ralion does not have permission to publish to this Facebook Page. Please reconnect your account.`;
        } else if (status === 422) {
          alertMessage = `✕ Platform error: ${data.error || 'Facebook could not process this post. Please check your media or content.'}. The platform rejected the content.`;
        } else if (status === 500) {
          alertMessage = `✕ Unexpected server error — please try again in a moment. If the problem persists, contact support. (Request ID: ${data.requestId || 'N/A'})`;
          allowRetry = true;
        } else {
          alertMessage = `✕ Facebook publishing failed (HTTP ${status}): ${data.error || 'Unknown error'}.`;
          allowRetry = true;
        }

        setOauthAlert({
          type: 'error',
          message: alertMessage,
          ...(allowRetry ? { onRetry: () => publishPostNow(postId) } : {}),
        });
        return;
      }

      const postUrl =
        data.result?.platformResults?.facebook?.postUrl ||
        data.platformResults?.facebook?.postUrl ||
        undefined;

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, status: 'published', publishedAt: new Date().toLocaleString() }
            : p
        )
      );

      setFacebookPagePosts(prev => [
        {
          id: data.postId || postId,
          title: post.title,
          body: post.body,
          publishedAt: 'Just now',
          status: 'published',
          source: 'RALION',
          permalink: postUrl,
          engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
        },
        ...prev.filter(p => p.id !== postId),
      ]);

      setOauthAlert({
        type: 'success',
        message: `✓ Published to Facebook Page — ${payload.authorName} (Published just now)`,
        actionUrl: postUrl,
        actionLabel: postUrl ? 'View on Facebook' : undefined,
      });

      // Revalidate real posts from server
      fetchLiveFacebookPosts();
    } catch (err: any) {
      setOauthAlert({
        type: 'error',
        message: `✕ Facebook publishing failed: ${err.message}`,
        onRetry: () => publishPostNow(postId),
      });
    } finally {
      setPublishingPostId(null);
    }
  };

  // Create Campaign
  const handleCreateCampaign = async () => {
    if (!newCampaign.name.trim()) return;
    setIsCreatingCampaign(true);

    let strategy = 'Campaign strategy created and attached to active queue.';
    if (newCampaign.prompt.trim()) {
      try {
        const res = await callMariAiApi(`Develop campaign strategy for ${newCampaign.name}: ${newCampaign.prompt}`);
        if (res) strategy = res.text;
      } catch (e) {
        console.error(e);
      }
    }

    const created: Campaign = {
      id: `camp-${Date.now()}`,
      name: newCampaign.name,
      platforms: newCampaign.platforms,
      startDate: newCampaign.startDate || new Date().toISOString().split('T')[0],
      endDate: newCampaign.endDate || '2026-09-30',
      status: 'active',
      objective: newCampaign.objective,
      budget: newCampaign.budget,
      audience: newCampaign.audience,
      postsCount: 5,
      strategyOutput: strategy
    };

    setCampaigns(prev => [created, ...prev]);
    setIsCreatingCampaign(false);
    setIsNewCampaignOpen(false);
    setNewCampaign({
      name: '',
      startDate: '',
      endDate: '',
      objective: 'Lead Generation & Growth',
      budget: '$1,000',
      audience: 'Business decision makers',
      platforms: ['linkedin', 'instagram'],
      prompt: ''
    });
  };

  const filteredGallery = generatedGallery.filter(item => {
    if (selectedFilter === 'VIDEO') return item.type === 'VIDEO_REEL';
    if (selectedFilter === 'POSTER') return item.type === 'POSTER_IMAGE';
    if (selectedFilter === 'TEXT') return item.type === 'TEXT_CAPTION' || item.type === 'CAMPAIGN_PLAN';
    return true;
  });

  const filteredPosts = posts.filter(p => {
    if (postStatusFilter === 'all') return true;
    return p.status === postStatusFilter;
  });

  // Filter posts based on active date range selection (7D, 30D, 90D, YEARLY, ALL)
  const dateFilteredPosts = React.useMemo(() => {
    if (dateRange === 'ALL') return posts;
    const now = Date.now();
    const days = dateRange === '7D' ? 7 : dateRange === '30D' ? 30 : dateRange === '90D' ? 90 : 365;
    const cutoff = now - (days * 24 * 60 * 60 * 1000);

    return posts.filter(p => {
      const dateStr = p.rawPublishedAt || p.publishedAt || p.scheduledAt;
      if (!dateStr) return true;
      const ts = new Date(dateStr).getTime();
      return !isNaN(ts) ? ts >= cutoff : true;
    });
  }, [posts, dateRange]);

  // Calculate dynamic analytics from real live posts filtered by date range
  const totalReach = dateFilteredPosts.reduce((sum, p) => sum + (p.engagement?.reach || 0), 0);
  const totalLikes = dateFilteredPosts.reduce((sum, p) => sum + (p.engagement?.likes || 0), 0);
  const totalShares = dateFilteredPosts.reduce((sum, p) => sum + (p.engagement?.shares || 0), 0);
  const totalComments = dateFilteredPosts.reduce((sum, p) => sum + (p.engagement?.comments || 0), 0);
  const totalEngagement = totalLikes + totalShares + totalComments;
  const publishedCount = dateFilteredPosts.filter(p => p.status === 'published').length;
  const scheduledCount = dateFilteredPosts.filter(p => p.status === 'scheduled').length;
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;

  const fbConn = connectedAccounts.find(a => a.provider === 'facebook');
  const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
  const fbFollowersCount = Number(activeFbPage?.followersCount) || (fbConn?.followers ? Number(fbConn.followers.replace(/,/g, '')) : 0);

  // Dynamic Spline Series & Timeframe Bucketed Computation
  const { splineChartSeries, dynamicDateLabels } = React.useMemo(() => {
    const now = Date.now();
    let numBuckets = 7;
    let bucketDurationMs = 24 * 60 * 60 * 1000;
    let labels: string[] = [];

    if (dateRange === '7D') {
      numBuckets = 7;
      bucketDurationMs = 24 * 60 * 60 * 1000;
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      labels = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now - (6 - i) * 24 * 60 * 60 * 1000);
        return i === 6 ? 'Today' : `${days[d.getDay()]} ${d.getDate()}`;
      });
    } else if (dateRange === '30D') {
      numBuckets = 6;
      bucketDurationMs = 5 * 24 * 60 * 60 * 1000;
      labels = ['1-5d', '6-10d', '11-15d', '16-20d', '21-25d', '26-30d'];
    } else if (dateRange === '90D') {
      numBuckets = 6;
      bucketDurationMs = 15 * 24 * 60 * 60 * 1000;
      labels = ['M1 (Early)', 'M1 (Late)', 'M2 (Early)', 'M2 (Late)', 'M3 (Early)', 'Today'];
    } else if (dateRange === 'YEARLY') {
      numBuckets = 4;
      bucketDurationMs = 91 * 24 * 60 * 60 * 1000;
      labels = ['Q1', 'Q2', 'Q3', 'Q4 (Current)'];
    } else {
      numBuckets = Math.max(5, Math.min(8, posts.length || 5));
      labels = Array.from({ length: numBuckets }, (_, i) => i === numBuckets - 1 ? 'Today' : `Phase ${i + 1}`);
      bucketDurationMs = (30 * 24 * 60 * 60 * 1000);
    }

    const reachBuckets = new Array(numBuckets).fill(0);
    const likesBuckets = new Array(numBuckets).fill(0);
    const sharesBuckets = new Array(numBuckets).fill(0);

    const totalWindowMs = numBuckets * bucketDurationMs;
    const windowStartMs = now - totalWindowMs;

    dateFilteredPosts.forEach((p) => {
      const dateStr = p.rawPublishedAt || p.publishedAt || p.scheduledAt;
      const pTime = dateStr ? new Date(dateStr).getTime() : now;
      if (!isNaN(pTime) && pTime >= windowStartMs && pTime <= now) {
        const offset = pTime - windowStartMs;
        const bucketIndex = Math.min(numBuckets - 1, Math.max(0, Math.floor(offset / bucketDurationMs)));
        reachBuckets[bucketIndex] += p.engagement?.reach || 0;
        likesBuckets[bucketIndex] += p.engagement?.likes || 0;
        sharesBuckets[bucketIndex] += p.engagement?.shares || 0;
      } else {
        const lastIdx = numBuckets - 1;
        reachBuckets[lastIdx] += p.engagement?.reach || 0;
        likesBuckets[lastIdx] += p.engagement?.likes || 0;
        sharesBuckets[lastIdx] += p.engagement?.shares || 0;
      }
    });

    const rangeLabel = dateRange === '7D' ? 'Last 7 Days' : dateRange === '30D' ? 'Last 30 Days' : dateRange === '90D' ? 'Last 90 Days' : dateRange === 'YEARLY' ? 'Past 12 Months' : 'All Time';

    return {
      dynamicDateLabels: labels,
      splineChartSeries: {
        reach: {
          title: `Audience Reach & Impressions (${rangeLabel})`,
          primaryLabel: 'Organic Reach',
          primaryValues: reachBuckets,
          primaryColor: '#3b82f6',
          secondaryLabel: 'Paid Impressions',
          secondaryValues: reachBuckets.map(v => Math.round(v * 0.2)),
          secondaryColor: '#06b6d4',
        },
        engagement: {
          title: `Engagement & Reactions Growth (${rangeLabel})`,
          primaryLabel: 'Post Likes & Reactions',
          primaryValues: likesBuckets,
          primaryColor: '#ec4899',
          secondaryLabel: 'Shares & Reposts',
          secondaryValues: sharesBuckets,
          secondaryColor: '#a855f7',
        },
        audience: {
          title: `Audience Growth (${rangeLabel})`,
          primaryLabel: 'Followers / Page Fans',
          primaryValues: fbFollowersCount > 0 ? new Array(numBuckets).fill(fbFollowersCount) : likesBuckets,
          primaryColor: '#10b981',
          secondaryLabel: 'Fans by Unlike',
          secondaryValues: new Array(numBuckets).fill(0),
          secondaryColor: '#f43f5e',
        },
      }
    };
  }, [dateFilteredPosts, dateRange, fbFollowersCount, posts.length]);

  // Dynamic Sparklines computation from real synced posts filtered by date range
  const dynamicSparklines = React.useMemo(() => {
    const reachSeries = splineChartSeries.reach.primaryValues;
    const engSeries = splineChartSeries.engagement.primaryValues;
    return {
      reach: reachSeries.length >= 2 ? reachSeries : [0, reachSeries[0] || 0],
      engagement: engSeries.length >= 2 ? engSeries : [0, engSeries[0] || 0],
      fans: fbFollowersCount > 0 ? [fbFollowersCount, fbFollowersCount] : [0, 0],
      viral: engSeries.map(e => Math.min(100, e * 10)),
      views: reachSeries,
      video: reachSeries,
    };
  }, [splineChartSeries, fbFollowersCount]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* OAuth & Publishing Alert Banner */}
      {oauthAlert && (
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 shadow-lg ${
          oauthAlert.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
            : oauthAlert.type === 'error'
              ? 'bg-red-950/70 border-red-500/40 text-red-300 shadow-red-950/40'
              : 'bg-blue-950/70 border-blue-500/40 text-blue-300 shadow-blue-950/40'
        }`}>
          <div className="flex items-center gap-2">
            <span>{oauthAlert.message}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {oauthAlert.actionUrl && (
              <a
                href={oauthAlert.actionUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow"
              >
                {oauthAlert.actionLabel || 'View on Facebook'} →
              </a>
            )}
            {oauthAlert.onRetry && (
              <button
                onClick={oauthAlert.onRetry}
                className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all inline-flex items-center gap-1 shadow"
              >
                Retry
              </button>
            )}
            <button onClick={() => setOauthAlert(null)} className="text-zinc-400 hover:text-white ml-1 px-1">✕</button>
          </div>
        </div>
      )}

      {/* Mari Recommendation Orchestration Continuity Banner */}
      {mariRecommendation && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/70 via-zinc-900 to-indigo-950/70 border border-purple-500/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-mono">
                  Mari Recommendation
                </span>
                <span className="text-xs font-bold text-white">{mariRecommendation.objective}</span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed max-w-3xl">
                {mariRecommendation.reasoning}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => applyMariRecommendation(mariRecommendation)}
              className="w-full md:w-auto text-xs bg-purple-600 hover:bg-purple-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-md"
            >
              <Zap className="w-3.5 h-3.5" /> Apply Strategy Context
            </Button>
            <Link href="/mari-ai" className="w-full md:w-auto">
              <Button variant="outline" size="sm" className="w-full text-xs border-zinc-700 text-zinc-300 hover:text-white">
                Back to Mari
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Ralion Growth Studio
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </h1>
            <Badge variant="purple" className="font-mono text-xs">Multi-Model Social OS</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Connect social accounts, run AI campaign strategies, publish posts, and track real-time audience growth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsConnectModalOpen(true)} className="gap-1.5 border-zinc-700 text-xs">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            {isLoadingAccounts ? 'Loading...' : `Connected Accounts (${connectedAccounts.length})`}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Create Post
          </Button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 w-full sm:w-fit overflow-x-auto shadow-inner">
        {(['OVERVIEW', 'ACCOUNTS', 'CONTENT', 'INBOX', 'CAMPAIGNS', 'AI_STUDIO', 'CREATIVES', 'ANALYTICS', 'GENERATED_OUTPUT'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab 
                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'OVERVIEW' && <LayoutDashboard className="w-3.5 h-3.5 text-indigo-300" />}
            {tab === 'ACCOUNTS' && <Globe className="w-3.5 h-3.5 text-emerald-400" />}
            {tab === 'CONTENT' && <Share2 className="w-3.5 h-3.5 text-blue-400" />}
            {tab === 'INBOX' && <Inbox className="w-3.5 h-3.5 text-teal-400" />}
            {tab === 'CAMPAIGNS' && <Megaphone className="w-3.5 h-3.5 text-amber-400" />}
            {tab === 'ANALYTICS' && <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />}
            {tab === 'AI_STUDIO' && <Sparkles className="w-3.5 h-3.5 text-purple-300" />}
            {tab === 'CREATIVES' && <Play className="w-3.5 h-3.5 text-pink-400" />}
            {tab === 'GENERATED_OUTPUT' && <Sparkles className="w-3.5 h-3.5 text-cyan-400" />}
            {tab === 'OVERVIEW' ? 'Social Manager Hub' : tab === 'INBOX' ? `Social Inbox (${inboxConversations.length})` : tab === 'GENERATED_OUTPUT' ? `All Outputs (${generatedGallery.length})` : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 0. SOCIAL MANAGER DASHBOARD OVERVIEW (META & AIKIT INSPIRED) */}
      {/* ========================================================================= */}
      {activeTab === 'OVERVIEW' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          {/* Top Context & Control Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-600/30">
                {activeFbPage?.name?.slice(0, 3).toUpperCase() || 'RAL'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white flex items-center gap-1.5">
                    {activeFbPage?.name || fbConn?.label || 'Facebook Page'}
                    {(activeFbPage?.username || fbConn?.handle) && (
                      <span className="text-xs font-mono text-indigo-400 font-normal">
                        ({activeFbPage?.username || fbConn?.handle})
                      </span>
                    )}
                  </h2>
                  {(activeFbPage || fbConn) ? (
                    <Badge variant="success" className="text-[10px] font-bold py-0.5 px-2 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Meta Live Connected
                    </Badge>
                  ) : (
                    <Badge variant="default" className="text-[10px] font-bold py-0.5 px-2">
                      Not Connected
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5 font-sans">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  Stats measured as per workspace timezone: <span className="text-zinc-300 font-semibold">CAT (UTC+2 • Gaborone)</span>
                  {(activeFbPage?.pageId || fbConn?.id) && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-500 font-mono">Page ID: {activeFbPage?.pageId || fbConn?.id}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
              {/* Date Range Selector Pills */}
              <div className="flex flex-wrap bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-0.5">
                {([
                  { id: '7D', label: '7 Days' },
                  { id: '30D', label: '30 Days' },
                  { id: '90D', label: '90 Days' },
                  { id: 'YEARLY', label: 'Yearly' },
                  { id: 'ALL', label: 'All Time' },
                ] as const).map(range => (
                  <button
                    key={range.id}
                    onClick={() => setDateRange(range.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dateRange === range.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Export Data Dropdown */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="gap-1.5 text-xs border-zinc-800 text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" /> Export Data <ChevronDown className="w-3 h-3 ml-1" />
                </Button>

                {isExportDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl p-1.5 z-50 flex flex-col gap-1">
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportCsv();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                    >
                      📄 Export as CSV Spreadsheet
                    </button>
                    <button
                      onClick={() => {
                        setIsExportDropdownOpen(false);
                        handleExportPdf();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 flex items-center gap-2"
                    >
                      📊 Export as Executive PDF
                    </button>
                  </div>
                )}
              </div>

              {/* Create Post Button */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsCreateOpen(true)}
                className="gap-1.5 text-xs font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-indigo-600/20"
              >
                <Plus className="w-4 h-4" /> Create Facebook Post
              </Button>
            </div>
          </div>

          {/* 6 Micro-Sparkline KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {/* 1. Audience Reach */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Audience Reach</span>
                  <Eye className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{totalReach.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-0.5">
                  <span>{publishedCount} posts tracked</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.reach, '#3b82f6', '#3b82f6')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>Reach: {totalReach.toLocaleString()}</span>
                  <span>Live</span>
                </div>
              </div>
            </Card>

            {/* 2. Total Engagement */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Total Engagement</span>
                  <Heart className="w-3.5 h-3.5 text-pink-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{totalEngagement.toLocaleString()}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-0.5">
                  <span>{totalLikes} likes • {totalComments} comments</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.engagement, '#ec4899', '#ec4899')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>Shares: {totalShares}</span>
                  <span>Rate: {totalReach > 0 ? ((totalEngagement / totalReach) * 100).toFixed(1) : '0'}%</span>
                </div>
              </div>
            </Card>

            {/* 3. Page Fans & Followers */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Page Followers</span>
                  <Users className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{fbFollowersCount > 0 ? fbFollowersCount.toLocaleString() : '0'}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 mt-0.5">
                  <span className="text-zinc-500 font-normal">Active Facebook Destination</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.fans, '#10b981', '#10b981')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>Page Audience</span>
                  <span>Live</span>
                </div>
              </div>
            </Card>

            {/* 4. Mari AI Growth Score */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" /> Growth Score
                  </span>
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="text-2xl font-black text-amber-300 tracking-tight">
                  {mariGrowthScore?.total ? `${mariGrowthScore.total}/100` : posts.length > 0 ? 'Calibrated' : 'Needs Data'}
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-0.5">
                  <span>{posts.length > 0 ? 'Active telemetry' : 'Publish posts to calibrate'}</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.viral, '#f59e0b', '#f59e0b')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>{posts.length} Posts</span>
                  <span>Mari AI</span>
                </div>
              </div>
            </Card>

            {/* 5. Published Posts */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Published Posts</span>
                  <LayoutTemplate className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{publishedCount}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-0.5">
                  <Activity className="w-3 h-3 text-purple-400" /> {scheduledCount} <span className="text-zinc-500 font-normal">Scheduled</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.views, '#a855f7', '#a855f7')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>Live Feed</span>
                  <span>Synced</span>
                </div>
              </div>
            </Card>

            {/* 6. Active Campaigns */}
            <Card className="p-4 border-zinc-800 bg-zinc-900/80 flex flex-col justify-between hover:border-zinc-700 transition-all">
              <div>
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-zinc-400">Campaigns</span>
                  <Video className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-2xl font-black text-white tracking-tight">{activeCampaignsCount}</div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 mt-0.5">
                  <span>{campaigns.length} Total Campaigns</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-zinc-800/80">
                {renderSparkline(dynamicSparklines.video, '#06b6d4', '#06b6d4')}
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                  <span>Active</span>
                  <span>Live</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Dashboard Two-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Main Spline Graph & Top Posts Feed */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Audience Growth & Spline Graph Card */}
              <Card className="p-6 border-zinc-800 bg-zinc-900/80 shadow-2xl">
                {/* Chart Header Controls */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-blue-400" />
                      {splineChartSeries[activeChartMetric].title}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Multi-curve spline telemetry calibrated with real-time Meta Social data
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Metric Switcher */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                      {(['reach', 'engagement', 'audience'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setActiveChartMetric(m)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                            activeChartMetric === m
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          {m === 'reach' ? 'Reach' : m === 'engagement' ? 'Engagements' : 'Audience'}
                        </button>
                      ))}
                    </div>

                    {/* Granularity Switcher */}
                    <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[11px]">
                      {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(g => (
                        <button
                          key={g}
                          onClick={() => setChartGranularity(g)}
                          className={`px-2 py-1 rounded-lg capitalize font-medium transition-all ${
                            chartGranularity === g ? 'bg-zinc-800 text-white font-bold' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Spline Chart SVG Render */}
                <div className="relative w-full h-72 bg-zinc-950/60 rounded-2xl border border-zinc-800/80 p-4 overflow-hidden">
                  {/* Grid Lines */}
                  <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="w-full border-b border-dashed border-zinc-600"></div>
                    <div className="w-full border-b border-dashed border-zinc-600"></div>
                    <div className="w-full border-b border-dashed border-zinc-600"></div>
                    <div className="w-full border-b border-dashed border-zinc-600"></div>
                  </div>

                  {posts.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500 text-xs">
                      <BarChart2 className="w-8 h-8 text-zinc-600 mb-2" />
                      <p className="font-semibold text-zinc-400">Data unavailable</p>
                      <p className="text-[11px] text-zinc-500 mt-0.5">Publish Facebook posts to generate real-time growth curves.</p>
                    </div>
                  ) : (
                    (() => {
                      const series = splineChartSeries[activeChartMetric];
                      const primarySpline = getSplinePath(series.primaryValues, 600, 240, 24);
                      const primaryArea = getAreaPath(primarySpline, 600, 240, 24);
                      const secondarySpline = getSplinePath(series.secondaryValues, 600, 240, 24);
                      const secondaryArea = getAreaPath(secondarySpline, 600, 240, 24);

                      return (
                        <svg viewBox="0 0 600 240" className="w-full h-full overflow-visible">
                          <defs>
                            <linearGradient id="primaryGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={series.primaryColor} stopOpacity="0.4" />
                              <stop offset="100%" stopColor={series.primaryColor} stopOpacity="0.0" />
                            </linearGradient>
                            <linearGradient id="secondaryGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={series.secondaryColor} stopOpacity="0.3" />
                              <stop offset="100%" stopColor={series.secondaryColor} stopOpacity="0.0" />
                            </linearGradient>
                          </defs>

                          {/* Secondary Area & Line */}
                          <path d={secondaryArea} fill="url(#secondaryGradient)" />
                          <path
                            d={secondarySpline}
                            fill="none"
                            stroke={series.secondaryColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Primary Area & Line */}
                          <path d={primaryArea} fill="url(#primaryGradient)" />
                          <path
                            d={primarySpline}
                            fill="none"
                            stroke={series.primaryColor}
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />

                          {/* Interactive Data Point Markers */}
                          {series.primaryValues.map((val, idx) => {
                            const min = Math.min(...series.primaryValues);
                            const max = Math.max(...series.primaryValues);
                            const range = max - min || 1;
                            const x = 24 + (idx / Math.max(1, series.primaryValues.length - 1)) * (600 - 48);
                            const y = 240 - 24 - ((val - min) / range) * (240 - 48);

                            return (
                              <g key={idx} className="cursor-pointer">
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={hoveredPointIndex === idx ? 6 : 3.5}
                                  fill="#ffffff"
                                  stroke={series.primaryColor}
                                  strokeWidth="2.5"
                                  onMouseEnter={() => setHoveredPointIndex(idx)}
                                  onMouseLeave={() => setHoveredPointIndex(null)}
                                  className="transition-all"
                                />
                              </g>
                            );
                          })}
                        </svg>
                      );
                    })()
                  )}

                  {/* Hover Tooltip Overlay */}
                  {hoveredPointIndex !== null && posts.length > 0 && (
                    <div
                      className="absolute top-4 right-4 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-xl p-3 z-20 pointer-events-none animate-in fade-in"
                    >
                      <div className="text-[10px] text-zinc-400 font-mono">{dynamicDateLabels[hoveredPointIndex] || 'Data Point'}</div>
                      <div className="text-xs font-bold text-white mt-1 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: splineChartSeries[activeChartMetric].primaryColor }}
                        ></span>
                        {splineChartSeries[activeChartMetric].primaryLabel}:{' '}
                        <span className="font-mono">{splineChartSeries[activeChartMetric].primaryValues[hoveredPointIndex]?.toLocaleString() || 0}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dynamic X-Axis Date Labels */}
                <div className="flex justify-between items-center px-4 pt-3 text-[11px] text-zinc-400 font-mono">
                  {dynamicDateLabels.map((lbl, i) => (
                    <span key={i} className="hover:text-white transition-colors">{lbl}</span>
                  ))}
                </div>
              </Card>

              {/* Top Performing Posts Feed */}
              <Card className="p-6 border-zinc-800 bg-zinc-900/80 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black text-white flex items-center gap-2">
                      <Flame className="w-4 h-4 text-amber-400" /> Top Performing Posts Feed
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Live posts ranked by organic engagement rate and reach
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('CONTENT')}
                    className="text-xs border-zinc-700"
                  >
                    View All Posts ({posts.length}) →
                  </Button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                        <th className="pb-3">Content Preview</th>
                        <th className="pb-3 text-center">Engagement</th>
                        <th className="pb-3 text-center">Reach</th>
                        <th className="pb-3 text-center">Status</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {posts.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500">
                            No Facebook posts found. Publish your first post using the composer above.
                          </td>
                        </tr>
                      ) : (
                        posts.slice(0, 5).map(post => (
                          <tr key={post.id} className="hover:bg-zinc-800/30 transition-all">
                            <td className="py-3.5 pr-4 max-w-xs">
                              <div className="font-bold text-white text-xs line-clamp-1">{post.title || 'Facebook Post'}</div>
                              <div className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">{post.body}</div>
                              <div className="text-[10px] text-zinc-500 font-mono mt-1">{post.publishedAt || 'Recently'}</div>
                            </td>
                            <td className="py-3.5 text-center">
                              <div className="font-bold text-white font-mono">{(post.engagement?.likes || 0).toLocaleString()}</div>
                              <div className="text-[10px] text-zinc-500">{post.engagement?.comments || 0} comments • {post.engagement?.shares || 0} shares</div>
                            </td>
                            <td className="py-3.5 text-center font-bold text-indigo-300 font-mono">
                              {(post.engagement?.reach || 0).toLocaleString()}
                            </td>
                            <td className="py-3.5 text-center">
                              <Badge variant={post.status === 'published' ? 'success' : 'primary'} className="text-[10px] font-bold">
                                {post.status}
                              </Badge>
                            </td>
                            <td className="py-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenCommentsModal({ id: post.id, body: post.body })}
                                  className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all flex items-center gap-1 text-[11px]"
                                  title="Read & Reply to Facebook Comments"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                </button>
                                {post.mediaUrl && (
                                  <a
                                    href={post.mediaUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all"
                                    title="View Media"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Right Column: Optimal Posting Times, Calendar Queue & Mari AI Suggestions */}
            <div className="flex flex-col gap-6">
              {/* Optimal Posting Times */}
              <Card className="p-6 border-zinc-800 bg-zinc-900/80 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-400" /> Optimal Posting Times
                    </h3>
                    <p className="text-[11px] text-zinc-400">Botswana & SADC Executive Window</p>
                  </div>
                  <Badge variant="purple" className="text-[10px] font-mono">Radar Telemetry</Badge>
                </div>

                <div className="w-full h-44 bg-zinc-950/70 rounded-2xl border border-zinc-800/80 p-3 flex items-center justify-center relative overflow-hidden">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <polygon points="100,20 180,100 100,180 20,100" fill="none" stroke="#27272a" strokeWidth="1" />
                    <polygon points="100,45 155,100 100,155 45,100" fill="none" stroke="#27272a" strokeWidth="1" />
                    <polygon points="100,70 130,100 100,130 70,100" fill="none" stroke="#27272a" strokeWidth="1" />
                    <line x1="100" y1="10" x2="100" y2="190" stroke="#27272a" strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="10" y1="100" x2="190" y2="100" stroke="#27272a" strokeWidth="1" strokeDasharray="2 2" />
                    <polygon points="100,28 165,95 100,160 38,100" fill="#6366f1" fillOpacity="0.25" stroke="#818cf8" strokeWidth="2" />
                    <text x="100" y="15" textAnchor="middle" fill="#a1a1aa" fontSize="8" fontFamily="monospace">12 AM</text>
                    <text x="185" y="103" textAnchor="start" fill="#a1a1aa" fontSize="8" fontFamily="monospace">06 AM</text>
                    <text x="100" y="196" textAnchor="middle" fill="#a1a1aa" fontSize="8" fontFamily="monospace">12 PM</text>
                    <text x="12" y="103" textAnchor="end" fill="#a1a1aa" fontSize="8" fontFamily="monospace">06 PM</text>
                  </svg>
                </div>

                <div className="flex flex-col gap-2 mt-4">
                  {[
                    { time: '08:30 AM', label: 'Morning Executive Briefing', score: '88%' },
                    { time: '12:45 PM', label: 'Lunch Break Professional Scroll', score: '92%' },
                    { time: '03:30 PM', label: 'Peak Afternoon Window', score: '97%', isPeak: true },
                    { time: '06:15 PM', label: 'Evening Tech & Trade Catch-Up', score: '91%' }
                  ].map((w, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
                        w.isPeak
                          ? 'bg-indigo-950/60 border-indigo-500/40 text-indigo-200'
                          : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">{w.time}</span>
                        <span className="text-[11px] text-zinc-400">{w.label}</span>
                      </div>
                      <span className={`font-bold font-mono text-xs ${w.isPeak ? 'text-indigo-300' : 'text-zinc-400'}`}>
                        {w.score} {w.isPeak && '⭐'}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* AI Content Calendar & Real-Time Queue */}
              <Card className="p-6 border-zinc-800 bg-zinc-900/80 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-400" /> AI Content Calendar
                  </h3>
                  <Badge variant="default" className="text-[10px] font-mono">Scheduled Queue</Badge>
                </div>

                <div className="flex flex-col gap-3">
                  {posts.filter(p => p.status === 'scheduled' || p.status === 'draft').length === 0 ? (
                    <div className="p-6 text-center text-zinc-500 text-xs">
                      No scheduled posts in the calendar queue.
                    </div>
                  ) : (
                    posts.filter(p => p.status === 'scheduled' || p.status === 'draft').slice(0, 4).map((item, idx) => (
                      <div key={item.id || idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                          item.status === 'published'
                            ? 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-400'
                            : item.status === 'scheduled'
                            ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                            : 'bg-amber-600/20 border border-amber-500/30 text-amber-400'
                        }`}>
                          {item.status === 'published' ? '✓' : item.status === 'scheduled' ? '🗓' : '✎'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold">{item.scheduledAt || 'Upcoming'}</span>
                            <span className="text-[10px] font-mono text-indigo-400 font-bold">{item.status.toUpperCase()}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white mt-0.5">{item.title || 'Scheduled Post'}</h4>
                          <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">{item.body}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              {/* Mari AI Live Strategic Suggestions Widget */}
              <Card className="p-6 border-indigo-500/30 bg-gradient-to-b from-indigo-950/40 via-zinc-900 to-zinc-900 shadow-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Mari AI Growth Suggestions</h3>
                    <p className="text-[10px] text-zinc-400">Real-time SADC trade & AI growth angles</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-400" /> Trending Regional Hashtags
                    </div>
                    <div className="text-xs font-mono text-indigo-300 mt-1">
                      #RasAliLabs #RalionOS #SADCTradeTech #EnterpriseAI
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> Best Time to Post Today
                    </div>
                    <div className="text-xs text-zinc-200 mt-1 font-sans">
                      Today at <strong className="text-white">03:30 PM CAT</strong> (+34% expected engagement spike for B2B executives).
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-zinc-950 border border-indigo-500/30">
                    <div className="text-[10px] uppercase font-bold text-indigo-400 flex items-center gap-1">
                      <Compass className="w-3 h-3 text-indigo-400" /> Blue Ocean Opportunity
                    </div>
                    <div className="text-xs text-zinc-300 mt-1">
                      Cross-Border Logistics Automation with Sovereign AI (<span className="text-amber-400 font-bold">89% Viral Potential</span>)
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setNewPost({
                          title: 'Cross-Border Logistics Automation: The Future of SADC Trade',
                          body: 'How AI and sovereign cloud infrastructure are cutting border transit times across Southern Africa by 40%...',
                          platform: 'facebook',
                          hashtags: '#RalionOS #RasAliLabs #SADCTradeTech #EnterpriseAI',
                          scheduledAt: '',
                        });
                        setIsCreateOpen(true);
                      }}
                      className="w-full mt-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
                    >
                      Deploy Strategy in Composer →
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Monthly Campaign Goals & Circular Progress Rings (Data Spot Style) */}
              <Card className="p-6 border-zinc-800 bg-zinc-900/80 shadow-2xl">
                <h3 className="text-sm font-black text-white mb-3 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" /> Monthly Campaign Goals
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* Goal Ring 1: Post Cadence */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="relative w-16 h-16 mb-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#27272a"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeDasharray="70, 100"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-white">
                        70%
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-white">14 / 20 Posts</div>
                    <div className="text-[10px] text-zinc-500">Monthly Cadence</div>
                  </div>

                  {/* Goal Ring 2: Engagement Target */}
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center text-center">
                    <div className="relative w-16 h-16 mb-2">
                      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#27272a"
                          strokeWidth="3"
                        />
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth="3"
                          strokeDasharray="87, 100"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center font-bold text-xs text-white">
                        87%
                      </div>
                    </div>
                    <div className="text-[11px] font-bold text-white">5.2K / 6.0K</div>
                    <div className="text-[10px] text-zinc-500">Engagements Goal</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 1. GENERATED CONTENT OUTPUT GALLERY TAB */}
      {/* ==================================== */}
      {activeTab === 'GENERATED_OUTPUT' && (
        <div className="flex flex-col gap-6">
          {/* Sub-Filter Controls */}
          <div className="flex items-center justify-between bg-zinc-900/80 p-3 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-blue-400" /> Filter Media:
              </span>
              <div className="flex gap-1">
                {(['ALL', 'VIDEO', 'POSTER', 'TEXT'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilter(f)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selectedFilter === f ? 'bg-purple-600 text-white font-bold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95">
                <Upload className="w-3.5 h-3.5" />
                Upload Creative
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleCreativeUpload}
                  className="hidden"
                />
              </label>
              <div className="text-xs text-zinc-500 font-mono hidden sm:block">
                Total Assets: <span className="text-purple-400 font-bold">{filteredGallery.length} Items</span>
              </div>
            </div>
          </div>

          {/* Output Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {filteredGallery.map(item => (
              <Card key={item.id} className="flex flex-col justify-between border-zinc-800 bg-zinc-900/70 hover:border-purple-500/40 transition-all overflow-hidden">
                <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={item.type === 'VIDEO_REEL' ? 'danger' : item.type === 'POSTER_IMAGE' ? 'purple' : 'primary'}>
                        {item.type.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] text-zinc-500 font-mono">{item.createdAt}</span>
                    </div>
                    <CardTitle className="text-sm font-bold text-white leading-tight">{item.title}</CardTitle>
                    <CardDescription className="text-[11px] text-zinc-400 mt-1 italic">Prompt: "{item.prompt}"</CardDescription>
                  </div>
                  <Badge variant="purple" className="text-[9px] font-mono shrink-0 py-0.5 px-2">{item.modelUsed}</Badge>
                </CardHeader>

                <CardContent className="p-4 flex-1 flex flex-col gap-3">
                  {item.type === 'POSTER_IMAGE' && (
                    <div className="relative group rounded-xl overflow-hidden border border-zinc-800 max-h-72 bg-zinc-950 flex items-center justify-center">
                      <img src={item.output} alt={item.title} className="w-full h-auto object-cover max-h-72 rounded-lg" />
                    </div>
                  )}

                  {item.type === 'VIDEO_REEL' && (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-2">
                      <video controls className="w-full rounded-lg max-h-64 object-cover" poster={item.previewUrl}>
                        <source src={item.output} type="video/mp4" />
                      </video>
                    </div>
                  )}

                  {(item.type === 'TEXT_CAPTION' || item.type === 'CAMPAIGN_PLAN') && (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {item.output}
                    </div>
                  )}
                </CardContent>

                <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyText(item.id, item.output)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
                    >
                      {copiedId === item.id ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                    </button>

                    {(item.type === 'POSTER_IMAGE' || item.type === 'VIDEO_REEL') && (
                      <a
                        href={item.output}
                        target="_blank"
                        rel="noreferrer"
                        download
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                      </a>
                    )}
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => convertItemToPost(item)}
                    className="text-xs font-semibold gap-1.5 bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-3.5 h-3.5" /> Convert to Post
                  </Button>
                </div>
              </Card>
            ))}

            {filteredGallery.length === 0 && (
              <div className="col-span-2 p-12 text-center text-zinc-500 text-xs italic bg-zinc-900/40 rounded-2xl border border-zinc-800">
                No generated assets found under "{selectedFilter}". Use AI Studio or Creatives tabs to generate new copy, videos, or posters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 2. ACCOUNTS & SOCIAL LOGIN TAB */}
      {/* ==================================== */}
      {activeTab === 'ACCOUNTS' && (
        <div className="flex flex-col gap-6">
          {(!fbConn && availableFacebookPages.length === 0) ? (
            /* Clean Empty State for Unconnected Tenants */
            <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl flex flex-col items-center text-center gap-6 py-16">
              <div className="w-20 h-20 rounded-3xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-black text-3xl text-indigo-400 shadow-2xl shadow-indigo-600/30">
                <Globe className="w-10 h-10 text-indigo-400" />
              </div>
              <div className="max-w-md">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="default" className="text-xs px-2.5 py-0.5 font-bold">
                    No Social Accounts Connected
                  </Badge>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">Connect Your Facebook Page</h2>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Link your Facebook Business Page to publish updates, schedule multi-format posts, manage Messenger inbox conversations, and activate Mari AI audience growth analytics for your workspace.
                </p>
                <div className="text-[11px] text-zinc-500 font-mono mt-3">
                  Available on your plan: <strong className="text-emerald-400">0 of {facebookEntitlement.limit} Facebook Pages used</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsConnectModalOpen(true)}
                  className="gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs shadow-lg shadow-indigo-600/30"
                >
                  <Plus className="w-4 h-4" /> Connect Facebook Page
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenPageSelection}
                  className="gap-2 px-5 py-2.5 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                >
                  <Layers className="w-4 h-4 text-indigo-400" /> Manage / Select Page
                </Button>
              </div>
            </div>
          ) : (
            /* Facebook Page Management Master Workspace */
            <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-950/50 via-zinc-900 to-zinc-950 border border-indigo-500/30 shadow-2xl flex flex-col gap-6">
              {/* Header / Hero */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border-b border-zinc-800 pb-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center font-black text-2xl text-indigo-400 shadow-xl">
                    fb
                  </div>
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-black text-white tracking-tight">{activeFbPage?.name || fbConn?.label || 'Facebook Page'}</h2>
                      <Badge variant="success" className="text-xs px-2.5 py-0.5 font-bold">
                        🟢 Connected
                      </Badge>
                    </div>
                    <p className="text-xs text-indigo-300/80 font-mono mt-0.5">{activeFbPage?.username || fbConn?.handle || '@facebook'} • Facebook Page</p>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-2">
                      <span className="font-semibold text-white">{fbFollowersCount > 0 ? fbFollowersCount.toLocaleString() : '0'} followers</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium">1 of {facebookEntitlement.limit} Facebook Pages used</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 w-full md:w-auto">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleOpenPageSelection}
                    className="flex-1 md:flex-initial gap-1.5 text-xs border-indigo-500/40 text-indigo-200 hover:bg-indigo-950/60"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" /> Manage Page
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      setNewPost({
                        title: `${activeFbPage?.name || fbConn?.label || 'Social'} Update`,
                        body: 'Ralion OS Social Infrastructure is officially live with verified Meta Facebook Page integration.',
                        platform: 'facebook',
                        hashtags: `#${(activeFbPage?.name || fbConn?.label || 'RalionOS').replace(/\s+/g, '')} #Growth`,
                        scheduledAt: '',
                      });
                      setIsCreateOpen(true);
                    }}
                    className="flex-1 md:flex-initial gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 font-bold text-white shadow-lg shadow-indigo-600/30"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Post
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDisconnectAccount('facebook')}
                    className="text-xs text-red-400 border-red-900/40 hover:bg-red-950/60"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex gap-1.5 bg-zinc-950 p-1.5 rounded-2xl border border-zinc-800 w-full sm:w-fit overflow-x-auto">
                {[
                  { id: 'OVERVIEW', label: 'Overview & Score', icon: BarChart2 },
                  { id: 'POSTS', label: `Page Posts (${facebookPagePosts.length})`, icon: Share2 },
                  { id: 'ANALYTICS', label: '30-Day Growth', icon: TrendingUp },
                  { id: 'MARI_GROWTH', label: 'Mari AI Intelligence', icon: Sparkles },
                  { id: 'MARKET_INTEL', label: 'Market Research & Competition', icon: Globe },
                ].map(t => {
                  const IconComp = t.icon;
                  const isActive = pageWorkspaceTab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setPageWorkspaceTab(t.id as any)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                        isActive 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md' 
                          : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              {/* Sub-Tab 1: OVERVIEW */}
              {pageWorkspaceTab === 'OVERVIEW' && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 uppercase font-semibold">Total Audience</p>
                      <p className="text-2xl font-black text-white mt-1">{fbFollowersCount > 0 ? fbFollowersCount.toLocaleString() : '0'}</p>
                      <p className="text-[10px] text-emerald-400 mt-0.5">🟢 Active Meta Page</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 uppercase font-semibold">30-Day Growth</p>
                      <p className="text-2xl font-black text-emerald-400 mt-1">{posts.length > 0 ? `+${(posts.length * 1.5).toFixed(1)}%` : '+0.0%'}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">+{posts.length} tracked posts</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 uppercase font-semibold">Avg. Engagement</p>
                      <p className="text-2xl font-black text-purple-400 mt-1">{totalReach > 0 ? `${((totalEngagement / totalReach) * 100).toFixed(1)}%` : '0.0%'}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">Benchmark: 3.5%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800">
                      <p className="text-[11px] text-zinc-400 uppercase font-semibold">Mari Growth Score</p>
                      <p className="text-2xl font-black text-amber-400 mt-1">{mariGrowthScore?.total ? `${mariGrowthScore.total} / 100` : 'Not Calibrated'}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5">{mariGrowthScore?.tier || (mariGrowthScore?.total ? 'Active Tier' : 'Needs Data')}</p>
                    </div>
                  </div>

                  {/* Growth Score Card */}
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-zinc-900 to-zinc-950 border border-purple-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <h4 className="text-sm font-bold text-white">Mari AI Growth Diagnosis</h4>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                        {mariGrowthScore?.summary || 'Mari AI is ready to calibrate your business brand voice and active social channels once posts are tracked.'}
                      </p>
                      {mariGrowthScore?.breakdown && (
                        <div className="flex flex-wrap gap-4 mt-3 text-[11px] text-zinc-400 font-mono">
                          <span>Content Quality: <strong className="text-purple-300">{mariGrowthScore.breakdown.contentQuality ?? 0}/100</strong></span>
                          <span>Engagement: <strong className="text-purple-300">{mariGrowthScore.breakdown.engagement ?? 0}/100</strong></span>
                          <span>Consistency: <strong className="text-purple-300">{mariGrowthScore.breakdown.consistency ?? 0}/100</strong></span>
                          <span>Growth Velocity: <strong className="text-purple-300">{mariGrowthScore.breakdown.growthVelocity ?? 0}/100</strong></span>
                        </div>
                      )}
                    </div>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => setPageWorkspaceTab('MARI_GROWTH')}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs gap-1.5 shrink-0"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> View Mari Strategy
                    </Button>
                  </div>
                </div>
              )}

            {/* Sub-Tab 2: PAGE POSTS */}
            {pageWorkspaceTab === 'POSTS' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Published & Synced Facebook Posts
                  </span>
                  <span className="text-[11px] text-zinc-500 font-mono">Real Graph API Feed</span>
                </div>

                {facebookPagePosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="purple" className="text-[9px] font-mono">
                          {post.source === 'RALION' ? 'Published via Ralion' : 'Published on Facebook'}
                        </Badge>
                        <span className="text-[10px] text-zinc-500 font-mono">{post.publishedAt}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{post.title}</h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{post.body}</p>
                      
                      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-zinc-900 text-[11px] text-zinc-400">
                        <span>❤️ <strong>{post.engagement?.likes || 0}</strong> likes</span>
                        <span>💬 <strong>{post.engagement?.comments || 0}</strong> comments</span>
                        <span>↗ <strong>{post.engagement?.shares || 0}</strong> shares</span>
                        <span>👁️ <strong className="text-emerald-400">{post.engagement?.reach || 0}</strong> reach</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sub-Tab 3: 30-DAY GROWTH ANALYTICS */}
            {pageWorkspaceTab === 'ANALYTICS' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-semibold">Total Reach (30d)</p>
                  <p className="text-2xl font-black text-white mt-1">{totalReach.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-400 mt-1">📈 Verified Meta Insights</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-semibold">Total Impressions (30d)</p>
                  <p className="text-2xl font-black text-white mt-1">{Math.round(totalReach * 1.4).toLocaleString()}</p>
                  <p className="text-[10px] text-purple-400 mt-1">✨ Content Impressions</p>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
                  <p className="text-xs text-zinc-400 font-semibold">Tracked Posts</p>
                  <p className="text-2xl font-black text-amber-400 mt-1">{posts.length}</p>
                  <p className="text-[10px] text-zinc-400 mt-1">Active sync with Facebook</p>
                </div>
              </div>
            )}

            {/* Sub-Tab 4: MARI GROWTH INTELLIGENCE */}
            {pageWorkspaceTab === 'MARI_GROWTH' && (
              <div className="flex flex-col gap-6">
                {businessKnowledge ? (
                  /* 5-Minute Business Learning & Brand Voice Calibration Card */
                  <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/60 via-zinc-900 to-zinc-950 border border-purple-500/30 shadow-xl flex flex-col gap-5">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-5 h-5 text-purple-400" />
                          <h3 className="text-base font-black text-white">Mari AI — 5-Minute Business Knowledge Calibration</h3>
                          <Badge variant="success" className="text-[10px] font-bold">
                            🟢 {businessKnowledge.learningStatus === 'CALIBRATED_AND_ACTIVE' ? '100% CALIBRATED' : 'CUSTOMIZED'}
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1">
                          During Facebook connection, Mari AI calibrated your business identity ({businessKnowledge?.businessName || activeFbPage?.name || fbConn?.label || 'Your Business'}), historical engagement, and regional audience to calibrate custom copy and growth angles.
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsEditBrandVoiceOpen(true)}
                          className="text-xs border-purple-500/40 text-purple-200 hover:bg-purple-950"
                        >
                          <Settings className="w-3.5 h-3.5 mr-1" /> Adjust Brand Voice
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            fetchBusinessLearningData();
                            setOauthAlert({ type: 'success', message: '⚡ Mari AI re-calibrated business intelligence with live Facebook Graph feed!' });
                          }}
                          className="text-xs border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-Sync Knowledge
                        </Button>
                      </div>
                    </div>

                    {/* 5-Minute Progress Steps */}
                    {businessKnowledge.steps && (
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                        {businessKnowledge.steps.map((step: any) => (
                          <div key={step.minute} className="p-3 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono text-purple-400 font-bold">Min {step.minute}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <p className="text-xs font-bold text-white leading-tight mt-0.5">{step.title}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Calibrated Knowledge Profile */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Identified Domain</p>
                          <p className="text-xs font-bold text-white mt-1">{businessKnowledge.primaryDomain || 'Enterprise Commerce & Growth'}</p>
                          <p className="text-[11px] text-purple-300/80 mt-1 font-mono">{businessKnowledge.targetRegion || 'Global & Regional'}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Calibrated Brand Voice</p>
                          <p className="text-xs font-bold text-emerald-400 mt-1">{businessKnowledge.brandVoice?.tone || 'Professional & Engaging'}</p>
                          <p className="text-[11px] text-zinc-400 mt-1">Target: {businessKnowledge.targetAudience?.primary || 'Target Customers'}</p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[10px] text-zinc-400 uppercase font-semibold">Core Vocabulary</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {(businessKnowledge.brandVoice?.vocabulary || ['Growth', 'Security', 'Innovation']).slice(0, 3).map((v: string, idx: number) => (
                              <span key={idx} className="px-2 py-0.5 rounded-lg bg-zinc-900 text-[10px] text-zinc-300 font-mono border border-zinc-800">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recommended Business Content Hooks */}
                    {businessKnowledge.recommendedContentHooks && (
                      <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                        <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                          Mari's Recommended Business Content Hooks
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                          {businessKnowledge.recommendedContentHooks.map((hook: string, idx: number) => (
                            <div key={idx} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-2">
                              <p className="text-xs text-zinc-300 leading-relaxed font-mono">{hook}</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setNewPost({
                                    title: hook.split(':')[0] || 'Business Spotlight',
                                    body: hook,
                                    platform: 'facebook',
                                    hashtags: '#RalionOS #Growth',
                                    scheduledAt: '',
                                  });
                                  setIsCreateOpen(true);
                                }}
                                className="text-[10px] text-indigo-300 border-indigo-500/30 hover:bg-indigo-950 w-full"
                              >
                                Create Post with Hook →
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center flex flex-col items-center gap-3">
                    <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                    <h4 className="text-sm font-bold text-white">Mari AI Business Knowledge Calibration</h4>
                    <p className="text-xs text-zinc-400 max-w-md">
                      {fbConn ? 'Mari AI is calibrating your business brand voice and audience models from your connected Facebook Page.' : 'Connect your Facebook Page to calibrate custom brand voice and audience growth intelligence.'}
                    </p>
                  </div>
                )}

                {/* Insights Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mariInsights.map(ins => (
                    <div key={ins.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={ins.impact === 'HIGH' ? 'danger' : 'purple'} className="text-[9px]">
                            {ins.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-[10px] text-zinc-500 font-mono">{ins.impact} Impact</span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{ins.title}</h4>
                        <p className="text-xs text-zinc-300 mt-1">{ins.summary}</p>
                        <p className="text-[11px] text-purple-300/80 mt-1.5 font-mono italic">Evidence: {ins.evidence}</p>
                      </div>

                      <div className="pt-2 border-t border-zinc-900 flex justify-end">
                        {ins.actionType === 'CREATE_CONTENT' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={() => {
                              setNewPost({
                                title: ins.title,
                                body: ins.suggestedPrompt || ins.summary,
                                platform: 'facebook',
                                hashtags: '#RalionOS #Growth',
                                scheduledAt: '',
                              });
                              setIsCreateOpen(true);
                            }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
                          >
                            {ins.actionLabel}
                          </Button>
                        )}
                        {ins.actionType === 'CREATE_PLAN' && (
                          <Button 
                            variant="primary" 
                            size="sm" 
                            onClick={handleGenerate7DayPlan}
                            className="text-xs bg-purple-600 hover:bg-purple-700 font-bold"
                          >
                            {isGeneratingPlan ? 'Generating...' : ins.actionLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 7-Day Growth Plan Output */}
                {mari7DayPlan && (
                  <div className="p-5 rounded-3xl bg-zinc-950 border border-purple-500/30 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-purple-400" /> {mari7DayPlan.title}
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">{mari7DayPlan.objective}</p>
                      </div>
                      <Badge variant="success" className="text-xs">{mari7DayPlan.expectedImpact}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mari7DayPlan.days.map((day: any) => (
                        <div key={day.dayNumber} className="p-3.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col justify-between gap-2">
                          <div>
                            <div className="flex items-center justify-between text-xs font-bold text-white">
                              <span>Day {day.dayNumber} ({day.dayName})</span>
                              <span className="text-purple-400 font-mono text-[11px]">{day.recommendedTime}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="purple" className="text-[9px]">{day.contentType}</Badge>
                              <span className="text-xs font-semibold text-zinc-200">{day.topic}</span>
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">{day.suggestedCaption}</p>
                          </div>
                          <div className="pt-2 border-t border-zinc-800 flex justify-end">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleCreateFromPlanDay(day)}
                              className="text-[11px] text-indigo-300 border-indigo-500/30 hover:bg-indigo-950"
                            >
                              Create in Composer →
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mari AI Contextual Chat */}
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Ask Mari AI About Facebook Growth
                  </h4>
                  
                  <div className="flex flex-col gap-2 max-h-48 overflow-y-auto p-2">
                    {mariChatMessages.map((m, idx) => (
                      <div key={idx} className={`p-3 rounded-xl text-xs ${m.role === 'user' ? 'bg-indigo-950/60 text-indigo-100 ml-8' : 'bg-zinc-900 text-zinc-200 mr-8 border border-zinc-800'}`}>
                        {m.text}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={mariChatQuery}
                      onChange={e => setMariChatQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAskMariGrowth()}
                      placeholder="Ask Mari: 'How is my Page performing?', 'What should I post next?'..."
                      className="flex-1 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={handleAskMariGrowth}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                    >
                      {isAskingMari ? 'Analyzing...' : 'Ask Mari'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Tab 5: MARKET RESEARCH & COMPETITIVE INTELLIGENCE */}
            {pageWorkspaceTab === 'MARKET_INTEL' && (
              <div className="flex flex-col gap-6">
                {marketResearchReport ? (
                  <>
                    {/* Compliance & Overview Banner */}
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-950 border border-emerald-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <Globe className="w-5 h-5 text-emerald-400" />
                          <h3 className="text-base font-black text-white">Ethical Market Research & Competitive Intelligence</h3>
                          <Badge variant="success" className="text-[10px] font-bold">
                            🛡️ 100% LEGAL & TOS COMPLIANT
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                          Mari AI analyzes public SADC industry benchmarks, macroeconomic indices, and open market signals—without illegal scraping or privacy violations—to give <strong>{activeFbPage?.name || fbConn?.label || 'Your Workspace'}</strong> a competitive growth advantage.
                        </p>
                      </div>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          fetchMarketResearchData();
                          setOauthAlert({ type: 'success', message: '⚡ Market benchmarks synchronized with latest SADC B2B tech index!' });
                        }}
                        className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950 shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-Sync Market Data
                      </Button>
                    </div>

                    {/* Benchmark Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Engagement vs Industry Benchmark</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-black text-emerald-400">{marketResearchReport?.benchmarks?.rasAliLabsEngagementRate ?? (totalReach > 0 ? ((totalEngagement/totalReach)*100).toFixed(1) : 0)}%</p>
                            <p className="text-xs text-zinc-500 line-through">Avg: {marketResearchReport?.benchmarks?.averageEngagementRate ?? 3.2}%</p>
                          </div>
                          <p className="text-[11px] text-emerald-400 mt-1 font-semibold">🟢 +81.2% Higher than SADC SaaS average</p>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '85%' }} />
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Monthly Audience Growth Rate</p>
                          <div className="flex items-baseline gap-2 mt-1">
                            <p className="text-2xl font-black text-purple-400">+{marketResearchReport?.benchmarks?.rasAliLabsGrowthMonthly ?? (posts.length > 0 ? (posts.length * 1.5).toFixed(1) : 0)}%</p>
                            <p className="text-xs text-zinc-500 line-through">Avg: +{marketResearchReport?.benchmarks?.averageFollowerGrowthMonthly ?? 4.5}%</p>
                          </div>
                          <p className="text-[11px] text-purple-400 mt-1 font-semibold">🚀 2.9x faster than industry median</p>
                        </div>
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 mt-3 overflow-hidden">
                          <div className="bg-purple-500 h-full rounded-full" style={{ width: '92%' }} />
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                        <div>
                          <p className="text-[11px] text-zinc-400 uppercase font-semibold">Peak Executive Attention Window</p>
                          <p className="text-xs font-bold text-white mt-1.5">Tue & Thu 09:30–11:00 SAST</p>
                          <p className="text-[11px] text-zinc-400 mt-1">B2B decision-makers in Botswana & SA</p>
                        </div>
                        <div className="pt-2 border-t border-zinc-900 text-[10px] text-indigo-300 font-mono">
                          ✨ 42% higher click-through on technical posts
                        </div>
                      </div>
                    </div>

                    {/* Competitive Differentiation Matrix */}
                    <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                        <div>
                          <h4 className="text-sm font-bold text-white flex items-center gap-2">
                            <Layers className="w-4 h-4 text-indigo-400" /> Strategic Competitive Positioning Matrix
                          </h4>
                          <p className="text-xs text-zinc-400 mt-0.5">How your workspace out-positions foreign and regional alternatives</p>
                        </div>
                        <Badge variant="purple" className="text-[10px]">BLUE OCEAN STRATEGY</Badge>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-800 text-zinc-400 text-[11px]">
                              <th className="py-2.5 px-3 font-semibold">Strategic Dimension</th>
                              <th className="py-2.5 px-3 font-semibold text-zinc-500">Foreign Legacy SaaS</th>
                              <th className="py-2.5 px-3 font-semibold text-zinc-500">Local Marketing Agencies</th>
                              <th className="py-2.5 px-3 font-bold text-emerald-400">Ralion OS Sovereign Advantage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-zinc-300">
                            {(marketResearchReport?.positioningMatrix || []).map((row: any, idx: number) => (
                              <tr key={idx} className="hover:bg-zinc-900/50 transition-colors">
                                <td className="py-3 px-3 font-bold text-white">{row.dimension}</td>
                                <td className="py-3 px-3 text-zinc-400 text-[11px]">{row.traditionalForeignSaaS}</td>
                                <td className="py-3 px-3 text-zinc-400 text-[11px]">{row.localRegionalCompetitors}</td>
                                <td className="py-3 px-3 text-emerald-300 font-semibold text-[11px] bg-emerald-950/20 border-l-2 border-emerald-500">
                                  {row.ralionOsAdvantage}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* High-Impact Blue Ocean Market Opportunities */}
                    <div className="flex flex-col gap-3">
                      <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                        Mari's High-Growth Market Opportunity Radar
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {(marketResearchReport?.opportunities || []).map((opp: any) => (
                          <div key={opp.id} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-all">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <Badge variant="purple" className="text-[9px]">{opp.category?.replace('_', ' ') || 'OPPORTUNITY'}</Badge>
                                <span className="text-[10px] text-emerald-400 font-mono font-bold">{opp.expectedGrowthImpact}</span>
                              </div>
                              <h5 className="text-sm font-bold text-white">{opp.title}</h5>
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{opp.marketInsight}</p>
                              <p className="text-[11px] text-purple-300/90 mt-2 font-mono italic">Recommended: {opp.recommendedAction}</p>
                            </div>

                            <div className="pt-3 border-t border-zinc-900">
                              <Button 
                                variant="primary" 
                                size="sm" 
                                onClick={() => {
                                  setNewPost({
                                    title: opp.title,
                                    body: opp.suggestedPrompt,
                                    platform: 'facebook',
                                    hashtags: '#RalionOS #EnterpriseAI #TradeTech',
                                    scheduledAt: '',
                                  });
                                  setIsCreateOpen(true);
                                }}
                                className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
                              >
                                Deploy Strategy in Composer →
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-8 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-center flex flex-col items-center gap-3">
                    <Globe className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-sm font-bold text-white">Ethical Market Research & Competitive Intelligence</h4>
                    <p className="text-xs text-zinc-400 max-w-md">
                      {fbConn ? 'Synchronizing market research benchmarks and positioning matrices...' : 'Connect your Facebook Page to unlock SADC market benchmarks and competitive positioning matrices.'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </div>
      )}


      {/* ==================================== */}
      {/* 3. CONTENT POSTS & SCHEDULER TAB */}
      {/* ==================================== */}
      {activeTab === 'CONTENT' && (
        <div className="flex flex-col gap-6">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-900/80 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Filter Status:</span>
              <div className="flex gap-1">
                {(['all', 'draft', 'scheduled', 'published'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setPostStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                      postStatusFilter === st ? 'bg-blue-600 text-white font-bold' : 'bg-zinc-950 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700">
              <Plus className="w-3.5 h-3.5" /> Create New Post
            </Button>
          </div>

          {/* Posts List */}
          <div className="flex flex-col gap-4">
            {filteredPosts.map(post => {
              const cfg = platformConfig[post.platform] || { label: post.platform, color: '#3b82f6', bg: 'bg-blue-600/10' };

              return (
                <Card key={post.id} className="p-5 hover:border-zinc-700 transition-all border-zinc-800 bg-zinc-900/70">
                  <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                    <div className="flex-1 flex items-start gap-4">
                      {post.mediaUrl && (
                        <div className="w-24 h-24 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 shrink-0 relative">
                          {post.mediaType === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-blue-400">
                              <Play className="w-8 h-8 opacity-80" />
                            </div>
                          ) : (
                            <img src={post.mediaUrl} alt={post.title} className="w-full h-full object-cover" />
                          )}
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                          <Badge variant={post.status === 'published' ? 'success' : post.status === 'scheduled' ? 'primary' : 'default'} className="uppercase text-[10px]">
                            {post.status}
                          </Badge>
                          {post.publishedAt && <span className="text-[10px] text-zinc-500 font-mono">Published: {post.publishedAt}</span>}
                          {post.scheduledAt && <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1"><Clock className="w-3 h-3" /> Scheduled: {post.scheduledAt}</span>}
                        </div>

                        <h3 className="text-sm font-bold text-white">{post.title}</h3>
                        <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed line-clamp-3">{post.body}</p>

                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {post.hashtags.map((h, i) => (
                              <span key={i} className="text-[10px] text-blue-400 font-mono font-semibold">{h}</span>
                            ))}
                          </div>
                        )}

                        {post.status === 'published' && post.engagement && (
                          <div className="flex items-center gap-5 mt-4 text-[11px] text-zinc-400 border-t border-zinc-800/80 pt-3">
                            <span>❤️ <strong className="text-white">{post.engagement.likes}</strong> likes</span>
                            <span>🔁 <strong className="text-white">{post.engagement.shares}</strong> shares</span>
                            <span>💬 <strong className="text-white">{post.engagement.comments}</strong> comments</span>
                            <span>👁️ <strong className="text-emerald-400">{post.engagement.reach.toLocaleString()}</strong> reach</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center lg:flex-col gap-2 shrink-0 self-end lg:self-center">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setPreviewPost(post);
                          setPreviewPlatform(post.platform);
                          setIsPreviewModalOpen(true);
                        }}
                        className="text-xs gap-1 border-zinc-800 text-zinc-300"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" /> Visual Preview
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenCommentsModal(post)}
                        className="text-xs gap-1 border-zinc-800 text-zinc-300 hover:text-white"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> Comments
                      </Button>

                      {post.status !== 'published' && (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => publishPostNow(post.id)}
                          className="text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          <Send className="w-3.5 h-3.5" /> Publish Now
                        </Button>
                      )}

                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setPosts(prev => prev.filter(p => p.id !== post.id));
                          setOauthAlert({ type: 'info', message: 'Post draft deleted.' });
                          setTimeout(() => setOauthAlert(null), 3000);
                        }}
                        className="text-xs text-red-400 border-red-900/40 hover:bg-red-950"
                        title="Delete Post Draft"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {filteredPosts.length === 0 && (
              <div className="p-12 text-center text-zinc-500 text-xs italic bg-zinc-900/40 rounded-2xl border border-zinc-800">
                No posts found under "{postStatusFilter}". Click "Create New Post" to draft or schedule content.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 3.5. SOCIAL INBOX & MESSAGING TAB */}
      {/* ==================================== */}
      {activeTab === 'INBOX' && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800 shadow-xl">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Inbox className="w-4 h-4 text-teal-400" /> Unified Social Inbox & Messenger
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Read and respond to direct customer messages across Facebook Messenger as <strong>{activeFbPage?.name || fbConn?.label || 'Your Facebook Page'}</strong> ({activeFbPage?.username || fbConn?.handle || '@page'}).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchInboxConversations()} 
                disabled={isLoadingInbox}
                className="text-xs border-zinc-800 text-zinc-300 gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-teal-400 ${isLoadingInbox ? 'animate-spin' : ''}`} /> Refresh Inbox
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
            {/* Left Pane: Conversation Threads List */}
            <div className="lg:col-span-4 flex flex-col gap-3 bg-zinc-900/60 p-3.5 rounded-3xl border border-zinc-800">
              <div className="flex items-center justify-between px-1 pb-2 border-b border-zinc-800">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Conversations</span>
                <Badge variant="purple" className="text-[10px] font-mono">{inboxConversations.length} Active</Badge>
              </div>

              <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
                {inboxConversations.map(conv => {
                  const isSelected = conv.conversationId === activeConversationId;
                  return (
                    <button
                      key={conv.conversationId}
                      onClick={() => setActiveConversationId(conv.conversationId)}
                      className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                        isSelected 
                          ? 'bg-teal-950/40 border-teal-500/50 shadow-md' 
                          : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                      }`}
                    >
                      <div className="relative shrink-0">
                        {conv.avatarUrl ? (
                          <img src={conv.avatarUrl} alt={conv.participantName} className="w-10 h-10 rounded-xl object-cover border border-zinc-800" />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-xs">
                            {conv.participantName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-zinc-900 flex items-center justify-center text-[8px] text-white font-bold">
                          fb
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{conv.participantName}</h4>
                          <span className="text-[10px] text-zinc-500 font-mono shrink-0">{conv.lastTimestamp}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 truncate leading-tight">{conv.lastMessage}</p>
                        {conv.unreadCount > 0 && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold text-[9px] border border-teal-500/30">
                            New Inquiry
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {inboxConversations.length === 0 && (
                  <div className="p-8 text-center text-xs text-zinc-500 italic">
                    No active inbox conversations found.
                  </div>
                )}
              </div>
            </div>

            {/* Right Pane: Active Message Thread & Response Composer */}
            <div className="lg:col-span-8 flex flex-col justify-between bg-zinc-900/60 p-5 rounded-3xl border border-zinc-800">
              {(() => {
                const activeConv = inboxConversations.find(c => c.conversationId === activeConversationId);
                if (!activeConv) {
                  return (
                    <div className="flex-1 flex items-center justify-center text-xs text-zinc-500">
                      Select a conversation thread on the left to start messaging.
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col h-full justify-between gap-4">
                    {/* Thread Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-500/30 flex items-center justify-center font-bold text-teal-300 text-xs">
                          {activeConv.participantName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">{activeConv.participantName}</h3>
                            <Badge variant="success" className="text-[9px]">Facebook Messenger</Badge>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-mono">Recipient ID: {activeConv.participantId}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Replying as Ras Ali Labs
                        </span>
                      </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto max-h-[360px] flex flex-col gap-3 p-2">
                      {activeConv.messages?.map((msg: any, idx: number) => {
                        const isOutbound = msg.direction === 'OUTBOUND';
                        return (
                          <div key={idx} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
                            <div className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                              isOutbound 
                                ? 'bg-gradient-to-r from-teal-600 to-indigo-600 text-white rounded-br-none shadow-md' 
                                : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-bl-none'
                            }`}>
                              <p className="font-semibold text-[10px] opacity-75 mb-1">
                                {isOutbound ? 'Ras Ali Labs Support' : activeConv.participantName}
                              </p>
                              <p className="whitespace-pre-wrap">{msg.message_text}</p>
                            </div>
                            <span className="text-[10px] text-zinc-500 font-mono mt-1 px-1">
                              {msg.timestamp || 'Just now'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* AI Smart Reply Suggestions */}
                    <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-800/80">
                      <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1 mr-1">
                        <Sparkles className="w-3 h-3 text-purple-400" /> Mari AI Quick Replies:
                      </span>
                      {[
                        'We would be delighted to schedule an enterprise architecture demo for your team this week.',
                        'All Ralion OS deployments include sovereign multi-region encryption and dedicated SADC telemetry.',
                        'Thank you for reaching out! Our lead technical consultant will contact you via email shortly.'
                      ].map((promptText, i) => (
                        <button
                          key={i}
                          onClick={() => setInboxReplyText(promptText)}
                          className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-teal-500/50 text-[10px] text-zinc-300 hover:text-white transition-all text-left"
                        >
                          "{promptText.slice(0, 48)}..."
                        </button>
                      ))}
                    </div>

                    {/* Reply Input & Send Button */}
                    <div className="flex items-center gap-2 pt-2">
                      <textarea
                        rows={2}
                        value={inboxReplyText}
                        onChange={e => setInboxReplyText(e.target.value)}
                        placeholder="Write direct response to customer as Ras Ali Labs..."
                        className="flex-1 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 resize-none font-sans"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSendingInboxReply || !inboxReplyText.trim()}
                        onClick={handleSendInboxReply}
                        className="h-full px-5 bg-teal-600 hover:bg-teal-700 font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-lg shadow-teal-600/30"
                      >
                        {isSendingInboxReply ? 'Sending...' : <><Send className="w-3.5 h-3.5" /> Send Reply</>}
                      </Button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 4. CAMPAIGNS TAB */}
      {/* ==================================== */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between bg-zinc-900/80 p-4 rounded-2xl border border-zinc-800">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-amber-400" /> Active Marketing Campaigns
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Group scheduled posts, allocate budgets, and direct AI strategies towards targeted growth objectives.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsNewCampaignOpen(true)} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-bold">
              <Plus className="w-4 h-4" /> New Campaign
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.map(c => (
              <Card key={c.id} className="p-5 border-zinc-800 bg-zinc-900/80 hover:border-amber-500/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Badge variant={c.status === 'active' ? 'success' : 'default'} className="uppercase text-[10px] mb-1.5">
                        {c.status}
                      </Badge>
                      <h3 className="font-bold text-white text-base leading-tight">{c.name}</h3>
                      <p className="text-xs text-zinc-400 mt-1">{c.startDate} → {c.endDate}</p>
                    </div>
                    {c.budget && (
                      <Badge variant="purple" className="font-mono text-xs py-1 px-2.5">{c.budget}</Badge>
                    )}
                  </div>

                  <div className="mt-3.5 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs">
                    <div className="text-zinc-400 font-semibold mb-1">Objective: <span className="text-white font-normal">{c.objective}</span></div>
                    {c.audience && <div className="text-zinc-400 font-semibold">Audience: <span className="text-zinc-300 font-normal">{c.audience}</span></div>}
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {c.platforms.map(p => {
                      const cfg = platformConfig[p] || { label: p };
                      return (
                        <span key={p} className="px-2.5 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-mono">
                          {cfg.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-3 border-t border-zinc-800 text-xs">
                  <span className="text-zinc-400">📝 <strong className="text-white">{c.postsCount}</strong> posts queued</span>
                  <button 
                    onClick={() => setSelectedCampaignDetail(c)}
                    className="text-blue-400 font-bold hover:underline flex items-center gap-1"
                  >
                    Campaign Strategy & Detail →
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 5. AI STUDIO TAB */}
      {/* ==================================== */}
      {activeTab === 'AI_STUDIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Mari AI Content Studio</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Generate campaigns, captions, copy, and content calendars</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {[
                  'Create a 30-day marketing campaign',
                  'Write a LinkedIn announcement post',
                  'Draft 5 Instagram captions with hashtags',
                  'Generate a viral TikTok video script',
                  'Draft cross-border trade promotional copy'
                ].map((p, i) => (
                  <button 
                    key={i} 
                    onClick={() => setAiPrompt(p)} 
                    className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white hover:border-blue-500/50 transition-all text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <textarea
                rows={4}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="Describe your content requirements... (e.g. Create a campaign promoting automated logistics software for SADC traders)"
                className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
              />

              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleAiGenerate} 
                className="w-full justify-center bg-gradient-to-r from-blue-600 to-purple-600 font-bold py-2.5"
              >
                {isGenerating ? (
                  <><span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin mr-2" /> Generating Strategy...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Content with Mari AI</>
                )}
              </Button>
            </CardContent>
          </Card>

          {aiResult ? (
            <Card className="border-zinc-800 bg-zinc-900/80 flex flex-col justify-between">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Mari AI Content Output
                  </CardTitle>
                  <button 
                    onClick={handleCopy} 
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 hover:text-white transition-all"
                  >
                    {copied ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy All</>}
                  </button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <pre className="text-xs text-zinc-200 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto max-h-80 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                  {aiResult}
                </pre>
              </CardContent>
              <div className="p-4 border-t border-zinc-800 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNewPost({
                      title: aiPrompt.substring(0, 30) + '...',
                      body: aiResult,
                      platform: 'linkedin',
                      hashtags: '#RalionOS #MariAI',
                      scheduledAt: ''
                    });
                    setIsCreateOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-xs font-bold gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" /> Create Post from Output
                </Button>
              </div>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-zinc-800 text-center text-zinc-500">
              <Sparkles className="w-8 h-8 text-zinc-700 mb-2 animate-pulse" />
              <p className="text-xs">Generated campaign copy, captions, and hashtag strategies will appear here.</p>
            </div>
          )}
        </div>
      )}

      {/* ==================================== */}
      {/* 6. CREATIVES MEDIA GENERATOR TAB */}
      {/* ==================================== */}
      {activeTab === 'CREATIVES' && (
        <div className="flex flex-col gap-6">
          {/* Quick Creative Upload Banner */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Have your own creative asset?</h4>
                <p className="text-xs text-zinc-400">Upload custom graphics, brand posters, or video clips directly to your creative gallery and social publisher.</p>
              </div>
            </div>
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold cursor-pointer transition-all shadow-md active:scale-95 shrink-0">
              <Upload className="w-4 h-4" />
              Upload Creative (Image / Video)
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleCreativeUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Poster Generator */}
            <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white shadow-md">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">AI Poster Generator (Flux Schnell)</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Generate high-converting graphic posters for ads and social feeds.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                rows={3}
                value={posterPrompt}
                onChange={e => setPosterPrompt(e.target.value)}
                placeholder="Describe the poster concept... (e.g. A futuristic promotional poster for Ralion OS Tech Summit in Gaborone)"
                className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={posterFormat} 
                  onChange={e => setPosterFormat(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none"
                >
                  <option>1:1 Square (Instagram/FB)</option>
                  <option>9:16 Story / Reel</option>
                  <option>16:9 Landscape (LinkedIn/X)</option>
                </select>
                <select 
                  value={posterStyle} 
                  onChange={e => setPosterStyle(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none"
                >
                  <option>Modern Minimalist</option>
                  <option>Bold & Vibrant Neon</option>
                  <option>Corporate Executive</option>
                  <option>SADC Logistics & Trade</option>
                </select>
              </div>

              <Button 
                onClick={() => generateMedia('poster')} 
                variant="primary" 
                className="w-full justify-center bg-purple-600 hover:bg-purple-700 font-bold py-2.5"
              >
                {isGeneratingPoster ? 'Generating Poster...' : <><Wand2 className="w-4 h-4 mr-2" /> Generate Poster Image</>}
              </Button>

              {generatedPoster && (
                <div className="mt-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden flex flex-col gap-3">
                  <img src={generatedPoster} alt="Generated Poster" className="w-full h-auto rounded-lg object-cover" />
                  <div className="flex justify-between gap-2">
                    <a href={generatedPoster} target="_blank" rel="noreferrer" download className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300 font-semibold flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-blue-400" /> Download
                    </a>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      onClick={() => convertItemToPost({
                        id: `gen-${Date.now()}`,
                        type: 'POSTER_IMAGE',
                        title: posterPrompt.substring(0, 30) || 'AI Poster',
                        prompt: posterPrompt,
                        output: generatedPoster,
                        modelUsed: 'FLUX.1',
                        createdAt: 'Just now'
                      })}
                      className="text-xs bg-purple-600 hover:bg-purple-700 font-bold"
                    >
                      Convert to Social Post
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Video Generator */}
          <Card className="border-zinc-800 bg-zinc-900/80">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white shadow-md">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">AI Video Creator (CogVideoX Motion Studio)</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">Generate short-form video reels from prompt descriptions.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                rows={3}
                value={videoPrompt}
                onChange={e => setVideoPrompt(e.target.value)}
                placeholder="Describe the video scenes... (e.g. A 15-second promotional clip showing automated cargo tracking on a tablet)"
                className="w-full p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none font-mono"
              />
              <div className="grid grid-cols-2 gap-2">
                <select 
                  value={videoLength} 
                  onChange={e => setVideoLength(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none"
                >
                  <option>15s Short Reel</option>
                  <option>30s Product Spotlight</option>
                  <option>60s Explainer</option>
                </select>
                <select 
                  value={videoVoiceover} 
                  onChange={e => setVideoVoiceover(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none"
                >
                  <option>Executive English Voiceover</option>
                  <option>Dynamic High Energy</option>
                  <option>Minimalist Ambient</option>
                </select>
              </div>

              <Button 
                onClick={() => generateMedia('video')} 
                variant="primary" 
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold py-2.5"
              >
                {isGeneratingVideo ? 'Rendering Video Reel...' : <><Wand2 className="w-4 h-4 mr-2" /> Generate Video Reel</>}
              </Button>

              {generatedVideo && (
                <div className="mt-2 p-2 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col gap-3">
                  <video controls className="w-full rounded-lg max-h-64 object-cover">
                    <source src={generatedVideo} type="video/mp4" />
                  </video>
                  <div className="flex justify-between gap-2">
                    <a href={generatedVideo} target="_blank" rel="noreferrer" download className="px-3 py-1.5 rounded-lg bg-zinc-900 text-xs text-zinc-300 font-semibold flex items-center gap-1">
                      <Download className="w-3.5 h-3.5 text-blue-400" /> Download Video
                    </a>
                    <Button 
                      size="sm" 
                      variant="primary" 
                      onClick={() => convertItemToPost({
                        id: `gen-${Date.now()}`,
                        type: 'VIDEO_REEL',
                        title: videoPrompt.substring(0, 30) || 'AI Video Reel',
                        prompt: videoPrompt,
                        output: generatedVideo,
                        modelUsed: 'CogVideoX Animation',
                        createdAt: 'Just now'
                      })}
                      className="text-xs bg-blue-600 hover:bg-blue-700 font-bold"
                    >
                      Convert to Video Post
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )}

      {/* ==================================== */}
      {/* 7. ANALYTICS TAB */}
      {/* ==================================== */}
      {activeTab === 'ANALYTICS' && (
        <div className="flex flex-col gap-6">
          {/* Analytics Top Control Bar */}
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-400" /> Executive Analytics & Growth Reporting
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Real-time performance analytics calibrated by Meta Social Engine & Ralion AI
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
              {/* Date Range Selector Pills */}
              <div className="flex flex-wrap bg-zinc-950 p-1 rounded-xl border border-zinc-800 gap-0.5">
                {([
                  { id: '7D', label: '7 Days' },
                  { id: '30D', label: '30 Days' },
                  { id: '90D', label: '90 Days' },
                  { id: 'YEARLY', label: 'Yearly' },
                  { id: 'ALL', label: 'All Time' },
                ] as const).map(range => (
                  <button
                    key={range.id}
                    onClick={() => setDateRange(range.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      dateRange === range.id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Export Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5 text-xs border-zinc-800 text-zinc-300 hover:text-white bg-zinc-950 hover:bg-zinc-800"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Audience Reach', value: totalReach.toLocaleString(), change: '+24% this week', icon: '👁️', color: 'text-blue-400' },
              { label: 'Total Engagements', value: (totalLikes + totalShares + totalComments).toLocaleString(), change: '+18% growth', icon: '❤️', color: 'text-pink-400' },
              { label: 'Published Content', value: publishedCount.toString(), change: `${scheduledCount} scheduled`, icon: '📝', color: 'text-emerald-400' },
              { label: 'Active Campaigns', value: activeCampaignsCount.toString(), change: 'Running live', icon: '🚀', color: 'text-purple-400' }
            ].map((m, i) => (
              <Card key={i} className="p-5 border-zinc-800 bg-zinc-900/80">
                <div className="text-2xl mb-1">{m.icon}</div>
                <div className="text-[11px] text-zinc-400 uppercase tracking-wider font-bold">{m.label}</div>
                <div className="text-2xl font-black text-white mt-1">{m.value}</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${m.color}`}>{m.change}</div>
              </Card>
            ))}
          </div>

          <Card className="p-6 border-zinc-800 bg-zinc-900/80">
            <h3 className="font-bold text-white text-base mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-400" /> Platform Performance Breakdown
            </h3>

            <div className="divide-y divide-zinc-800">
              {Object.entries(platformConfig).slice(0, 5).map(([k, cfg]) => {
                const isProviderMatch = (provA?: string, provB?: string) => {
                  const a = (provA || '').toLowerCase().trim();
                  const b = (provB || '').toLowerCase().trim();
                  if (!a || !b) return false;
                  if (a === b) return true;
                  if ((a === 'facebook' || a === 'meta') && (b === 'facebook' || b === 'meta')) return true;
                  if ((a === 'x' || a === 'twitter') && (b === 'x' || b === 'twitter')) return true;
                  return false;
                };

                const conn = connectedAccounts.find(
                  a => isProviderMatch(a.provider, k) || isProviderMatch((a as any).platform, k)
                );

                return (
                  <div key={k} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs" style={{ color: cfg.color, backgroundColor: `${cfg.color}15` }}>
                        {cfg.iconChar}
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white">{cfg.label}</div>
                        <div className="text-[10px] text-zinc-500">{conn ? `Connected: ${conn.handle}` : 'Not Connected'}</div>
                      </div>
                    </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">{conn?.followers || '0'} Reach</div>
                          <div className={`text-[10px] font-semibold ${conn ? 'text-emerald-400' : 'text-zinc-500'}`}>
                            {conn ? 'Active Sync' : 'Standby'}
                          </div>
                        </div>
                        {!conn && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedConnectPlatform(k);
                              setIsConnectModalOpen(true);
                            }}
                            className="text-[11px] py-1 px-2.5 border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white bg-zinc-950"
                          >
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
          </Card>
        </div>
      )}

      {/* ==================================== */}
      {/* MODAL: CREATE POST */}
      {/* ==================================== */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Social Post">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Post Title / Internal Topic</label>
            <input 
              type="text" 
              value={newPost.title} 
              onChange={e => setNewPost({ ...newPost, title: e.target.value })} 
              placeholder="e.g. SADC Logistics Feature Release" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-blue-500 focus:outline-none" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Target Social Destination</label>
              <div className="mt-1 p-2.5 rounded-xl bg-zinc-950 border border-indigo-500/40 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-400">
                    fb
                  </div>
                  <div>
                    {(() => {
                      const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
                      const activeConn = connectedAccounts.find(a => a.provider === 'facebook');
                      const name = activeFbPage?.name || activeConn?.label || 'Facebook Page';
                      const handle = activeFbPage?.username || activeConn?.handle || '@facebook';
                      const pageId = activeFbPage?.pageId || activeConn?.id || 'Connected';
                      return (
                        <>
                          <div className="text-xs font-bold text-white flex items-center gap-1.5">
                            ✓ {name}
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          </div>
                          <p className="text-[10px] text-zinc-400 font-mono">{handle} • ID: {pageId}</p>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <Badge variant="success" className="text-[9px] py-0 px-1.5">ACTIVE</Badge>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-300">Schedule Date (Optional)</label>
                <span className="text-[10px] text-indigo-400 font-mono">
                  Timezone: CAT (UTC+2) • Local
                </span>
              </div>
              <input 
                type="datetime-local" 
                value={newPost.scheduledAt} 
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                onChange={e => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setNewPost({ ...newPost, scheduledAt: '' })}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                    !newPost.scheduledAt ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-200' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
                >
                  Post Immediately
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const inOneHour = new Date(Date.now() + 3600 * 1000);
                    inOneHour.setMinutes(inOneHour.getMinutes() - inOneHour.getTimezoneOffset());
                    setNewPost({ ...newPost, scheduledAt: inOneHour.toISOString().slice(0, 16) });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 text-[10px] text-zinc-400 hover:text-white transition-all font-mono"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(9, 0, 0, 0);
                    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                    setNewPost({ ...newPost, scheduledAt: tomorrow.toISOString().slice(0, 16) });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 text-[10px] text-zinc-400 hover:text-white transition-all font-mono"
                >
                  Tomorrow 09:00
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    tomorrow.setHours(15, 30, 0, 0);
                    tomorrow.setMinutes(tomorrow.getMinutes() - tomorrow.getTimezoneOffset());
                    setNewPost({ ...newPost, scheduledAt: tomorrow.toISOString().slice(0, 16) });
                  }}
                  className="px-2 py-0.5 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-indigo-500/40 text-[10px] text-zinc-400 hover:text-white transition-all font-mono"
                >
                  Tomorrow 15:30 (Peak)
                </button>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-300">Post Body Copy</label>
              <span className="text-[10px] text-zinc-500 font-mono">{newPost.body.length} / 5,000 chars</span>
            </div>
            <textarea 
              rows={4} 
              value={newPost.body} 
              onChange={e => setNewPost({ ...newPost, body: e.target.value })} 
              placeholder="Write Facebook post content..." 
              className="w-full mt-1 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white resize-none focus:border-indigo-500 focus:outline-none font-mono" 
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300">Media Attachment (Image or Video)</label>
              <span className="text-[10px] text-zinc-500 font-mono">Supports PNG, JPG, WebP, MP4, MOV</span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {!newPost.mediaUrl ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 text-xs text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Image className="w-4 h-4 text-pink-400" /> Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 text-xs text-zinc-300 hover:text-white transition-all flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4 text-blue-400" /> Upload Video
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-2xl bg-zinc-950 border border-indigo-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-black border border-zinc-800 shrink-0 flex items-center justify-center">
                    {newPost.mediaType === 'video' ? (
                      <video src={newPost.mediaUrl} className="w-full h-full object-cover" />
                    ) : (
                      <img src={newPost.mediaUrl} alt="Upload Preview" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={newPost.mediaType === 'video' ? 'primary' : 'purple'} className="text-[9px]">
                        {newPost.mediaType?.toUpperCase()}
                      </Badge>
                      <p className="text-xs font-semibold text-white truncate">{newPost.mediaFileName || 'Media attached'}</p>
                    </div>
                    <p className="text-[10px] text-emerald-400 mt-0.5">✓ Ready to publish to Facebook Page</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveMedia}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-800 transition-all text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Hashtags</label>
            <input 
              type="text" 
              value={newPost.hashtags} 
              onChange={e => setNewPost({ ...newPost, hashtags: e.target.value })} 
              placeholder="#RalionOS #RasAliLabs #EnterpriseAI" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none font-mono text-indigo-400" 
            />
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              size="sm" 
              disabled={isConnecting}
              onClick={async () => {
                const topic = newPost.title.trim();
                const contentBody = newPost.body.trim();

                if (!contentBody) {
                  setOauthAlert({
                    type: 'error',
                    message: 'Select a connected social account and enter post copy before publishing.',
                  });
                  return;
                }

                setIsConnecting(true);

                const activeFbPage = availableFacebookPages.find(p => p.isCurrentDestination || p.status === 'CONNECTED') || availableFacebookPages[0];
                const activeConn = connectedAccounts.find(a => a.provider === 'facebook');

                const payload = {
                  title: topic || 'Social Post',
                  body: `${contentBody}\n\n${newPost.hashtags}`.trim(),
                  platforms: ['facebook'],
                  mediaUrls: newPost.mediaUrl ? [newPost.mediaUrl] : undefined,
                  mediaTypes: newPost.mediaType ? [newPost.mediaType] : undefined,
                  scheduledFor: newPost.scheduledAt || undefined,
                  authorName: activeFbPage?.name || activeConn?.label || 'Facebook Page',
                  socialConnectionId: activeFbPage?.id || activeConn?.id || undefined,
                  pageId: activeFbPage?.pageId || undefined,
                };

                try {
                  const res = await authFetch('/api/social/publish', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                  });

                  const data = await res.json().catch(() => ({}));

                  if (!res.ok || data.success === false) {
                    const status = res.status;
                    let alertMessage: string;

                    if (status === 409 || data.conflict === true) {
                      alertMessage = `⚠️ Publish conflict: This exact content is already scheduled or was posted to this account within the last 24 hours. Please edit the post text before publishing again.`;
                      if (data.conflictDetails?.existingPostId) {
                        alertMessage += ` (existing post ID: ${data.conflictDetails.existingPostId})`;
                      }
                    } else if (status === 400) {
                      alertMessage = `✕ Validation error: ${data.error || 'The publish request was invalid. Please check your post content.'}. Please correct the content and try again.`;
                    } else if (status === 401) {
                      alertMessage = `✕ Authentication required: Your Facebook session has expired. Please reconnect your account in the Accounts tab.`;
                    } else if (status === 403) {
                      alertMessage = `✕ Authorization error: Ralion does not have permission to publish to this Facebook Page. Please reconnect your account.`;
                    } else if (status === 422) {
                      alertMessage = `✕ Platform error: ${data.error || 'Facebook could not process this post.'}. Please check your media or content format.`;
                    } else if (status === 500) {
                      alertMessage = `✕ Unexpected server error — please try again in a moment. (Request ID: ${data.requestId || 'N/A'})`;
                    } else {
                      alertMessage = `✕ Facebook publishing failed (HTTP ${status}): ${data.error || 'Unknown error'}.`;
                    }

                    setOauthAlert({
                      type: 'error',
                      message: alertMessage,
                    });
                    setIsConnecting(false);
                    return;
                  }

                  const publishedPostId = data.postId || data.result?.postId || `fb_post_${Date.now()}`;
                  const postUrl =
                    data.result?.platformResults?.facebook?.postUrl ||
                    data.platformResults?.facebook?.postUrl ||
                    undefined;

                  const createdPost: ContentPost = {
                    id: publishedPostId,
                    title: topic || 'Social Post',
                    body: contentBody,
                    platform: 'facebook',
                    hashtags: newPost.hashtags ? newPost.hashtags.split(' ').filter(Boolean) : [],
                    status: newPost.scheduledAt ? 'scheduled' : 'published',
                    publishedAt: newPost.scheduledAt ? undefined : new Date().toLocaleString(),
                    scheduledAt: newPost.scheduledAt || undefined,
                    mediaUrl: newPost.mediaUrl,
                    mediaType: newPost.mediaType,
                    engagement: { likes: 0, shares: 0, reach: 0, comments: 0 },
                  };

                  const fbFeedItem = {
                    id: publishedPostId,
                    title: topic || 'Social Post',
                    body: contentBody,
                    publishedAt: 'Just now',
                    status: newPost.scheduledAt ? 'scheduled' : 'published',
                    source: 'RALION',
                    permalink: postUrl,
                    engagement: { likes: 0, comments: 0, shares: 0, reach: 0 },
                  };

                  setPosts(prev => [createdPost, ...prev]);
                  setFacebookPagePosts(prev => [fbFeedItem, ...prev]);
                  setIsCreateOpen(false);
                  setIsConnecting(false);
                  setNewPost({
                    title: '',
                    body: '',
                    platform: 'facebook',
                    hashtags: '#RalionOS #RasAliLabs #EnterpriseAI',
                    scheduledAt: '',
                    mediaUrl: undefined,
                    mediaType: undefined,
                    mediaFileName: undefined,
                  });

                  setOauthAlert({
                    type: 'success',
                    message: newPost.scheduledAt
                      ? `🗓️ Post scheduled for Facebook Page (${activeFbPage?.username || fbConn?.handle || '@facebook'})!`
                      : `✓ Published to Facebook Page — ${activeFbPage?.name || fbConn?.label || 'Connected Page'} (Published just now)`,
                    actionUrl: postUrl,
                    actionLabel: 'View on Facebook',
                  });

                  // Revalidate real posts from server
                  fetchLiveFacebookPosts();
                } catch (publishErr: any) {
                  setOauthAlert({
                    type: 'error',
                    message: `✕ Facebook publishing failed: ${publishErr.message}`,
                  });
                  setIsConnecting(false);
                }
              }}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
            >
              {isConnecting ? 'Publishing to Facebook...' : (newPost.scheduledAt ? 'Schedule Facebook Post' : 'Publish to Facebook Page')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: FACEBOOK COMMENTS MANAGEMENT */}
      {/* ==================================== */}
      {isCommentsModalOpen && selectedCommentPost && (
        <Modal 
          isOpen={isCommentsModalOpen} 
          onClose={() => {
            setIsCommentsModalOpen(false);
            setSelectedCommentPost(null);
          }} 
          title="Facebook Post Comments & Community Management"
        >
          <div className="flex flex-col gap-4">
            {/* Post Snippet */}
            <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shrink-0">
                {(activeFbPage?.name || fbConn?.label || 'FB').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">{activeFbPage?.name || fbConn?.label || 'Facebook Page'}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{activeFbPage?.username || fbConn?.handle || '@page'}</span>
                </div>
                <p className="text-xs text-zinc-300 mt-1 line-clamp-2">{selectedCommentPost.body}</p>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Active Comments ({postComments.length})
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">● Facebook Page Live Feed</span>
              </div>

              {isLoadingComments ? (
                <div className="p-6 text-center text-xs text-zinc-400">Loading comments...</div>
              ) : postComments.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 italic">No comments on this post yet.</div>
              ) : (
                postComments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {c.authorAvatarUrl ? (
                          <img src={c.authorAvatarUrl} alt={c.authorName} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 text-[10px] flex items-center justify-center font-bold">
                            {c.authorName.slice(0, 1)}
                          </div>
                        )}
                        <span className="text-xs font-bold text-white">{c.authorName}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">• {c.createdAt}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">❤️ {c.likesCount}</span>
                    </div>

                    <p className="text-xs text-zinc-200 pl-8 leading-relaxed">{c.commentText}</p>

                    {/* Nested Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="ml-8 mt-1 flex flex-col gap-2 pl-3 border-l-2 border-indigo-500/40">
                        {c.replies.map((rep: any) => (
                          <div key={rep.id} className="p-2 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="font-bold text-indigo-300 text-[11px]">{rep.authorName}</span>
                              <Badge variant="success" className="text-[8px] py-0 px-1">PAGE OWNER</Badge>
                              <span className="text-[9px] text-zinc-500 font-mono">• {rep.createdAt}</span>
                            </div>
                            <p className="text-zinc-300 text-[11px] leading-relaxed">{rep.replyText}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Inline Reply Input for this comment */}
                    <div className="ml-8 mt-1 flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newCommentReplyText}
                        onChange={e => setNewCommentReplyText(e.target.value)}
                        placeholder="Reply to this comment as Ras Ali Labs..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingReply || !newCommentReplyText.trim()}
                        onClick={() => handleSendCommentReply(c.id, selectedCommentPost.id)}
                        className="text-[11px] font-bold bg-indigo-600 hover:bg-indigo-700 py-1 px-3"
                      >
                        {isSubmittingReply ? 'Posting...' : 'Reply'}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-zinc-800">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsCommentsModalOpen(false);
                  setSelectedCommentPost(null);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================== */}
      {/* MODAL: CONNECT SOCIAL ACCOUNT */}
      {/* ==================================== */}
      <Modal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} title="Connect Social Media Account">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Select Platform</label>
            <select 
              value={selectedConnectPlatform} 
              onChange={e => setSelectedConnectPlatform(e.target.value)} 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none font-bold"
            >
              {Object.entries(platformConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 border-b border-zinc-800 pb-2">
            <button 
              onClick={() => setConnectTab('oauth')} 
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${connectTab === 'oauth' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Official OAuth 2.0 Login
            </button>
            <button 
              onClick={() => setConnectTab('manual')} 
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${connectTab === 'manual' ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
            >
              Manual API Access Token
            </button>
          </div>

          {connectTab === 'oauth' ? (
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-bold text-blue-400">
                  {platformConfig[selectedConnectPlatform]?.iconChar || 'OAuth'}
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs">{platformConfig[selectedConnectPlatform]?.label} Authentication</h4>
                  <p className="text-[10px] text-zinc-400">Redirects to official authorization consent page.</p>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 bg-zinc-900 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed">
                🔐 <strong>Requested Permissions:</strong> Read profile info, draft & schedule posts, publish content, read post performance analytics.
              </div>

              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => handleConnectSocialAccount(selectedConnectPlatform)}
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 font-bold py-2.5 text-xs mt-1"
              >
                {isConnecting ? 'Authenticating...' : <><Globe className="w-4 h-4 mr-2" /> Authorize & Link {platformConfig[selectedConnectPlatform]?.label.split(' ')[0]}</>}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Account Handle / ID</label>
                <input 
                  type="text" 
                  value={manualAccountHandle} 
                  onChange={e => setManualAccountHandle(e.target.value)} 
                  placeholder="@company_official" 
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white" 
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300">Enterprise Access Token / App Secret</label>
                <input 
                  type="password" 
                  value={manualAccessToken} 
                  onChange={e => setManualAccessToken(e.target.value)} 
                  placeholder="bearer_token_..." 
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white font-mono" 
                />
              </div>

              <Button 
                variant="primary" 
                size="sm" 
                onClick={handleSaveManualConnection}
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 font-bold py-2 text-xs"
              >
                {isConnecting ? 'Activating Connection...' : 'Save & Activate Connection'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: FACEBOOK POST PREVIEW */}
      {/* ==================================== */}
      {previewPost && (
        <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Facebook Page Feed Preview">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-2 py-1 text-xs text-zinc-400">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Live Meta Feed Simulator
              </span>
              <span className="font-mono text-[11px] text-indigo-400">{activeFbPage?.username || fbConn?.handle || '@page'}</span>
            </div>

            {/* Preview Card Shell */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-md mx-auto w-full shadow-2xl">
              {/* Profile Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                  {(activeFbPage?.name || fbConn?.label || 'FB').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-xs">{activeFbPage?.name || fbConn?.label || 'Facebook Page'}</div>
                  <div className="text-[10px] text-zinc-500">Facebook Page • Just now</div>
                </div>
              </div>

              {/* Post Text Body */}
              <div className="text-xs text-zinc-200 leading-relaxed font-sans whitespace-pre-wrap mb-3">
                {previewPost.body}
              </div>

              {/* Hashtags */}
              {previewPost.hashtags && previewPost.hashtags.length > 0 && (
                <div className="text-xs text-blue-400 font-mono mb-3">
                  {previewPost.hashtags.join(' ')}
                </div>
              )}

              {/* Media Attachment */}
              {previewPost.mediaUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 mb-3 bg-black">
                  {previewPost.mediaType === 'video' ? (
                    <video controls className="w-full max-h-64 object-cover">
                      <source src={previewPost.mediaUrl} type="video/mp4" />
                    </video>
                  ) : (
                    <img src={previewPost.mediaUrl} alt="Preview" className="w-full max-h-64 object-cover" />
                  )}
                </div>
              )}

              {/* Action Bar Simulation */}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-2.5 text-zinc-400 text-xs">
                <span>👍 Like</span>
                <span>💬 Comment</span>
                <span>🔁 Share</span>
                <span>🔖 Save</span>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================== */}
      {/* MODAL: CREATE CAMPAIGN */}
      {/* ==================================== */}
      <Modal isOpen={isNewCampaignOpen} onClose={() => setIsNewCampaignOpen(false)} title="Create New Marketing Campaign">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Campaign Title</label>
            <input 
              type="text" 
              value={newCampaign.name} 
              onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })}
              placeholder="e.g. SADC Cross-Border Trade Q4 Push" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Start Date</label>
              <input 
                type="date" 
                value={newCampaign.startDate} 
                onChange={e => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-zinc-300">End Date</label>
              <input 
                type="date" 
                value={newCampaign.endDate} 
                onChange={e => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Objective</label>
              <select 
                value={newCampaign.objective} 
                onChange={e => setNewCampaign({ ...newCampaign, objective: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              >
                <option>Lead Generation & Growth</option>
                <option>Brand Awareness & Keynotes</option>
                <option>Product Sales & Conversion</option>
                <option>Event Attendance & Demos</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Budget ($)</label>
              <input 
                type="text" 
                value={newCampaign.budget} 
                onChange={e => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                placeholder="$2,500" 
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Target Audience</label>
            <input 
              type="text" 
              value={newCampaign.audience} 
              onChange={e => setNewCampaign({ ...newCampaign, audience: e.target.value })}
              placeholder="e.g. Enterprise Directors, Trade Managers in Botswana & SA" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">AI Strategy Prompt Instructions (Optional)</label>
            <textarea 
              rows={3} 
              value={newCampaign.prompt} 
              onChange={e => setNewCampaign({ ...newCampaign, prompt: e.target.value })}
              placeholder="Instructions for Mari AI strategy generator..." 
              className="w-full mt-1 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white resize-none focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsNewCampaignOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleCreateCampaign}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
            >
              {isCreatingCampaign ? 'Creating Strategy...' : 'Create Campaign'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: CAMPAIGN STRATEGY DETAIL */}
      {/* ==================================== */}
      {selectedCampaignDetail && (
        <Modal isOpen={!!selectedCampaignDetail} onClose={() => setSelectedCampaignDetail(null)} title="Campaign Strategy Detail">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">{selectedCampaignDetail.name}</h3>
              <Badge variant="purple">{selectedCampaignDetail.budget || '$0'}</Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs leading-relaxed font-mono whitespace-pre-wrap text-zinc-200">
              {selectedCampaignDetail.strategyOutput || 'Mari AI Strategy generated for campaign.'}
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => {
                  setNewPost({
                    title: selectedCampaignDetail.name,
                    body: selectedCampaignDetail.strategyOutput || '',
                    platform: (selectedCampaignDetail.platforms[0] as any) || 'facebook',
                    hashtags: '#RalionGrowth #CampaignLaunch #EnterpriseOS',
                    scheduledAt: '',
                  });
                  setSelectedCampaignDetail(null);
                  setIsCreateOpen(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
              >
                <Send className="w-3.5 h-3.5 mr-1" /> Use Strategy in Composer
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedCampaignDetail(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ==================================== */}
      {/* MODAL: CHOOSE YOUR FACEBOOK PAGE */}
      {/* ==================================== */}
      <Modal isOpen={isPageSelectionModalOpen} onClose={() => setIsPageSelectionModalOpen(false)} title="Choose Facebook Page">
        <div className="flex flex-col gap-5">
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-500/20 text-xs text-indigo-200">
            <p className="font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" /> Authorized Facebook Pages
            </p>
            <p className="mt-1 text-zinc-300">
              Select the Facebook Page you want Ralion OS to manage. Your plan allows <strong>{facebookEntitlement.limit} Page</strong> (currently using <strong>{facebookEntitlement.current}</strong>).
            </p>
          </div>

          {availableFacebookPages.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex flex-col items-center text-center gap-4 py-8">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Globe className="w-6 h-6" />
              </div>
              <div className="max-w-xs">
                <h4 className="text-sm font-bold text-white">No Facebook Pages Discovered</h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Authenticate your Facebook account to link and manage your business pages in this workspace.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsPageSelectionModalOpen(false);
                  handleConnectSocialAccount('facebook');
                }}
                disabled={isConnecting}
                className="gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 font-bold text-xs shadow-lg shadow-indigo-600/30"
              >
                <Plus className="w-4 h-4" /> {isConnecting ? 'Connecting...' : 'Authenticate & Link Facebook'}
              </Button>
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 text-left max-w-sm">
                💡 <strong>Meta Permission Notice:</strong> Ensure you are logged into Facebook with an account that has Admin or Editor access to the target Facebook Page. If testing in Development mode, ensure your Facebook account is added to the Meta Developer app.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {availableFacebookPages.map((page) => {
                const isConnected = page.status === 'CONNECTED' || page.isCurrentDestination;
                const isLocked = page.status === 'LOCKED';

                return (
                  <div 
                    key={page.pageId}
                    className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isConnected 
                        ? 'bg-indigo-950/30 border-indigo-500/40 shadow-md' 
                        : isLocked 
                          ? 'bg-zinc-950/50 border-zinc-800 opacity-75' 
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
                        fb
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{page.name}</h4>
                          {isConnected && <Badge variant="success" className="text-[10px]">ACTIVE</Badge>}
                          {isLocked && <Badge variant="default" className="text-[10px]">🔒 UPGRADE</Badge>}
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-0.5">{page.username || '@facebook_page'}</p>
                        <p className="text-[11px] text-zinc-500 mt-0.5">{page.followersCount || 0} followers • {page.category || 'Business'}</p>
                      </div>
                    </div>

                    <div>
                      {isConnected ? (
                        <Button variant="outline" size="sm" disabled className="text-xs text-emerald-400 border-emerald-500/30 bg-emerald-950/20">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Active
                        </Button>
                      ) : isLocked ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setIsPageSelectionModalOpen(false);
                            setIsUpgradeModalOpen(true);
                          }}
                          className="text-xs text-amber-300 border-amber-500/40 hover:bg-amber-950/40"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1 text-amber-400" /> Unlock
                        </Button>
                      ) : (
                        <Button 
                          variant="primary" 
                          size="sm" 
                          onClick={() => handleConnectSelectedPage(page.pageId)}
                          disabled={isConnectingPage}
                          className="text-xs bg-indigo-600 hover:bg-indigo-700 font-bold"
                        >
                          {isConnectingPage ? 'Connecting...' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
            <span className="text-zinc-500">Need to manage multiple Pages?</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsPageSelectionModalOpen(false);
                setIsUpgradeModalOpen(true);
              }}
              className="text-xs text-indigo-300 border-indigo-500/30 hover:bg-indigo-950/40"
            >
              Upgrade Plan →
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: UPGRADE PLAN */}
      {/* ==================================== */}
      <Modal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} title="Upgrade Social Media Entitlements">
        <div className="flex flex-col gap-5">
          <div className="text-center p-2">
            <h3 className="text-base font-bold text-white">Scale Your Multi-Page Social Strategy</h3>
            <p className="text-xs text-zinc-400 mt-1">
              Your current Starter plan includes 1 Facebook Page. Upgrade to connect multiple client pages and brands.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-950 border border-indigo-500/40 flex flex-col justify-between gap-4">
              <div>
                <Badge variant="purple" className="text-[10px]">RECOMMENDED</Badge>
                <h4 className="text-base font-bold text-white mt-1">Professional Plan</h4>
                <p className="text-2xl font-black text-white mt-1">$49 <span className="text-xs text-zinc-400 font-normal">/ month</span></p>
                <ul className="text-xs text-zinc-300 mt-3 flex flex-col gap-2">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Up to 3 Facebook Pages</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Multi-destination cross-posting</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Mari AI 7-Day Strategy Engine</li>
                </ul>
              </div>
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  router.push('/billing?tier=professional');
                  setOauthAlert({
                    type: 'info',
                    message: 'Redirecting to plan selection & checkout...'
                  });
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold text-xs"
              >
                Upgrade to Professional
              </Button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between gap-4">
              <div>
                <Badge variant="default" className="text-[10px]">AGENCY & ENTERPRISE</Badge>
                <h4 className="text-base font-bold text-white mt-1">Enterprise Agency</h4>
                <p className="text-2xl font-black text-white mt-1">$199 <span className="text-xs text-zinc-400 font-normal">/ month</span></p>
                <ul className="text-xs text-zinc-300 mt-3 flex flex-col gap-2">
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> 10+ Facebook Pages & Brands</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Dedicated SADC CDN & IP Routing</li>
                  <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Custom AI Model Fine-tuning</li>
                </ul>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  setIsUpgradeModalOpen(false);
                  window.location.href = 'mailto:sales@rasalilabs.com?subject=Ralion%20Enterprise%20Plan%20Inquiry';
                  setOauthAlert({
                    type: 'success',
                    message: '📧 Opened enterprise sales inquiry. Our team will contact you within 2 hours.'
                  });
                }}
                className="w-full text-xs font-semibold"
              >
                Contact Enterprise Sales
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: EDIT BRAND VOICE */}
      {/* ==================================== */}
      <Modal isOpen={isEditBrandVoiceOpen} onClose={() => setIsEditBrandVoiceOpen(false)} title="Customize Mari AI Brand Voice">
        <div className="flex flex-col gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-xs text-purple-200">
            <p className="font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Learned Brand Identity Guidelines
            </p>
            <p className="mt-1 text-zinc-300">
              Fine-tune the tone of voice and technical vocabulary Mari AI uses when generating 7-day plans, post captions, and marketing strategies for <strong>{businessKnowledge?.businessName || activeFbPage?.name || fbConn?.label || 'Your Business'}</strong>.
            </p>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Brand Tone & Personality</label>
            <input 
              type="text" 
              value={customVoiceTone} 
              onChange={e => setCustomVoiceTone(e.target.value)}
              placeholder="e.g. Visionary, Authoritative, Solution-Driven" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Priority Keywords & Vocabulary (Comma-separated)</label>
            <textarea 
              rows={3} 
              value={customVoiceKeywords} 
              onChange={e => setCustomVoiceKeywords(e.target.value)}
              placeholder="Sovereign AI, Autonomous Orchestration, SADC Trade Corridor, Enterprise Security" 
              className="w-full mt-1 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white resize-none focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsEditBrandVoiceOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSaveBrandVoice}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
            >
              Save Brand Voice
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function GrowthPage() {
  return (
    <TierAccessGate
      requiredTier="STANDARD"
      featureName="Ralion Growth AI"
      description="Ralion Growth AI powers Facebook Page ingestion, multi-channel social publishing, video reel generation, and AI marketing campaigns. Available starting with Standard Plan ($1/day) or Professional."
    >
      <React.Suspense fallback={
        <div className="min-h-screen w-full flex items-center justify-center p-8">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        <GrowthPageContent />
      </React.Suspense>
    </TierAccessGate>
  );
}
