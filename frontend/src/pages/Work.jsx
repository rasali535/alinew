import React from 'react';
import SEO from '../components/common/SEO';
import FeaturedProjects from '../components/sections/FeaturedProjects';
import ClientsSection from '../components/sections/ClientsSection';
import AwardsSection from '../components/sections/AwardsSection';

const Work = () => {
    return (
        <div className="pt-20">
            <SEO
                title="Work | Ras Ali"
                description="Explore the portfolio of Ras Ali. Featured projects in web design, development, and creative technology."
            />
            <FeaturedProjects limit={false} showViewAll={false} />
            <ClientsSection />
            <AwardsSection />
        </div>
    );
};

export default Work;
