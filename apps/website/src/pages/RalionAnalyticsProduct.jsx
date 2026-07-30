import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { BarChart3, ArrowRight, PieChart, TrendingUp, Activity, Target } from 'lucide-react';

const RalionAnalyticsProduct = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Business Analytics — Data-Driven Insights with Ralion | Ras Ali Labs"
        description="Visualize data, track KPIs, and make informed decisions with Ralion Business Analytics."
      />

      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <BarChart3 size={14} /> Priority Core Product • Business Analytics
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold mb-4 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            Data-driven insights for your entire business.
          </h1>
          <p className="text-brand-gold font-bold text-lg mb-6">
            "Stop guessing. Start knowing."
          </p>
          <p className="text-white/70 text-lg max-w-3xl mx-auto leading-relaxed mb-8">
            Unify your data sources into real-time dashboards, track your most critical KPIs, and leverage AI to uncover hidden trends in your business performance.
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
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <PieChart size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Custom Dashboards</h4>
            <p className="text-white/60 text-xs leading-relaxed">Build beautiful, interactive dashboards tailored to different roles across your organization.</p>
          </div>
          
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-4">
              <Target size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Goal Tracking</h4>
            <p className="text-white/60 text-xs leading-relaxed">Set and monitor progress toward revenue targets, campaign KPIs, and operational goals.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Trend Analysis</h4>
            <p className="text-white/60 text-xs leading-relaxed">Use predictive modeling to forecast sales, identify seasonal patterns, and anticipate market shifts.</p>
          </div>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-6 hover:border-blue-500/40 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <Activity size={20} />
            </div>
            <h4 className="text-lg font-bold text-white mb-2">Real-time Reporting</h4>
            <p className="text-white/60 text-xs leading-relaxed">Generate up-to-the-minute reports on campaign performance, sales pipeline health, and system usage.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RalionAnalyticsProduct;
