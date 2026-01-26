import React from 'react';
import { Link } from 'react-router-dom';
import { aiLabsImages, companyInfo } from '../../data/mock';

const Marquee = ({ text }) => (
  <div className="overflow-hidden py-4 border-y border-white/10">
    <div className="flex whitespace-nowrap animate-marquee">
      {[...Array(8)].map((_, i) => (
        <span key={i} className="text-white text-6xl md:text-7xl lg:text-8xl font-light tracking-tight mx-8">
          {text}
        </span>
      ))}
    </div>
  </div>
);

const AILabsSection = () => {
  return (
    <section className="bg-brand-dark py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© AI Labs</span>
          <span>(RAS — 05)</span>
          <span>Modern Intelligence</span>
        </div>
      </div>

      {/* Marquee */}
      <Marquee text="creative tech labs©" />

      {/* Content */}
      <div className="px-6 lg:px-12 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Images */}
          <div className="grid grid-cols-3 gap-4">
            {aiLabsImages.map((image, index) => (
              <div
                key={index}
                className="aspect-video rounded-lg overflow-hidden bg-white/5 group"
              >
                <img
                  src={image}
                  alt={`AI Labs ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
              </div>
            ))}
          </div>

          {/* Description */}
          <div>
            <p className="text-white/70 text-lg leading-relaxed mb-8">
              {companyInfo.aiLabsDescription}
            </p>
            <Link
              to="/ai-labs"
              className="inline-flex items-center gap-2 text-white border border-white/20 rounded-full px-8 py-4 hover:bg-white hover:text-black transition-all duration-300 group"
            >
              <span>Inside AI Labs</span>
              <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AILabsSection;
