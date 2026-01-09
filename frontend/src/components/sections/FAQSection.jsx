import React, { useState } from 'react';
import { faqs } from '../../data/mock';
import { Plus, Minus } from 'lucide-react';

const FAQItem = ({ faq, isOpen, onToggle }) => (
  <div
    className="border-b border-white/10 py-6 cursor-pointer group"
    onClick={onToggle}
  >
    <div className="flex items-center justify-between">
      <h3 className="text-white text-lg md:text-xl font-light group-hover:text-lime-400 transition-colors duration-300 pr-4">
        {faq.question}
      </h3>
      <div className="flex-shrink-0">
        {isOpen ? (
          <Minus className="w-5 h-5 text-lime-400" />
        ) : (
          <Plus className="w-5 h-5 text-white/50 group-hover:text-lime-400 transition-colors duration-300" />
        )}
      </div>
    </div>
    <div
      className={`overflow-hidden transition-all duration-500 ${
        isOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
      }`}
    >
      <p className="text-white/60 text-sm leading-relaxed">{faq.answer}</p>
    </div>
  </div>
);

const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(null);

  return (
    <section className="bg-[#0a0a0a] py-20">
      {/* Section Header */}
      <div className="px-6 lg:px-12 mb-8">
        <div className="flex items-center justify-between text-white/50 text-xs">
          <span>© Everything You Want to Know</span>
          <span>(CAD® — 08)</span>
          <span>Clarifications</span>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-12 mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Left - Image & Title */}
          <div>
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-white/5 mb-8">
              <img
                src="https://images.unsplash.com/photo-1559028012-481c04fa702d?w=400&h=500&fit=crop"
                alt="FAQ"
                className="w-full h-full object-cover"
              />
            </div>
            <h2 className="text-white text-6xl md:text-7xl lg:text-8xl font-light tracking-tight">
              FAQ.
            </h2>
          </div>

          {/* Right - FAQ List */}
          <div className="lg:pt-20">
            {faqs.map((faq, index) => (
              <FAQItem
                key={index}
                faq={faq}
                isOpen={openIndex === index}
                onToggle={() => setOpenIndex(openIndex === index ? null : index)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
