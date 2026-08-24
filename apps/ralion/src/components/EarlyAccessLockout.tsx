'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  TrendingUp, 
  Bot, 
  ShieldCheck, 
  Building2, 
  Mail, 
  User, 
  Briefcase, 
  HelpCircle,
  Clock,
  Layers,
  ChevronRight,
  Flame
} from 'lucide-react';

export interface EarlyAccessLockoutProps {
  title: string;
  category: string;
  badgeText?: string;
  description: string;
  icon?: React.ReactNode;
  industryKey?: string;
  upcomingFeatures?: string[];
  estimatedLaunch?: string;
}

export function EarlyAccessLockout({
  title,
  category,
  badgeText = 'Coming Soon',
  description,
  icon,
  industryKey = 'Industry Solution',
  upcomingFeatures = [],
  estimatedLaunch = 'Q3 / Enterprise Staged Rollout',
}: EarlyAccessLockoutProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [useCase, setUseCase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please provide a valid work email address.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          company,
          industry: `${category} — ${title}`,
          useCase,
          source: industryKey,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSubmitted(true);
        setFeedbackMessage(data.message || 'You are on the VIP waitlist!');
      } else {
        setErrorMessage(data.error || 'Failed to submit early access request. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-4">
      {/* Top Banner Notice */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 border border-amber-500/20 p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/10 text-amber-400">
              {icon || <Lock className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-wide uppercase">
                  <Lock className="w-3 h-3" />
                  {badgeText}
                </span>
                <span className="text-xs text-zinc-400 font-mono tracking-tight">{category}</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  <Flame className="w-2.5 h-2.5" /> High Demand VIP Queue
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white mt-2">
                {title}
              </h1>
              <p className="text-sm text-zinc-300 max-w-2xl mt-2 leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 w-full md:w-auto">
            <Link
              href="/growth"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all text-center"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Open Growth & Social
            </Link>
            <Link
              href="/mari-ai"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all text-center"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open Mari AI
            </Link>
          </div>
        </div>

        {/* Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Grid: Features Overview + Lead Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Vision & Features (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <Card className="bg-zinc-900/60 border-zinc-800 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                <Clock className="w-4 h-4 text-indigo-400" />
                Rollout Roadmap
              </div>
              <CardTitle className="text-lg text-white font-bold">Planned Architecture</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                This module is currently in staged private beta for selected enterprise launch partners.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">Target Rollout:</span>
                <span className="text-amber-400 font-mono font-bold">{estimatedLaunch}</span>
              </div>

              {upcomingFeatures.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
                    Upcoming Capabilities:
                  </span>
                  <div className="space-y-2">
                    {upcomingFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-zinc-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  Currently Rolling Out:
                </div>
                <span>
                  <strong>Growth & Social</strong> and <strong>Mari AI Command</strong> are live and ready for production use across your workspace.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Lead Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card className="bg-zinc-900/80 border-zinc-800 shadow-xl relative overflow-hidden backdrop-blur-md">
            <CardHeader className="pb-4 border-b border-zinc-800/80">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl font-bold text-white">Join Early Access Waitlist</CardTitle>
                    <Badge variant="warning" className="text-[10px]">VIP Priority</Badge>
                  </div>
                  <CardDescription className="text-xs text-zinc-400 mt-1">
                    Be the first in line when this solution opens for deployment in your region.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {isSubmitted ? (
                <div className="py-8 flex flex-col items-center text-center space-y-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Early Access Reserved!</h3>
                    <p className="text-xs text-zinc-300 max-w-md mt-2 leading-relaxed">
                      {feedbackMessage || 'Thank you! Your organization has been prioritized in our private beta deployment schedule.'}
                    </p>
                  </div>
                  <div className="pt-4 flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link
                      href="/growth"
                      className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-all text-center flex items-center justify-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4" /> Go to Growth Studio
                    </Link>
                    <Link
                      href="/mari-ai"
                      className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all text-center flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-purple-400" /> Explore Mari AI
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMessage && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                      <span>⚠️ {errorMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        Your Full Name
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Dr. Jane Khumalo"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                        Work Email Address <span className="text-rose-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@organization.com"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                      Company / Organization Name
                    </label>
                    <div className="relative">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="e.g. Acme Health Group / Ras Ali Labs"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                      Target Solution Category
                    </label>
                    <div className="relative">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        disabled
                        value={`${category} — ${title}`}
                        className="w-full bg-zinc-950/60 border border-zinc-800/80 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-400 cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-zinc-300 block mb-1.5">
                      Priority Use Case / Requirements (Optional)
                    </label>
                    <div className="relative">
                      <HelpCircle className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3" />
                      <textarea
                        rows={3}
                        value={useCase}
                        onChange={(e) => setUseCase(e.target.value)}
                        placeholder="Tell us about your operational workflows, compliance requirements, or target timeline..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    className="w-full py-2.5 text-xs font-bold bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Submitting Early Access Request...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 justify-center">
                        <Lock className="w-3.5 h-3.5" />
                        Request Early Access & Lock In VIP Queue
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </Button>

                  <p className="text-[10px] text-zinc-500 text-center">
                    🔒 No spam. We only contact verified early access applicants regarding private beta deployment.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
