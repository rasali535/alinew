import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getProductBySlug } from '../data/products';
import { getAllReleases, fetchLatestReleaseFromSupabase } from '../data/releases';
import { useAuth } from '../context/AuthContext';
import { analytics } from '../lib/analytics';
import { triggerBinaryDownload } from '../lib/downloadValidator';
import SEO from '../components/common/SEO';
import {
  Cpu,
  Sparkles,
  Globe,
  CreditCard,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bot,
  Database,
  Layers,
  BarChart3,
  Lock,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Briefcase,
  Download,
  Share2,
  TrendingUp,
  Truck,
  Activity,
  Monitor,
  Check
} from 'lucide-react';

const iconMap = {
  Cpu: Cpu,
  Sparkles: Sparkles,
  Globe: Globe,
  CreditCard: CreditCard,
  Bot: Bot,
  ShieldCheck: ShieldCheck,
  Database: Database,
  Layers: Layers,
  BarChart3: BarChart3,
  Lock: Lock,
  UserCheck: UserCheck,
  Briefcase: Briefcase,
  Zap: Zap,
  Share2: Share2,
  TrendingUp: TrendingUp,
  Truck: Truck,
  Activity: Activity
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { openAuthModal, user } = useAuth();
  const product = getProductBySlug(slug || 'ralion');
  const [activeScreenshot, setActiveScreenshot] = useState(0);
  const [activeSolutionTab, setActiveSolutionTab] = useState(0);
  const [releases, setReleases] = useState(getAllReleases());

  const isRalion = product.slug === 'ralion';

  useEffect(() => {
    analytics.trackProductVisit(product.slug);

    // Fetch latest release dynamically from Supabase
    fetchLatestReleaseFromSupabase('Ralion', 'Windows').then((latest) => {
      if (latest) {
        setReleases(getAllReleases());
      }
    });
  }, [product.slug]);

  const handleDownloadRelease = (rel) => {
    analytics.trackDownload(rel.platform, '2.4.2', 'Ralion');
    triggerBinaryDownload(rel.downloadUrl, rel.filename || `ralion-desktop-2.4.2-setup.exe`);
  };

  const jsonLdData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Ralion',
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Windows 10/11 x64, macOS 11.0+, Linux x86_64',
    'softwareVersion': '2.4.2',
    'description': 'Ralion empowers businesses with AI-powered management tools for growth, logistics, trade, health, and digital transformation.',
    'publisher': {
      '@type': 'Organization',
      'name': 'Ras Ali Labs',
      'url': 'https://rasalilabs.com'
    },
    'downloadUrl': 'https://rasalilabs.com/downloads/ralion'
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      {/* SEO Head Tags & JSON-LD */}
      <SEO
        title={isRalion ? "Ralion — AI Business Operating System | Ras Ali Labs" : `${product.name} | Ras Ali Labs`}
        description={isRalion ? "Ralion empowers businesses with AI-powered management tools for growth, logistics, trade, health, and digital transformation." : product.description}
      />
      <script type="application/ld+json">
        {JSON.stringify(jsonLdData)}
      </script>

      {/* Dynamic Background Blur */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-r from-brand-gold/15 via-purple-500/10 to-emerald-500/10 rounded-full blur-[160px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-white/50 mb-8">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={12} />
          <Link to="/products" className="hover:text-white transition-colors">Products</Link>
          <ChevronRight size={12} />
          <span className="text-brand-gold font-medium">{product.name}</span>
        </div>

        {/* Phase 1: Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-24">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/20 text-brand-gold text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles size={14} /> AI-Powered Business Operating System
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              Ralion
            </h1>

            <div className="text-2xl md:text-3xl font-extrabold text-white mb-2">
              AI-Powered Business Operating System
            </div>

            <div className="text-brand-gold font-bold text-lg uppercase tracking-widest mb-6">
              "Empowered to Prosper"
            </div>

            <p className="text-white/70 text-lg leading-relaxed mb-8 font-normal">
              {product.hero.subtitle}
            </p>

            {/* Hero CTA Buttons */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                to="/downloads/ralion"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-bold text-sm hover:scale-105 transition-all shadow-lg shadow-brand-gold/20 flex items-center gap-2"
              >
                <Download size={18} /> Download Community Edition
              </Link>

              <a
                href="#features"
                className="px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all border border-white/10 flex items-center gap-2"
              >
                Explore Features <ArrowRight size={16} />
              </a>

              <Link
                to="/ralion"
                className="px-6 py-4 rounded-xl bg-purple-600/20 text-purple-300 font-bold text-sm hover:bg-purple-600/30 transition-all border border-purple-500/30 flex items-center gap-2"
              >
                Launch Web OS <ExternalLink size={16} />
              </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6">
              {product.hero.stats.map((stat, idx) => (
                <div key={idx} className="bg-black/30 p-3 rounded-xl border border-white/5">
                  <div className="text-lg font-extrabold text-brand-gold">{stat.value}</div>
                  <div className="text-[11px] text-white/50 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Visual Mockup */}
          <div className="lg:col-span-5">
            <div className="relative rounded-3xl bg-[#252525] border border-white/10 p-6 shadow-2xl overflow-hidden group">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                </div>
                <div className="text-white/40 text-xs font-mono">Ralion OS v2.4.2 • Desktop</div>
              </div>

              <div className="bg-black/60 rounded-2xl p-6 border border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/20 text-brand-gold flex items-center justify-center font-bold">
                      R
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Enterprise Workspace</h4>
                      <p className="text-white/40 text-xs">Supabase RLS • Mari AI Active</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    v2.4.2 Active
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-2">
                  <div className="flex justify-between text-white/70">
                    <span>Installer Binary:</span>
                    <span className="text-brand-gold font-mono">ralion-desktop-2.4.2-setup.exe</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>File Size:</span>
                    <span className="text-white">152 MB</span>
                  </div>
                  <div className="flex justify-between text-white/70">
                    <span>Platform:</span>
                    <span className="text-white">Windows 10/11 x64</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase 1: Features Section (Display 7 Modules) */}
        <div id="features" className="mb-24 pt-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-gold text-xs font-bold uppercase tracking-widest block mb-2">
              Modular Architecture
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">
              Integrated Business Modules
            </h2>
            <p className="text-white/60 text-base">
              Ralion unifies every aspect of enterprise operations into a single intelligent platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {product.features.map((feat) => {
              const IconComponent = iconMap[feat.icon] || Cpu;
              return (
                <div
                  key={feat.id}
                  className="bg-[#252525] border border-white/10 rounded-3xl p-8 hover:border-brand-gold/40 transition-all group duration-300"
                >
                  <div className="w-12 h-12 rounded-2xl bg-brand-gold/10 text-brand-gold flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-white/60 text-sm leading-relaxed">{feat.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phase 1 & 2: Download Ralion Community Edition Section */}
        <div id="download-community" className="mb-24 bg-[#252525] border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <Download size={14} /> Download Ralion Community Edition
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-3">
              Get Started with Ralion v2.4.2
            </h2>
            <p className="text-white/60 text-sm">
              Free forever for small teams and developers. PE binary validated for Windows 11 x64, macOS, and Linux.
            </p>
          </div>

          {/* Platform Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {releases.map((rel) => (
              <div
                key={rel.platform}
                className="bg-black/50 border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:border-brand-gold/40 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-gold/10 text-brand-gold flex items-center justify-center">
                      <Monitor size={20} />
                    </div>
                    <span className="px-2.5 py-0.5 rounded bg-brand-gold/20 text-brand-gold text-[10px] font-bold">
                      v2.4.2
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1">{rel.platform}</h3>
                  <p className="text-white/50 text-xs font-mono mb-4">{rel.filename}</p>

                  <div className="space-y-2 text-xs text-white/70 border-t border-white/10 pt-4 mb-6">
                    <div className="flex justify-between">
                      <span>Architecture:</span>
                      <span className="text-white font-medium">{rel.architecture}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="text-white font-medium">{rel.filesizeFormatted || '152 MB'}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadRelease(rel)}
                  className="w-full py-3.5 rounded-xl bg-brand-gold text-black font-bold text-xs hover:scale-105 transition-transform flex items-center justify-center gap-2 shadow-lg shadow-brand-gold/20"
                >
                  <Download size={16} /> Download for {rel.platform}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
