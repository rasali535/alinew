import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { organizationSchema, localBusinessSchema, makeBreadcrumbSchema } from '../lib/seoSchema';
import {
  partnerProgramOverview,
  partnerCategories,
  getPublishedPartners,
  getAllPartners,
  hasPublishedPartners
} from '../data/partners';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Clock,
  Lock,
  Layers,
  Sparkles,
  Info,
  Server,
  Code,
  FileCheck,
  ChevronRight
} from 'lucide-react';

const categoryIconMap = {
  cybersecurity: ShieldCheck,
  infrastructure: Server,
  software: Code,
  strategic: Building2
};

const Partners = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showPending, setShowPending] = useState(false);

  const publishedPartners = getPublishedPartners();
  const allPartners = getAllPartners();
  const hasActive = hasPublishedPartners();

  // Filter partners based on selected category & pending toggle
  const currentPartners = (showPending ? allPartners : publishedPartners).filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Technology Partners | Ras Ali Labs Botswana"
        description="Working with specialist technology providers to deliver practical, dependable solutions for businesses in Botswana and beyond."
        keywords="Technology partners Botswana, cybersecurity partners Gaborone, software partners Botswana, infrastructure partners Botswana, Ras Ali Labs partners"
        canonical="https://rasalilabs.com/partners"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema,
            localBusinessSchema,
            makeBreadcrumbSchema([
              { name: 'Home', url: '/' },
              { name: 'Our Technology Partners', url: '/partners' }
            ])
          ]
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8 font-mono">
          <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
          <span>/</span>
          <span className="text-brand-gold font-semibold">Technology Partners</span>
        </div>

        {/* HERO SECTION */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Building2 size={14} /> Technology Ecosystem
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            {partnerProgramOverview.headline}
          </h1>
          <p className="text-white/70 text-lg leading-relaxed mb-6">
            {partnerProgramOverview.supportingText}
          </p>
          <div className="p-4 rounded-2xl bg-[#181818] border border-white/10 text-xs text-white/70 flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white">Strict Verification Standard:</strong> {partnerProgramOverview.governanceCommitment}
            </p>
          </div>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex flex-wrap items-center gap-2 mb-12 border-b border-white/10 pb-4">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/20'
                : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            All Categories
          </button>
          {partnerCategories.map((cat) => {
            const Icon = categoryIconMap[cat.id] || Building2;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-brand-gold text-black font-bold shadow-md shadow-brand-gold/20'
                    : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={13} />
                <span>{cat.title}</span>
              </button>
            );
          })}
        </div>

        {/* PARTNERS DISPLAY GRID OR TRANSPARENT GOVERNANCE STATE */}
        {hasActive || showPending ? (
          <div className="space-y-12 mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {currentPartners.map((partner) => {
                const isPending = partner.status === 'pending_execution' || !partner.isPublished;
                return (
                  <div
                    key={partner.id}
                    className={`bg-[#181818] border rounded-3xl p-8 transition-all flex flex-col justify-between group shadow-xl ${
                      isPending ? 'border-amber-500/30' : 'border-white/10 hover:border-brand-gold/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-6">
                        <div className="h-12 flex items-center">
                          {partner.logo ? (
                            <img
                              src={partner.logo}
                              alt={`${partner.name} logo`}
                              className="h-10 w-auto object-contain"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="text-xl font-bold text-white">{partner.name}</div>
                          )}
                        </div>

                        {isPending ? (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            Pending Execution
                          </span>
                        ) : (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                            {partner.categoryTitle}
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-gold transition-colors">
                        {partner.name}
                      </h3>

                      <p className="text-white/70 text-xs leading-relaxed mb-6">
                        {partner.shortDescription}
                      </p>

                      <div className="space-y-1.5 border-t border-white/10 pt-4 mb-6">
                        <div className="text-[10px] font-bold text-brand-gold uppercase tracking-wider mb-2">
                          Collaboration Scope
                        </div>
                        {partner.collaborationScope.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-white/75">
                            <CheckCircle2 size={12} className="text-brand-gold shrink-0" />
                            <span className="truncate">{item}</span>
                          </div>
                        ))}
                      </div>

                      {isPending && (
                        <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-[11px] text-amber-200/80 mb-4 space-y-1">
                          <strong className="block text-amber-300 font-semibold flex items-center gap-1">
                            <Lock size={12} /> Execution Governance:
                          </strong>
                          <p>{partner.publicationNote}</p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      {partner.website && (
                        <a
                          href={partner.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-gold hover:underline font-semibold flex items-center gap-1"
                        >
                          Official Website <ExternalLink size={12} />
                        </a>
                      )}
                      <span className="text-[10px] font-mono text-white/40">
                        {partner.region}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* When zero published partners exist in public mode: Display transparent governance overview */
          <div className="mb-20 space-y-8">
            <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 shadow-xl">
              <div className="max-w-3xl mb-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase mb-3">
                  <ShieldCheck size={13} /> Bilateral Governance Policy
                </div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
                  Partner Verification & Onboarding Process
                </h2>
                <p className="text-white/70 text-sm leading-relaxed">
                  Ras Ali Labs is currently formalizing strategic partnerships across cybersecurity, sovereign cloud infrastructure, and enterprise application delivery. To maintain integrity, partner listings are published only when bilateral agreements and branding authorizations are fully executed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {partnerProgramOverview.partnershipValues.map((val, idx) => (
                  <div key={idx} className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                    <div className="font-bold text-white text-sm flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-brand-gold" />
                      <span>{val.title}</span>
                    </div>
                    <p className="text-white/60 leading-relaxed text-xs">
                      {val.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Pipeline inspection drawer (for review without publishing unverified active partnerships) */}
            <div className="bg-[#151515] border border-white/10 rounded-2xl p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <Clock size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Planned Partnership Pipeline</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                        1 In Bilateral Review
                      </span>
                    </h4>
                    <p className="text-xs text-white/50">
                      Channel partner agreement V1.1 prepared for ShieldByte Infosec.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowPending(!showPending)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all shrink-0"
                >
                  {showPending ? 'Hide Onboarding Entry' : 'Inspect Prepared Entry'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FUTURE PARTNER CATEGORIES OVERVIEW */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Partner Disciplines & Programs</h2>
            <p className="text-white/60 text-sm">
              We collaborate with specialist technology providers across four structured categories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {partnerCategories.map((cat) => {
              const Icon = categoryIconMap[cat.id] || Building2;
              return (
                <div
                  key={cat.id}
                  className="p-6 rounded-3xl bg-[#181818] border border-white/10 hover:border-brand-gold/30 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="w-12 h-12 rounded-2xl bg-white/5 text-brand-gold border border-white/10 flex items-center justify-center mb-4">
                      <Icon size={22} />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">{cat.title}</h3>
                    <p className="text-white/65 text-xs leading-relaxed">
                      {cat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BECOME A PARTNER CALL TO ACTION */}
        <div className="bg-gradient-to-r from-[#181818] via-[#201c18] to-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase mb-4">
            <Sparkles size={13} /> Collaborate With Us
          </div>
          <h2 className="text-3xl font-bold text-white mb-3">Become a Technology Partner</h2>
          <p className="text-white/70 text-sm max-w-xl mx-auto mb-8 leading-relaxed">
            Are you a cybersecurity firm, cloud infrastructure provider, or specialist software engineering team looking to collaborate in Botswana and the wider SADC region?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/contact?service=partnership"
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
            >
              Initiate Partnership Discussion <ArrowRight size={14} />
            </Link>
            <Link
              to="/about"
              className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all"
            >
              Learn More About Ras Ali Labs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Partners;
