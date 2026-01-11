import React from 'react';
import { clients } from '../../data/mock';

const Marquee = ({ text }) => (
  <div className="overflow-hidden py-4 border-y border-white/10">
    <div className="flex whitespace-nowrap animate-marquee">
      {[...Array(10)].map((_, i) => (
        <span key={i} className="text-white text-6xl md:text-7xl lg:text-8xl font-light tracking-tight mx-8">
          {text}
        </span>
      ))}
    </div>
  </div>
);

const ClientsSection = () => {
  return (
    <section className="bg-brand-dark py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© Clients</span>
          <span>(RAS — 06)</span>
          <span>Brand Partners</span>
        </div>
      </div>

      {/* Marquee */}
      <Marquee text="clients©" />

      {/* Clients Grid */}
      <div className="px-6 lg:px-12 mt-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {clients.map((client, index) => (
            <div
              key={index}
              className="flex items-center justify-center py-12 border border-white/10 rounded-lg hover:border-brand-green/50 hover:bg-white/5 transition-all duration-300 group cursor-pointer"
            >
              <span className="text-white/50 text-xl font-light group-hover:text-white transition-colors duration-300">
                {client}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;
