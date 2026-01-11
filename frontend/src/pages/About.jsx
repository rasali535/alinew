import React from 'react';
import SEO from '../components/common/SEO';
import { companyInfo } from '../data/mock';

const About = () => {
    return (
        <section className="min-h-screen bg-brand-dark pt-32 pb-20 px-6 lg:px-12">
            <SEO
                title="About Me | Ras Ali"
                description={`Learn more about Ras Ali, a Creative Technologist based in ${companyInfo.location}. Bridging the gap between artistic expression and digital innovation.`}
            />
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-20">
                    <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-8">
                        ABOUT ME
                    </h1>
                    <div className="w-full h-[1px] bg-white/20 mb-8"></div>
                </div>

                {/* Content */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    <div className="relative">
                        <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/5 border border-white/10">
                            <img
                                src="/assets/images/ras-ali-formal.jpg"
                                alt="Ras Ali"
                                className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity duration-700"
                            />
                        </div>
                        <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-full border border-white/10 bg-brand-dark flex items-center justify-center animate-spin-slow">
                            <div className="text-white/30 text-xs uppercase tracking-widest text-center">
                                Creative<br />Technologist
                            </div>
                        </div>
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h2 className="text-3xl font-light text-white mb-6">Who I Am</h2>
                            <p className="text-white/70 text-lg leading-relaxed">
                                {companyInfo.description}
                            </p>
                            <p className="text-white/70 text-lg leading-relaxed mt-6">
                                Based in {companyInfo.location}, I bridge the gap between artistic expression and digital innovation. Whether laying down a bass groove, mixing a track, filming a documentary, or coding a React application, my goal is always the same: to create something that resonates.
                            </p>
                        </div>

                        <div>
                            <h2 className="text-3xl font-light text-white mb-6">My Approach</h2>
                            <p className="text-white/70 text-lg leading-relaxed">
                                I believe in a holistic approach to creativity. Sound influences visuals, code enables interaction, and design ties it all together. By mastering multiple disciplines, I offer a unique perspective that allows for seamless integration of diverse media in any project.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10">
                            <div>
                                <span className="block text-4xl text-brand-green font-light mb-2">10+</span>
                                <span className="text-white/50 text-sm uppercase tracking-wider">Years Experience</span>
                            </div>
                            <div>
                                <span className="block text-4xl text-brand-green font-light mb-2">15+</span>
                                <span className="text-white/50 text-sm uppercase tracking-wider">Projects Completed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default About;
