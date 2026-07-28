import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug, productsData } from '../data/products';
import { useAuth } from '../context/AuthContext';
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
  Play
} from 'lucide-react';

const iconMap = {
  Cpu: Cpu,
  Sparkles: Sparkles,
  Globe: Globe,
  CreditCard: CreditCard,
  Bot: Bot,
  ShieldCheck: ShieldCheck,
  Database: Database,
  Layers: Layers,
  BarChart3: BarChart3,
  Lock: Lock
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { openAuthModal, user } = useAuth();
  const product = getProductBySlug(slug || 'ralion');
  const [activeScreenshot, setActiveScreenshot] = useState(0);

  const isRalion = product.slug === 'ralion';

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
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

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
              <Sparkles size={14} /> {product.statusBadge}
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              {product.hero.title}
            </h1>
            <p className="text-white/70 text-lg md:text-xl leading-relaxed mb-8 font-normal">
              {product.hero.subtitle}
            </p>

            {/* CTAs: Start Free, Login, Launch Ralion */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <button
                onClick={() => (user ? navigate('/ralion') : openAuthModal('signup'))}
                className="py-4 px-8 rounded-2xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-sm font-bold shadow-xl shadow-brand-gold/20 hover:scale-105 transition-all flex items-center gap-2"
              >
                Start Free <ArrowRight size={16} />
              </button>

              {!user && (
                <button
                  onClick={() => openAuthModal('login')}
                  className="py-4 px-8 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold transition-all"
                >
                  Login
                </button>
              )}

              {isRalion && (
                <Link
                  to="/ralion"
                  className="py-4 px-8 rounded-2xl border border-brand-gold/50 text-brand-gold text-sm font-bold hover:bg-brand-gold/10 transition-all flex items-center gap-2"
                >
                  Launch Ralion <ExternalLink size={16} />
                </Link>
              )}
            </div>

            {/* Key Metrics Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/10">
              {product.hero.stats.map((stat, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5">
                  <div className="text-xl md:text-2xl font-bold text-brand-gold mb-1">{stat.value}</div>
                  <div className="text-white/50 text-xs">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-gradient-to-b from-[#252525] to-[#1c1c1c] p-3 border border-white/15 shadow-2xl overflow-hidden group">
              <img
                src={product.screenshots?.[0]?.image || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2070&auto=format&fit=crop'}
                alt={product.name}
                className="rounded-2xl w-full h-80 md:h-96 object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent rounded-2xl flex items-end p-6">
                <div>
                  <span className="text-brand-gold text-xs font-semibold uppercase tracking-wider block mb-1">
                    Live Platform Shell
                  </span>
                  <h4 className="text-white font-bold text-lg">{product.name} Control Suite</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description Section */}
        <div className="mb-24 bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="max-w-3xl mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4">
              Architected for Scalable Enterprise Autonomy
            </h2>
            <p className="text-white/70 text-base leading-relaxed mb-6">
              {product.longDescription}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-white/10">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Unified Supabase Auth</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                  Single identity across Ralion, Mari AI, TradeGrid, and DFS Platform.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <Bot size={20} />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Multi-Agent Intelligence</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                  Orchestrate Gemini LLM reasoning agents alongside custom microservices.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Database size={20} />
              </div>
              <div>
                <h4 className="text-white font-semibold text-sm mb-1">Vector Storage & Streaming</h4>
                <p className="text-white/50 text-xs leading-relaxed">
                  pgvector semantic indexers with sub-millisecond retrieval.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Core Platform Capabilities
            </h2>
            <p className="text-white/60 text-sm">
              Comprehensive feature suite designed for high-performance enterprise teams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {product.features.map((feature) => {
              const IconComp = iconMap[feature.icon] || Zap;
              return (
                <div
                  key={feature.id}
                  className="bg-[#252525] border border-white/10 hover:border-brand-gold/30 p-8 rounded-3xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-6">
                    <IconComp size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 text-xs leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Screenshots Area */}
        {product.screenshots && product.screenshots.length > 0 && (
          <div className="mb-24">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Interactive Platform Previews
              </h2>
              <p className="text-white/60 text-sm">
                Explore actual interface screenshots and operational workspaces.
              </p>
            </div>

            {/* Screenshots Selector Tabs */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {product.screenshots.map((screen, idx) => (
                <button
                  key={screen.id}
                  onClick={() => setActiveScreenshot(idx)}
                  className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeScreenshot === idx
                      ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20 font-bold'
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {screen.title}
                </button>
              ))}
            </div>

            {/* Active Screenshot Preview */}
            <div className="bg-[#252525] border border-white/10 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
              <div className="relative rounded-2xl overflow-hidden aspect-video">
                <img
                  src={product.screenshots[activeScreenshot].image}
                  alt={product.screenshots[activeScreenshot].title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6">
                  <h4 className="text-white font-bold text-lg mb-1">
                    {product.screenshots[activeScreenshot].title}
                  </h4>
                  <p className="text-white/70 text-xs">
                    {product.screenshots[activeScreenshot].caption}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Preview Section */}
        {product.pricing && (
          <div id="pricing" className="mb-24">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
                Transparent Enterprise Pricing
              </h2>
              <p className="text-white/60 text-sm">
                Choose the right plan to scale your digital operations with zero hidden fees.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {product.pricing.map((tier, idx) => (
                <div
                  key={idx}
                  className={`relative bg-[#252525] border rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                    tier.popular
                      ? 'border-brand-gold shadow-2xl shadow-brand-gold/10 ring-1 ring-brand-gold/50'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-gold text-black text-[10px] font-bold uppercase tracking-widest">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
                    <p className="text-white/50 text-xs min-h-[36px] mb-6">{tier.description}</p>
                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-4xl font-extrabold text-white">{tier.price}</span>
                      <span className="text-white/40 text-xs">/ {tier.period}</span>
                    </div>

                    <div className="space-y-3 mb-8 border-t border-white/10 pt-6">
                      {tier.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2 text-xs text-white/80">
                          <CheckCircle2 size={16} className="text-brand-gold shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => (user ? navigate('/ralion') : openAuthModal('signup'))}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all ${
                      tier.popular
                        ? 'bg-gradient-to-r from-brand-gold to-amber-500 text-black shadow-lg shadow-brand-gold/20 hover:scale-105'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    {tier.ctaText}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final CTA Bar */}
        <div className="text-center bg-gradient-to-r from-brand-gold/20 via-[#252525] to-[#1c1c1c] border border-brand-gold/30 rounded-3xl p-12 shadow-2xl">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Ready to deploy {product.name}?
          </h2>
          <p className="text-white/60 text-sm max-w-xl mx-auto mb-8">
            Create your unified Ras Ali Labs account in less than 60 seconds and experience the complete product suite.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => openAuthModal('signup')}
              className="py-4 px-8 rounded-xl bg-brand-gold text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20"
            >
              Start Free
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="py-4 px-8 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm transition-all"
            >
              Login
            </button>
            {isRalion && (
              <Link
                to="/ralion"
                className="py-4 px-8 rounded-xl border border-brand-gold text-brand-gold font-bold text-sm hover:bg-brand-gold/10 transition-all flex items-center gap-2"
              >
                Launch Ralion <ExternalLink size={16} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
