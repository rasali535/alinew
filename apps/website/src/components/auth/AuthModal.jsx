import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Lock, Mail, User, ArrowRight, ShieldCheck, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

const AuthModal = () => {
  const { isAuthModalOpen, closeAuthModal, authMode, openAuthModal, signIn, signUp, signInWithOAuth, resendConfirmation } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isUnconfirmed, setIsUnconfirmed] = useState(false);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleOAuth = async (provider) => {
    setOauthLoading(provider);
    setErrorMsg('');
    const { error } = await signInWithOAuth(provider);
    if (error) {
      setErrorMsg(error.message || `${provider} sign-in failed. Please try again.`);
      setOauthLoading(null);
    }
  };

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
    setOauthLoading(null);
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
            <div className="mb-6 text-center">
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

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                disabled={loading || oauthLoading !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {oauthLoading === 'google' ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                )}
                <span>Google</span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth('facebook')}
                disabled={loading || oauthLoading !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {oauthLoading === 'facebook' ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4 shrink-0 fill-[#1877F2]" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                )}
                <span>Facebook</span>
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold text-white/40 tracking-wider">
                <span className="bg-[#1c1c1c] px-2">or email credentials</span>
              </div>
            </div>

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
