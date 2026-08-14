import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authMode, openAuthModal, signIn, signUp, resendConfirmation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setIsUnconfirmed(false);
    setResendSuccess(false);

    if (authMode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        const msg = error.message || 'Failed to sign in. Please check credentials.';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setIsUnconfirmed(true);
          setErrorMsg('Your email address has not been confirmed yet. Please verify via the link sent to your inbox.');
        } else {
          setErrorMsg(msg);
        }
      }
    } else {
      const { error, requiresConfirmation } = await signUp(email, password, { full_name: fullName });
      if (error) {
        setErrorMsg(error.message || 'Failed to create account.');
      } else if (requiresConfirmation) {
        setIsConfirmationPending(true);
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    setResendSuccess(false);
    setErrorMsg('');
    const { error } = await resendConfirmation(email);
    setResendLoading(false);
    if (error) {
      setErrorMsg(error.message || 'Failed to resend confirmation email.');
    } else {
      setResendSuccess(true);
    }
  };

  const handleClose = () => {
    setIsConfirmationPending(false);
    setIsUnconfirmed(false);
    setErrorMsg('');
    setResendSuccess(false);
    closeAuthModal();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#1c1c1c] border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-gold/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
        >
          <X size={20} />
        </button>

        {/* Confirmation Pending Screen */}
        {isConfirmationPending ? (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Mail size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">Check Your Inbox</h3>
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 text-xs text-white/80 space-y-2">
              <p className="text-white/60">We sent an account confirmation email to:</p>
              <p className="text-brand-gold font-bold font-mono break-all">{email}</p>
              <p className="text-white/50 text-[11px] pt-1">
                Please click the link in that email to activate your account. If you don't see it, check your spam/junk folder.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs text-left">
                {errorMsg}
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Confirmation email resent successfully!</span>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendLoading}
                className="w-full py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={resendLoading ? 'animate-spin' : ''} />
                {resendLoading ? 'Sending...' : 'Resend Confirmation Email'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsConfirmationPending(false);
                  openAuthModal('login');
                }}
                className="w-full py-3 px-4 rounded-xl bg-brand-gold text-black font-bold text-xs hover:opacity-90 transition-opacity"
              >
                Go to Sign In
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-medium mb-3">
                <ShieldCheck size={14} /> Single Sign-On Architecture
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {authMode === 'login' ? 'Ras Ali Labs Account' : 'Join Ras Ali Labs Ecosystem'}
              </h3>
              <p className="text-white/60 text-xs mt-1">
                One account for Ralion, Mari AI, and Ralion Trade
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {isUnconfirmed && (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendLoading}
                    className="inline-flex items-center gap-1 text-xs text-brand-gold hover:underline font-semibold"
                  >
                    <RefreshCw size={12} className={resendLoading ? 'animate-spin' : ''} />
                    {resendLoading ? 'Sending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            )}

            {resendSuccess && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Confirmation email resent! Check your inbox and spam folder.</span>
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
                  onClick={() => {
                    setErrorMsg('');
                    setIsUnconfirmed(false);
                    setResendSuccess(false);
                    openAuthModal(authMode === 'login' ? 'signup' : 'login');
                  }}
                  className="text-brand-gold font-medium hover:underline ml-1"
                >
                  {authMode === 'login' ? 'Create one here' : 'Sign in'}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;
