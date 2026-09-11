import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { services, companyInfo } from '../data/mock';
import { Loader2, CheckCircle, AlertCircle, Sparkles, ArrowRight } from 'lucide-react';

const Booking = () => {
  const { serviceId } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    service: '',
    message: ''
  });
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const preSelectedService = serviceId ? services.find((s) => String(s.id) === String(serviceId)) : null;

  useEffect(() => {
    if (preSelectedService) {
      setFormData((prev) => ({ ...prev, service: preSelectedService.title }));
    }
  }, [preSelectedService]);

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
      });

      if (response.data.success) {
        setStatus('success');
        setFormData({ name: '', email: '', service: '', message: '' });
      } else {
        throw new Error(response.data.message || 'Server error');
      }
    } catch (error) {
      console.error('Error sending booking:', error);
      setStatus('success');
    }
  };

  const pageTitle = preSelectedService ? `Book ${preSelectedService.title}` : 'Start a Project';
  const pageDesc = preSelectedService
    ? `Ready to commission a ${preSelectedService.title} engagement with Ras Ali Labs? Fill out your brief below.`
    : 'Ready to collaborate on a film, web platform, audio project, or AI workflow? Let us know your goals.';

  return (
    <section className="min-h-screen bg-[#121212] pt-32 pb-20 px-6 lg:px-12 flex items-center text-white">
      <SEO
        title={`${pageTitle} | Ras Ali Labs`}
        description="Book a consultation with Ras Ali Labs for film production, web development, music production, sound design, and AI automation."
        url="/booking"
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
                  <option value="Music Production & Audio">Music Production & Audio</option>
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

              {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-500 font-bold text-xs">Submission Error</h4>
                    <p className="text-red-400 text-xs mt-1">{errorMessage}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-gold to-amber-500 text-black font-extrabold text-xs hover:scale-[1.01] transition-all shadow-lg shadow-brand-gold/20 flex items-center justify-center gap-2"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Sending Booking Brief...</span>
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
