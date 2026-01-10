import React from 'react';
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
