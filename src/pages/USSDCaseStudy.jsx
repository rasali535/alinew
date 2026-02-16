import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
    ArrowLeft,
    Layers,
    Cpu,
    Database,
    Zap,
    ShieldCheck,
    Smartphone,
    Globe,
    Share2,
    ExternalLink
} from 'lucide-react';

const USSDCaseStudy = () => {
    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    return (
        <div className="min-h-screen bg-brand-dark pt-32 pb-20 overflow-x-hidden">
            <SEO
                title="Case Study: USSD-Web Gap | Ras Ali"
                description="Exploring a scalable architecture designed to synchronize USSD interactions with modern web platforms using an AI-driven interface with Supabase & Gemini."
                image="/assets/images/ussd-bridge.jpg"
            />

            {/* Background Accents */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-green/10 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 -z-10" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 -z-10" />

            <div className="max-w-6xl mx-auto px-6 lg:px-12">
                {/* Navigation */}
                <Link
                    to="/work"
                    className="inline-flex items-center gap-2 text-white/50 hover:text-brand-green mb-12 transition-all duration-300 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm uppercase tracking-widest font-medium">Back to Work</span>
                </Link>

                {/* Hero Header */}
                <header className="mb-20">
                    <div className="flex flex-col gap-4 mb-8">
                        <span className="text-brand-green font-medium tracking-[0.2em] uppercase text-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
                            Technical Case Study
                        </span>
                        <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-light tracking-tight leading-[0.95] animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            Bridging the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-green to-blue-400 font-normal">
                                USSD-Web Gap
                            </span>
                        </h1>
                    </div>

                    <div className="flex flex-wrap gap-4 mt-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-300">
                        {['Supabase', 'Gemini AI', 'pgvector', 'Edge Functions', 'React'].map((tag) => (
                            <span key={tag} className="px-5 py-2 rounded-full border border-white/10 bg-white/5 text-white/70 text-sm font-light backdrop-blur-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </header>

                {/* Featured Image Section */}
                <div className="relative aspect-[21/9] w-full rounded-3xl overflow-hidden bg-white/5 mb-32 border border-white/10 group animate-in shadow-2xl shadow-brand-green/5">
                    <img
                        src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
                        alt="USSD-Web Gap Visualization"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => {
                            e.target.src = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop';
                            e.target.className = 'w-full h-full object-cover opacity-50 contrast-125';
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-60" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24">
                    {/* Left Column: Content */}
                    <div className="lg:col-span-8 space-y-24">

                        {/* Overview */}
                        <section id="overview">
                            <h2 className="text-3xl text-white font-light mb-8 flex items-center gap-3">
                                <span className="w-10 h-[1px] bg-brand-green" />
                                Project Overview
                            </h2>
                            <p className="text-white/70 text-xl leading-relaxed font-light">
                                In the African digital landscape, millions of users rely on USSD for essential services,
                                while businesses require the data-rich environment of Web and App platforms.
                                This project demonstrates a scalable architecture designed to synchronize these two worlds
                                using an AI-driven interface.
                            </p>
                        </section>

                        {/* The Challenge */}
                        <section id="challenge" className="bg-white/5 border border-white/10 rounded-3xl p-10 lg:p-14 relative overflow-hidden group">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-red-500/10 blur-[80px] rounded-full group-hover:bg-red-500/20 transition-colors duration-700" />

                            <h2 className="text-3xl text-white font-light mb-12">The Challenge</h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 mb-6">
                                        <Database size={24} />
                                    </div>
                                    <h4 className="text-white font-medium">Data Silos</h4>
                                    <p className="text-white/50 text-sm leading-relaxed font-light">
                                        USSD interactions are often disconnected from web-based user profiles, leading to fragmented customer experiences.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400 mb-6">
                                        <Zap size={24} />
                                    </div>
                                    <h4 className="text-white font-medium">Latency</h4>
                                    <p className="text-white/50 text-sm leading-relaxed font-light">
                                        Providing real-time support in regions with fluctuating network speeds and minimal data availability.
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                                        <Layers size={24} />
                                    </div>
                                    <h4 className="text-white font-medium">Scalability</h4>
                                    <p className="text-white/50 text-sm leading-relaxed font-light">
                                        Handling millions of concurrent sessions across diverse geographical regions with varying infrastructure.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* The Solution */}
                        <section id="solution">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-[1px] bg-brand-green" />
                                <h2 className="text-3xl text-white font-light uppercase tracking-widest text-sm">The Solution</h2>
                            </div>
                            <h3 className="text-4xl md:text-5xl text-white font-light mb-10 leading-tight">
                                "The <span className="text-brand-green italic">Intelligent Edge</span>"
                            </h3>
                            <p className="text-white/70 text-xl leading-relaxed font-light mb-12">
                                I developed a prototype that utilizes <span className="text-white font-normal underline decoration-brand-green/30 decoration-2 underline-offset-4">Supabase</span> as the central nervous system to unify user identity and intent across all touchpoints.
                            </p>

                            {/* Tech Stack Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {[
                                    { title: 'Supabase (PostgreSQL)', desc: 'The core engine for identity and persistent storage.', icon: <Database /> },
                                    { title: 'Gemini API', desc: 'AI orchestration via Supabase Edge Functions for natural responses.', icon: <Cpu /> },
                                    { title: 'pgvector', desc: 'Semantic search of service documentation for precise retrieval.', icon: <Layers /> },
                                    { title: 'Supabase Realtime', desc: 'Instant state synchronization between USSD and Web dashboards.', icon: <Zap /> },
                                ].map((item, i) => (
                                    <div key={i} className="p-8 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition-all duration-300">
                                        <div className="text-brand-green mb-6">{item.icon}</div>
                                        <h4 className="text-white font-medium mb-3">{item.title}</h4>
                                        <p className="text-white/50 text-sm font-light leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Architecture Pipeline */}
                        <section id="architecture" className="relative group">
                            <div className="absolute inset-0 bg-brand-green/5 blur-[100px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

                            <h2 className="text-3xl text-white font-light mb-12">Architecture Highlight</h2>
                            <div className="bg-gradient-to-br from-white/[0.08] to-transparent border border-white/10 rounded-3xl p-10 lg:p-14 relative z-10">
                                <h3 className="text-2xl text-brand-green font-medium mb-8">The USSD-to-Vector Pipeline</h3>
                                <p className="text-white/70 mb-12 font-light italic">
                                    When a user queries the bot about a USSD service (e.g., "How do I register for Vuka?"), the system executes:
                                </p>

                                <div className="space-y-12">
                                    {[
                                        { title: 'Embedding Generation', desc: 'The query is converted into a vector embedding using high-performance models.' },
                                        { title: 'Semantic Match', desc: 'Supabase performs a cosine similarity search against a library of USSD codes stored in pgvector columns.' },
                                        { title: 'Contextual Response', desc: "The AI combines retrieved technical data with user profile status to provide instructions like: 'dial *123# to start'." },
                                    ].map((step, i) => (
                                        <div key={i} className="flex gap-8 group/step">
                                            <div className="flex flex-col items-center">
                                                <div className="w-10 h-10 rounded-full border border-brand-green/50 flex items-center justify-center text-brand-green font-medium bg-brand-dark group-hover/step:bg-brand-green group-hover/step:text-black transition-all duration-500">
                                                    {i + 1}
                                                </div>
                                                {i < 2 && <div className="w-[1px] h-full bg-white/10 mt-4" />}
                                            </div>
                                            <div className="pb-4">
                                                <h4 className="text-white font-medium mb-3 text-lg">{step.title}</h4>
                                                <p className="text-white/50 font-light leading-relaxed">{step.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Sidebar */}
                    <aside className="lg:col-span-4 space-y-12">
                        <div className="sticky top-40 space-y-12">
                            {/* Key Features */}
                            <div className="p-8 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md">
                                <h4 className="text-white font-medium mb-8 flex items-center gap-2">
                                    <Zap size={18} className="text-brand-green" />
                                    Key Technical Features
                                </h4>
                                <ul className="space-y-8">
                                    <li className="space-y-2">
                                        <div className="flex items-center gap-3 text-brand-green">
                                            <ShieldCheck size={18} />
                                            <span className="text-white text-sm font-medium">Row Level Security (RLS)</span>
                                        </div>
                                        <p className="text-white/40 text-[13px] leading-relaxed ml-7 font-light">
                                            Ensures that sensitive user data is only accessible to the authenticated owner.
                                        </p>
                                    </li>
                                    <li className="space-y-2">
                                        <div className="flex items-center gap-3 text-brand-green">
                                            <Globe size={18} />
                                            <span className="text-white text-sm font-medium">Edge Functions</span>
                                        </div>
                                        <p className="text-white/40 text-[13px] leading-relaxed ml-7 font-light">
                                            Serverless TypeScript functions handle the logic, ensuring the chatbot remains lightweight.
                                        </p>
                                    </li>
                                    <li className="space-y-2">
                                        <div className="flex items-center gap-3 text-brand-green">
                                            <Smartphone size={18} />
                                            <span className="text-white text-sm font-medium">State Persistence</span>
                                        </div>
                                        <p className="text-white/40 text-[13px] leading-relaxed ml-7 font-light">
                                            If a user starts a process on USSD, the backend updates their dashboard in real-time.
                                        </p>
                                    </li>
                                </ul>
                            </div>

                            {/* Tags */}
                            <div className="space-y-6 px-4">
                                <h4 className="text-white/30 text-xs uppercase tracking-[0.2em] font-medium">Deployment</h4>
                                <div className="flex flex-wrap gap-2">
                                    {['Vite', 'Hostinger', 'Vercel', 'PostgreSQL'].map(t => (
                                        <span key={t} className="px-3 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs font-light border border-white/5">
                                            {t}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Share/Actions */}
                            <div className="pt-8 flex flex-col gap-4">
                                <button className="w-full bg-brand-green text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white transition-all duration-500 hover:shadow-[0_0_20px_rgba(163,230,53,0.3)] group">
                                    Share Case Study
                                    <Share2 size={18} className="group-hover:rotate-12 transition-transform" />
                                </button>
                                <button className="w-full bg-white/5 text-white font-medium py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-white/10 border border-white/10 transition-all duration-300 backdrop-blur-sm">
                                    View Architecture Source
                                    <ExternalLink size={18} />
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Footer Link */}
                <div className="mt-40 pt-20 border-t border-white/10 text-center">
                    <p className="text-white/30 font-light mb-10">Next Case Study</p>
                    <Link
                        to="/work/10"
                        className="text-4xl md:text-6xl text-white font-light hover:text-brand-green transition-colors duration-500"
                    >
                        Pameltex Corporate →
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default USSDCaseStudy;
