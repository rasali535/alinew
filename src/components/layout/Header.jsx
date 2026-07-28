import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navLinks } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, ChevronDown, Sparkles, Building2, UserCheck, ArrowRight } from 'lucide-react';

const Header = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const { user, openAuthModal, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const options = { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Africa/Gaborone' };
      setCurrentTime(now.toLocaleTimeString('en-US', options));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 lg:px-10 py-3 bg-[#1c1c1c]/95 backdrop-blur-md border-b border-white/10 shadow-lg">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Tagline */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/assets/images/logo.png"
            alt="Ras Ali Labs Logo"
            className="h-14 md:h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="hidden sm:flex flex-col border-l border-white/15 pl-3">
            <span className="text-white font-bold text-sm tracking-wider uppercase">Ras Ali Labs</span>
            <span className="text-brand-gold text-[10px] tracking-widest uppercase font-medium">Enterprise AI Systems</span>
          </div>
        </Link>

        {/* Desktop Enterprise Navigation */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.href || (link.href !== '/' && location.pathname.startsWith(link.href));
            const isDemo = link.href === '/request-demo';
            if (isDemo) return null; // Render Demo button separately
            return (
              <Link
                key={link.name}
                to={link.href}
                className={`text-xs uppercase tracking-wider font-medium transition-all duration-300 ${
                  isActive
                    ? 'text-brand-gold font-semibold border-b-2 border-brand-gold pb-1'
                    : 'text-white/70 hover:text-white hover:text-brand-gold/90'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Section: Request Demo & Auth */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex flex-col items-end text-right border-r border-white/10 pr-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-brand-gold text-xs font-semibold">{currentTime} CAT</span>
            </div>
            <span className="text-white/40 text-[10px]">Gaborone, Botswana</span>
          </div>

          <Link
            to="/request-demo"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-brand-gold to-amber-500 text-black text-xs font-bold hover:shadow-lg hover:shadow-brand-gold/20 hover:scale-105 transition-all duration-300 flex items-center gap-1.5"
          >
            Request Demo <ArrowRight size={12} />
          </Link>

          {/* User Account Dropdown */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-xs hover:bg-white/15 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-gold to-amber-500 text-black flex items-center justify-center font-bold text-xs">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="max-w-[100px] truncate text-white/90">{user.email?.split('@')[0]}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#252525] border border-white/10 rounded-xl p-2 shadow-2xl z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-white font-medium text-xs truncate">{user.email}</p>
                    <span className="text-[10px] text-brand-gold">Enterprise SSO Account</span>
                  </div>
                  <Link
                    to="/ralion/dashboard"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Sparkles size={14} className="text-brand-gold" /> Launch Ralion OS
                  </Link>
                  <Link
                    to="/onboarding"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <Building2 size={14} className="text-purple-400" /> Organization Setup
                  </Link>
                  <Link
                    to="/account"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <UserCheck size={14} className="text-emerald-400" /> Account & Licenses
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border-t border-white/10 mt-1 pt-2"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 rounded-full border border-brand-gold/40 text-brand-gold text-xs font-semibold hover:bg-brand-gold/10 transition-all duration-300"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link
            to="/request-demo"
            className="px-3 py-1.5 rounded-lg bg-brand-gold text-black text-xs font-bold"
          >
            Demo
          </Link>
          <button
            className="text-white p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Navigation Menu"
          >
            <div className={`w-6 h-0.5 bg-white mb-1.5 transition-transform ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></div>
            <div className={`w-6 h-0.5 bg-white mb-1.5 ${isMenuOpen ? 'opacity-0' : ''}`}></div>
            <div className={`w-6 h-0.5 bg-white ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></div>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {isMenuOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#1c1c1c] border-b border-white/10 py-6 px-6 shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-white/10">
            <span className="text-white font-bold text-sm">Ras Ali Labs</span>
            <span className="text-brand-gold text-xs">— Enterprise AI Systems</span>
          </div>

          <div className="space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="block text-white/80 hover:text-brand-gold py-2 text-base font-medium transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
