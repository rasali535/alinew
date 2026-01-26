import React from 'react';
import SEO from '../components/common/SEO';
import FeaturedProjects from '../components/sections/FeaturedProjects';
import ClientsSection from '../components/sections/ClientsSection';

const Work = () => {
    return (
        <div className="pt-20">
            <SEO
                title="Work | Ras Ali"
                description="Explore the portfolio of Ras Ali. Featured projects in web design, development, and creative technology."
                url="/work"
            />
            <FeaturedProjects limit={false} showViewAll={false} />
            <ClientsSection />
        </div>
    );
};

export default Work;
