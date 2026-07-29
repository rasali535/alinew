'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@ralion/ui';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSubmitted(true);
    }, 500);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
          <CardTitle className="justify-center text-xl font-bold">Reset Password</CardTitle>
          <CardDescription>Enter your email to receive password recovery instructions</CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-zinc-300">Account Email</label>
                <div className="relative mt-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@company.com"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                    required
                  />
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                </div>
              </div>

              <Button type="submit" variant="primary" isLoading={isLoading} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 font-bold">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="flex flex-col items-center text-center p-4 gap-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Reset Link Sent</h3>
              <p className="text-xs text-zinc-400">
                If an account exists for <span className="text-blue-400 font-mono">{email}</span>, password reset instructions have been sent.
              </p>
            </div>
          )}

          <div className="mt-6 text-center text-xs">
            <Link href="/login" className="text-zinc-400 hover:text-white inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
