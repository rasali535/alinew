import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import {
  Bot,
  Sparkles,
  ArrowRight,
  Brain,
  TrendingUp,
  ShieldCheck,
  Activity,
  Database,
  Megaphone,
  Share2,
  BriefcaseBusiness,
  Globe2,
  Search,
  FileText,
  ListTodo,
  Users,
  MessageCircle,
  LockKeyhole,
  CheckCircle2,
  Zap,
  Network,
  Send
} from 'lucide-react';

const capabilityCards = [
  {
    icon: Brain,
    title: 'Understands your business',
    description: 'Mari works with the business profile, goals and approved context Ralion has been given instead of behaving like a completely blank chatbot.'
  },
  {
    icon: Megaphone,
    title: 'Marketing & growth support',
    description: 'Explore campaign ideas, positioning, audience direction, content angles and practical growth recommendations grounded in your business.'
  },
  {
    icon: Network,
    title: 'Works with Ralion',
    description: 'Mari is designed as the intelligence layer across Ralion OS, helping connect thinking with the workflows and tools where work gets done.'
  },
  {
    icon: Share2,
    title: 'Social intelligence',
    description: 'Prepare social content and campaign direction, then move approved work toward Ralion’s publishing and social workflow.'
  },
  {
    icon: BriefcaseBusiness,
    title: 'Business assistance',
    description: 'Ask questions about operations, customers, planning and work happening across the business context available inside your Ralion workspace.'
  },
  {
    icon: Globe2,
    title: 'Approved business sources',
    description: 'Website ingestion and approved knowledge sources help make Mari increasingly specific to the company she is working with.'
  },
  {
    icon: Search,
    title: 'Market & competitor intelligence',
    description: 'Where enabled, Mari can analyse publicly available competitor positioning, messaging and market signals to identify opportunities for your own strategy.'
  }
];

const publicQuestions = [
  'What does Ralion do?',
  'Can Mari help with marketing?',
  'Is Ralion suitable for a small business?',
  'How is Mari different from a normal chatbot?'
];

const answerPublicQuestion = (question) => {
  const normalized = question.toLowerCase();

  if (normalized.includes('marketing')) {
    return 'Yes. Mari can help with campaign direction, positioning, audience thinking, content ideas and growth recommendations using the business context available in Ralion. Approved work can then move into the wider Ralion growth and social workflow.';
  }

  if (normalized.includes('small business') || normalized.includes('small')) {
    return 'Ralion is designed to help growing businesses bring customer work, growth activity and business operations into one connected environment. Mari adds an intelligence layer so owners and teams can ask questions, plan work and turn decisions into action without jumping between disconnected tools.';
  }

  if (normalized.includes('different') || normalized.includes('chatbot')) {
    return 'A normal chatbot starts mostly from the conversation in front of it. Mari is designed to work inside Ralion OS with permission-bounded business context and connected workflows, so the goal is not only to answer a question but to help move useful decisions toward execution.';
  }

  if (normalized.includes('professional') || normalized.includes('pricing') || normalized.includes('plan')) {
    return 'Ralion offers different plans for different stages of business. The best place to compare current inclusions is the Pricing page, where you can see which Ralion and Mari capabilities are available for each plan.';
  }

  if (normalized.includes('competitor') || normalized.includes('research')) {
    return 'Where enabled, Mari can work with publicly available competitor and market information to identify patterns, positioning and opportunities. The objective is original strategy for your business — not copying a competitor’s work.';
  }

  return 'Ralion OS is a connected business operating system for customer work, growth, social activity and operations. Mari is the AI intelligence inside it, helping you understand business context, plan what to do next and work across the platform more effectively.';
};

const RalionMariAIProduct = () => {
  const [question, setQuestion] = useState('What does Ralion do?');
  const [submittedQuestion, setSubmittedQuestion] = useState('What does Ralion do?');

  const publicAnswer = useMemo(
    () => answerPublicQuestion(submittedQuestion),
    [submittedQuestion]
  );

  const submitQuestion = (event) => {
    event?.preventDefault();
    const nextQuestion = question.trim();
    if (!nextQuestion) return;
    setSubmittedQuestion(nextQuestion);
  };

  const selectQuestion = (value) => {
    setQuestion(value);
    setSubmittedQuestion(value);
  };

  return (
    <div className="min-h-screen bg-[#07101f] text-white pt-28 overflow-hidden">
      <SEO
        title="Mari AI — The Intelligence Inside Ralion OS"
        description="Meet Mari AI, the intelligence layer inside Ralion OS. Understand business context, plan growth, prepare marketing and turn decisions into action across Ralion."
        canonical="https://rasalilabs.com/mari-ai"
      />

      {/* HERO */}
      <section className="relative px-6 lg:px-12 pt-12 pb-24 border-b border-white/10">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[520px] bg-purple-600/20 rounded-full blur-[170px]"></div>
          <div className="absolute top-24 left-[15%] w-72 h-72 bg-brand-gold/10 rounded-full blur-[120px]"></div>
          <div className="absolute right-[8%] bottom-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-[140px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-300/25 text-purple-200 text-xs font-bold uppercase tracking-[0.18em] mb-6">
              <Bot size={14} /> Meet Mari AI
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.03] mb-6">
              Your business already has information. <span className="bg-gradient-to-r from-purple-300 via-white to-brand-gold bg-clip-text text-transparent">Mari helps you use it.</span>
            </h1>

            <p className="text-white/70 text-base md:text-xl max-w-3xl mx-auto leading-relaxed mb-9">
              Mari is the AI intelligence inside Ralion OS. She helps you understand your business, plan marketing, generate ideas, work with customer and operational information, and turn decisions into action across Ralion.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="/ralion/register"
                className="px-7 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 text-white font-extrabold text-sm hover:scale-105 transition-all shadow-xl shadow-purple-900/30 flex items-center gap-2"
              >
                Start with Ralion OS <ArrowRight size={17} />
              </a>
              <Link
                to="/products/ralion-os"
                className="px-7 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm transition-all flex items-center gap-2"
              >
                Explore Ralion OS <Sparkles size={15} className="text-brand-gold" />
              </Link>
            </div>
          </div>

          {/* Intelligence architecture visual */}
          <div className="max-w-6xl mx-auto rounded-[2rem] border border-white/10 bg-white/[0.035] backdrop-blur-xl p-5 md:p-8 shadow-2xl shadow-black/40 relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-300/50 to-transparent"></div>
            <div className="flex items-center justify-between mb-8">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-purple-300 font-bold mb-1">Ralion Intelligence Architecture</div>
                <div className="text-sm md:text-base text-white/80 font-semibold">Business context → Mari → connected action</div>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-[10px] text-emerald-300 uppercase tracking-wider font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Context connected
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_1.1fr_1fr] gap-6 items-center">
              <div className="space-y-3">
                {[
                  ['Business profile', Database, 'Identity, offers & goals'],
                  ['Customers & activity', Users, 'Operational context'],
                  ['Approved sources', Globe2, 'Website & business knowledge'],
                ].map(([label, Icon, detail]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-black/20 p-4 flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Icon size={18} className="text-white/65" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{label}</div>
                      <div className="text-[10px] text-white/45 mt-0.5">{detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="relative min-h-[330px] flex items-center justify-center">
                <div className="absolute w-72 h-72 rounded-full border border-purple-300/10 animate-pulse"></div>
                <div className="absolute w-56 h-56 rounded-full border border-brand-gold/10"></div>
                <div className="absolute w-44 h-44 rounded-full bg-purple-500/20 blur-[45px]"></div>
                <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border border-purple-300/40 bg-gradient-to-br from-purple-400/25 via-violet-700/20 to-brand-gold/15 flex flex-col items-center justify-center shadow-[0_0_80px_rgba(168,85,247,0.28)]">
                  <Bot size={52} className="text-white mb-2" />
                  <div className="text-xl font-extrabold">MARI</div>
                  <div className="text-[10px] uppercase tracking-[0.25em] text-purple-200">Intelligence Layer</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Growth', TrendingUp],
                  ['CRM', Users],
                  ['Social', Share2],
                  ['Documents', FileText],
                  ['Tasks', ListTodo],
                  ['Decisions', Sparkles],
                ].map(([label, Icon]) => (
                  <div key={label} className="rounded-2xl border border-purple-300/15 bg-purple-300/[0.045] p-4 min-h-[92px] flex flex-col justify-between">
                    <Icon size={18} className="text-purple-200" />
                    <span className="text-xs font-bold text-white">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONVERSATION DEMO */}
      <section className="py-24 px-6 lg:px-12 bg-[#091425] border-b border-white/10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-purple-300 text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <MessageCircle size={15} /> From question to direction
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">Talk to the business, not just a blank chat window.</h2>
            <p className="text-white/65 text-base leading-relaxed mb-7">
              Mari is built to reason with the business context available inside Ralion. That changes the conversation from generic AI answers to practical direction that can connect to the rest of the operating system.
            </p>
            <div className="space-y-3">
              {[
                'Business context before generic advice',
                'Marketing direction grounded in your goals',
                'Connected workflows instead of isolated chat',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle2 size={17} className="text-emerald-300 shrink-0" /> {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-[#0d1728] p-5 md:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-300/20 flex items-center justify-center">
                  <Bot size={18} className="text-purple-200" />
                </div>
                <div>
                  <div className="text-sm font-bold">Mari AI</div>
                  <div className="text-[10px] text-emerald-300">Business context available</div>
                </div>
              </div>
              <Activity size={16} className="text-white/30" />
            </div>

            <div className="space-y-4">
              <div className="ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-white/10 border border-white/10 p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/35 font-bold mb-2">You</div>
                <p className="text-sm text-white/90">Mari, what should we focus our marketing on this month?</p>
              </div>

              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-purple-500/10 border border-purple-300/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-purple-200 font-bold mb-2">Mari</div>
                <p className="text-sm text-white/80 leading-relaxed mb-4">Based on your business context and growth goals, I would prioritise three opportunities:</p>
                <div className="space-y-2">
                  {[
                    ['01', 'Re-engage existing customers'],
                    ['02', 'Build awareness around your strongest offer'],
                    ['03', 'Create a focused social campaign'],
                  ].map(([number, label]) => (
                    <div key={number} className="rounded-xl bg-black/20 border border-white/10 p-3 flex items-center gap-3">
                      <span className="text-[10px] font-black text-brand-gold">{number}</span>
                      <span className="text-xs text-white/80">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ml-auto max-w-[70%] rounded-2xl rounded-br-md bg-white/10 border border-white/10 p-4">
                <div className="text-[10px] uppercase tracking-wider text-white/35 font-bold mb-2">You</div>
                <p className="text-sm text-white/90">Build the campaign.</p>
              </div>

              <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-purple-500/10 border border-purple-300/20 p-4">
                <div className="text-[10px] uppercase tracking-wider text-purple-200 font-bold mb-2">Mari</div>
                <p className="text-sm text-white/80 leading-relaxed">I’ll prepare the campaign direction and content plan for review before anything moves into execution.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-24 px-6 lg:px-12 bg-[#07101f] border-b border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 text-brand-gold text-xs font-bold uppercase tracking-[0.18em] mb-4">
              <Sparkles size={14} /> What Mari helps you do
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">Intelligence that belongs inside the operating system.</h2>
            <p className="text-white/60 leading-relaxed">Mari is useful because she sits close to the business context and the Ralion workflows where real work happens.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilityCards.map(({ icon: Icon, title, description }, index) => (
              <div
                key={title}
                className={`rounded-3xl border p-6 transition-all hover:-translate-y-1 ${
                  index === capabilityCards.length - 1
                    ? 'md:col-span-2 lg:col-span-1 border-brand-gold/20 bg-brand-gold/[0.04]'
                    : 'border-white/10 bg-white/[0.035] hover:border-purple-300/25'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 border border-purple-300/15 flex items-center justify-center mb-5">
                  <Icon size={21} className="text-purple-200" />
                </div>
                <h3 className="text-lg font-bold mb-2">{title}</h3>
                <p className="text-white/55 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PUBLIC MARI PRODUCT GUIDE */}
      <section className="py-24 px-6 lg:px-12 bg-gradient-to-b from-[#091425] to-[#07101f] border-b border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-300/20 text-emerald-200 text-[10px] font-bold uppercase tracking-[0.18em] mb-5">
                <LockKeyhole size={13} /> Public product guide
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">Ask Mari about Ralion.</h2>
              <p className="text-white/60 leading-relaxed mb-6">
                This public preview is intentionally restricted to Ralion product information. It has no access to customer tenants, private business data or authenticated Ralion tools.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-xs text-white/55 leading-relaxed">
                <div className="flex items-center gap-2 text-white/80 font-bold mb-2"><ShieldCheck size={15} className="text-emerald-300" /> Safe by design</div>
                Public product context only • no tenant access • no customer records • no private workspace tools
              </div>
            </div>

            <div className="lg:col-span-7 rounded-[2rem] border border-white/10 bg-[#0c1728] shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/15 flex items-center justify-center"><Bot size={18} className="text-purple-200" /></div>
                  <div>
                    <div className="text-sm font-bold">Mari • Ralion Guide</div>
                    <div className="text-[10px] text-white/35">Product information preview</div>
                  </div>
                </div>
                <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Restricted</div>
              </div>

              <div className="p-5 md:p-6">
                <div className="flex flex-wrap gap-2 mb-5">
                  {publicQuestions.map((item) => (
                    <button
                      type="button"
                      key={item}
                      onClick={() => selectQuestion(item)}
                      className="px-3 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-white/65 hover:text-white transition-colors"
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="space-y-4 min-h-[240px]">
                  <div className="ml-auto max-w-[88%] rounded-2xl rounded-br-md bg-white/10 border border-white/10 p-4">
                    <div className="text-[10px] text-white/35 font-bold uppercase tracking-wider mb-1.5">You</div>
                    <p className="text-sm text-white/85">{submittedQuestion}</p>
                  </div>
                  <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-purple-500/10 border border-purple-300/20 p-4">
                    <div className="text-[10px] text-purple-200 font-bold uppercase tracking-wider mb-1.5">Mari</div>
                    <p className="text-sm text-white/75 leading-relaxed">{publicAnswer}</p>
                  </div>
                </div>

                <form onSubmit={submitQuestion} className="mt-5 flex gap-2">
                  <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask about Ralion…"
                    className="flex-1 min-w-0 rounded-xl bg-black/20 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-300/35"
                  />
                  <button
                    type="submit"
                    aria-label="Ask Mari"
                    className="w-12 h-12 rounded-xl bg-purple-500 hover:bg-purple-400 text-white flex items-center justify-center transition-colors shrink-0"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST + CTA */}
      <section className="py-24 px-6 lg:px-12 bg-[#07101f]">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-[2rem] border border-white/10 bg-gradient-to-br from-purple-500/10 via-white/[0.025] to-brand-gold/[0.05] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/15 blur-[120px] rounded-full"></div>
            <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-8">
                <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-[0.16em] mb-4">
                  <ShieldCheck size={15} /> Permission-bounded by design
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-5">Ralion is the operating system. Mari is the intelligence inside it.</h2>
                <p className="text-white/60 leading-relaxed max-w-3xl">
                  Mari is designed to respect organization boundaries and use only the business context and tools available to the workspace she is serving. The product story is simple: Ralion connects the work; Mari helps you understand it and decide what to do next.
                </p>
              </div>
              <div className="lg:col-span-4 flex lg:justify-end">
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 w-full lg:max-w-[260px]">
                  <a
                    href="/ralion/register"
                    className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-sm text-center hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                  >
                    Get Started <ArrowRight size={16} />
                  </a>
                  <Link
                    to="/pricing"
                    className="w-full px-6 py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-sm text-center transition-all"
                  >
                    View Pricing
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default RalionMariAIProduct;
