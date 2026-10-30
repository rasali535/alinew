import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  partnerProgramOverview,
  getPublishedPartners,
  getAllPartners,
  hasPublishedPartners
} from '../../data/partners';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Sparkles,
  Info,
  Clock,
  Layers,
  Lock
} from 'lucide-react';

const PartnersSection = ({ showPreviewToggle = true }) => {
  const [showPendingPreview, setShowPendingPreview] = useState(false);
  const publishedPartners = getPublishedPartners();
  const allPartners = getAllPartners();
  const hasActive = hasPublishedPartners();

  return (
    <section className="py-24 px-6 lg:px-12 bg-[#101010] text-white border-t border-white/10 relative overflow-hidden">
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Building2 size={14} /> Technology Ecosystem
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            {partnerProgramOverview.headline}
          </h2>
          <p className="text-white/70 text-base md:text-lg leading-relaxed">
            {partnerProgramOverview.supportingText}
          </p>
        </div>

        {/* If Active Published Partners Exist: Render Public Grid */}
        {hasActive ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {publishedPartners.map((partner) => (
              <div
                key={partner.id}
                className="bg-[#181818] border border-white/10 hover:border-brand-gold/40 rounded-3xl p-8 transition-all flex flex-col justify-between group shadow-xl"
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
                    <span className="text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold border border-brand-gold/20">
                      {partner.categoryTitle}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-gold transition-colors">
                    {partner.name}
                  </h3>

                  <p className="text-white/70 text-xs leading-relaxed mb-6">
                    {partner.shortDescription}
                  </p>

                  <div className="space-y-1.5 border-t border-white/10 pt-4 mb-6">
                    {partner.collaborationScope.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/75">
                        <CheckCircle2 size={12} className="text-brand-gold shrink-0" />
                        <span className="truncate">{item}</span>
                      </div>
                    ))}
                  </div>
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
                  <Link
                    to="/partners"
                    className="text-xs text-white/60 hover:text-white transition-colors"
                  >
                    View Directory →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty / Onboarding State: Transparent Governance Standards */
          <div className="mb-16">
            <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 mb-8 shadow-xl">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase">
                    <ShieldCheck size={13} /> Strict Verification Standards
                  </div>
                  <h3 className="text-2xl md:text-3xl font-extrabold text-white">
                    Verified Partnership Governance
                  </h3>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Ras Ali Labs only publishes technology partnerships that are backed by formal bilateral agreements, verified technical capabilities, and mutual service level commitments. We maintain strict non-disclosure, ethical boundaries, and compliance with the Botswana Data Protection Act (Act 32).
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link
                      to="/contact?service=partnership"
                      className="px-5 py-2.5 rounded-xl bg-brand-gold text-black font-extrabold text-xs hover:bg-white transition-all flex items-center gap-1.5"
                    >
                      Inquire on Technology Partnership <ArrowRight size={13} />
                    </Link>
                    <Link
                      to="/partners"
                      className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/15 transition-all"
                    >
                      Explore Partner Directory & Governance
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 grid grid-cols-1 gap-3 text-xs">
                  {partnerProgramOverview.partnershipValues.map((val, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-1">
                      <div className="font-bold text-white flex items-center gap-2">
                        <CheckCircle2 size={14} className="text-brand-gold" />
                        <span>{val.title}</span>
                      </div>
                      <p className="text-white/60 leading-relaxed text-[11px] pl-6">
                        {val.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feature-flagged entry preview for review & audit (ShieldByte Infosec) */}
            {showPreviewToggle && (
              <div className="bg-[#141414] border border-white/10 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <Clock size={16} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <span>Partner Onboarding Pipeline</span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold">
                          1 Pending Execution
                        </span>
                      </div>
                      <p className="text-[11px] text-white/50">
                        ShieldByte Infosec channel partner agreement V1.1 is in preparation / bilateral execution.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowPendingPreview(!showPendingPreview)}
                    className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-colors shrink-0"
                  >
                    {showPendingPreview ? 'Hide Pipeline Entry' : 'Inspect Pipeline Entry'}
                  </button>
                </div>

                {showPendingPreview && (
                  <div className="mt-6 pt-6 border-t border-white/10 animate-fadeIn">
                    <div className="p-5 rounded-2xl bg-[#1b1b1b] border border-amber-500/30 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src="/assets/images/partners/shieldbyte.svg"
                            alt="ShieldByte Infosec"
                            className="h-7 w-auto object-contain"
                          />
                          <span className="text-xs font-bold text-white">ShieldByte Infosec</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Pending Bilateral Execution
                        </span>
                      </div>

                      <p className="text-xs text-white/75 leading-relaxed">
                        "Ras Ali Labs collaborates with ShieldByte Infosec to connect businesses with specialist cybersecurity expertise, security assessments and digital protection solutions."
                      </p>

                      <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] text-white/60 space-y-1">
                        <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                          <Lock size={12} /> Publication Governance Rule:
                        </div>
                        <p>
                          The ShieldByte V1.1 channel partner agreement must be fully executed by both parties, and partner branding/publication rights must be confirmed before this entry is published as an active partnership.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Section Footer Call to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/10 gap-4 text-xs">
          <div className="text-white/60 text-center sm:text-left">
            Interested in collaborating as an approved technology or infrastructure partner?
          </div>
          <Link
            to="/partners"
            className="text-brand-gold hover:underline font-bold flex items-center gap-1"
          >
            Visit Our Partners Directory <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default PartnersSection;
