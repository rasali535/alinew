import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import HeroSection from '../components/sections/HeroSection';
import {
  companyInfo,
  capabilityPillars,
  howWeWork,
  ralionOSOverview,
  ralionModules,
  featuredProjects,
  faqs
} from '../data/mock';
import {
  ArrowRight,
  Sparkles,
  Bot,
  Video,
  Code,
  Music,
  CheckCircle2,
  ChevronRight,
  Layers,
  Cpu,
  ShieldCheck,
  TrendingUp,
  Flame,
  Film
} from 'lucide-react';

const iconMap = {
  'Video': Video,
  'Code': Code,
  'Music': Music,
  'Bot': Bot
};

const Home = () => {
  return (
    <>
      <SEO
        title="Ras Ali Labs | Technology, Film, Web, Apps, Music & AI"
        description="Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company delivering intelligent platforms, cinematic productions, digital experiences and original sound."
        canonical="https://rasalilabs.com/"
      />

      {/* 1. HERO SECTION */}
      <HeroSection />

      {/* 2. CAPABILITY INTRODUCTION (4 PILLARS) */}
      <section className="py-24 px-6 lg:px-12 bg-[#121212] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
              <Layers size={14} /> Multidisciplinary Capabilities
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
              Creative Vision Meets Intelligent Engineering
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Ras Ali Labs unites four core disciplines under one roof to bring ambitious digital platforms, cinematic visuals, and custom audio to life.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {capabilityPillars.map((pillar) => {
              const Icon = iconMap[pillar.icon] || Code;
              return (
                <div
                  key={pillar.id}
                  className="bg-[#181818] border border-white/10 hover:border-brand-gold/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-14 h-14 rounded-2xl bg-brand-gold/10 border border-brand-gold/20 flex items-center justify-center text-brand-gold group-hover:scale-110 transition-transform">
                        <Icon size={28} />
                      </div>
                      <span className="text-xs uppercase font-bold tracking-widest text-brand-gold/80 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        {pillar.tagline}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-brand-gold transition-colors">
                      {pillar.title}
                    </h3>

                    <p className="text-white/70 text-sm leading-relaxed mb-6">
                      {pillar.description}
                    </p>

                    <div className="space-y-2.5 border-t border-white/10 pt-5 mb-8">
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
                      className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs text-center transition-all flex items-center justify-center gap-2"
                    >
                      Explore {pillar.title} <ArrowRight size={14} />
                    </Link>
                    <Link
                      to="/contact"
                      className="py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-semibold text-xs transition-colors border border-white/10"
                    >
                      Inquire
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. RALION OS FLAGSHIP SECTION */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-b from-[#141414] via-[#161616] to-[#121212] text-white border-t border-b border-white/10 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[600px] h-[600px] bg-brand-gold/10 rounded-full blur-[160px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider">
                <Sparkles size={14} /> {ralionOSOverview.badge}
              </div>

              <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {ralionOSOverview.name}
              </h2>

              <div className="text-lg md:text-xl font-bold text-brand-gold">
                {ralionOSOverview.tagline} • {ralionOSOverview.headline}
              </div>

              <p className="text-white/75 text-base md:text-lg leading-relaxed max-w-2xl">
                {ralionOSOverview.description}
              </p>

              <div className="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Bot size={18} />
                  <span>{ralionOSOverview.mariTagline}</span>
                </div>
                <p className="text-white/70 text-xs leading-relaxed">
                  {ralionOSOverview.mariDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to={ralionOSOverview.exploreHref}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
                >
                  Explore Ralion OS <ArrowRight size={16} />
                </Link>

                <a
                  href={ralionOSOverview.launchHref}
                  className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-all border border-white/15 flex items-center gap-2"
                >
                  <Sparkles size={14} className="text-brand-gold" /> Launch Ralion
                </a>

                <Link
                  to={ralionOSOverview.demoHref}
                  className="px-5 py-3.5 rounded-xl bg-transparent hover:bg-white/5 text-white/75 hover:text-white font-medium text-xs transition-colors"
                >
                  Book a Demo
                </Link>
              </div>
            </div>

            {/* Visual Representation Card */}
            <div className="lg:col-span-5">
              <div className="bg-[#1c1c1c] border border-white/15 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <img src="/assets/images/logo.png" alt="Ralion" className="w-8 h-8 object-contain" />
                    <div>
                      <div className="text-xs font-bold text-white">RALION OS</div>
                      <div className="text-[10px] text-brand-gold font-semibold">Flagship Technology Product</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                    Connected OS
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Mari AI Partner</div>
                    <div className="text-xs font-bold text-white">Embedded Reasoning</div>
                    <div className="text-[10px] text-purple-400 mt-1">Directs campaigns & CRM</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                    <div className="text-[10px] uppercase font-bold text-white/40 mb-1">Growth Engine</div>
                    <div className="text-xs font-bold text-white">Multi-Channel Studio</div>
                    <div className="text-[10px] text-brand-gold mt-1">FLUX & CogVideoX ready</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gradient-to-r from-brand-gold/10 to-amber-500/10 border border-brand-gold/20">
                  <div className="text-xs font-bold text-brand-gold mb-1">Sovereign Architecture</div>
                  <p className="text-xs text-white/70">
                    Engineered by Ras Ali Labs in Botswana with row-level tenant isolation, encrypted tokens, and automated business workflows.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Ralion Modules Mini Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {ralionModules.slice(0, 3).map((mod) => (
              <div key={mod.id} className="p-5 rounded-2xl bg-[#1a1a1a] border border-white/10">
                <div className="text-xs font-bold text-brand-gold mb-1">{mod.name}</div>
                <div className="text-white font-semibold text-xs mb-2">{mod.tagline}</div>
                <p className="text-white/60 text-xs leading-relaxed">{mod.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. SELECTED WORK (PORTFOLIO) */}
      <section className="py-24 px-6 lg:px-12 bg-[#121212] text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
                <Flame size={14} /> Portfolio & Productions
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white">
                Selected Work & Verified Productions
              </h2>
            </div>
            <Link
              to="/work"
              className="inline-flex items-center gap-2 text-brand-gold hover:underline font-bold text-sm"
            >
              View Full Portfolio Archive <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProjects.map((project) => (
              <div
                key={project.id}
                className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden hover:border-brand-gold/40 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group shadow-xl"
              >
                <div>
                  <div className="aspect-[16/10] overflow-hidden bg-[#101010] relative">
                    <img
                      src={project.image}
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                      onError={(e) => {
                        e.target.src = '/assets/images/service-video.png';
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[11px] font-bold text-brand-gold border border-white/10">
                        {project.category}
                      </span>
                    </div>
                    {project.date && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-mono text-white/80">
                          {project.date}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <Link to={`/work/${project.id}`}>
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-brand-gold transition-colors">
                        {project.title}
                      </h3>
                    </Link>
                    <div className="text-xs font-medium text-brand-gold/90 mb-3">
                      {project.subtitle}
                    </div>
                    <p className="text-white/70 text-xs leading-relaxed mb-4">
                      {project.description}
                    </p>

                    {project.verifiedNote && (
                      <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/60 mb-4">
                        <strong className="text-white/80 font-semibold block mb-0.5">Verified Execution:</strong>
                        {project.verifiedNote}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {project.roles.map((role, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-white/5 text-[10px] font-medium text-white/60"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 flex gap-2">
                  <Link
                    to={`/work/${project.id}`}
                    className="flex-1 py-2.5 rounded-xl bg-brand-gold/10 hover:bg-brand-gold text-brand-gold hover:text-black font-semibold text-xs transition-colors border border-brand-gold/20 flex items-center justify-center gap-1.5"
                  >
                    View Details <ArrowRight size={13} />
                  </Link>
                  {project.url && (
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-[11px] transition-colors border border-white/10 flex items-center justify-center"
                      title={project.domain || 'Visit website'}
                    >
                      ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HOW WE WORK (4 STAGES) */}
      <section className="py-24 px-6 lg:px-12 bg-[#151515] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles size={14} /> Process & Methodology
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
              How We Work
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Ras Ali Labs combines strategy, technology and creative production from concept through final delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {howWeWork.map((stage) => (
              <div
                key={stage.step}
                className="bg-[#1c1c1c] border border-white/10 rounded-3xl p-7 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="text-3xl font-extrabold text-brand-gold font-mono mb-4">
                    {stage.step}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">{stage.title}</h3>
                  <div className="text-xs font-semibold text-brand-gold/80 uppercase tracking-wider mb-3">
                    {stage.tagline}
                  </div>
                  <p className="text-white/65 text-xs leading-relaxed">
                    {stage.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ABOUT RAS ALI LABS */}
      <section className="py-24 px-6 lg:px-12 bg-[#101010] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
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
                  <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-1">
                    Gaborone, Botswana
                  </div>
                  <h4 className="text-xl font-bold text-white">Ras Ali Labs</h4>
                  <p className="text-white/60 text-xs">Technology • Film • Sound • Innovation</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider">
                <Cpu size={14} /> About Ras Ali Labs
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Multidisciplinary Technology and Creative Company
              </h2>

              <p className="text-white/80 text-base md:text-lg leading-relaxed">
                {companyInfo.aboutSummary}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
                  <Film className="w-6 h-6 text-brand-gold mb-2" />
                  <h4 className="font-bold text-sm text-white mb-1">Cinematic Storytelling</h4>
                  <p className="text-xs text-white/60">High-end broadcast, corporate documentaries, and original audiovisuals.</p>
                </div>
                <div className="p-4 rounded-2xl bg-[#181818] border border-white/10">
                  <Bot className="w-6 h-6 text-emerald-400 mb-2" />
                  <h4 className="font-bold text-sm text-white mb-1">AI & Digital Platforms</h4>
                  <p className="text-xs text-white/60">Custom web and mobile apps, business automation, and sovereign technology.</p>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all"
                >
                  Read More About Our Story <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-r from-[#141414] via-[#1a1a1a] to-[#141414] text-white border-t border-white/10">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider">
            <Sparkles size={14} /> Let's Build Together
          </div>

          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Have a Project in Mind?
          </h2>

          <p className="text-white/75 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Whether you need a film, website, application, original sound or an intelligent business platform, let’s build it together.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              to="/contact"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-brand-gold/20 flex items-center gap-2"
            >
              Start a Project <ArrowRight size={18} />
            </Link>

            <Link
              to="/contact"
              className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-all border border-white/15"
            >
              Contact Ras Ali Labs
            </Link>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;
