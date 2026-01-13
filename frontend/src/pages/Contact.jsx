import React, { useState } from 'react';
import axios from 'axios';
import SEO from '../components/common/SEO';
import { Mail, MapPin, Phone, Send, Loader2 } from 'lucide-react';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState('idle'); // idle, loading, success, error

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');

        try {
            // Use relative path which works with the proxy setup
            const apiUrl = '/api/contact';

            await axios.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            setStatus('success');
            setFormData({ name: '', email: '', subject: '', message: '' });
        } catch (error) {
            console.error('Error sending message:', error);
            setStatus('error');
        }
    };

    return (
        <section className="min-h-screen bg-brand-dark pt-32 pb-20 px-6 lg:px-12 flex flex-col justify-center">
            <SEO
                title="Contact | Ras Ali"
                description="Get in touch with Ras Ali for premium web design, development, and digital experiences."
            />

            <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                {/* Contact Info Side */}
                <div className="space-y-12">
                    <div>
                        <h1 className="text-white text-5xl md:text-7xl font-light tracking-tight mb-6">
                            LET'S <span className="text-brand-green">TALK</span>
                        </h1>
                        <p className="text-white/60 text-lg max-w-lg leading-relaxed">
                            Have a project in mind or just want to say hello?
                            I'm always open to discussing new ideas and opportunities.
                        </p>
                    </div>

                    <div className="space-y-8">
                        <div className="flex items-start gap-6 group">
                            <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-brand-green/50 transition-colors">
                                <Mail className="w-6 h-6 text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-medium mb-1">Email</h3>
                                <a href="mailto:hello@themaplin.com" className="text-white/60 hover:text-white transition-colors">
                                    hello@themaplin.com
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-6 group">
                            <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-brand-green/50 transition-colors">
                                <Phone className="w-6 h-6 text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-medium mb-1">Phone</h3>
                                <a href="tel:+26772534203" className="text-white/60 hover:text-white transition-colors">
                                    +267 72 534 203
                                </a>
                            </div>
                        </div>

                        <div className="flex items-start gap-6 group">
                            <div className="p-4 rounded-full bg-white/5 border border-white/10 group-hover:border-brand-green/50 transition-colors">
                                <MapPin className="w-6 h-6 text-brand-green" />
                            </div>
                            <div>
                                <h3 className="text-white text-lg font-medium mb-1">Location</h3>
                                <p className="text-white/60">
                                    Plot 18680 Khuhurutse St Phase 2,<br />
                                    Gaborone
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Form Side */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 relative overflow-hidden backdrop-blur-sm">
                    {/* Decorative gradient blob */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-green/20 rounded-full blur-3xl pointer-events-none"></div>

                    <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                        <div className="space-y-2">
                            <label className="text-white/70 text-sm uppercase tracking-wider font-medium ml-1">Name</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="w-full bg-brand-dark/50 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-sm uppercase tracking-wider font-medium ml-1">Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full bg-brand-dark/50 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-all"
                                placeholder="john@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-sm uppercase tracking-wider font-medium ml-1">Subject</label>
                            <input
                                type="text"
                                name="subject"
                                value={formData.subject}
                                onChange={handleChange}
                                required
                                className="w-full bg-brand-dark/50 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-all"
                                placeholder="Project Inquiry"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/70 text-sm uppercase tracking-wider font-medium ml-1">Message</label>
                            <textarea
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                required
                                rows="4"
                                className="w-full bg-brand-dark/50 border border-white/20 rounded-xl px-4 py-4 text-white placeholder:text-white/20 focus:border-brand-green focus:ring-1 focus:ring-brand-green focus:outline-none transition-all resize-none"
                                placeholder="Tell me more about your project..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            disabled={status === 'loading' || status === 'success'}
                            className={`w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl text-lg font-medium transition-all duration-300 ${status === 'success'
                                ? 'bg-brand-green text-black cursor-default'
                                : 'bg-white text-black hover:bg-brand-green hover:text-white'
                                }`}
                        >
                            {status === 'loading' && <Loader2 className="w-5 h-5 animate-spin" />}
                            {status === 'success' && <span>Message Sent!</span>}
                            {status === 'error' && <span>Try Again</span>}
                            {status === 'idle' && (
                                <>
                                    <span>Send Message</span>
                                    <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>

                        {status === 'error' && (
                            <p className="text-red-400 text-center text-sm mt-2">
                                Something went wrong. Please try again later.
                            </p>
                        )}
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Contact;
