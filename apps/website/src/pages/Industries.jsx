import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Building2, Truck, Activity, Landmark, Globe, CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const Industries = () => {
  const industryList = [
    {
      id: 'funeral',
      name: 'Funeral Management',
      badge: 'Funeral OS',
      subtitle: 'For Funeral Homes & Mortuary Services',
      description: 'Streamline deceased case tracking, family management, funeral package selection, coffin inventory control, and payment processing.',
      icon: Building2,
      features: [
        'Case Management & Deceased Records',
        'Family Management & Relations',
        'Package Selection & Service Bundles',
        'Inventory & Coffin Stock Control',
        'Payments, Invoicing & Policy Sync'
      ]
    },
    {
      id: 'logistics',
      name: 'Logistics & Fleet Transport',
      badge: 'Logistics OS',
      subtitle: 'For Cargo Transport & Logistics Operators',
      description: 'Cross-border fleet management, real-time vehicle telemetry, digital waybills, customs clearance, and SADC corridor tracking.',
      icon: Truck,
      features: [
        'Fleet Management & Telemetry',
        'Real-time Vehicle & Cargo Tracking',
        'Digital Waybills & Manifests',
        'Customs & SADC Border Workflows'
      ]
    },
    {
      id: 'healthcare',
      name: 'Healthcare & Medical Services',
      badge: 'Health OS',
      subtitle: 'For Medical Clinics, Hospitals & Healthcare Providers',
      description: 'Manage patient case records, doctor appointments, consultation histories, electronic prescriptions, and medical aid billing.',
      icon: Activity,
      features: [
        'Patient Case Records & History',
        'Doctor Appointments & Schedules',
        'Electronic Prescriptions',
        'Medical Billing & Medical Aid Claims'
      ]
    },
    {
      id: 'government',
      name: 'Government & Public Sector',
      badge: 'Sovereign Digital Infrastructure',
      subtitle: 'For National Ministries, Agencies & Public Infrastructure',
      description: 'Air-gapped data sovereignty, regulatory audit logging, USSD gateway bridges, and multi-departmental workflow orchestration.',
      icon: Landmark,
      features: [
        'Data Sovereignty & On-Premise Enclaves',
        'Full Regulatory Audit Trail Logging',
        'USSD & SMS Citizen Gateway Integration',
        'Multi-Departmental Process Sync'
      ]
    },
    {
      id: 'trade',
      name: 'Trade & Commerce Networks',
      badge: 'Trade OS',
      subtitle: 'For B2B Commerce, Distributors & Exporters',
      description: 'B2B procurement, supplier directory, customer order fulfillment, commodity pricing, and SADC trade analytics.',
      icon: Globe,
      features: [
        'Procurement & Purchase Orders',
        'Supplier Catalog & Directory',
        'Customer Orders & Fulfillment',
        'Trade Analytics & Commodity Tracking'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Industry Solutions | Ras Ali Labs"
        description="Purpose-built enterprise AI operating systems for Funeral Management, Logistics, Healthcare, Government, and Trade."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Purpose-Built Operating Systems
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Enterprise Industry OS Solutions
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Tailored AI operating systems engineered specifically for Funeral Management, Logistics, Healthcare, Government, and Trade.
          </p>
        </div>

        {/* Industry Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {industryList.map((ind) => {
            const IconComp = ind.icon;
            return (
              <div
                key={ind.id}
                id={ind.id}
                className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <IconComp size={24} />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold">
                      {ind.badge}
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-white mb-1">{ind.name}</h3>
                  <p className="text-brand-gold text-xs font-medium mb-3">{ind.subtitle}</p>

                  <p className="text-white/60 text-xs mb-6 leading-relaxed">{ind.description}</p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {ind.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/request-demo"
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Request {ind.name} Demo <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Enterprise Security Banner */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Need a Custom Industry OS Solution?</h4>
              <p>Ras Ali Labs architects tailored enterprise AI operating systems for specialized industry sectors.</p>
            </div>
          </div>
          <Link
            to="/request-demo"
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-105 transition-transform shrink-0"
          >
            Request Custom AI Demo
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Industries;
