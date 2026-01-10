import React from 'react';
import FeaturedProjects from '../components/sections/FeaturedProjects';
import ClientsSection from '../components/sections/ClientsSection';
import AwardsSection from '../components/sections/AwardsSection';

const Work = () => {
    return (
        <div className="pt-20">
            <FeaturedProjects />
            <ClientsSection />
            <AwardsSection />
        </div>
    );
};

export default Work;
