import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { featuredProjects } from '../data/mock';
import SEO from '../components/common/SEO';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, ExternalLink, Globe } from 'lucide-react';

const ProjectDetails = () => {
  const { id } = useParams();
  const project = featuredProjects.find(
    (p) => String(p.id) === String(id) || p.title.toLowerCase().replace(/\s+/g, '-') === String(id).toLowerCase()
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!project) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center text-white pt-28 px-6 text-center">
        <h2 className="text-4xl font-extrabold mb-4">Project Not Found</h2>
        <p className="text-white/60 text-sm mb-6">The requested portfolio project could not be found in our verified archive.</p>
        <Link to="/work" className="px-6 py-3 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-all">
          ← Back to Portfolio Archive
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#121212] pt-32 pb-20 px-6 lg:px-12 text-white">
      <SEO
        title={`${project.title} | Ras Ali Labs Portfolio`}
        description={`Details about ${project.title}, a ${project.subtitle} project by Ras Ali Labs in Botswana.`}
        canonical={`https://rasalilabs.com/work/${project.id}`}
        ogImage={project.image}
      />

      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to="/work"
          className="inline-flex items-center gap-2 text-white/60 hover:text-brand-gold mb-10 transition-colors text-xs font-semibold"
        >
          <ArrowLeft size={16} />
          <span>Back to Portfolio Archive</span>
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full bg-brand-gold/10 text-brand-gold text-xs font-bold uppercase tracking-wider inline-block">
                  {project.category}
                </span>
                {project.domain && (
                  <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 font-mono text-xs inline-flex items-center gap-1.5">
                    <Globe size={12} /> {project.domain}
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
                {project.title}
              </h1>
            </div>
            {project.date && (
              <span className="text-white/60 font-mono text-sm">
                Production Year: {project.date}
              </span>
            )}
          </div>
          <p className="text-white/70 text-lg md:text-xl font-normal max-w-3xl leading-relaxed">
            {project.subtitle}
          </p>
        </div>

        {/* Main Image */}
        <div className="aspect-[16/9] w-full rounded-3xl overflow-hidden bg-[#181818] mb-16 border border-white/10 relative shadow-2xl flex items-center justify-center p-8">
          <img
            src={project.image}
            alt={project.title}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              e.target.src = '/assets/images/service-video.png';
            }}
          />
        </div>

        {/* Project Info & Description */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            <h3 className="text-2xl text-white font-bold">About the Project</h3>
            <div className="text-white/75 text-sm md:text-base leading-relaxed space-y-4">
              <p>{project.description}</p>
              {project.verifiedNote && (
                <div className="p-4 rounded-2xl bg-[#181818] border border-brand-gold/30 text-xs text-white/80">
                  <strong className="text-brand-gold block font-bold mb-1 uppercase tracking-wider">
                    Verified Execution Record:
                  </strong>
                  {project.verifiedNote}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-white/10 flex flex-wrap gap-4">
              {project.url && (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
                >
                  Visit Live Platform ({project.domain || 'Open Website'}) <ExternalLink size={14} />
                </a>
              )}
              <Link
                to="/contact"
                className="px-6 py-3 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-all border border-white/15 flex items-center gap-2"
              >
                Inquire on Similar Project <ArrowRight size={14} />
              </Link>
              <Link
                to="/services"
                className="px-6 py-3 rounded-xl bg-white/5 text-white/80 font-bold text-xs hover:bg-white/10 transition-all border border-white/10"
              >
                Explore Capabilities
              </Link>
            </div>
          </div>

          <div className="space-y-8 bg-[#181818] border border-white/10 rounded-3xl p-6 h-fit">
            <div>
              <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold mb-3">Roles & Disciplines</h4>
              <div className="space-y-2">
                {project.roles && project.roles.map((role, index) => (
                  <div key={index} className="flex items-center gap-2 text-xs text-white/80">
                    <CheckCircle2 size={14} className="text-brand-gold shrink-0" />
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            </div>

            {project.url && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Live Website</h4>
                <a
                  href={project.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-gold hover:underline text-xs font-mono inline-flex items-center gap-1.5"
                >
                  {project.domain} <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="pt-4 border-t border-white/10">
              <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Company</h4>
              <p className="text-white text-xs font-semibold">Ras Ali Labs (Pty) Ltd</p>
              <p className="text-white/50 text-[11px]">Gaborone, Botswana</p>
            </div>

            {project.date && (
              <div className="pt-4 border-t border-white/10">
                <h4 className="text-white/40 text-xs uppercase tracking-widest font-bold mb-1">Timeline</h4>
                <p className="text-white text-xs">{project.date}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetails;
