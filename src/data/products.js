// Enterprise Product Architecture for Ras Ali Labs Ecosystem
// Central repository for product metadata, features, industry solutions, pricing, and routing.

export const productsData = [
  {
    id: 'ralion',
    slug: 'ralion',
    name: 'Ralion OS',
    tagline: 'Run your business with an AI-powered operating system.',
    category: 'Enterprise AI Business Operating System',
    status: 'Available',
    statusBadge: 'Featured Enterprise OS',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Ralion combines business operations, automation, and artificial intelligence into one platform.',
    longDescription: `Ralion OS is the AI-powered business operating system that helps organizations run, automate, and grow. Designed for modern enterprises, healthcare providers, logistics operators, and trade networks, Ralion unifies customer relationship management (CRM), tasks, document vaults, billing, analytics, and Mari AI intelligence into a single secure platform.`,
    icon: 'Cpu',
    appUrl: '/ralion',
    accentColor: '#D4AF37', // Brand Gold
    cta: {
      primary: { text: 'Request Demo', href: '/contact' },
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
    },
    solutions: [
      {
        id: 'small-business',
        name: 'Small Business',
        title: 'All-in-One Business OS for Growing Teams',
        description: 'Consolidate CRM, invoicing, project tracking, and customer communication into a single affordable workspace.',
        highlights: [
          'Unified Customer & Contact Database',
          'Automated Quotations & Invoice Tracking',
          'Built-in Mari AI Assistant',
          'Fast Onboarding Setup'
        ]
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        title: 'High-Throughput Operations for Scaled Organizations',
        description: 'Multi-tenant infrastructure with custom RBAC roles, dedicated Supabase instances, and 24/7 priority support.',
        highlights: [
          'Dedicated PostgreSQL & pgvector Database',
          'Unlimited Team Seats & Industry OS Modules',
          'Custom USSD & API Gateway Integration',
          'SLA Guarantee & Dedicated Support'
        ]
      }
    ]
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
    id: 'tradegrid-africa',
    slug: 'tradegrid-africa',
    name: 'TradeGrid Africa',
    tagline: 'Sovereign B2B Trade & Logistics Infrastructure',
    category: 'Supply Chain / B2B Trade',
    status: 'Live',
    statusBadge: 'Trade Network',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    description: 'Cross-border B2B trade infrastructure connecting buyers, sellers, customs brokers, and transport fleets across Africa.',
    icon: 'Globe',
    accentColor: '#10B981'
  },
  {
    id: 'dfs-platform',
    slug: 'dfs-platform',
    name: 'DFS Platform',
    tagline: 'Digital Financial Services & Payment Gateway',
    category: 'Fintech / Payment Gateway',
    status: 'Available',
    statusBadge: 'Fintech Core',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    description: 'Secure digital financial services platform for mobile money routing, USSD transaction sync, and enterprise billing.',
    icon: 'CreditCard',
    accentColor: '#3B82F6'
  }
];

export const getProductBySlug = (slug) => {
  return productsData.find((p) => p.slug === slug) || productsData[0];
};
