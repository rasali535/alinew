import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Cpu, Bot, Globe, Smartphone, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Solutions = () => {
  const { openAuthModal } = useAuth();

  const solutionList = [
    {
      title: 'Enterprise Operating Systems',
      description: 'Unified modular dashboards and multi-tenant architectures powering modern digital enterprises.',
      icon: Cpu,
      link: '/products/ralion'
    },
    {
      title: 'Autonomous Multi-Agent AI',
      description: 'Contextual AI worker agents powered by Gemini LLM and Supabase pgvector RAG indexers.',
      icon: Bot,
      link: '/products/mari-ai'
    },
    {
      title: 'Cross-Border SADC Trade',
      description: 'Escrow-backed B2B supply chain financing and verified corridor logistics tracking.',
      icon: Globe,
      link: '/products/tradegrid-africa'
    },
    {
      title: 'USSD & Fintech Protocol Gateways',
      description: 'Ultra-low latency bridges connecting feature phone USSD sessions with web platform state.',
      icon: Smartphone,
      link: '/products/dfs-platform'
    }
  ];

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-brand-gold text-xs font-semibold uppercase tracking-widest block mb-3">
            Ras Ali Labs Solutions
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6">
            Architecting Digital Transformation Across Emerging Markets.
          </h1>
          <p className="text-white/60 text-lg">
            Scalable software infrastructure tailored for enterprise automation, fintech integration, and AI-driven growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {solutionList.map((sol, idx) => {
            const Icon = sol.icon;
            return (
              <div
                key={idx}
                className="bg-[#252525] border border-white/10 p-8 rounded-3xl hover:border-brand-gold/40 transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Icon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-gold transition-colors">
                    {sol.title}
                  </h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-6">{sol.description}</p>
                </div>

                <Link
                  to={sol.link}
                  className="inline-flex items-center gap-2 text-brand-gold text-xs font-bold hover:underline"
                >
                  Explore Solution Product <ArrowRight size={14} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Solutions;
