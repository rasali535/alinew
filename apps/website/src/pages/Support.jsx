import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import {
  HelpCircle,
  MessageSquare,
  Mail,
  Phone,
  Send,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LifeBuoy,
  FileText
} from 'lucide-react';

const Support = () => {
  const { user } = useAuth();

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('Technical Support');
  const [submitting, setSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How does Supabase Single Sign-On (SSO) work across Ras Ali Labs products?',
      a: 'Your account credentials work seamlessly across Ralion OS, Mari AI, and Ralion Trade. Row-Level Security (RLS) ensures your organization data is isolated and encrypted.'
    },
    {
      q: 'Can I upgrade or downgrade my Ralion subscription anytime?',
      a: 'Yes! You can upgrade from Community Edition to Professional or Enterprise anytime under /account or /pricing with instant feature activation.'
    },
    {
      q: 'How do I download the Ralion Desktop Application?',
      a: 'Visit the Download Center at /downloads to get official installers for Windows (.exe), macOS (.dmg), and Linux (.AppImage).'
    },
    {
      q: 'How do Mari AI reasoning credits reset?',
      a: 'Free Community Edition includes 1,000 Mari AI executions monthly. Professional plans include 50,000 monthly executions and custom model fine-tuning.'
    }
  ];

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const newTicket = {
      id: 'tkt_' + Math.random().toString(36).substring(2, 9),
      user_id: user?.id || 'usr_guest_demo',
      organization_id: 'org_rasali_default',
      subject,
      message,
      category,
      status: 'Open (Pending Support Agent)',
      created_at: new Date().toISOString()
    };

    analytics.trackProductEvent('support_ticket_created', { ticketId: newTicket.id, subject });

    setTimeout(() => {
      setSubmittedTicket(newTicket);
      setSubmitting(false);
      setSubject('');
      setMessage('');
    }, 900);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Customer Support & Help Center | Ras Ali Labs"
        description="Get support for Ralion, Mari AI, and Ras Ali Labs products. Submit support tickets and search FAQs."
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
            <LifeBuoy size={14} /> 24/7 Customer Support & Help Center
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            How can we help you today?
          </h1>
          <p className="text-white/60 text-lg">
            Search our knowledge base, review quick answers, or open a direct ticket with our support engineering team.
          </p>
        </div>

        {/* Support Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mx-auto mb-4">
              <Mail size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Email Support</h3>
            <p className="text-white/50 text-xs mb-4">Direct response within 24 hours</p>
            <a href="mailto:ali@rasalilabs.com" className="text-brand-gold text-xs font-bold hover:underline">
              ali@rasalilabs.com
            </a>
          </div>

          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4">
              <Phone size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Phone / WhatsApp</h3>
            <p className="text-white/50 text-xs mb-4">Gaborone Support Line</p>
            <a href="https://wa.me/26777150423" target="_blank" rel="noopener noreferrer" className="text-purple-400 text-xs font-bold hover:underline">
              +267 77 150 423
            </a>
          </div>

          <div className="bg-[#252525] border border-white/10 p-6 rounded-3xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <FileText size={24} />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Documentation</h3>
            <p className="text-white/50 text-xs mb-4">Search user guides & API specs</p>
            <a href="/docs" className="text-emerald-400 text-xs font-bold hover:underline">
              Browse Docs Portal
            </a>
          </div>
        </div>

        {/* Ticket Submission Form & FAQ Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Ticket Form */}
          <div className="lg:col-span-7 bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-2xl font-bold text-white mb-2">Submit Support Ticket</h3>
            <p className="text-white/50 text-xs mb-6">Database Table: <code className="text-brand-gold font-mono">support_tickets</code></p>

            {submittedTicket ? (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-3">
                <div className="flex items-center gap-2 text-base font-bold text-emerald-300">
                  <CheckCircle2 size={20} /> Ticket Created Successfully!
                </div>
                <div className="font-mono text-white/90">Ticket ID: {submittedTicket.id}</div>
                <div>Subject: <strong className="text-white">{submittedTicket.subject}</strong></div>
                <div>Status: <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">{submittedTicket.status}</span></div>
                <p className="text-white/70 pt-2 border-t border-emerald-500/20">
                  Our engineering team has received your ticket. We will respond via email to {user?.email || 'your registered address'}.
                </p>
                <button
                  onClick={() => setSubmittedTicket(null)}
                  className="mt-2 py-2 px-4 rounded-xl bg-emerald-500 text-black font-bold text-xs"
                >
                  Submit Another Ticket
                </button>
              </div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5">Issue Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                  >
                    <option value="Technical Support">Technical Support</option>
                    <option value="Billing & Subscription">Billing & Subscription</option>
                    <option value="Mari AI Assistance">Mari AI Assistance</option>
                    <option value="USSD Gateway & Integrations">USSD Gateway & Integrations</option>
                    <option value="Feature Request">Feature Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Issue connecting Supabase RLS or Mari AI prompt"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5">Message / Description</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Describe your issue or inquiry in detail..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-brand-gold"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>Submit Ticket <Send size={14} /></>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Frequently Asked Questions */}
          <div className="lg:col-span-5 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Frequently Asked Questions</h3>
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="cursor-pointer bg-[#252525] border border-white/10 p-5 rounded-2xl transition-all hover:border-brand-gold/30"
              >
                <div className="flex items-center justify-between font-bold text-white text-sm">
                  <span>{faq.q}</span>
                  {openFaq === idx ? <ChevronUp size={16} className="text-brand-gold" /> : <ChevronDown size={16} className="text-white/40" />}
                </div>
                {openFaq === idx && (
                  <p className="text-white/60 text-xs mt-3 pt-3 border-t border-white/10 leading-relaxed">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
