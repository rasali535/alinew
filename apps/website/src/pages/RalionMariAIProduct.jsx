import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Brain,
  TrendingUp,
  ShieldCheck,
  Activity,
  Database,
  Megaphone,
  Share2,
  BriefcaseBusiness,
  Globe2,
  FileText,
  ListTodo,
  Users,
  MessageCircle,
  LockKeyhole,
  CheckCircle2,
  Zap,
  Network,
  Send,
  Mic,
  Volume2,
  BarChart3,
  Monitor,
  Layers,
  Radio,
  Compass
} from 'lucide-react';

const contextSources = [
  {
    icon: Users,
    title: 'Customers & CRM',
    description: 'Customer records, lifecycle stages, activity history, and communication context inside your Ralion CRM.',
    tag: 'CRM Context'
  },
  {
    icon: TrendingUp,
    title: 'Growth & Marketing',
    description: 'Active campaign objectives, target audience profiles, value propositions, and approved brand messaging.',
    tag: 'Growth Context'
  },
  {
    icon: Share2,
    title: 'Connected Social',
    description: 'Connected social channels, past publication performance, engagement insights, and audience response.',
    tag: 'Social Intelligence'
  },
  {
    icon: Globe2,
    title: 'Website Knowledge',
    description: 'Approved company web pages, service offerings, product catalogs, and public brand positioning.',
    tag: 'Knowledge Base'
  },
  {
    icon: FileText,
    title: 'Business Documents & SOPs',
    description: 'Uploaded company guidelines, pricing sheets, standard operating procedures, and strategic briefs.',
    tag: 'Document Store'
  },
  {
    icon: ListTodo,
    title: 'Operational Information',
    description: 'Workspace tasks, team workflows, project milestones, and connected business operations inside Ralion.',
    tag: 'Operations'
  }
];

const navigationSteps = [
  {
    id: 'mari',
    name: 'Mari AI Core',
    icon: Bot,
    voicePrompt: '“Hey Mari, what should we focus our marketing on this week?”',
    response: '“Based on your CRM leads and recent campaign performance, I recommend re-engaging stalled enterprise prospects.”',
    moduleBadge: 'Conversational Brain'
  },
  {
    id: 'growth',
    name: 'Growth Studio',
    icon: TrendingUp,
    voicePrompt: '“Mari, open Growth.”',
    response: '“Opening Growth Studio. Your draft campaigns and audience segments are loaded. Keep speaking while you review.”',
    moduleBadge: 'Active Module: Growth'
  },
  {
    id: 'crm',
    name: 'CRM Workspace',
    icon: Users,
    voicePrompt: '“Take me to CRM.”',
    response: '“Switching to CRM. Here are the 14 accounts flagged for follow-up today. Would you like me to summarize their notes?”',
    moduleBadge: 'Active Module: CRM'
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    icon: BarChart3,
    voicePrompt: '“Show me Reports.”',
    response: '“Here is your executive overview. Customer acquisition is up 22% this month. What metric would you like to inspect?”',
    moduleBadge: 'Active Module: Reports'
  }
];

const growthPillars = [
  {
    icon: Megaphone,
    title: 'Campaign Direction & Ideas',
    description: 'Brainstorm multi-channel campaign angles and promotional strategies grounded in your real products, pricing, and business strengths.'
  },
  {
    icon: Users,
    title: 'Audience & Market Thinking',
    description: 'Identify high-intent customer segments and tailor messaging to specific buyer personas based on historical customer interactions.'
  },
  {
    icon: Share2,
    title: 'Interpreting Social Performance',
    description: 'Understand which themes and creative formats delivered actual audience engagement across your connected social channels.'
  },
  {
    icon: Brain,
    title: 'Connecting Data to Decisions',
    description: 'Bridge customer signals, operational capacity, and marketing execution so growth decisions are backed by your business reality.'
  }
];

const publicQuestions = [
  'What does Ralion do?',
  'How does Mari use my business context?',
  'Can I talk to Mari with my voice?',
  'Is my private company data secure?'
];

const answerPublicQuestion = (question) => {
  const normalized = question.toLowerCase();

  if (normalized.includes('voice') || normalized.includes('talk') || normalized.includes('speak')) {
    return 'Yes. Mari supports natural voice conversations across Ralion. You can speak naturally, interrupt fluidly, navigate between workspaces by voice, and enable hands-free wake (“Hey Mari”) on supported devices with active microphone permission.';
  }

  if (normalized.includes('context') || normalized.includes('data') || normalized.includes('know')) {
    return 'Mari works from the verified business context already inside your Ralion workspace — such as your company profile, CRM accounts, growth campaigns, connected social accounts, and uploaded documents. She understands your business instead of starting every session from zero.';
  }

  if (normalized.includes('secure') || normalized.includes('safe') || normalized.includes('privacy')) {
    return 'Mari is strictly permission-bounded within your Ralion tenant. She only has access to business information and workspace tools approved for your organization. Furthermore, Mari operates under a human-in-control model: she assists and navigates, but you retain authorization over important business actions.';
  }

  return 'Ralion OS is a connected business operating system for customer work, growth, social activity, and operations. Mari is the AI intelligence inside it, helping you understand your business context, navigate your workspace by text or voice, and turn data into useful decisions.';
};

const RalionMariAIProduct = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [question, setQuestion] = useState('How does Mari use my business context?');
  const [submittedQuestion, setSubmittedQuestion] = useState('How does Mari use my business context?');

  const publicAnswer = useMemo(
    () => answerPublicQuestion(submittedQuestion),
    [submittedQuestion]
  );

  const submitQuestion = (event) => {
    event?.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) return;
    setSubmittedQuestion(nextQuestion);
  };

  const selectQuestion = (value) => {
    setQuestion(value);
    setSubmittedQuestion(value);
  };

  const currentNav = navigationSteps[activeStep];
  const CurrentIcon = currentNav.icon;

  return (
    <div className="min-h-screen bg-[#070b14] text-white pt-24 overflow-hidden">
      <SEO
        title="Mari AI — The AI Intelligence Inside Ralion OS | Ras Ali Labs"
        description="Meet Mari AI, the intelligence inside Ralion OS. Understand business context, talk naturally with voice, navigate workspaces hands-free, and turn business data into decisions."
        canonical="https://rasalilabs.com/mari-ai"
      />

      {/* 1. HERO SECTION */}
      <section className="relative px-6 lg:px-12 pt-16 pb-24 border-b border-white/10">
        {/* Ambient lighting */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-purple-600/20 rounded-full blur-[180px]"></div>
          <div className="absolute top-20 right-[15%] w-80 h-80 bg-brand-gold/10 rounded-full blur-[140px]"></div>
          <div className="absolute bottom-10 left-[10%] w-72 h-72 bg-blue-600/10 rounded-full blur-[140px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-200 text-xs font-bold uppercase tracking-[0.2em] mb-6">
              <Bot size={14} className="text-purple-300" /> Meet Mari AI
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6">
              The intelligence inside <span className="bg-gradient-to-r from-purple-300 via-white to-brand-gold bg-clip-text text-transparent">Ralion OS.</span>
            </h1>

            <p className="text-white/75 text-base md:text-xl max-w-3xl mx-auto leading-relaxed mb-10">
              Mari is the AI intelligence inside Ralion OS that understands your business, works across your workspace, speaks with you, helps you navigate Ralion, and turns business data into useful decisions.
            </p>

            <div className="flex flex-wrap justify-center items-center gap-4">
              <a
                href="/ralion"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-indigo-600 to-purple-600 text-white font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-purple-950/50 flex items-center gap-2"
              >
                Start with Ralion OS <ArrowRight size={17} />
              </a>
              <a
                href="#one-brain"
                className="px-7 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all flex items-center gap-2"
              >
                Explore Mari <Sparkles size={15} className="text-brand-gold" />
              </a>
            </div>

            <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/50">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-400" /> Web & Desktop
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-400" /> Natural Voice
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-purple-400" /> Business-Aware
              </span>
            </div>
          </div>

          {/* Living Intelligence Visual Showcase */}
          <div className="max-w-5xl mx-auto rounded-[2.5rem] border border-white/15 bg-white/[0.03] backdrop-blur-2xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/60 to-transparent"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.25em] text-purple-300 font-bold mb-1">
                  Unified Business Intelligence
                </div>
                <div className="text-base md:text-lg text-white font-bold">
                  One conversation. One business brain.
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Voice & Text Synchronized</span>
              </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Context list */}
              <div className="lg:col-span-4 space-y-3">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Verified Context Sources</div>
                {[
                  { name: 'Business Profile & Goals', icon: Database, desc: 'Identity, offers, brand guidelines' },
                  { name: 'CRM & Customer Activity', icon: Users, desc: 'Lead history, interactions, deals' },
                  { name: 'Growth & Social Channels', icon: TrendingUp, desc: 'Campaign performance & content' },
                  { name: 'Documents & SOPs', icon: FileText, desc: 'Approved operating materials' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.name} className="p-3 rounded-2xl bg-black/30 border border-white/5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center shrink-0">
                        <Icon size={16} className="text-purple-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        <div className="text-[10px] text-white/45 truncate">{item.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Central Pulsating Orb */}
              <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-6">
                <div className="relative w-44 h-44 md:w-52 md:h-52 rounded-full border-2 border-purple-400/40 bg-gradient-to-tr from-purple-600/30 via-violet-900/25 to-black/80 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(168,85,247,0.35)]">
                  <div className="absolute inset-2 rounded-full border border-white/10 animate-pulse"></div>
                  <Bot size={54} className="text-white relative z-10" />
                  <span className="text-sm font-black tracking-widest text-purple-200 mt-2 uppercase">Mari AI</span>
                  <span className="text-[9px] text-purple-300/70 tracking-wider uppercase font-semibold">Intelligence Core</span>
                </div>

                {/* Voice status pill */}
                <div className="mt-4 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/60 border border-purple-400/30 shadow-lg">
                  <Volume2 size={13} className="text-purple-300" />
                  <div className="flex items-center gap-0.5 h-3 px-1">
                    <span className="w-0.5 h-2 bg-purple-400 animate-pulse"></span>
                    <span className="w-0.5 h-3.5 bg-purple-300 animate-pulse [animation-delay:150ms]"></span>
                    <span className="w-0.5 h-1.5 bg-purple-400 animate-pulse [animation-delay:300ms]"></span>
                    <span className="w-0.5 h-3 bg-purple-200 animate-pulse [animation-delay:75ms]"></span>
                    <span className="w-0.5 h-2 bg-purple-300 animate-pulse [animation-delay:200ms]"></span>
                  </div>
                  <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider">Mari Voice Active</span>
                </div>
              </div>

              {/* Action and navigation output */}
              <div className="lg:col-span-4 space-y-3">
                <div className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2">Connected Navigation</div>
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/25 space-y-2">
                  <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                    <Mic size={14} /> Voice Command
                  </div>
                  <p className="text-sm font-semibold text-white">“Hey Mari, open Growth.”</p>
                  <div className="text-[11px] text-emerald-300 flex items-center gap-1.5 pt-1">
                    <span>→</span>
                    <span>Navigating to Growth Studio</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-1.5">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-white/40">Persistent Session</div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Voice conversations continue without interruption as you switch between Ralion modules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ONE BUSINESS BRAIN */}
      <section id="one-brain" className="py-24 px-6 lg:px-12 bg-[#090f1d] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-[0.2em]">
                <Brain size={15} /> Unified Intelligence
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                One conversation. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-brand-gold">
                  One business brain.
                </span>
              </h2>

              <p className="text-white/75 text-base md:text-lg leading-relaxed">
                Mari is no longer a separate generic chat window. Ask Mari by text or voice and she works from the same understanding of your business, customers, marketing, social activity, and operational context.
              </p>

              <div className="space-y-4 pt-2">
                {[
                  {
                    title: 'Shared memory across text and voice',
                    desc: 'Type a question in the morning, follow up with voice while reviewing a dashboard in the afternoon. Mari retains the same business understanding.'
                  },
                  {
                    title: 'Works with your verified context',
                    desc: 'Mari draws on the information connected to your workspace rather than answering in isolated generic statements.'
                  },
                  {
                    title: 'No context reset when switching modes',
                    desc: 'Seamlessly shift between keyboard input and natural voice without needing to re-explain your company background.'
                  }
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3">
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-1" />
                    <div>
                      <div className="text-sm font-bold text-white">{item.title}</div>
                      <div className="text-xs text-white/60 leading-relaxed mt-0.5">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-white/15 bg-[#0e1628] p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                  <div className="text-xs font-bold uppercase tracking-wider text-purple-300">Continuous Context Stream</div>
                  <div className="text-[10px] text-white/40">Shared Intelligence State</div>
                </div>

                <div className="space-y-4">
                  {/* Typed input turn */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-white/40">Mode: Typed Text</span>
                      <span className="text-[10px] text-white/30">10:14 AM</span>
                    </div>
                    <p className="text-xs text-white/85">“Mari, list our top three pipeline deals in CRM needing follow-up.”</p>
                  </div>

                  {/* Mari answer */}
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-purple-300">Mari Response</span>
                      <span className="text-[10px] text-purple-300/60">Grounded in CRM</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      Identified 3 priority accounts: Apex Logistics, Lumina Media, and Kalahari Retail. All three requested revised proposals this week.
                    </p>
                  </div>

                  {/* Voice follow-up turn */}
                  <div className="p-4 rounded-2xl bg-indigo-500/15 border border-indigo-400/30">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-indigo-300 flex items-center gap-1.5">
                        <Volume2 size={12} /> Mode: Spoken Voice
                      </span>
                      <span className="text-[10px] text-indigo-300/60">2:45 PM • Same Session</span>
                    </div>
                    <p className="text-xs text-white/90">“What did we promise Lumina Media on their proposal?”</p>
                  </div>

                  {/* Mari voice answer */}
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/20">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-purple-300">Mari Voice Answer</span>
                      <span className="text-[10px] text-emerald-400">Context Connected</span>
                    </div>
                    <p className="text-xs text-white/80 leading-relaxed">
                      “You agreed to deliver the video creative brief by Friday with milestone pricing for three commercial cuts.”
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. TALK TO MARI (VOICE & HEY MARI) */}
      <section className="py-24 px-6 lg:px-12 bg-[#070b14] border-b border-white/10 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Mic size={14} /> Mari Voice
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Talk to your business.
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Ask Mari what’s happening, what needs attention, or where to focus next — without stopping to type.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {[
              {
                icon: Mic,
                title: 'Talk naturally',
                desc: 'Speak in natural language. Mari listens, reasons over your business context, and responds by voice.'
              },
              {
                icon: Radio,
                title: 'Natural interruption',
                desc: 'Jump in or steer the conversation at any moment while Mari is speaking, just like a real dialogue.'
              },
              {
                icon: Zap,
                title: '“Hey Mari” hands-free wake',
                desc: 'Enable hands-free wake to start speaking without touching the keyboard. Active when enabled with mic permissions.'
              },
              {
                icon: Compass,
                title: 'Move while you talk',
                desc: 'Switch workspaces and explore your dashboards without losing your active voice session.'
              }
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 hover:border-purple-400/30 transition-all hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center mb-5">
                    <Icon size={22} className="text-purple-300" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Hands-Free Wake Callout */}
          <div className="rounded-3xl border border-purple-400/20 bg-gradient-to-r from-purple-500/10 via-indigo-900/10 to-transparent p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Mic size={15} /> Hands-free access when enabled
              </div>
              <h4 className="text-lg md:text-xl font-bold text-white">
                “Enable Hey Mari and start a conversation with your voice while you work.”
              </h4>
              <p className="text-white/60 text-xs leading-relaxed">
                Hands-free wake requires enabled wake mode and device microphone permission in your active browser or desktop window. Mari does not listen when the app is closed or when permissions are disabled.
              </p>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-black/40 border border-white/10 text-xs font-semibold text-white/90 shrink-0">
              Voice shortcut: <span className="text-brand-gold font-mono ml-1">Ctrl + Space</span> or <span className="text-purple-300 font-mono ml-1">“Hey Mari”</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. BUSINESS-AWARE INTELLIGENCE */}
      <section className="py-24 px-6 lg:px-12 bg-[#090f1d] border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-4">
              <Database size={14} /> Context-Grounded Reasoning
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Mari understands your business context instead of starting every conversation from zero.
            </h2>
            <p className="text-white/65 text-base md:text-lg leading-relaxed">
              Generic chatbots guess. Mari works from the verified information, customer interactions, and growth plans connected inside your Ralion workspace.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contextSources.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 hover:border-purple-400/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center">
                        <Icon size={20} className="text-purple-300" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40 px-2.5 py-1 rounded-full bg-black/30 border border-white/5">
                        {card.tag}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white mb-2">{card.title}</h3>
                    <p className="text-white/60 text-xs leading-relaxed">{card.description}</p>
                  </div>
                  <div className="pt-4 mt-4 border-t border-white/5 flex items-center gap-1.5 text-[11px] text-purple-300/80 font-medium">
                    <CheckCircle2 size={13} className="text-emerald-400" /> Workspace Verified
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. MOVE THROUGH RALION BY VOICE (PERSISTENT VOICE & NAVIGATION) */}
      <section className="py-24 px-6 lg:px-12 bg-[#070b14] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Compass size={14} /> Voice Navigation
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Move through Ralion by voice.
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Ask Mari to take you where you need to go and keep the conversation going as you move through Ralion.
            </p>
          </div>

          {/* Interactive Flow Stepper: Mari -> Growth -> CRM -> Reports */}
          <div className="rounded-[2.5rem] border border-white/15 bg-[#0e1424] p-6 md:p-10 shadow-2xl overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-purple-300 font-bold mb-1">Persistent Voice Session Flow</div>
                <div className="text-sm font-semibold text-white/80">Click any module to simulate voice navigation:</div>
              </div>
              {/* Active Voice Wave Pill */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/30 text-purple-200 text-xs font-bold">
                <Volume2 size={14} className="animate-pulse text-purple-300" />
                <span>Voice Session Persists Across Navigation</span>
              </div>
            </div>

            {/* Stepper Tabs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              {navigationSteps.map((step, idx) => {
                const StepIcon = step.icon;
                const isSelected = activeStep === idx;
                return (
                  <button
                    key={step.id}
                    onClick={() => setActiveStep(idx)}
                    className={`p-4 rounded-2xl border text-left transition-all relative ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-900/30'
                        : 'bg-black/30 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <StepIcon size={18} className={isSelected ? 'text-purple-300' : 'text-white/40'} />
                      <span className="text-[10px] font-mono text-white/40">0{idx + 1}</span>
                    </div>
                    <div className="text-xs font-bold text-white">{step.name}</div>
                    {isSelected && (
                      <span className="absolute bottom-0 inset-x-4 h-0.5 bg-purple-400"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Simulated Live Voice Interaction Box */}
            <div className="p-6 rounded-3xl bg-black/40 border border-white/10 space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 font-bold text-white">
                  <CurrentIcon size={16} className="text-purple-300" />
                  <span>{currentNav.name}</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-400/20">
                  {currentNav.moduleBadge}
                </span>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center gap-3">
                  <Mic size={16} className="text-purple-300 shrink-0" />
                  <span className="text-xs md:text-sm font-semibold text-purple-100">
                    {currentNav.voicePrompt}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Mari Voice Response</div>
                  <p className="text-xs md:text-sm text-white/85 leading-relaxed">
                    {currentNav.response}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Example Command Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              ['“Mari, open Growth.”', 'Navigates to Growth Studio'],
              ['“Take me to CRM.”', 'Opens Accounts & Deals'],
              ['“Show me Billing.”', 'Navigates to Subscription & Credits'],
              ['“Open Tasks.”', 'Opens Workspace Task Board']
            ].map(([cmd, desc]) => (
              <div key={cmd} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="text-xs font-bold text-purple-200 mb-1">{cmd}</div>
                <div className="text-[10px] text-white/50">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. BUSINESS GROWTH & MARKETING INTELLIGENCE */}
      <section className="py-24 px-6 lg:px-12 bg-[#090f1d] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-[0.2em]">
                <TrendingUp size={15} /> Growth Intelligence
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
                Strategic marketing and growth decisions — grounded in your real business.
              </h2>

              <p className="text-white/75 text-base leading-relaxed">
                Avoid generic “AI writes posts” tools. Ralion’s differentiation is that Mari works from the business context already inside Ralion, turning customer knowledge into strategic marketing decisions.
              </p>

              <div className="space-y-4 pt-2">
                {growthPillars.map((pillar) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={pillar.title} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-400/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon size={16} className="text-purple-300" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{pillar.title}</div>
                        <div className="text-xs text-white/60 leading-relaxed mt-0.5">{pillar.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl border border-white/15 bg-[#0e1628] p-6 md:p-8 shadow-2xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="text-xs font-bold text-white">Campaign Reasoning Example</div>
                  <span className="text-[10px] text-brand-gold uppercase font-bold">Growth Studio</span>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-white/40">Business Strategy Input</div>
                  <p className="text-xs text-white/80">
                    “Mari, review our last three campaigns and identify which offer angle resonated most with high-value customers.”
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-400/25 space-y-2">
                  <div className="text-[10px] uppercase font-bold text-purple-300">Mari Growth Recommendation</div>
                  <p className="text-xs text-white/80 leading-relaxed">
                    “Your video production retainer campaign outperformed single-project pitches by 3.2x in qualified lead volume. Based on your current CRM deals, focusing your next campaign on corporate monthly packages will yield the strongest conversion.”
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-between">
                  <span className="text-xs text-emerald-300 font-semibold">Ready to draft creative direction?</span>
                  <span className="text-[10px] text-white/60">Human sign-off required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. YOU STAY IN CONTROL (SAFE ACTION BOUNDARIES & PUBLIC DEMO) */}
      <section className="py-24 px-6 lg:px-12 bg-[#070b14] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} /> Safe Governance & Boundaries
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              “Mari helps you decide and navigate. You stay in control of important business actions.”
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Clear public safety boundaries: Mari assists, reasons, and navigates — but never takes irreversible business actions without your explicit approval.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-16">
            {/* What Mari Does */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                <CheckCircle2 size={18} className="text-purple-400" />
                <span>What Mari Does</span>
              </div>
              <ul className="space-y-3 text-xs text-white/75 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  Answers questions grounded in your verified business context.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  Reasons across customer data, marketing materials, and operations.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  Provides marketing direction, campaign angles, and strategic growth recommendations.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 font-bold">•</span>
                  Navigates approved areas of Ralion by voice while keeping the session active.
                </li>
              </ul>
            </div>

            {/* Human-Controlled Boundaries */}
            <div className="rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.03] p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                <LockKeyhole size={18} className="text-emerald-400" />
                <span>Strict Human Authorization</span>
              </div>
              <ul className="space-y-3 text-xs text-white/75 leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <strong>No autonomous publishing:</strong> Mari does not publish social posts or public content without your review.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <strong>No unapproved sending:</strong> Mari does not dispatch emails, invoices, or customer messages autonomously.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <strong>No silent deletions:</strong> Critical records, customer contacts, and business assets cannot be erased by AI.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <strong>No unauthorized purchases:</strong> You retain complete control over all billing, credits, and financial transactions.
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Public Product Guide */}
          <div className="rounded-[2.5rem] border border-white/10 bg-[#0c1322] p-6 md:p-8 shadow-2xl">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 space-y-4">
                <div className="text-[10px] uppercase tracking-wider text-purple-300 font-bold">Public Explorer Preview</div>
                <h3 className="text-2xl font-bold text-white">Ask Mari about Ralion.</h3>
                <p className="text-xs text-white/60 leading-relaxed">
                  This preview showcases Mari’s conversational guidance regarding Ralion capabilities. It has no access to private customer tenants or confidential workspace records.
                </p>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 text-[11px] text-white/50 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                  <span>Public product documentation only • Zero tenant data exposed</span>
                </div>
              </div>

              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {publicQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => selectQuestion(q)}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/70 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-black/30 border border-white/5 space-y-3 min-h-[140px]">
                  <div className="text-[10px] uppercase font-bold text-white/40">Question: {submittedQuestion}</div>
                  <p className="text-xs text-white/85 leading-relaxed">
                    {publicAnswer}
                  </p>
                </div>

                <form onSubmit={submitQuestion} className="flex gap-2">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask about Mari and Ralion OS…"
                    className="flex-1 rounded-xl bg-black/30 border border-white/10 px-4 py-2.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <Send size={13} /> Ask
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA SECTION */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-b from-[#070b14] via-[#0d1222] to-[#070b14]">
        <div className="max-w-5xl mx-auto">
          <div className="rounded-[2.5rem] border border-white/15 bg-gradient-to-br from-purple-500/15 via-white/[0.02] to-brand-gold/10 p-8 md:p-14 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/20 blur-[130px] rounded-full pointer-events-none"></div>

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-400/25 text-purple-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} className="text-brand-gold" /> Elevate Your Operating System
              </div>

              <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Put Mari to work in your business.
              </h2>

              <p className="text-white/70 text-base md:text-lg leading-relaxed">
                Connect your business context, talk naturally with persistent voice, and turn daily operations into strategic growth.
              </p>

              <div className="flex flex-wrap justify-center items-center gap-4 pt-4">
                <a
                  href="/ralion"
                  className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/25 flex items-center gap-2"
                >
                  Start with Ralion OS <ArrowRight size={17} />
                </a>
                <Link
                  to="/products/ralion-os"
                  className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all flex items-center gap-2"
                >
                  Explore Ralion OS
                </Link>
              </div>

              <div className="pt-4 text-xs text-white/50 flex items-center justify-center gap-2">
                <Monitor size={14} className="text-purple-300" />
                <span>Use Mari across Ralion on web and desktop.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RalionMariAIProduct;
