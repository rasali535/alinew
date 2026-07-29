import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug } from '../data/products';
import { getAllReleases } from '../data/releases';
import { analytics } from '../lib/analytics';
import { triggerBinaryDownload } from '../lib/downloadValidator';
import SEO from '../components/common/SEO';
import {
  Cpu,
  Sparkles,
  Globe,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  Database,
  Layers,
  BarChart3,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Briefcase,
  Download,
  Share2,
  TrendingUp,
  Truck,
  Activity,
  Monitor,
  Check,
  Building2,
  MessageSquare,
  Search,
  Users,
  FileText,
  DollarSign
} from 'lucide-react';

const iconMap = {
  Briefcase: Briefcase,
  Share2: Share2,
  TrendingUp: TrendingUp,
  Truck: Truck,
  Activity: Activity,
  Globe: Globe,
  Bot: Bot,
  Building2: Building2
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = getProductBySlug(slug || 'ralion');
  const [releases, setReleases] = useState(getAllReleases());

  const isRalion = product.slug === 'ralion';

  useEffect(() => {
    analytics.trackProductVisit(product.slug);
  }, [product.slug]);

  const handleDownload = (rel) => {
    analytics.trackDownload(rel.platform, rel.version || '2.4.1', 'Ralion OS');
    triggerBinaryDownload(rel.downloadUrl, rel.filename);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      {/* SEO Head Tags */}
      <SEO
        title="Ralion OS — The AI Business Operating System | Ras Ali Labs"
        description="Empower your organization with intelligent workflows, automation, and AI-driven insights with Ralion OS. Designed for modern business operations, Funeral OS, Logistics OS, Health OS, and Trade OS."
      />

      {/* Dynamic Background Blur */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-brand-gold/15 via-purple-500/10 to-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-white transition-colors">Products</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">{product.name}</span>
        </div>

        {/* Section 4: Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles size={14} /> Enterprise AI Business Operating System
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              Ralion OS — The AI Business Operating System
            </h1>

            <p className="text-brand-gold font-bold text-lg md:text-xl mb-6">
              "Run your business with an AI-powered operating system."
            </p>

            <p className="text-white/70 text-lg leading-relaxed mb-8 font-normal">
              Empower your organization with intelligent workflows, automation, and AI-driven insights. Ralion combines business operations, automation, and artificial intelligence into one platform.
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                to="/contact"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                Request Demo <ArrowRight size={16} />
              </Link>

              <Link
                to="/solutions"
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
              >
                Explore Solutions
              </Link>

              <Link
                to="/downloads/ralion"
                className="px-6 py-4 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-sm hover:bg-purple-600/30 transition-all border border-purple-500/30 flex items-center gap-2"
              >
                <Download size={16} /> Download Community Edition
              </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6">
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <div className="text-lg font-extrabold text-brand-gold">99.99%</div>
                <div className="text-[11px] text-white/50 font-medium">System Availability</div>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <div className="text-lg font-extrabold text-brand-gold">Real-time</div>
                <div className="text-[11px] text-white/50 font-medium">Workflow Automation</div>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <div className="text-lg font-extrabold text-brand-gold">4 Core OS</div>
                <div className="text-[11px] text-white/50 font-medium">Industry Solutions</div>
              </div>
              <div className="bg-black/30 p-3.5 rounded-xl border border-white/5">
                <div className="text-lg font-extrabold text-brand-gold">Enterprise</div>
                <div className="text-[11px] text-white/50 font-medium">Security & RLS</div>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#252525] border border-white/10 p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-white/40 text-xs font-mono">Ralion OS • Enterprise Dashboard</div>
              </div>

              <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
                      R
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Ralion Enterprise OS</h4>
                      <p className="text-white/40 text-xs">Mari AI Engine Connected</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    System Active
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Business Operations:</span>
                    <span className="text-brand-gold font-bold">CRM • Tasks • Billing</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Mari AI Assistant:</span>
                    <span className="text-purple-400 font-bold">Reasoning Active</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Industry Suite:</span>
                    <span className="text-white">Funeral, Logistics, Health, Trade</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Feature Sections (Business Operations & Mari AI) */}
        <div className="mb-24 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Enterprise Features
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Core Business Operations
            </h2>
            <p className="text-white/60 text-base">
              Ralion unifies every aspect of enterprise operations into a single intelligent platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6">
                <Briefcase size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">CRM & Customers</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Complete customer relationship management with deal pipelines, interaction histories, and automated contact management.
              </p>
              <ul className="space-y-1.5 text-xs text-white/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Contact Directory</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Deal Pipelines</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Customer Portals</li>
              </ul>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6">
                <FileText size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Tasks & Documents</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Track team projects, milestones, task assignments, and store enterprise documents in a secure vault.
              </p>
              <ul className="space-y-1.5 text-xs text-white/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Project Milestones</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Task Delegation</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Encrypted Vault</li>
              </ul>
            </div>

            <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
              <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6">
                <DollarSign size={24} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Billing & Reports</h3>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                Generate quotations, invoices, track payment status, and export executive operational performance reports.
              </p>
              <ul className="space-y-1.5 text-xs text-white/70">
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Invoicing & Billing</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Executive Reports</li>
                <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold shrink-0" /> Revenue Analytics</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Section 6: Mari AI Differentiator Section */}
        <div className="mb-24 bg-gradient-to-br from-purple-900/20 via-[#252525] to-black border border-purple-500/30 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Bot size={16} /> Core Differentiator
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
              Mari AI — Your Intelligent Business Assistant
            </h2>
            <p className="text-white/80 text-lg leading-relaxed">
              "Mari AI is your intelligent business assistant that understands your operations, documents, and workflows."
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {product.mariAI?.capabilities.map((cap, idx) => (
              <div key={idx} className="bg-black/50 border border-purple-500/20 p-6 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                  <Sparkles size={18} />
                </div>
                <h4 className="text-base font-bold text-white mb-2">{cap.title}</h4>
                <p className="text-white/60 text-xs leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Industry Solutions Section (Funeral OS, Logistics OS, Health OS, Trade OS) */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Tailored Industry Suites
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Purpose-Built Industry OS
            </h2>
            <p className="text-white/60 text-base">
              Pre-configured operating systems engineered for specific industry verticals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {product.industryOS?.map((os) => {
              const IconComp = iconMap[os.icon] || Building2;
              return (
                <div
                  key={os.id}
                  className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <IconComp size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{os.name}</h3>
                      <p className="text-brand-gold text-xs font-medium">{os.target}</p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-white/10 pt-4">
                    {os.modules.map((mod, mIdx) => (
                      <div key={mIdx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{mod}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-[#252525] border border-white/10 rounded-3xl p-12 shadow-2xl">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Ready to Transform Your Business Operations?
          </h2>
          <p className="text-white/60 text-base max-w-xl mx-auto mb-8">
            Experience Ralion OS. Empower your team with intelligent workflows, automation, and Mari AI.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              to="/contact"
              className="py-4 px-8 rounded-xl bg-brand-gold text-black font-bold text-sm hover:scale-105 transition-transform"
            >
              Request Enterprise Demo
            </Link>
            <Link
              to="/downloads/ralion"
              className="py-4 px-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all"
            >
              Download Community Edition
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
