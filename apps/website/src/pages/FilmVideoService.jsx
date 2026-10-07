import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { organizationSchema, localBusinessSchema, makeServiceSchema, makeFaqSchema, makeBreadcrumbSchema } from '../lib/seoSchema';
import { Video, Film, Camera, Clapperboard, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';

const filmFaqs = [
  {
    question: 'Do you provide video production in Gaborone and Botswana?',
    answer: 'Yes. Ras Ali Labs provides film and video production from Gaborone for corporate films, commercials, interviews, event coverage, television and digital content across Botswana.',
  },
  {
    question: 'Can you handle a full corporate video production?',
    answer: 'Yes. Depending on scope, we can support concept development, pre-production, filming, production coordination, editing, colour work, motion graphics and final delivery.',
  },
  {
    question: 'What television production experience does Ras Ali Labs have?',
    answer: 'Our verified portfolio includes Pula Pitch in 2024, where lead videography responsibilities covered set design, pre-production, production and post-production across 13 episodes.',
  },
];

const FilmVideoService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Film & Video Production Botswana | Gaborone | Ras Ali Labs"
        description="Corporate video, film production, commercials, interviews, event coverage and post-production from Ras Ali Labs in Gaborone, Botswana."
        keywords="film production Botswana, video production Gaborone, video production Botswana, corporate video Botswana, videographer Gaborone, commercial video Botswana"
        canonical="https://rasalilabs.com/services/film-video"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema,
            localBusinessSchema,
            makeServiceSchema({
              name: 'Film & Video Production in Botswana',
              description: 'Corporate video, commercials, interviews, television, event coverage and post-production from Gaborone, Botswana.',
              url: '/services/film-video',
              serviceType: 'Film and video production',
              image: '/assets/images/service-video.png',
            }),
            makeFaqSchema(filmFaqs),
            makeBreadcrumbSchema([
              { name: 'Home', url: '/' },
              { name: 'Services', url: '/services' },
              { name: 'Film & Video Production', url: '/services/film-video' },
            ]),
          ],
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Video size={14} /> Creative Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Film & Video Production in Botswana
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Based in Gaborone, we produce corporate films, commercials, interviews, television and digital content, event coverage, photography and post-production for organisations across Botswana.
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
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Cinematic 4K Filming</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Studio & Location Production</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
            <Clapperboard className="w-10 h-10 text-brand-gold mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Television Series & Episodic Shoots</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              End-to-end set design, pre-production, principal videography, and multi-episode post-production (such as our 13-episode production for Pula Pitch).
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Set Design & Stage Layout</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Multi-Episode Shoot Coordination</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-brand-gold" /> Broadcast Quality Delivery</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all">
            <Camera className="w-10 h-10 text-brand-gold mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Photography & Visual Content</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Editorial photography, executive portraits, event visual journalism, and motion graphics tailored for multi-channel digital campaigns.
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
                Confirmed Experience • 2024
              </span>
              <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                Pula Pitch — Television & Digital Enterprise Series
              </h3>
              <p className="text-white/70 text-sm leading-relaxed">
                Lead videographer responsible for set design, pre-production, production and post-production across 13 episodes.
              </p>
              <Link
                to="/work/pula-pitch-2024"
                className="inline-flex items-center gap-2 text-brand-gold font-bold text-xs hover:underline"
              >
                View Project Details →
              </Link>
            </div>
          </div>
        </div>

        {/* Local SEO + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-5 bg-[#181818] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-3">Video Production in Gaborone with Broadcast Experience</h2>
            <p className="text-white/65 text-sm leading-relaxed">
              Our production work spans corporate storytelling, commercials, events and television. Pula Pitch provides public proof of multi-episode production experience across a 13-episode season.
            </p>
          </div>
          <div className="lg:col-span-7">
            <h2 className="text-2xl font-bold text-white mb-5">Film & Video Production Botswana FAQs</h2>
            <div className="space-y-3">
              {filmFaqs.map((faq) => (
                <div key={faq.question} className="bg-[#181818] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-2">{faq.question}</h3>
                  <p className="text-xs text-white/65 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Plan Your Next Production</h2>
          <p className="text-white/70 text-sm mb-6">
            Let's discuss your film, corporate documentary, commercial, or event coverage.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/booking/film-video"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
            >
              Book Film & Video Production <ArrowRight size={14} />
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

export default FilmVideoService;
