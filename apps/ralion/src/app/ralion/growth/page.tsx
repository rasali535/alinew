'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge, Modal } from '@ralion/ui';
import { TrendingUp, Sparkles, Calendar, Share2, Plus, BarChart2, Send, Copy, Check, Megaphone, Globe } from 'lucide-react';

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

const samplePosts: ContentPost[] = [
  {
    id: 'p1',
    title: 'Empowered to Prosper — Ralion Launch',
    body: '🚀 Introducing Ralion, the AI-powered Business Operating System by Ras Ali Labs. Manage your customers, tasks, and operations from one intelligent platform. Empowered to Prosper. #Ralion #RasAliLabs #BusinessAI',
    platform: 'linkedin',
    hashtags: ['#Ralion', '#RasAliLabs', '#BusinessAI', '#Botswana'],
    status: 'published',
    engagement: { likes: 142, shares: 38, reach: 4200 }
  },
  {
    id: 'p2',
    title: 'Mari AI Feature Spotlight',
    body: '🤖 Meet Mari AI — your intelligent business consultant. Ask her anything: "How many customers did we gain this month?" "What tasks are overdue?" "Create my monthly report." — She handles it all. #MariAI #ArtificialIntelligence',
    platform: 'instagram',
    hashtags: ['#MariAI', '#AI', '#SmallBusiness'],
    status: 'scheduled',
    scheduledAt: '2026-07-30 09:00'
  },
  {
    id: 'p3',
    title: 'Logistics Module Preview',
    body: 'Track your fleet, manage shipments, and verify customs documents — all in one place with Ralion Logistics. 🚛 Built for transport companies across Southern Africa.',
    platform: 'facebook',
    hashtags: ['#Logistics', '#Botswana', '#Fleet'],
    status: 'draft'
  },
];

const sampleCampaigns: Campaign[] = [
  { id: 'c1', name: 'Ralion Product Launch 2026', platforms: ['linkedin', 'facebook', 'instagram'], startDate: 'Jul 1', endDate: 'Jul 31', status: 'active', postsCount: 12 },
  { id: 'c2', name: 'Mari AI Awareness Drive', platforms: ['linkedin', 'twitter'], startDate: 'Aug 1', endDate: 'Aug 14', status: 'planning', postsCount: 6 },
];

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
  const [activeTab, setActiveTab] = useState<'CONTENT' | 'CAMPAIGNS' | 'AI_STUDIO' | 'ANALYTICS'>('CONTENT');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', body: '', platform: 'linkedin', hashtags: '' });

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setTimeout(() => {
      setAiResult(`🎯 Campaign Strategy: "${aiPrompt}"\n\n📅 30-Day Content Calendar:\n\nWeek 1 — Awareness\n• LinkedIn: "Introducing our [service] — Built for the people of Botswana"\n• Instagram: Behind-the-scenes setup photos + team intro\n• Facebook: Boost post with BWP 150 targeting Gaborone businesses\n\nWeek 2 — Education\n• "5 Ways [service] saves your business time"\n• Client testimonial video (60s)\n• Mari AI tip: "Ask Mari to summarize your reports"\n\nWeek 3 — Proof\n• Case study: Show real results\n• "We served 50 clients this month — here's what they said"\n• Run LinkedIn poll: "What's your biggest business challenge?"\n\nWeek 4 — Conversion\n• "Limited spots available — Book your Ralion demo"\n• Special offer post with countdown\n• Direct CTA: "Start your free trial today"\n\n#Hashtags: #Ralion #RasAliLabs #Botswana #BusinessGrowth #EmpoweredToProsper #SME #MariAI`);
      setIsGenerating(false);
    }, 1200);
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">Ralion Growth</h1>
            <Badge variant="purple">AI Marketing Studio</Badge>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Social media management, AI content creation, and campaign intelligence.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Create Post
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
        {(['CONTENT', 'CAMPAIGNS', 'AI_STUDIO', 'ANALYTICS'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:text-white'}`}
          >
            {tab.replace('_', ' ')}
          </button>
        ))}
      </div>

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

      {/* Analytics Tab */}
      {activeTab === 'ANALYTICS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Reach', value: '42,800', change: '+18%', icon: '👁️' },
            { label: 'Engagements', value: '3,240', change: '+24%', icon: '❤️' },
            { label: 'Published Posts', value: '28', change: '+12', icon: '📝' },
            { label: 'Active Campaigns', value: '2', change: 'Running', icon: '🚀' },
            { label: 'Top Platform', value: 'LinkedIn', change: '62% of reach', icon: '💼' },
            { label: 'AI Posts Generated', value: '14', change: 'This month', icon: '✨' },
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
