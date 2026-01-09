import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { navLinks } from '../../data/mock';

const Header = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' };
      setCurrentTime(now.toLocaleTimeString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 lg:px-12 py-5">
      <nav className="flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
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

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="text-white/70 hover:text-white text-sm transition-colors duration-300"
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right Section */}
        <div className="hidden lg:flex items-center gap-6">
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-2">
              <span className="text-white/70 text-xs">Based in India</span>
              <span className="text-lime-400 text-xs font-medium">{currentTime}</span>
            </div>
            <span className="text-white/50 text-xs">AI-First Creative Solutions</span>
          </div>
          <button className="w-10 h-10 rounded-full bg-lime-400 flex items-center justify-center hover:scale-110 transition-transform duration-300">
            <div className="w-2 h-2 rounded-full bg-black"></div>
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="lg:hidden text-white p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <div className="w-6 h-0.5 bg-white mb-1.5"></div>
          <div className="w-6 h-0.5 bg-white mb-1.5"></div>
          <div className="w-4 h-0.5 bg-white"></div>
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#0a0a0a] border-t border-white/10 py-6 px-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.href}
              className="block text-white/70 hover:text-white py-3 text-lg"
              onClick={() => setIsMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;
