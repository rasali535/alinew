import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { companyInfo, capabilityPillars } from '../data/mock';
import { Sparkles, Video, Code, Music, Bot, Layers, ArrowRight, ShieldCheck, MapPin, Globe2 } from 'lucide-react';

const About = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="About Ras Ali Labs | Multidisciplinary Technology & Creative Company"
        description="Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company working at the intersection of software, artificial intelligence, film, visual storytelling and music."
        canonical="https://rasalilabs.com/about"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Hero */}
        <div className="max-w-4xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} /> Technology • Film • Sound • Innovation
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            We Build Intelligent Technology and Powerful Stories.
          </h1>

          <p className="text-white/75 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
            {companyInfo.aboutSummary}
          </p>
        </div>

        {/* Narrative & Philosophy Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#181818] border border-white/15 shadow-2xl">
              <img
                src="/assets/images/ras-ali-formal.jpg"
                alt="Ras Ali Labs Founder"
                className="w-full h-full object-cover opacity-90"
                onError={(e) => {
                  e.target.src = '/assets/images/logo.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white mb-1">Ras Ali</h3>
                <p className="text-brand-gold text-xs font-semibold uppercase tracking-wider">
                  Founder & Principal Technologist
                </p>
                <p className="text-white/60 text-xs mt-1">Ras Ali Labs (Pty) Ltd • Gaborone, Botswana</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider">
              Our Vision & Multidisciplinary Identity
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
              Where Engineering Precision Meets Creative Expression
            </h2>
            <p className="text-white/70 text-base leading-relaxed">
              Founded in <strong>Gaborone, Botswana</strong>, Ras Ali Labs is built on the belief that modern organizations thrive when technology and creative storytelling operate as one.
            </p>
            <p className="text-white/70 text-base leading-relaxed">
              We don't fit into a single box. We produce broadcast-standard television and corporate films, compose original music and sonic branding, engineer responsive web and mobile applications, automate complex enterprise workflows, and build proprietary software platforms like <strong>Ralion OS</strong>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-[#181818] border border-white/10">
                <Video className="w-7 h-7 text-brand-gold mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Creative Craftsmanship</h4>
                <p className="text-xs text-white/60">Cinematic visual storytelling, television series production, and studio music production.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#181818] border border-white/10">
                <Code className="w-7 h-7 text-emerald-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Intelligent Software</h4>
                <p className="text-xs text-white/60">Modern web applications, AI automation, and sovereign business operating systems.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars Summary */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">The Four Pillars of Ras Ali Labs</h2>
            <p className="text-white/60 text-sm">Our integrated approach to client engagements.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilityPillars.map((pillar) => (
              <div key={pillar.id} className="p-6 rounded-3xl bg-[#181818] border border-white/10 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-lg text-white mb-2">{pillar.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-4">{pillar.description}</p>
                </div>
                <Link
                  to={pillar.href}
                  className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1"
                >
                  Learn More →
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Flagship Product Callout */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold uppercase">
                Flagship Technology
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Ralion OS — Empowered to Prosper
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Ralion OS is the flagship AI business operating system created by Ras Ali Labs, unifying operations, CRM, growth strategy, and Mari AI into one connected platform.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/products/ralion-os"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all"
                >
                  Explore Ralion OS
                </Link>
                <a
                  href="/ralion"
                  className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 border border-white/15 transition-all"
                >
                  Launch Ralion
                </a>
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <img src="/assets/images/logo.png" alt="Ralion OS" className="w-36 h-36 object-contain" />
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Let's Create Together</h2>
          <p className="text-white/70 text-sm mb-6">
            Get in touch to collaborate with Ras Ali Labs on your next film, software platform, or audio production.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
          >
            Contact Ras Ali Labs <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
