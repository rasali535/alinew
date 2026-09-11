import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Music, Mic, Volume2, CheckCircle2, ArrowRight } from 'lucide-react';

const MusicAudioService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Music & Audio Production | Ras Ali Labs"
        description="Music production, arrangement, recording, sound design, audio post-production and live creative performance by Ras Ali Labs in Botswana."
        canonical="https://rasalilabs.com/services/music-audio"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Music size={14} /> Sonic Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Music Production & Audio
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Music production, arrangement, recording, sound design, audio post-production and live creative performance. We create authentic soundscapes, sonic signatures, and professional broadcast audio.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-purple-400/40 transition-all">
            <Music className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Original Music & Arrangement</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Custom composition, dynamic score arrangement, and instrumentation across African contemporary, jazz, film scoring, and commercial tracks.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Original Composition & Harmonies</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Bass Guitar & Session Instrumentation</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Soundtracks & Melodic Themes</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-purple-400/40 transition-all">
            <Mic className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Studio Recording & Performance</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Studio tracking sessions, artist direction, acoustic setup, and live performance coordination (such as the Dedications music series).
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Studio Recording Sessions</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Studio Setup & Instrumentation</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Artist Management & Direction</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-purple-400/40 transition-all">
            <Volume2 className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sound Design & Audio Post</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Dialogue cleanup, Foley, stereo/surround mixing, sonic branding, and audio mastering for media, broadcast, and digital releases.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Dialogue Restoration & Balancing</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Sonic Logo & Brand Audio Cues</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Professional Audio Mixing & Mastering</li>
            </ul>
          </div>
        </div>

        {/* Spotlight */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-4">
              <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                <img
                  src="/assets/images/ras-ali-bass-1.jpg"
                  alt="Dedications Bass Sessions"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-4">
              <span className="text-purple-400 text-xs font-bold uppercase tracking-wider">
                Confirmed Experience • 2020
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Dedications — Broadcast Music Programme
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Bass guitarist, studio setup and artist management during all shoots.
              </p>
              <Link
                to="/work/dedications-2020"
                className="inline-flex items-center gap-2 text-purple-400 font-bold text-xs hover:underline"
              >
                View Project Details →
              </Link>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Compose Your Next Sonic Identity</h2>
          <p className="text-white/70 text-sm mb-6">
            Get in touch for original arrangements, studio sessions, sound design, or audio post-production.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/booking/music-audio"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-purple-500 text-white font-extrabold text-xs hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
            >
              Book Music & Audio Production <ArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-all border border-white/15"
            >
              General Inquiry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicAudioService;
