import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Facebook, Instagram, Phone, Mail, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import { socialLinks, companyInfo } from '../../data/mock';

const Footer = () => {
  const iconMap = {
    'Youtube': Youtube,
    'Facebook': Facebook,
    'Instagram': Instagram,
    'Phone': Phone,
    'Mail': Mail
  };

  return (
    <footer className="bg-[#101010] border-t border-white/10 pt-16 pb-12 px-6 lg:px-12 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 mb-14">
          {/* Company Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/assets/images/logo.png"
                alt="Ras Ali Labs Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
              <div className="flex flex-col border-l border-white/15 pl-3">
                <span className="text-white font-extrabold text-base tracking-wider uppercase">
                  Ras Ali Labs
                </span>
                <span className="text-brand-gold text-[10px] tracking-widest uppercase font-semibold">
                  Technology • Film • Sound
                </span>
              </div>
            </Link>

            <p className="text-brand-gold font-semibold text-xs tracking-wider uppercase">
              {companyInfo.tagline}
            </p>

            <p className="text-white/65 text-xs leading-relaxed max-w-sm">
              Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company delivering intelligent platforms, cinematic productions, digital experiences and original sound.
            </p>

            <div className="pt-2 text-xs space-y-2 text-white/70">
              <div className="flex items-start gap-2.5">
                <MapPin size={15} className="text-brand-gold shrink-0 mt-0.5" />
                <span>Plot 18680 Khuhurutse Drive, Phase 2, Gaborone, Botswana</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-brand-gold shrink-0" />
                <a href="tel:+26772113009" className="hover:text-white transition-colors">
                  +267 72 113 009
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-brand-gold shrink-0" />
                <a href="mailto:contact@rasalilabs.com" className="hover:text-white transition-colors">
                  contact@rasalilabs.com
                </a>
              </div>
            </div>
          </div>

          {/* Multidisciplinary Services */}
          <div className="lg:col-span-3">
            <h4 className="text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
              Our Capabilities
            </h4>
            <div className="flex flex-col gap-2.5 text-xs">
              <Link to="/services/film-video" className="text-white/70 hover:text-brand-gold transition-colors">
                Film & Creative Production
              </Link>
              <Link to="/services/web-app-development" className="text-white/70 hover:text-brand-gold transition-colors">
                Web & App Development
              </Link>
              <Link to="/services/music-audio" className="text-white/70 hover:text-brand-gold transition-colors">
                Music & Audio Production
              </Link>
              <Link to="/services/ai-automation" className="text-white/70 hover:text-brand-gold transition-colors">
                AI & Enterprise Automation
              </Link>
              <Link to="/services" className="text-brand-gold font-medium hover:underline transition-colors pt-1">
                Explore All Services →
              </Link>
            </div>
          </div>

          {/* Ralion OS Flagship Product */}
          <div className="lg:col-span-3">
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Sparkles size={12} className="text-brand-gold" /> Flagship Product
            </h4>
            <div className="flex flex-col gap-2.5 text-xs">
              <Link to="/products/ralion-os" className="text-white font-medium hover:text-brand-gold transition-colors">
                Ralion OS Overview
              </Link>
              <Link to="/products/ralion-mari-ai" className="text-white/70 hover:text-brand-gold transition-colors">
                Mari AI Growth Partner
              </Link>
              <Link to="/products/ralion-crm" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion CRM & Pipelines
              </Link>
              <Link to="/products/ralion-growth-intelligence" className="text-white/70 hover:text-brand-gold transition-colors">
                Growth Studio & Creatives
              </Link>
              <a href="/ralion" className="text-brand-gold font-semibold hover:underline transition-colors pt-1 flex items-center gap-1">
                Launch Ralion Platform <ArrowRight size={12} />
              </a>
            </div>
          </div>

          {/* Company & Quick Links */}
          <div className="lg:col-span-2">
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-4">
              Company
            </h4>
            <div className="flex flex-col gap-2.5 text-xs">
              <Link to="/about" className="text-white/70 hover:text-brand-gold transition-colors">
                About Ras Ali Labs
              </Link>
              <Link to="/work" className="text-white/70 hover:text-brand-gold transition-colors">
                Selected Work
              </Link>
              <Link to="/contact" className="text-white/70 hover:text-brand-gold transition-colors">
                Contact & Inquiries
              </Link>
              <Link to="/request-demo" className="text-white/70 hover:text-brand-gold transition-colors">
                Book a Consultation
              </Link>
              <Link to="/case-study/ussd-web-gap" className="text-white/70 hover:text-brand-gold transition-colors">
                Case Studies
              </Link>
            </div>
          </div>
        </div>

        {/* Regulatory & Compliance Strip */}
        <div className="pt-8 pb-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/70">
            <Link to="/privacy" className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Privacy Policy
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/data-protection" className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Botswana Data Protection Act (Act 32)
            </Link>
            <span className="text-white/20">•</span>
            <Link to="/terms" className="hover:text-emerald-400 transition-colors font-medium">
              Terms of Service
            </Link>
          </div>
          <div className="text-[11px] text-white/40 font-mono text-center md:text-right">
            Headquartered in Gaborone, Botswana • BOCRA ICT Compliant
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/5 gap-4 text-xs text-white/50">
          <div>
            © {companyInfo.founded} - 2026 {companyInfo.name}. All rights reserved.
          </div>
          <div className="flex gap-3">
            {socialLinks.map((social) => {
              const Icon = iconMap[social.icon] || Mail;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-brand-gold transition-colors p-2 rounded-xl hover:bg-white/5"
                  aria-label={social.name}
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
