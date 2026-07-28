import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title = 'Ras Ali Labs | Empowered to Prosper',
  description = 'Ras Ali Labs is the central enterprise software, AI operating system, and sovereign trade platform hub. Powered by Ralion and Mari AI.',
  keywords = 'Ralion, Ras Ali Labs, AI Business Operating System, Mari AI, TradeGrid Africa, DFS Platform, Enterprise Software, USSD Gateway',
  canonical,
  ogImage = '/assets/images/logo.png',
  ogType = 'website'
}) => {
  const currentUrl = canonical || (typeof window !== 'undefined' ? window.location.href : 'https://rasalilabs.com');

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={currentUrl} />

      {/* OpenGraph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:site_name" content="Ras Ali Labs" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Helmet>
  );
};

export default SEO;
