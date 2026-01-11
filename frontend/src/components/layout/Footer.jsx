import React from 'react';
import { Link } from 'react-router-dom';
import { Youtube, Facebook, Instagram, Phone, Mail, Github } from 'lucide-react';
import { socialLinks } from '../../data/mock';

const Footer = () => {
  // Map icon names to Lucide components
  const iconMap = {
    'Youtube': Youtube,
    'Facebook': Facebook,
    'Instagram': Instagram,
    'Phone': Phone,
    'Mail': Mail,
    'Github': Github
  };

  return (
    <footer className="bg-[#0a0a0a] border-t border-white/10 py-16 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto">
        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 mb-16">
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="flex gap-0.5">
                <div className="w-3 h-3 rounded-full bg-lime-400"></div>
                <div className="w-3 h-3 rounded-full bg-lime-400"></div>
                <div className="w-3 h-3 rounded-full bg-white/30"></div>
              </div>
              <div className="flex flex-col leading-none">
                <span className="text-white text-sm font-medium tracking-tight">RAS</span>
                <span className="text-white text-sm font-medium tracking-tight">ALI</span>
              </div>
            </Link>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">
              Multi-disciplinary creative studio blending sound, visual storytelling, and technology to craft immersive experiences.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4">Navigation</h4>
            <div className="space-y-3">
              {['Home', 'About', 'Services', 'Work', 'Booking'].map((link) => (
                <Link
                  key={link}
                  to={link === 'Home' ? '/' : `/${link.toLowerCase().replace(' ', '-')}`}
                  className="block text-white/70 hover:text-white text-sm transition-colors duration-300"
                >
                  {link}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4">Contact</h4>
            <div className="space-y-3">
              <a
                href="mailto:rasali@themaplin.com"
                className="block text-white/70 hover:text-lime-400 text-sm transition-colors duration-300"
              >
                rasali@themaplin.com
              </a>
              <a
                href="mailto:maplininc@gmail.com"
                className="block text-white/70 hover:text-lime-400 text-sm transition-colors duration-300"
              >
                maplininc@gmail.com
              </a>
              <p className="text-white/50 text-sm">Gaborone, Botswana</p>
            </div>
            <div className="flex gap-4 mt-6">
              {socialLinks.map((social) => {
                const Icon = iconMap[social.icon] || Mail;
                return (
                  <a
                    key={social.name}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/40 hover:text-lime-400 transition-colors duration-300 transform hover:scale-110"
                    aria-label={social.name}
                  >
                    <Icon size={20} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between pt-8 border-t border-white/10">
          <p className="text-white/40 text-xs mb-4 lg:mb-0">
            © 2025 Ras Ali. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-white text-xs transition-colors duration-300">
              Privacy Policy
            </a>
            <a href="#" className="text-white/40 hover:text-white text-xs transition-colors duration-300">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
