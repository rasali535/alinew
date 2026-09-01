import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import HeroSection from '../components/sections/HeroSection';
import { ralionModules, industryOperatingSystems, pricingPlans, faqs } from '../data/mock';
import {
  ArrowRight,
  Sparkles,
  Bot,
  Zap,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  Database,
  CheckCircle2,
  Lock,
  Compass,
  BarChart3,
  Share2,
  Workflow,
  ChevronRight
} from 'lucide-react';

const Home = () => {
  return (
    <>
      <SEO
        title="Ras Ali Labs | Ralion OS — Empowered to Prosper"
        description="Ras Ali Labs builds AI Business Operating Systems that combine intelligent automation, data, business workflows, social intelligence, growth tools and enterprise infrastructure."
        url="/"
      />

      {/* 1. HERO SECTION */}
      <HeroSection />

      {/* 2. WHAT RALION IS */}
      <section className="py-20 px-6 lg:px-12 bg-[#141414] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
                <Sparkles size={12} /> The Operating System Standard
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                One Intelligent Workspace for Your Entire Business
              </h2>
              <p className="text-white/70 text-base md:text-lg leading-relaxed mb-6">
                Most companies operate across fragmented silos: separate CRM software, disconnected marketing schedulers, manual reporting spreadsheets, and standalone AI chatbots.
              </p>
              <p className="text-white/70 text-base leading-relaxed mb-8">
                <strong className="text-brand-gold">RALION OS</strong> changes this completely. It brings your business operations, customer relationships, multi-channel growth, AI creative generation, and executive decision-making into one unified, permission-aware environment.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="text-brand-gold shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-sm text-white">Unified Data & Pipeline</h4>
                    <p className="text-xs text-white/60">Single source of truth for all leads, deals, and interactions.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="text-brand-gold shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-sm text-white">Embedded Mari AI</h4>
                    <p className="text-xs text-white/60">Executive AI partner with deep context on your business data.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="text-brand-gold shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-sm text-white">Closed-Loop Growth</h4>
                    <p className="text-xs text-white/60">AI plans, generates creatives, publishes, and analyzes results.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <CheckCircle2 className="text-brand-gold shrink-0 mt-0.5" size={18} />
                  <div>
                    <h4 className="font-bold text-sm text-white">Sovereign Isolation</h4>
                    <p className="text-xs text-white/60">Bank-grade tenant security and private knowledge vaults.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Graphic Representation */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-brand-gold/10 to-purple-600/10 rounded-3xl blur-2xl"></div>
              <div className="relative bg-[#1a1a1a] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    <span className="text-xs font-mono text-white/40 ml-2">ralion-os://command-center</span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">Live Active</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-gold/20 flex items-center justify-center text-brand-gold font-bold text-xs">
                        M
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Mari AI Growth Partner</div>
                        <div className="text-[11px] text-white/50">Analyzing customer conversion trends & recommending campaign</div>
                      </div>
                    </div>
                    <span className="text-xs text-brand-gold font-mono font-bold">+28% Growth</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                      <div className="text-[10px] uppercase font-bold text-white/40 mb-1">CRM Pipeline</div>
                      <div className="text-lg font-bold text-white">$148,200</div>
                      <div className="text-[10px] text-emerald-400">14 qualified deals active</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-black/30 border border-white/5">
                      <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Social Reach</div>
                      <div className="text-lg font-bold text-white">48.6K</div>
                      <div className="text-[10px] text-purple-400">Multi-channel auto scheduled</div>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-gradient-to-r from-brand-gold/10 to-amber-500/10 border border-brand-gold/20">
                    <div className="text-xs font-bold text-brand-gold mb-1">Ralion OS Promise: Empowered to Prosper</div>
                    <p className="text-xs text-white/70">Autonomous intelligence designed to eliminate administrative friction so African and global businesses can prosper.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RALION PLATFORM MODULES */}
      <section className="py-20 px-6 lg:px-12 bg-[#181818] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Layers size={12} /> The Ralion Ecosystem
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Integrated Capabilities. Zero Disconnection.
            </h2>
            <p className="text-white/70 text-base md:text-lg">
              Explore the core architectural components that power Ralion OS.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ralionModules.map((module) => (
              <div
                key={module.id}
                className="bg-[#1e1e1e] border border-white/10 hover:border-brand-gold/40 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium">
                      {module.badge}
                    </span>
                    <Sparkles size={16} className="text-brand-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-brand-gold transition-colors">
                    {module.name}
                  </h3>
                  <div className="text-xs font-semibold text-brand-gold/90 mb-3">{module.tagline}</div>
                  <p className="text-white/65 text-xs leading-relaxed mb-6">
                    {module.description}
                  </p>
                </div>
                <Link
                  to={module.href}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80 group-hover:text-brand-gold transition-colors"
                >
                  Explore Component <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MEET MARI AI */}
      <section className="py-20 px-6 lg:px-12 bg-gradient-to-b from-[#141414] to-[#181818] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
                <Bot size={14} /> Embedded Intelligence
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                Mari AI — Your AI Business Growth Partner
              </h2>
              <p className="text-white/70 text-base leading-relaxed mb-6">
                Mari AI is not just a chatbot. Mari is an executive business partner embedded directly inside your Ralion workspace.
              </p>
              <p className="text-white/70 text-base leading-relaxed mb-8">
                Operating within your tenant-scoped business context and permission boundaries, Mari continuously analyzes pipeline momentum, recommends revenue strategies, plans growth campaigns, and directs automated creative generation.
              </p>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Strategic growth recommendations based on your actual business data</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Automated creative briefs and multi-channel campaign planning</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
                  <span>Private, tenant-isolated knowledge ingestion (zero public training)</span>
                </div>
              </div>
              <Link
                to="/products/ralion-mari-ai"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-lg shadow-purple-600/20"
              >
                Meet Mari AI <ArrowRight size={14} />
              </Link>
            </div>

            {/* Mari AI Interactive Showcase Mockup */}
            <div className="lg:col-span-7 bg-[#1c1c1c] border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white">
                    M
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">Mari AI Growth Assistant</h4>
                    <p className="text-[11px] text-purple-400 font-medium">Active • Connected to Organization Vault</p>
                  </div>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">Executive Level</span>
              </div>

              <div className="space-y-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-white/90">
                  <div className="font-bold text-brand-gold mb-1">Mari Strategic Brief:</div>
                  "I analyzed your last 30 days of pipeline performance. Your funeral policy registrations converted 34% higher when paired with WhatsApp automated reminders. I have prepared a 3-part educational campaign and drafted FLUX commercial creatives for your approval."
                </div>

                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white">Recommended Action: Launch Growth Reel</span>
                    <span className="text-[10px] text-purple-400">Estimated Impact: +18% Inquiries</span>
                  </div>
                  <p className="text-white/70 text-[11px] mb-3">FLUX poster generated • CogVideoX 6-second reel ready • Social schedule: Tue & Thu 09:00 CAT.</p>
                  <div className="flex gap-2">
                    <button className="px-3 py-1.5 rounded-lg bg-brand-gold text-black font-bold text-[11px]">Approve & Schedule</button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-medium text-[11px]">Customize Brief</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. MARI + GROWTH + SOCIAL CLOSED LOOP ENGINE */}
      <section className="py-20 px-6 lg:px-12 bg-[#141414] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <TrendingUp size={12} /> The Closed-Loop Advantage
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              The Self-Optimizing Growth Engine
            </h2>
            <p className="text-white/70 text-base md:text-lg">
              Unlike generic schedulers or standalone chatbots, Ralion OS creates an end-to-end feedback loop that continuously drives revenue.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative">
              <div className="w-8 h-8 rounded-full bg-brand-gold/20 text-brand-gold font-bold flex items-center justify-center text-xs mb-4">
                01
              </div>
              <h3 className="font-bold text-base text-white mb-2">Business Ingestion</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Mari AI learns your brand offerings, pricing catalogs, target customer profiles, and historic deal performance.
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-xs mb-4">
                02
              </div>
              <h3 className="font-bold text-base text-white mb-2">Creative Generation</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Growth Studio generates studio-grade FLUX commercial images and CogVideoX videos tailored to your specific audience.
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs mb-4">
                03
              </div>
              <h3 className="font-bold text-base text-white mb-2">Multi-Channel Publish</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Content is scheduled and distributed across Facebook, Instagram, LinkedIn, and X from a single command queue.
              </p>
            </div>

            <div className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center text-xs mb-4">
                04
              </div>
              <h3 className="font-bold text-base text-white mb-2">Analytics & Learning</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Engagement and lead conversions feed back into Mari AI to automatically refine and optimize your next campaign.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. INDUSTRY OPERATING SYSTEMS */}
      <section className="py-20 px-6 lg:px-12 bg-[#181818] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
                <Compass size={12} /> Specialized Industry Architectures
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                Ralion Industry Operating Systems
              </h2>
            </div>
            <Link
              to="/industries"
              className="text-brand-gold text-xs font-bold flex items-center gap-1.5 hover:underline"
            >
              Explore All 5 Industry Suites <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {industryOperatingSystems.slice(0, 3).map((ind) => (
              <div key={ind.id} className="bg-[#141414] p-6 rounded-2xl border border-white/10 hover:border-brand-gold/40 transition-all flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-2">{ind.name}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{ind.tagline}</h3>
                  <p className="text-xs text-white/65 leading-relaxed mb-6">{ind.description}</p>
                  <div className="space-y-1.5 mb-6">
                    {ind.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/75">
                        <div className="w-1 h-1 rounded-full bg-brand-gold"></div>
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                  <span className="text-xs font-mono text-emerald-400 font-bold">{ind.metrics}</span>
                  <Link to={ind.href} className="text-xs font-bold text-white/80 hover:text-brand-gold flex items-center gap-1">
                    Details <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. ENTERPRISE SECURITY */}
      <section className="py-20 px-6 lg:px-12 bg-[#141414] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
                <ShieldCheck size={14} /> Zero-Trust Security Standard
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6 leading-tight">
                Bank-Grade Multi-Tenant Isolation
              </h2>
              <p className="text-white/70 text-base leading-relaxed mb-6">
                Ralion OS is built with strict multi-tenant isolation at its core. Your enterprise data is cryptographically protected and tenant-scoped.
              </p>
              <div className="space-y-4 mb-8">
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-sm text-white mb-1">Strict Row-Level Database Security</h4>
                  <p className="text-xs text-white/60">Tenant data isolation is enforced at the database layer with cryptographic workspace bounds.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-sm text-white mb-1">Server-Side Token & Secret Management</h4>
                  <p className="text-xs text-white/60">Social tokens and API keys are encrypted at rest and never exposed to browser runtimes.</p>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="font-bold text-sm text-white mb-1">Immutable Audit Logging</h4>
                  <p className="text-xs text-white/60">Complete audit trail for billing transitions, credit allocations, and security actions.</p>
                </div>
              </div>
            </div>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-3xl p-8 relative">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-6">
                <Lock className="text-brand-gold" size={20} />
                <div>
                  <h4 className="font-bold text-sm text-white">Sovereign Cloud & Security Telemetry</h4>
                  <p className="text-xs text-white/50">Botswana Data Protection Act (Act 32) & BOCRA Compliant</p>
                </div>
              </div>
              <div className="space-y-3 font-mono text-xs text-white/70">
                <div className="p-3 rounded-lg bg-black/50 border border-white/5 flex justify-between">
                  <span>Tenant Isolation Mode:</span>
                  <span className="text-emerald-400">CRYPTOGRAPHIC_SCOPED</span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/5 flex justify-between">
                  <span>Secret Storage:</span>
                  <span className="text-emerald-400">SERVER_ENCRYPTED_VAULT</span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/5 flex justify-between">
                  <span>Audit Trail Integrity:</span>
                  <span className="text-emerald-400">VERIFIED_IMMUTABLE</span>
                </div>
                <div className="p-3 rounded-lg bg-black/50 border border-white/5 flex justify-between">
                  <span>Live Billing Gateway:</span>
                  <span className="text-brand-gold">PAYPAL_LIVE_VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. PRICING SECTION */}
      <section className="py-20 px-6 lg:px-12 bg-[#181818] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Zap size={12} /> Transparent Commercial Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              Simple, Predictable Plans for Every Stage
            </h2>
            <p className="text-white/70 text-base md:text-lg">
              Start free or scale with live subscription billing. All paid plans include full Ralion OS suite access and monthly AI credits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                  plan.popular
                    ? 'bg-gradient-to-b from-[#222] to-[#181818] border-2 border-brand-gold shadow-xl shadow-brand-gold/10'
                    : 'bg-[#141414] border border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="text-xs text-white/50 mb-4">{plan.tagline}</div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-extrabold text-white">${plan.priceUsd}</span>
                    <span className="text-xs text-white/50">/ month</span>
                  </div>
                  <div className="inline-block px-2.5 py-1 rounded-lg bg-brand-gold/15 text-brand-gold text-xs font-bold mb-6">
                    {plan.monthlyCredits.toLocaleString()} AI Credits / mo
                  </div>
                  <div className="space-y-2.5 mb-8 text-xs text-white/75">
                    {plan.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={plan.ctaHref}
                  className={`w-full py-3 rounded-xl font-bold text-xs text-center transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black hover:scale-105 shadow-md shadow-brand-gold/20'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  {plan.ctaText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. FAQ SECTION */}
      <section className="py-20 px-6 lg:px-12 bg-[#141414] text-white border-t border-white/10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3">Frequently Asked Questions</h2>
            <p className="text-white/60 text-sm">Everything you need to know about Ralion OS and Mari AI.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-[#1a1a1a] border border-white/10">
                <h4 className="font-bold text-sm text-white mb-2">{faq.question}</h4>
                <p className="text-xs text-white/70 leading-relaxed">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FINAL CALL TO ACTION */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-r from-[#181818] via-brand-gold/10 to-[#181818] text-white border-t border-white/10 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
            Empowered to Prosper
          </div>
          <h2 className="text-3xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            Ready to Run Your Business on Ralion OS?
          </h2>
          <p className="text-white/75 text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-10">
            Join forward-thinking companies automating their operations, empowering their teams, and scaling with Mari AI.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ralion/register"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2"
            >
              Start Ralion Free <ArrowRight size={16} />
            </Link>
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/15"
            >
              Book an Enterprise Walkthrough
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
