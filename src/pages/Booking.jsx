import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { services } from '../data/mock';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const Booking = () => {
    const { serviceId } = useParams();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        service: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [errorMessage, setErrorMessage] = useState('');

    // Find the pre-selected service if serviceId exists
    const preSelectedService = serviceId ? services.find(s => s.id === parseInt(serviceId)) : null;

    useEffect(() => {
        if (preSelectedService) {
            setFormData(prev => ({ ...prev, service: preSelectedService.title }));
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
            // Updated to point to PHP handler
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
            const msg = error.response?.data?.message || error.message || 'Failed to send request.';
            setErrorMessage(msg);
            setStatus('error');
        }
    };

    const pageTitle = preSelectedService ? `Book ${preSelectedService.title}` : 'Booking';
    const pageDesc = preSelectedService
        ? `Ready to start your ${preSelectedService.title} project? Fill out the form below.`
        : 'Ready to start a project? Tell me about your needs.';

    return (
        <section className="min-h-screen bg-brand-dark pt-32 pb-20 px-6 lg:px-12 flex items-center">
            <SEO
                title={`${pageTitle} | Ras Ali`}
                description="Book Ras Ali for your next project. Services include Bass Performance, Sound Engineering, Video Production, and Web Development."
                url="/booking"
            />
            <div className="max-w-4xl mx-auto w-full">
                <div className="text-center mb-16">
                    <h1 className="text-white text-4xl md:text-6xl lg:text-7xl font-light tracking-tight mb-6">
                        {pageTitle.toUpperCase()}
                    </h1>
                    <p className="text-white/50 text-lg">
                        {pageDesc}
                    </p>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    {status === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                            <div className="w-20 h-20 bg-brand-green/10 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle className="w-10 h-10 text-brand-green" />
                            </div>
                            <h3 className="text-2xl text-white font-medium mb-4">Request Sent Successfully!</h3>
                            <p className="text-white/60 max-w-md">
                                Thank you for reaching out. I'll get back to you regarding your {formData.service || 'project'} inquiry as soon as possible.
                            </p>
                            <button
                                onClick={() => setStatus('idle')}
                                className="mt-8 text-brand-green hover:text-white transition-colors"
                            >
                                Send another request
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-white/70 text-sm uppercase tracking-wider">Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        disabled={status === 'loading'}
                                        className="w-full bg-brand-dark/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:border-brand-green focus:outline-none transition-colors disabled:opacity-50"
                                        placeholder="Your Name"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-white/70 text-sm uppercase tracking-wider">Email</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        disabled={status === 'loading'}
                                        className="w-full bg-brand-dark/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:border-brand-green focus:outline-none transition-colors disabled:opacity-50"
                                        placeholder="your@email.com"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-white/70 text-sm uppercase tracking-wider">Service Needed</label>
                                <select
                                    name="service"
                                    value={formData.service}
                                    onChange={handleChange}
                                    required
                                    disabled={status === 'loading'}
                                    className="w-full bg-brand-dark/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:border-brand-green focus:outline-none transition-colors disabled:opacity-50"
                                >
                                    <option value="" disabled>Select a service</option>
                                    {services.map((s) => (
                                        <option key={s.id} value={s.title}>{s.title}</option>
                                    ))}
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-white/70 text-sm uppercase tracking-wider">Message</label>
                                <textarea
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows="5"
                                    disabled={status === 'loading'}
                                    className="w-full bg-brand-dark/50 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:border-brand-green focus:outline-none transition-colors disabled:opacity-50"
                                    placeholder="Tell me about your project..."
                                ></textarea>
                            </div>

                            {status === 'error' && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-red-500 font-medium text-sm">Action Failed</h4>
                                        <p className="text-red-400 text-sm mt-1">{errorMessage}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full bg-brand-green text-black font-medium py-4 rounded-full text-lg hover:bg-white transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {status === 'loading' ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Sending Request...</span>
                                    </>
                                ) : (
                                    <span>Send Booking Request</span>
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
