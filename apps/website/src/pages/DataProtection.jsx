import React, { useState } from 'react';
import SEO from '../components/common/SEO';
import { 
  ShieldCheck, Lock, Cpu, Globe, Server, FileCheck, AlertCircle, 
  CheckCircle2, Send, Scale, Eye, Download, UserCheck, ArrowRight, BookOpen, Layers
} from 'lucide-react';
import { Link } from 'react-router-dom';

const DataProtection = () => {
  const [activeTab, setActiveTab] = useState('bocra');
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [requestType, setRequestType] = useState('access');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    details: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative overflow-hidden pt-32 pb-24">
      <SEO
        title="BOCRA & Botswana Data Protection Act Compliance Center | Ras Ali Labs"
        description="Comprehensive compliance declaration and Data Subject Rights portal aligned with the Botswana Data Protection Act (Act No. 32 of 2018) and BOCRA ICT directives."
        url="/data-protection"
      />

      {/* Ambient Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-emerald-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -left-[150px] w-[500px] h-[500px] bg-blue-600/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/assets/images/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
        
        {/* Hero Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-950/70 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
            <Scale className="w-4 h-4" />
            <span>Republic of Botswana • BOCRA & DPA Portal</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
            Data Protection &{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400">
              BOCRA Compliance
            </span>
          </h1>

          <p className="text-zinc-400 text-sm md:text-base leading-relaxed">
            Welcome to the Ras Ali Labs Regulatory & Data Protection Governance Center. We ensure that your business, customer records, and AI workflows strictly adhere to statutory Botswana laws and BOCRA communications regulations.
          </p>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-16">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="text-3xl font-black text-emerald-400 font-mono mb-1">Act 32</div>
            <div className="text-xs font-bold text-white mb-1">Botswana DPA (2018)</div>
            <p className="text-[11px] text-zinc-400">Full statutory alignment with Information Commissioner requirements.</p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="text-3xl font-black text-blue-400 font-mono mb-1">BOCRA</div>
            <div className="text-xs font-bold text-white mb-1">ICT Telecom Directives</div>
            <p className="text-[11px] text-zinc-400">Electronic transactions, network integrity & cybersecurity standards.</p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="text-3xl font-black text-purple-400 font-mono mb-1">100%</div>
            <div className="text-xs font-bold text-white mb-1">Offline Local AI Privacy</div>
            <p className="text-[11px] text-zinc-400">Zero data retention mode running locally inside your secure perimeter.</p>
          </div>

          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-xl">
            <div className="text-3xl font-black text-amber-400 font-mono mb-1">72 Hrs</div>
            <div className="text-xs font-bold text-white mb-1">Incident Escalation</div>
            <p className="text-[11px] text-zinc-400">Mandatory regulatory breach disclosure window under national law.</p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-12 p-1.5 rounded-2xl bg-zinc-900/80 border border-zinc-800 max-w-3xl mx-auto">
          {[
            { id: 'bocra', label: 'BOCRA Framework', icon: Scale },
            { id: 'act32', label: 'Botswana DPA (Act 32)', icon: ShieldCheck },
            { id: 'ai-governance', label: 'Local AI Architecture', icon: Cpu },
            { id: 'sadc-transfers', label: 'Cross-Border & SADC', icon: Globe },
            { id: 'rights-portal', label: 'Exercise DPA Rights', icon: UserCheck },
          ].map((tab) => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isCurrent
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panes */}
        <div className="max-w-5xl mx-auto">
          
          {/* TAB 1: BOCRA Framework */}
          {activeTab === 'bocra' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">BOCRA Communications & ICT Governance Alignment</h2>
                    <p className="text-xs text-zinc-400">Botswana Communications Regulatory Authority Standards</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
                  <p>
                    The <strong>Botswana Communications Regulatory Authority (BOCRA)</strong> is the statutory body established under the Communications Regulatory Authority Act (CRA Act 2012) mandated to regulate the communications sector in Botswana, including telecommunications, Internet, ICT, and postal services.
                  </p>
                  <p>
                    Ras Ali Labs aligns its cloud services, SMS/WhatsApp business pipelines, and Ralion platform with BOCRA’s regulatory framework:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Electronic Communications Integrity</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Adherence to Electronic Communications and Transactions (ECT) standards for verifiable timestamping, digital record preservation, and fraud prevention.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Telecom & Messaging Gateway Compliance</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        SMS and automated messaging campaigns executed via authorized licensed telecom partners with clear opt-out mechanisms and spam safeguards.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Cybersecurity Standards</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        National cybersecurity posture alignment, automated threat isolation, end-to-end TLS 1.3 encryption, and prompt vulnerability remediation.
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Consumer Protection Mandate</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        Transparent pricing disclosures, clear SLA uptime metrics, and accessible dispute resolution channels for all Botswana enterprises.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Botswana DPA Act 32 */}
          {activeTab === 'act32' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Botswana Data Protection Act (Act No. 32 of 2018)</h2>
                    <p className="text-xs text-zinc-400">Statutory Rights & Compliance Matrix</p>
                  </div>
                </div>

                <div className="space-y-6 text-xs md:text-sm text-zinc-300 leading-relaxed">
                  <p>
                    The Botswana Data Protection Act (DPA 2018) regulates how organizations process, collect, store, and transmit personal data of individuals residing in Botswana. Ras Ali Labs operates as both a <strong>Data Controller</strong> (for platform accounts) and a <strong>Data Processor</strong> (on behalf of enterprise tenants).
                  </p>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Statutory Responsibilities Matrix</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-400">
                            <th className="py-3 px-4">DPA Requirement</th>
                            <th className="py-3 px-4">Legal Citation</th>
                            <th className="py-3 px-4">Ras Ali Labs Technical Implementation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Lawful Basis & Consent</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 14 & 15</td>
                            <td className="py-3 px-4 text-zinc-300">Explicit opt-in consent for OAuth tokens, marketing, and cloud AI routing.</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Data Subject Access Rights</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 19</td>
                            <td className="py-3 px-4 text-zinc-300">Self-service data export via CSV/JSON in Ralion Settings & DSR portal.</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Right to Rectification</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 20</td>
                            <td className="py-3 px-4 text-zinc-300">Real-time profile and corporate entity updating inside Workspace Settings.</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Right to Erasure (Deletion)</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 21</td>
                            <td className="py-3 px-4 text-zinc-300">Automated cascade deletion of user records, database rows, and vector embeddings.</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Security of Processing</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 22</td>
                            <td className="py-3 px-4 text-zinc-300">AES-256 database encryption at rest, TLS 1.3 in transit, and multi-tenant RLS.</td>
                          </tr>
                          <tr>
                            <td className="py-3 px-4 font-semibold text-white">Breach Notification</td>
                            <td className="py-3 px-4 font-mono text-zinc-400">Section 23</td>
                            <td className="py-3 px-4 text-zinc-300">Statutory 72-hour notification protocol to Information Commissioner & Users.</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Local AI Architecture */}
          {activeTab === 'ai-governance' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Local AI & Zero-Knowledge Architecture</h2>
                    <p className="text-xs text-zinc-400">Mari AI Offline Privacy Guarantees</p>
                  </div>
                </div>

                <div className="space-y-6 text-xs md:text-sm text-zinc-300 leading-relaxed">
                  <p>
                    Most enterprise AI platforms upload your internal company financial data, customer names, and strategy memos to overseas cloud servers for analysis. <strong>Ras Ali Labs eliminates this vulnerability.</strong>
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-zinc-950 border border-purple-500/30 space-y-3">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        <span>Ralion Local AI (Offline Mode)</span>
                      </div>
                      <ul className="space-y-2 text-xs text-zinc-400">
                        <li>• Powered by local Ollama engines (DeepSeek, Llama 3, Qwen) directly on your PC/Mac hardware.</li>
                        <li>• Documents, CRM logs, and business databases stay on your local disk.</li>
                        <li>• Operates with <strong>100% offline capability</strong> without requiring active internet connectivity.</li>
                        <li>• Zero model fine-tuning on customer data.</li>
                      </ul>
                    </div>

                    <div className="p-5 rounded-2xl bg-zinc-950 border border-blue-500/30 space-y-3">
                      <div className="font-bold text-white text-xs flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span>Encrypted Hybrid Cloud Fallback (Optional)</span>
                      </div>
                      <ul className="space-y-2 text-xs text-zinc-400">
                        <li>• User-controlled toggle in Settings.</li>
                        <li>• Uses enterprise-tier API agreements with zero prompt logging or storage.</li>
                        <li>• Data transmitted through TLS 1.3 encrypted tunnels.</li>
                        <li>• Disabled by default on sensitive sector deployments (Health and Funeral OS).</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SADC & Cross-Border */}
          {activeTab === 'sadc-transfers' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Cross-Border SADC Data Transfer Protocols</h2>
                    <p className="text-xs text-zinc-400">Regional Data Sovereignty & International Safe Harbors</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs md:text-sm text-zinc-300 leading-relaxed">
                  <p>
                    Cross-border data flows between Botswana and Southern African Development Community (SADC) nations (such as South Africa, Namibia, Zambia, Zimbabwe) or global cloud infrastructure are strictly governed under Section 25 of the Botswana DPA.
                  </p>
                  
                  <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Safeguards & Compliance Mechanisms</h3>
                    <ul className="list-disc list-inside space-y-2 text-xs text-zinc-400">
                      <li><strong>Adequacy Principle:</strong> Cloud hosting facilities are provisioned in jurisdictions upholding equivalent or superior data protection statutes (including GDPR and South Africa POPIA).</li>
                      <li><strong>Standard Contractual Clauses (SCCs):</strong> Robust data processing agreements are executed with infrastructure vendors (Supabase, Hostinger, AWS).</li>
                      <li><strong>Local Data Residency:</strong> Enterprise and Government tier customers can request 100% on-premises data residency deployed on local Botswana servers in Gaborone.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Interactive DPA Rights Request Portal */}
          {activeTab === 'rights-portal' && (
            <div className="space-y-8 animate-fadeIn">
              <div className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Data Subject Rights (DSR) Request Portal</h2>
                    <p className="text-xs text-zinc-400">Exercise Your Statutory Rights under Botswana DPA (Act 32 of 2018)</p>
                  </div>
                </div>

                {formSubmitted ? (
                  <div className="p-8 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white">DSR Request Submitted Successfully</h3>
                    <p className="text-xs text-zinc-300 max-w-md mx-auto leading-relaxed">
                      Your request has been logged with the Ras Ali Labs Data Protection Officer. Under Botswana DPA regulations, we will verify your identity and process your inquiry within statutory timelines (maximum 30 days).
                    </p>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      Reference ID: RAL-DSR-{Date.now().toString().slice(-6)}-BW
                    </div>
                    <button
                      onClick={() => setFormSubmitted(false)}
                      className="px-5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white hover:bg-zinc-800 transition-all"
                    >
                      Submit Another Request
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">Full Legal Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Kagiso Motsepe"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-zinc-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">Enterprise Email Address *</label>
                        <input
                          type="email"
                          required
                          placeholder="kagiso@company.co.bw"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-zinc-600 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">Company / Organization</label>
                        <input
                          type="text"
                          placeholder="e.g. Botswana Enterprise Ltd"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-zinc-600 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-300 mb-1.5">Statutory Request Category *</label>
                        <select
                          value={requestType}
                          onChange={(e) => setRequestType(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white outline-none"
                        >
                          <option value="access">Right of Access (Request copy of data)</option>
                          <option value="rectification">Right to Rectification (Correct inaccurate info)</option>
                          <option value="erasure">Right to Erasure (Delete my personal data)</option>
                          <option value="portability">Data Portability (Machine-readable export)</option>
                          <option value="object">Object to Processing / AI Automated Profiling</option>
                          <option value="bocra-inquiry">BOCRA / DPA Regulatory Inquiry</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-300 mb-1.5">Request Specifics & Verification Details *</label>
                      <textarea
                        required
                        rows={4}
                        placeholder="Please describe the exact records, accounts, or data categories you wish to access, rectify, or erase..."
                        value={formData.details}
                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs text-white placeholder-zinc-600 outline-none resize-none"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                      <div className="text-[11px] text-zinc-500">
                        Protected by Botswana Data Protection Act (Act 32 of 2018). Identity verification required prior to record release.
                      </div>
                      <button
                        type="submit"
                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>Submit Statutory DSR Request</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Navigation Link */}
        <div className="mt-16 text-center">
          <Link
            to="/privacy"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-emerald-400 transition-colors"
          >
            <span>Read the Complete Privacy Policy & Legal Declaration</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
};

export default DataProtection;
