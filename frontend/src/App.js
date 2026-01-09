import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HeroSection from './components/sections/HeroSection';
import FeaturedProjects from './components/sections/FeaturedProjects';
import ServicesSection from './components/sections/ServicesSection';
import AILabsSection from './components/sections/AILabsSection';
import ClientsSection from './components/sections/ClientsSection';
import AwardsSection from './components/sections/AwardsSection';
import FAQSection from './components/sections/FAQSection';

const HomePage = () => {
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

function App() {
  return (
    <div className="App bg-[#0a0a0a] min-h-screen">
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/about" element={<HomePage />} />
            <Route path="/work" element={<HomePage />} />
            <Route path="/work/:id" element={<HomePage />} />
            <Route path="/services" element={<HomePage />} />
            <Route path="/ai-labs" element={<HomePage />} />
            <Route path="/contact" element={<HomePage />} />
          </Routes>
        </main>
        <Footer />
      </BrowserRouter>
    </div>
  );
}

export default App;
