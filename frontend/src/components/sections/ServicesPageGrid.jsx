import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../../data/mock';
import { ArrowUpRight, Music, Mic2, Video, Code } from 'lucide-react';

// Icons map
const iconMap = {
    'Bassist': Music,
    'Sound Engineer': Mic2,
    'Videographer': Video,
    'Developer': Code
};

// Image map (Using placeholders relevant to the service)
const imageMap = {
    'Bassist': 'https://images.unsplash.com/photo-1514320291940-b3712c7859cb?auto=format&fit=crop&q=80&w=800',
    'Sound Engineer': 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&q=80&w=800',
    'Videographer': 'https://images.unsplash.com/photo-1535016120720-40c6874c3b1c?auto=format&fit=crop&q=80&w=800',
    'Developer': 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&q=80&w=800'
};

const ServiceCard = ({ service, index }) => {
    const Icon = iconMap[service.title] || Music;
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="group relative h-[500px] w-full overflow-hidden rounded-2xl bg-[#0a0a0a] border border-white/10"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Background Image with Zoom Effect */}
            <div className="absolute inset-0 overflow-hidden">
                <img
                    src={imageMap[service.title]}
                    alt={service.title}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-110 opacity-40 group-hover:opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />
            </div>

            {/* Content Container */}
            <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-10">

                {/* Top Section: Icon & Index */}
                <div className="flex items-start justify-between">
                    <div className="rounded-full bg-white/10 p-4 backdrop-blur-md transition-all duration-300 group-hover:bg-brand-green/20 group-hover:text-brand-green">
                        <Icon size={32} className="text-white transition-colors duration-300 group-hover:text-brand-green" />
                    </div>
                    <span className="text-xl font-light text-white/30 font-mono">
                        0{index + 1}
                    </span>
                </div>

                {/* Bottom Section: Title, Items, CTA */}
                <div className="translate-y-4 transition-transform duration-500 ease-out group-hover:translate-y-0">
                    <h3 className="mb-4 text-4xl font-light text-white md:text-5xl">
                        {service.title}
                    </h3>

                    {/* Items List - Staggered Fade In */}
                    <div className="mb-8 space-y-2">
                        {service.items.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2 text-sm text-white/60 transition-all duration-300 hover:text-white"
                            >
                                <span className="h-1 w-1 rounded-full bg-brand-green" />
                                {item}
                            </div>
                        ))}
                    </div>

                    <Link
                        to={`/booking/${service.id}`}
                        className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm text-white backdrop-blur-sm transition-all duration-300 hover:border-brand-green hover:bg-brand-green hover:text-black"
                    >
                        Start Project
                        <ArrowUpRight size={16} />
                    </Link>
                </div>
            </div>
        </div>
    );
};

const ServicesPageGrid = () => {
    return (
        <section className="bg-brand-dark py-20">
            <div className="px-6 lg:px-12">
                {/* Introduction */}
                <div className="mb-16 max-w-2xl">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="h-[1px] w-8 bg-brand-green"></div>
                        <span className="text-brand-green text-sm uppercase tracking-widest">My Expertise</span>
                    </div>
                    <h2 className="text-5xl md:text-6xl lg:text-7xl font-light text-white tracking-tight leading-none mb-6">
                        Crafting Digital <br /> <span className="italic text-white/50">Masterpieces</span>
                    </h2>
                    <p className="text-white/60 text-lg">
                        A comprehensive suite of creative and technical services designed to elevate your brand and bring your vision to life.
                    </p>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                    {services.map((service, index) => (
                        <ServiceCard key={service.id} service={service} index={index} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default ServicesPageGrid;
