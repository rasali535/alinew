import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Facebook, Instagram, Phone, Mail, Github, Sparkles, ArrowRight } from 'lucide-react';
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
    <footer className="bg-[#191919] border-t border-white/10 py-16 px-6 lg:px-12 text-white">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Logo & Tagline */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-4 group">
              <img
                src="/assets/images/logo.png"
                alt="Ras Ali Labs Logo"
                className="h-24 md:h-28 w-auto object-contain"
              />
            </Link>
            <p className="text-brand-gold font-semibold text-xs tracking-widest uppercase mb-3">
              Empowered to Prosper
            </p>
            <p className="text-white/60 text-sm max-w-md leading-relaxed mb-6">
              Ralion OS is the AI-powered business operating system that helps organizations run, automate, and grow. Combining enterprise CRM, workflow automation, and Mari AI intelligence into one platform.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/products/ralion"
                className="px-4 py-2 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold hover:bg-brand-gold/20 transition-all flex items-center gap-1.5"
              >
                <Sparkles size={12} /> Explore Ralion OS
              </Link>
              <Link
                to="/contact"
                className="px-4 py-2 rounded-full bg-white/10 text-white text-xs font-semibold hover:bg-white/20 transition-all"
              >
                Request Enterprise Demo
              </Link>
            </div>
          </div>

          {/* Products Column */}
          <div>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Products</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/products/ralion" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Ralion OS
              </Link>
              <Link to="/products/mari-ai" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Mari AI Engine
              </Link>
              <Link to="/products/tradegrid-africa" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                TradeGrid Africa
              </Link>
              <Link to="/products/dfs-platform" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                DFS Platform
              </Link>
              <Link to="/changelog" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Changelog (v2.4.2)
              </Link>
            </div>
          </div>

          {/* Industry Solutions Column */}
          <div>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Solutions</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Funeral OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Logistics OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Health OS
              </Link>
              <Link to="/solutions" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Trade OS
              </Link>
            </div>
          </div>

          {/* Enterprise & Company Column */}
          <div>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Enterprise & Support</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/pricing" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Security & Isolation
              </Link>
              <Link to="/pricing" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Pricing & Plans
              </Link>
              <Link to="/about" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                About Ras Ali Labs
              </Link>
              <Link to="/support" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Customer Support
              </Link>
              <Link to="/contact" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Contact Enterprise Sales
              </Link>
            </div>
          </div>
        </div>

        {/* Contact & Socials */}
        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/10 gap-4">
          <div className="flex items-center gap-6 text-white/50 text-xs">
            <span>© 2014 - 2026 Ras Ali Labs. All rights reserved.</span>
            <span>Gaborone, Botswana</span>
          </div>

          <div className="flex gap-4">
            {socialLinks.map((social) => {
              const Icon = iconMap[social.icon] || Mail;
              return (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/40 hover:text-brand-gold transition-colors transform hover:scale-110 p-2 rounded-lg hover:bg-white/5"
                  aria-label={social.name}
                >
                  <Icon size={18} />
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
