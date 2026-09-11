// Authoritative Navigation, Brand Hierarchy & Content Data for Ras Ali Labs (Pty) Ltd
// Official Brand Architecture:
// RAS ALI LABS — Parent Company & Primary Public Brand ("We Build Intelligent Technology and Powerful Stories.")
// ├── Technology & Digital Development (Web, Mobile, Cloud, Custom Platforms)
// ├── Film & Creative Production (Cinematic Video, Corporate Storytelling, Commercials, Motion Graphics)
// ├── Music & Audio (Original Production, Studio Recording, Sound Design, Live Performance)
// ├── AI & Automation (Intelligent Workflows, Reasoning Systems, Enterprise Integration)
// └── Ralion OS — Flagship Product Innovation ("Empowered to Prosper | Your AI Business Operating System")

export const navLinks = [
  { name: 'Home', href: '/' },
  {
    name: 'Services',
    href: '/services',
    dropdown: [
      {
        title: 'Creative & Media',
        items: [
          { name: 'Film & Creative Production', href: '/services/film-video' },
          { name: 'Music Production & Audio', href: '/services/music-audio' },
        ]
      },
      {
        title: 'Technology & AI',
        items: [
          { name: 'Web & App Development', href: '/services/web-app-development' },
          { name: 'AI & Automation Systems', href: '/services/ai-automation' },
        ]
      }
    ]
  },
  { name: 'Ralion OS', href: '/products/ralion-os' },
  { name: 'Our Work', href: '/work' },
  { name: 'About', href: '/about' },
  { name: 'Contact', href: '/contact' }
];

export const heroWords = [
  'INTELLIGENT TECHNOLOGY.',
  'POWERFUL STORIES.',
  'CINEMATIC PRODUCTION.',
  'ORIGINAL SOUND.',
  'AI INNOVATION.'
];

export const companyInfo = {
  name: 'Ras Ali Labs (Pty) Ltd',
  shortName: 'Ras Ali Labs',
  headline: 'We Build Intelligent Technology and Powerful Stories.',
  tagline: 'Technology. Film. Sound. Innovation.',
  subheadline: 'Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company delivering intelligent platforms, cinematic productions, digital experiences and original sound.',
  aboutSummary: 'Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company working at the intersection of software, artificial intelligence, film, visual storytelling and music. We develop digital products, produce memorable creative work and build practical technology that helps organizations communicate, operate and grow.',
  flagship: 'Ralion OS',
  flagshipTagline: 'Empowered to Prosper',
  flagshipPositioning: 'Your AI Business Operating System',
  mariPositioning: 'Mari — Your AI Business Growth Partner',
  email: 'contact@rasalilabs.com',
  phone: '+267 72 113 009',
  address: 'Plot 18680 Khuhurutse Drive, Phase 2, Gaborone, Botswana',
  location: 'Gaborone, Botswana',
  founded: '2014',
  philosophy: 'Empowered to Prosper'
};

export const capabilityPillars = [
  {
    id: 'film-video',
    title: 'Film & Creative Production',
    tagline: 'Cinematic Visuals & Strategic Storytelling',
    description: 'Cinematic films, corporate storytelling, commercials, interviews, event coverage, photography, motion graphics and post-production.',
    icon: 'Video',
    image: '/assets/images/service-video.png',
    href: '/services/film-video',
    items: [
      'Corporate Storytelling & Commercials',
      'High-End Videography & Cinematic Documentaries',
      'Multi-Camera Live & Event Coverage',
      'Professional Photography & Visual Content',
      'Motion Graphics, Grading & Audio Post-Production'
    ]
  },
  {
    id: 'web-app-development',
    title: 'Web & App Development',
    tagline: 'Modern Digital Experiences & Custom Platforms',
    description: 'Modern websites, mobile applications, business platforms, portals, e-commerce systems and custom digital products.',
    icon: 'Code',
    image: '/assets/images/service-dev.png',
    href: '/services/web-app-development',
    items: [
      'Modern High-Performance Web Applications',
      'iOS & Android Mobile Applications',
      'Custom Business Portals & Dashboards',
      'Enterprise E-Commerce Systems',
      'UI/UX Architecture & Interaction Design'
    ]
  },
  {
    id: 'music-audio',
    title: 'Music & Audio',
    tagline: 'Original Sound, Composition & Sonic Identity',
    description: 'Music production, arrangement, recording, sound design, audio post-production and live creative performance.',
    icon: 'Music',
    image: '/assets/images/service-sound.png',
    href: '/services/music-audio',
    items: [
      'Original Music Production & Arrangement',
      'Studio Recording & Session Musicianship',
      'Commercial Sound Design & Sonic Branding',
      'Audio Post-Production, Mixing & Mastering',
      'Live Creative & Technical Audio Production'
    ]
  },
  {
    id: 'ai-automation',
    title: 'AI & Automation',
    tagline: 'Intelligent Systems & Business Transformation',
    description: 'AI-powered business systems, workflow automation, intelligent integrations and enterprise digital transformation.',
    icon: 'Bot',
    image: '/assets/images/service-branding.png',
    href: '/services/ai-automation',
    items: [
      'AI-Powered Enterprise Workflow Systems',
      'Intelligent Reasoning Agents & LLM Integration',
      'API Integration & Process Automation',
      'Data Pipelines & Custom Business Telemetry',
      'Sovereign Data Governance & BOCRA Compliance'
    ]
  }
];

export const howWeWork = [
  {
    step: '01',
    title: 'Discover',
    tagline: 'Strategic Immersion',
    description: 'We understand your core objectives, audience, technical architecture, and creative goals through rigorous discovery.'
  },
  {
    step: '02',
    title: 'Design',
    tagline: 'Architecture & Visual Language',
    description: 'We craft comprehensive UI/UX blueprints, creative storyboards, sound palettes, and technical specifications.'
  },
  {
    step: '03',
    title: 'Create',
    tagline: 'Engineering & Production',
    description: 'Our multidisciplinary team builds the software, shoots the cinematic footage, engineers the audio, and develops the AI workflows.'
  },
  {
    step: '04',
    title: 'Deliver',
    tagline: 'Deployment & Scaling',
    description: 'We test, polish, deploy, broadcast, and provide ongoing operational support to ensure lasting impact and growth.'
  }
];

export const ralionOSOverview = {
  badge: 'A Flagship Innovation by Ras Ali Labs',
  name: 'Ralion OS',
  tagline: 'Empowered to Prosper',
  headline: 'Your AI Business Operating System',
  description: 'Ralion OS brings business intelligence, Mari AI, growth, social media, customer management and operational tools into one connected platform.',
  mariTagline: 'Mari — Your AI Business Growth Partner',
  mariDescription: 'Embedded executive AI that provides strategic growth recommendations, automates creative workflows, and orchestrates multi-channel publishing.',
  launchHref: '/ralion',
  exploreHref: '/products/ralion-os',
  demoHref: '/request-demo'
};

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
    id: 'pula-pitch-2024',
    title: 'Pula Pitch',
    subtitle: 'Television & Digital Enterprise Series',
    category: 'Film & Creative Production',
    roles: ['Set Design', 'Pre-Production', 'Principal Videography', 'Post-Production'],
    date: '2024',
    verifiedNote: 'Lead videographer responsible for set design and pre-production, production and post-production across 13 episodes.',
    image: '/assets/images/pula-pitch-logo.jpg',
    description: 'Lead videographer responsible for set design, lighting architecture, multi-camera shoot direction, pre-production, and full post-production across 13 complete episodes of the televised enterprise series.'
  },
  {
    id: 'dedications-2020',
    title: 'Dedications',
    subtitle: 'Broadcast Music Production & Studio Sessions',
    category: 'Music & Audio Production',
    roles: ['Bass Guitarist', 'Studio Setup', 'Artist Management'],
    date: '2020',
    verifiedNote: 'Bass guitarist, studio setup and artist management across the programme’s shoots.',
    image: '/assets/images/ras-ali-bass-1.jpg',
    description: 'Live musical execution as bass guitarist, studio recording setup, sound monitoring, and artist management throughout all broadcast production shoots.'
  },
  {
    id: 'ralion-os-flagship',
    title: 'Ralion OS',
    subtitle: 'AI Business Operating System (Flagship Product)',
    category: 'Software & Technology',
    roles: ['Enterprise Architecture', 'Mari AI Engine', 'Multi-Tenant Security', 'Full-Stack Engineering'],
    date: '2026',
    verifiedNote: 'Flagship innovation engineered and built by Ras Ali Labs.',
    image: '/assets/images/logo.png',
    description: 'The flagship AI operating system by Ras Ali Labs. Unifies CRM, operations, Mari AI reasoning, campaign generation, and multi-platform social management for modern businesses.'
  },
  {
    id: 'lebville-platform',
    title: 'Lebville Digital Platform',
    subtitle: 'Modern Web Application & Digital Presence',
    category: 'Web & App Development',
    roles: ['Full-Stack Engineering', 'UI/UX Architecture', 'Cloud Deployment'],
    date: '2024',
    verifiedNote: 'Custom web application engineered by Ras Ali Labs.',
    image: '/assets/images/lebville-logo.png',
    description: 'High-performance responsive digital platform engineered with modern web frameworks, dynamic components, and optimized cloud delivery.'
  },
  {
    id: 'peregrine-systems',
    title: 'Peregrine Brand & Web Portal',
    subtitle: 'Enterprise Digital Identity & Web Interface',
    category: 'Web & App Development',
    roles: ['Visual Identity', 'Web Development', 'Interface Design'],
    date: '2024',
    verifiedNote: 'Brand identity and digital web portal designed and developed by Ras Ali Labs.',
    image: '/assets/images/peregrine-logo.png',
    description: 'Clean, modern digital identity and web portal engineered for high performance, accessibility, and clear corporate communications.'
  },
  {
    id: 'sonic-branding-suite',
    title: 'Sonic Branding & Studio Sound Suite',
    subtitle: 'Original Composition & Audio Post-Production',
    category: 'Music & Audio',
    roles: ['Original Composition', 'Sound Design', 'Audio Mastering'],
    date: '2024 - 2025',
    verifiedNote: 'Original sound design and audio engineering by Ras Ali Labs.',
    image: '/assets/images/service-sound.png',
    description: 'Original music arrangements, commercial sound design, Foley, dialogue post-production, and master audio engineering for corporate and creative media.'
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
    title: 'Film & Creative Production',
    description: 'Cinematic films, corporate storytelling, commercials, interviews, event coverage, photography, motion graphics and post-production.',
    href: '/services/film-video',
    items: [
      'Commercials & Brand Storytelling',
      'High-Definition Multi-Camera Filming',
      'Post-Production, Color Grading & Sound',
      'Event & Conference Visual Coverage'
    ]
  },
  {
    id: 2,
    title: 'Web & App Development',
    description: 'Modern websites, mobile applications, business platforms, portals, e-commerce systems and custom digital products.',
    href: '/services/web-app-development',
    items: [
      'Custom Web Applications & Portals',
      'Cross-Platform iOS & Android Apps',
      'High-Speed UI/UX & Responsive Layouts',
      'API Architecture & Cloud Infrastructure'
    ]
  },
  {
    id: 3,
    title: 'Music & Audio Production',
    description: 'Music production, arrangement, recording, sound design, audio post-production and live creative performance.',
    href: '/services/music-audio',
    items: [
      'Original Music Composition & Arrangement',
      'Studio Recording & Session Instrumentation',
      'Sonic Branding & Commercial Audio Design',
      'Audio Post-Production & Mastering'
    ]
  },
  {
    id: 4,
    title: 'AI & Automation Systems',
    description: 'AI-powered business systems, workflow automation, intelligent integrations and enterprise digital transformation.',
    href: '/services/ai-automation',
    items: [
      'Autonomous Workflow Automation',
      'Embedded AI Reasoning & LLM Systems',
      'Enterprise System Integration & APIs',
      'Sovereign Data Governance & Security'
    ]
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

export const faqs = [
  {
    question: 'What is Ras Ali Labs?',
    answer: 'Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company. We build intelligent software systems, develop web and mobile applications, produce cinematic films and visual content, and create original music and audio.'
  },
  {
    question: 'What is Ralion OS and how does it relate to Ras Ali Labs?',
    answer: 'Ralion OS is the flagship technology product created and engineered by Ras Ali Labs. It is an AI Business Operating System that unifies CRM, business operations, growth intelligence, and Mari AI into one connected platform.'
  },
  {
    question: 'What creative and media production services do you provide?',
    answer: 'We offer full-cycle film and video production (commercials, documentaries, corporate storytelling, multicam live coverage), professional photography, motion graphics, original music composition, studio recording, and sound design.'
  },
  {
    question: 'What technology and software services do you build?',
    answer: 'We build modern web applications, mobile apps (iOS & Android), custom enterprise portals, business automation workflows, AI reasoning integrations, and sovereign digital infrastructure.'
  },
  {
    question: 'Where is Ras Ali Labs located and how can we collaborate?',
    answer: 'Ras Ali Labs is headquartered in Gaborone, Botswana (Plot 18680 Khuhurutse Drive, Phase 2). You can start a project by contacting us through our website, emailing contact@rasalilabs.com, or calling +267 72 113 009.'
  }
];

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

export const clients = [
  'Broadcasting & Television Productions',
  'Enterprise Logistics Networks',
  'Commercial Enterprises & Startups',
  'Creative & Performing Arts Studios'
];

export const awards = [
  {
    year: '2024',
    title: 'Pula Pitch Broadcast Production',
    organization: 'Television Enterprise Series',
    category: 'Full Cycle Videography & Post-Production'
  },
  {
    year: '2020',
    title: 'Dedications Music Broadcast',
    organization: 'Live Music Series',
    category: 'Studio Instrumentation & Sound Setup'
  }
];

export const socialLinks = [
  { name: 'YouTube', url: 'https://youtube.com', icon: 'Youtube' },
  { name: 'Facebook', url: 'https://facebook.com/rasalilabs', icon: 'Facebook' },
  { name: 'Instagram', url: 'https://instagram.com/rasalilabs', icon: 'Instagram' },
  { name: 'Phone', url: 'tel:+26772113009', icon: 'Phone' },
  { name: 'Mail', url: 'mailto:contact@rasalilabs.com', icon: 'Mail' }
];
