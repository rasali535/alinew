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
            <p className="text-brand-gold font-bold text-xs tracking-wider uppercase mb-2">
              Ras Ali Labs
            </p>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Building AI-powered business operating systems that automate operations, connect teams, and accelerate growth.
            </p>
          </div>

          {/* Core Products */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Products</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/products/ralion" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Business OS
              </Link>
              <Link to="/products/ralion-crm" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion CRM
              </Link>
              <Link to="/products/ralion-social-intelligence" className="text-white/70 hover:text-brand-gold transition-colors">
                Ralion Social Intelligence Marketing
              </Link>
            </div>
          </div>

          {/* Industry Solutions */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Solutions</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold transition-colors">
                Funeral OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold transition-colors">
                Logistics OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold transition-colors">
                Health OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold transition-colors">
                Trade OS
              </Link>
            </div>
          </div>

          {/* Company & Support */}
          <div>
            <h4 className="text-white/40 text-xs font-bold uppercase tracking-wider mb-3">Company</h4>
            <div className="flex flex-col gap-2 text-xs">
              <Link to="/about" className="text-white/70 hover:text-brand-gold transition-colors">
                About Ras Ali Labs
              </Link>
              <Link to="/industries" className="text-white/70 hover:text-brand-gold transition-colors">
                Industries
              </Link>
              <Link to="/request-demo" className="text-brand-gold font-semibold hover:underline transition-colors">
                Request Demo
              </Link>
              <Link to="/support" className="text-white/70 hover:text-brand-gold transition-colors">
                Support
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-white/10 gap-4 text-xs text-white/50">
          <div>© 2014 - 2026 Ras Ali Labs. All rights reserved. Gaborone, Botswana.</div>
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
