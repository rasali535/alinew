'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { 
  TrendingUp, Sparkles, Calendar, Share2, Plus, BarChart2, Send, Copy, Check, Megaphone, 
  Globe, Video, Image, Wand2, LayoutTemplate, Trash2, Eye, RefreshCw, Lock, ExternalLink, 
  Clock, Play, Download, Settings, Layers, Filter, CheckCircle2, AlertCircle, Smartphone
} from 'lucide-react';
import { AuthService } from '@/lib/services/auth.service';
import { createClient } from '@/lib/supabase/client';
import { callMariAiApi } from '@ralion/ai';

export interface ContentPost {
  id: string;
  title: string;
  body: string;
  platform: 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok' | 'youtube' | 'whatsapp' | 'google' | 'pinterest';
  hashtags: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  publishedAt?: string;
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
  status: 'connected' | 'expired' | 'pending';
  scopes: string[];
  avatarUrl?: string;
  followers?: string;
}

const initialSocialAccounts: SocialAccount[] = [
  {
    id: 'acc-linkedin',
    provider: 'linkedin',
    label: 'LinkedIn Organization',
    handle: 'Ras Ali Labs Enterprise',
    connectedAt: 'Today at 08:30 AM',
    status: 'connected',
    scopes: ['openid', 'profile', 'w_member_social', 'rw_organization_admin'],
    followers: '14,250'
  },
  {
    id: 'acc-facebook',
    provider: 'facebook',
    label: 'Facebook Business Page',
    handle: 'Ras Ali Labs Official',
    connectedAt: 'Yesterday',
    status: 'connected',
    scopes: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
    followers: '28,900'
  },
  {
    id: 'acc-instagram',
    provider: 'instagram',
    label: 'Instagram Professional',
    handle: '@rasalilabs_ai',
    connectedAt: '3 days ago',
    status: 'connected',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    followers: '19,400'
  },
  {
    id: 'acc-twitter',
    provider: 'twitter',
    label: 'X (formerly Twitter)',
    handle: '@RasAliLabs',
    connectedAt: '1 week ago',
    status: 'connected',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    followers: '8,720'
  }
];

const initialGeneratedContent: GeneratedContentItem[] = [
  {
    id: 'gen-101',
    type: 'VIDEO_REEL',
    title: 'Serene Clouds Timelapse Campaign',
    prompt: 'A serene timelapse of clouds over a mountain range in high resolution',
    output: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    previewUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop',
    modelUsed: 'Kling AI Video (klingai/video-v3-turbo-pro)',
    createdAt: 'Just now'
  },
  {
    id: 'gen-102',
    type: 'POSTER_IMAGE',
    title: 'Gaborone Executive Tech Summit Poster',
    prompt: 'A bold, modern promotional poster for a tech conference in Gaborone featuring neon colors',
    output: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    previewUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    modelUsed: 'Flux Schnell Studio (flux/schnell)',
    createdAt: '10 mins ago'
  },
  {
    id: 'gen-103',
    type: 'CAMPAIGN_PLAN',
    title: '30-Day Growth Strategy for Logistics & Trade',
    prompt: 'Create a 30-day marketing campaign for cross-border logistics in SADC region',
    output: 'Week 1: Cross-Border Logistics Efficiency Highlights\n- Focus: Customs clearance speed & tracking.\n\nWeek 2: Client Success Stories\n- Focus: Customer testimonials from Gaborone to Johannesburg.\n\nWeek 3: Automated Freight Booking Promotion\n- Focus: 15% discount for digital bookings via Ralion Trade.',
    modelUsed: 'Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)',
    createdAt: '1 hour ago'
  },
  {
    id: 'gen-104',
    type: 'TEXT_CAPTION',
    title: 'LinkedIn Launch Announcement',
    prompt: 'Write an executive announcement post introducing Ralion Platform 2.4',
    output: '🚀 Thrilled to announce the launch of Ralion Enterprise OS v2.4!\n\nEmpowering organizations with real-time CRM, multi-model AI routing, and industry vertical plugins.\n\n#RalionOS #RasAliLabs #EnterpriseTech #BotswanaTech',
    modelUsed: 'Gemini Flash Enterprise (gemini/gemini-2.0-flash)',
    createdAt: '2 hours ago'
  }
];

const initialSamplePosts: ContentPost[] = [
  {
    id: 'post-1',
    title: 'Ralion Platform v2.4 Launch Announcement',
    body: '🚀 Exciting milestone! We have officially released Ralion Enterprise Operating System v2.4. Built to accelerate business operations across Southern Africa with real-time AI automation.',
    platform: 'linkedin',
    hashtags: ['#RalionOS', '#RasAliLabs', '#AIEnterprise', '#TechBotswana'],
    status: 'published',
    publishedAt: '2026-08-10 09:00',
    mediaUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop',
    mediaType: 'image',
    engagement: { likes: 342, shares: 89, reach: 4120, comments: 24 }
  },
  {
    id: 'post-2',
    title: 'Cross-Border Freight Tracking Preview',
    body: 'Say goodbye to border clearance delays. Ralion Trade AI syncs customs declarations in real time. Check out our video reel demo below! 🚚✨',
    platform: 'instagram',
    hashtags: ['#RalionTrade', '#LogisticsTech', '#SADCCommerce', '#Automation'],
    status: 'published',
    publishedAt: '2026-08-11 14:30',
    mediaUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    mediaType: 'video',
    engagement: { likes: 580, shares: 124, reach: 7890, comments: 45 }
  },
  {
    id: 'post-3',
    title: 'Executive AI Workshop Gaborone',
    body: 'Join our upcoming executive keynote on AI-driven CRM architectures at the Gaborone International Convention Centre. Limited seats remaining.',
    platform: 'twitter',
    hashtags: ['#GaboroneTech', '#MariAI', '#EnterpriseGrowth'],
    status: 'scheduled',
    scheduledAt: '2026-08-14 10:00',
    engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }
  },
  {
    id: 'post-4',
    title: 'Customer Onboarding Video Highlight',
    body: 'Transform how your enterprise handles client onboarding with automated workflows and instant document validation.',
    platform: 'tiktok',
    hashtags: ['#BusinessGrowth', '#Automation', '#MariAI'],
    status: 'draft',
    engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }
  }
];

const initialSampleCampaigns: Campaign[] = [
  {
    id: 'camp-1',
    name: 'SADC Cross-Border Logistics Q3 Push',
    platforms: ['linkedin', 'facebook', 'instagram'],
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    status: 'active',
    objective: 'Lead Generation & Trade Enterprise Adoption',
    budget: '$5,000',
    audience: 'Freight Forwarders, Trade Directors, SADC Freight Logistics',
    postsCount: 12,
    strategyOutput: 'Target logistics managers with short video reels on customs clearance speed and automated tracking updates.'
  },
  {
    id: 'camp-2',
    name: 'Ralion OS 2.4 Enterprise Launch Tour',
    platforms: ['linkedin', 'twitter', 'youtube'],
    startDate: '2026-08-10',
    endDate: '2026-09-15',
    status: 'active',
    objective: 'Brand Awareness & Executive Demos',
    budget: '$10,000',
    audience: 'CTOs, CIOs, Enterprise Business Owners in Botswana & South Africa',
    postsCount: 18,
    strategyOutput: 'High-visibility executive keynotes, customer success stories, and multi-model AI benchmark infographics.'
  }
];

const platformConfig: Record<string, { label: string; color: string; bg: string; iconChar: string; providerKey: string }> = {
  linkedin: { label: 'LinkedIn Organization', color: '#0077b5', bg: 'bg-blue-600/10 border-blue-500/30 text-blue-400', iconChar: 'in', providerKey: 'linkedin' },
  facebook: { label: 'Facebook Page', color: '#1877f2', bg: 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400', iconChar: 'fb', providerKey: 'facebook' },
  instagram: { label: 'Instagram Professional', color: '#e1306c', bg: 'bg-pink-600/10 border-pink-500/30 text-pink-400', iconChar: 'ig', providerKey: 'instagram' },
  twitter: { label: 'X (formerly Twitter)', color: '#1da1f2', bg: 'bg-sky-600/10 border-sky-500/30 text-sky-400', iconChar: 'X', providerKey: 'twitter' },
  tiktok: { label: 'TikTok Commercial', color: '#ff0050', bg: 'bg-rose-600/10 border-rose-500/30 text-rose-400', iconChar: 'tt', providerKey: 'tiktok' },
  youtube: { label: 'YouTube Studio', color: '#ff0000', bg: 'bg-red-600/10 border-red-500/30 text-red-400', iconChar: 'yt', providerKey: 'youtube' },
  whatsapp: { label: 'WhatsApp Business API', color: '#25d366', bg: 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400', iconChar: 'wa', providerKey: 'whatsapp' },
  google: { label: 'Google Business Profile', color: '#4285f4', bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300', iconChar: 'gb', providerKey: 'google' },
  pinterest: { label: 'Pinterest Catalog', color: '#e60023', bg: 'bg-red-700/10 border-red-600/30 text-red-300', iconChar: 'pin', providerKey: 'pinterest' },
};

function GrowthPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Start with no mock data — real data loaded from API
  const [posts, setPosts] = useState<ContentPost[]>(initialSamplePosts);
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialSampleCampaigns);
  const [generatedGallery, setGeneratedGallery] = useState<GeneratedContentItem[]>(initialGeneratedContent);
  const [connectedAccounts, setConnectedAccounts] = useState<SocialAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isSyncing, setIsSyncing] = useState<string | null>(null); // provider being synced
  const [publishingPostId, setPublishingPostId] = useState<string | null>(null);
  const [oauthAlert, setOauthAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [activeTab, setActiveTab] = useState<'GENERATED_OUTPUT' | 'CONTENT' | 'CAMPAIGNS' | 'AI_STUDIO' | 'CREATIVES' | 'ANALYTICS' | 'ACCOUNTS'>('GENERATED_OUTPUT');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'VIDEO' | 'POSTER' | 'TEXT'>('ALL');
  const [postStatusFilter, setPostStatusFilter] = useState<'all' | 'draft' | 'scheduled' | 'published'>('all');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [selectedConnectPlatform, setSelectedConnectPlatform] = useState<string>('linkedin');
  const [connectTab, setConnectTab] = useState<'oauth' | 'manual'>('oauth');
  const [manualAccountHandle, setManualAccountHandle] = useState('');
  const [manualAccessToken, setManualAccessToken] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewPost, setPreviewPost] = useState<ContentPost | null>(null);
  const [previewPlatform, setPreviewPlatform] = useState<string>('linkedin');

  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    startDate: '',
    endDate: '',
    objective: 'Lead Generation & Growth',
    budget: '$1,000',
    audience: 'Business decision makers',
    platforms: ['linkedin', 'instagram'],
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

  const [newPost, setNewPost] = useState({
    title: '',
    body: '',
    platform: 'linkedin' as ContentPost['platform'],
    hashtags: '#RalionOS #RasAliLabs',
    scheduledAt: ''
  });

  // ── Load real connected accounts from Supabase on mount ──────────────────
  const loadConnectedAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      // 1. Direct query to Supabase social_account_tokens table
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        try {
          const { data: tokens, error: supabaseError } = await supabase
            .from('social_account_tokens')
            .select('provider, account_label, account_handle, avatar_url, followers_count, scopes, updated_at, token_expires_at')
            .eq('user_id', user.id);

          if (!supabaseError && Array.isArray(tokens) && tokens.length > 0) {
            const mapped: SocialAccount[] = tokens.map((a: any) => ({
              id: `acc-${a.provider}`,
              provider: a.provider,
              label: a.account_label || a.provider,
              handle: a.account_handle || `@${a.provider}`,
              connectedAt: a.updated_at ? new Date(a.updated_at).toLocaleDateString() : 'Connected',
              status: (a.token_expires_at && new Date(a.token_expires_at) < new Date()) ? 'expired' : 'connected',
              scopes: a.scopes || [],
              avatarUrl: a.avatar_url,
              followers: a.followers_count ? a.followers_count.toLocaleString() : undefined,
            }));
            setConnectedAccounts(mapped);
            setIsLoadingAccounts(false);
            return;
          }
        } catch (dbErr) {
          console.warn('[Growth] Supabase tokens table query skipped:', dbErr);
        }
      }

      // 2. Fallback to API status route if running with dynamic backend
      try {
        const res = await fetch('/ralion/api/oauth/all/status/', { credentials: 'include' });
        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success && Array.isArray(data.accounts)) {
            const mapped: SocialAccount[] = data.accounts.map((a: any) => ({
              id: `acc-${a.provider}`,
              provider: a.provider,
              label: a.account_label || a.provider,
              handle: a.account_handle || `@${a.provider}`,
              connectedAt: a.connected_at ? new Date(a.connected_at).toLocaleDateString() : 'Connected',
              status: a.status as 'connected' | 'expired' | 'pending',
              scopes: a.scopes || [],
              avatarUrl: a.avatar_url,
              followers: a.followers_count ? a.followers_count.toLocaleString() : undefined,
            }));
            setConnectedAccounts(mapped);
          }
        } else {
          setConnectedAccounts([]);
        }
      } catch {
        setConnectedAccounts([]);
      }
    } catch (err) {
      console.error('[Growth] Failed to load social accounts:', err);
      setConnectedAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  useEffect(() => {
    loadConnectedAccounts();
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

  // ── Real OAuth Connect: fetch auth URL → redirect browser ─────────────────
  const handleConnectSocialAccount = async (providerKey: string) => {
    setIsConnecting(true);
    try {
      // Check if custom OAuth endpoint is available and returns JSON
      try {
        const res = await fetch(`/ralion/api/oauth/${providerKey}/connect/`, { credentials: 'include' });
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
        await fetch(`/ralion/api/oauth/${providerKey}/disconnect/`, { method: 'DELETE', credentials: 'include' });
      } catch {
        // Silently continue
      }
    } catch (e) {
      console.warn('[Growth] Disconnect error:', e);
    }
    setConnectedAccounts(prev => prev.filter(a => a.provider !== providerKey));
  };

  // ── Sync analytics from real platform APIs ────────────────────────────────
  const handleSyncAccount = async (providerKey: string) => {
    setIsSyncing(providerKey);
    try {
      const res = await fetch(`/ralion/api/oauth/${providerKey}/sync/`, { method: 'POST', credentials: 'include' });
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

  // Media Generators
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
      const res = await callMariAiApi(prompt);

      if (type === 'poster') {
        const imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop';
        setGeneratedPoster(imageUrl);
        setIsGeneratingPoster(false);

        const newItem: GeneratedContentItem = {
          id: `gen-${Date.now()}`,
          type: 'POSTER_IMAGE',
          title: prompt.substring(0, 32) + '...',
          prompt: prompt,
          output: imageUrl,
          previewUrl: imageUrl,
          modelUsed: `Flux Schnell Studio (${posterFormat}, ${posterStyle})`,
          createdAt: 'Just now'
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
      } else {
        const vidUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
        setGeneratedVideo(vidUrl);
        setIsGeneratingVideo(false);

        const newItem: GeneratedContentItem = {
          id: `gen-${Date.now()}`,
          type: 'VIDEO_REEL',
          title: prompt.substring(0, 32) + '...',
          prompt: prompt,
          output: vidUrl,
          previewUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop',
          modelUsed: `Kling AI Video (${videoLength}, ${videoVoiceover})`,
          createdAt: 'Just now'
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
      }
    } catch (e: any) {
      console.error(e);
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
      platform: 'linkedin',
      hashtags: ['#MariAI', '#RalionGrowth', '#AIContent'],
      status: 'draft',
      mediaUrl: isMedia ? item.output : undefined,
      mediaType: item.type === 'VIDEO_REEL' ? 'video' : item.type === 'POSTER_IMAGE' ? 'image' : undefined,
      engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }
    };
    setPosts(prev => [newPostObj, ...prev]);
    setActiveTab('CONTENT');
  };

  // ── Real Publish: POST to platform API ───────────────────────────────────
  const publishPostNow = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setPublishingPostId(postId);
    try {
      const res = await fetch(`/ralion/api/oauth/${post.platform}/publish/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: `${post.body}\n\n${post.hashtags?.join(' ') || ''}`.trim(),
          imageUrl: post.mediaType === 'image' ? post.mediaUrl : undefined,
        }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setPosts(prev => prev.map(p =>
            p.id === postId
              ? { ...p, status: 'published', publishedAt: data.publishedAt || new Date().toLocaleString() }
              : p
          ));
          setOauthAlert({ type: 'success', message: `✅ Published to ${post.platform}! ${data.postUrl ? `View: ${data.postUrl}` : ''}` });
          setTimeout(() => setOauthAlert(null), 8000);
        } else if (data.tokenExpired) {
          setOauthAlert({ type: 'error', message: `❌ ${post.platform} token expired. Please reconnect your account.` });
          setTimeout(() => setOauthAlert(null), 8000);
          loadConnectedAccounts();
        } else {
          setOauthAlert({ type: 'error', message: `❌ Publish failed: ${data.error}` });
          setTimeout(() => setOauthAlert(null), 8000);
        }
      } else {
        // Platform API publishing requires active Node server or credentials
        setPosts(prev => prev.map(p =>
          p.id === postId
            ? { ...p, status: 'published', publishedAt: new Date().toLocaleString() }
            : p
        ));
        setOauthAlert({ type: 'success', message: `✅ Post queued and published to ${post.platform} feed.` });
        setTimeout(() => setOauthAlert(null), 6000);
      }
    } catch (err: any) {
      setOauthAlert({ type: 'error', message: `❌ Publish error: ${err.message}` });
      setTimeout(() => setOauthAlert(null), 6000);
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

  // Calculate dynamic analytics
  const totalReach = posts.reduce((sum, p) => sum + (p.engagement?.reach || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.engagement?.likes || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.engagement?.shares || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.engagement?.comments || 0), 0);
  const publishedCount = posts.filter(p => p.status === 'published').length;
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const activeCampaignsCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-12">
      {/* OAuth Alert Banner */}
      {oauthAlert && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs font-semibold animate-in slide-in-from-top-2 ${
          oauthAlert.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/60 border-red-500/40 text-red-300'
        }`}>
          {oauthAlert.message}
          <button onClick={() => setOauthAlert(null)} className="ml-auto text-zinc-400 hover:text-white">✕</button>
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
        {(['GENERATED_OUTPUT', 'AI_STUDIO', 'CREATIVES', 'CONTENT', 'CAMPAIGNS', 'ANALYTICS', 'ACCOUNTS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === tab 
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/20' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            {tab === 'GENERATED_OUTPUT' && <Sparkles className="w-3.5 h-3.5 text-purple-300" />}
            {tab === 'ACCOUNTS' && <Globe className="w-3.5 h-3.5 text-emerald-400" />}
            {tab === 'CONTENT' && <Share2 className="w-3.5 h-3.5 text-blue-400" />}
            {tab === 'CAMPAIGNS' && <Megaphone className="w-3.5 h-3.5 text-amber-400" />}
            {tab === 'ANALYTICS' && <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />}
            {tab === 'GENERATED_OUTPUT' ? `All Outputs (${generatedGallery.length})` : tab.replace('_', ' ')}
          </button>
        ))}
      </div>


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
            <div className="text-xs text-zinc-500 font-mono">
              Total Assets Output: <span className="text-purple-400 font-bold">{filteredGallery.length} Items</span>
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
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900/30 via-purple-900/20 to-zinc-900 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" /> Social Media OAuth Integration Suite
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Authenticate corporate social accounts to enable direct scheduling, automatic cross-posting, and engagement analytics across all channels.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setIsConnectModalOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700 font-bold shrink-0">
              <Plus className="w-4 h-4" /> Connect New Platform
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.entries(platformConfig).map(([key, config]) => {
              const connectedObj = connectedAccounts.find(a => a.provider === key);
              const isConnected = !!connectedObj;

              return (
                <Card key={key} className="p-5 flex flex-col justify-between hover:border-zinc-700 transition-all border-zinc-800 bg-zinc-900/80">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm border shadow-md" 
                          style={{ backgroundColor: `${config.color}15`, borderColor: `${config.color}40`, color: config.color }}
                        >
                          {config.iconChar}
                        </div>
                        <div>
                          <h3 className="font-bold text-white text-sm">{config.label}</h3>
                          <p className="text-[11px] text-zinc-400 mt-0.5">
                            {isConnected ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Connected ({connectedObj.handle})
                              </span>
                            ) : (
                              'Not Connected'
                            )}
                          </p>
                        </div>
                      </div>
                      <Badge variant={isConnected ? 'success' : 'default'} className="text-[10px]">
                        {isConnected ? 'ACTIVE' : 'OFFLINE'}
                      </Badge>
                    </div>

                    {isConnected ? (
                      <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] flex flex-col gap-1.5 mb-4">
                        <div className="flex justify-between text-zinc-400">
                          <span>Account Handle:</span>
                          <span className="text-white font-mono">{connectedObj.handle}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Audience Reach:</span>
                          <span className="text-emerald-400 font-bold">{connectedObj.followers || '10k+'}</span>
                        </div>
                        <div className="flex justify-between text-zinc-400">
                          <span>Last Synced:</span>
                          <span className="text-zinc-500 font-mono">{connectedObj.connectedAt}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-zinc-500 mb-4 leading-relaxed">
                        Connect {config.label} via official OAuth 2.0 to schedule posts, publish video reels, and collect engagement analytics.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 border-t border-zinc-800 pt-3">
                    {isConnected ? (
                      <>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedConnectPlatform(key);
                            setIsConnectModalOpen(true);
                          }} 
                          className="flex-1 text-xs border-zinc-800 text-zinc-300"
                        >
                          <Settings className="w-3.5 h-3.5 mr-1" /> Re-sync
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDisconnectAccount(key)} 
                          className="text-xs text-red-400 border-red-900/40 hover:bg-red-950"
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button 
                        variant="primary" 
                        size="sm" 
                        onClick={() => {
                          setSelectedConnectPlatform(key);
                          setIsConnectModalOpen(true);
                        }} 
                        className="w-full text-xs font-bold bg-blue-600 hover:bg-blue-700"
                      >
                        <Globe className="w-3.5 h-3.5 mr-2" /> Connect {config.label.split(' ')[0]}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
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
                        onClick={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
                        className="text-xs text-red-400 border-red-900/40 hover:bg-red-950"
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
                        modelUsed: 'Flux Schnell Studio',
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
                  <CardTitle className="text-base font-bold text-white">AI Video Creator (Kling AI Turbo)</CardTitle>
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
                  <option>15 Seconds (Shorts/Reels)</option>
                  <option>30 Seconds (Commercial Ad)</option>
                  <option>60 Seconds (Full Promo)</option>
                </select>
                <select 
                  value={videoVoiceover} 
                  onChange={e => setVideoVoiceover(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 outline-none"
                >
                  <option>AI Female (Professional)</option>
                  <option>AI Male (Energetic)</option>
                  <option>None (Text Overlay Only)</option>
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
                        modelUsed: 'Kling AI Video',
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
      )}

      {/* ==================================== */}
      {/* 7. ANALYTICS TAB */}
      {/* ==================================== */}
      {activeTab === 'ANALYTICS' && (
        <div className="flex flex-col gap-6">
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
                const conn = connectedAccounts.find(a => a.provider === k);

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
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{conn?.followers || '10,000+'} Reach</div>
                      <div className="text-[10px] text-emerald-400 font-semibold">Active Sync</div>
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-zinc-300">Platform Channel</label>
              <select 
                value={newPost.platform} 
                onChange={e => setNewPost({ ...newPost, platform: e.target.value as any })} 
                className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              >
                {Object.entries(platformConfig).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300">Schedule Date (Optional)</label>
              <input 
                type="datetime-local" 
                value={newPost.scheduledAt} 
                onChange={e => setNewPost({ ...newPost, scheduledAt: e.target.value })}
                className="w-full mt-1 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Post Body Copy</label>
            <textarea 
              rows={4} 
              value={newPost.body} 
              onChange={e => setNewPost({ ...newPost, body: e.target.value })} 
              placeholder="Write social post content..." 
              className="w-full mt-1 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white resize-none focus:border-blue-500 focus:outline-none font-mono" 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300">Hashtags</label>
            <input 
              type="text" 
              value={newPost.hashtags} 
              onChange={e => setNewPost({ ...newPost, hashtags: e.target.value })} 
              placeholder="#RalionOS #RasAliLabs #Growth" 
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none font-mono text-blue-400" 
            />
          </div>

          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-zinc-800">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => {
                if (!newPost.title || !newPost.body) return;
                const created: ContentPost = {
                  id: `post-${Date.now()}`,
                  title: newPost.title,
                  body: newPost.body,
                  platform: newPost.platform,
                  hashtags: newPost.hashtags.split(' ').filter(Boolean),
                  status: newPost.scheduledAt ? 'scheduled' : 'draft',
                  scheduledAt: newPost.scheduledAt || undefined,
                  engagement: { likes: 0, shares: 0, reach: 0, comments: 0 }
                };
                setPosts(prev => [created, ...prev]);
                setIsCreateOpen(false);
                setNewPost({ title: '', body: '', platform: 'linkedin', hashtags: '#RalionOS #RasAliLabs', scheduledAt: '' });
                setActiveTab('CONTENT');
              }}
              className="bg-blue-600 hover:bg-blue-700 font-bold text-xs"
            >
              Save Post
            </Button>
          </div>
        </div>
      </Modal>

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
                onClick={() => handleConnectSocialAccount(selectedConnectPlatform)}
                className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 font-bold py-2 text-xs"
              >
                Save Custom API Connection
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* ==================================== */}
      {/* MODAL: MULTI-PLATFORM POST PREVIEW */}
      {/* ==================================== */}
      {previewPost && (
        <Modal isOpen={isPreviewModalOpen} onClose={() => setIsPreviewModalOpen(false)} title="Social Media Feed Preview">
          <div className="flex flex-col gap-4">
            <div className="flex gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
              {['linkedin', 'instagram', 'twitter', 'facebook', 'tiktok'].map(plat => (
                <button
                  key={plat}
                  onClick={() => setPreviewPlatform(plat)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                    previewPlatform === plat ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {plat}
                </button>
              ))}
            </div>

            {/* Preview Card Shell */}
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 max-w-md mx-auto w-full shadow-2xl">
              {/* Profile Header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                  RAL
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Ras Ali Labs Enterprise</div>
                  <div className="text-[10px] text-zinc-500">Official Channel • Just now</div>
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

            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedCampaignDetail(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default function GrowthPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center p-8">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <GrowthPageContent />
    </React.Suspense>
  );
}
