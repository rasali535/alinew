import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { featuredProjects } from '../data/mock';
import { ArrowRight, Sparkles, Filter, CheckCircle2 } from 'lucide-react';

const categories = [
  'All',
  'Film & Creative Production',
  'Web & App Development',
  'Music & Audio Production',
  'Software & Technology'
];

const Work = () => {
  const [activeCategory, setActiveCategory] = useState('All');

  const filteredProjects =
    activeCategory === 'All'
      ? featuredProjects
      : featuredProjects.filter((p) => p.category.includes(activeCategory) || activeCategory.includes(p.category));

  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Our Work & Portfolio | Ras Ali Labs"
        description="Selected work across film & video production, web & app development, music production, sound design, and intelligent software platforms by Ras Ali Labs."
        canonical="https://rasalilabs.com/work"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Proven Track Record
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Our Work
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Explore our multidisciplinary portfolio spanning broadcast television series, studio music productions, modern web platforms, and flagship software innovations.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2.5 mb-14 border-b border-white/10 pb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeCategory === cat
                  ? 'bg-brand-gold text-black shadow-lg shadow-brand-gold/20'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="bg-[#181818] border border-white/10 rounded-3xl overflow-hidden hover:border-brand-gold/40 transition-all flex flex-col justify-between group shadow-xl"
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
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/65 mb-4">
                      <strong className="text-white/85 font-semibold block mb-0.5">Verified Execution:</strong>
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

        {/* Portfolio Submission note */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 text-center max-w-3xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">Have a New Project to Commission?</h3>
          <p className="text-white/65 text-xs leading-relaxed mb-6">
            We collaborate with enterprises, broadcasters, creators, and startups. Let’s bring your vision to life with precision and craft.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:scale-105 transition-all"
          >
            Start a Project <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Work;
