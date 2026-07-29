import React, { useEffect } from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import RalionCRMProduct from './pages/RalionCRMProduct';
import RalionSocialIntelligenceProduct from './pages/RalionSocialIntelligenceProduct';
import RalionApp from './pages/RalionApp';
import CommunityEdition from './pages/CommunityEdition';
import Onboarding from './pages/Onboarding';
import Account from './pages/Account';
import Demo from './pages/Demo';
import Docs from './pages/Docs';
import Support from './pages/Support';
import Pricing from './pages/Pricing';
import Changelog from './pages/Changelog';
import BetaProgram from './pages/BetaProgram';
import Solutions from './pages/Solutions';
import Industries from './pages/Industries';
import RequestDemo from './pages/RequestDemo';
import Downloads from './pages/Downloads';
import RalionDownload from './pages/RalionDownload';
import Releases from './pages/Releases';
import AdminReleases from './pages/AdminReleases';
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
    <HelmetProvider>
      <AuthProvider>
        <div className="App bg-brand-dark min-h-screen">
          <Preloader />
          <Cursor />
          <BrowserRouter>
            <ScrollToTop />
            <Header />
            <main>
              <Routes>
                {/* Enterprise Main Navigation */}
                <Route path="/" element={<Home />} />
                <Route path="/solutions" element={<Solutions />} />
                <Route path="/industries" element={<Industries />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/ralion-crm" element={<RalionCRMProduct />} />
                <Route path="/products/ralion-social-intelligence" element={<RalionSocialIntelligenceProduct />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/request-demo" element={<RequestDemo />} />

                {/* Ralion Platform & Community Edition */}
                <Route path="/ralion/community" element={<CommunityEdition />} />
                <Route path="/ralion" element={<RalionApp />} />
                <Route path="/ralion/*" element={<RalionApp />} />

                {/* SaaS Onboarding & Customer Portal */}
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/account" element={<Account />} />

                {/* SaaS Public Platform Systems */}
                <Route path="/demo" element={<Demo />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/support" element={<Support />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/beta" element={<BetaProgram />} />

                {/* Versioned Downloads & Release Management */}
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/downloads/ralion" element={<RalionDownload />} />
                <Route path="/downloads/releases" element={<Releases />} />
                <Route path="/admin/releases" element={<AdminReleases />} />

                {/* Redirects */}
                <Route path="/developers" element={<Navigate to="/products/ralion" replace />} />
                <Route path="/developer" element={<Navigate to="/products/ralion" replace />} />

                {/* Company Pages */}
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
    </HelmetProvider>
  );
}

export default App;
