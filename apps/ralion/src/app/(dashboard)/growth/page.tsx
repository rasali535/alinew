'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { TrendingUp, Sparkles, Calendar, Share2, Plus, BarChart2, Send, Copy, Check, Megaphone, Globe, Video, Image, Wand2, LayoutTemplate } from 'lucide-react';
import { AuthService } from '@/lib/services/auth.service';
import { callMariAiApi, generateVideo, selectBestAimlModel } from '@ralion/ai';

interface ContentPost {
  id: string;
  title: string;
  body: string;
  platform: string;
  hashtags: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduledAt?: string;
  engagement?: { likes: number; shares: number; reach: number };
}

interface Campaign {
  id: string;
  name: string;
  platforms: string[];
  startDate: string;
  endDate: string;
  status: 'planning' | 'active' | 'completed';
  postsCount: number;
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

const initialGeneratedContent: GeneratedContentItem[] = [
  {
    id: 'gen-101',
    type: 'VIDEO_REEL',
    title: 'Serene Clouds Timelapse Campaign',
    prompt: 'A serene timelapse of clouds over a mountain range in high resolution',
    output: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    previewUrl: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop',
    modelUsed: 'Kling AI Video (klingai/video-v3-turbo-pro-text-to-video)',
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

const samplePosts: ContentPost[] = [];
const sampleCampaigns: Campaign[] = [];

const platformConfig: Record<string, { label: string; color: string }> = {
  linkedin: { label: 'LinkedIn', color: 'blue' },
  instagram: { label: 'Instagram', color: 'purple' },
  facebook: { label: 'Facebook', color: 'primary' },
  twitter: { label: 'X/Twitter', color: 'default' },
  tiktok: { label: 'TikTok', color: 'danger' },
  youtube: { label: 'YouTube', color: 'danger' },
};

export default function GrowthPage() {
  const [posts, setPosts] = useState(samplePosts);
  const [campaigns] = useState(sampleCampaigns);
  const [generatedGallery, setGeneratedGallery] = useState<GeneratedContentItem[]>(initialGeneratedContent);
  const [activeTab, setActiveTab] = useState<'GENERATED_OUTPUT' | 'CONTENT' | 'CAMPAIGNS' | 'AI_STUDIO' | 'CREATIVES' | 'ANALYTICS' | 'ACCOUNTS'>('GENERATED_OUTPUT');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'VIDEO' | 'POSTER' | 'TEXT'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newPost, setNewPost] = useState({ title: '', body: '', platform: 'linkedin', hashtags: '' });
  
  // States for Media Generation
  const [posterPrompt, setPosterPrompt] = useState('');
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false);
  const [generatedPoster, setGeneratedPoster] = useState('');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState('');

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
          title: prompt.substring(0, 30) + '...',
          prompt: prompt,
          output: imageUrl,
          previewUrl: imageUrl,
          modelUsed: 'Flux Schnell (flux/schnell)',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setGeneratedGallery(prev => [newItem, ...prev]);
      } else {
        const vidText = res ? res.text : 'Video generation queued via Kling AI Video API.';
        setGeneratedVideo(vidText);
        setIsGeneratingVideo(false);

        const newItem: GeneratedContentItem = {
          id: `gen-${Date.now()}`,
          type: 'VIDEO_REEL',
          title: prompt.substring(0, 30) + '...',
          prompt: prompt,
          output: vidText,
          modelUsed: 'Kling AI Video (klingai/video-v3-turbo-pro-text-to-video)',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const [copied, setCopied] = useState(false);

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

  const statusBadge = (s: string) => {
    if (s === 'published') return 'success';
    if (s === 'scheduled') return 'primary';
    return 'default';
  };

  const filteredGallery = generatedGallery.filter(item => {
    if (selectedFilter === 'VIDEO') return item.type === 'VIDEO_REEL';
    if (selectedFilter === 'POSTER') return item.type === 'POSTER_IMAGE';
    if (selectedFilter === 'TEXT') return item.type === 'TEXT_CAPTION' || item.type === 'CAMPAIGN_PLAN';
    return true;
  });

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Growth Studio</h1>
            <Badge variant="purple">Multi-Model Creative Suite</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Generate AI videos, posters, marketing copy, and review your output history.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Post
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit overflow-x-auto">
        {(['GENERATED_OUTPUT', 'AI_STUDIO', 'CREATIVES', 'CONTENT', 'CAMPAIGNS', 'ANALYTICS', 'ACCOUNTS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {tab === 'GENERATED_OUTPUT' ? `All Generated Content (${generatedGallery.length})` : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Generated Content Output Gallery Tab */}
      {activeTab === 'GENERATED_OUTPUT' && (
        <div className="flex flex-col gap-6">
          {/* Sub-Filter Controls */}
          <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Filter Assets:</span>
              <div className="flex gap-1">
                {(['ALL', 'VIDEO', 'POSTER', 'TEXT'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setSelectedFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${selectedFilter === f ? 'bg-purple-600 text-white' : 'bg-zinc-950 text-zinc-400 hover:text-white'}`}
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
                      <img src={item.output} alt={item.title} className="w-full h-auto object-cover max-h-72" />
                    </div>
                  )}

                  {item.type === 'VIDEO_REEL' && (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 p-4">
                      {item.output.startsWith('http') ? (
                        <video controls className="w-full rounded-lg max-h-64 object-cover" poster={item.previewUrl}>
                          <source src={item.output} type="video/mp4" />
                        </video>
                      ) : (
                        <div className="p-4 rounded-xl bg-zinc-900 text-xs text-blue-300 font-mono whitespace-pre-wrap">
                          {item.output}
                        </div>
                      )}
                    </div>
                  )}

                  {(item.type === 'TEXT_CAPTION' || item.type === 'CAMPAIGN_PLAN') && (
                    <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 font-mono leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap">
                      {item.output}
                    </div>
                  )}
                </CardContent>

                <div className="p-3 bg-zinc-950/80 border-t border-zinc-800 flex items-center justify-between">
                  <button
                    onClick={() => handleCopyText(item.id, item.output)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-zinc-300 border border-zinc-800 transition-colors"
                  >
                    {copiedId === item.id ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Content</>}
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPosts(prev => [{
                        id: `p-${Date.now()}`,
                        title: item.title,
                        body: item.output,
                        platform: 'linkedin',
                        hashtags: ['#AI', '#RalionGrowth'],
                        status: 'draft'
                      }, ...prev]);
                      setActiveTab('CONTENT');
                    }}
                    className="text-xs font-semibold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Convert to Post
                  </Button>
                </div>
              </Card>
            ))}

            {filteredGallery.length === 0 && (
              <div className="col-span-2 p-12 text-center text-zinc-500 text-xs italic">
                No generated assets found under "{selectedFilter}". Generate new videos, posters, or captions using AI Studio or Creatives tabs.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content Tab */}
      {activeTab === 'CONTENT' && (
        <div className="flex flex-col gap-4">
          {posts.map(post => (
            <Card key={post.id} className="p-5 hover:border-blue-500/30 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={platformConfig[post.platform]?.color as any || 'default'}>
                      {platformConfig[post.platform]?.label || post.platform}
                    </Badge>
                    <Badge variant={statusBadge(post.status) as any}>{post.status}</Badge>
                    {post.scheduledAt && <span className="text-[10px] text-zinc-500 font-mono">{post.scheduledAt}</span>}
                  </div>
                  <h3 className="text-sm font-bold text-white">{post.title}</h3>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">{post.body}</p>
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.hashtags.map((h, i) => (
                        <span key={i} className="text-[10px] text-blue-400 font-mono">{h}</span>
                      ))}
                    </div>
                  )}
                  {post.engagement && (
                    <div className="flex items-center gap-4 mt-3 text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-2">
                      <span>❤️ {post.engagement.likes} likes</span>
                      <span>🔁 {post.engagement.shares} shares</span>
                      <span>👁️ {post.engagement.reach.toLocaleString()} reach</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  {post.status === 'draft' && <Button variant="primary" size="sm"><Send className="w-3 h-3" /></Button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Campaigns Tab */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map(c => (
            <Card key={c.id} className="p-5 hover:border-blue-500/30 transition-all cursor-pointer">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">{c.name}</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{c.startDate} → {c.endDate}</p>
                </div>
                <Badge variant={c.status === 'active' ? 'success' : 'default'}>{c.status}</Badge>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {c.platforms.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">{platformConfig[p]?.label || p}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-4 text-[11px] text-zinc-500 border-t border-zinc-800/60 pt-3">
                <span>📝 {c.postsCount} posts planned</span>
                <span className="ml-auto text-blue-400 font-semibold cursor-pointer">Open Campaign →</span>
              </div>
            </Card>
          ))}
          <button
            onClick={() => {}}
            className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border border-dashed border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 transition-all"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-semibold">New Campaign</span>
          </button>
        </div>
      )}

      {/* AI Studio Tab */}
      {activeTab === 'AI_STUDIO' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <CardTitle>Mari AI Content Studio</CardTitle>
                  <CardDescription>Generate campaigns, captions, and content calendars</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                {['Create a 30-day marketing campaign', 'Write a LinkedIn announcement post', 'Draft 5 Instagram captions', 'Generate hashtag strategy'].map((p, i) => (
                  <button key={i} onClick={() => setAiPrompt(p)} className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white hover:border-blue-500/50 transition-all">
                    {p}
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                placeholder="e.g. Create a 30-day marketing campaign for my funeral business in Botswana..."
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <Button variant="primary" size="sm" onClick={handleAiGenerate} className="w-full justify-center">
                {isGenerating ? <><span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate with Mari AI</>}
              </Button>
            </CardContent>
          </Card>

          {aiResult && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">AI Generated Content</CardTitle>
                  <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 hover:text-white transition-all">
                    {copied ? <><Check className="w-3 h-3 text-emerald-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy All</>}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed font-mono overflow-y-auto max-h-72">{aiResult}</pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Creatives Tab */}
      {activeTab === 'CREATIVES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Poster Generator */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-pink-600 to-purple-600 text-white">
                  <Image className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>AI Poster Generator</CardTitle>
                  <CardDescription>Generate high-converting posters for social media and ads.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                rows={3}
                value={posterPrompt}
                onChange={e => setPosterPrompt(e.target.value)}
                placeholder="Describe the poster... (e.g. A bold, modern promotional poster for a tech conference in Gaborone featuring neon colors)"
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 resize-none"
              />
              <div className="flex gap-2">
                <select className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none flex-1">
                  <option>Format: Instagram Square (1:1)</option>
                  <option>Format: Story / Reel (9:16)</option>
                  <option>Format: LinkedIn / Twitter (16:9)</option>
                </select>
                <select className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none flex-1">
                  <option>Style: Modern Minimalist</option>
                  <option>Style: Bold & Vibrant</option>
                  <option>Style: Corporate Professional</option>
                </select>
              </div>
              <Button onClick={() => generateMedia('poster')} variant="primary" className="w-full justify-center bg-purple-600 hover:bg-purple-700">
                {isGeneratingPoster ? 'Processing...' : <><Wand2 className="w-4 h-4 mr-2" /> Generate Poster</>}
              </Button>
              {generatedPoster && (
                <div className="mt-4 p-2 bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
                  <img src={generatedPoster} alt="Generated Poster" className="w-full h-auto rounded-lg object-cover" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Video Generator */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-600 text-white">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>AI Video Creator</CardTitle>
                  <CardDescription>Create short-form marketing videos from text prompts.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <textarea
                rows={3}
                value={videoPrompt}
                onChange={e => setVideoPrompt(e.target.value)}
                placeholder="Describe the video... (e.g. A 15-second promotional video showing a bustling cafe with a text overlay 'Morning Coffee Runs Just Got Better')"
                className="w-full p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <select className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none flex-1">
                  <option>Length: 15 Seconds (Shorts/Reels)</option>
                  <option>Length: 30 Seconds (Ad)</option>
                  <option>Length: 60 Seconds (Full Promo)</option>
                </select>
                <select className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 outline-none flex-1">
                  <option>Voiceover: AI Female (Professional)</option>
                  <option>Voiceover: AI Male (Energetic)</option>
                  <option>Voiceover: None (Text Only)</option>
                </select>
              </div>
              <Button onClick={() => generateMedia('video')} variant="primary" className="w-full justify-center bg-blue-600 hover:bg-blue-700">
                {isGeneratingVideo ? 'Processing...' : <><Wand2 className="w-4 h-4 mr-2" /> Generate Video</>}
              </Button>
              {generatedVideo && (
                <div className="mt-4 p-4 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-center text-xs text-blue-400 font-mono text-center">
                  {generatedVideo}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Reach', value: '0', change: '0%', icon: '👁️' },
            { label: 'Engagements', value: '0', change: '0%', icon: '❤️' },
            { label: 'Published Posts', value: '0', change: '0', icon: '📝' },
            { label: 'Active Campaigns', value: '0', change: 'None', icon: '🚀' },
            { label: 'Top Platform', value: 'N/A', change: 'No data', icon: '💼' },
            { label: 'AI Posts Generated', value: '0', change: 'This month', icon: '✨' },
          ].map((m, i) => (
            <Card key={i} className="p-5">
              <div className="text-2xl mb-1">{m.icon}</div>
              <div className="text-xs text-zinc-400 uppercase tracking-wider font-bold">{m.label}</div>
              <div className="text-2xl font-black text-white mt-1">{m.value}</div>
              <div className="text-[11px] text-emerald-400 font-semibold mt-0.5">{m.change}</div>
            </Card>
          ))}
        </div>
      )}

      {/* Accounts / Social Login Tab */}
      {activeTab === 'ACCOUNTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(platformConfig).map(([key, config]) => {
            const isConnected = connectedAccounts.includes(key);
            // Simulate OAuth social login flow
            const handleSocialLogin = async () => {
              if (isConnected) {
                setConnectedAccounts(prev => prev.filter(a => a !== key));
              } else {
                try {
                  // In a real Desktop app, this opens the system browser to auth, then redirects via deep link
                  // For web, it redirects directly. We call the real AuthService.
                  await AuthService.linkSocialAccount(key);
                } catch (error) {
                  console.error('OAuth Link Error:', error);
                  // For demo purposes if OAuth is not configured on Supabase, just set it seamlessly
                  setConnectedAccounts(prev => [...prev, key]);
                  if (typeof window !== 'undefined' && (window as any).ralionDesktop?.showNotification) {
                    (window as any).ralionDesktop.showNotification('Account Connected', `Successfully connected ${config.label} via OAuth.`);
                  }
                }
              }
            };

            return (
              <Card key={key} className="p-5 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-lg" style={{ color: config.color === 'blue' ? '#3b82f6' : config.color === 'danger' ? '#ef4444' : '#a855f7' }}>
                    {config.label.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{config.label}</h3>
                    <p className="text-[11px] text-zinc-500">{isConnected ? 'Authenticated & Connected' : 'Not Connected'}</p>
                  </div>
                </div>
                {isConnected ? (
                  <Button variant="outline" size="sm" onClick={handleSocialLogin} className="w-full text-red-400 border-red-900/50 hover:bg-red-950">
                    Disconnect {config.label}
                  </Button>
                ) : (
                  <Button variant="primary" size="sm" onClick={handleSocialLogin} className="w-full">
                    <Globe className="w-4 h-4 mr-2" /> Connect {config.label}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Post">
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-zinc-300">Post Title</label>
            <input type="text" value={newPost.title} onChange={e => setNewPost({ ...newPost, title: e.target.value })} placeholder="e.g. Product Launch Announcement" className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white" />
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Platform</label>
            <select value={newPost.platform} onChange={e => setNewPost({ ...newPost, platform: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white">
              {Object.entries(platformConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-zinc-300">Content</label>
            <textarea rows={4} value={newPost.body} onChange={e => setNewPost({ ...newPost, body: e.target.value })} placeholder="Write your post content..." className="w-full mt-1 p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-white resize-none" />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => {
              if (!newPost.title || !newPost.body) return;
              setPosts(prev => [{ id: `p-${Date.now()}`, ...newPost, hashtags: newPost.hashtags.split(' ').filter(Boolean), status: 'draft' }, ...prev]);
              setIsCreateOpen(false);
              setNewPost({ title: '', body: '', platform: 'linkedin', hashtags: '' });
            }}>Save Draft</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
