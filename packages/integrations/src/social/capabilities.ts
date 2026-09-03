/**
 * Central Social Account Classification & Capability Resolver
 * Ralion OS — Ras Ali Labs (Pty) Ltd
 *
 * Distinguishes:
 * - FACEBOOK_PAGE (Business Page) vs FACEBOOK_PERSONAL_PROFILE (Personal User Profile)
 * - Decouples Business Page features (posts, analytics, followers, business learning)
 *   from Personal Profiles.
 */

export type SocialAccountClassification =
  | 'FACEBOOK_PAGE'
  | 'FACEBOOK_PERSONAL_PROFILE'
  | 'LINKEDIN_PAGE'
  | 'LINKEDIN_PROFILE'
  | 'INSTAGRAM_BUSINESS'
  | 'UNKNOWN';

export interface SocialConnectionCapabilities {
  classification: SocialAccountClassification;
  accountTypeLabel: 'Business Page' | 'Personal Profile' | 'Social Account';
  isBusinessPage: boolean;
  isPersonalProfile: boolean;
  canReadPosts: boolean;
  canReadPageAnalytics: boolean;
  canReadPageFollowers: boolean;
  canPublishPage: boolean;
  canSchedulePage: boolean;
  canContributeToBusinessLearning: boolean;
  unavailabilityReason?: string;
}

/**
 * Authoritatively determines account classification from connection properties.
 * Never guesses from account name.
 */
export function resolveAccountClassification(conn: {
  provider?: string;
  account_type?: string;
  metadata?: any;
  category?: string;
}): SocialAccountClassification {
  const provider = (conn.provider || '').toLowerCase();
  const rawType = (conn.account_type || '').toUpperCase();
  const meta = conn.metadata || {};
  const metaType = (meta.provider_account_type || meta.account_type || '').toUpperCase();
  const category = (conn.category || meta.category || '').toUpperCase();

  if (provider === 'facebook') {
    // Check explicit metadata / classification
    if (metaType === 'FACEBOOK_PAGE' || rawType === 'FACEBOOK_PAGE') {
      return 'FACEBOOK_PAGE';
    }
    if (metaType === 'FACEBOOK_PERSONAL_PROFILE' || rawType === 'FACEBOOK_PERSONAL_PROFILE') {
      return 'FACEBOOK_PERSONAL_PROFILE';
    }

    // Check category / user profile markers
    if (category === 'USER_PROFILE' || rawType === 'PERSONAL' || meta.facebookUserId || !meta.pageId) {
      return 'FACEBOOK_PERSONAL_PROFILE';
    }

    // Default Facebook business page if pageId is present or rawType is BUSINESS / PAGE
    if (meta.pageId || rawType === 'BUSINESS' || rawType === 'PAGE') {
      return 'FACEBOOK_PAGE';
    }

    return 'FACEBOOK_PERSONAL_PROFILE';
  }

  if (provider === 'linkedin') {
    if (rawType === 'BUSINESS' || rawType === 'PAGE' || meta.organizationId) {
      return 'LINKEDIN_PAGE';
    }
    return 'LINKEDIN_PROFILE';
  }

  if (provider === 'instagram') {
    return 'INSTAGRAM_BUSINESS';
  }

  return 'UNKNOWN';
}

/**
 * Returns strict, authoritative capabilities for a social connection.
 */
export function getSocialConnectionCapabilities(conn: {
  provider?: string;
  account_type?: string;
  metadata?: any;
  category?: string;
}): SocialConnectionCapabilities {
  const classification = resolveAccountClassification(conn);

  if (classification === 'FACEBOOK_PAGE') {
    return {
      classification,
      accountTypeLabel: 'Business Page',
      isBusinessPage: true,
      isPersonalProfile: false,
      canReadPosts: true,
      canReadPageAnalytics: true,
      canReadPageFollowers: true,
      canPublishPage: true,
      canSchedulePage: true,
      canContributeToBusinessLearning: true,
    };
  }

  if (classification === 'FACEBOOK_PERSONAL_PROFILE') {
    return {
      classification,
      accountTypeLabel: 'Personal Profile',
      isBusinessPage: false,
      isPersonalProfile: true,
      canReadPosts: false,
      canReadPageAnalytics: false,
      canReadPageFollowers: false,
      canPublishPage: false,
      canSchedulePage: false,
      canContributeToBusinessLearning: false,
      unavailabilityReason: 'Personal Facebook profiles do not provide Page posts, Page analytics, or business insights.',
    };
  }

  // Generic/fallback handling
  return {
    classification,
    accountTypeLabel: 'Social Account',
    isBusinessPage: false,
    isPersonalProfile: false,
    canReadPosts: true,
    canReadPageAnalytics: false,
    canReadPageFollowers: false,
    canPublishPage: false,
    canSchedulePage: false,
    canContributeToBusinessLearning: false,
    unavailabilityReason: 'Capabilities are restricted for this provider type.',
  };
}
