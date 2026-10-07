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
  { name: 'Mari AI', href: '/mari-ai' },
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
  mariPositioning: 'Mari AI — Your AI Business Growth Partner',
  email: 'contact@rasalilabs.com',
  phone: '+267 72 113 009',
  address: 'Plot 18680 Khuhurutse Drive, Phase 2, Gaborone, Botswana',
  location: 'Gaborone, Botswana',
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
    bookingId: 'film-video',
    items: [
      'Corporate Storytelling & Commercials',
      'High-End Videography & Documentary Projects',
      'Event & Production Coverage',
      'Professional Photography & Visual Content',
      'Motion Graphics, Color Grading & Audio Post-Production'
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
    bookingId: 'web-app-development',
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
    bookingId: 'music-audio',
    items: [
      'Original Music Production & Arrangement',
      'Studio Recording & Session Instrumentation',
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
    bookingId: 'ai-automation',
    items: [
      'AI-Powered Enterprise Workflow Systems',
      'Intelligent Reasoning Agents & LLM Integration',
      'API Integration & Process Automation',
      'Data Pipelines & Custom Business Telemetry',
      'Data Privacy Governance & Security Practices'
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
  mariTagline: 'Mari AI — Your AI Business Growth Partner',
  mariDescription: 'Understands your verified business context, speaks with you naturally, navigates across Ralion workspaces, and turns business data into useful decisions.',
  launchHref: '/ralion',
  exploreHref: '/products/ralion-os',
  demoHref: '/request-demo'
};

export const ralionModules = [
  {
    id: 'mari-ai',
    name: 'Mari AI',
    tagline: 'Your AI Business Growth Partner',
    description: 'Understands verified business context, speaks with you naturally, navigates across Ralion workspaces, and turns business data into useful decisions.',
    href: '/mari-ai',
    badge: 'Flagship AI'
  },
  {
    id: 'crm',
    name: 'Ralion CRM',
    tagline: 'Customer & Pipeline Intelligence',
    description: 'Unified customer records, deal pipeline tracking, interaction timelines, and structured follow-up context.',
    href: '/products/ralion-crm',
    badge: 'Core CRM'
  },
  {
    id: 'growth-studio',
    name: 'Growth Studio',
    tagline: 'AI Creative & Campaign Generation',
    description: 'Automated multi-channel campaign planning, AI commercial poster generation, and short-form video creative workflows.',
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
    tagline: 'Multi-Tenant Security & Isolation',
    description: 'Row-level database security, encrypted token management, immutable audit logs, and sovereign cloud infrastructure.',
    href: '/about#security',
    badge: 'Sovereign Trust'
  }
];

export const featuredProjects = [
  {
    id: 'pula-pitch-2024',
    challenge: "Deliver a consistent visual production workflow across a full television season.",
    solution: "Led videography across 13 episodes, covering set design input, pre-production planning, production capture and post-production.",
    proof: "13-episode production credit with lead videography responsibility.",
    title: 'Pula Pitch',
    subtitle: 'Television & Digital Enterprise Series',
    category: 'Film & Creative Production',
    roles: ['Lead Videography', 'Set Design', 'Pre-Production', 'Post-Production'],
    date: '2024',
    verifiedNote: 'Lead videographer responsible for set design, pre-production, production and post-production across 13 episodes.',
    image: '/assets/images/pula-pitch-logo.jpg',
    description: 'A 13-episode television production delivered across set design, visual production, camera execution and post-production.'
  },
  {
    id: 'dedications-2020',
    challenge: "Support a broadcast music production where performance, studio readiness and artist coordination had to work together.",
    solution: "Performed as bass guitarist while also supporting studio setup and artist management throughout the shoots.",
    proof: "Broadcast production credit spanning musicianship, studio setup and artist coordination.",
    title: 'Dedications',
    subtitle: 'Broadcast Music Production & Studio Sessions',
    category: 'Music & Audio Production',
    roles: ['Bass Guitarist', 'Studio Setup', 'Artist Management'],
    date: '2020',
    verifiedNote: 'Bass guitarist, studio setup and artist management during all shoots.',
    image: '/assets/images/ras-ali-bass-1.jpg',
    description: 'Broadcast music production work spanning live musicianship, studio setup and artist coordination.'
  },
  {
    id: 'melody-gospel-tv-show',
    challenge: "Deliver consistent musical direction and reliable technical sound support across a long-running gospel television production.",
    solution: "Led music direction, rehearsals and performance planning while supporting sound operations and cast/crew coordination across the production.",
    proof: "Production credit from October 2015 to September 2022 as Music Director and Sound Engineer.",
    title: 'The Melody Gospel TV Show',
    subtitle: 'Television Music Direction & Sound Engineering',
    category: 'Music & Audio Production',
    roles: ['Music Director', 'Sound Engineer', 'Rehearsal & Performance Planning', 'Cast & Crew Coordination'],
    date: '2015–2022',
    verifiedNote: 'Music Director and Sound Engineer from October 2015 to September 2022.',
    image: '/assets/images/melody-logo.jpg',
    description: 'Long-running television production work covering music direction, rehearsals, performance planning, technical sound operations and production coordination.'
  },
  {
    id: 'ralion-os-flagship',
    challenge: "Bring fragmented business workflows, customer information, growth activity and AI assistance into one connected operating environment.",
    solution: "Architected and developed Ralion OS with CRM, operations, growth, social workflows, automation and Mari AI as an integrated platform.",
    proof: "Live flagship product developed by Ras Ali Labs and deployed at rasalilabs.com/ralion.",
    title: 'Ralion OS',
    subtitle: 'AI Business Operating System (Flagship Product)',
    category: 'Software & Technology',
    roles: ['Software Architecture', 'Mari AI', 'Full-Stack Development', 'Business Automation'],
    verifiedNote: 'Created and developed by Ras Ali Labs.',
    image: '/assets/images/logo.png',
    description: 'Ras Ali Labs’ flagship AI business operating system, connecting CRM, operations, growth, social workflows and Mari AI in one platform.'
  },
  {
    id: 'pameltex',
    challenge: "Create a clearer digital presence for an industrial business with structured product information and business enquiry needs.",
    solution: "Delivered a responsive corporate platform with product information architecture, enquiry pathways and modern UI/UX.",
    proof: "Publicly accessible production website at pameltex.com.",
    title: 'Pameltex',
    subtitle: 'Industrial Digital Platform',
    category: 'Web & App Development',
    roles: ['Web Engineering', 'Product Information Architecture', 'UI/UX'],
    url: 'https://pameltex.com',
    domain: 'pameltex.com',
    verifiedNote: 'Corporate web platform delivered by Ras Ali Labs.',
    image: '/assets/images/pameltex-logo.png',
    description: 'A responsive corporate digital platform structured around product information, business enquiries and a clearer online presence.'
  },
  {
    id: 'lebvilleboutique',
    challenge: "Create an online retail experience that could present products clearly and support a complete shopping flow.",
    solution: "Built the boutique storefront, product presentation system, responsive shopping experience and payment integration.",
    proof: "Publicly accessible e-commerce website at lebvilleboutique.com.",
    title: 'Lebville Boutique',
    subtitle: 'Fashion E-Commerce Storefront',
    category: 'Web & App Development',
    roles: ['E-Commerce Development', 'Storefront Architecture', 'Payment Integration'],
    url: 'https://lebvilleboutique.com',
    domain: 'lebvilleboutique.com',
    verifiedNote: 'Boutique e-commerce platform delivered by Ras Ali Labs.',
    image: '/assets/images/lebville-logo.png',
    description: 'An online boutique experience combining responsive product presentation, shopping flows and payment integration.'
  },
  {
    id: 'eagle-touch-tours',
    challenge: "Create a clear travel website that presents Victoria Falls experiences and helps visitors move from discovery to booking.",
    solution: "Built a responsive tourism website with structured activity discovery, service information and booking pathways.",
    proof: "Public production website at eagletouchtours.com.",
    title: 'Eagle Touch Tours',
    subtitle: 'Victoria Falls Travel & Tourism Website',
    category: 'Web & App Development',
    roles: ['Web Development', 'Responsive UI', 'Travel Content Architecture', 'Booking Experience'],
    url: 'https://www.eagletouchtours.com',
    domain: 'eagletouchtours.com',
    verifiedNote: 'Public-facing tourism website delivered as part of the Ras Ali Labs portfolio.',
    image: '/assets/images/eagle-touch-logo.png',
    description: 'A travel and tourism website for Victoria Falls experiences, activities and service discovery with clear booking pathways.'
  },
  {
    id: 'bb-travel-tours',
    challenge: "Present a broad catalogue of Victoria Falls activities and travel services in a way that is easy for customers to explore.",
    solution: "Developed a responsive tourism website with activity pages, service information and booking-oriented navigation.",
    proof: "Public production website at bbtraveltours.com.",
    title: 'BB Travel Tours',
    subtitle: 'Victoria Falls Activities & Travel Platform',
    category: 'Web & App Development',
    roles: ['Web Development', 'Responsive UI', 'Tourism Content Architecture', 'Booking Experience'],
    url: 'https://www.bbtraveltours.com',
    domain: 'bbtraveltours.com',
    verifiedNote: 'Public-facing travel website included in the Ras Ali Labs portfolio.',
    image: '/assets/images/bb-travel-logo.jpg',
    description: 'A tourism platform presenting Victoria Falls activities, excursions and travel services with booking-focused customer journeys.'
  },
  {
    id: 'foundations-counselling-academy',
    challenge: "Bring counselling intake, bookings, therapist coordination and client communication into one connected digital workflow.",
    solution: "Developed the public website and connected service workflows spanning intake, booking, client and therapist experiences, administration and messaging automation.",
    proof: "Production service platform for Foundations Counselling Academy at academyfoundations.com.",
    title: 'Foundations Counselling Academy',
    subtitle: 'Counselling Services & Client Operations Platform',
    category: 'Web & App Development',
    roles: ['Web Application Development', 'Client & Therapist Workflows', 'Booking Systems', 'Business Automation'],
    url: 'https://academyfoundations.com',
    domain: 'academyfoundations.com',
    verifiedNote: 'Digital service platform and operational workflow implementation by Ras Ali Labs.',
    image: '/assets/images/service-dev.png',
    description: 'A connected counselling service platform bringing together public information, intake, bookings, therapist coordination and administrative workflows.'
  },
  {
    id: 'pameltech-labs',
    challenge: "Present intelligent systems, automation and software engineering work as a coherent technology offering for African organisations.",
    solution: "Contributed full-stack engineering, DevOps and digital systems work across the Pameltech Labs public platform and technology initiatives.",
    proof: "Public platform at pameltechlabs.com; Alpheaus Chiwaze is publicly listed as MD · Full Stack Developer · DevOps.",
    title: 'Pameltech Labs',
    subtitle: 'Intelligent Systems & Software Engineering',
    category: 'Software & Technology',
    roles: ['Full-Stack Development', 'DevOps', 'AI Systems', 'Platform Engineering'],
    url: 'https://pameltechlabs.com',
    domain: 'pameltechlabs.com',
    verifiedNote: 'Alpheaus Chiwaze is publicly listed by Pameltech Labs as MD · Full Stack Developer · DevOps.',
    image: '/assets/images/service-branding.png',
    description: 'Technology work spanning intelligent systems, workflow automation, software engineering, cloud infrastructure and business platforms.'
  },
  {
    id: 'peregrine-systems',
    challenge: "Turn a corporate identity into a clean, credible digital interface.",
    solution: "Developed the visual identity direction and web portal experience around clarity, usability and professional presentation.",
    proof: "Delivered brand identity and digital portal work by Ras Ali Labs.",
    title: 'Peregrine Systems',
    subtitle: 'Brand Identity & Digital Web Portal',
    category: 'Web & App Development',
    roles: ['Visual Identity', 'Web Development', 'Interface Design'],
    verifiedNote: 'Brand identity and digital portal work by Ras Ali Labs.',
    image: '/assets/images/peregrine-logo.png',
    description: 'A corporate identity and digital interface project focused on clarity, usability and a modern public-facing presence.'
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
      '100 AI Monthly Credits for Mari',
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
      'AI Commercial Poster Studio',
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
      'AI Commercial Video Generation',
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
      'Dedicated Engineering Support',
      'Custom SLA & Audit Telemetry'
    ],
    ctaText: 'Talk to Sales',
    ctaHref: '/request-demo',
    popular: false,
  }
];

export const services = [
  {
    id: 'film-video',
    numericId: 1,
    title: 'Film & Creative Production',
    description: 'Cinematic films, corporate storytelling, commercials, interviews, event coverage, photography, motion graphics and post-production.',
    href: '/services/film-video',
    items: [
      'Commercials & Brand Storytelling',
      'Broadcast & Production Filming',
      'Post-Production, Color Grading & Sound',
      'Event Visual Coverage'
    ]
  },
  {
    id: 'web-app-development',
    numericId: 2,
    title: 'Web & App Development',
    description: 'Modern websites, mobile applications, business platforms, portals, e-commerce systems and custom digital products.',
    href: '/services/web-app-development',
    items: [
      'Custom Web Applications & Portals',
      'Cross-Platform iOS & Android Apps',
      'Responsive Layouts & Interface Systems',
      'API Architecture & Cloud Infrastructure'
    ]
  },
  {
    id: 'music-audio',
    numericId: 3,
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
    id: 'ai-automation',
    numericId: 4,
    title: 'AI & Automation Systems',
    description: 'AI-powered business systems, workflow automation, intelligent integrations and enterprise digital transformation.',
    href: '/services/ai-automation',
    items: [
      'Autonomous Workflow Automation',
      'Embedded AI Reasoning & LLM Systems',
      'Enterprise System Integration & APIs',
      'Data Privacy Governance & Security'
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
    capabilities: ['Policyholder Vault', 'Body Intake & QR Tracking', 'Fleet & Mortuary Schedule', 'Automated Claims Workflows']
  },
  {
    id: 'logistics',
    name: 'Ralion Logistics OS',
    tagline: 'Cross-Border Fleet Telemetry & Waybill Automation',
    description: 'Freight routing, driver dispatching, border clearance document generation, fuel monitoring, and live cross-border tracking across the SADC corridor.',
    href: '/industries#logistics',
    capabilities: ['Live Fleet Telemetry', 'Digital Waybills & PODs', 'Customs Document Engine', 'Fuel & Maintenance Logs']
  },
  {
    id: 'healthcare',
    name: 'Ralion Healthcare OS',
    tagline: 'Clinical Practice Operations & Patient Records',
    description: 'Patient scheduling, electronic medical records, consultation billing, automated pharmacy dispensing alerts, and sovereign health data protection.',
    href: '/industries#healthcare',
    capabilities: ['Electronic Health Records', 'Clinical Billing Gateway', 'Patient Consultation Portal', 'Prescription Tracking']
  },
  {
    id: 'trade',
    name: 'Ralion Trade OS',
    tagline: 'B2B SADC Corridor Procurement & Settlement',
    description: 'Cross-border B2B trade network connecting suppliers, verified buyers, and logistics providers with automated invoicing and trade finance tracking.',
    href: '/industries#trade',
    capabilities: ['Supplier Verification', 'B2B Order Catalog', 'Cross-Border Invoicing', 'Trade Settlement Tracking']
  },
  {
    id: 'government',
    name: 'Ralion Government OS',
    tagline: 'Citizen Services & Secure Public Infrastructure',
    description: 'Sovereign digital public infrastructure, registry automation, citizen identity verification, and inter-departmental record exchange with full auditability.',
    href: '/industries#government',
    capabilities: ['Citizen Portal & USSD', 'Inter-Agency Ledger', 'Document Verification Vault', 'Audit Telemetry']
  }
];

export const faqs = [
  {
    question: 'What is Ras Ali Labs?',
    answer: 'Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company. We build intelligent software systems, develop web and mobile applications, produce cinematic films and visual content, and create original music and audio.'
  },
  {
    question: 'What is Ralion OS and how does it relate to Ras Ali Labs?',
    answer: 'Ralion OS is the flagship technology product created and developed by Ras Ali Labs. It is an AI Business Operating System that unifies CRM, business operations, growth intelligence, and Mari AI into one connected platform.'
  },
  {
    question: 'What creative and media production services do you provide?',
    answer: 'We offer full-cycle film and video production (commercials, documentaries, corporate storytelling, event coverage), professional photography, motion graphics, original music composition, studio recording, and sound design.'
  },
  {
    question: 'What technology and software services do you build?',
    answer: 'We build modern web applications, mobile apps (iOS & Android), custom enterprise portals, business automation workflows, AI reasoning integrations, and sovereign digital infrastructure.'
  },
  {
    question: 'Where is Ras Ali Labs located and how can we collaborate?',
    answer: 'Ras Ali Labs is located in Gaborone, Botswana (Plot 18680 Khuhurutse Drive, Phase 2). You can start a project by contacting us through our website, emailing contact@rasalilabs.com, or calling +267 72 113 009.'
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
    status: 'Enterprise System'
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
    category: 'Videography & Post-Production'
  },
  {
    year: '2020',
    title: 'Dedications Music Broadcast',
    organization: 'Live Music Series',
    category: 'Studio Instrumentation & Setup'
  }
];

export const socialLinks = [
  { name: 'Facebook', url: 'https://facebook.com/rasalilabs', icon: 'Facebook' },
  { name: 'Instagram', url: 'https://instagram.com/rasalilabs', icon: 'Instagram' },
  { name: 'GitHub', url: 'https://github.com/rasali535', icon: 'Github' },
  { name: 'Phone', url: 'tel:+26772113009', icon: 'Phone' },
  { name: 'Mail', url: 'mailto:contact@rasalilabs.com', icon: 'Mail' }
];
