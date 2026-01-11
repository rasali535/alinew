import React from 'react';
import SEO from '../components/common/SEO';
import ServicesSection from '../components/sections/ServicesSection';
import AILabsSection from '../components/sections/AILabsSection';

const Services = () => {
    return (
        <div className="pt-20">
            <SEO
                title="Services | Ras Ali"
                description="Professional services by Ras Ali including Web Development, UI/UX Design, Corporate Branding, and Custom Software Solutions."
            />
            <ServicesSection />
            <AILabsSection />
        </div>
    );
};

export default Services;
