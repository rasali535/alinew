import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { featuredProjects } from '../data/mock';
import SEO from '../components/common/SEO';

const ProjectDetails = () => {
    const { id } = useParams();
    const project = featuredProjects.find(p => p.id === parseInt(id));

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [id]);

    if (!project) {
        return (
            <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white">
                <h2 className="text-4xl font-light mb-4">Project Not Found</h2>
                <Link to="/work" className="text-lime-400 border-b border-lime-400 pb-1 hover:text-white transition-colors">
                    Back to Work
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0a] pt-32 pb-20 px-6 lg:px-12">
            <SEO
                title={`${project.title} | Ras Ali`}
                description={`Details about ${project.title}, a ${project.subtitle} project by Ras Ali.`}
                image={project.image}
            />

            <div className="max-w-6xl mx-auto">
                {/* Back Button */}
                <Link
                    to="/work"
                    className="inline-flex items-center gap-2 text-white/50 hover:text-lime-400 mb-12 transition-colors duration-300"
                >
                    <span>←</span>
                    <span>Back to Projects</span>
                </Link>

                {/* Header */}
                <div className="mb-16">
                    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
                        <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-light tracking-tight leading-none">
                            {project.title}
                        </h1>
                        <span className="text-lime-400 text-lg md:text-xl font-light tracking-wide uppercase">
                            {project.category}
                        </span>
                    </div>
                    <p className="text-white/70 text-xl md:text-2xl font-light max-w-3xl">
                        {project.subtitle}
                    </p>
                </div>

                {/* Main Image */}
                <div className="aspect-video w-full rounded-2xl overflow-hidden bg-white/5 mb-20 border border-white/10">
                    <img
                        src={project.image}
                        alt={project.title}
                        className="w-full h-full object-cover"
                    />
                </div>

                {/* Project Info & Mock Description */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
                    <div className="lg:col-span-2 space-y-8">
                        <h3 className="text-2xl text-white font-light">About the Project</h3>
                        <div className="text-white/70 text-lg leading-relaxed space-y-6">
                            {project.description ? (
                                <p>{project.description}</p>
                            ) : (
                                <>
                                    <p>
                                        This project represents a synthesis of technical precision and creative vision.
                                        Executed with a focus on delivering high-impact results, it showcases the
                                        core capabilities of Ras Ali's multi-disciplinary approach.
                                    </p>
                                    <p>
                                        From initial concept to final delivery, every detail was carefully considered
                                        to ensure the final output not only met but exceeded expectations. The workflow
                                        integrated modern tools and methodologies to achieve a polished, professional standard.
                                    </p>
                                </>
                            )}
                        </div>
                        {project.link && (
                            <div className="pt-8">
                                <a
                                    href={project.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-lime-400 transition-colors duration-300"
                                >
                                    Visit Live Site
                                    <span>↗</span>
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="space-y-12">
                        <div>
                            <h4 className="text-white/50 text-sm uppercase tracking-widest mb-4">Services</h4>
                            <ul className="space-y-2">
                                {project.roles ? (
                                    project.roles.map((role, index) => (
                                        <li key={index} className="text-white">{role}</li>
                                    ))
                                ) : (
                                    <>
                                        <li className="text-white">{project.category}</li>
                                        <li className="text-white">Creative Direction</li>
                                        <li className="text-white">Technical Implementation</li>
                                    </>
                                )}
                            </ul>
                        </div>
                        <div>
                            <h4 className="text-white/50 text-sm uppercase tracking-widest mb-4">Date</h4>
                            <p className="text-white">{project.date || '2024'}</p>
                        </div>
                        <div>
                            <h4 className="text-white/50 text-sm uppercase tracking-widest mb-4">Client</h4>
                            <p className="text-white">Confidential</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetails;
