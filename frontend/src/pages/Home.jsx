import React from 'react';
import SEO from '../components/common/SEO'; // Import SEO
import HeroSection from '../components/sections/HeroSection';
import FeaturedProjects from '../components/sections/FeaturedProjects';
import ServicesSection from '../components/sections/ServicesSection';
import AILabsSection from '../components/sections/AILabsSection';
import ClientsSection from '../components/sections/ClientsSection';
import AwardsSection from '../components/sections/AwardsSection';
import FAQSection from '../components/sections/FAQSection';

const Home = () => {
    return (
        <>
            <SEO
                title="Ras Ali - Multi-Disciplinary Creative & Technologist"
                description="Ras Ali is a multi-disciplinary creative and technologist based in Gaborone, specializing in premium web design, development, and digital experiences."
            />
            <HeroSection />
            <FeaturedProjects />
            <ServicesSection />
            <AILabsSection />
            <ClientsSection />
            <AwardsSection />
            <FAQSection />
        </>
    );
};

export default Home;
