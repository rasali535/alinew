// Enterprise Product Architecture for Ras Ali Labs Ecosystem
// Brand Hierarchy:
// RAS ALI LABS — Building intelligent business operating systems
// RALION OS — Empowered to Prosper | Your AI Business Operating System.
// MARI AI — Your AI Business Growth Partner

export const productsData = [
  {
    id: 'ralion',
    slug: 'ralion',
    name: 'Ralion OS',
    tagline: 'Empowered to Prosper',
    category: 'Enterprise AI Business Operating System',
    status: 'Available',
    statusBadge: 'Flagship Platform',
    badgeColor: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    philosophy: 'Empowered to Prosper — intelligent operating systems engineered to eliminate friction and power the next generation of companies.',
    description: 'An AI Business Operating System that brings business operations, customers, growth, social intelligence, automation, analytics and AI assistance into one intelligent workspace.',
    longDescription: `Ralion OS is the flagship AI Business Operating System developed by Ras Ali Labs. Built with bank-grade multi-tenant security and row-level isolation, Ralion unifies customer relationship management (CRM), deal pipelines, growth campaigns, AI creative generation (FLUX & CogVideoX), multi-channel social publishing, and Mari AI assistance into one seamless command center.`,
    icon: 'Cpu',
    appUrl: '/ralion',
    accentColor: '#D4AF37',
    cta: {
      primary: { text: 'Start Ralion Free', href: '/ralion/register' },
      secondary: { text: 'Book Enterprise Demo', href: '/request-demo' },
      login: { text: 'Login', href: '/ralion/login' },
      launch: { text: 'Launch Ralion OS', href: '/ralion/dashboard' }
    },
    seo: {
      title: 'Ralion OS — Empowered to Prosper | AI Business Operating System',
      description: 'Run your business with Ralion OS. Unified CRM, Mari AI growth partner, automated social intelligence, creative studio, and sovereign enterprise security.'
    },
    hero: {
      title: 'RALION OS',
      tagline: 'Empowered to Prosper',
      subtitle: 'Your AI Business Operating System. Unifying operations, customers, growth, social intelligence, and AI decision-making.',
      stats: [
        { label: 'Platform Availability', value: '99.99%' },
        { label: 'Closed-Loop Growth', value: 'Autonomous' },
        { label: 'Industry Vertical OS', value: '5 Suites' },
        { label: 'Data Security', value: 'Row-Level Isolation' }
      ]
    },
    features: [
      {
        id: 'business-ops',
        category: 'Business Operations',
        title: 'Unified Operational Workspace',
        description: 'Manage customers, deal pipelines, tasks, documents, billing, and operational reporting in a single interface.',
        items: ['Customer CRM & Deals', 'Task & Project Boards', 'Encrypted Document Vault', 'Automated Invoicing', 'Executive Analytics']
      },
      {
        id: 'ai-growth-partner',
        category: 'Mari AI Growth Partner',
        title: 'Mari AI Reasoning Engine',
        description: 'Your embedded executive business partner that analyzes pipeline signals, formulates growth strategies, and directs creatives.',
        items: ['Strategic Business Intelligence', 'Pipeline Forecasting', 'Market Research & Competitor Briefs', 'Automated Campaign Direction']
      },
      {
        id: 'growth-studio',
        category: 'Growth Studio',
        title: 'AI Creative & Campaign Generation',
        description: 'Studio-grade commercial poster generation with FLUX and video creative rendering with CogVideoX.',
        items: ['FLUX Commercial Poster AI', 'CogVideoX 6-Second Video Reels', 'Multi-Channel Campaign Briefs', 'Brand Voice Alignment']
      },
      {
        id: 'social-intelligence',
        category: 'Social Intelligence',
        title: 'Social Composer & Publishing',
        description: 'Multi-channel social publishing, automated scheduling queues, and unified cross-platform engagement tracking.',
        items: ['Facebook & Instagram Publishing', 'LinkedIn & X Content Queues', 'Unified Social Inbox', 'Performance Telemetry']
      },
      {
        id: 'industry-solutions',
        category: 'Industry Solutions',
        title: 'Specialized Industry OS',
        description: 'Purpose-built operating systems tailored for high-trust sectors across the SADC corridor.',
        items: ['Funeral OS', 'Logistics OS', 'Healthcare OS', 'Trade OS', 'Government OS']
      }
    ],
    industryOS: [
      {
        id: 'funeral-os',
        name: 'Funeral OS',
        subtitle: 'Mortuary & Policyholder Management',
        description: 'End-to-end mortuary intake, deceased case tracking, family relations, policyholder registers, and automated client notifications.',
        icon: 'Building2',
        href: '/industries#funeral'
      },
      {
        id: 'logistics-os',
        name: 'Logistics OS',
        subtitle: 'Fleet Telemetry & SADC Corridors',
        description: 'Cross-border fleet management, real-time vehicle telemetry, digital waybills, customs clearance, and border workflow automation.',
        icon: 'Truck',
        href: '/industries#logistics'
      },
      {
        id: 'health-os',
        name: 'Healthcare OS',
        subtitle: 'Clinical Practice & Patient Records',
        description: 'Manage patient case records, doctor appointments, consultation histories, electronic prescriptions, and medical billing.',
        icon: 'Activity',
        href: '/industries#healthcare'
      },
      {
        id: 'trade-os',
        name: 'Trade OS',
        subtitle: 'B2B SADC Trade & Procurement',
        description: 'Cross-border B2B procurement network connecting verified suppliers, buyers, and logistics providers with trade finance tracking.',
        icon: 'Globe',
        href: '/industries#trade'
      },
      {
        id: 'government-os',
        name: 'Government OS',
        subtitle: 'Sovereign Digital Public Infrastructure',
        description: 'Air-gapped data sovereignty, regulatory audit logging, citizen registry automation, and inter-departmental record exchange.',
        icon: 'Building2',
        href: '/industries#government'
      }
    ]
  },
  {
    id: 'ralion-mari-ai',
    slug: 'ralion-mari-ai',
    name: 'Mari AI',
    tagline: 'Your AI Business Growth Partner',
    category: 'Embedded AI Intelligence / Growth Partner',
    status: 'Available',
    statusBadge: 'Core Flagship AI',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    philosophy: 'Mari AI does not merely answer questions. Mari analyzes your business reality, discovers opportunities, and formulates strategies that drive revenue.',
    description: 'An embedded executive AI growth partner that works within your tenant-scoped business context to deliver strategic insights, market research, and campaign direction.',
    longDescription: `Mari AI is the flagship reasoning engine inside Ralion OS. Designed as an executive growth partner rather than a generic chatbot, Mari accesses your organization's permission-bounded business context to perform deep pipeline analysis, generate market research briefs, identify dormant revenue opportunities, and orchestrate automated creative campaigns.`,
    icon: 'Bot',
    appUrl: '/ralion/mari-ai',
    accentColor: '#A855F7',
    cta: {
      primary: { text: 'Meet Mari AI', href: '/ralion/register' },
      secondary: { text: 'Book Demo', href: '/request-demo' },
      login: { text: 'Login', href: '/ralion/login' },
      launch: { text: 'Launch Mari AI', href: '/ralion/mari-ai' }
    },
    seo: {
      title: 'Mari AI — Your AI Business Growth Partner | Ralion OS',
      description: 'Experience Mari AI. Executive business intelligence, strategic growth planning, automated creative direction, and closed-loop performance learning.'
    },
    hero: {
      title: 'Mari AI',
      tagline: 'Your AI Business Growth Partner',
      subtitle: 'Embedded strategic intelligence that understands your pipeline, customers, and market opportunities.',
      stats: [
        { label: 'Strategic Reasoning', value: 'Autonomous' },
        { label: 'Knowledge Scope', value: 'Tenant Isolated' },
        { label: 'Campaign Direction', value: 'Closed-Loop' },
        { label: 'Response Latency', value: '< 800ms' }
      ]
    },
    features: [
      {
        id: 'strategic-advisor',
        title: 'Executive Strategic Recommendations',
        description: 'Proactive analysis of your sales pipeline, customer conversion rates, and revenue trends with actionable growth steps.',
        icon: 'Bot'
      },
      {
        id: 'market-research',
        title: 'Automated Market & Competitor Intelligence',
        description: 'Comprehensive industry research briefs analyzing market positioning, pricing benchmarks, and buyer sentiment.',
        icon: 'Sparkles'
      },
      {
        id: 'creative-orchestration',
        title: 'Campaign & Creative Direction',
        description: 'Directs Growth Studio to formulate copy, commercial poster prompts (FLUX), and video concepts (CogVideoX).',
        icon: 'TrendingUp'
      },
      {
        id: 'closed-loop-learning',
        title: 'Continuous Performance Learning',
        description: 'Analyzes engagement and lead conversions from published social campaigns to refine future recommendations.',
        icon: 'Activity'
      }
    ]
  },
  {
    id: 'ralion-crm',
    slug: 'ralion-crm',
    name: 'Ralion CRM',
    tagline: 'Customer & Pipeline Intelligence',
    category: 'Customer Intelligence / Pipeline Management',
    status: 'Available',
    statusBadge: 'Core Workspace Suite',
    badgeColor: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    philosophy: 'Ralion CRM connects customer memory directly to automated growth workflows and executive intelligence.',
    description: 'Unified customer records, dynamic deal pipelines, contextual interaction history, and predictive opportunity scoring.',
    longDescription: `Ralion CRM is the operational backbone of Ralion OS. It brings customer records, sales deals, interaction timelines, and document vaults together into a single predictive environment. Embedded with Mari AI, Ralion CRM scores deal velocity, automates client follow-ups, and surfaces high-value opportunities before they turn cold.`,
    icon: 'UserCheck',
    appUrl: '/ralion/crm',
    accentColor: '#D4AF37',
    cta: {
      primary: { text: 'Start Free CRM', href: '/ralion/register' },
      secondary: { text: 'Request Demo', href: '/request-demo' },
      login: { text: 'Login', href: '/ralion/login' },
      launch: { text: 'Launch Ralion CRM', href: '/ralion/crm' }
    },
    seo: {
      title: 'Ralion CRM — Customer & Pipeline Intelligence | Ralion OS',
      description: 'Accelerate deal closing with Ralion CRM. Contextual customer memory, dynamic pipelines, predictive opportunity scoring, and automated follow-ups.'
    },
    hero: {
      title: 'Ralion CRM',
      tagline: 'Customer & Pipeline Intelligence',
      subtitle: 'Predict opportunities, automate follow-ups, and manage relationships in a unified intelligence workspace.',
      stats: [
        { label: 'Pipeline Automation', value: 'Real-time' },
        { label: 'Deal Velocity', value: '+34%' },
        { label: 'Customer Memory', value: 'Tenant Vault' },
        { label: 'Lead Scoring', value: 'Predictive' }
      ]
    },
    features: [
      {
        id: 'customer-memory',
        title: 'Contextual Customer Memory',
        description: 'Unified client timelines logging all interactions, documents, deals, and notes with sub-second retrieval.',
        icon: 'Database'
      },
      {
        id: 'deal-pipeline',
        title: 'Dynamic Stage Progression',
        description: 'Visual Kanban pipeline with automated bottlenecks detection, stale deal warnings, and revenue forecasting.',
        icon: 'BarChart3'
      },
      {
        id: 'mari-sales-copilot',
        title: 'Mari AI Sales Co-Pilot',
        description: 'Drafts personalized email responses, prepares meeting backgrounders, and scores conversion probability.',
        icon: 'Bot'
      },
      {
        id: 'automated-triggers',
        title: 'Event-Driven Follow-ups',
        description: 'Automated reminders and tasks triggered by deal stage changes, contract signings, or customer milestones.',
        icon: 'Zap'
      }
    ]
  },
  {
    id: 'ralion-growth-intelligence',
    slug: 'ralion-growth-intelligence',
    name: 'Growth Studio & Social Intelligence',
    tagline: 'AI Creative Generation & Multi-Channel Publishing',
    category: 'Growth Studio / Social Intelligence',
    status: 'Available',
    statusBadge: 'Growth Powerhouse',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    philosophy: 'Connect marketing directly to sales revenue through AI creative production and autonomous multi-channel distribution.',
    description: 'Studio-grade commercial poster generation (FLUX), AI video reels (CogVideoX), multi-channel social publishing, and unified analytics.',
    longDescription: `Ralion Growth Studio & Social Intelligence turns your brand into an autonomous content powerhouse. Working alongside Mari AI, the studio generates commercial-grade posters with FLUX, renders 6-second video reels with CogVideoX, and distributes scheduled content across Facebook, Instagram, LinkedIn, and X with complete engagement analytics.`,
    icon: 'TrendingUp',
    appUrl: '/ralion/growth',
    accentColor: '#10B981',
    cta: {
      primary: { text: 'Start Growth Studio', href: '/ralion/register' },
      secondary: { text: 'Request Demo', href: '/request-demo' },
      login: { text: 'Login', href: '/ralion/login' },
      launch: { text: 'Launch Growth Studio', href: '/ralion/growth' }
    },
    seo: {
      title: 'Ralion Growth Studio & Social Intelligence | Ralion OS',
      description: 'Scale your brand with AI creative generation (FLUX, CogVideoX), multi-channel social publishing, and closed-loop performance analytics.'
    },
    hero: {
      title: 'Growth Studio & Social Intelligence',
      tagline: 'AI Creative Studio & Multi-Channel Publishing',
      subtitle: 'Generate commercial posters and video reels with AI, schedule across social networks, and track closed-loop revenue growth.',
      stats: [
        { label: 'Creative Studio', value: 'FLUX + CogVideoX' },
        { label: 'Social Channels', value: 'Multi-Platform' },
        { label: 'Campaign Speed', value: 'Instant' },
        { label: 'Performance Feedback', value: 'Closed-Loop' }
      ]
    },
    features: [
      {
        id: 'flux-studio',
        title: 'FLUX Commercial Poster Studio',
        description: 'Generate high-resolution advertising graphics and promotional posters tailored to your exact brand aesthetics.',
        icon: 'Sparkles'
      },
      {
        id: 'cogvideox-reels',
        title: 'CogVideoX Video Creative Engine',
        description: 'Render commercial short-form video reels for Instagram Reels, TikTok, and YouTube Shorts in seconds.',
        icon: 'Activity'
      },
      {
        id: 'social-composer',
        title: 'Multi-Platform Social Composer',
        description: 'Compose, preview, and schedule content across Facebook, Instagram, LinkedIn, and X from a single queue.',
        icon: 'Share2'
      },
      {
        id: 'performance-analytics',
        title: 'Closed-Loop Engagement Telemetry',
        description: 'Real-time impression, click, and conversion analytics fed directly back into Mari AI for continuous optimization.',
        icon: 'BarChart3'
      }
    ]
  }
];

export const getProductBySlug = (slug) => {
  return productsData.find((p) => p.slug === slug) || productsData[0];
};
