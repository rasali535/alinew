import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import SEO from '../components/common/SEO';
import {
  organizationSchema,
  localBusinessSchema,
  makeServiceSchema,
  makeFaqSchema,
  makeBreadcrumbSchema
} from '../lib/seoSchema';
import {
  ShieldCheck,
  Lock,
  Search,
  Server,
  Cloud,
  FileCheck,
  Users,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Send,
  Loader2,
  RefreshCw,
  Building,
  ExternalLink,
  Info,
  Layers,
  Sparkles
} from 'lucide-react';
import { companyInfo } from '../data/mock';

const securityFaqs = [
  {
    question: 'What cybersecurity services does Ras Ali Labs offer in Botswana?',
    answer: 'Ras Ali Labs provides vulnerability assessments, web application and API security reviews, cloud and infrastructure configuration audits, cybersecurity risk assessments, security awareness training, and pragmatic security consulting for businesses in Gaborone and across Botswana.'
  },
  {
    question: 'How do you distinguish between direct services and partner-delivered services?',
    answer: 'Ras Ali Labs directly delivers security consulting, risk assessments, web and API code reviews, cloud configuration audits, and workforce training. For specialist penetration testing, deep vulnerability exploitation, and specialized operational arrangements, we collaborate with approved cybersecurity partners under structured bilateral agreements.'
  },
  {
    question: 'Do you offer 24/7 SOC operations or guaranteed threat prevention?',
    answer: 'No. Ras Ali Labs does not claim 24/7 security operations center (SOC) monitoring or guaranteed prevention against all cyber threats. We deliver evidence-based vulnerability identification, risk reduction, hardened digital architecture, and actionable remediation roadmaps.'
  },
  {
    question: 'How do security assessments support Botswana Data Protection Act (Act 32) compliance?',
    answer: 'Under the Botswana Data Protection Act, organizations processing personal data must implement appropriate technical and organizational security measures. Our assessments help identify security gaps, evaluate access controls, and provide documentation for data protection compliance.'
  },
  {
    question: 'How can our organization request a cybersecurity consultation or assessment?',
    answer: 'You can submit the assessment enquiry form on this page, email contact@rasalilabs.com, or call our Gaborone office at +267 72 113 009 to discuss your scope and schedule a consultation.'
  }
];

const serviceOfferings = [
  {
    id: 'vuln-pen-test',
    title: 'Vulnerability Assessments & Penetration Testing',
    deliveryType: 'Partner & Direct Collaboration',
    deliveryNote: 'Delivered in collaboration with approved specialist cybersecurity partners.',
    description: 'Methodical identification and evaluation of security vulnerabilities across public-facing systems, networks, and applications to uncover potential exploit paths before adversaries do.',
    capabilities: [
      'External and internal vulnerability scanning',
      'Controlled penetration testing scoping and execution',
      'Prioritized vulnerability scoring (CVSS)',
      'Actionable remediation reports and re-test verification'
    ],
    icon: Search
  },
  {
    id: 'web-api-security',
    title: 'Web Application & API Security Assessments',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Directly delivered by Ras Ali Labs engineering and security specialists.',
    description: 'In-depth security evaluation of web applications and REST APIs against the OWASP Top 10, assessing authentication, authorization, session handling, business logic, and data exposure.',
    capabilities: [
      'OWASP Top 10 vulnerability identification',
      'API authentication and token authorization testing',
      'Input validation, SQL injection, and XSS analysis',
      'Secure code and architectural review'
    ],
    icon: Lock
  },
  {
    id: 'network-infrastructure',
    title: 'Network & Infrastructure Security',
    deliveryType: 'Direct & Partner Supported',
    deliveryNote: 'Direct architecture evaluation supported by specialist partner tooling.',
    description: 'Audits of network perimeter defenses, firewalls, routers, exposed services, and network segmentation to reduce attack surfaces across on-premise and hybrid environments.',
    capabilities: [
      'Perimeter firewall and port exposure analysis',
      'Network segmentation and VLAN segregation review',
      'Remote access and VPN configuration audits',
      'Internal lateral movement risk analysis'
    ],
    icon: Server
  },
  {
    id: 'cloud-security',
    title: 'Cloud Security & Configuration Reviews',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Directly delivered across AWS, Azure, Google Cloud, Supabase, and Cloudflare.',
    description: 'Configuration reviews of cloud environments to detect misconfigurations, overly permissive IAM roles, exposed storage buckets, and unencrypted transmission pathways.',
    capabilities: [
      'Cloud IAM least-privilege role reviews',
      'Storage bucket and database exposure auditing',
      'Cloudflare and WAF security configuration review',
      'Container, serverless, and CI/CD pipeline posture'
    ],
    icon: Cloud
  },
  {
    id: 'risk-assessments',
    title: 'Cybersecurity Risk Assessments',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Direct business risk profiling aligned with Botswana regulatory context.',
    description: 'Holistic evaluation of organizational digital assets, threat exposure, operational vulnerabilities, and alignment with corporate governance standards and regulatory requirements.',
    capabilities: [
      'Digital asset inventory and critical data mapping',
      'Threat modeling and risk prioritization matrix',
      'Botswana Data Protection Act (Act 32) gap identification',
      'Executive risk summaries with actionable recommendations'
    ],
    icon: FileCheck
  },
  {
    id: 'awareness-training',
    title: 'Security Awareness & Staff Training',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Direct interactive workshops and practical training sessions.',
    description: 'Equipping team members with practical understanding to recognize phishing campaigns, practice safe credential hygiene, handle sensitive business data securely, and report incidents.',
    capabilities: [
      'Phishing simulation education and recognition tactics',
      'Password management and multi-factor authentication (MFA)',
      'Social engineering defense and verification protocols',
      'Safe remote work and device security best practices'
    ],
    icon: Users
  },
  {
    id: 'incident-readiness',
    title: 'Incident Response Readiness',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Direct preparedness planning and escalation playbook development.',
    description: 'Structured readiness preparation, response playbooks, escalation matrices, and containment strategies to ensure your team can react swiftly and decisively if an incident occurs.',
    capabilities: [
      'Incident classification and triage playbooks',
      'Internal and external communication protocols',
      'System containment and evidence preservation guidelines',
      'Post-incident review and continuous improvement frameworks'
    ],
    icon: AlertTriangle
  },
  {
    id: 'consulting-remediation',
    title: 'Security Consulting & Remediation Guidance',
    deliveryType: 'Directly Delivered by Ras Ali Labs',
    deliveryNote: 'Direct technical advisory and remediation implementation support.',
    description: 'Strategic advisory and hands-on remediation guidance to help your technical and management teams prioritize fixes, design defense-in-depth, and verify vulnerability closure.',
    capabilities: [
      'Remediation roadmap design and prioritization',
      'Secure system architecture advisory',
      'Third-party software vendor security evaluation',
      'Periodic security hygiene checkups'
    ],
    icon: ShieldCheck
  },
  {
    id: 'managed-security',
    title: 'Managed Security Services',
    deliveryType: 'Subject to Confirmed Delivery Arrangements',
    deliveryNote: 'Available subject to confirmed client scope and partner delivery arrangements.',
    description: 'Coordinated security advisory, periodic vulnerability reviews, and ongoing threat assessment arrangements delivered in alignment with confirmed client requirements and verified partner capability.',
    capabilities: [
      'Scheduled recurring vulnerability scans and assessments',
      'Quarterly security reviews and posture checkups',
      'Escalation coordination with specialist partner teams',
      'Ongoing advisory on emerging regional threat vectors'
    ],
    icon: Layers
  }
];

const CybersecurityService = () => {
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    requestedService: 'Vulnerability Assessments & Penetration Testing',
    targetEnvironment: 'Web Applications & APIs',
    requirements: '',
    _hp_security: '' // Anti-spam honeypot
  });

  const [formStatus, setFormStatus] = useState('idle'); // idle | loading | success | error
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const scrollToEnquiry = (serviceName = '') => {
    if (serviceName) {
      setFormData((prev) => ({ ...prev, requestedService: serviceName }));
    }
    const el = document.getElementById('assessment-enquiry');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Spam honeypot check
    if (formData._hp_security) {
      setFormStatus('success');
      return;
    }

    setFormStatus('loading');
    setErrorMessage('');

    try {
      const payload = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        service: `Cybersecurity: ${formData.requestedService}`,
        subject: `Cybersecurity Assessment Enquiry: ${formData.company || formData.name}`,
        message: `Company: ${formData.company || 'Not Specified'}\nRequested Service: ${formData.requestedService}\nTarget Environment: ${formData.targetEnvironment}\n\nProject Scope & Requirements:\n${formData.requirements}`
      };

      const response = await axios.post('/send_mail.php', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (response && response.data && (response.data.success === true || response.data.status === 'success')) {
        setFormStatus('success');
        setFormData({
          name: '',
          company: '',
          email: '',
          phone: '',
          requestedService: 'Vulnerability Assessments & Penetration Testing',
          targetEnvironment: 'Web Applications & APIs',
          requirements: '',
          _hp_security: ''
        });
      } else {
        const msg = response?.data?.message || 'Server did not acknowledge enquiry.';
        setErrorMessage(msg);
        setFormStatus('error');
      }
    } catch (err) {
      console.error('Error submitting security enquiry:', err);
      const failureMsg =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'Request timed out after 10 seconds.' : err.message) ||
        'Unable to send enquiry at this time.';
      setErrorMessage(`${failureMsg} Please contact us directly at ${companyInfo.email} or ${companyInfo.phone}.`);
      setFormStatus('error');
    }
  };

  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Cybersecurity Services Botswana | Digital Protection | Ras Ali Labs"
        description="Cybersecurity assessments, vulnerability testing, cloud security reviews and digital protection for businesses in Gaborone, Botswana by Ras Ali Labs."
        keywords="Cybersecurity services Botswana, Cybersecurity company Gaborone, Penetration testing Botswana, Network security Botswana, Cybersecurity assessments Botswana, Business cybersecurity consulting Botswana"
        canonical="https://rasalilabs.com/services/cybersecurity"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema,
            localBusinessSchema,
            makeServiceSchema({
              name: 'Cybersecurity & Digital Protection in Botswana',
              description: 'Vulnerability assessments, web application testing, cloud security, and cybersecurity consulting in Gaborone, Botswana.',
              url: '/services/cybersecurity',
              serviceType: 'Cybersecurity Consulting and Digital Protection',
              image: '/assets/images/service-security.png'
            }),
            makeFaqSchema(securityFaqs),
            makeBreadcrumbSchema([
              { name: 'Home', url: '/' },
              { name: 'Services', url: '/services' },
              { name: 'Cybersecurity', url: '/services/cybersecurity' }
            ])
          ]
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8 font-mono">
          <Link to="/" className="hover:text-brand-gold transition-colors">Home</Link>
          <span>/</span>
          <Link to="/services" className="hover:text-brand-gold transition-colors">Services</Link>
          <span>/</span>
          <span className="text-brand-gold font-semibold">Cybersecurity</span>
        </div>

        {/* HERO SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-emerald-400" /> Cybersecurity & Digital Protection
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Protect Your Business. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-brand-gold">
                Secure Your Future.
              </span>
            </h1>

            <p className="text-white/80 text-lg leading-relaxed max-w-2xl">
              From security assessments to infrastructure protection, Ras Ali Labs helps businesses understand cyber risks, strengthen their digital environments and build resilience against evolving threats.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => scrollToEnquiry('Vulnerability Assessments & Penetration Testing')}
                className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                Request a Security Assessment <ArrowRight size={14} />
              </button>

              <button
                onClick={() => scrollToEnquiry('Cybersecurity Risk Assessments')}
                className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2"
              >
                Speak to a Cybersecurity Consultant
              </button>

              <Link
                to="/partners"
                className="px-5 py-3.5 rounded-xl text-white/70 hover:text-brand-gold text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                Our Technology Partners <ExternalLink size={12} />
              </Link>
            </div>

            {/* Botswana Context & Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="flex items-center gap-2 text-white/75">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Gaborone, Botswana Based</span>
              </div>
              <div className="flex items-center gap-2 text-white/75">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Botswana DPA (Act 32) Aligned</span>
              </div>
              <div className="flex items-center gap-2 text-white/75">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span>Vetted Specialist Delivery</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Card */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl overflow-hidden bg-[#181818] border border-white/15 shadow-2xl p-6 group">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-black/60 relative mb-5">
                <img
                  src="/assets/images/service-security.png"
                  alt="Cybersecurity and Digital Protection by Ras Ali Labs"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                  onError={(e) => {
                    e.target.src = '/assets/images/service-dev.png';
                  }}
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[10px] font-bold text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  DEFENSIVE ARCHITECTURE
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-brand-gold font-bold uppercase tracking-wider">Security Discipline</span>
                  <span className="text-white/50 font-mono">Gaborone, BW</span>
                </div>
                <h3 className="text-xl font-bold text-white">Pragmatic Digital Resilience</h3>
                <p className="text-white/65 text-xs leading-relaxed">
                  Clear vulnerability insights, prioritized risk remediation, and hardened web, cloud, and corporate architectures designed for Southern African enterprises.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* GOVERNANCE & DELIVERY BOUNDARIES (CRITICAL TRANSPARENCY) */}
        <div className="mb-20 bg-gradient-to-r from-[#181818] via-[#1f1a14] to-[#181818] border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase">
                <Info size={13} /> Clear Delivery Model
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white">
                How We Deliver Cybersecurity Services
              </h2>
              <p className="text-white/75 text-sm leading-relaxed">
                Ras Ali Labs believes in complete transparency regarding technical scope and operational delivery. We clearly distinguish between services delivered directly by our internal engineering team and specialist services delivered through approved cybersecurity partners.
              </p>
            </div>

            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-black/40 border border-emerald-500/20">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Delivered Directly by Ras Ali Labs
                </div>
                <ul className="text-xs text-white/70 space-y-2">
                  <li>• Cybersecurity Risk Assessments & Threat Modeling</li>
                  <li>• Web Application & API Code & Config Audits</li>
                  <li>• Cloud Security & Configuration Audits</li>
                  <li>• Security Awareness & Staff Training</li>
                  <li>• Remediation Roadmap & Architecture Advisory</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-blue-500/20">
                <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building size={14} /> Delivered Through Specialist Partners
                </div>
                <ul className="text-xs text-white/70 space-y-2">
                  <li>• Specialist Penetration Testing & Red Teaming</li>
                  <li>• Advanced Network Exploitation Testing</li>
                  <li>• Deep Binary & Firmware Vulnerability Testing</li>
                  <li>• Managed Security Services (subject to confirmed delivery arrangements)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Honest Boundaries Disclaimer */}
          <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-3 text-xs text-white/60">
            <Info size={16} className="text-brand-gold shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-white/80">Ethical Standards & Boundaries:</strong> Ras Ali Labs does not claim 24/7 SOC operations, real-time threat monitoring, or guaranteed immunity from attacks. We focus on verifiable vulnerability discovery, risk reduction, secure engineering practices, and practical resilience against real-world risks.
            </p>
          </div>
        </div>

        {/* 9 CORE SERVICE OFFERINGS GRID */}
        <div className="mb-24">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <ShieldCheck size={14} /> Comprehensive Security Disciplines
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
              Cybersecurity Service Offerings
            </h2>
            <p className="text-white/70 text-base md:text-lg leading-relaxed">
              Tailored assessments, defensive evaluations, and consulting services designed to safeguard your organization's reputation and digital assets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {serviceOfferings.map((offering) => {
              const Icon = offering.icon;
              const isPartner = offering.deliveryType.includes('Partner');
              return (
                <div
                  key={offering.id}
                  className="bg-[#181818] border border-white/10 hover:border-emerald-500/40 rounded-3xl p-8 transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon size={24} />
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${
                          isPartner
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {offering.deliveryType}
                      </span>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                      {offering.title}
                    </h3>

                    <p className="text-white/70 text-xs leading-relaxed mb-6">
                      {offering.description}
                    </p>

                    <div className="space-y-2 border-t border-white/10 pt-4 mb-8">
                      {offering.capabilities.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-white/75">
                          <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 space-y-2">
                    <button
                      onClick={() => scrollToEnquiry(offering.title)}
                      className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-emerald-500 hover:text-black font-bold text-xs text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      Inquire on {offering.title.split(' ')[0]} <ArrowRight size={13} />
                    </button>
                    <div className="text-[10px] text-white/40 text-center">
                      {offering.deliveryNote}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* INTERACTIVE ASSESSMENT ENQUIRY WORKFLOW */}
        <div id="assessment-enquiry" className="mb-24 bg-[#181818] border border-white/15 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase">
                <Sparkles size={13} /> Request an Assessment
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
                Get a Cybersecurity Consultation
              </h2>

              <p className="text-white/75 text-sm leading-relaxed">
                Connect with our team in Gaborone to discuss your security posture, schedule a vulnerability assessment, or review compliance with the Botswana Data Protection Act.
              </p>

              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-xs font-bold text-brand-gold mb-1">Confidential & Scoped</div>
                  <p className="text-xs text-white/60">
                    All discussions are held under strict non-disclosure. We define clear authorization, scope, and rules of engagement before any testing commences.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                  <div className="text-xs font-bold text-emerald-400 mb-1">Direct Contact</div>
                  <p className="text-xs text-white/60">
                    Email: <a href="mailto:contact@rasalilabs.com" className="text-white hover:underline">contact@rasalilabs.com</a><br />
                    Phone: <a href="tel:+26772113009" className="text-white hover:underline">+267 72 113 009</a><br />
                    Office: Plot 18680 Khuhurutse Drive, Phase 2, Gaborone
                  </p>
                </div>
              </div>
            </div>

            {/* Form Column */}
            <div className="lg:col-span-7 bg-[#141414] border border-white/10 rounded-2xl p-6 md:p-8">
              {formStatus === 'success' ? (
                <div className="p-8 text-center space-y-4 animate-fadeIn">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Assessment Request Received</h3>
                  <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
                    Thank you for contacting Ras Ali Labs. Our security team will review your requirements and reach out promptly to coordinate next steps under strict confidentiality.
                  </p>
                  <button
                    onClick={() => setFormStatus('idle')}
                    className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                  >
                    Submit Another Request
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  {formStatus === 'error' && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-300">
                      <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold text-red-200 mb-0.5">Submission Notice</strong>
                        <p>{errorMessage}</p>
                      </div>
                    </div>
                  )}

                  {/* Anti-spam honeypot (hidden from users) */}
                  <input
                    type="text"
                    name="_hp_security"
                    value={formData._hp_security}
                    onChange={handleChange}
                    tabIndex="-1"
                    autoComplete="off"
                    className="hidden"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Contact Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Lesego Ditau"
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Company / Organization *
                      </label>
                      <input
                        type="text"
                        name="company"
                        required
                        value={formData.company}
                        onChange={handleChange}
                        placeholder="e.g. Botswana Financial Services Ltd"
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Work Email *
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="name@company.co.bw"
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Phone / WhatsApp (Optional)
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="+267 7X XXX XXX"
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Requested Security Service *
                      </label>
                      <select
                        name="requestedService"
                        value={formData.requestedService}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-gold focus:outline-none transition-colors"
                      >
                        {serviceOfferings.map((s) => (
                          <option key={s.id} value={s.title}>
                            {s.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                        Target Environment
                      </label>
                      <select
                        name="targetEnvironment"
                        value={formData.targetEnvironment}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs focus:border-brand-gold focus:outline-none transition-colors"
                      >
                        <option value="Web Applications & APIs">Web Applications & APIs</option>
                        <option value="Cloud Infrastructure (AWS/GCP/Azure)">Cloud Infrastructure (AWS/GCP/Azure)</option>
                        <option value="Corporate Office & Network">Corporate Office & Network</option>
                        <option value="Full Organization Risk Assessment">Full Organization Risk Assessment</option>
                        <option value="Staff Awareness Training">Staff Awareness Training</option>
                        <option value="Other / Multi-Platform Scope">Other / Multi-Platform Scope</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-1.5">
                      Requirements Description & Scope *
                    </label>
                    <textarea
                      name="requirements"
                      required
                      rows="4"
                      value={formData.requirements}
                      onChange={handleChange}
                      placeholder="Please outline the target environment, estimated timeline, specific concerns, and whether you require testing authorization documentation..."
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors resize-none"
                    ></textarea>
                  </div>

                  {/* Privacy Handling Note */}
                  <div className="text-[11px] text-white/50 leading-relaxed">
                    By submitting this request, you agree that your contact information will be processed confidentially in accordance with the <Link to="/data-protection" className="text-emerald-400 hover:underline">Botswana Data Protection Act (Act 32)</Link> and our <Link to="/privacy" className="text-emerald-400 hover:underline">Privacy Policy</Link>.
                  </div>

                  <button
                    type="submit"
                    disabled={formStatus === 'loading'}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-[1.01] transition-all shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {formStatus === 'loading' ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> Submitting Security Enquiry...
                      </>
                    ) : formStatus === 'error' ? (
                      <>
                        <RefreshCw size={15} /> Retry Submitting Enquiry
                      </>
                    ) : (
                      <>
                        <Send size={15} /> Submit Cybersecurity Enquiry to Ras Ali Labs
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* FREQUENTLY ASKED QUESTIONS */}
        <div className="mb-20">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">Frequently Asked Questions</h2>
            <p className="text-white/60 text-sm">
              Clear answers regarding cybersecurity consulting, testing scopes, and data protection compliance in Botswana.
            </p>
          </div>

          <div className="max-w-4xl mx-auto space-y-4">
            {securityFaqs.map((faq, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-[#181818] border border-white/10 space-y-2">
                <h3 className="text-base font-bold text-white flex items-start gap-2.5">
                  <span className="text-brand-gold font-mono text-sm">Q{idx + 1}.</span>
                  <span>{faq.question}</span>
                </h3>
                <p className="text-white/70 text-xs leading-relaxed pl-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* BOTTOM PARTNER & SERVICE NAVIGATION STRIP */}
        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-2">Explore Our Technology Partnerships</h2>
          <p className="text-white/65 text-xs max-w-xl mx-auto mb-6 leading-relaxed">
            Working with specialist technology providers to deliver practical, dependable solutions for businesses in Botswana and beyond.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/partners"
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all flex items-center gap-2"
            >
              View Our Technology Partners <ArrowRight size={14} />
            </Link>
            <Link
              to="/services"
              className="px-6 py-3 rounded-xl bg-transparent hover:bg-white/5 text-brand-gold text-xs font-semibold transition-colors"
            >
              ← Back to All Services
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CybersecurityService;
