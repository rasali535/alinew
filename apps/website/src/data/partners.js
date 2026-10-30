// Centralized Technology Partners Configuration for Ras Ali Labs (Pty) Ltd
// Governance Policy:
// 1. Only partners with fully executed bilateral agreements and explicit branding/publication rights
//    may have `isPublished: true`.
// 2. Unexecuted or pending agreements must remain `isPublished: false` or feature-flagged until executed.
// 3. Do not confuse clients, project portfolio entries, software vendors, or strategic partners.

export const partnerCategories = [
  {
    id: 'cybersecurity',
    title: 'Cybersecurity Partners',
    shortTitle: 'Cybersecurity',
    description: 'Specialist cybersecurity expertise, penetration testing, vulnerability assessments, and technical defensive capabilities.'
  },
  {
    id: 'infrastructure',
    title: 'Technology & Infrastructure Partners',
    shortTitle: 'Infrastructure',
    description: 'Cloud compute, sovereign hosting, enterprise network delivery, and managed infrastructure providers.'
  },
  {
    id: 'software',
    title: 'Software & Integration Partners',
    shortTitle: 'Software & Integration',
    description: 'Specialized business platforms, API systems, communication gateways, and developer ecosystem partners.'
  },
  {
    id: 'strategic',
    title: 'Strategic & Delivery Partners',
    shortTitle: 'Strategic & Delivery',
    description: 'Regional delivery organizations, enterprise implementation teams, and collaborative institutional initiatives.'
  }
];

export const partners = [
  {
    id: 'shieldbyte-infosec',
    name: 'ShieldByte Infosec',
    category: 'cybersecurity',
    categoryTitle: 'Cybersecurity Partners',
    logo: '/assets/images/partners/shieldbyte.svg',
    website: 'https://shieldbyteinfosec.com',
    shortDescription: 'Ras Ali Labs collaborates with ShieldByte Infosec to connect businesses with specialist cybersecurity expertise, security assessments and digital protection solutions.',
    fullDescription: 'Ras Ali Labs collaborates with ShieldByte Infosec to connect businesses with specialist cybersecurity expertise, security assessments and digital protection solutions. Through this planned channel collaboration, clients can access specialist penetration testing, technical vulnerability analysis, and remediation oversight.',
    collaborationScope: [
      'Vulnerability Assessments & Penetration Testing',
      'Web Application & API Security Audits',
      'Network Vulnerability Exploitation & Defensive Evaluation',
      'Specialist Technical Remediation Oversight'
    ],
    region: 'Botswana, Southern Africa & International',
    // Strict publication governance:
    // ShieldByte V1.1 channel partner agreement must be fully executed by both parties,
    // and partner branding/publication rights must be confirmed before this entry is made public as an active partnership.
    isPublished: false,
    status: 'pending_execution', // 'active' | 'pending_execution' | 'archived'
    agreementRef: 'ShieldByte Channel Partner Agreement V1.1',
    publicationNote: 'Agreement pending bilateral execution and formal branding release. Entry prepared in draft state per governance mandate.'
  }
];

/**
 * Returns all publicly approved and active partners.
 * Strictest filter: only `isPublished === true && status === 'active'`.
 */
export const getPublishedPartners = () => {
  return partners.filter((p) => p.isPublished === true && p.status === 'active');
};

/**
 * Returns all partner records including draft/pending entries (useful for review & administrative verification).
 */
export const getAllPartners = () => {
  return partners;
};

/**
 * Returns a specific partner by ID.
 */
export const getPartnerById = (id) => {
  return partners.find((p) => p.id === id);
};

/**
 * Checks if there are any published partners ready for public directory display.
 */
export const hasPublishedPartners = () => {
  return getPublishedPartners().length > 0;
};

/**
 * Returns only categories that contain approved public partners,
 * or all categories if includeUnpublished is true.
 */
export const getApprovedCategories = (includeUnpublished = false) => {
  const activePartners = includeUnpublished ? partners : getPublishedPartners();
  const categoryIdsWithPartners = new Set(activePartners.map((p) => p.category));
  return partnerCategories.filter((cat) => categoryIdsWithPartners.has(cat.id));
};

/**
 * Returns partners filtered by category.
 */
export const getPartnersByCategory = (categoryId, includeUnpublished = false) => {
  const source = includeUnpublished ? partners : getPublishedPartners();
  return source.filter((p) => p.category === categoryId);
};

export const partnerProgramOverview = {
  sectionTitle: 'Our Technology Partners',
  headline: 'Our Technology Partners',
  supportingText: 'Working with specialist technology providers to deliver practical, dependable solutions for businesses in Botswana and beyond.',
  governanceCommitment: 'Ras Ali Labs maintains high standards of technical competence, customer confidentiality, and bilateral accountability. We only publish verified, authorized partnerships with executed agreements.',
  partnershipValues: [
    {
      title: 'Vetted Expertise',
      description: 'We collaborate with domain specialists whose technical capabilities and ethical track record meet rigorous corporate requirements.'
    },
    {
      title: 'Bilateral Accountability',
      description: 'Every official partner relationship is founded on clear contractual agreements, service level expectations, and mutual governance.'
    },
    {
      title: 'Client Confidentiality',
      description: 'Strict non-disclosure commitments and adherence to the Botswana Data Protection Act (Act 32) protect all shared customer information.'
    }
  ]
};
