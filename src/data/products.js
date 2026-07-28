// Data-driven Product Architecture for Ras Ali Labs Ecosystem
// Central repository for product metadata, features, pricing, and routing.

export const productsData = [
  {
    id: 'ralion',
    slug: 'ralion',
    name: 'Ralion',
    tagline: 'The Operating System for Enterprise Intelligence & Automation',
    category: 'Enterprise Platform / OS',
    status: 'Available',
    statusBadge: 'Featured Product',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Ralion is an intelligent enterprise operating system designed to unify business workflows, automated data pipelines, autonomous AI agents, and cross-system integrations into one powerful desktop & web interface.',
    longDescription: `Ralion bridges the gap between legacy enterprise systems, cloud workloads, and multi-agent AI automation. Built with modular micro-frontend architecture, high-speed PostgreSQL & pgvector backends, and multi-tenant role-based access control, Ralion powers modern high-growth enterprises to operate at maximum efficiency.`,
    icon: 'Cpu',
    appUrl: '/ralion',
    accentColor: '#D4AF37', // Brand Gold
    cta: {
      primary: { text: 'Launch Ralion', href: '/ralion' },
      secondary: { text: 'Start Free', href: '#pricing' },
      auth: { text: 'Login', href: '#auth' }
    },
    hero: {
      title: 'Next-Gen Enterprise Operating System',
      subtitle: 'Streamline operations, orchestrate AI agents, and execute multi-channel data workflows on a single unified platform.',
      stats: [
        { label: 'System Uptime', value: '99.99%' },
        { label: 'Workflow Execution Speed', value: '< 45ms' },
        { label: 'Active Micro-Modules', value: '40+' },
        { label: 'Security & Auth Compliance', value: 'Enterprise Grade' }
      ]
    },
    features: [
      {
        id: 'ai-orchestration',
        title: 'Autonomous Multi-Agent Orchestration',
        description: 'Deploy specialized AI agents for data extraction, document processing, customer routing, and autonomous task execution.',
        icon: 'Bot'
      },
      {
        id: 'unified-auth',
        title: 'Unified Supabase SSO Authentication',
        description: 'Single-sign-on access control across all Ras Ali Labs products with role-based policies and encrypted session keys.',
        icon: 'ShieldCheck'
      },
      {
        id: 'data-pipelines',
        title: 'Real-time Data Streaming & Storage',
        description: 'Instant data synchronization across web, mobile, and API endpoints backed by vector embeddings and low-latency storage.',
        icon: 'Database'
      },
      {
        id: 'modular-apps',
        title: 'Modular App Marketplace',
        description: 'Extend Ralion capabilities on demand with custom business plugins, USSD gateways, and automated reporting engines.',
        icon: 'Layers'
      },
      {
        id: 'analytics',
        title: 'Real-Time Operational Analytics',
        description: 'Interactive dashboard analytics, telemetry monitoring, and audit logging built into every subsystem.',
        icon: 'BarChart3'
      },
      {
        id: 'enterprise-security',
        title: 'Bank-Grade Security & Isolation',
        description: 'End-to-end encryption, tenant isolation, and strict regulatory compliance controls.',
        icon: 'Lock'
      }
    ],
    screenshots: [
      {
        id: 1,
        title: 'Ralion Executive Dashboard',
        caption: 'Central control room for live system metrics, agent activity, and real-time business telemetry.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
      },
      {
        id: 2,
        title: 'AI Multi-Agent Control Hub',
        caption: 'Orchestrate, monitor, and train specialized AI worker agents across departments.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
      },
      {
        id: 3,
        title: 'Workflow Automation Builder',
        caption: 'Visual workflow canvas for connecting USSD gateways, APIs, databases, and LLM prompts.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop'
      }
    ],
    pricing: [
      {
        name: 'Starter',
        price: 'Free',
        period: 'forever',
        description: 'Ideal for individual developers and small teams exploring Ralion.',
        features: [
          'Up to 3 Active Workspace Modules',
          'Single Admin User Account',
          '1,000 AI Agent Executions / mo',
          'Community Support & Documentation',
          'Standard Supabase Auth'
        ],
        ctaText: 'Start Free',
        popular: false
      },
      {
        name: 'Professional',
        price: '$49',
        period: 'per month',
        description: 'For growing enterprises requiring advanced automation and multi-agent capabilities.',
        features: [
          'Unlimited Active Workspace Modules',
          'Up to 15 Team Members',
          '50,000 AI Agent Executions / mo',
          'Priority 24/7 Technical Support',
          'Custom USSD & API Gateway Access',
          'Full Telemetry & Audit Logs'
        ],
        ctaText: 'Start 14-Day Free Trial',
        popular: true
      },
      {
        name: 'Enterprise',
        price: 'Custom',
        period: 'billed annually',
        description: 'Dedicated infrastructure, custom SLA, and tailored AI model fine-tuning.',
        features: [
          'Dedicated Private Cloud Instance',
          'Unlimited Team Seats & Roles',
          'Custom AI Agent Training & RAG',
          'Dedicated Success Manager & SLA',
          'On-Premise or Single-Tenant Deployment'
        ],
        ctaText: 'Contact Enterprise Sales',
        popular: false
      }
    ]
  },
  {
    id: 'mari-ai',
    slug: 'mari-ai',
    name: 'Mari AI',
    tagline: 'Next-Gen Conversational Intelligence & Workflow Automation',
    category: 'AI / Intelligent Agents',
    status: 'Beta',
    statusBadge: 'Public Beta',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Mari AI powers contextual customer interactions, voice & text synthesis, multi-lingual automated support, and deep reasoning across corporate channels.',
    longDescription: `Mari AI combines cutting-edge Gemini LLM architectures with pgvector knowledge retrieval to deliver accurate, contextual AI assistance. Integrated directly into Ras Ali Labs products, Mari AI automates complex customer service flows and enterprise knowledge retrieval.`,
    icon: 'Sparkles',
    appUrl: '/products/mari-ai',
    accentColor: '#a855f7',
    cta: {
      primary: { text: 'Explore Mari AI', href: '/products/mari-ai' },
      secondary: { text: 'Request Beta Access', href: '#contact' },
      auth: { text: 'Login', href: '#auth' }
    },
    hero: {
      title: 'Contextual AI for Modern Enterprises',
      subtitle: 'Instant semantic search, intelligent document extraction, and zero-latency multi-channel agent responses.',
      stats: [
        { label: 'Response Latency', value: '< 200ms' },
        { label: 'Language Models Supported', value: 'Multi-lingual' },
        { label: 'Accuracy Benchmark', value: '98.4%' },
        { label: 'Integration Setup', value: '5 Mins' }
      ]
    },
    features: [
      {
        id: 'semantic-rag',
        title: 'Retrieval Augmented Generation (RAG)',
        description: 'Connect internal knowledge bases, PDFs, and SQL schemas for hallucination-free AI answers.',
        icon: 'FileSearch'
      },
      {
        id: 'multi-channel',
        title: 'Multi-Channel Deployment',
        description: 'Deploy Mari AI on Web Chat, WhatsApp, USSD, and REST API endpoints effortlessly.',
        icon: 'MessageSquare'
      },
      {
        id: 'custom-prompts',
        title: 'Agent Persona Customization',
        description: 'Configure brand tone, strict safety guardrails, and custom tool invocations.',
        icon: 'Sliders'
      }
    ],
    pricing: [
      {
        name: 'Developer',
        price: 'Free',
        period: 'in beta',
        description: 'Explore Mari AI APIs and test prototype agent integrations.',
        features: [
          '5,000 Monthly Queries',
          'Standard RAG Pipeline',
          '1 Custom Agent Profile',
          'Community Forum Access'
        ],
        ctaText: 'Join Beta',
        popular: false
      },
      {
        name: 'Scale',
        price: '$79',
        period: 'per month',
        description: 'Production deployment for high-traffic customer platforms.',
        features: [
          '100,000 Monthly Queries',
          'Advanced Vector Embeddings',
          'Unlimited Agent Personas',
          'WhatsApp & USSD Gateway',
          'Custom Analytics & Logging'
        ],
        ctaText: 'Get Started',
        popular: true
      }
    ]
  },
  {
    id: 'tradegrid-africa',
    slug: 'tradegrid-africa',
    name: 'TradeGrid Africa',
    tagline: 'Cross-Border Supply Chain & Enterprise Trade Protocol',
    category: 'B2B Trade Platform',
    status: 'Coming Soon',
    statusBadge: 'Ecosystem Platform',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Empowering cross-border trade across the SADC corridor with automated supplier verification, real-time logistics tracking, and B2B trade financing gateways.',
    longDescription: `TradeGrid Africa is Ras Ali Labs flagship B2B enterprise platform, designed to solve liquidity, verification, and logistics orchestration across African trade hubs.`,
    icon: 'Globe',
    appUrl: '/products/tradegrid-africa',
    accentColor: '#3b82f6',
    cta: {
      primary: { text: 'Learn More', href: '/products/tradegrid-africa' },
      secondary: { text: 'Join Waitlist', href: '#contact' },
      auth: { text: 'Login', href: '#auth' }
    },
    hero: {
      title: 'Powering Sovereign African B2B Commerce',
      subtitle: 'Unified trade infrastructure connecting verified manufacturers, buyers, and logistics corridors.',
      stats: [
        { label: 'Target Trade Corridors', value: 'SADC Region' },
        { label: 'Supplier Verification Rate', value: '100% KYB' },
        { label: 'Settlement Security', value: 'Escrow Backed' },
        { label: 'Launch Timeline', value: 'Q4 2026' }
      ]
    },
    features: [
      {
        id: 'kyb-verification',
        title: 'AI Supplier KYB Verification',
        description: 'Automated corporate identity, registration, and creditworthiness scanning.',
        icon: 'CheckCircle2'
      },
      {
        id: 'smart-escrow',
        title: 'Smart Escrow & Trade Settlement',
        description: 'Multi-currency settlement mechanisms ensuring zero-loss cross-border transactions.',
        icon: 'Coins'
      },
      {
        id: 'logistics-viz',
        title: 'Corridor Logistics Tracking',
        description: 'Real-time telemetry and border delay forecasting across SADC transport routes.',
        icon: 'Truck'
      }
    ],
    pricing: [
      {
        name: 'Enterprise Participant',
        price: 'Custom',
        period: 'per trade volume',
        description: 'For verified buyers, exporters, and logistics operators.',
        features: [
          'Full Access to Verified Supplier Network',
          'Smart Escrow Protection',
          'Automated Compliance Documentation',
          'Dedicated Trade Officer'
        ],
        ctaText: 'Pre-Register Enterprise',
        popular: true
      }
    ]
  },
  {
    id: 'dfs-platform',
    slug: 'dfs-platform',
    name: 'DFS Platform',
    tagline: 'Digital Financial Services Infrastructure & USSD Gateway',
    category: 'Fintech & Telecom Gateway',
    status: 'Coming Soon',
    statusBadge: 'Fintech Infrastructure',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    description: 'High-throughput fintech middleware connecting USSD networks, mobile wallets, and banking APIs to web platforms and AI agents.',
    longDescription: `DFS Platform provides financial institution-grade USSD protocol bridging, mobile payment webhooks, and automated reconciliation for emerging markets.`,
    icon: 'CreditCard',
    appUrl: '/products/dfs-platform',
    accentColor: '#f59e0b',
    cta: {
      primary: { text: 'Explore DFS Platform', href: '/products/dfs-platform' },
      secondary: { text: 'Developer Docs', href: '/developers' },
      auth: { text: 'Login', href: '#auth' }
    },
    hero: {
      title: 'Bridging USSD, Telecoms & Modern Banking',
      subtitle: 'Ultra-low latency financial transaction routing and automated USSD session management.',
      stats: [
        { label: 'USSD Session Timeout', value: '< 2.5s' },
        { label: 'Transaction Concurrency', value: '10,000 TPS' },
        { label: 'Uptime Reliability', value: '99.999%' },
        { label: 'Supported Gateways', value: 'Orange, Mascom, BTC' }
      ]
    },
    features: [
      {
        id: 'ussd-web-sync',
        title: 'USSD-to-Web Protocol Bridge',
        description: 'Bi-directional state synchronization between feature phones and web dashboards.',
        icon: 'Smartphone'
      },
      {
        id: 'mobile-money',
        title: 'Unified Mobile Money API',
        description: 'Single integration layer for all major African mobile wallet operators.',
        icon: 'Wallet'
      },
      {
        id: 'ledger-compliance',
        title: 'Immutable Ledger Audit Trail',
        description: 'Bank-grade compliance tracking and instant settlement reconciliations.',
        icon: 'Receipt'
      }
    ],
    pricing: [
      {
        name: 'Fintech API Access',
        price: 'Tiered',
        period: 'per API call',
        description: 'High performance transaction gateway access for banks and financial institutions.',
        features: [
          'High Throughput USSD Sessions',
          'Webhooks & Live Event Streams',
          'Sandbox & Staging Environments',
          'Dedicated Security Audit Reports'
        ],
        ctaText: 'Request Developer Key',
        popular: true
      }
    ]
  }
];

export const getProductBySlug = (slug) => {
  return productsData.find((product) => product.slug.toLowerCase() === slug.toLowerCase()) || productsData[0];
};
