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
import RalionGrowthIntelligenceProduct from './pages/RalionGrowthIntelligenceProduct';
import RalionMariAIProduct from './pages/RalionMariAIProduct';
import RalionAutomationProduct from './pages/RalionAutomationProduct';
import RalionAnalyticsProduct from './pages/RalionAnalyticsProduct';

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
import Careers from './pages/Careers';
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
import PrivacyPolicy from './pages/PrivacyPolicy';
import DataProtection from './pages/DataProtection';
import TermsOfService from './pages/TermsOfService';
import Cursor from './components/ui/Cursor';
import Preloader from './components/ui/Preloader';
import Chatbot from '@/components/common/Chatbot';

import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/auth/AuthModal';

import Checkout from './pages/Checkout';

// Helper component to navigate to Next.js dashboard apps or canonical sub-paths
const ExternalRedirect = ({ to }) => {
  const location = useLocation();
  useEffect(() => {
    const basePath = to || location.pathname;
    // Prevent infinite reload loop if already at target path
    if (window.location.pathname === basePath && !to) {
      return;
    }
    window.location.href = `${basePath}${location.search}`;
  }, [to, location]);
  return null;
};

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
                <Route path="/products/ralion-growth-intelligence" element={<RalionGrowthIntelligenceProduct />} />
                <Route path="/products/ralion-mari-ai" element={<RalionMariAIProduct />} />
                <Route path="/products/ralion-automation" element={<RalionAutomationProduct />} />
                <Route path="/products/ralion-analytics" element={<RalionAnalyticsProduct />} />
                <Route path="/products/:slug" element={<ProductDetail />} />
                <Route path="/about" element={<About />} />
                <Route path="/request-demo" element={<RequestDemo />} />

                {/* Ralion Platform & Dashboard Redirects */}
                <Route path="/ralion/community" element={<CommunityEdition />} />
                <Route path="/ralion" element={<ExternalRedirect to="/ralion/dashboard" />} />
                <Route path="/ralion/*" element={<ExternalRedirect />} />
                <Route path="/growth" element={<ExternalRedirect to="/ralion/growth" />} />
                <Route path="/creatives" element={<ExternalRedirect to="/ralion/growth" />} />
                <Route path="/dashboard" element={<ExternalRedirect to="/ralion/dashboard" />} />
                <Route path="/crm" element={<ExternalRedirect to="/ralion/crm" />} />
                <Route path="/customers" element={<ExternalRedirect to="/ralion/customers" />} />
                <Route path="/leads" element={<ExternalRedirect to="/ralion/leads" />} />
                <Route path="/calendar" element={<ExternalRedirect to="/ralion/calendar" />} />
                <Route path="/tasks" element={<ExternalRedirect to="/ralion/tasks" />} />
                <Route path="/documents" element={<ExternalRedirect to="/ralion/documents" />} />
                <Route path="/billing" element={<ExternalRedirect to="/ralion/billing" />} />
                <Route path="/mari-ai" element={<ExternalRedirect to="/ralion/mari-ai" />} />
                <Route path="/settings" element={<ExternalRedirect to="/ralion/settings" />} />
                <Route path="/settings/*" element={<ExternalRedirect />} />
                <Route path="/workflows" element={<ExternalRedirect to="/ralion/workflows" />} />
                <Route path="/workspace" element={<ExternalRedirect to="/ralion/workspace" />} />
                <Route path="/portal" element={<ExternalRedirect to="/ralion/portal" />} />
                <Route path="/reports" element={<ExternalRedirect to="/ralion/reports" />} />

                {/* SaaS Onboarding & Customer Portal */}
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/account" element={<Account />} />
                <Route path="/login" element={<ExternalRedirect to="/ralion/login" />} />
                <Route path="/register" element={<ExternalRedirect to="/ralion/register" />} />
                <Route path="/signup" element={<ExternalRedirect to="/ralion/register" />} />

                {/* SaaS Public Platform Systems */}
                <Route path="/demo" element={<Demo />} />
                <Route path="/docs" element={<Docs />} />
                <Route path="/support" element={<Support />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/changelog" element={<Changelog />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/beta" element={<BetaProgram />} />

                {/* Versioned Downloads & Release Management */}
                <Route path="/downloads" element={<Downloads />} />
                <Route path="/downloads/ralion" element={<RalionDownload />} />
                <Route path="/downloads/releases" element={<Releases />} />
                <Route path="/admin/releases" element={<AdminReleases />} />

                {/* Redirects */}
                <Route path="/developers" element={<Navigate to="/products/ralion" replace />} />
                <Route path="/developer" element={<Navigate to="/products/ralion" replace />} />
                <Route path="/products/ralion-social-intelligence" element={<Navigate to="/products/ralion-growth-intelligence" replace />} />

                {/* Company Pages */}
                <Route path="/services" element={<Services />} />
                <Route path="/work" element={<Work />} />
                <Route path="/work/:id" element={<ProjectDetails />} />
                <Route path="/ai-labs" element={<AILabs />} />
                <Route path="/booking" element={<Booking />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/case-study/ussd-web-gap" element={<USSDCaseStudy />} />

                {/* Legal & Regulatory Compliance (BOCRA & Botswana DPA) */}
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/privacy-policy" element={<Navigate to="/privacy" replace />} />
                <Route path="/data-protection" element={<DataProtection />} />
                <Route path="/bocra" element={<Navigate to="/data-protection" replace />} />
                <Route path="/bocra-compliance" element={<Navigate to="/data-protection" replace />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/terms-of-service" element={<Navigate to="/terms" replace />} />
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
