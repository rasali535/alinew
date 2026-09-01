import React from 'react';
import { Link } from 'react-router-dom';
import { services } from '../../data/mock';
import { ArrowRight, Bot, Cpu, ShieldCheck, Layers, Sparkles, Database, Workflow, CheckCircle2 } from 'lucide-react';

const iconList = [Bot, Workflow, Cpu, ShieldCheck];

const ServicesPageGrid = () => {
  return (
    <section className="bg-[#181818] py-24 text-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Introduction */}
        <div className="mb-16 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Enterprise Solutions & Engineering
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
            Enterprise AI Systems & Custom Infrastructure
          </h1>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            Ras Ali Labs engineers sovereign business operating systems, automated data pipelines, custom AI agents, and enterprise infrastructure for organizations across Africa and worldwide.
          </p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {services.map((service, index) => {
            const Icon = iconList[index % iconList.length];
            return (
              <div
                key={service.id}
                className="bg-[#1f1f1f] border border-white/10 hover:border-brand-gold/40 rounded-3xl p-8 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <Icon size={24} />
                    </div>
                    <span className="text-xs font-mono text-white/30 font-bold">
                      0{index + 1}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    {service.title}
                  </h3>
                  <p className="text-white/60 text-xs leading-relaxed mb-6">
                    {service.description}
                  </p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {service.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/request-demo"
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Consult on {service.title} <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ServicesPageGrid;
