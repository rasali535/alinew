import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { capabilityPillars, howWeWork } from '../data/mock';
import { Video, Code, Music, Bot, CheckCircle2, ArrowRight, Sparkles, Layers } from 'lucide-react';

const iconMap = {
  'Video': Video,
  'Code': Code,
  'Music': Music,
  'Bot': Bot
};

const Services = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Multidisciplinary Services | Ras Ali Labs"
        description="Explore the full spectrum of creative and technology capabilities from Ras Ali Labs: Film & Video Production, Web & App Development, Music & Audio, and AI & Automation."
        url="/services"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Layers size={14} /> Full-Spectrum Capabilities
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Our Services & Disciplines
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Ras Ali Labs is a multidisciplinary technology and creative company. We seamlessly integrate software engineering, artificial intelligence, cinematic video production, and sound design to solve complex challenges and tell powerful stories.
          </p>
        </div>

        {/* 4 Pillars Detailed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          {capabilityPillars.map((pillar) => {
            const Icon = iconMap[pillar.icon] || Code;
            return (
              <div
                key={pillar.id}
                className="bg-[#181818] border border-white/10 hover:border-brand-gold/40 rounded-3xl p-8 md:p-10 transition-all flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform">
                      <Icon size={28} />
                    </div>
                    <span className="text-xs uppercase font-bold tracking-widest text-brand-gold px-3 py-1 rounded-full bg-white/5 border border-white/10">
                      {pillar.tagline}
                    </span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 group-hover:text-brand-gold transition-colors">
                    {pillar.title}
                  </h2>

                  <p className="text-white/70 text-sm leading-relaxed mb-6">
                    {pillar.description}
                  </p>

                  <div className="space-y-3 border-t border-white/10 pt-6 mb-8">
                    {pillar.items.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-white/80">
                        <CheckCircle2 size={16} className="text-brand-gold shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                  <Link
                    to={pillar.href}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs text-center transition-all flex items-center justify-center gap-2"
                  >
                    View {pillar.title} Details <ArrowRight size={14} />
                  </Link>
                  <Link
                    to="/contact"
                    className="py-3.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-semibold text-xs transition-colors border border-white/10"
                  >
                    Inquire
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Process Section */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">How We Execute</h2>
            <p className="text-white/60 text-sm">Our proven four-stage methodology across technology and creative projects.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howWeWork.map((stage) => (
              <div key={stage.step} className="p-5 rounded-2xl bg-black/40 border border-white/5">
                <div className="text-2xl font-extrabold text-brand-gold font-mono mb-2">{stage.step}</div>
                <h4 className="font-bold text-base text-white mb-1">{stage.title}</h4>
                <p className="text-white/60 text-xs leading-relaxed">{stage.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Ready to Start a Project?</h2>
          <p className="text-white/70 text-sm mb-6">
            Whether you need a film, website, application, original sound or an intelligent business platform, let’s build it together.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
          >
            Contact Ras Ali Labs <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Services;
