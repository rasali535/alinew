import React, { useState } from 'react';
import axios from 'axios';
import SEO from '../components/common/SEO';
import { Mail, MapPin, Phone, Send, Loader2, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { companyInfo } from '../data/mock';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: 'Film & Video Production',
    subject: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const apiUrl = '/send_mail.php';
      const response = await axios.post(apiUrl, formData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      if (response && response.data && (response.data.success === true || response.data.status === 'success')) {
        setStatus('success');
        setFormData({
          name: '',
          email: '',
          phone: '',
          service: 'Film & Video Production',
          subject: '',
          message: ''
        });
      } else {
        const serverMsg = response?.data?.message || 'Server did not acknowledge enquiry.';
        setErrorMessage(serverMsg);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const failureMsg =
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED' ? 'Request timed out after 10 seconds.' : error.message) ||
        'Unable to send message at this time.';
      setErrorMessage(`${failureMsg} Please check your connection or contact us directly at contact@rasalilabs.com or +267 72 113 009.`);
      setStatus('error');
    }
  };

  return (
    <div className="pt-28 pb-20 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Contact Ras Ali Labs | Gaborone, Botswana"
        description="Contact Ras Ali Labs for film and video production, web and app development, music production, sound design, and Ralion OS inquiries in Gaborone, Botswana."
        canonical="https://rasalilabs.com/contact"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="max-w-3xl mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Start a Collaboration
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            Let's Build Something Powerful.
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            Whether you need a cinematic film, a high-performance web platform, an original music score, or an enterprise AI operating system, we are ready to bring your vision to life.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Contact Details Column */}
          <div className="lg:col-span-5 space-y-8 bg-[#181818] border border-white/10 rounded-3xl p-8 shadow-xl">
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Ras Ali Labs</h3>
              <p className="text-brand-gold text-xs font-semibold uppercase tracking-wider mb-6">
                Technology. Film. Sound. Innovation.
              </p>
              <p className="text-white/65 text-xs leading-relaxed">
                Headquartered in Gaborone, Botswana. We collaborate with clients on creative, technical, and enterprise projects.
              </p>
            </div>

            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 text-brand-gold shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1">Location</h4>
                  <p className="text-white/70 text-xs leading-relaxed">
                    Plot 18680 Khuhurutse Drive<br />
                    Phase 2, Gaborone<br />
                    Botswana
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 text-brand-gold shrink-0">
                  <Phone size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1">Direct Line</h4>
                  <a
                    href="tel:+26772113009"
                    className="text-white/80 hover:text-brand-gold transition-colors text-xs font-mono font-bold"
                  >
                    +267 72 113 009
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-brand-gold/10 text-brand-gold shrink-0">
                  <Mail size={20} />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xs uppercase tracking-wider mb-1">Official Email</h4>
                  <a
                    href="mailto:contact@rasalilabs.com"
                    className="text-white/80 hover:text-brand-gold transition-colors text-xs font-mono"
                  >
                    contact@rasalilabs.com
                  </a>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-black/40 border border-white/5 space-y-2 text-xs text-white/60">
              <div className="text-brand-gold font-bold text-xs">Response Commitment</div>
              <p>Our team reviews and responds to project briefs and inquiries promptly.</p>
            </div>
          </div>

          {/* Contact & Brief Form Column */}
          <div className="lg:col-span-7 bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-10 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-2">Project Inquiry & Brief</h3>
            <p className="text-white/60 text-xs mb-8">
              Fill out the details below to help us understand your project scope and timelines.
            </p>

            {status === 'success' ? (
              <div className="p-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-4 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-xl font-bold text-white">Thank You for Reaching Out!</h4>
                <p className="text-white/70 text-xs max-w-md mx-auto">
                  Your project message has been successfully received by the Ras Ali Labs team. We will review your brief and get back to you shortly.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {status === 'error' && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-300">
                    <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <strong className="block font-bold text-red-200 mb-1">Transmission Failed</strong>
                      <p>{errorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Kagiso Motlhanka"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="name@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                      Phone / WhatsApp (Optional)
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+267 7X XXX XXX"
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                      Primary Service Discipline *
                    </label>
                    <select
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-gold focus:outline-none transition-colors"
                    >
                      <option value="Film & Video Production">Film & Video Production</option>
                      <option value="Web & App Development">Web & App Development</option>
                      <option value="Music & Audio Production">Music & Audio Production</option>
                      <option value="AI & Enterprise Automation">AI & Enterprise Automation</option>
                      <option value="Ralion OS Enterprise Deployment">Ralion OS Enterprise Deployment</option>
                      <option value="General Collaboration Inquiry">General Collaboration Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    Project Subject / Title *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Corporate Documentary & Brand Film"
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">
                    Project Details & Scope *
                  </label>
                  <textarea
                    name="message"
                    required
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us about your requirements, goals, deliverables, and estimated timeline..."
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-[1.01] transition-all shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {status === 'loading' ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Submitting Project Brief...
                    </>
                  ) : status === 'error' ? (
                    <>
                      <RefreshCw size={15} /> Retry Submitting Project Brief
                    </>
                  ) : (
                    <>
                      <Send size={15} /> Submit Project Brief to Ras Ali Labs
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
