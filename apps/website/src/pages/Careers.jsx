import React from 'react';
import SEO from '../components/common/SEO';

const Careers = () => {
  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12">
      <SEO
        title="Careers | Ras Ali Labs"
        description="Join Ras Ali Labs and help build the future of AI operating systems."
      />
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Team</h1>
        <p className="text-white/70 text-lg mb-12">
          We are currently not hiring, but we are always looking for exceptional talent.
          Check back later for open positions.
        </p>
      </div>
    </div>
  );
};

export default Careers;
