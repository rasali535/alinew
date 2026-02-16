import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import About from './pages/About';
import Services from './pages/Services';
import Work from './pages/Work';
import ProjectDetails from './pages/ProjectDetails';
import AILabs from './pages/AILabs';
import Booking from './pages/Booking';
import Contact from './pages/Contact';
import USSDCaseStudy from './pages/USSDCaseStudy';
import Cursor from './components/ui/Cursor';
import Preloader from './components/ui/Preloader';

import Chatbot from '@/components/common/Chatbot';

function App() {
  return (
    <div className="App bg-brand-dark min-h-screen">
      <Preloader />
      <Cursor />
      <BrowserRouter>
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/services" element={<Services />} />
            <Route path="/work" element={<Work />} />
            <Route path="/work/:id" element={<ProjectDetails />} />
            <Route path="/ai-labs" element={<AILabs />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/:serviceId" element={<Booking />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/case-study/ussd-web-gap" element={<USSDCaseStudy />} />
          </Routes>
        </main>
        <Footer />
        <Chatbot />
      </BrowserRouter>
    </div>
  );
}

export default App;
