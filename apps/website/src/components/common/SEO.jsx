import React from 'react';
import { Helmet } from 'react-helmet-async';

const formatAbsoluteUrl = (pathOrUrl) => {
  if (!pathOrUrl) return 'https://rasalilabs.com';
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  const cleanPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `https://rasalilabs.com${cleanPath}`;
};

const SEO = ({
  title = 'Ras Ali Labs | Technology, Film, Web, Apps, Music & AI',
  description = 'Ras Ali Labs is a Botswana-based multidisciplinary technology and creative company delivering intelligent platforms, cinematic productions, digital experiences and original sound.',
  keywords = 'Ras Ali Labs, Film Production, Video Production, Web Development, Mobile Apps, Music Production, Sound Design, AI Automation, Ralion OS, Botswana, Gaborone',
  canonical,
  url, // Legacy fallback
  ogImage = '/assets/images/logo.png',
  image, // Legacy fallback
  ogType = 'website'
}) => {
  const targetCanonical = formatAbsoluteUrl(canonical || url || '/');
  const targetOgImage = formatAbsoluteUrl(ogImage || image || '/assets/images/logo.png');

  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={targetCanonical} />

      {/* OpenGraph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={targetOgImage} />
      <meta property="og:url" content={targetCanonical} />
      <meta property="og:site_name" content="Ras Ali Labs" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={targetOgImage} />
    </Helmet>
  );
};

export default SEO;
