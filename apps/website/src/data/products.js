// Enterprise Product Architecture for Ras Ali Labs Ecosystem
// Central repository for Ralion OS, Ralion CRM, Ralion AI Growth Engine, Mari AI, and Ralion Trade.

export const productsData = [
  {
    id: 'ralion-crm',
    slug: 'ralion-crm',
    name: 'Ralion CRM',
    tagline: 'AI Customer Intelligence & Automated Sales Assistant',
    category: 'Customer Intelligence / Sales Automation',
    status: 'Available',
    statusBadge: 'Priority Core Product',
    badgeColor: 'bg-brand-gold/10 text-brand-gold border-brand-gold/20',
    philosophy: 'Ralion does not just manage your business activity. It understands your business, predicts opportunities, and helps you grow.',
    description: 'Ralion CRM combines AI customer intelligence, smart pipeline management, and an automated AI sales assistant into one predictive workspace.',
    longDescription: `Ralion CRM is an AI-powered sales & customer intelligence platform that builds contextual memory around every client interaction. Powered by Mari AI reasoning agents, Ralion CRM automatically scores deal opportunities, triggers hyper-personalized follow-ups, identifies high-value leads, and delivers real-time business insights to accelerate revenue.`,
    icon: 'UserCheck',
    appUrl: '/ralion/crm',
    accentColor: '#D4AF37',
    cta: {
      primary: { text: 'Start Free', href: '/ralion/community' },
      secondary: { text: 'Request Demo', href: '/request-demo' },
      login: { text: 'Login', href: '#auth' },
      launch: { text: 'Launch Ralion CRM', href: '/ralion/crm' }
    },
    seo: {
      title: 'Ralion CRM — AI Customer Intelligence & Sales Assistant | Ras Ali Labs',
      description: 'Accelerate deal closing with Ralion CRM. AI customer intelligence, smart pipeline management, customer memory, and opportunity scoring.'
    },
    hero: {
      title: 'Ralion CRM — AI Customer Intelligence',
      tagline: 'AI Customer Intelligence & Automated Sales Assistant',
      subtitle: 'Predict opportunities, automate client follow-ups, and convert leads with an AI sales assistant that remembers every interaction.',
      stats: [
        { label: 'Pipeline Automation', value: 'Instant' },
        { label: 'Deal Velocity Increase', value: '3.4x' },
        { label: 'Customer Memory Context', value: 'Sub-second' },
        { label: 'Opportunity Accuracy', value: '98.5%' }
      ]
    },
    features: [
      {
        id: 'customer-intelligence',
        title: 'AI Customer Intelligence',
        description: 'Deep customer profiling with automated intent detection, behavioral history, and predictive buying signals.',
        icon: 'UserCheck'
      },
      {
        id: 'sales-assistant',
        title: 'AI Sales Assistant',
        description: 'Mari AI co-pilot that drafts tailored email responses, prepares meeting briefs, and recommends next sales actions.',
        icon: 'Bot'
      },
      {
        id: 'pipeline-management',
        title: 'Smart Pipeline Management',
        description: 'Dynamic Kanban and list views with automated stage progression, stale deal alerts, and bottleneck detection.',
        icon: 'BarChart3'
      },
      {
        id: 'customer-memory',
        title: 'Contextual Customer Memory',
        description: 'Sub-second RAG search across past emails, call logs, contracts, and support tickets for instant background memory.',
        icon: 'Database'
      },
      {
        id: 'automated-followups',
        title: 'Automated Follow-ups',
        description: 'Event-driven follow-up triggers ensuring zero leads are forgotten or dropped across long sales cycles.',
        icon: 'Zap'
      },
      {
        id: 'opportunity-scoring',
        title: 'Predictive Opportunity Scoring',
        description: 'Algorithmic lead scoring ranking high-probability revenue deals based on client engagement and budget markers.',
        icon: 'TrendingUp'
      },
      {
        id: 'business-insights',
        title: 'Real-time Business Insights',
        description: 'Executive revenue dashboards forecasting monthly MRR, conversion rates, and sales rep performance.',
        icon: 'PieChart'
      }
    ]
  },
  {
    id: 'ralion-social-intelligence',
    slug: 'ralion-social-intelligence',
    name: 'Ralion Social Intelligence Marketing',
    tagline: 'The AI Marketing Strategist & Brand Growth Platform',
    category: 'AI Growth / Social Intelligence',
    status: 'Available',
    statusBadge: 'Priority Core Product',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    philosophy: 'Ralion does not just manage your business activity. It understands your business, predicts opportunities, and helps you grow.',
    description: 'A unique AI-first system acting as your autonomous marketing strategist, generating brand strategy, listening to market signals, and executing CRM-connected campaigns.',
    longDescription: `Ralion Social Intelligence Marketing is not another social media scheduler. It is an AI Brand Brain that learns your company voice, customer profiles, and products. It deploys Autonomous Marketing Agents for content planning, competitor monitoring, and engagement simulation, all connected to your CRM via our Business Memory Engine.`,
    icon: 'TrendingUp',
    appUrl: '/ralion/growth',
    accentColor: '#A855F7',
    cta: {
      primary: { text: 'Start Free', href: '/ralion/community' },
      secondary: { text: 'Request Demo', href: '/request-demo' },
      login: { text: 'Login', href: '#auth' },
      launch: { text: 'Launch Intelligence Engine', href: '/ralion/growth' }
    },
    seo: {
      title: 'Ralion Social Intelligence Marketing | Ras Ali Labs',
      description: 'Scale your enterprise with Ralion Social Intelligence Marketing. AI campaign planning, brand intelligence, social listening, and CRM-connected campaigns.'
    },
    hero: {
      title: 'Ralion Social Intelligence Marketing',
      tagline: 'AI Brand Brain & Autonomous Marketing Agents',
      subtitle: 'Predict engagement, monitor competitors, and generate content strategies directly linked to your sales CRM pipeline.',
      stats: [
        { label: 'Campaign Creation', value: 'Autonomous' },
        { label: 'Engagement Prediction', value: 'AI Simulator' },
        { label: 'Brand Voice Learning', value: 'Contextual' },
        { label: 'CRM Pipeline Link', value: 'Direct' }
      ]
    },
    features: [
      {
        id: 'ai-brand-brain',
        title: 'AI Brand Brain',
        description: 'Learns your company voice, analyzes customer profiles, and internalizes product catalogs for perfectly aligned messaging.',
        icon: 'Bot'
      },
      {
        id: 'autonomous-agents',
        title: 'Autonomous Marketing Agents',
        description: 'Deploy agents for continuous content planning, campaign creation, audience analysis, and competitor monitoring.',
        icon: 'Sparkles'
      },
      {
        id: 'business-memory',
        title: 'Business Memory Engine',
        description: 'Directly connects your CRM pipeline, customer conversations, and marketing performance into a unified data ecosystem.',
        icon: 'Database'
      },
      {
        id: 'campaign-simulator',
        title: 'AI Campaign Simulator',
        description: 'Predict engagement rates, audience response, and optimal posting times before publishing.',
        icon: 'Activity'
      },
      {
        id: 'social-listening',
        title: 'Social Intelligence',
        description: 'Real-time sentiment monitoring across digital channels, tracking brand mentions, industry keywords, and buyer intent.',
        icon: 'Globe'
      },
      {
        id: 'content-strategy',
        title: 'Content Strategy Generation',
        description: 'Data-driven editorial calendars and topical clusters tailored to your enterprise brand tone of voice.',
        icon: 'Layers'
      }
    ]
  },
  {
    id: 'ralion',
    slug: 'ralion',
    name: 'Ralion OS',
    tagline: 'Run your business with an AI-powered operating system.',
    category: 'Enterprise AI Business Operating System',
    status: 'Available',
    statusBadge: 'Featured Enterprise OS',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    philosophy: 'Ralion does not just manage your business activity. It understands your business, predicts opportunities, and helps you grow.',
    description: 'Ralion combines business operations, automation, and artificial intelligence into one platform.',
    longDescription: `Ralion OS is the AI-powered business operating system that helps organizations run, automate, and grow. Designed for modern enterprises, healthcare providers, logistics operators, and trade networks, Ralion unifies customer relationship management (CRM), tasks, document vaults, billing, analytics, and Mari AI intelligence into a single secure platform.`,
    icon: 'Cpu',
    appUrl: '/ralion',
    accentColor: '#D4AF37',
    cta: {
      primary: { text: 'Request Demo', href: '/request-demo' },
      secondary: { text: 'Explore Solutions', href: '/solutions' },
      login: { text: 'Login', href: '#auth' },
      launch: { text: 'Launch Ralion OS', href: '/ralion' }
    },
    seo: {
      title: 'Ralion OS — The AI Business Operating System | Ras Ali Labs',
      description: 'Empower your organization with intelligent workflows, automation, and AI-driven insights with Ralion OS.'
    },
    hero: {
      title: 'Ralion OS — The AI Business Operating System',
      tagline: 'Run your business with an AI-powered operating system.',
      subtitle: 'Empower your organization with intelligent workflows, automation, and AI-driven insights.',
      stats: [
        { label: 'System Availability', value: '99.99%' },
        { label: 'Workflow Automation', value: 'Real-time' },
        { label: 'Industry Solutions', value: '4 Core OS' },
        { label: 'Security & Auth', value: 'Enterprise Grade' }
      ]
    },
    features: [
      {
        id: 'business-ops',
        category: 'Business Operations',
        title: 'Core Business Operations',
        description: 'Manage customers, deal pipelines, tasks, document vaults, billing, and reports in a unified interface.',
        items: ['CRM & Customers', 'Tasks & Projects', 'Document Vault', 'Billing & Invoices', 'Operational Reports']
      },
      {
        id: 'ai-intelligence',
        category: 'AI Intelligence',
        title: 'Mari AI Intelligence',
        description: 'Mari AI is your intelligent business assistant that understands your operations, documents, and workflows.',
        items: ['Mari AI Assistant', 'Business Insights', 'Document Intelligence', 'Automated Recommendations']
      },
      {
        id: 'industry-solutions',
        category: 'Industry Solutions',
        title: 'Specialized Industry OS',
        description: 'Purpose-built operating systems tailored for specific enterprise sectors.',
        items: ['Funeral OS', 'Logistics OS', 'Health OS', 'Trade OS']
      }
    ],
    industryOS: [
      {
        id: 'funeral-os',
        name: 'Funeral OS',
        target: 'For funeral homes & mortuary services',
        icon: 'Building2',
        modules: [
          'Case Management & Deceased Records',
          'Family Management & Relations',
          'Package Selection & Service Bundles',
          'Inventory & Coffin Stock Control',
          'Payments, Invoicing & Policy Sync'
        ]
      },
      {
        id: 'logistics-os',
        name: 'Logistics OS',
        target: 'For logistics & transport companies',
        icon: 'Truck',
        modules: [
          'Fleet Management & Telemetry',
          'Real-time Vehicle & Cargo Tracking',
          'Digital Waybills & Manifests',
          'Customs & SADC Border Workflows'
        ]
      },
      {
        id: 'health-os',
        name: 'Health OS',
        target: 'For clinics & healthcare providers',
        icon: 'Activity',
        modules: [
          'Patient Case Records & History',
          'Doctor Appointments & Schedules',
          'Electronic Prescriptions',
          'Medical Billing & Medical Aid Claims'
        ]
      },
      {
        id: 'trade-os',
        name: 'Trade OS',
        target: 'For B2B commerce & distributors',
        icon: 'Globe',
        modules: [
          'Procurement & Purchase Orders',
          'Supplier Catalog & Directory',
          'Customer Orders & Fulfillment',
          'Trade Analytics & Commodity Tracking'
        ]
      }
    ],
    mariAI: {
      title: 'Mari AI — Your Intelligent Business Assistant',
      subtitle: 'Mari AI is your intelligent business assistant that understands your operations, documents, and workflows.',
      capabilities: [
        { title: 'Ask Questions About Your Business', desc: 'Query operational metrics, revenue data, and customer histories in plain language.' },
        { title: 'Generate Strategic Insights', desc: 'Receive proactive recommendations on conversion funnels, inventory levels, and bottlenecks.' },
        { title: 'Search Company Knowledge', desc: 'Sub-second vector retrieval across all uploaded company documents, policies, and contracts.' },
        { title: 'Assist Employees', desc: 'Guide staff through standardized operational procedures, case files, and client requests.' },
        { title: 'Automate Repetitive Work', desc: 'Trigger document generation, email drafts, and database updates automatically.' }
      ]
    }
  },
  {
    id: 'mari-ai',
    slug: 'mari-ai',
    name: 'Mari AI Engine',
    tagline: 'Reasoning AI Agents for Enterprise Intelligence',
    category: 'Artificial Intelligence / LLM Studio',
    status: 'Available',
    statusBadge: 'Core AI Engine',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    description: 'Mari AI powers intelligent contextual reasoning, document knowledge extraction, and task automation across all Ras Ali Labs products.',
    icon: 'Bot',
    accentColor: '#A855F7'
  },
  {
    id: 'ralion-trade',
    slug: 'ralion-trade',
    name: 'Ralion Trade',
    tagline: 'Sovereign B2B Trade & Logistics Infrastructure',
    category: 'Supply Chain / B2B Trade',
    status: 'Live',
    statusBadge: 'Trade Network',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Cross-border B2B trade infrastructure connecting buyers, sellers, customs brokers, and transport fleets across Africa.',
    icon: 'Globe',
    accentColor: '#10B981'
  }
];

export const getProductBySlug = (slug) => {
  return productsData.find((p) => p.slug === slug) || productsData[0];
};
