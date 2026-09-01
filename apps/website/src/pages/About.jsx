import React from 'react';
import SEO from '../components/common/SEO';
import { companyInfo } from '../data/mock';
import { Sparkles, ShieldCheck, Cpu, Layers, ArrowRight, Building2, Globe2, Bot, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
  return (
    <section className="min-h-screen bg-[#181818] relative overflow-hidden pt-32 pb-24 text-white">
      <SEO
        title="About Ras Ali Labs | African Enterprise AI Technology Company"
        description="Ras Ali Labs is an African enterprise AI technology company based in Gaborone, Botswana. We build intelligent business operating systems and sovereign infrastructure."
        url="/about"
      />

      {/* Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-gold/15 via-purple-600/10 to-transparent blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        {/* Hero Section */}
        <div className="mb-24 mt-4 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 mb-6 text-xs text-brand-gold font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-brand-gold" />
            <span>Empowered to Prosper</span>
          </div>

          <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight max-w-4xl">
            Building Intelligent Systems for the Next Generation of Enterprises
          </h1>

          <p className="text-white/70 text-lg md:text-xl max-w-3xl font-normal leading-relaxed">
            “We don't build isolated software tools. We build intelligent systems that become part of how organizations operate.”
          </p>
        </div>

        {/* Narrative & Founder Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-5 relative group">
            <div className="absolute -inset-2 bg-gradient-to-tr from-brand-gold/20 to-purple-600/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-80 transition duration-700"></div>
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#141414] border border-white/10 shadow-2xl">
              <img
                src="/assets/images/ras-ali-formal.jpg"
                alt="Ras Ali"
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-all duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-8 left-8 right-8">
                <h3 className="text-2xl font-bold text-white mb-1">Ras Ali</h3>
                <p className="text-brand-gold text-xs font-semibold uppercase tracking-wider">Chief Systems Architect & Founder</p>
                <p className="text-white/60 text-xs mt-1">Ras Ali Labs (Pty) Ltd • Gaborone, Botswana</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 lg:pl-6 space-y-8">
            <div className="space-y-4">
              <div className="text-xs font-bold text-brand-gold uppercase tracking-wider">Our Origin & Vision</div>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                African Innovation. Sovereign Infrastructure.
              </h2>
              <p className="text-white/70 text-base leading-relaxed">
                Headquartered in <strong>Gaborone, Botswana 🇧🇼</strong>, Ras Ali Labs was founded on the principle that modern enterprises need unified operating intelligence, not disconnected software silos.
              </p>
              <p className="text-white/70 text-base leading-relaxed">
                Our flagship platform, <strong className="text-brand-gold">RALION OS</strong>, was engineered to bring business operations, customer pipelines, AI growth strategies, and automated creative generation under one roof. Powered by <strong>Mari AI</strong>, our systems empower organizations across Africa and worldwide to eliminate friction, automate decisions, and prosper.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-[#141414] border border-white/10 p-5 rounded-2xl">
                <Cpu className="w-6 h-6 text-brand-gold mb-3" />
                <h4 className="text-white font-bold text-sm mb-1">Proprietary AI Operating Systems</h4>
                <p className="text-white/60 text-xs leading-relaxed">Architecting complete business environments rather than disposable apps.</p>
              </div>
              <div className="bg-[#141414] border border-white/10 p-5 rounded-2xl">
                <Lock className="w-6 h-6 text-emerald-400 mb-3" />
                <h4 className="text-white font-bold text-sm mb-1">Sovereign Data Governance</h4>
                <p className="text-white/60 text-xs leading-relaxed">Strict tenant isolation compliant with the Botswana Data Protection Act (Act 32).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Our Technology Pillars</h2>
            <p className="text-white/60 text-xs">How we design and deploy business operating systems.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#141414] border border-white/10">
              <Bot className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-bold text-base text-white mb-2">Embedded AI Partners</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                We embed AI reasoning directly inside core workflows, making assistants like Mari AI proactive business partners instead of passive chatbots.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141414] border border-white/10">
              <Layers className="w-8 h-8 text-brand-gold mb-4" />
              <h3 className="font-bold text-base text-white mb-2">Unified Operational Fabric</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Data flows effortlessly from CRM pipelines to creative studios, social queues, and executive analytics without double-entry.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-[#141414] border border-white/10">
              <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
              <h3 className="font-bold text-base text-white mb-2">Zero-Trust Isolation</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Every organization operates in a sovereign, row-level isolated vault. Your proprietary customer intelligence remains strictly yours.
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-[#141414] via-brand-gold/10 to-[#141414] border border-white/10 p-12 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">
            Partner with Ras Ali Labs
          </h2>
          <p className="text-white/70 text-sm max-w-xl mx-auto mb-8">
            Whether you are deploying Ralion OS across your organization or require custom industry architecture, our engineering team is ready.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/request-demo"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
            >
              Book an Enterprise Consultation
            </Link>
            <Link
              to="/products/ralion"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15"
            >
              Explore Ralion OS
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
