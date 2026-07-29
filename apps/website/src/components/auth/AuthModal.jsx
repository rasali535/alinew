import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck } from 'lucide-react';

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authMode, openAuthModal, signIn, signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (authMode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setErrorMsg(error.message || 'Failed to sign in. Please check credentials.');
    } else {
      const { error } = await signUp(email, password, { full_name: fullName });
      if (error) setErrorMsg(error.message || 'Failed to create account.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#1c1c1c] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-medium mb-3">
            <ShieldCheck size={14} /> Single Sign-On Architecture
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {authMode === 'login' ? 'Ras Ali Labs Account' : 'Join Ras Ali Labs Ecosystem'}
          </h3>
          <p className="text-white/60 text-xs mt-1">
            One account for Ralion, Mari AI, TradeGrid & DFS Platform
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="block text-white/70 text-xs font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                <input
                  type="text"
                  required
                  placeholder="Ras Ali"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-white/30"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-white/70 text-xs font-medium mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="email"
                required
                placeholder="name@rasalilabs.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-white/30"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/70 text-xs font-medium mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40" size={18} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold transition-colors placeholder:text-white/30"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all duration-300 shadow-lg shadow-brand-gold/20 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                {authMode === 'login' ? 'Sign In to Ecosystem' : 'Create Free Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-white/60 text-xs">
            {authMode === 'login' ? "Don't have an account yet?" : "Already have a Ras Ali Labs account?"}{' '}
            <button
              onClick={() => openAuthModal(authMode === 'login' ? 'signup' : 'login')}
              className="text-brand-gold font-medium hover:underline ml-1"
            >
              {authMode === 'login' ? 'Create one here' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
