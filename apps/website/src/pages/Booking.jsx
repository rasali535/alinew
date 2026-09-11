import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { services } from '../data/mock';
import { Loader2, CheckCircle, AlertCircle, Sparkles, RefreshCw, ArrowRight } from 'lucide-react';

const serviceIdMap = {
  'film-video': 'Film & Creative Production',
  'web-app-development': 'Web & App Development',
  'music-audio': 'Music & Audio Production',
  'ai-automation': 'AI & Automation Systems',
  'ralion': 'Ralion OS Enterprise Deployment',
  'ralion-os': 'Ralion OS Enterprise Deployment',
  '1': 'Film & Creative Production',
  '2': 'Web & App Development',
  '3': 'Music & Audio Production',
  '4': 'AI & Automation Systems'
};

const Booking = () => {
  const { serviceId } = useParams();
  const [searchParams] = useSearchParams();
  const queryService = searchParams.get('service');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const rawIdentifier = (serviceId || queryService || '').toLowerCase().trim();
    if (rawIdentifier && serviceIdMap[rawIdentifier]) {
      setFormData((prev) => ({ ...prev, service: serviceIdMap[rawIdentifier] }));
    } else {
      // Find by title match in services data if passed directly
      const match = services.find((s) => s.title.toLowerCase() === rawIdentifier || s.id === rawIdentifier);
      if (match) {
        setFormData((prev) => ({ ...prev, service: match.title }));
      }
    }
  }, [serviceId, queryService]);

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
        setFormData({ name: '', email: '', service: '', message: '' });
      } else {
        const serverMsg = response?.data?.message || 'Server did not acknowledge booking request.';
        setErrorMessage(serverMsg);
        setStatus('error');
      }
    } catch (error) {
      console.error('Error sending booking:', error);
      const failureMsg =
        error.response?.data?.message ||
        (error.code === 'ECONNABORTED' ? 'Request timed out after 10 seconds.' : error.message) ||
        'Unable to send booking request at this time.';
      setErrorMessage(`${failureMsg} Please verify your connection or contact us directly at contact@rasalilabs.com or +267 72 113 009.`);
      setStatus('error');
    }
  };

  const selectedTitle = formData.service;
  const pageTitle = selectedTitle ? `Book ${selectedTitle}` : 'Start a Project';
  const pageDesc = selectedTitle
    ? `Ready to commission a ${selectedTitle} engagement with Ras Ali Labs? Fill out your brief below.`
    : 'Ready to collaborate on a film, web platform, audio project, or AI workflow? Let us know your goals.';

  return (
    <section className="min-h-screen bg-[#121212] pt-32 pb-20 px-6 lg:px-12 flex items-center text-white">
      <SEO
        title={`${pageTitle} | Ras Ali Labs`}
        description="Book a consultation with Ras Ali Labs for film production, web development, music production, sound design, and AI automation."
        canonical="https://rasalilabs.com/booking"
      />
      <div className="max-w-4xl mx-auto w-full">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> Project Commissioning
          </div>
          <h1 className="text-white text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            {pageTitle}
          </h1>
          <p className="text-white/70 text-base max-w-2xl mx-auto">
            {pageDesc}
          </p>
        </div>

        <div className="bg-[#181818] border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-2xl">
          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fadeIn">
              <div className="w-16 h-16 bg-brand-gold/10 rounded-full flex items-center justify-center mb-6 text-brand-gold">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-2xl text-white font-bold mb-2">Inquiry Received Successfully!</h3>
              <p className="text-white/70 text-xs max-w-md mb-8">
                Thank you for reaching out to Ras Ali Labs. We will review your project requirements and follow up promptly.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
              >
                Submit Another Request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
              {status === 'error' && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3 text-xs text-red-300">
                  <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block font-bold text-red-200 mb-1">Transmission Failed</strong>
                    <p>{errorMessage}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">Your Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                    placeholder="e.g. Kagiso Motlhanka"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">Email Address *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={status === 'loading'}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">Service Discipline Needed *</label>
                <select
                  name="service"
                  value={formData.service}
                  onChange={handleChange}
                  required
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs focus:border-brand-gold focus:outline-none transition-colors"
                >
                  <option value="" disabled>Select a capability</option>
                  <option value="Film & Creative Production">Film & Creative Production</option>
                  <option value="Web & App Development">Web & App Development</option>
                  <option value="Music & Audio Production">Music & Audio Production</option>
                  <option value="AI & Automation Systems">AI & Automation Systems</option>
                  <option value="Ralion OS Enterprise Deployment">Ralion OS Enterprise Deployment</option>
                  <option value="Other">Other Multidisciplinary Inquiries</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/70 mb-2">Project Brief & Details *</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="5"
                  disabled={status === 'loading'}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-brand-gold focus:outline-none transition-colors resize-none"
                  placeholder="Tell us about the scope, deliverable formats, estimated timeline, and goals..."
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-[1.01] transition-all shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Booking Brief...</span>
                  </>
                ) : status === 'error' ? (
                  <>
                    <RefreshCw size={15} />
                    <span>Retry Sending Project Brief</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    <span>Send Project Brief to Ras Ali Labs</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};

export default Booking;
