import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import SEO from '../components/common/SEO';
import { services } from '../data/mock';

const Booking = () => {
    const { serviceId } = useParams();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        service: '',
        message: ''
    });

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

        try {
            // Use environment variable or fallback to relative path
            // Construct API URL based on environment
            // In dev (empty base): /api/booking (uses proxy)
            // In prod (defined base): https://.../api/booking
            const baseUrl = process.env.REACT_APP_API_BASE_URL || '';
            const apiUrl = `${baseUrl}/api/booking`;

            console.log('Sending booking to:', apiUrl);

            const response = await axios.post(apiUrl, formData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.data && response.data.message) {
                alert(`Thank you ${formData.name}! Your booking request for ${formData.service} has been sent.`);
                setFormData({ name: '', email: '', service: '', message: '' });
            } else {
                console.error('Unexpected response:', response);
                throw new Error('Invalid response format from server');
            }
        } catch (error) {
            console.error('Error sending booking:', error);
            let errorMessage = error.message;

            if (error.response?.data?.detail) {
                errorMessage = error.response.data.detail;
            } else if (typeof error.response?.data === 'string' && error.response.data.includes('<!DOCTYPE html>')) {
                errorMessage = 'Backend Not Reachable (Serving HTML). Ensure Backend is running on port 8000.';
            }

            alert(`Error: ${errorMessage}. Please try again or contact us directly at hello@themaplin.com`);
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

                <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-2">
                                <label className="text-white/70 text-sm uppercase tracking-wider">Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-brand-green focus:outline-none transition-colors"
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
                                    className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-brand-green focus:outline-none transition-colors"
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
                                className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-brand-green focus:outline-none transition-colors"
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
                                className="w-full bg-brand-dark border border-white/20 rounded-lg px-4 py-3 text-white focus:border-brand-green focus:outline-none transition-colors"
                                placeholder="Tell me about your project..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-brand-green text-black font-medium py-4 rounded-full text-lg hover:bg-white transition-colors duration-300"
                        >
                            Send Booking Request
                        </button>
                    </form>
                </div>
            </div>
        </section>
    );
};

export default Booking;
