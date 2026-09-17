import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { companyInfo, capabilityPillars } from '../data/mock';
import {
  Sparkles,
  Video,
  Code,
  Music,
  Bot,
  Layers,
  ArrowRight,
  MapPin,
  Globe2,
} from 'lucide-react';

const journey = [
  {
    year: '2003',
    title: 'Music became the first language',
    body: 'Long before the software, there was sound. Performance and musicianship shaped the discipline, timing, collaboration and emotional intelligence that still influence how Ras Ali Labs approaches every project.',
    icon: Music,
  },
  {
    year: '2020',
    title: 'From stage to broadcast production',
    body: 'That creative foundation expanded into television and studio production, including work on Dedications — combining performance, technical setup, artist coordination and production execution.',
    icon: Video,
  },
  {
    year: '2024',
    title: 'Creative production met systems thinking',
    body: 'Production work such as Pula Pitch brought together cinematography, set thinking, pre-production and post-production across a full television season — while software and digital product development accelerated in parallel.',
    icon: Layers,
  },
  {
    year: 'Now',
    title: 'Building intelligent products from Botswana',
    body: 'Today Ras Ali Labs brings those disciplines together: software engineering, AI, automation, film, visual storytelling and sound — with Ralion OS as the flagship expression of that multidisciplinary approach.',
    icon: Bot,
  },
];

const principles = [
  {
    title: 'Create with purpose',
    body: 'Good work should communicate clearly, solve a real problem and leave people with something they can feel or use.',
  },
  {
    title: 'Engineer for reality',
    body: 'We build for real businesses, real workflows and real constraints — not just polished demos. Architecture, security and usability matter equally.',
  },
  {
    title: 'Connect disciplines',
    body: 'Film can inform product design. Music can inform rhythm and experience. AI can expand creative capacity. Our advantage comes from combining the disciplines rather than separating them.',
  },
];

const About = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="About Ras Ali Labs | Technology, Film, Sound & AI from Botswana"
        description="Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company building software, AI systems, digital products, films, visual experiences and original sound."
        canonical="https://rasalilabs.com/about"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Hero */}
        <div className="max-w-5xl mx-auto text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-bold uppercase tracking-wider mb-6">
            <Sparkles size={14} /> Technology • Film • Sound • Innovation
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            We Build Intelligent Technology and Powerful Stories.
          </h1>

          <p className="text-white/75 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto">
            {companyInfo.aboutSummary}
          </p>

          <div className="flex flex-wrap justify-center gap-3 mt-8 text-xs font-semibold text-white/65">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]">
              <MapPin size={13} className="text-brand-gold" /> Gaborone, Botswana
            </span>
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/[0.03]">
              <Globe2 size={13} className="text-brand-gold" /> Built in Africa. Designed to travel.
            </span>
          </div>
        </div>

        {/* Founder story */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-[#181818] border border-white/15 shadow-2xl">
              <img
                src="/assets/images/ras-ali-formal.jpg"
                alt="Ras Ali, Founder and Creative Technologist at Ras Ali Labs"
                className="w-full h-full object-cover opacity-90"
                onError={(e) => {
                  e.target.src = '/assets/images/logo.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 right-6">
                <h3 className="text-2xl font-bold text-white mb-1">Ras Ali</h3>
                <p className="text-brand-gold text-xs font-semibold uppercase tracking-wider">
                  Founder & Creative Technologist
                </p>
                <p className="text-white/60 text-xs mt-1">Ras Ali Labs (Pty) Ltd • Gaborone, Botswana</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider">
              The Story Behind the Lab
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold text-white leading-tight">
              Musician. Filmmaker. Builder. Technologist.
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Ras Ali Labs did not grow out of one discipline. It grew from a career shaped by music, broadcast production, digital creation, software engineering and a constant curiosity about how things can work better.
            </p>
            <p className="text-white/70 text-base leading-relaxed">
              That journey matters because it explains how we think. We approach technology with a storyteller's instinct for people and experience, and we approach creative work with an engineer's instinct for structure, repeatability and execution.
            </p>
            <p className="text-white/70 text-base leading-relaxed">
              The result is a company that can move between a camera set and a codebase without changing its core philosophy: <strong className="text-white">create deliberately, solve meaningfully, and build work that lasts.</strong>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 rounded-2xl bg-[#181818] border border-white/10">
                <Video className="w-7 h-7 text-brand-gold mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Creative Production</h4>
                <p className="text-xs text-white/60 leading-relaxed">Film, television, visual storytelling, production design, post-production and branded content.</p>
              </div>
              <div className="p-5 rounded-2xl bg-[#181818] border border-white/10">
                <Code className="w-7 h-7 text-emerald-400 mb-3" />
                <h4 className="font-bold text-sm text-white mb-1">Product Engineering</h4>
                <p className="text-xs text-white/60 leading-relaxed">Web and app development, AI systems, automation, enterprise software and digital infrastructure.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Journey */}
        <div className="mb-24">
          <div className="max-w-3xl mb-10">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-3">The Journey</div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">Different chapters. One connected story.</h2>
            <p className="text-white/60 leading-relaxed">
              Ras Ali Labs is the convergence of years spent creating, performing, producing and building. Each chapter added a capability that now lives inside the company.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {journey.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.year} className="rounded-3xl bg-[#181818] border border-white/10 p-6 hover:border-brand-gold/30 transition-colors">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-brand-gold font-extrabold text-sm tracking-wider">{item.year}</span>
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Icon size={18} className="text-white/80" />
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-white/55 leading-relaxed">{item.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Identity statement */}
        <div className="mb-24 rounded-[2rem] border border-brand-gold/20 bg-gradient-to-br from-brand-gold/[0.08] via-[#181818] to-[#121212] p-8 md:p-12 lg:p-16">
          <div className="max-w-4xl">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-4">Why Ras Ali Labs Exists</div>
            <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
              The best ideas rarely live inside one industry.
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed mb-5">
              Businesses are usually asked to choose between a technology company, a creative studio, a production house, an automation consultant or an AI partner. We built Ras Ali Labs because the most interesting problems often need several of those perspectives at once.
            </p>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              We bring strategy, software, design, film, sound and intelligent automation into one environment — so an idea can move from concept to system, from story to product, and from prototype to something a real organization can use.
            </p>
          </div>
        </div>

        {/* 4 Pillars */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-3">What We Do</div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">Four disciplines. One company.</h2>
            <p className="text-white/60 text-sm md:text-base">Ras Ali Labs is the parent multidisciplinary brand. Ralion OS is our flagship technology product — not the limit of what we build.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilityPillars.map((pillar) => (
              <div key={pillar.id} className="p-6 rounded-3xl bg-[#181818] border border-white/10 flex flex-col justify-between hover:border-white/20 transition-colors">
                <div>
                  <h3 className="font-bold text-lg text-white mb-2">{pillar.title}</h3>
                  <p className="text-xs text-white/60 leading-relaxed mb-4">{pillar.description}</p>
                </div>
                <Link
                  to={pillar.href}
                  className="text-xs font-bold text-brand-gold hover:underline flex items-center gap-1"
                >
                  Explore capability <ArrowRight size={12} />
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-24">
          <div className="lg:col-span-4">
            <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-3">How We Work</div>
            <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-4">Create. Innovate. Automate.</h2>
            <p className="text-white/60 leading-relaxed">Our work may change shape from one project to another, but the principles stay consistent.</p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-5">
            {principles.map((principle, index) => (
              <div key={principle.title} className="p-6 rounded-3xl border border-white/10 bg-[#181818]">
                <span className="text-xs text-brand-gold font-extrabold">0{index + 1}</span>
                <h3 className="text-lg font-bold mt-4 mb-3">{principle.title}</h3>
                <p className="text-sm text-white/55 leading-relaxed">{principle.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Flagship Product */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <span className="px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold uppercase">
                Flagship Technology
              </span>
              <h3 className="text-2xl md:text-4xl font-extrabold text-white">
                Ralion OS — Empowered to Prosper
              </h3>
              <p className="text-white/70 text-sm md:text-base leading-relaxed">
                Ralion OS is the flagship AI business operating system created by Ras Ali Labs. It brings CRM, operations, growth, social intelligence, automation and Mari AI into one connected business environment.
              </p>
              <p className="text-white/55 text-sm leading-relaxed">
                Ralion represents the technology side of the Ras Ali Labs story at full scale: a product shaped by the same belief that strong systems should feel intelligent, useful and human.
              </p>
              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/products/ralion-os"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-all"
                >
                  Explore Ralion OS
                </Link>
                <a
                  href="/ralion"
                  className="px-6 py-2.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 border border-white/15 transition-all"
                >
                  Launch Ralion
                </a>
              </div>
            </div>
            <div className="lg:col-span-4 flex justify-center">
              <img src="/assets/images/logo.png" alt="Ralion OS" className="w-36 h-36 md:w-44 md:h-44 object-contain" />
            </div>
          </div>
        </div>

        {/* Botswana / wider ambition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-24">
          <div className="p-8 rounded-3xl bg-[#181818] border border-white/10">
            <MapPin className="w-8 h-8 text-brand-gold mb-5" />
            <h3 className="text-2xl font-bold mb-3">Rooted in Botswana</h3>
            <p className="text-white/60 leading-relaxed">
              Ras Ali Labs is based in Gaborone. Building from Botswana keeps us close to the realities of African businesses — the need for practical systems, strong relationships, cost awareness, resilience and technology that works in the real world.
            </p>
          </div>
          <div className="p-8 rounded-3xl bg-[#181818] border border-white/10">
            <Globe2 className="w-8 h-8 text-brand-gold mb-5" />
            <h3 className="text-2xl font-bold mb-3">Built to Go Further</h3>
            <p className="text-white/60 leading-relaxed">
              Our ambition is larger than geography. We build products, platforms and creative work that can compete beyond our home market while carrying a distinctly African point of view into global technology and media.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 md:p-14 text-center max-w-4xl mx-auto">
          <div className="text-xs font-bold text-brand-gold uppercase tracking-wider mb-3">Work With Us</div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Bring us the idea that doesn't fit neatly in one box.</h2>
          <p className="text-white/70 text-sm md:text-base mb-7 max-w-2xl mx-auto leading-relaxed">
            Whether it becomes a software platform, an AI workflow, a film, a digital experience, original sound — or a combination of all of them — that's exactly where Ras Ali Labs is most at home.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20"
          >
            Start a Conversation <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;
