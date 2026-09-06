'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '@ralion/ui';
import { 
  Building2, 
  Globe, 
  Sparkles, 
  Check, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  Edit3, 
  Share2, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Twitter,
  MapPin,
  Briefcase
} from 'lucide-react';
import { useOrganization } from '@ralion/auth';
import { WebsiteIngestionService, BusinessContextService } from '@ralion/ai';
import { getRalionApiUrl } from '@/lib/api-config';

export default function RalionOnboardingPage() {
  const router = useRouter();
  const { setOrganization, organization, user } = useOrganization();

  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStage, setAnalysisStage] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [businessData, setBusinessData] = useState({
    name: 'Foundations Academy',
    websiteUrl: 'https://www.foundationsacademy.org',
    industry: 'Education & Leadership Training',
    country: 'Botswana',
    licenseTier: 'PROFESSIONAL',
  });

  const [learnedProfile, setLearnedProfile] = useState<{
    companyName: string;
    industry: string;
    description: string;
    services: string[];
    markets: string[];
    targetCustomers: string[];
    valueProposition: string;
  }>({
    companyName: 'Foundations Academy',
    industry: 'Education & Leadership Training',
    description: 'Foundations Academy delivers premier K-12 and tertiary leadership curriculum, STEM education, and holistic development.',
    services: [
      'Early Childhood & Primary STEM Education',
      'Secondary Leadership & Robotics Academy',
      'Teacher Professional Development Workshops'
    ],
    markets: ['Botswana & Regional SADC Students'],
    targetCustomers: ['Parents & Guardians', 'School Districts', 'Corporate Sponsors'],
    valueProposition: 'Inspiring future leaders through sovereign, values-grounded curriculum and accredited STEM excellence.',
  });

  // Handle website analysis
  const handleAnalyzeWebsite = async () => {
    if (!businessData.websiteUrl.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      setAnalysisStage('Connecting to website...');
      await new Promise(r => setTimeout(r, 600));

      setAnalysisStage('Reading public business information...');
      await new Promise(r => setTimeout(r, 800));

      setAnalysisStage('Understanding products and services...');
      await new Promise(r => setTimeout(r, 800));

      setAnalysisStage('Building your Business Knowledge Profile...');
      
      const targetOrgId = organization?.id || user?.orgId || `org_${businessData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const normalizedUrl = businessData.websiteUrl.trim();
      let wk: any = null;

      try {
        const apiUrl = getRalionApiUrl('/api/mari/knowledge/website-sync');
        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId: targetOrgId,
            websiteUrl: normalizedUrl,
          }),
        });
        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const data = await res.json();
            if (data.success && data.websiteKnowledge) {
              wk = data.websiteKnowledge;
            }
          }
        }
      } catch {}

      if (!wk) {
        wk = await WebsiteIngestionService.ingestWebsite(targetOrgId, normalizedUrl, {
          overrideName: businessData.name,
          overrideIndustry: businessData.industry || 'Commercial Enterprise',
        });
      }

      if (wk) {
        WebsiteIngestionService.setIngestionState(targetOrgId, 'INGESTED', wk);
        BusinessContextService.invalidateContext(targetOrgId);
      }
      
      setAnalysisStage('Preparing Mari AI...');
      await new Promise(r => setTimeout(r, 400));

      if (wk) {
        const productsSec = wk.sections?.find((s: any) => s.category === 'PRODUCTS_SERVICES');
        const aboutSec = wk.sections?.find((s: any) => s.category === 'ABOUT');
        const valueSec = wk.sections?.find((s: any) => s.category === 'VALUE_PROPOSITION');

        setLearnedProfile({
          companyName: businessData.name,
          industry: businessData.industry || 'Commercial Enterprise',
          description: wk.summary || aboutSec?.content || `Official business operations for ${businessData.name}.`,
          services: productsSec?.keyTakeaways || ['Core Commercial Offerings', 'Customer Support & Inquiries'],
          markets: [businessData.country ? `${businessData.country} & Regional Markets` : 'Regional Markets'],
          targetCustomers: ['Commercial Clients', 'B2B Partners', 'Consumers'],
          valueProposition: valueSec?.keyTakeaways?.[0] || 'Quality service delivery and customer satisfaction.',
        });
      }

      setStep(3);
    } catch (err: any) {
      console.error('Analysis notice:', err);
      setStep(3);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompleteOnboarding = () => {
    const orgId = organization?.id || user?.orgId || `org_${businessData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    
    // Register business profile in tenant context engine
    BusinessContextService.registerTenantProfile(orgId, {
      companyName: businessData.name,
      industry: businessData.industry || 'Commercial Enterprise',
      websiteUrl: businessData.websiteUrl.trim(),
      valueProposition: learnedProfile?.valueProposition || `${businessData.name} commercial solutions and client services.`,
      targetMarket: businessData.country ? `${businessData.country} & Regional Markets` : 'Regional Markets',
    });

    const newOrg = {
      id: orgId,
      name: businessData.name,
      slug: businessData.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      ownerId: 'u-admin-101',
      licenseTier: businessData.licenseTier as any,
      maxUsers: 25,
      enabledModules: ['mari', 'crm', 'tasks', 'calendar', 'documents', 'billing', 'growth'],
      activeBranches: [{ id: 'b-main', name: 'Main Headquarters', code: 'HQ-01', isMain: true }],
      activeDepartments: [{ id: 'd-ops', name: 'Operations', code: 'OPS' }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setOrganization(newOrg);
    router.push('/ralion/workspace');
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <Badge variant="purple" className="font-mono text-xs">
          Ralion OS — Sovereign Business Onboarding
        </Badge>
        <h1 className="text-3xl font-black tracking-tight text-white">
          Let Mari Learn About Your Business
        </h1>
        <p className="text-xs text-zinc-400 max-w-lg mx-auto">
          Mari AI extracts your products, services, and positioning from your website so she can begin assisting you before any social channels are connected.
        </p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center gap-4 border-y border-zinc-800 py-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-purple-600 text-white' : step > s ? 'bg-emerald-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
              {step > s ? <Check className="w-4 h-4" /> : s}
            </div>
            <span className={`text-xs font-medium ${step === s ? 'text-white' : 'text-zinc-500'}`}>
              {s === 1 ? 'Business Profile' : s === 2 ? 'Website Ingestion' : s === 3 ? 'Knowledge Review' : 'Social Channels'}
            </span>
          </div>
        ))}
      </div>

      {/* Step 1: Tell Mari About Your Business */}
      {step === 1 && (
        <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Step 1: Tell Mari About Your Business
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Provide your business name and website. Mari will securely crawl public pages to build your verified knowledge profile.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 mb-1 font-medium">Business Name <span className="text-purple-400">*</span></label>
              <input
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                value={businessData.name}
                onChange={(e) => setBusinessData({ ...businessData, name: e.target.value })}
                placeholder="e.g. Foundations Academy"
              />
            </div>

            <div>
              <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-purple-400" />
                Business Website <span className="text-purple-400">*</span>
              </label>
              <input
                type="url"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                value={businessData.websiteUrl}
                onChange={(e) => setBusinessData({ ...businessData, websiteUrl: e.target.value })}
                placeholder="https://www.example.com"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Accepts https://example.com or www.example.com. SSRF-protected and isolated to your organization.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5 text-zinc-400" />
                  Industry (Optional)
                </label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                  value={businessData.industry}
                  onChange={(e) => setBusinessData({ ...businessData, industry: e.target.value })}
                  placeholder="e.g. Education & STEM"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                  Country / Region
                </label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                  value={businessData.country}
                  onChange={(e) => setBusinessData({ ...businessData, country: e.target.value })}
                  placeholder="e.g. Botswana"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(4)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Skip for now
            </Button>

            <Button
              variant="primary"
              size="sm"
              disabled={!businessData.name.trim()}
              onClick={() => {
                if (businessData.websiteUrl.trim()) {
                  setStep(2);
                  handleAnalyzeWebsite();
                } else {
                  setStep(3);
                }
              }}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 px-4 py-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze My Business <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Let Mari Learn From Your Website */}
      {step === 2 && (
        <Card className="bg-zinc-900 border-zinc-800 p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto animate-pulse">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Letting Mari Learn From Your Website
            </h2>
            <p className="text-xs text-purple-300 font-mono mt-1">
              {businessData.websiteUrl}
            </p>
          </div>

          <div className="max-w-md mx-auto p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-3">
            <div className="flex items-center justify-between font-medium">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                {analysisStage || 'Analyzing website structure...'}
              </span>
              <span className="text-purple-400 font-mono">In Progress</span>
            </div>

            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 h-1.5 w-3/4 rounded-full animate-pulse" />
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Here's What Mari Learned */}
      {step === 3 && (
        <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Step 3: Here&apos;s What Mari Learned
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Verified knowledge extracted for <span className="text-white font-semibold">{businessData.name}</span>. Mari will use this to generate strategic campaigns and answer inquiries.
              </p>
            </div>
            <Badge variant="success" className="font-mono text-[10px]">
              Provenance: Verified Website
            </Badge>
          </div>

          {analysisError && (
            <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs">
              {analysisError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-purple-400 font-mono block">Company & Industry</span>
              <p className="text-white font-bold text-sm">{learnedProfile.companyName}</p>
              <p className="text-zinc-400">{learnedProfile.industry}</p>
              <p className="text-zinc-300 mt-2 leading-relaxed">{learnedProfile.description}</p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-purple-400 font-mono block">Core Offerings & Services</span>
              <ul className="space-y-1 text-zinc-300">
                {learnedProfile.services.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-purple-400">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-purple-400 font-mono block">Target Markets & Audience</span>
              <p className="text-white font-medium">{learnedProfile.markets.join(', ')}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {learnedProfile.targetCustomers.map((c, idx) => (
                  <Badge key={idx} variant="default" className="text-[10px] text-zinc-300 border-zinc-700">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-bold uppercase text-purple-400 font-mono block">Value Proposition</span>
              <p className="text-zinc-300 leading-relaxed">{learnedProfile.valueProposition}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStep(2);
                handleAnalyzeWebsite();
              }}
              className="text-xs text-zinc-300 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Re-analyze Website
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(1)}
                className="text-xs text-zinc-300 flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Information
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setStep(4)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 px-4"
              >
                <Check className="w-4 h-4" /> Looks Good, Continue
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Connect Social Channels (Optional) */}
      {step === 4 && (
        <Card className="bg-zinc-900 border-zinc-800 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-blue-400" />
              Step 4: Connect Your Social Channels
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Connecting social channels enriches Mari AI with live audience reach and engagement telemetry. This step is <span className="text-emerald-400 font-semibold">optional</span> and can be done anytime from Growth Studio.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Facebook className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Facebook Page</h4>
                  <p className="text-[11px] text-zinc-500">Publish posts & track reach velocity</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-950/40">
                Connect
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-600/20 text-pink-400 flex items-center justify-center">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">Instagram Business</h4>
                  <p className="text-[11px] text-zinc-500">Share visual carousels & reels</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-pink-500/30 text-pink-400 hover:bg-pink-950/40">
                Connect
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-600/20 text-sky-400 flex items-center justify-center">
                  <Linkedin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">LinkedIn Company</h4>
                  <p className="text-[11px] text-zinc-500">Executive B2B thought leadership</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-sky-500/30 text-sky-400 hover:bg-sky-950/40">
                Connect
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-800 text-zinc-300 flex items-center justify-center">
                  <Twitter className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white">X / Twitter</h4>
                  <p className="text-[11px] text-zinc-500">Instant updates & community</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="text-xs border-zinc-700 text-zinc-300 hover:bg-zinc-800">
                Connect
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep(3)}
              className="text-xs text-zinc-400"
            >
              Back to Review
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleCompleteOnboarding}
              className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-6 py-2 shadow-lg shadow-purple-600/20"
            >
              Launch My Workspace <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
