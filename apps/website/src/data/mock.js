// Enterprise Production Navigation & Content Data for Ras Ali Labs (Pty) Ltd
// Official Brand Hierarchy:
// RAS ALI LABS — Building intelligent business operating systems
// RALION OS — Empowered to Prosper | Your AI Business Operating System.
// MARI AI — Your AI Business Growth Partner

export const navLinks = [
  { name: 'Home', href: '/' },
  {
    name: 'Ralion OS',
    href: '/products/ralion',
    dropdown: [
      {
        title: 'Core Platform & Ecosystem',
        items: [
          { name: 'Ralion OS Overview', href: '/products/ralion' },
          { name: 'Mari AI Growth Partner', href: '/products/ralion-mari-ai' },
          { name: 'CRM & Pipeline Intelligence', href: '/products/ralion-crm' },
          { name: 'Growth Studio & Creatives', href: '/products/ralion-growth-intelligence' },
          { name: 'Social Intelligence & Publishing', href: '/products/ralion-growth-intelligence#social' },
          { name: 'Enterprise AI & Automation', href: '/products/ralion-automation' },
        ]
      },
      {
        title: 'Industry Operating Systems',
        items: [
          { name: 'Funeral OS', href: '/industries#funeral' },
          { name: 'Logistics OS', href: '/industries#logistics' },
          { name: 'Healthcare OS', href: '/industries#healthcare' },
          { name: 'Trade OS', href: '/industries#trade' },
          { name: 'Government OS', href: '/industries#government' }
        ]
      }
    ]
  },
  { name: 'Mari AI', href: '/products/ralion-mari-ai' },
  { name: 'Industry OS', href: '/industries' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Enterprise', href: '/solutions' },
  { name: 'About', href: '/about' },
  { name: 'Support', href: '/support' }
];

export const heroWords = ['EMPOWERED TO PROSPER.', 'INTELLIGENT SYSTEMS.', 'BUSINESS OS.', 'ENTERPRISE AI.'];

export const companyInfo = {
  name: 'Ras Ali Labs (Pty) Ltd',
  flagship: 'RALION OS',
  primaryTagline: 'Empowered to Prosper',
  descriptivePositioning: 'Your AI Business Operating System.',
  mariPositioning: 'Mari AI — Your AI Business Growth Partner',
  headline: 'AI Business Operating Systems for the Next Generation of Companies',
  subheadline: 'Ras Ali Labs builds AI-powered business operating systems that combine intelligent automation, data, business workflows, social intelligence, growth tools and enterprise infrastructure.',
  description: 'Ras Ali Labs is an African enterprise AI technology company headquartered in Gaborone, Botswana. We engineer sovereign business operating systems that integrate operations, customer intelligence, AI reasoning, and multi-channel growth.',
  email: 'contact@rasalilabs.com',
  location: 'Gaborone, Botswana',
  founded: '2023',
  philosophy: 'Empowered to Prosper',
  aiLabsDescription: 'Explore sovereign AI prototypes, cross-border supply chain sentinels, and vector reasoning research from the Ras Ali Labs engineering team in Gaborone.'
};

export const aiLabsImages = [
  'https://images.unsplash.com/photo-1586528116311-ad8ed7c508c0?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'
];

export const aiPrototypes = [
  {
    title: 'Supply Chain Sentinel AI',
    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
    status: 'Live Enterprise OS'
  },
  {
    title: 'Mari AI Reasoning Engine',
    image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop',
    status: 'Core System'
  },
  {
    title: 'TradeGrid SADC Corridor',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
    status: 'B2B Network'
  }
];

export const ralionModules = [
  {
    id: 'mari-ai',
    name: 'Mari AI',
    tagline: 'Your AI Business Growth Partner',
    description: 'Embedded executive AI partner that analyzes business context, provides strategic growth recommendations, and directs automated creative workflows.',
    href: '/products/ralion-mari-ai',
    badge: 'Flagship AI'
  },
  {
    id: 'crm',
    name: 'Ralion CRM',
    tagline: 'Customer & Pipeline Intelligence',
    description: 'Unified customer records, deal pipeline tracking, interaction timelines, and predictive lead scoring.',
    href: '/products/ralion-crm',
    badge: 'Core CRM'
  },
  {
    id: 'growth-studio',
    name: 'Growth Studio',
    tagline: 'AI Creative & Campaign Generation',
    description: 'Automated multi-channel campaign planning, FLUX commercial poster generation, and CogVideoX video creative rendering.',
    href: '/products/ralion-growth-intelligence',
    badge: 'Growth Engine'
  },
  {
    id: 'social-intelligence',
    name: 'Social Intelligence',
    tagline: 'Publishing, Analytics & Composer',
    description: 'Multi-platform social publishing, scheduled content queues, unified engagement analytics, and social inbox workflows.',
    href: '/products/ralion-growth-intelligence#social',
    badge: 'Multi-Channel'
  },
  {
    id: 'automation',
    name: 'Enterprise Automation',
    tagline: 'Intelligent Business Workflows',
    description: 'Event-driven triggers, automated business document generation, data syncs, and multi-tenant task orchestration.',
    href: '/products/ralion-automation',
    badge: 'Automation'
  },
  {
    id: 'security',
    name: 'Enterprise Security Vault',
    tagline: 'Bank-Grade Multi-Tenant Isolation',
    description: 'Row-level database security, encrypted token management, immutable audit logs, and sovereign cloud infrastructure.',
    href: '/about#security',
    badge: 'Sovereign Trust'
  }
];

export const featuredProjects = [
  {
    id: 1,
    title: 'Ralion OS',
    subtitle: 'AI Business Operating System',
    image: '/assets/images/logo.png',
    category: 'Flagship SaaS',
    roles: ['Enterprise Architecture', 'Mari AI Engine', 'Multi-Tenant Security'],
    date: '2026',
    description: "The AI Operating System for Business. Combines core operations, pipeline management, and Mari AI reasoning agents into a single unified workspace."
  },
  {
    id: 2,
    title: 'Ralion Funeral OS',
    subtitle: 'Mortuary & Policyholder Platform',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2070&auto=format&fit=crop',
    category: 'Industry OS',
    roles: ['Dignified Case Intake', 'Policyholder Vault', 'Fleet Logistics'],
    date: '2026',
    description: "Comprehensive operating system managing policyholders, mortuary case intake, fleet scheduling, and automated claims for funeral homes."
  },
  {
    id: 3,
    title: 'Ralion Logistics OS',
    subtitle: 'Cross-Border Fleet Telemetry',
    image: 'https://images.unsplash.com/photo-1586528116311-ad8ed7c508c0?q=80&w=2070&auto=format&fit=crop',
    category: 'Industry OS',
    roles: ['Vehicle Telemetry', 'Digital Waybills', 'SADC Border Workflows'],
    date: '2026',
    description: "Cross-border logistics and freight management platform powering transport operators with digital waybills and real-time border clearance."
  },
  {
    id: 4,
    title: 'Ralion Trade OS',
    subtitle: 'Sovereign SADC B2B Network',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
    category: 'Industry OS',
    roles: ['B2B Trade Catalog', 'Automated Invoicing', 'Trade Finance'],
    date: '2026',
    description: "Cross-border B2B trade infrastructure platform connecting suppliers, buyers, and freight forwarders across the SADC trade corridor."
  },
  {
    id: 5,
    title: 'Ralion Healthcare OS',
    subtitle: 'Clinical Practice & EMR Platform',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop',
    category: 'Industry OS',
    roles: ['Electronic Health Records', 'Doctor Scheduling', 'Medical Billing'],
    date: '2026',
    description: "Clinical practice operating system managing patient records, doctor appointments, electronic prescriptions, and medical billing."
  },
  {
    id: 6,
    title: 'Ralion Government OS',
    subtitle: 'Sovereign Public Sector Infrastructure',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop',
    category: 'Industry OS',
    roles: ['Citizen Portal', 'USSD Gateway', 'Regulatory Audit Vault'],
    date: '2026',
    description: "Sovereign digital public infrastructure providing citizen registry automation, USSD access, and inter-departmental workflows."
  }
];

export const industryOperatingSystems = [
  {
    id: 'funeral',
    name: 'Ralion Funeral OS',
    tagline: 'Dignified End-to-End Mortuary & Claims Management',
    description: 'Specialized operating system managing policyholder registers, repatriation logistics, fleet scheduling, mortuary tracking, and automated client notifications.',
    href: '/industries#funeral',
    metrics: '99.8% Policy Accuracy',
    capabilities: ['Policyholder Vault', 'Body Intake & QR Tracking', 'Fleet & Mortuary Schedule', 'Automated Claims Workflows']
  },
  {
    id: 'logistics',
    name: 'Ralion Logistics OS',
    tagline: 'Cross-Border Fleet Telemetry & Waybill Automation',
    description: 'Freight routing, driver dispatching, border clearance document generation, fuel monitoring, and live cross-border tracking across the SADC corridor.',
    href: '/industries#logistics',
    metrics: '40% Route Efficiency',
    capabilities: ['Live Fleet Telemetry', 'Digital Waybills & PODs', 'Customs Document Engine', 'Fuel & Maintenance Logs']
  },
  {
    id: 'healthcare',
    name: 'Ralion Healthcare OS',
    tagline: 'Clinical Practice Operations & Patient Records',
    description: 'Patient scheduling, electronic medical records, consultation billing, automated pharmacy dispensing alerts, and sovereign health data protection.',
    href: '/industries#healthcare',
    metrics: 'HIPAA & DPA Compliant',
    capabilities: ['Electronic Health Records', 'Clinical Billing Gateway', 'Patient Consultation Portal', 'Prescription Tracking']
  },
  {
    id: 'trade',
    name: 'Ralion Trade OS',
    tagline: 'B2B SADC Corridor Procurement & Settlement',
    description: 'Cross-border B2B trade network connecting suppliers, verified buyers, and logistics providers with automated invoicing and trade finance tracking.',
    href: '/industries#trade',
    metrics: '$12M+ Managed Volume',
    capabilities: ['Supplier Verification', 'B2B Order Catalog', 'Cross-Border Invoicing', 'Trade Settlement Tracking']
  },
  {
    id: 'government',
    name: 'Ralion Government OS',
    tagline: 'Citizen Services & Secure Public Infrastructure',
    description: 'Sovereign digital public infrastructure, registry automation, citizen identity verification, and inter-departmental record exchange with full auditability.',
    href: '/industries#government',
    metrics: 'Zero-Trust Sovereign Arch',
    capabilities: ['Citizen Portal & USSD', 'Inter-Agency Ledger', 'Document Verification Vault', 'Audit & Compliance Telemetry']
  }
];

export const pricingPlans = [
  {
    id: 'COMMUNITY',
    name: 'Community',
    tagline: 'Free Forever',
    priceUsd: 0,
    monthlyCredits: 100,
    description: 'Core business tools and essential CRM for solo entrepreneurs starting their AI journey.',
    features: [
      '100 AI Monthly Credits',
      '1 Connected Social Account',
      '1 Isolated Workspace',
      'Mari AI Business Growth Partner',
      'FLUX AI Image Generation',
      'Core Customer CRM & Pipeline',
      'Social Publishing & Scheduling',
      'Multi-Tenant Data Isolation'
    ],
    ctaText: 'Start Free Forever',
    ctaHref: '/ralion/register',
    popular: false,
  },
  {
    id: 'STARTER',
    name: 'Starter',
    tagline: 'Power Package for Growing Teams',
    priceUsd: 19,
    monthlyCredits: 1000,
    description: 'Ideal for scaling businesses requiring advanced growth campaigns, analytics, and automated workflows.',
    features: [
      '1,000 AI Monthly Credits',
      '3 Connected Social Accounts',
      '3 Workspaces & 5 Team Members',
      'Mari AI Advanced Growth Strategy',
      'FLUX Commercial Poster Studio',
      'Market Research & Competitor Briefs',
      'Business Intelligence & Reporting',
      'Automated Workflow Triggers'
    ],
    ctaText: 'Choose Starter',
    ctaHref: '/ralion/billing',
    popular: true,
  },
  {
    id: 'PROFESSIONAL',
    name: 'Professional',
    tagline: 'Commercial AI Powerhouse',
    priceUsd: 49,
    monthlyCredits: 5000,
    description: 'Full operational automation, commercial video generation, and comprehensive multi-channel growth.',
    features: [
      '5,000 AI Monthly Credits',
      '10 Connected Social Accounts',
      '10 Workspaces & 20 Team Members',
      'CogVideoX Commercial Video AI',
      'Automated Multi-Channel Campaigns',
      'Unified Social Inbox & Engagement',
      'Live Website Ingestion & Learning',
      'Dedicated Priority Queue'
    ],
    ctaText: 'Choose Professional',
    ctaHref: '/ralion/billing',
    popular: false,
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    tagline: 'Sovereign Corporate Operating System',
    priceUsd: 199,
    monthlyCredits: 25000,
    description: 'Sovereign enterprise infrastructure with dedicated AI model fine-tuning, custom industry modules, and SLAs.',
    features: [
      '25,000 AI Monthly Credits',
      'Unlimited Social Connections',
      'Unlimited Workspaces & Users',
      'Custom Industry OS Modules',
      'Sovereign Cloud Deployment',
      'Enterprise SSO & Advanced RBAC',
      '24/7 Dedicated Engineering Support',
      'Custom SLA & Audit Telemetry'
    ],
    ctaText: 'Talk to Sales',
    ctaHref: '/request-demo',
    popular: false,
  }
];

export const services = [
  {
    id: 1,
    title: 'Enterprise AI Systems',
    description: 'Bespoke AI architectures and reasoning agents embedded directly into enterprise operational workflows.',
    items: ['Embedded Mari AI Reasoning Engines', 'Document Ingestion & Knowledge Graphs', 'Predictive Pipeline Analytics', 'Tenant-Scoped Model Fine-Tuning']
  },
  {
    id: 2,
    title: 'AI Automation & Workflows',
    description: 'Automating high-volume business operations with verifiable data pipelines and event-driven triggers.',
    items: ['Automated Regulatory Reporting', 'Document & Invoice Generation', 'Cross-Platform Data Synchronization', 'USSD & Web Gateway Integration']
  },
  {
    id: 3,
    title: 'Custom Business Operating Systems',
    description: 'End-to-end industry operating systems engineered from the ground up for high-trust sectors.',
    items: ['Sovereign Cloud Hosting', 'PostgreSQL & Supabase Security Architecture', 'Micro-Frontend Desktop & Web Shells', 'Offline-First Edge Sync']
  },
  {
    id: 4,
    title: 'Ralion OS Implementation & Training',
    description: 'Complete deployment, data migration, and enterprise onboarding for Ralion OS suites.',
    items: ['Funeral OS Rollouts', 'Logistics Fleet Telemetry Setup', 'Healthcare EMR Deployment', 'SADC Trade Network Integration']
  }
];

export const clients = [
  'Enterprise Logistics Networks',
  'Healthcare Consultation Groups',
  'Mortuary & Funeral Services',
  'SADC B2B Trade Corridors'
];

export const faqs = [
  {
    question: 'What is Ralion OS and how is it different from traditional software?',
    answer: 'Ralion OS is an AI Business Operating System that unifies operations, CRM, growth strategy, social intelligence, and creative generation into one cohesive platform powered by Mari AI, rather than forcing you to stitch together dozens of disconnected SaaS tools.'
  },
  {
    question: 'What is Mari AI and what can it do for my business?',
    answer: 'Mari AI is your embedded AI Business Growth Partner. Working with your tenant-scoped business context, Mari analyzes opportunities, formulates campaign strategies, directs creative generation, and continuously learns from social performance to drive revenue.'
  },
  {
    question: 'How do monthly AI credits work?',
    answer: 'Every plan includes a monthly credit allocation used for AI-powered operations (such as generating FLUX commercial posters, CogVideoX video reels, automated market research, or strategic analysis). Credits replenish every billing cycle.'
  },
  {
    question: 'Is my business data isolated and secure?',
    answer: 'Yes. Ralion OS enforces strict multi-tenant isolation, row-level database security, encrypted token storage, and server-side secret management. Your proprietary business data is never shared across organizations or used to train public AI models.'
  },
  {
    question: 'Can I connect my social media channels?',
    answer: 'Yes. Ralion connects seamlessly to Facebook, Instagram, LinkedIn, X, TikTok, and YouTube, allowing you to compose, schedule, publish, and track engagement from a single command center.'
  }
];

export const socialLinks = [
  { name: 'YouTube', url: 'https://youtube.com', icon: 'Youtube' },
  { name: 'Facebook', url: 'https://facebook.com', icon: 'Facebook' },
  { name: 'Instagram', url: 'https://instagram.com', icon: 'Instagram' },
  { name: 'Phone', url: 'tel:+26770000000', icon: 'Phone' },
  { name: 'Mail', url: 'mailto:contact@rasalilabs.com', icon: 'Mail' }
];
