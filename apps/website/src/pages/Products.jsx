import React from 'react';
import { Link } from 'react-router-dom';
import { productsData } from '../data/products';
import SEO from '../components/common/SEO';
import {
  Cpu,
  Bot,
  Globe,
  CreditCard,
  UserCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

const iconMap = {
  Cpu: Cpu,
  Bot: Bot,
  Globe: Globe,
  CreditCard: CreditCard,
  UserCheck: UserCheck,
  TrendingUp: TrendingUp
};

const Products = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Products & Enterprise Systems | Ras Ali Labs"
        description="Explore Ralion CRM, Ralion AI Growth Engine, Ralion OS, Mari AI Engine, and Ralion Trade."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Ecosystem Products & Operating Systems
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            AI-Powered Products & Platforms
          </h1>
          <p className="text-brand-gold font-bold text-base mb-4">
            "Ralion does not just manage your business activity. It understands your business, predicts opportunities, and helps you grow."
          </p>
          <p className="text-white/60 text-lg">
            Discover intelligent enterprise operating systems, AI sales assistants, brand growth engines, and trade infrastructure.
          </p>
        </div>

        {/* Priority Core Products Grid (Ralion CRM & Ralion AI Growth Engine) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {productsData.slice(0, 2).map((product) => {
            const IconComponent = iconMap[product.icon] || Cpu;
            return (
              <div
                key={product.id}
                className="bg-[#252525] border border-brand-gold/40 rounded-3xl p-8 hover:border-brand-gold transition-all shadow-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <IconComponent size={24} />
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${product.badgeColor}`}>
                      {product.statusBadge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">{product.name}</h3>
                  <p className="text-brand-gold text-xs font-semibold mb-3">{product.tagline}</p>
                  <p className="text-white/60 text-sm mb-6 leading-relaxed">{product.description}</p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {product.features?.map((feat) => (
                      <div key={feat.id} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/products/${product.slug}`}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
                >
                  Explore {product.name} <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Other Platform Products (Ralion OS, Mari AI, Ralion Trade) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {productsData.slice(2).map((product) => {
            const IconComponent = iconMap[product.icon] || Cpu;
            return (
              <div
                key={product.id}
                className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-brand-gold flex items-center justify-center mb-4">
                    <IconComponent size={20} />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-1">{product.name}</h4>
                  <p className="text-white/40 text-[11px] font-mono mb-3">{product.category}</p>
                  <p className="text-white/60 text-xs mb-4 leading-relaxed">{product.description}</p>
                </div>

                <Link
                  to={`/products/${product.slug}`}
                  className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5"
                >
                  View Product <ExternalLink size={12} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Products;
