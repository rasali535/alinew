import React, { useRef } from 'react';
import { awards } from '../../data/mock';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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

const AwardCard = ({ award }) => (
  <div className="flex-shrink-0 w-64 bg-white/5 rounded-xl p-6 border border-white/10 hover:border-lime-400/50 transition-all duration-300 group">
    <div className="w-16 h-16 rounded-full bg-white/10 mb-6 overflow-hidden">
      <img
        src={award.image}
        alt={award.name}
        className="w-full h-full object-cover"
      />
    </div>
    <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{award.name}</p>
    <p className="text-white text-2xl font-light">{award.year}</p>
  </div>
);

const AwardsSection = () => {
  const scrollRef = useRef(null);

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-[#0a0a0a] py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© Awards</span>
          <span>(CAD® — 07)</span>
          <span>Featured Honors</span>
        </div>
      </div>

      {/* Marquee */}
      <Marquee text="awards©" />

      {/* Awards Carousel */}
      <div className="mt-16 relative">
        {/* Navigation Buttons */}
        <div className="absolute -top-12 right-6 lg:right-12 flex gap-2 z-10">
          <button
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-lime-400 hover:text-lime-400 transition-colors duration-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:border-lime-400 hover:text-lime-400 transition-colors duration-300"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Container */}
        <div
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto scrollbar-hide px-6 lg:px-12 pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {awards.map((award, index) => (
            <AwardCard key={index} award={award} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default AwardsSection;
