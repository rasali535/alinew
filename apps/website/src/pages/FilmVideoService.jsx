import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Video, Film, Camera, Clapperboard, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const FilmVideoService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Film & Creative Production | Ras Ali Labs"
        description="Cinematic films, corporate storytelling, commercials, interviews, event coverage, photography, motion graphics and post-production by Ras Ali Labs in Botswana."
        url="/services/film-video"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Video size={14} /> Creative Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Film & Creative Production
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Cinematic films, corporate storytelling, commercials, interviews, event coverage, photography, motion graphics and post-production. We craft memorable visual stories for broadcast, digital, and enterprise communications.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
            <Film className="w-10 h-10 text-brand-gold mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Corporate Storytelling & Commercials</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              High-impact corporate brand films, television commercials, founder narratives, and investor-ready visual pitches that elevate brand authority.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Scriptwriting & Storyboarding</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Cinematic 4K Camera Packages</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Professional Studio Lighting</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
            <Clapperboard className="w-10 h-10 text-brand-gold mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Television Series & Episodic Shoots</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              End-to-end set design, pre-production, principal videography, and multi-episode post-production (such as our 13-episode production for Pula Pitch).
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Set Design & Stage Direction</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Multi-Camera Shoot Management</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Broadcast Quality Delivery</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
            <Camera className="w-10 h-10 text-brand-gold mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Photography & Visual Content</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Editorial photography, executive headshots, event visual journalism, and motion graphics tailored for multi-channel digital campaigns.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Executive & Editorial Portraits</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Motion Graphics & Title Animation</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Precision Color Grading & Mastering</li>
            </ul>
          </div>
        </div>

        {/* Verified Spotlight */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <img
                  src="/assets/images/pula-pitch-logo.jpg"
                  alt="Pula Pitch"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <span className="text-brand-gold text-xs font-bold uppercase tracking-wider">
                Featured Production Case • 2024
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Pula Pitch — 13-Episode Broadcast Series
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Lead videographer responsible for set design and pre-production, lighting architecture, multi-camera shoot direction, and full post-production across all 13 episodes of the enterprise broadcast series.
              </p>
              <Link
                to="/work"
                className="inline-flex items-center gap-2 text-brand-gold font-bold text-xs hover:underline"
              >
                View in Work Archive →
              </Link>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Plan Your Next Production</h2>
          <p className="text-white/70 text-sm mb-6">
            Let's discuss your film, corporate documentary, commercial, or event coverage.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
          >
            Start a Production Inquire <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default FilmVideoService;
