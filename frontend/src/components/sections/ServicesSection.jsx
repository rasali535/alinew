import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { services } from '../../data/mock';
import { ChevronRight } from 'lucide-react';

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

const ServiceCard = ({ service, isExpanded, onToggle }) => (
  <div
    className={`border-b border-white/10 py-8 cursor-pointer group transition-all duration-500 ${isExpanded ? 'bg-white/5' : ''
      }`}
    onClick={onToggle}
  >
    <div className="px-6 lg:px-12 flex items-center justify-between">
      <h3 className="text-white text-2xl md:text-3xl lg:text-4xl font-light group-hover:text-brand-green transition-colors duration-300">
        {service.title}
      </h3>
      <ChevronRight
        className={`w-6 h-6 text-white/50 transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'group-hover:translate-x-1'
          }`}
      />
    </div>
    <div
      className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-96 opacity-100 mt-6' : 'max-h-0 opacity-0'
        }`}
    >
      <div className="px-6 lg:px-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {service.items.map((item, index) => (
          <span
            key={index}
            className="text-white/60 text-sm hover:text-brand-green transition-colors duration-300 cursor-pointer"
          >
            {item}
          </span>
        ))}
      </div>
      <div className="px-6 lg:px-12 mt-8 mb-4">
        <Link
          to={`/booking/${service.id}`}
          className="inline-block bg-brand-green text-black px-6 py-2 rounded-full text-sm font-medium hover:bg-white transition-colors duration-300"
        >
          Book {service.title}
        </Link>
      </div>
    </div>
  </div>
);

const ServicesSection = () => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  return (
    <section className="bg-brand-dark py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© Services</span>
          <span>(RAS — 04)</span>
          <span>Creative Execution</span>
        </div>
      </div>

      {/* Marquee */}
      <Marquee text="services©" />

      {/* Services List */}
      <div className="mt-12">
        {services.map((service, index) => (
          <ServiceCard
            key={service.id}
            service={service}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
          />
        ))}
      </div>

      {/* Explore Services Button */}
      <div className="flex justify-center mt-16 px-6">
        <Link
          to="/services"
          className="inline-flex items-center gap-2 text-white border border-white/20 rounded-full px-8 py-4 hover:bg-white hover:text-black transition-all duration-300 group"
        >
          <span>Explore Services</span>
          <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
        </Link>
      </div>
    </section>
  );
};

export default ServicesSection;
