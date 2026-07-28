import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
  BookOpen,
  Search,
  Cpu,
  Bot,
  Layers,
  ChevronRight,
  UserCheck,
  Briefcase,
  Database,
  Truck,
  HeartPulse,
  Globe,
  TrendingUp,
  Code
} from 'lucide-react';

const Docs = () => {
  const [activeCategory, setActiveCategory] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const docSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      articles: [
        {
          title: 'Creating your Ras Ali Labs SSO Account',
          desc: 'Sign up once to access Ralion OS, Mari AI, and all ecosystem platforms.',
          content: 'Go to rasalilabs.com/products/ralion and click Start Free. Your Supabase account gives you single sign-on access across desktop and web.'
        },
        {
          title: 'Setting up your Organization Tenant',
          desc: 'Configure enterprise organization name, country, and team seats.',
          content: 'During onboarding at rasalilabs.com/onboarding, specify your company name and industry. Supabase RLS isolates your tenant database automatically.'
        },
        {
          title: 'Inviting Team Members & Setting Roles',
          desc: 'Role-based access control (RBAC) for admins, managers, and team seats.',
          content: 'Navigate to Ralion > Ecosystem Settings > Team Members and enter colleague email addresses.'
        }
      ]
    },
    {
      id: 'ralion-core',
      title: 'Ralion Core Modules',
      icon: Cpu,
      articles: [
        {
          title: 'CRM & Lead Pipelines',
          desc: 'Manage contact records, deal stages, and interaction histories.',
          content: 'Access /ralion/crm to view inbound deals, move leads across stage columns, and track customer relationships.'
        },
        {
          title: 'Projects & Task Workspaces',
          desc: 'Sprint boards, task assignments, and milestone tracking.',
          content: 'Create project boards, set due dates, assign team members, and monitor delivery progress.'
        },
        {
          title: 'Document Vault & Storage',
          desc: 'Encrypted cloud document storage backed by Supabase PostgreSQL.',
          content: 'Upload contracts, invoices, and design assets securely with vector embedding for semantic search.'
        }
      ]
    },
    {
      id: 'mari-ai',
      title: 'Mari AI Assistant',
      icon: Bot,
      articles: [
        {
          title: 'How to use Mari AI Assistant',
          desc: 'Interact with Mari AI in natural language across documents and CRM records.',
          content: 'Open Mari AI Reasoning Studio at /ralion/mari-ai or click the Chatbot widget to ask questions about your business data.'
        },
        {
          title: 'Effective AI Prompts & Engineering',
          desc: 'Best practices for document summarization, extraction, and synthesis.',
          content: 'Use specific context: "Extract key agreement terms from attached PDF" or "Summarize Q3 lead conversions by sector".'
        },
        {
          title: 'Connecting Vector Knowledge Bases',
          desc: 'Index PDFs, SQL schemas, and guidelines into pgvector for RAG search.',
          content: 'Upload documents to the knowledge vault; Mari AI will automatically generate vector embeddings for zero-hallucination answers.'
        }
      ]
    },
    {
      id: 'industry-modules',
      title: 'Industry Modules',
      icon: Layers,
      articles: [
        {
          title: 'Growth Module',
          desc: 'Lead generation, automated email sequences, and lifecycle marketing.',
          content: 'Configure growth triggers at /products/ralion to run automated customer onboarding sequences.'
        },
        {
          title: 'Logistics Module',
          desc: 'Fleet telemetry, shipments, border delay forecasting, and inventory.',
          content: 'Track SADC transport corridors, customs clearance statuses, and vehicle telemetry.'
        },
        {
          title: 'Health Module',
          desc: 'Client case files, appointment scheduling, and consultation records.',
          content: 'Manage wellness clinic appointments, patient case histories, and practitioner calendars.'
        },
        {
          title: 'Trade Module',
          desc: 'Cross-border B2B escrow, KYB supplier verification, and trade financing.',
          content: 'Verify cross-border supplier credentials and manage escrow-backed trade settlements.'
        }
      ]
    }
  ];

  const currentSection = docSections.find((s) => s.id === activeCategory) || docSections[0];

  const filteredArticles = currentSection.articles.filter(
    (a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Documentation & Developer Guides | Ras Ali Labs"
        description="Searchable documentation portal for Ralion Core, Mari AI, and Industry Modules."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header Search */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
            Documentation Portal
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Ralion Knowledge & Guides
          </h1>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
            <input
              type="text"
              placeholder="Search documentation (e.g., Mari AI prompts, CRM, RLS setup)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#252525] border border-white/15 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white focus:outline-none focus:border-brand-gold shadow-xl"
            />
          </div>
        </div>

        {/* Documentation Sidebar & Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-3 space-y-2 bg-[#252525] border border-white/10 p-4 rounded-3xl h-fit">
            <div className="px-3 py-2 text-white/40 text-[10px] font-bold uppercase tracking-wider">
              Documentation Topics
            </div>
            {docSections.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeCategory === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveCategory(sec.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-brand-gold text-black shadow-md shadow-brand-gold/10'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} /> {sec.title}
                </button>
              );
            })}
          </div>

          {/* Content Panel */}
          <div className="lg:col-span-9 space-y-6">
            {filteredArticles.map((article, idx) => (
              <div key={idx} className="bg-[#252525] border border-white/10 p-8 rounded-3xl shadow-xl">
                <h3 className="text-xl font-bold text-white mb-2">{article.title}</h3>
                <p className="text-brand-gold text-xs font-semibold mb-4">{article.desc}</p>
                <div className="bg-black/50 border border-white/10 p-5 rounded-2xl text-xs text-white/80 leading-relaxed font-sans">
                  {article.content}
                </div>
              </div>
            ))}

            {filteredArticles.length === 0 && (
              <div className="bg-[#252525] border border-white/10 p-12 rounded-3xl text-center text-white/50 text-sm">
                No matching documentation articles found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Docs;
