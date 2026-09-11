import React from 'react';
import SEO from '../components/common/SEO';
import { Scale, ShieldCheck, FileText, CheckCircle2, AlertCircle, Mail, Globe, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  const lastUpdated = 'August 12, 2026';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pt-32 pb-24">
      <SEO
        title="Terms of Service | Ras Ali Labs"
        description="Terms of Service and Master Subscription Agreement for Ras Ali Labs products, Ralion Business Operating System, and Mari AI platform under the laws of the Republic of Botswana."
        canonical="https://rasalilabs.com/terms"
      />

      {/* Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/assets/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      <div className="max-w-5xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-500/30 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Scale className="w-4 h-4" />
            <span>Governed by the Laws of the Republic of Botswana</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-6">
            Terms of{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400">
              Service
            </span>
          </h1>

          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl">
            These Terms of Service (&ldquo;Agreement&rdquo;) constitute a legally binding agreement between Ras Ali Labs (Pty) Ltd and the client organization or user accessing our software solutions.
          </p>

          <div className="mt-4 text-xs text-zinc-500 font-mono">
            Last Updated: {lastUpdated} • Version 3.4-BW
          </div>
        </div>

        {/* Content Clauses */}
        <div className="space-y-8 text-xs md:text-sm text-zinc-300 leading-relaxed">
          
          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <span>1. Acceptance of Terms & Eligibility</span>
            </h2>
            <p>
              By accessing, downloading, registering for, or using the <strong>Ralion Platform</strong>, <strong>Mari AI Workspace</strong>, or any services provided by <strong>Ras Ali Labs (Pty) Ltd</strong>, you confirm that you have read, understood, and agreed to be bound by these Terms of Service, our <Link to="/privacy" className="text-blue-400 underline">Privacy Policy</Link>, and our <Link to="/data-protection" className="text-blue-400 underline">Data Protection & Privacy Standards</Link>.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span>2. Software Licensing & Desktop Deployment</span>
            </h2>
            <p>
              Ras Ali Labs grants you a non-exclusive, non-transferable, revocable license to install and run the Ralion Desktop application and access the Cloud SaaS workspace strictly for your internal business operations. You agree not to reverse engineer, decompile, or redistribute the software without written authorization.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-400" />
              <span>3. Botswana Communications & Regulatory Alignment</span>
            </h2>
            <p>
              All electronic messaging, automated marketing broadcasts, data transmissions, and communications conducted via Ralion Growth, SMS gateways, and WhatsApp Business API must strictly comply with:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-zinc-400">
              <li>Botswana Communications Regulatory Authority (BOCRA) anti-spam and telecommunications regulations.</li>
              <li>Botswana Data Protection Act (Act No. 32 of 2018).</li>
              <li>Electronic Communications and Transactions (ECT) Act of Botswana.</li>
            </ul>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>4. AI Services & Acceptable Use</span>
            </h2>
            <p>
              When utilizing Mari AI, you acknowledge that AI-generated summaries, financial projections, and draft communications are intended for assistive decision support and should be reviewed by qualified personnel prior to executing binding legal or financial transactions.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-400" />
              <span>5. Governing Law & Dispute Resolution</span>
            </h2>
            <p>
              This Agreement shall be governed by and construed in accordance with the substantive laws of the <strong>Republic of Botswana</strong>. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the courts of Botswana, in Gaborone.
            </p>
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400">
              <strong>Ras Ali Labs (Pty) Ltd</strong> • Plot 21475, Gaborone, Botswana • <a href="mailto:legal@rasalilabs.com" className="text-blue-400 hover:underline">legal@rasalilabs.com</a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default TermsOfService;
