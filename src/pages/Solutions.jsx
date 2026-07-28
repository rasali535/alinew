import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Building2, Truck, Activity, Globe, CheckCircle2, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

const Solutions = () => {
  const industryOSList = [
    {
      id: 'funeral',
      name: 'Funeral OS',
      subtitle: 'For Funeral Homes & Mortuary Services',
      description: 'Streamline case management, family relations, service package selection, coffin inventory control, and payment processing.',
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
      name: 'Logistics OS',
      subtitle: 'For Transport & Cargo Companies',
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
      id: 'health',
      name: 'Health OS',
      subtitle: 'For Healthcare & Medical Clinics',
      description: 'Manage patient case records, doctor appointments, consultation histories, electronic prescriptions, and medical billing.',
      icon: Activity,
      features: [
        'Patient Case Records & History',
        'Doctor Appointments & Schedules',
        'Electronic Prescriptions',
        'Medical Billing & Medical Aid Claims'
      ]
    },
    {
      id: 'trade',
      name: 'Trade OS',
      subtitle: 'For Commerce & Distributors',
      description: 'B2B procurement, supplier directory, customer order fulfillment, commodity pricing, and trade analytics.',
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
        title="Industry Solutions — Ralion OS | Ras Ali Labs"
        description="Purpose-built industry operating systems: Funeral OS, Logistics OS, Health OS, and Trade OS powered by Ralion."
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Purpose-Built Operating Systems
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4">
            Enterprise Industry Solutions
          </h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Tailored Ralion OS modules engineered specifically for funeral services, logistics transport, healthcare clinics, and B2B trade.
          </p>
        </div>

        {/* Industry OS Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {industryOSList.map((os) => {
            const IconComp = os.icon;
            return (
              <div
                key={os.id}
                id={os.id}
                className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <IconComp size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">{os.name}</h3>
                      <p className="text-brand-gold text-xs font-medium">{os.subtitle}</p>
                    </div>
                  </div>

                  <p className="text-white/60 text-sm mb-6">{os.description}</p>

                  <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                    {os.features.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-white/80">
                        <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  to="/contact"
                  className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-brand-gold hover:text-black font-bold text-xs transition-all flex items-center justify-center gap-2"
                >
                  Request {os.name} Demo <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Banner */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-white/70">
          <div className="flex items-center gap-4">
            <ShieldCheck size={32} className="text-brand-gold shrink-0" />
            <div>
              <h4 className="text-white font-bold text-sm mb-0.5">Custom Industry Module Development</h4>
              <p>Need a custom operating system for your sector? Our engineering team builds tailored Ralion OS modules.</p>
            </div>
          </div>
          <Link to="/contact" className="py-3 px-6 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform shrink-0">
            Talk to Enterprise Team
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Solutions;
