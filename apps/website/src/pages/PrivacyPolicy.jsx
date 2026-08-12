import React, { useState } from 'react';
import SEO from '../components/common/SEO';
import { 
  ShieldCheck, Lock, Eye, FileText, Server, Globe, Cpu, CheckCircle2, 
  AlertCircle, ChevronRight, HelpCircle, Mail, MapPin, Scale, RefreshCw, Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  const [activeSection, setActiveSection] = useState('overview');

  const lastUpdated = 'August 12, 2026';
  const effectiveDate = 'January 1, 2026';

  const sections = [
    { id: 'overview', title: '1. Regulatory Scope & BOCRA Alignment', icon: Scale },
    { id: 'dpa-principles', title: '2. Botswana Data Protection Act (DPA)', icon: ShieldCheck },
    { id: 'data-collected', title: '3. Information We Collect', icon: FileText },
    { id: 'lawful-basis', title: '4. Lawful Basis for Processing', icon: CheckCircle2 },
    { id: 'ai-privacy', title: '5. Mari AI & Local Intelligence Privacy', icon: Cpu },
    { id: 'social-integrations', title: '6. Social Media & Third-Party APIs', icon: Globe },
    { id: 'security-encryption', title: '7. Data Security & Storage Architecture', icon: Lock },
    { id: 'data-rights', title: '8. Data Subject Rights (DPA Rights)', icon: Eye },
    { id: 'cross-border', title: '9. Cross-Border SADC Data Transfers', icon: Server },
    { id: 'breach-notification', title: '10. Incident & Breach Response', icon: AlertCircle },
    { id: 'contact-dpo', title: '11. Data Protection Officer & BOCRA Inquiries', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pt-32 pb-24">
      <SEO
        title="Privacy Policy & BOCRA Data Protection | Ras Ali Labs"
        description="Official Privacy Policy and Data Protection declaration of Ras Ali Labs and Ralion Enterprise OS, fully compliant with the Botswana Data Protection Act (Act No. 32 of 2018) and BOCRA regulations."
        url="/privacy"
      />

      {/* Ambient background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -right-[150px] w-[500px] h-[500px] bg-purple-600/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/assets/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Header Badge & Hero */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <ShieldCheck className="w-4 h-4" />
            <span>BOCRA & Botswana DPA (Act 32 of 2018) Compliant</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
            Privacy Policy &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
              Data Protection
            </span>
          </h1>

          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Ras Ali Labs (Pty) Ltd operates with strict adherence to the laws of Botswana, international privacy conventions, and guidelines issued by the Botswana Communications Regulatory Authority (BOCRA).
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-zinc-500 font-mono">
            <span>Effective Date: {effectiveDate}</span>
            <span>•</span>
            <span>Last Updated: {lastUpdated}</span>
            <span>•</span>
            <span>Version: 3.4-BW</span>
          </div>
        </div>

        {/* Quick Summary Highlights Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
              <Scale className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Botswana DPA Certified</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full alignment with the Botswana Data Protection Act (Act No. 32 of 2018) and the Office of the Information Commissioner.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">Local AI Zero-Data Retention</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Ralion Local AI Engine runs on-premises and on-device via Ollama models. Your proprietary corporate records never leave your machine.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white mb-1">BOCRA Telecom Standards</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              End-to-end encryption (TLS 1.3 in transit, AES-256 at rest) compliant with BOCRA electronic communications and cyber safety directives.
            </p>
          </div>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Sticky Navigation Sidebar */}
          <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-2 bg-zinc-900/70 border border-zinc-800 p-4 rounded-2xl backdrop-blur-xl">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 px-3 py-2">
              Policy Table of Contents
            </div>
            <nav className="flex flex-col gap-1">
              {sections.map((sec) => {
                const Icon = sec.icon;
                const isActive = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => {
                      setActiveSection(sec.id);
                      const el = document.getElementById(sec.id);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{sec.title}</span>
                    </span>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform ${isActive ? 'rotate-90 text-white' : 'opacity-40'}`} />
                  </button>
                );
              })}
            </nav>

            <div className="pt-4 mt-4 border-t border-zinc-800/80 px-3">
              <Link
                to="/data-protection"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-blue-500/40 text-xs font-bold text-blue-400 hover:text-blue-300 transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>BOCRA Compliance Center</span>
              </Link>
            </div>
          </div>

          {/* Policy Text Clauses */}
          <div className="lg:col-span-8 space-y-12 text-zinc-300 text-xs md:text-sm leading-relaxed">
            
            {/* 1. Regulatory Scope */}
            <section id="overview" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Scale className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">1. Regulatory Scope & BOCRA Alignment</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  This Privacy Policy governs the processing of personal data, corporate telemetry, and electronic communications by <strong>Ras Ali Labs (Pty) Ltd</strong> (&ldquo;Ras Ali Labs&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;), registered under the Companies Act of the Republic of Botswana (Registration: BW00002821092), with corporate offices in Gaborone, Botswana.
                </p>
                <p>
                  Our services—including the <strong>Ralion Enterprise Operating System</strong>, <strong>Mari AI Workspace</strong>, <strong>Ralion Growth Intelligence</strong>, and sector modules (Ralion Health, Funeral, Logistics, and Trade)—are engineered to strictly comply with:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-zinc-300">
                  <li><strong>Botswana Communications Regulatory Authority (BOCRA)</strong> ICT licensing directives, Communications Regulations (2012), and Cybersecurity Guidelines.</li>
                  <li><strong>Botswana Data Protection Act (Act No. 32 of 2018)</strong>, establishing the statutory rights of Data Subjects and duties of Data Controllers.</li>
                  <li><strong>Electronic Communications and Transactions (ECT) Act of Botswana</strong>, safeguarding digital signatures, commercial contracts, and evidentiary data integrity.</li>
                  <li><strong>SADC Model Law on Data Protection</strong> and cross-border regional harmonization protocols.</li>
                </ul>
              </div>
            </section>

            {/* 2. Botswana DPA Principles */}
            <section id="dpa-principles" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">2. Core Principles of the Botswana DPA (Act 32 of 2018)</h2>
              </div>
              <div className="space-y-4 text-zinc-300">
                <p>
                  In accordance with Part II of the Botswana Data Protection Act, Ras Ali Labs adheres to the fundamental data protection principles:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Lawfulness & Fairness</h4>
                    <p className="text-[11px] text-zinc-400">Processed solely with legitimate justification, transparent notices, and unequivocal user consent.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Purpose Limitation</h4>
                    <p className="text-[11px] text-zinc-400">Collected for specified, explicit, and legitimate commercial purposes and not further processed incompatibly.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Data Minimization</h4>
                    <p className="text-[11px] text-zinc-400">Adequate, relevant, and strictly limited to what is necessary in relation to operating our Enterprise OS.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Accuracy & Rectification</h4>
                    <p className="text-[11px] text-zinc-400">Every reasonable step is taken to ensure inaccurate personal data is erased or rectified without delay.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Storage Limitation</h4>
                    <p className="text-[11px] text-zinc-400">Kept in identifiable form no longer than necessary for the fulfillment of designated business operations.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                    <h4 className="font-bold text-white text-xs mb-1">Integrity & Confidentiality</h4>
                    <p className="text-[11px] text-zinc-400">Secured against unauthorized or unlawful processing, accidental loss, destruction, or damage using AES-256 encryption.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* 3. Information We Collect */}
            <section id="data-collected" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">3. Information We Collect</h2>
              </div>
              <div className="space-y-4 text-zinc-300">
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">A. User & Identity Data</h4>
                  <p className="text-zinc-400 text-xs">
                    Full names, enterprise email addresses, encrypted passwords, authentication tokens, job roles, and profile avatars stored securely in our Supabase instance.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">B. Enterprise Business & CRM Records</h4>
                  <p className="text-zinc-400 text-xs">
                    Client contact profiles, invoicing details, deals pipelines, task assignments, appointment calendars, and industry vertical records (e.g., funeral intake logs, health records, trade shipments).
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">C. Social Media OAuth Tokens</h4>
                  <p className="text-zinc-400 text-xs">
                    Authorized OAuth 2.0 access and refresh tokens for Meta (Facebook & Instagram), LinkedIn, Google, X (Twitter), TikTok, and WhatsApp Business API. We collect only designated scopes required to publish scheduled posts and read analytics.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs uppercase tracking-wider mb-2">D. Hardware & Telemetry Data</h4>
                  <p className="text-zinc-400 text-xs">
                    Hardware machine serial hashes (for desktop licensing binding), operating system versions, offline grace period tokens, and error diagnostic traces.
                  </p>
                </div>
              </div>
            </section>

            {/* 4. Lawful Basis */}
            <section id="lawful-basis" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">4. Lawful Basis for Processing</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  Under Section 14 of the Botswana DPA, we process your information under the following statutory justifications:
                </p>
                <ul className="space-y-2 text-xs">
                  <li className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                    <strong className="text-white shrink-0">1. Contractual Necessity:</strong>
                    <span className="text-zinc-400">To provision, license, and maintain your Ralion Business OS workspace and fulfill subscription terms.</span>
                  </li>
                  <li className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                    <strong className="text-white shrink-0">2. Explicit Consent:</strong>
                    <span className="text-zinc-400">Granted when linking social media accounts via OAuth or opting into AI cloud model fallbacks.</span>
                  </li>
                  <li className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                    <strong className="text-white shrink-0">3. Legal Obligation:</strong>
                    <span className="text-zinc-400">To comply with Botswana statutory tax, commercial recordkeeping, and BOCRA reporting requirements.</span>
                  </li>
                  <li className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2">
                    <strong className="text-white shrink-0">4. Legitimate Interests:</strong>
                    <span className="text-zinc-400">To detect security threats, prevent unauthorized software piracy, and guarantee uninterrupted platform stability.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* 5. Mari AI Privacy */}
            <section id="ai-privacy" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Cpu className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">5. Mari AI & Local Intelligence Privacy Architecture</h2>
              </div>
              <div className="space-y-4 text-zinc-300">
                <p>
                  Ras Ali Labs pioneers an <strong>Offline-First, Privacy-Centric Artificial Intelligence Architecture</strong>:
                </p>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/40 to-purple-950/40 border border-blue-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>On-Device Local AI Runtime (Ollama Engine)</span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    When operating in <strong>Offline Mode</strong> on Ralion Desktop, Mari AI runs completely inside your local RAM and GPU. Internal documents, CRM notes, and financial reports indexed into the local RAG Memory Vector Database <strong>are never transmitted to external cloud servers</strong>.
                  </p>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    Zero third-party telemetry • Zero model training on enterprise customer data • AES-256 local database encryption.
                  </p>
                </div>
                <p className="text-xs text-zinc-400">
                  If you opt into <strong>Hybrid Cloud Mode</strong>, prompts are routed through enterprise encrypted API gateways (Google Gemini Flash, Anthropic Claude, OpenAI) with zero data-retention SLAs, and are never used to train public foundational models.
                </p>
              </div>
            </section>

            {/* 6. Social Media & Integrations */}
            <section id="social-integrations" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                  <Globe className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">6. Social Media & Third-Party API Integrations</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  When connecting social platforms (Meta, LinkedIn, Google, X, TikTok, WhatsApp API) to Ralion Growth:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-zinc-400">
                  <li>We request only minimal essential scopes (e.g., <code className="text-blue-300">public_profile, email</code> and authorized publishing scopes).</li>
                  <li>Tokens are stored in Supabase with strict <strong>Row Level Security (RLS)</strong>, accessible only to your authenticated user ID.</li>
                  <li>We never sell, rent, or transfer your social credentials or audience engagement data to third-party data brokers.</li>
                  <li>You may disconnect and revoke token access at any time directly in the Ralion Growth Accounts tab.</li>
                </ul>
              </div>
            </section>

            {/* 7. Security Architecture */}
            <section id="security-encryption" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                  <Lock className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">7. Security Architecture & Encryption</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  In compliance with BOCRA Cybersecurity directives and Section 22 of the Botswana DPA:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <strong className="text-white block mb-1">Data in Transit:</strong>
                    <span className="text-zinc-400">Enforced Transport Layer Security (TLS 1.3) with perfect forward secrecy and HSTS headers.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <strong className="text-white block mb-1">Data at Rest:</strong>
                    <span className="text-zinc-400">AES-256 bit military-grade database encryption for cloud databases and desktop SQLite caches.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <strong className="text-white block mb-1">Access Control:</strong>
                    <span className="text-zinc-400">Role-Based Access Control (RBAC), multi-tenant isolation, and JWT session verification.</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                    <strong className="text-white block mb-1">Vulnerability Auditing:</strong>
                    <span className="text-zinc-400">Continuous automated code scanning, dependency audits, and regular penetration testing.</span>
                  </div>
                </div>
              </div>
            </section>

            {/* 8. Data Subject Rights */}
            <section id="data-rights" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Eye className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">8. Your Statutory Rights as a Data Subject</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  Under the Botswana Data Protection Act (Part V), all individuals whose data is processed by Ras Ali Labs possess irrevocable rights:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white">Right of Access (Section 19):</span> Obtain confirmation and full copies of your processed personal records.
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white">Right to Rectification (Section 20):</span> Request immediate correction of inaccurate or incomplete corporate/personal information.
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white">Right to Erasure / Deletion (Section 21):</span> Request permanent deletion of records when purpose of processing has lapsed.
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white">Right to Object & Restrict:</span> Object at any time to direct marketing, automated profiling, or algorithmic decision-making.
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <span className="font-bold text-white">Right to Data Portability:</span> Export structured, machine-readable JSON/CSV archives of your organization data.
                  </div>
                </div>
                <p className="text-xs text-zinc-400 pt-2">
                  To exercise any of these rights, visit our <Link to="/data-protection" className="text-blue-400 underline font-semibold">Data Protection Request Portal</Link> or email our DPO at <a href="mailto:privacy@rasalilabs.com" className="text-blue-400 underline">privacy@rasalilabs.com</a>. We respond within statutory timelines (maximum 30 days).
                </p>
              </div>
            </section>

            {/* 9. Cross-Border SADC Transfers */}
            <section id="cross-border" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">9. Cross-Border SADC Data Transfers</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  In compliance with Part VI (Section 25) of the Botswana DPA, transfer of personal data outside Botswana to regional SADC member states or international cloud infrastructure is executed solely where:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-zinc-400">
                  <li>The recipient country ensures an <strong>adequate level of protection</strong> comparable to Botswana DPA and BOCRA regulations.</li>
                  <li>Appropriate safeguards (such as Standard Contractual Clauses and Data Processing Agreements) are formally executed.</li>
                  <li>The Data Subject has given informed consent, or the transfer is strictly required to fulfill cross-border trade/logistics contracts.</li>
                </ul>
              </div>
            </section>

            {/* 10. Incident & Breach Response */}
            <section id="breach-notification" className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">10. Security Incident & Breach Notification (72-Hour Protocol)</h2>
              </div>
              <div className="space-y-3 text-zinc-300">
                <p>
                  In the unlikely event of a security compromise impacting personal data:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 text-xs text-zinc-400">
                  <li>Ras Ali Labs will notify the <strong>Information Commissioner / BOCRA within 72 hours</strong> of becoming aware of the breach.</li>
                  <li>Affected corporate account holders and Data Subjects will be notified without undue delay with remediation recommendations and incident technical disclosures.</li>
                </ul>
              </div>
            </section>

            {/* 11. Contact DPO */}
            <section id="contact-dpo" className="p-8 rounded-3xl bg-gradient-to-r from-blue-950/40 via-zinc-900 to-purple-950/40 border border-blue-500/30 scroll-mt-28">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Mail className="w-4 h-4" />
                </div>
                <h2 className="text-xl font-bold text-white">11. Data Protection Officer & Regulatory Contact</h2>
              </div>
              <div className="space-y-4 text-zinc-300 text-xs">
                <p>
                  For any questions, compliance verifications, or to exercise your rights under the Botswana Data Protection Act:
                </p>
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="font-bold text-white text-sm">Data Protection Officer (DPO) — Ras Ali Labs</div>
                  <div className="text-zinc-400 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>Email: <a href="mailto:privacy@rasalilabs.com" className="text-blue-400 hover:underline">privacy@rasalilabs.com</a> / <a href="mailto:compliance@rasalilabs.com" className="text-blue-400 hover:underline">compliance@rasalilabs.com</a></span>
                  </div>
                  <div className="text-zinc-400 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-purple-400" />
                    <span>Location: Plot 21475, Phakalane Industrial / CBD, Gaborone, Republic of Botswana</span>
                  </div>
                  <div className="text-zinc-400 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span>Web: <a href="https://rasalilabs.com" className="text-emerald-400 hover:underline">https://rasalilabs.com</a></span>
                  </div>
                </div>
                <p className="text-zinc-500 text-[11px]">
                  You also maintain the statutory right to lodge an inquiry or complaint directly with the <strong>Botswana Communications Regulatory Authority (BOCRA)</strong> or the <strong>Office of the Information Commissioner</strong> of Botswana.
                </p>
              </div>
            </section>

          </div>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
