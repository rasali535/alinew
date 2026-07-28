import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { productsData } from '../data/products';
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
  Search,
  ExternalLink,
  Layers
} from 'lucide-react';

const iconMap = {
  Cpu: Cpu,
  Sparkles: Sparkles,
  Globe: Globe,
  CreditCard: CreditCard
};

const Products = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { openAuthModal, user } = useAuth();

  const categories = ['All', 'Enterprise OS', 'AI / Intelligent Agents', 'B2B Trade Platform', 'Fintech & Telecom Gateway'];

  const filteredProducts = productsData.filter((product) => {
    const matchesCategory = activeCategory === 'All' || product.category.includes(activeCategory);
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.tagline.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      {/* Background Decorator */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-r from-brand-gold/10 via-purple-500/5 to-blue-500/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
            <Layers size={14} /> Ras Ali Labs Product Ecosystem
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-white/90 to-white/60 bg-clip-text text-transparent">
            Empowered to Prosper.
          </h1>
          <p className="text-white/60 text-lg md:text-xl leading-relaxed font-normal">
            Discover and launch our suite of next-generation enterprise platforms, autonomous AI agents, and sovereign trade infrastructure.
          </p>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-12 bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          {/* Categories */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                  activeCategory === cat
                    ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20 font-bold'
                    : 'bg-black/40 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={16} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-brand-gold transition-colors placeholder:text-white/30"
            />
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          {filteredProducts.map((product) => {
            const Icon = iconMap[product.icon] || Cpu;
            const isRalion = product.slug === 'ralion';

            return (
              <div
                key={product.id}
                className="group relative bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all duration-500 hover:shadow-2xl hover:shadow-brand-gold/5 flex flex-col justify-between overflow-hidden"
              >
                {/* Highlight Glow for Ralion */}
                {isRalion && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-gold/10 rounded-full blur-2xl group-hover:bg-brand-gold/20 transition-all"></div>
                )}

                <div>
                  {/* Top Bar */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-brand-gold group-hover:scale-110 group-hover:bg-brand-gold group-hover:text-black transition-all duration-300">
                      <Icon size={28} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${product.badgeColor}`}>
                      {product.statusBadge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-brand-gold transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-brand-gold/90 text-xs font-semibold tracking-wide uppercase mb-4">
                    {product.tagline}
                  </p>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">
                    {product.description}
                  </p>

                  {/* Feature Bullets */}
                  <div className="space-y-2 mb-8 border-t border-white/10 pt-6">
                    {product.features.slice(0, 3).map((feat) => (
                      <div key={feat.id} className="flex items-center gap-2 text-xs text-white/80">
                        <Zap size={14} className="text-brand-gold shrink-0" />
                        <span>{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-6 border-t border-white/10">
                  <Link
                    to={`/products/${product.slug}`}
                    className="w-full sm:w-auto flex-1 text-center py-3 px-5 rounded-xl border border-white/20 hover:border-brand-gold text-white text-xs font-semibold hover:bg-white/5 transition-all flex items-center justify-center gap-2"
                  >
                    View Product Details <ArrowRight size={14} />
                  </Link>

                  {isRalion ? (
                    <Link
                      to="/ralion"
                      className="w-full sm:w-auto py-3 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-xs font-bold hover:shadow-lg hover:shadow-brand-gold/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                    >
                      Launch Ralion <ExternalLink size={14} />
                    </Link>
                  ) : (
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="w-full sm:w-auto py-3 px-5 rounded-xl bg-white/10 text-white hover:bg-white/20 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      Get Notified
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout Banner */}
        <div className="relative rounded-3xl bg-gradient-to-r from-brand-gold/20 via-[#252525] to-[#1c1c1c] border border-brand-gold/30 p-8 md:p-12 text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden shadow-2xl">
          <div className="max-w-2xl">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest mb-2 block">
              Enterprise Ecosystem Architecture
            </span>
            <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Single Account across all Ras Ali Labs products.
            </h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Experience seamless single sign-on (SSO), unified billing, and cross-platform multi-agent automation across Ralion, Mari AI, and future trade networks.
            </p>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            {user ? (
              <Link
                to="/ralion"
                className="py-3.5 px-7 rounded-xl bg-brand-gold text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                Go to Workspace <ArrowRight size={16} />
              </Link>
            ) : (
              <button
                onClick={() => openAuthModal('signup')}
                className="py-3.5 px-7 rounded-xl bg-brand-gold text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                Create Unified Account <ShieldCheck size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
