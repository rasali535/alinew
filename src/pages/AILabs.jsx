import React, { useEffect } from 'react';
import SEO from '../components/common/SEO';
import { aiLabsImages, companyInfo } from '../data/mock';

const AILabs = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <section className="min-h-screen bg-brand-dark pt-32 pb-20 px-6 lg:px-12">
            <SEO
                title="Inside AI Labs | Ras Ali"
                description={companyInfo.aiLabsDescription}
                url="/ai-labs"
            />

            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-20">
                    <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-6">
                        AI LABS
                    </h1>
                    <p className="text-white/50 text-lg max-w-2xl">
                        {companyInfo.aiLabsDescription}
                    </p>
                </div>

                {/* Main Showcase */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 mb-24">
                    <div className="space-y-8">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 group">
                            <img
                                src={aiLabsImages[0]}
                                alt="AI Lab Experiment 1"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                        <div>
                            <h3 className="text-2xl text-white font-light mb-4">Supply Chain Sentinel AI</h3>
                            <p className="text-white/70 leading-relaxed">
                                A comprehensive AI-driven executive dashboard and risk monitor. It features real-time supplier intelligence, automated risk monitoring, agent-driven workflow visualization, and an intelligent strategy center to orchestrate complex global supply chains.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-8 lg:pt-20">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-white/5 border border-white/10 group">
                            <img
                                src={aiLabsImages[1]}
                                alt="AI Lab Experiment 2"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                        <div>
                            <h3 className="text-2xl text-white font-light mb-4">Intelligent Trade Infrastructure</h3>
                            <p className="text-white/70 leading-relaxed">
                                Bridging the gap between accessible USSD technology and modern web interfaces using Supabase, pgvector, and Google's Gemini API. This architecture deploys specialized AI agents for trade discovery, compliance, and logistics orchestration across Africa.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Additional Gallery */}
                <div className="mb-24">
                    <h2 className="text-3xl font-light text-white mb-12">Latest Experiments</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {aiLabsImages.map((image, i) => (
                            <div key={i} className="group cursor-pointer">
                                <div className="aspect-square rounded-xl overflow-hidden bg-white/5 mb-4 border border-white/10">
                                    <img
                                        src={image}
                                        alt={`Experiment ${i + 1}`}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500"
                                    />
                                </div>
                                <div className="flex justify-between items-baseline">
                                    <span className="text-white text-lg font-light">Prototype 00{i + 1}</span>
                                    <span className="text-brand-gold text-xs uppercase tracking-widest">R&D</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AILabs;
