// Data-driven Product Architecture for Ras Ali Labs Ecosystem
// Central repository for product metadata, features, industry solutions, pricing, and routing.

export const productsData = [
  {
    id: 'ralion',
    slug: 'ralion',
    name: 'Ralion',
    tagline: 'AI-powered Business Operating System — Empowered to Prosper',
    category: 'Enterprise OS / Business Automation',
    status: 'Available',
    statusBadge: 'Featured OS',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Ralion is an AI-powered business operating system that manages customers, projects, documents, and core operations in one unified workspace backed by Mari AI reasoning.',
    longDescription: `Ralion bridges the gap between customer relationship management (CRM), project management, intelligent workflow automation, multi-agent AI execution, and secure document storage. Built with modular micro-frontend architecture, Supabase PostgreSQL, and bank-grade role-based access control, Ralion powers small businesses, high-growth enterprises, and government initiatives to operate at maximum efficiency.`,
    icon: 'Cpu',
    appUrl: '/ralion',
    accentColor: '#D4AF37', // Brand Gold
    cta: {
      primary: { text: 'Start Free', href: '#pricing' },
      secondary: { text: 'Download Desktop App', href: '/downloads' },
      login: { text: 'Login', href: '#auth' },
      launch: { text: 'Launch Ralion', href: '/ralion' }
    },
    seo: {
      title: 'Ralion | AI Business Operating System | Ras Ali Labs',
      description: 'Manage customers, projects, documents and business operations with Ralion powered by Mari AI.'
    },
    hero: {
      title: 'Ralion — AI-powered Business Operating System',
      tagline: 'Empowered to Prosper',
      subtitle: 'Streamline operations, automate CRM pipelines, orchestrate Mari AI agents, and manage enterprise projects on a single unified platform.',
      stats: [
        { label: 'System Uptime', value: '99.99%' },
        { label: 'Workflow Execution Speed', value: '< 45ms' },
        { label: 'Active Business Modules', value: '40+' },
        { label: 'Security & Auth Compliance', value: 'Enterprise Grade' }
      ]
    },
    features: [
      {
        id: 'business',
        title: 'Business Management',
        description: 'Complete core business management with customer CRM, deal pipelines, task tracking, and document vaults.',
        icon: 'Briefcase'
      },
      {
        id: 'social-media',
        title: 'Social Media Management',
        description: 'Automated content scheduling, cross-channel engagement tracking, and digital campaign analytics.',
        icon: 'Share2'
      },
      {
        id: 'growth',
        title: 'Growth Management',
        description: 'Revenue forecasting, conversion funnel optimization, and customer acquisition metrics.',
        icon: 'TrendingUp'
      },
      {
        id: 'logistics',
        title: 'Logistics Management',
        description: 'Cross-border cargo telemetry, fleet dispatch tracking, and border clearance documentation.',
        icon: 'Truck'
      },
      {
        id: 'health',
        title: 'Health Management',
        description: 'Patient consultations, health records, electronic prescriptions, and appointment scheduling.',
        icon: 'Activity'
      },
      {
        id: 'trade',
        title: 'Trade Management',
        description: 'B2B SADC trade orchestration, commodity pricing, customs compliance, and supplier portals.',
        icon: 'Globe'
      },
      {
        id: 'ai-assistants',
        title: 'AI Assistants',
        description: 'Specialized Mari AI reasoning agents for contextual decision support, document RAG, and voice synthesis.',
        icon: 'Bot'
      }
    ],
    solutions: [
      {
        id: 'small-business',
        name: 'Small Business',
        title: 'All-in-One Operating System for Growing Teams',
        description: 'Consolidate CRM, invoicing, project tracking, and customer communication into a single affordable workspace.',
        highlights: [
          'Unified Customer & Contact Database',
          'Automated Quotations & Invoice Tracking',
          'Built-in Mari AI Assistant',
          'Fast 5-Minute Onboarding Setup'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        title: 'High-Throughput Orchestration for Scaled Organizations',
        description: 'Multi-tenant infrastructure with custom RBAC roles, dedicated Supabase instances, and 24/7 priority support.',
        highlights: [
          'Dedicated PostgreSQL & pgvector Database',
          'Unlimited Team Seats & Micro-Modules',
          'Custom USSD & API Gateway Integration',
          'SLA Guarantee & Dedicated Account Manager'
        ]
      },
      {
        id: 'government',
        name: 'Government',
        title: 'Sovereign Digital Infrastructure & Compliance',
        description: 'On-premise or single-tenant cloud deployments meeting strict data sovereignty and regulatory standards.',
        highlights: [
          'Data Sovereignty & On-Premise Support',
          'Full Regulatory Audit Trail Logging',
          'Air-gapped & Secure Vault Enclaves',
          'Custom Departmental Integration Bridges'
        ]
      }
    ],
    screenshots: [
      {
        id: 1,
        title: 'Ralion Executive Dashboard',
        caption: 'Central control room for live business metrics, CRM pipelines, and real-time operational telemetry.',
        image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
      },
      {
        id: 2,
        title: 'Mari AI Multi-Agent Studio',
        caption: 'Orchestrate, monitor, and train specialized AI worker agents across departments.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop'
      },
      {
        id: 3,
        title: 'CRM & Project Workspace Canvas',
        caption: 'Visual workflow canvas connecting deal stages, team assignments, and database queries.',
        image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop'
      }
    ],
    pricing: [
      {
        id: 'community',
        name: 'Community',
        price: 'Free',
        period: 'forever',
        description: 'Ideal for small teams and solo entrepreneurs starting with Ralion.',
        features: [
          'Up to 3 Active Workspace Modules',
          'Single Admin User Account',
          '1,000 Mari AI Executions / mo',
          'Standard CRM & Project Modules',
          'Community Support & Documentation'
        ],
        ctaText: 'Start Free',
        popular: false
      },
      {
        id: 'professional',
        name: 'Professional',
        price: '$49',
        period: 'per month',
        description: 'For growing businesses requiring advanced CRM, project tracking, and Mari AI automation.',
        features: [
          'Unlimited Active Workspace Modules',
          'Up to 15 Team Seats',
          '50,000 Mari AI Executions / mo',
          'Priority Technical Support 24/7',
          'Custom USSD & API Gateway Access',
          'Full Audit Logs & Telemetry'
        ],
        ctaText: 'Start 14-Day Free Trial',
        popular: true
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        period: 'billed annually',
        description: 'Dedicated infrastructure, custom SLA, and tailored AI model fine-tuning.',
        features: [
          'Dedicated Private Cloud Instance',
          'Unlimited Team Seats & Custom Roles',
          'Custom Mari AI Model Fine-Tuning',
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
    longDescription: `Mari AI combines cutting-edge Gemini LLM architectures with pgvector knowledge retrieval to deliver accurate, contextual AI assistance. Integrated directly into Ralion and Ras Ali Labs products, Mari AI automates complex customer service flows and enterprise knowledge retrieval.`,
    icon: 'Sparkles',
    appUrl: '/products/mari-ai',
    accentColor: '#a855f7',
    cta: {
      primary: { text: 'Explore Mari AI', href: '/products/mari-ai' },
      secondary: { text: 'Request Beta Access', href: '#contact' },
      login: { text: 'Login', href: '#auth' }
    },
    seo: {
      title: 'Mari AI | Conversational Intelligence | Ras Ali Labs',
      description: 'Deploy contextual AI reasoning agents powered by Gemini and pgvector.'
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
        id: 'developer',
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
        id: 'scale',
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
      login: { text: 'Login', href: '#auth' }
    },
    seo: {
      title: 'TradeGrid Africa | Enterprise B2B Protocol | Ras Ali Labs',
      description: 'Cross-border B2B trade infrastructure connecting SADC corridors.'
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
        id: 'enterprise-participant',
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
      login: { text: 'Login', href: '#auth' }
    },
    seo: {
      title: 'DFS Platform | USSD Gateway & Telecom Bridge | Ras Ali Labs',
      description: 'Connect USSD feature phone sessions and mobile wallets to modern web applications.'
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
        id: 'fintech-api',
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
