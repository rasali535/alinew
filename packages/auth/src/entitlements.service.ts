/**
 * Ralion OS — Central Entitlement Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Resolves: organization -> subscription -> plan -> entitlements & quotas.
 * Enforces feature gating, usage limits, and active subscription states.
 */

import {
  SubscriptionPlanId,
  PlanEntitlements,
  SubscriptionStatus,
  BillingDatabaseService,
} from '@ralion/database';

export const PLAN_CATALOG: Record<SubscriptionPlanId, PlanEntitlements> = {
  COMMUNITY: {
    planId: 'COMMUNITY',
    name: 'Community (Free Forever)',
    description: 'Core business tools and essential CRM for solo entrepreneurs',
    monthlyPriceUsd: 0,
    monthlyCreditQuota: 100,
    maxWorkspaces: 1,
    maxSocialConnections: 1,
    maxTeamMembers: 2,
    features: {
      mariChat: true,
      fluxImages: true,
      cogvideoVideos: false,
      growthCampaigns: false,
      socialPublishing: true,
      marketResearch: false,
      biReporting: false,
      unlimitedWorkflows: false,
      sovereignCloud: false,
      prioritySupport: false,
    },
  },
  STARTER: {
    planId: 'STARTER',
    name: 'Starter / Standard',
    description: 'Affordable power package with AI visual generation and automated workflows',
    monthlyPriceUsd: 19,
    monthlyCreditQuota: 1000,
    maxWorkspaces: 3,
    maxSocialConnections: 3,
    maxTeamMembers: 5,
    features: {
      mariChat: true,
      fluxImages: true,
      cogvideoVideos: false,
      growthCampaigns: true,
      socialPublishing: true,
      marketResearch: true,
      biReporting: true,
      unlimitedWorkflows: false,
      sovereignCloud: false,
      prioritySupport: false,
    },
  },
  PROFESSIONAL: {
    planId: 'PROFESSIONAL',
    name: 'Professional',
    description: 'Full operational automation, commercial video generation & advanced growth AI',
    monthlyPriceUsd: 49,
    monthlyCreditQuota: 5000,
    maxWorkspaces: 10,
    maxSocialConnections: 10,
    maxTeamMembers: 20,
    features: {
      mariChat: true,
      fluxImages: true,
      cogvideoVideos: true,
      growthCampaigns: true,
      socialPublishing: true,
      marketResearch: true,
      biReporting: true,
      unlimitedWorkflows: true,
      sovereignCloud: false,
      prioritySupport: true,
    },
  },
  ENTERPRISE: {
    planId: 'ENTERPRISE',
    name: 'Enterprise Sovereign',
    description: 'Unlimited team branches, dedicated sovereign SLA, custom AI models & hardware',
    monthlyPriceUsd: 199,
    monthlyCreditQuota: 25000,
    maxWorkspaces: 999,
    maxSocialConnections: 999,
    maxTeamMembers: 999,
    features: {
      mariChat: true,
      fluxImages: true,
      cogvideoVideos: true,
      growthCampaigns: true,
      socialPublishing: true,
      marketResearch: true,
      biReporting: true,
      unlimitedWorkflows: true,
      sovereignCloud: true,
      prioritySupport: true,
    },
  },
};

export type EntitlementFeatureKey = keyof PlanEntitlements['features'];

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  planId: SubscriptionPlanId;
  status: SubscriptionStatus;
}

export interface QuotaCheckResult {
  allowed: boolean;
  currentCount: number;
  maxAllowed: number;
  reason?: string;
}

export class EntitlementService {
  /**
   * Resolves the effective plan and entitlements for an organization.
   * If a subscription is PAST_DUE, SUSPENDED, or CANCELED (after period end),
   * access drops to COMMUNITY entitlements.
   */
  static getEffectivePlan(organizationId: string): {
    plan: PlanEntitlements;
    status: SubscriptionStatus;
    isPastDue: boolean;
    periodEnd: string;
  } {
    if (!organizationId) {
      return {
        plan: PLAN_CATALOG.COMMUNITY,
        status: 'ACTIVE',
        isPastDue: false,
        periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      };
    }

    const sub = BillingDatabaseService.getSubscription(organizationId);
    const now = new Date();
    const periodEnd = new Date(sub.currentPeriodEnd);

    // If canceled and past current period end, drop to COMMUNITY
    if (sub.status === 'CANCELED' && now > periodEnd) {
      return {
        plan: PLAN_CATALOG.COMMUNITY,
        status: 'EXPIRED',
        isPastDue: false,
        periodEnd: sub.currentPeriodEnd,
      };
    }

    // If suspended or past due, drop to COMMUNITY
    if (sub.status === 'PAST_DUE' || sub.status === 'SUSPENDED' || sub.status === 'EXPIRED') {
      return {
        plan: PLAN_CATALOG.COMMUNITY,
        status: sub.status,
        isPastDue: true,
        periodEnd: sub.currentPeriodEnd,
      };
    }

    const plan = PLAN_CATALOG[sub.planId] || PLAN_CATALOG.COMMUNITY;
    return {
      plan,
      status: sub.status,
      isPastDue: false,
      periodEnd: sub.currentPeriodEnd,
    };
  }

  /**
   * Enforces feature access for an organization.
   */
  static checkFeature(organizationId: string, feature: EntitlementFeatureKey): EntitlementCheckResult {
    const { plan, status, isPastDue } = this.getEffectivePlan(organizationId);

    if (isPastDue) {
      return {
        allowed: false,
        reason: `Subscription is currently ${status}. Please update payment method in Billing.`,
        planId: plan.planId,
        status,
      };
    }

    const featureAllowed = Boolean(plan.features[feature]);
    if (!featureAllowed) {
      return {
        allowed: false,
        reason: `Feature '${feature}' requires an upgraded plan (Current: ${plan.name}).`,
        planId: plan.planId,
        status,
      };
    }

    return {
      allowed: true,
      planId: plan.planId,
      status,
    };
  }

  /**
   * Enforces resource quota limits (e.g. social connections, team members, workspaces).
   */
  static checkQuota(
    organizationId: string,
    resource: 'workspaces' | 'socialConnections' | 'teamMembers',
    currentCount: number
  ): QuotaCheckResult {
    const { plan } = this.getEffectivePlan(organizationId);
    let maxAllowed = 1;

    switch (resource) {
      case 'workspaces':
        maxAllowed = plan.maxWorkspaces;
        break;
      case 'socialConnections':
        maxAllowed = plan.maxSocialConnections;
        break;
      case 'teamMembers':
        maxAllowed = plan.maxTeamMembers;
        break;
    }

    const allowed = currentCount < maxAllowed;
    return {
      allowed,
      currentCount,
      maxAllowed,
      reason: allowed
        ? undefined
        : `Quota exceeded for ${resource}. Plan '${plan.name}' allows maximum ${maxAllowed} (Current: ${currentCount}).`,
    };
  }
}
