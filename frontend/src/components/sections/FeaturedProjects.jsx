import React from 'react';
import { Link } from 'react-router-dom';
import { featuredProjects } from '../../data/mock';

const Marquee = ({ text, direction = 'left' }) => (
  <div className="overflow-hidden py-4 border-y border-white/10">
    <div className={`flex whitespace-nowrap ${direction === 'left' ? 'animate-marquee' : 'animate-marquee-reverse'}`}>
      {[...Array(10)].map((_, i) => (
        <span key={i} className="text-white text-6xl md:text-7xl lg:text-8xl font-light tracking-tight mx-8">
          {text}
        </span>
      ))}
    </div>
  </div>
);

const ProjectCard = ({ project, index }) => (
  <Link
    to={`/work/${project.id}`}
    className="group block relative overflow-hidden"
  >
    <div className="aspect-[4/3] overflow-hidden rounded-lg bg-white/5">
      <img
        src={project.image}
        alt={project.title}
        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
    <div className="mt-4">
      <h3 className="text-white text-xl md:text-2xl font-light group-hover:text-lime-400 transition-colors duration-300">
        {project.title}
      </h3>
      <p className="text-white/50 text-sm mt-1">{project.subtitle}</p>
    </div>
  </Link>
);

const FeaturedProjects = () => {
  return (
    <section className="bg-[#0a0a0a] py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© Featured Projects</span>
          <span>(CAD® — 03)</span>
          <span>Digital Showcase</span>
        </div>
      </div>

      {/* Marquee */}
      <Marquee text="featured works©" />

      {/* Projects Grid */}
      <div className="px-6 lg:px-12 mt-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {featuredProjects.slice(0, 6).map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 mt-12">
          {featuredProjects.slice(6, 8).map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>

        {/* View All Button */}
        <div className="flex justify-center mt-16">
          <Link
            to="/work"
            className="inline-flex items-center gap-2 text-white border border-white/20 rounded-full px-8 py-4 hover:bg-white hover:text-black transition-all duration-300 group"
          >
            <span>View all projects</span>
            <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProjects;
