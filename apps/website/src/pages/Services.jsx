import React from 'react';
import SEO from '../components/common/SEO';
import ServicesPageGrid from '../components/sections/ServicesPageGrid';

const Services = () => {
  return (
    <div>
      <SEO
        title="Enterprise AI Systems & Solutions | Ras Ali Labs"
        description="Ras Ali Labs engineers sovereign business operating systems, automated data pipelines, custom AI agents, and enterprise infrastructure."
        url="/services"
      />
      <ServicesPageGrid />
    </div>
  );
};

export default Services;
