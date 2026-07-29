import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { Sparkles, Send, CheckCircle2, Building2, Mail, Phone, User, MessageSquare, ShieldCheck } from 'lucide-react';

const RequestDemo = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    workEmail: '',
    phone: '',
    company: '',
    industry: 'Funeral Management',
    challenge: '',
    solutionInterest: 'Ralion OS',
    message: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    analytics.trackConversion('demo_request_submitted', {
      company: formData.company,
      industry: formData.industry,
      solutionInterest: formData.solutionInterest
    });

    try {
      // Log to Supabase demo_requests table
      await supabase.from('demo_requests').insert([
        {
          full_name: formData.fullName,
          work_email: formData.workEmail,
          phone: formData.phone,
          company: formData.company,
          industry: formData.industry,
          challenge: formData.challenge,
          solution_interest: formData.solutionInterest,
          message: formData.message,
          created_at: new Date().toISOString()
        }
      ]);
    } catch (err) {
      console.warn('Demo request log note:', err.message);
    }

    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Request Enterprise Demo | Ras Ali Labs"
        description="Schedule an enterprise demo for Ralion OS, Mari AI, and industry operating systems with Ras Ali Labs."
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Enterprise Demo Request
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Request an Enterprise Demo
          </h1>
          <p className="text-white/60 text-lg">
            See how Ras Ali Labs builds AI-powered operating systems that automate operations, connect teams, and drive enterprise growth.
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          {submitted ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-white">Demo Request Received!</h3>
              <p className="text-white/70 text-sm max-w-md mx-auto">
                Thank you <strong className="text-brand-gold">{formData.fullName}</strong>. An enterprise solution architect from Ras Ali Labs will contact you at <code className="text-brand-gold font-mono">{formData.workEmail}</code> within 24 hours.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-6 py-2.5 px-6 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Full Name *</label>
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-3.5 text-white/40" />
                    <input
                      type="text"
                      name="fullName"
                      required
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Work Email Address *</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-3.5 text-white/40" />
                    <input
                      type="email"
                      name="workEmail"
                      required
                      placeholder="name@company.com"
                      value={formData.workEmail}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Company Name *</label>
                  <div className="relative">
                    <Building2 size={16} className="absolute left-4 top-3.5 text-white/40" />
                    <input
                      type="text"
                      name="company"
                      required
                      placeholder="Acme Enterprise Ltd"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Phone Number</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-3.5 text-white/40" />
                    <input
                      type="tel"
                      name="phone"
                      placeholder="+267 77 000 000"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-black/50 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Industry Sector *</label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                  >
                    <option value="Funeral Management">Funeral Management (Funeral OS)</option>
                    <option value="Logistics">Logistics & Fleet Transport</option>
                    <option value="Healthcare">Healthcare & Medical Services</option>
                    <option value="Government">Government & Public Sector</option>
                    <option value="Trade">Trade & Commerce Networks</option>
                    <option value="Other">Other Enterprise Industry</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-2">Solution Interest *</label>
                  <select
                    name="solutionInterest"
                    value={formData.solutionInterest}
                    onChange={handleChange}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                  >
                    <option value="Ralion OS">Ralion OS — AI Business OS</option>
                    <option value="Mari AI Engine">Mari AI Reasoning Engine</option>
                    <option value="TradeGrid Africa">TradeGrid Africa Infrastructure</option>
                    <option value="Funeral OS">Funeral OS Solution</option>
                    <option value="Logistics OS">Logistics OS Solution</option>
                    <option value="Health OS">Health OS Solution</option>
                    <option value="Custom AI">Custom Enterprise AI Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Operational Challenge / Primary Goal *</label>
                <input
                  type="text"
                  name="challenge"
                  required
                  placeholder="e.g. Automating funeral case workflows and family billing policies"
                  value={formData.challenge}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Additional Project Notes / Message</label>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Tell us about your team size, current software stack, or target timeline..."
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-brand-gold"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Submit Enterprise Demo Request <Send size={14} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestDemo;
