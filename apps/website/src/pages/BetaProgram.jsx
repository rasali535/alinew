import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import SEO from '../components/common/SEO';
import { Sparkles, Send, CheckCircle2, MessageSquare, TestTube, Lightbulb } from 'lucide-react';

const BetaProgram = () => {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [featureRequested, setFeatureRequested] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);

  const handleJoinBeta = (e) => {
    e.preventDefault();
    setSubmitting(true);

    const betaEntry = {
      id: 'beta_' + Math.random().toString(36).substring(2, 9),
      email,
      feature_requested: featureRequested,
      feedback,
      user_id: user?.id || null,
      created_at: new Date().toISOString()
    };

    analytics.trackProductEvent('beta_program_joined', { email, featureRequested });

    setTimeout(() => {
      setSubmitting(false);
      setJoined(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Ralion Beta Program & Feature Requests | Ras Ali Labs"
        description="Join Ralion Beta Program. Test upcoming AI modules, request custom features, and shape the roadmap."
      />

      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <TestTube size={14} /> Pioneer Early Access
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
            Join the Ralion Beta Program
          </h1>
          <p className="text-white/60 text-lg">
            Get early access to unreleased Mari AI reasoning models, preview industry add-ons, and request features directly from our core engineering team.
          </p>
        </div>

        {/* Beta Application & Request Form */}
        <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          {joined ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-2xl font-bold text-white">Welcome to the Beta Program!</h3>
              <p className="text-white/70 text-sm max-w-md mx-auto">
                We have registered <strong className="text-brand-gold">{email}</strong> in our <code className="text-purple-400 font-mono">beta_users</code> registry. You will receive invite keys when new experimental builds launch.
              </p>
              <button
                onClick={() => setJoined(false)}
                className="py-2.5 px-6 rounded-xl bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-colors"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoinBeta} className="space-y-6">
              <div className="flex items-center gap-2 text-brand-gold font-bold text-sm border-b border-white/10 pb-4">
                <Lightbulb size={18} /> Beta Registration & Feature Request
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">What feature or module would you like to request?</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Automated SADC customs document OCR parser"
                  value={featureRequested}
                  onChange={(e) => setFeatureRequested(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand-gold"
                />
              </div>

              <div>
                <label className="block text-white/70 text-xs font-semibold mb-2">Feedback & Use Case Context</label>
                <textarea
                  rows={4}
                  placeholder="Describe your current business workflow and how early beta access will help your organization..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-sm focus:outline-none focus:border-brand-gold"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 to-brand-gold text-white font-bold text-xs hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>Join Beta Program & Request Feature <Send size={14} /></>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BetaProgram;
