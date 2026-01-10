import React, { useState } from 'react';

const Booking = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        service: '',
        message: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Start simulating simple submission
        alert(`Thank you ${formData.name}! Your booking request for ${formData.service} has been received.`);
        setFormData({ name: '', email: '', service: '', message: '' });
    };

    return (
        <section className="min-h-screen bg-[#0a0a0a] pt-32 pb-20 px-6 lg:px-12 flex items-center">
            <div className="max-w-4xl mx-auto w-full">
                <div className="text-center mb-16">
                    <h1 className="text-white text-5xl md:text-7xl lg:text-8xl font-light tracking-tight mb-6">
                        BOOKING
                    </h1>
                    <p className="text-white/50 text-lg">
                        Ready to start a project? Tell me about your needs.
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
                                    className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition-colors"
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
                                    className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition-colors"
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
                                className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition-colors"
                            >
                                <option value="" disabled>Select a service</option>
                                <option value="Bass Recording/Performance">Bass Recording/Performance</option>
                                <option value="Sound Engineering/Mixing">Sound Engineering/Mixing</option>
                                <option value="Video Production">Video Production</option>
                                <option value="Web Development">Web Development</option>
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
                                className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-4 py-3 text-white focus:border-lime-400 focus:outline-none transition-colors"
                                placeholder="Tell me about your project..."
                            ></textarea>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-lime-400 text-black font-medium py-4 rounded-full text-lg hover:bg-white transition-colors duration-300"
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
