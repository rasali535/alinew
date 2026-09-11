import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Music, Radio, Mic, Volume2, CheckCircle2, ArrowRight } from 'lucide-react';

const MusicAudioService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Music & Audio Production | Ras Ali Labs"
        description="Music production, arrangement, recording, sound design, audio post-production and live creative performance by Ras Ali Labs in Botswana."
        url="/services/music-audio"
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
              Custom composition, dynamic score arrangement, and instrumentation across jazz, African contemporary, film scores, and commercial tracks.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Original Composition & Harmonies</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Bass Guitar & Session Musicianship</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Cinematic Soundtracks & Scoring</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-purple-400/40 transition-all">
            <Mic className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Studio Recording & Live Performance</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Professional studio tracking, artist direction, live multi-track recording, and live stage audio management (e.g. Dedications music series).
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Multi-Track Studio Sessions</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Live Stage Sound Engineering</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Artist Management & Rehearsals</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-purple-400/40 transition-all">
            <Volume2 className="w-10 h-10 text-purple-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Sound Design & Audio Post</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Dialogue cleanup, Foley, immersive stereo/surround mixing, sonic branding, and broadcast audio mastering for media and advertising.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Dialogue Restoration & ADR</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Sonic Logo & Brand Audio Cues</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-purple-400" /> Broadcast LUFS Standard Mastering</li>
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
                Featured Experience • 2020
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Dedications — Broadcast Music Programme
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Bass guitarist, studio acoustic setup, live tracking direction, and artist management across all broadcast shoots of the televised music series.
              </p>
              <Link
                to="/work"
                className="inline-flex items-center gap-2 text-purple-400 font-bold text-xs hover:underline"
              >
                View in Work Archive →
              </Link>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Compose Your Next Sonic Identity</h2>
          <p className="text-white/70 text-sm mb-6">
            Get in touch for original arrangements, studio sessions, sound design, or broadcast audio post.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-purple-500 text-white font-extrabold text-xs hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
          >
            Inquire About Audio Production <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MusicAudioService;
