import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { industryOperatingSystems } from '../data/mock';
import { Building2, Truck, Activity, Landmark, Globe, CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const Industries = () => {
  const iconMap = {
    funeral: Building2,
    logistics: Truck,
    healthcare: Activity,
    trade: Globe,
    government: Landmark,
  };

  return (
    <div className="min-h-screen bg-[#181818] text-white pt-32 pb-24 px-6 lg:px-12">
      <SEO
        title="Ralion Industry Operating Systems | Ras Ali Labs"
        description="Specialized enterprise AI operating systems: Funeral OS, Logistics OS, Healthcare OS, Trade OS, and Government OS."
        url="/industries"
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Purpose-Built Operating Systems
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
            Ralion Industry Operating Systems
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            Tailored AI business operating systems engineered specifically for Funeral Management, Logistics, Healthcare, B2B Trade, and Government Public Infrastructure.
          </p>
        </div>

        {/* Industry Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {industryOperatingSystems.map((ind) => {
            const IconComp = iconMap[ind.id] || Building2;
            return (
              <div
                key={ind.id}
                id={ind.id}
                className="bg-[#1f1f1f] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <IconComp size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-brand-gold/15 text-brand-gold text-[10px] font-bold">
                      {ind.metrics}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">{ind.name}</h3>
                  <p className="text-brand-gold text-xs font-semibold mb-3">{ind.tagline}</p>
                  <p className="text-white/60 text-xs mb-6 leading-relaxed">{ind.description}</p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {ind.capabilities.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/request-demo"
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Request {ind.name} Demo <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Enterprise Security Banner */}
        <div className="bg-[#141414] border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Need a Custom Industry OS Solution?</h4>
              <p>Ras Ali Labs architects tailored enterprise AI operating systems for specialized industry sectors.</p>
            </div>
          </div>
          <Link
            to="/request-demo"
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-transform shrink-0"
          >
            Request Custom AI Demo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Industries;
