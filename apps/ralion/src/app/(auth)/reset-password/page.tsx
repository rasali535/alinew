'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@ralion/ui';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react';
import { AuthService } from '@/lib/services/auth.service';
import { createClient } from '@/lib/supabase/client';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifyingSession, setIsVerifyingSession] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const supabase = createClient();

    const verifyRecoverySession = async () => {
      try {
        // 1. Check for error parameters in query string
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');
        if (errorParam) {
          if (mounted) {
            setIsSessionValid(false);
            setError(errorDescription || 'Your password reset link is invalid or has expired.');
            setIsVerifyingSession(false);
          }
          return;
        }

        // 2. Check for PKCE authorization code in query string
        const code = searchParams.get('code');
        if (code) {
          try {
            const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              if (mounted) {
                setIsSessionValid(false);
                setError('Your password reset link is invalid or has expired.');
                setIsVerifyingSession(false);
              }
              return;
            }
            if (data?.session && mounted) {
              setIsSessionValid(true);
              setIsVerifyingSession(false);
              return;
            }
          } catch (codeErr: any) {
            if (mounted) {
              setIsSessionValid(false);
              setError('Failed to verify recovery link. Please request a new one.');
              setIsVerifyingSession(false);
            }
            return;
          }
        }

        // 3. Check for implicit tokens in URL hash (#access_token=...&type=recovery)
        if (typeof window !== 'undefined' && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const hashError = hashParams.get('error');
          const hashErrorDesc = hashParams.get('error_description');
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          if (hashError) {
            if (mounted) {
              setIsSessionValid(false);
              setError(hashErrorDesc || 'Your password reset link is invalid or has expired.');
              setIsVerifyingSession(false);
            }
            return;
          }

          if (accessToken && (type === 'recovery' || !type)) {
            try {
              const { data, error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              if (!setSessionError && data?.session && mounted) {
                setIsSessionValid(true);
                setIsVerifyingSession(false);
                return;
              }
            } catch (setErr) {
              console.warn('[ResetPassword] Hash token setup note:', setErr);
            }
          }
        }

        // 4. Check existing session from Supabase client
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setIsSessionValid(true);
          setIsVerifyingSession(false);
          return;
        }

        // 5. Fallback: listen for auth state change
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (!mounted) return;
          if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) {
            setIsSessionValid(true);
            setIsVerifyingSession(false);
          }
        });

        // Give auth state change a moment if processing
        setTimeout(() => {
          if (mounted && isVerifyingSession) {
            supabase.auth.getSession().then(({ data: { session: checkSession } }) => {
              if (mounted) {
                if (checkSession) {
                  setIsSessionValid(true);
                } else {
                  setIsSessionValid(false);
                  setError('Your password reset link is invalid or has expired. Please request a new link.');
                }
                setIsVerifyingSession(false);
              }
            });
          }
        }, 1200);

        return () => {
          authListener.subscription.unsubscribe();
        };
      } catch (err: any) {
        if (mounted) {
          setIsSessionValid(false);
          setError('Failed to authenticate recovery session.');
          setIsVerifyingSession(false);
        }
      }
    };

    verifyRecoverySession();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      await AuthService.updatePassword(password);
      setIsSuccess(true);
      
      // Explicitly sign out recovery session so it cannot be reused
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err: any) {
      const msg = err.message || 'Failed to update password. Please try again.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const isLengthValid = password.length >= 8;
  const isMatch = password.length > 0 && password === confirmPassword;

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-2 mb-6 z-10">
        <span className="text-[10px] tracking-widest font-black uppercase text-blue-400">RAS ALI LABS</span>
        <h1 className="text-3xl font-black text-white tracking-wider flex items-center gap-2">
          RALION
        </h1>
        <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 italic">
          Empowered to Prosper
        </p>
      </div>

      <Card className="w-full max-w-md bg-zinc-900/80 border-zinc-800 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="text-center pb-2">
          <CardTitle className="justify-center text-xl font-bold">
            {isSuccess ? 'Password Reset Complete' : 'Create New Password'}
          </CardTitle>
          <CardDescription>
            {isSuccess
              ? 'Your password has been successfully updated'
              : 'Enter and confirm your new account password'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Loading Verification State */}
          {isVerifyingSession && (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-xs text-zinc-400">Verifying secure password recovery link...</p>
            </div>
          )}

          {/* Invalid / Expired Link State */}
          {!isVerifyingSession && isSessionValid === false && !isSuccess && (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="p-3 rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Reset Link Invalid or Expired</h3>
                <p className="text-xs text-zinc-400">
                  {error || 'This password reset link is invalid, malformed, or has already been used.'}
                </p>
              </div>
              <Link href="/forgot-password" className="w-full">
                <Button variant="primary" className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs">
                  Request a New Reset Link
                </Button>
              </Link>
              <Link href="/login" className="text-zinc-400 hover:text-white inline-flex items-center gap-1 text-xs mt-2">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
              </Link>
            </div>
          )}

          {/* Success State */}
          {isSuccess && (
            <div className="flex flex-col items-center text-center py-4 gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-1">Password Updated Successfully</h3>
                <p className="text-xs text-zinc-400">
                  Your account password has been updated. You can now sign in using your new credentials.
                </p>
              </div>
              <Link href="/login" className="w-full">
                <Button variant="primary" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs">
                  Sign In to Ralion
                </Button>
              </Link>
            </div>
          )}

          {/* Password Reset Form */}
          {!isVerifyingSession && isSessionValid === true && !isSuccess && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="text-xs font-semibold text-zinc-300">New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={8}
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-500 hover:text-zinc-300 absolute right-3 top-3"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-xs font-semibold text-zinc-300">Confirm New Password</label>
                <div className="relative mt-1">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={8}
                  />
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-zinc-500 hover:text-zinc-300 absolute right-3 top-3"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Validation Requirements Indicators */}
              <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 flex flex-col gap-1.5 text-[11px]">
                <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>At least 8 characters long</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-zinc-500'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Passwords match</span>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading}
                disabled={!isLengthValid || !isMatch || isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold text-xs mt-1"
              >
                Update Password
              </Button>

              <div className="mt-2 text-center text-xs">
                <Link href="/login" className="text-zinc-400 hover:text-white inline-flex items-center gap-1">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
