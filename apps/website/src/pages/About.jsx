import React from 'react';
import SEO from '../components/common/SEO';
import { companyInfo } from '../data/mock';
import { Sparkles, Code, Cpu, Layers, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const About = () => {
    return (
        <section className="min-h-screen bg-zinc-950 relative overflow-hidden pt-32 pb-24">
            <SEO
                title="About | Ras Ali Labs"
                description={`Learn more about Ras Ali Labs, based in ${companyInfo.location}. Bridging the gap between artistic expression and digital innovation.`}
                url="/about"
            />
            
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-900/20 via-purple-900/10 to-transparent pointer-events-none"></div>
            <div className="absolute -top-[200px] -right-[200px] w-[600px] h-[600px] bg-purple-600/20 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute top-[20%] -left-[100px] w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none"></div>
            <div className="absolute inset-0 bg-[url('/assets/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10"></div>

            <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
                
                {/* Hero Section */}
                <div className="mb-24 mt-8 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm mb-8 text-sm text-zinc-300 font-medium">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        <span>Empowered to Prosper</span>
                    </div>
                    <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter mb-8 leading-tight">
                        CRAFTING THE <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
                            DIGITAL FUTURE
                        </span>
                    </h1>
                    <p className="text-zinc-400 text-lg md:text-xl max-w-2xl font-light leading-relaxed">
                        We bridge the gap between creative expression and digital innovation, building scalable, AI-powered solutions that resonate.
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center mb-32">
                    
                    {/* Image Column */}
                    <div className="lg:col-span-5 relative group">
                        <div className="absolute -inset-4 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl opacity-20 group-hover:opacity-40 transition duration-700 blur-xl"></div>
                        <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 shadow-2xl">
                            <img
                                src="/assets/images/ras-ali-formal.jpg"
                                alt="Ras Ali"
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                            
                            <div className="absolute bottom-8 left-8 right-8">
                                <h3 className="text-2xl font-bold text-white mb-1">Ras Ali</h3>
                                <p className="text-purple-400 font-medium">Creative Technologist & Founder</p>
                            </div>
                        </div>
                    </div>

                    {/* Text Column */}
                    <div className="lg:col-span-7 lg:pl-12 space-y-12">
                        <div className="space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Who We Are</h2>
                            <div className="w-12 h-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                {companyInfo.description}
                            </p>
                            <p className="text-zinc-400 text-lg leading-relaxed">
                                Based in <strong className="text-white font-medium">{companyInfo.location}</strong>, we don't just write code — we architect experiences. Whether it's building a cutting-edge AI workspace like Ralion OS, designing enterprise trade infrastructure, or producing engaging multimedia, our focus remains on delivering elegant, scalable, and beautifully designed technology.
                            </p>
                        </div>

                        {/* Approach Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6">
                            <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl backdrop-blur-sm hover:bg-zinc-900 transition-colors">
                                <Code className="w-8 h-8 text-blue-400 mb-4" />
                                <h4 className="text-white font-semibold text-lg mb-2">Technical Excellence</h4>
                                <p className="text-zinc-500 text-sm leading-relaxed">Clean architecture and robust codebases that power scalable, modern applications.</p>
                            </div>
                            <div className="bg-zinc-900/50 border border-zinc-800/50 p-6 rounded-2xl backdrop-blur-sm hover:bg-zinc-900 transition-colors">
                                <Cpu className="w-8 h-8 text-purple-400 mb-4" />
                                <h4 className="text-white font-semibold text-lg mb-2">AI-Powered</h4>
                                <p className="text-zinc-500 text-sm leading-relaxed">Integrating artificial intelligence to unlock new capabilities and automate complex workflows.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="relative rounded-3xl bg-zinc-900/30 border border-zinc-800 backdrop-blur-md p-12 overflow-hidden">
                    <div className="absolute right-0 top-0 w-[300px] h-[300px] bg-emerald-500/10 blur-[80px] rounded-full pointer-events-none"></div>
                    
                    <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center divide-y md:divide-y-0 md:divide-x divide-zinc-800">
                        <div className="flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-4">10+</span>
                            <span className="text-zinc-400 text-sm uppercase tracking-widest font-semibold">Years Experience</span>
                        </div>
                        <div className="flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-600 mb-4">20+</span>
                            <span className="text-zinc-400 text-sm uppercase tracking-widest font-semibold">Projects Completed</span>
                        </div>
                        <div className="flex flex-col items-center pt-8 md:pt-0">
                            <span className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600 mb-4">100%</span>
                            <span className="text-zinc-400 text-sm uppercase tracking-widest font-semibold">Commitment</span>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-32 text-center pb-12">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">Ready to build something great?</h2>
                    <Link to="/contact" className="inline-flex items-center gap-3 px-8 py-4 bg-white text-zinc-950 font-bold rounded-full hover:bg-zinc-200 transition-colors">
                        Let's Talk
                        <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>

            </div>
        </section>
    );
};

export default About;
