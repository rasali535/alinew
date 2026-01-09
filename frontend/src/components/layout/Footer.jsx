import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
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
                <span className="text-white text-sm font-medium tracking-tight">creative</span>
                <span className="text-white text-sm font-medium tracking-tight">apes</span>
              </div>
            </Link>
            <p className="text-white/50 text-sm max-w-md leading-relaxed">
              We're a creative design and development studio based in India, working with brands across branding, UI/UX, motion, and interactive web experiences.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white/40 text-xs uppercase tracking-wider mb-4">Navigation</h4>
            <div className="space-y-3">
              {['Home', 'About', 'Work', 'Services', 'AI Labs', 'Contact'].map((link) => (
                <Link
                  key={link}
                  to={`/${link.toLowerCase().replace(' ', '-')}`}
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
                href="mailto:hello@creativeapes.design"
                className="block text-white/70 hover:text-lime-400 text-sm transition-colors duration-300"
              >
                hello@creativeapes.design
              </a>
              <p className="text-white/50 text-sm">Pune, Bangalore - India</p>
            </div>
            <div className="flex gap-4 mt-6">
              {['Twitter', 'LinkedIn', 'Instagram', 'Dribbble'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="text-white/40 hover:text-lime-400 text-xs transition-colors duration-300"
                >
                  {social}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between pt-8 border-t border-white/10">
          <p className="text-white/40 text-xs mb-4 lg:mb-0">
            © 2025 Creative Apes. All rights reserved.
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
