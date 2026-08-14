'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { Sparkles, Building2, User, Mail, Lock, Check, MapPin, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthService } from '@/lib/services/auth.service';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    orgName: '',
    branchName: '',
    adminName: '',
    email: '',
    password: '',
    tier: 'COMMUNITY'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmationPending, setIsConfirmationPending] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Step 3 submission: execute real registration
    setIsLoading(true);
    try {
      const data = await AuthService.register(formData.email, formData.password, {
        fullName: formData.adminName,
        orgName: formData.orgName,
        branchName: formData.branchName,
        tier: formData.tier,
      });

      if (data?.session) {
        // Auto-confirmed / instant session
        window.location.href = '/ralion/dashboard';
      } else {
        // Confirmation email dispatched
        setIsConfirmationPending(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please verify your details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!formData.email) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);
    try {
      await AuthService.resendConfirmationEmail(formData.email);
      setResendSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isConfirmationPending) {
    return (
      <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />

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

        <Card className="w-full max-w-lg bg-zinc-900/80 border-zinc-800 backdrop-blur-xl shadow-2xl z-10">
          <CardHeader className="text-center pb-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
              <Mail className="w-6 h-6" />
            </div>
            <CardTitle className="justify-center text-xl font-bold">Check Your Email</CardTitle>
            <CardDescription>We've sent a verification link to confirm your account</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-center space-y-2">
              <p className="text-xs text-zinc-300">
                A confirmation link was sent to:
              </p>
              <p className="text-sm font-bold text-blue-400 font-mono break-all">
                {formData.email}
              </p>
              <p className="text-[11px] text-zinc-500 pt-1">
                Please click the link in the email to activate your workspace, then sign in. Be sure to check your spam/junk folder if you do not see it within a minute.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{error}</p>
              </div>
            )}

            {resendSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <p>New confirmation email has been dispatched.</p>
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleResend}
                isLoading={resendLoading}
                className="w-full text-xs font-semibold border-zinc-800 bg-zinc-950 hover:bg-zinc-900"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-2" />
                Resend Confirmation Email
              </Button>

              <Link href="/login" className="w-full">
                <Button type="button" variant="primary" className="w-full bg-blue-600 hover:bg-blue-500 font-bold">
                  Proceed to Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

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

      <Card className="w-full max-w-lg bg-zinc-900/80 border-zinc-800 backdrop-blur-xl shadow-2xl z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            <span className={`w-2.5 h-2.5 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
            <span className={`w-2.5 h-2.5 rounded-full ${step >= 3 ? 'bg-blue-500' : 'bg-zinc-700'}`} />
          </div>
          <CardTitle className="justify-center text-xl font-bold">
            {step === 1 && 'Step 1: Admin Account Credentials'}
            {step === 2 && 'Step 2: Organization & Branch Profile'}
            {step === 3 && 'Step 3: Select Software License Tier'}
          </CardTitle>
          <CardDescription>Onboard your business onto Ralion Platform</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2 text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleNext} className="flex flex-col gap-4">
            {step === 1 && (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Full Name</label>
                  <input
                    type="text"
                    value={formData.adminName}
                    placeholder="Ras Ali"
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Work Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    placeholder="admin@company.com"
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    placeholder="••••••••••••"
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                    minLength={6}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Company / Organization Name</label>
                  <input
                    type="text"
                    value={formData.orgName}
                    placeholder="e.g. Acme Enterprise"
                    onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-300">Main HQ Branch Name</label>
                  <input
                    type="text"
                    value={formData.branchName}
                    placeholder="e.g. Main Branch"
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    className="w-full mt-1 px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                    required
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="flex flex-col gap-3">
                {[
                  { tier: 'COMMUNITY', price: '$0 / mo', desc: 'Free plan, up to 5 users, basic CRM & Tasks' },
                  { tier: 'PROFESSIONAL', price: '$149 / mo', desc: 'Paid SaaS, up to 25 users, workflows & Mari AI' },
                  { tier: 'ENTERPRISE', price: 'Custom', desc: 'Unlimited branches, custom modules & white label' },
                ].map((t) => (
                  <div
                    key={t.tier}
                    onClick={() => setFormData({ ...formData, tier: t.tier })}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      formData.tier === t.tier
                        ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{t.tier}</span>
                      <span className="text-xs font-mono font-bold text-blue-400">{t.price}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1">{t.desc}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              {step > 1 ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(step - 1)}>
                  Back
                </Button>
              ) : <div />}

              <Button type="submit" variant="primary" size="sm" isLoading={isLoading} className="bg-blue-600 hover:bg-blue-500 font-bold">
                {step < 3 ? 'Continue' : 'Complete Setup & Launch'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-zinc-400">
            Already registered?{' '}
            <Link href="/login" className="text-blue-400 font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
