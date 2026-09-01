import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Facebook, Instagram, Phone, Mail, Github, Sparkles } from 'lucide-react';
import { socialLinks } from '../../data/mock';

const Footer = () => {
  const iconMap = {
    'Youtube': Youtube,
    'Facebook': Facebook,
    'Instagram': Instagram,
    'Phone': Phone,
    'Mail': Mail,
    'Github': Github
  };

  return (
    <footer className="bg-[#181818] border-t border-white/10 py-10 px-6 lg:px-12 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Compact Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Company Info */}
          <div>
            <Link to="/" className="inline-block mb-3">
              <img
                src="/assets/images/logo.png"
                alt="Ras Ali Labs Logo"
                className="h-12 md:h-14 w-auto object-contain"
              />
            </Link>
            <p className="text-brand-gold font-bold text-xs tracking-wider uppercase mb-1">
              RALION OS
            </p>
            <p className="text-white/90 font-medium text-xs mb-2">
              Empowered to Prosper
            </p>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Ras Ali Labs builds AI-powered business operating systems that combine intelligent automation, CRM, social intelligence, growth tools, and sovereign enterprise infrastructure.
            </p>
          </div>

          {/* Core Platform Ecosystem */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Ralion Ecosystem</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/products/ralion" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion OS Overview
              </Link>
              <Link to="/products/ralion-mari-ai" className="text-white/70 hover:text-brand-gold transition-colors">
                Mari AI Growth Partner
              </Link>
              <Link to="/products/ralion-crm" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion CRM
              </Link>
              <Link to="/products/ralion-growth-intelligence" className="text-white/70 hover:text-brand-gold transition-colors">
                Growth Studio & Creatives
              </Link>
              <Link to="/products/ralion-growth-intelligence#social" className="text-white/70 hover:text-brand-gold transition-colors">
                Social Intelligence & Publishing
              </Link>
              <Link to="/pricing" className="text-brand-gold font-medium hover:underline transition-colors">
                Plans & Pricing
              </Link>
            </div>
          </div>

          {/* Industry Operating Systems */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Industry OS</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/industries#funeral" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Funeral OS
              </Link>
              <Link to="/industries#logistics" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Logistics OS
              </Link>
              <Link to="/industries#healthcare" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Healthcare OS
              </Link>
              <Link to="/industries#trade" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Trade OS
              </Link>
              <Link to="/industries#government" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Government OS
              </Link>
            </div>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Ras Ali Labs</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/about" className="text-white/70 hover:text-brand-gold transition-colors">
                About Our Technology
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold transition-colors">
                Enterprise Solutions
              </Link>
              <Link to="/request-demo" className="text-brand-gold font-semibold hover:underline transition-colors">
                Book Enterprise Demo
              </Link>
              <Link to="/support" className="text-white/70 hover:text-brand-gold transition-colors">
                Product Support
              </Link>
              <Link to="/ralion/register" className="text-white/70 hover:text-brand-gold transition-colors">
                Start Ralion Free
              </Link>
            </div>
          </div>
        </div>

        {/* Legal & Regulatory Compliance Strip */}
        <div className="pt-6 pb-4 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-white/70">
            <Link to="/privacy" className="hover:text-emerald-400 transition-colors font-medium flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Privacy Policy (BOCRA Compliant)
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
            Regulated under the Laws of Botswana • BOCRA ICT Compliant
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-white/5 gap-4 text-xs text-white/50">
          <div>© 2014 - 2026 Ras Ali Labs (Pty) Ltd. All rights reserved. Gaborone, Botswana.</div>
          <div className="flex gap-3">
            {socialLinks.map((social) => {
              const Icon = iconMap[social.icon] || Mail;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-brand-gold transition-colors p-1.5 rounded-lg hover:bg-white/5"
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
