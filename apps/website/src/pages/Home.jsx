import React from 'react';
import SEO from '../components/common/SEO'; // Import SEO
import HeroSection from '../components/sections/HeroSection';
import FeaturedProjects from '../components/sections/FeaturedProjects';
import ServicesSection from '../components/sections/ServicesSection';
import AILabsSection from '../components/sections/AILabsSection';
import ClientsSection from '../components/sections/ClientsSection';
import FAQSection from '../components/sections/FAQSection';

const Home = () => {
    return (
        <>
            <SEO
                title="Ras Ali Labs | AI Business Operating Systems"
                description="Building intelligent AI platforms, automation systems, and industry-specific business operating systems."
                url="/"
            />
            <HeroSection />
            <FeaturedProjects limit={6} showViewAll={true} />
            <ServicesSection />
            <AILabsSection />
            <ClientsSection />
            <FAQSection />
        </>
    );
};

export default Home;
