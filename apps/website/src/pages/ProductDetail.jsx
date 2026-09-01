import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug } from '../data/products';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Cpu,
  Sparkles,
  Globe,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  Database,
  Layers,
  BarChart3,
  Lock,
  CheckCircle2,
  ChevronRight,
  UserCheck,
  TrendingUp,
  Building2,
  Share2,
  Activity
} from 'lucide-react';

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const product = getProductBySlug(slug || 'ralion');

  useEffect(() => {
    analytics.trackProductVisit(product.slug);
  }, [product.slug]);

  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title={`${product.name} — ${product.tagline} | Ras Ali Labs`}
        description={product.description}
        url={`/products/${product.slug}`}
      />

      {/* Ambient Lighting */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-brand-gold/15 via-purple-500/10 to-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-white transition-colors">Products</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">{product.name}</span>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles size={14} /> {product.statusBadge}
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent">
              {product.name}
            </h1>

            <p className="text-brand-gold font-bold text-xl md:text-2xl mb-4">
              {product.tagline}
            </p>

            <p className="text-white/70 text-base md:text-lg leading-relaxed mb-8 font-normal">
              {product.longDescription || product.description}
            </p>

            {/* Hero CTAs */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                to={product.cta.primary.href}
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                {product.cta.primary.text} <ArrowRight size={16} />
              </Link>

              <Link
                to={product.cta.secondary.href}
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
              >
                {product.cta.secondary.text}
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6">
              {product.hero.stats.map((st, i) => (
                <div key={i} className="bg-[#141414] p-3.5 rounded-xl border border-white/5">
                  <div className="text-lg font-extrabold text-brand-gold">{st.value}</div>
                  <div className="text-[11px] text-white/50 font-medium">{st.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Card Graphic */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#1f1f1f] border border-white/10 p-6 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="text-white/40 text-xs font-mono">{product.slug}://command-vault</div>
              </div>

              <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
                      R
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">{product.name}</h4>
                      <p className="text-white/40 text-xs">Tenant Vault Scoped</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                    Active Verified
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Philosophy:</span>
                    <span className="text-brand-gold font-bold">Empowered to Prosper</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Intelligence:</span>
                    <span className="text-purple-400 font-bold">Mari AI Growth Partner</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Isolation:</span>
                    <span className="text-emerald-400 font-bold">Row-Level Security</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">Core Architectural Capabilities</h2>
            <p className="text-white/60 text-xs">Engineered for reliability, multi-tenant isolation, and automated revenue growth.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {product.features.map((feat) => (
              <div key={feat.id} className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-brand-gold/40 transition-all">
                <h3 className="font-bold text-base text-white mb-2">{feat.title}</h3>
                <p className="text-xs text-white/65 leading-relaxed mb-4">{feat.description}</p>
                {feat.items && (
                  <div className="space-y-1.5 pt-3 border-t border-white/5">
                    {feat.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={13} className="text-brand-gold shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-[#141414] via-brand-gold/10 to-[#141414] border border-white/10 p-12 text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-4">
            Experience {product.name} Today
          </h2>
          <p className="text-white/70 text-sm max-w-xl mx-auto mb-8">
            Empowered to Prosper — Start your free trial or book a comprehensive enterprise demonstration.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/ralion/register"
              className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
            >
              Start Free Trial
            </Link>
            <Link
              to="/request-demo"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/15"
            >
              Book Enterprise Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
