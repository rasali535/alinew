import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Facebook, Instagram, Phone, Mail, Github } from 'lucide-react';
import { socialLinks, navLinks } from '../../data/mock';

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Logo & Description */}
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
            <p className="text-white/60 text-sm max-w-md leading-relaxed">
              Ras Ali Labs is the central enterprise software & AI innovation platform. Architecting intelligent systems, high-speed data pipelines, and cross-border trade platforms.
            </p>
          </div>

          {/* Ecosystem Links */}
          <div>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Ecosystem</h4>
            <div className="flex flex-col gap-2.5">
              <Link to="/products/ralion" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Ralion OS
              </Link>
              <Link to="/products/mari-ai" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Mari AI
              </Link>
              <Link to="/products/tradegrid-africa" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                TradeGrid Africa
              </Link>
              <Link to="/products/dfs-platform" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                DFS Platform
              </Link>
              <Link to="/developers" className="text-white/70 hover:text-brand-gold text-sm transition-colors">
                Developer Portal
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <div>
            <h4 className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-4">Navigation</h4>
            <div className="flex flex-col gap-2.5">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-white/70 hover:text-brand-gold text-sm transition-colors"
                >
                  {link.name}
                </Link>
              ))}
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
