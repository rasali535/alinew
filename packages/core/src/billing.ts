import { LicenseTier } from '@ralion/auth';

export interface LicenseLimits {
  maxUsers: number;
  maxStorageMb: number;
  aiCreditsPerMonth: number;
  allowWorkflows: boolean;
  allowIndustryModules: boolean;
  allowCustomRoles: boolean;
}

export const TIER_LIMITS: Record<LicenseTier, LicenseLimits> = {
  COMMUNITY: {
    maxUsers: 5,
    maxStorageMb: 1024, // 1 GB
    aiCreditsPerMonth: 100,
    allowWorkflows: false,
    allowIndustryModules: false,
    allowCustomRoles: false
  },
  PROFESSIONAL: {
    maxUsers: 25,
    maxStorageMb: 10240, // 10 GB
    aiCreditsPerMonth: 2500,
    allowWorkflows: true,
    allowIndustryModules: true,
    allowCustomRoles: true
  },
  ENTERPRISE: {
    maxUsers: 999999,
    maxStorageMb: 1024000, // 1 TB
    aiCreditsPerMonth: 50000,
    allowWorkflows: true,
    allowIndustryModules: true,
    allowCustomRoles: true
  }
};

export function isFeatureAllowed(tier: LicenseTier, feature: keyof LicenseLimits): boolean | number {
  return TIER_LIMITS[tier][feature];
}
