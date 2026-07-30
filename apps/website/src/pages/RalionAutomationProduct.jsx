import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { Zap, ArrowRight, Settings, FileText, Bell } from 'lucide-react';

const RalionAutomationProduct = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Business Automation — Automate Workflows with Ralion | Ras Ali Labs"
        description="Build workflows, automate tasks, generate documents, and trigger notifications with Ralion Business Automation."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <Zap size={14} /> Priority Core Product • Business Automation
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Automate your business.
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-6">
            "Eliminate manual work and scale your operations."
          </p>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-8">
            Create powerful, logic-driven workflows to automate tasks, generate documents, and keep your teams aligned with smart notifications.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/request-demo"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
            >
              Request Enterprise Demo <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <Settings size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Workflow Builder</h4>
            <p className="text-white/60 text-xs leading-relaxed">Visual drag-and-drop builder for creating complex conditional logic and multi-step processes.</p>
          </div>
          
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <Zap size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Task Automation</h4>
            <p className="text-white/60 text-xs leading-relaxed">Automatically assign tasks, update statuses, and trigger actions based on real-time data events.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <FileText size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Document Automation</h4>
            <p className="text-white/60 text-xs leading-relaxed">Dynamically generate invoices, contracts, and reports using live CRM data.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-emerald-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Bell size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Notifications</h4>
            <p className="text-white/60 text-xs leading-relaxed">Customizable alerts delivered via email, SMS, or in-app to keep stakeholders informed.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionAutomationProduct;
