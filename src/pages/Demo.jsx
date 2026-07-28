import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  Truck,
  HeartPulse,
  TrendingUp,
  Users,
  Calendar,
  Package,
  Activity,
  ArrowRight,
  Sparkles,
  Bot,
  Play,
  CheckCircle2,
  Lock,
  ExternalLink
} from 'lucide-react';

const Demo = () => {
  const navigate = useNavigate();
  const [activeOrg, setActiveOrg] = useState('logistics');

  const demoOrgs = [
    {
      id: 'logistics',
      name: 'ABC Logistics',
      subtitle: 'Fleet & Cross-Border Supply Chain',
      icon: Truck,
      color: 'border-blue-500 text-blue-400 bg-blue-500/10',
      metrics: [
        { label: 'Active Fleet Vehicles', value: '42 Trucks' },
        { label: 'Border Clearances (SADC)', value: '18 Shipments' },
        { label: 'On-Time Delivery Rate', value: '99.4%' }
      ],
      dataList: [
        { col1: 'SHP-8821', col2: 'Gaborone ➔ Johannesburg', col3: 'In Transit (Kazungula Border)', status: 'On Schedule' },
        { col1: 'SHP-8822', col2: 'Francistown ➔ Lusaka', col3: 'Customs Verification', status: 'Pending KYB' },
        { col1: 'SHP-8823', col2: 'Maun ➔ Windhoek', col3: 'Delivered', status: 'Completed' }
      ]
    },
    {
      id: 'clinic',
      name: 'Pameltex Wellness Clinic',
      subtitle: 'Client Appointments & Case Files',
      icon: HeartPulse,
      color: 'border-purple-500 text-purple-400 bg-purple-500/10',
      metrics: [
        { label: 'Registered Clients', value: '1,240 Patients' },
        { label: 'Today’s Appointments', value: '14 Consultations' },
        { label: 'Case Resolution Rate', value: '98.2%' }
      ],
      dataList: [
        { col1: 'K. Motlhagodi', col2: 'Wellness & Physical Exam', col3: 'Today 14:30 CAT', status: 'Confirmed' },
        { col1: 'L. Sithole', col2: 'Therapeutic Follow-up', col3: 'Tomorrow 10:00 CAT', status: 'Scheduled' },
        { col1: 'M. Tau', col2: 'Nutritional Consultation', col3: 'Completed Yesterday', status: 'Resolved' }
      ]
    },
    {
      id: 'agency',
      name: 'Demo Marketing Agency',
      subtitle: 'Campaigns & Content Calendar',
      icon: TrendingUp,
      color: 'border-amber-500 text-amber-400 bg-amber-500/10',
      metrics: [
        { label: 'Active Ad Campaigns', value: '8 Campaigns' },
        { label: 'Content Posts Scheduled', value: '34 Posts' },
        { label: 'Conversion ROI', value: '3.8x ROAS' }
      ],
      dataList: [
        { col1: 'Eagle Touch Launch', col2: 'Social & Google Ads', col3: 'Reach: 142,000', status: 'Live' },
        { col1: 'Ralion Launch Sequence', col2: 'Email Lifecycle Sequence', col3: 'Open Rate: 68%', status: 'Active' },
        { col1: 'TradeGrid SADC Expo', col2: 'Event Marketing', col3: 'Leads Generated: 240', status: 'Completed' }
      ]
    }
  ];

  const currentOrg = demoOrgs.find((o) => o.id === activeOrg) || demoOrgs[0];

  const handleStartRealWorkspace = () => {
    analytics.trackConversion('demo_to_onboarding_start', { demoOrg: activeOrg });
    navigate('/onboarding');
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Interactive Demo | Test Drive Ralion | Ras Ali Labs"
        description="Try Ralion interactive demo environment without registration. Test drive ABC Logistics, Pameltex Wellness, and Marketing Agency workspaces."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Play size={14} /> Instant Interactive Sandbox • No Registration Required
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Test Drive Ralion Platform
          </h1>
          <p className="text-white/60 text-lg">
            Experience how Ralion powers Logistics, Health & Wellness, and Marketing Agencies in a live pre-populated environment.
          </p>
        </div>

        {/* Demo Selector Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-10">
          {demoOrgs.map((org) => {
            const Icon = org.icon;
            const isActive = activeOrg === org.id;
            return (
              <button
                key={org.id}
                onClick={() => {
                  setActiveOrg(org.id);
                  analytics.trackProductEvent('demo_switch_org', { org: org.id });
                }}
                className={`px-6 py-3.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-3 ${
                  isActive
                    ? 'border-brand-gold bg-brand-gold text-black shadow-lg shadow-brand-gold/20'
                    : 'border-white/10 bg-[#252525] text-white/70 hover:text-white hover:border-white/30'
                }`}
              >
                <Icon size={18} /> {org.name}
              </button>
            );
          })}
        </div>

        {/* Live Demo Interactive Workspace Panel */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl mb-16">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10 mb-8">
            <div>
              <span className="text-brand-gold text-xs font-bold uppercase tracking-wider block mb-1">
                Demo Workspace Mode
              </span>
              <h2 className="text-2xl font-extrabold text-white">{currentOrg.name}</h2>
              <p className="text-white/50 text-xs mt-0.5">{currentOrg.subtitle}</p>
            </div>

            <button
              onClick={handleStartRealWorkspace}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-xs font-bold hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-brand-gold/20"
            >
              Create Your Real Workspace <ArrowRight size={14} />
            </button>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {currentOrg.metrics.map((m, idx) => (
              <div key={idx} className="bg-black/40 border border-white/10 p-5 rounded-2xl">
                <div className="text-white/50 text-xs mb-1">{m.label}</div>
                <div className="text-2xl font-bold text-brand-gold">{m.value}</div>
              </div>
            ))}
          </div>

          {/* Sample Data Table */}
          <div className="bg-black/40 border border-white/10 rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-white/40 pb-2">
                  <th className="p-3">Reference / Item</th>
                  <th className="p-3">Details / Route</th>
                  <th className="p-3">Status / Telemetry</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-white/80">
                {currentOrg.dataList.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="p-3 font-bold text-white">{row.col1}</td>
                    <td className="p-3 text-white/70">{row.col2}</td>
                    <td className="p-3">{row.col3}</td>
                    <td className="p-3 text-right">
                      <span className="px-2.5 py-1 rounded bg-brand-gold/10 text-brand-gold font-semibold text-[10px]">
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Demo Callout Banner */}
        <div className="bg-gradient-to-r from-brand-gold/20 via-[#252525] to-[#1c1c1c] border border-brand-gold/30 rounded-3xl p-10 text-center">
          <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
            Impressed by the Demo?
          </h3>
          <p className="text-white/70 text-sm max-w-xl mx-auto mb-8">
            Create your free Ras Ali Labs account and launch Ralion for your own business in less than 2 minutes.
          </p>
          <button
            onClick={handleStartRealWorkspace}
            className="py-4 px-8 rounded-xl bg-brand-gold text-black font-bold text-sm hover:scale-105 transition-transform shadow-lg shadow-brand-gold/20"
          >
            Launch Free Workspace Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default Demo;
