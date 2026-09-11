import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { navLinks, companyInfo } from '../../data/mock';
import { useAuth } from '../../context/AuthContext';
import { User, LogOut, ChevronDown, Sparkles, Building2, UserCheck, ArrowRight, Video, Code, Music, Bot } from 'lucide-react';

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
    <header className="fixed top-0 left-0 right-0 z-50 px-4 lg:px-10 py-3 bg-[#121212]/95 backdrop-blur-md border-b border-white/10 shadow-xl">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Ras Ali Labs Parent Logo & Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/assets/images/logo.png"
            alt="Ras Ali Labs Logo"
            className="h-12 md:h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col border-l border-white/15 pl-3">
            <span className="text-white font-extrabold text-sm md:text-base tracking-wider uppercase group-hover:text-brand-gold transition-colors">
              Ras Ali Labs
            </span>
            <span className="text-brand-gold text-[10px] tracking-widest uppercase font-semibold">
              Technology • Film • Sound
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 xl:gap-8">
          {navLinks.map((link) => {
            const isActive =
              location.pathname === link.href ||
              (link.href !== '/' && location.pathname.startsWith(link.href));

            if (link.dropdown) {
              return (
                <div key={link.name} className="relative group">
                  <Link
                    to={link.href}
                    className={`flex items-center gap-1.5 text-xs uppercase tracking-wider font-semibold transition-all duration-300 py-4 ${
                      isActive ? 'text-brand-gold' : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {link.name}
                    <ChevronDown size={13} className="transition-transform duration-200 group-hover:rotate-180 text-white/50" />
                  </Link>

                  <div className="absolute top-full left-0 w-80 bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50">
                    {link.dropdown.map((section, idx) => (
                      <div key={idx} className={idx > 0 ? "mt-3 pt-3 border-t border-white/10" : ""}>
                        <div className="text-[10px] text-brand-gold uppercase tracking-widest font-bold mb-2 px-2">
                          {section.title}
                        </div>
                        <div className="flex flex-col space-y-1">
                          {section.items.map((item) => (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="px-3 py-2 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors flex items-center justify-between group/sub"
                            >
                              <span>{item.name}</span>
                              <span className="text-brand-gold text-xs opacity-0 group-hover/sub:opacity-100 transition-opacity">→</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t border-white/10 px-2">
                      <Link
                        to="/services"
                        className="text-[11px] text-brand-gold hover:underline font-semibold flex items-center justify-between"
                      >
                        <span>View All Capabilities</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={link.name}
                to={link.href}
                className={`text-xs uppercase tracking-wider font-semibold transition-all duration-300 py-4 ${
                  isActive
                    ? 'text-brand-gold border-b-2 border-brand-gold'
                    : 'text-white/75 hover:text-brand-gold'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </div>

        {/* Right Action Area */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex flex-col items-end text-right border-r border-white/15 pr-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-brand-gold text-xs font-semibold">{currentTime} CAT</span>
            </div>
            <span className="text-white/50 text-[10px]">Gaborone, Botswana</span>
          </div>

          <Link
            to="/contact"
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all"
          >
            Start a Project
          </Link>

          <a
            href="/ralion"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-xs font-bold hover:shadow-lg hover:shadow-brand-gold/25 hover:scale-105 transition-all flex items-center gap-1.5"
          >
            <Sparkles size={12} /> Launch Ralion
          </a>

          {/* User SSO / Auth */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 border border-white/20 text-white text-xs hover:bg-white/15 transition-all"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-brand-gold to-amber-500 text-black flex items-center justify-center font-bold text-xs">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="max-w-[90px] truncate text-white/90">{user.email?.split('@')[0]}</span>
                <ChevronDown size={14} className="text-white/60" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-[#1f1f1f] border border-white/15 rounded-2xl p-2 shadow-2xl z-50">
                  <div className="px-3 py-2 border-b border-white/10 mb-1">
                    <p className="text-white font-medium text-xs truncate">{user.email}</p>
                    <span className="text-[10px] text-brand-gold font-semibold">Ras Ali Labs Account</span>
                  </div>
                  <a
                    href="/ralion/dashboard"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <Sparkles size={14} className="text-brand-gold" /> Launch Ralion OS
                  </a>
                  <Link
                    to="/account"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                  >
                    <UserCheck size={14} className="text-emerald-400" /> Account Settings
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsUserDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-xl transition-colors border-t border-white/10 mt-1 pt-2"
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="px-3.5 py-2 rounded-xl border border-brand-gold/40 text-brand-gold text-xs font-semibold hover:bg-brand-gold/10 transition-all"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 lg:hidden">
          <Link
            to="/contact"
            className="px-3 py-1.5 rounded-xl bg-brand-gold text-black text-xs font-bold"
          >
            Start Project
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
        <div className="lg:hidden absolute top-full left-0 right-0 bg-[#181818] border-b border-white/15 py-6 px-6 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <span className="text-white font-extrabold text-sm block">Ras Ali Labs</span>
              <span className="text-brand-gold text-xs">Technology • Film • Sound • Innovation</span>
            </div>
            <div className="text-right">
              <span className="text-emerald-400 text-xs font-semibold">{currentTime} CAT</span>
            </div>
          </div>

          <div className="space-y-4 overflow-y-auto max-h-[70vh] pb-8">
            {navLinks.map((link) => (
              <div key={link.name}>
                {link.dropdown ? (
                  <div className="space-y-3">
                    <Link
                      to={link.href}
                      className="text-white font-bold text-base hover:text-brand-gold transition-colors block"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {link.name}
                    </Link>
                    <div className="pl-4 space-y-3 border-l border-white/15">
                      {link.dropdown.map((section, idx) => (
                        <div key={idx}>
                          <div className="text-[10px] text-brand-gold uppercase tracking-widest font-bold mb-1.5">
                            {section.title}
                          </div>
                          <div className="flex flex-col space-y-2">
                            {section.items.map((item) => (
                              <Link
                                key={item.name}
                                to={item.href}
                                className="text-white/70 hover:text-white text-xs transition-colors block"
                                onClick={() => setIsMenuOpen(false)}
                              >
                                {item.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Link
                    to={link.href}
                    className="block text-white font-bold text-base hover:text-brand-gold transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                )}
              </div>
            ))}

            <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
              <a
                href="/ralion"
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black text-center font-bold text-xs"
              >
                Launch Ralion OS
              </a>
              <Link
                to="/contact"
                className="w-full py-3 rounded-xl bg-white/10 text-white text-center font-semibold text-xs border border-white/15"
                onClick={() => setIsMenuOpen(false)}
              >
                Start a Project
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
