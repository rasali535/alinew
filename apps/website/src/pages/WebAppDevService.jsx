import React from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { organizationSchema, localBusinessSchema, makeServiceSchema, makeFaqSchema, makeBreadcrumbSchema } from '../lib/seoSchema';
import { Code, Smartphone, Globe, Layout, CheckCircle2, ArrowRight } from 'lucide-react';

const webFaqs = [
  {
    question: 'Do you build websites and custom software for businesses in Botswana?',
    answer: 'Yes. Ras Ali Labs is based in Gaborone and builds websites, web applications, customer portals, internal business systems, e-commerce platforms and custom software for organisations in Botswana and the wider region.',
  },
  {
    question: 'Can Ras Ali Labs build a custom business portal or CRM?',
    answer: 'Yes. We design role-based portals, dashboards, workflow systems, customer platforms and API integrations around the way your organisation actually works.',
  },
  {
    question: 'Do you provide web development in Gaborone?',
    answer: 'Yes. Ras Ali Labs provides web and app development from Gaborone, Botswana, with remote collaboration available for organisations elsewhere in Botswana and Southern Africa.',
  },
];

const WebAppDevService = () => {
  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Web Development Botswana & Gaborone | Ras Ali Labs"
        description="Custom web development, software, business portals, mobile apps and e-commerce systems from Ras Ali Labs in Gaborone, Botswana."
        keywords="web development Botswana, web development Gaborone, software company Botswana, custom software development Botswana, web app development Botswana, mobile app development Botswana"
        canonical="https://rasalilabs.com/services/web-app-development"
        structuredData={{
          '@context': 'https://schema.org',
          '@graph': [
            organizationSchema,
            localBusinessSchema,
            makeServiceSchema({
              name: 'Web & App Development in Botswana in Botswana',
              description: 'Custom web development, software platforms, business portals, mobile apps and e-commerce systems from Gaborone, Botswana.',
              url: '/services/web-app-development',
              serviceType: 'Web development and custom software development',
              image: '/assets/images/service-dev.png',
            }),
            makeFaqSchema(webFaqs),
            makeBreadcrumbSchema([
              { name: 'Home', url: '/' },
              { name: 'Services', url: '/services' },
              { name: 'Web & App Development', url: '/services/web-app-development' },
            ]),
          ],
        }}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
            <Code size={14} /> Technology Discipline
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Web & App Development
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            From Gaborone, we build modern websites, mobile applications, business platforms, portals, e-commerce systems and custom software for organisations across Botswana and Southern Africa.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Globe className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Modern Web Applications</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Lightning-fast responsive web apps built with React, Next.js, Vite, and modern cloud architectures, designed for peak performance and visual impact.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> React, Next.js & Modern TypeScript</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Responsive & Fluid UI Systems</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Performance & SEO Optimization</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Smartphone className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Mobile Applications (iOS & Android)</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Native and cross-platform mobile apps engineered for fluid gestures, offline capabilities, secure biometrics, and push notification systems.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Cross-Platform Native Builds</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Offline-First Data Synchronization</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> App Store & Play Store Deployment</li>
            </ul>
          </div>

          <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 hover:border-emerald-400/40 transition-all">
            <Layout className="w-10 h-10 text-emerald-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Custom Platforms & Business Portals</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Bespoke internal dashboards, customer portals, billing gateways, and role-based access systems tailored to unique business models.
            </p>
            <ul className="space-y-2 text-xs text-white/75">
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Granular RBAC & Secure Auth</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> PostgreSQL & Supabase Backends</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-400" /> Automated Document & Report Engines</li>
            </ul>
          </div>
        </div>

        {/* Local SEO + FAQ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-20">
          <div className="lg:col-span-5 bg-[#181818] border border-white/10 rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-white mb-3">Custom Software Development in Gaborone</h2>
            <p className="text-white/65 text-sm leading-relaxed mb-5">
              We work with Botswana businesses that need more than a template website: customer portals, operational dashboards, e-commerce, workflow tools and connected business systems.
            </p>
            <div className="flex flex-wrap gap-3 text-xs font-semibold">
              <Link to="/work/pameltex" className="text-emerald-400 hover:underline">See Pameltex →</Link>
              <Link to="/work/lebvilleboutique" className="text-emerald-400 hover:underline">See Lebville Boutique →</Link>
              <Link to="/products/ralion-os" className="text-emerald-400 hover:underline">Explore Ralion OS →</Link>
            </div>
          </div>
          <div className="lg:col-span-7">
            <h2 className="text-2xl font-bold text-white mb-5">Web Development Botswana FAQs</h2>
            <div className="space-y-3">
              {webFaqs.map((faq) => (
                <div key={faq.question} className="bg-[#181818] border border-white/10 rounded-2xl p-5">
                  <h3 className="text-sm font-bold text-white mb-2">{faq.question}</h3>
                  <p className="text-xs text-white/65 leading-relaxed">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-[#181818] via-[#202020] to-[#181818] border border-white/10 rounded-3xl p-10 text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-3">Build Your Digital Product</h2>
          <p className="text-white/70 text-sm mb-6">
            Tell us about your web, mobile, or enterprise platform vision.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/booking/web-app-development"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 text-black font-extrabold text-xs hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
            >
              Book Web & App Development <ArrowRight size={14} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/10 text-white font-bold text-xs hover:bg-white/15 transition-all border border-white/15"
            >
              General Inquiry
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebAppDevService;
