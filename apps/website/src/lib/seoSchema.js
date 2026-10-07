export const SITE_URL = 'https://rasalilabs.com';

export const organizationSchema = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'Ras Ali Labs (Pty) Ltd',
  alternateName: 'Ras Ali Labs',
  url: SITE_URL,
  logo: `${SITE_URL}/assets/images/logo.png`,
  email: 'contact@rasalilabs.com',
  telephone: '+26772113009',
  founder: { '@id': `${SITE_URL}/about#alpheaus-chiwaze` },
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot 18680 Khuhurutse Drive, Phase 2',
    addressLocality: 'Gaborone',
    addressCountry: 'BW',
  },
  areaServed: [
    { '@type': 'Country', name: 'Botswana' },
    { '@type': 'AdministrativeArea', name: 'Southern Africa' },
  ],
};

export const localBusinessSchema = {
  '@type': 'ProfessionalService',
  '@id': `${SITE_URL}/#localbusiness`,
  name: 'Ras Ali Labs',
  url: SITE_URL,
  image: `${SITE_URL}/assets/images/logo.png`,
  email: 'contact@rasalilabs.com',
  telephone: '+26772113009',
  priceRange: '$$',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Plot 18680 Khuhurutse Drive, Phase 2',
    addressLocality: 'Gaborone',
    addressCountry: 'BW',
  },
  areaServed: { '@type': 'Country', name: 'Botswana' },
};

export const personSchema = {
  '@type': 'Person',
  '@id': `${SITE_URL}/about#alpheaus-chiwaze`,
  name: 'Alpheaus Chiwaze',
  alternateName: 'Ras Ali',
  url: `${SITE_URL}/about`,
  jobTitle: 'Founder & Creative Technologist',
  worksFor: { '@id': `${SITE_URL}/#organization` },
  sameAs: ['https://github.com/rasali535'],
  knowsAbout: [
    'Software engineering',
    'Artificial intelligence',
    'Business automation',
    'Film and television production',
    'Music and audio production',
  ],
};

export const makeBreadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
  })),
});

export const makeServiceSchema = ({ name, description, url, serviceType, image }) => ({
  '@type': 'Service',
  '@id': `${SITE_URL}${url}#service`,
  name,
  description,
  serviceType,
  url: `${SITE_URL}${url}`,
  image: image ? `${SITE_URL}${image}` : `${SITE_URL}/assets/images/logo.png`,
  provider: { '@id': `${SITE_URL}/#organization` },
  areaServed: [
    { '@type': 'City', name: 'Gaborone' },
    { '@type': 'Country', name: 'Botswana' },
  ],
});

export const makeFaqSchema = (items) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
});
