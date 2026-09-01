import React from 'react';
import { Link } from 'react-router-dom';
import { productsData } from '../data/products';
import SEO from '../components/common/SEO';
import {
  Cpu,
  Bot,
  Globe,
  UserCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';

const iconMap = {
  Cpu: Cpu,
  Bot: Bot,
  UserCheck: UserCheck,
  TrendingUp: TrendingUp,
  Globe: Globe
};

const Products = () => {
  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title="Ralion OS Product Ecosystem | Ras Ali Labs"
        description="Explore the Ralion OS ecosystem: Ralion OS, Mari AI, Ralion CRM, Growth Studio, and Social Intelligence."
        url="/products"
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Unified Ecosystem
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            The Ralion Product Ecosystem
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-4">
            Empowered to Prosper — Your AI Business Operating System.
          </p>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            A cohesive suite of intelligent business tools that connect operations, CRM, growth strategy, creative generation, and multi-channel publishing into one command center.
          </p>
        </div>

        {/* Core Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {productsData.map((product) => {
            const IconComponent = iconMap[product.icon] || Cpu;
            return (
              <div
                key={product.id}
                className="bg-[#1f1f1f] border border-white/10 hover:border-brand-gold/40 rounded-3xl p-8 transition-all shadow-xl flex flex-col justify-between"
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

                  <h3 className="text-2xl font-bold text-white mb-1">{product.name}</h3>
                  <p className="text-brand-gold text-xs font-semibold mb-3">{product.tagline}</p>
                  <p className="text-white/65 text-xs leading-relaxed mb-6">{product.description}</p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {product.features?.slice(0, 4).map((feat) => (
                      <div key={feat.id} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to={`/products/${product.slug}`}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
                >
                  Explore {product.name} <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Enterprise Callout Banner */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Ready to deploy Ralion across your organization?</h4>
              <p>Start your free trial today or consult with our enterprise architecture team in Gaborone.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/ralion/register" className="py-2.5 px-5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform">
              Start Free Trial
            </Link>
            <Link to="/request-demo" className="py-2.5 px-5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/20 transition-colors">
              Book Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;
