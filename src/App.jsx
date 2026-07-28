import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import RalionApp from './pages/RalionApp';
import Solutions from './pages/Solutions';
import Downloads from './pages/Downloads';
import DeveloperPortal from './pages/DeveloperPortal';
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

import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';

// Helper component to scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <AuthProvider>
      <div className="App bg-brand-dark min-h-screen">
        <Preloader />
        <Cursor />
        <BrowserRouter>
          <ScrollToTop />
          <Header />
          <main>
            <Routes>
              {/* Product Ecosystem Routes */}
              <Route path="/products" element={<Products />} />
              <Route path="/products/:slug" element={<ProductDetail />} />
              <Route path="/ralion" element={<RalionApp />} />
              <Route path="/solutions" element={<Solutions />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/developers" element={<DeveloperPortal />} />

              {/* Ecosystem Pages */}
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
          <AuthModal />
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
