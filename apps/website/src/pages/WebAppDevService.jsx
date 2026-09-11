import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Code, Smartphone, Globe, Layout, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

const WebAppDevService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Web & App Development | Ras Ali Labs"
        description="Modern websites, mobile applications, business platforms, portals, e-commerce systems and custom digital products built by Ras Ali Labs in Botswana."
        url="/services/web-app-development"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Code size={14} /> Technology Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Web & App Development
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Modern websites, mobile applications, business platforms, portals, e-commerce systems and custom digital products. We build resilient, high-speed digital experiences engineered for scale.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Globe className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Modern Web Applications</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Lightning-fast responsive web apps built with React, Next.js, Vite, and modern cloud architectures, designed for peak performance and visual impact.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> React, Next.js & Modern TypeScript</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Responsive & Fluid UI Systems</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Performance & SEO Optimization</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Smartphone className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Mobile Applications (iOS & Android)</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Native and cross-platform mobile apps engineered for fluid gestures, offline capabilities, secure biometrics, and push notification systems.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Cross-Platform Native Builds</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Offline-First Data Synchronization</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> App Store & Play Store Deployment</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Layout className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Custom Platforms & Business Portals</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Bespoke internal dashboards, customer portals, billing gateways, and role-based access systems tailored to unique business models.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Granular RBAC & Secure Auth</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> PostgreSQL & Supabase Backends</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Automated Document & Report Engines</li>
            </ul>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Build Your Digital Product</h2>
          <p className="text-white/70 text-sm mb-6">
            Tell us about your web, mobile, or enterprise platform vision.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            Start a Software Project <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default WebAppDevService;
