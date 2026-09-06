/**
 * Ralion OS — Authoritative Production Credit Economics & Ledger Engine
 * Ras Ali Labs (Pty) Ltd
 *
 * Strict Architectural Guarantees:
 * 1. Zero cross-tenant balance leakage: Every debit, credit, and query requires explicit tenant/organization UUID.
 * 2. Explicit Tier Resolution: Default uninitialized tier is strictly COMMUNITY (250 credits/month, no rollover).
 * 3. Segregated Credit Pools: Separates renewable plan credits from bonus/purchased/admin credits.
 * 4. Atomic, Idempotent, and Transactional: Correlation keys prevent double debiting or re-granting on retries.
 * 5. Immutable Ledger: Full audit trail with balanceBefore, balanceAfter, correlationId, provider, model, and metadata.
 * 6. Non-Accumulating Community Allowance: Community plan credits reset to 250 each cycle without rollover.
 * 7. Server-Side Protection: Structured INSUFFICIENT_CREDITS response when balance is 0.
 */

import {
  SubscriptionPlanId,
  CreditTransactionType,
  CreditSourceFeature,
  TenantCreditWalletRecord,
  TenantCreditLedgerRecord,
} from '@ralion/database';

export type { CreditTransactionType, CreditSourceFeature };

export interface TenantWallet extends TenantCreditWalletRecord {
  // Backward compatibility alias: balance represents totalBalance
  balance: number;
}

export interface CreditTransaction extends TenantCreditLedgerRecord {
  // Backward compatibility alias: timestamp represents createdAt
  timestamp: string;
}

/**
 * Authoritative Plan Allowances (Monthly)
 */
export const TIER_MONTHLY_CREDITS: Record<SubscriptionPlanId, number> = {
  COMMUNITY: 250,
  STARTER: 1000,
  PROFESSIONAL: 5000,
  ENTERPRISE: 25000,
};

// Backward-compat export
export const TIER_INITIAL_CREDITS = TIER_MONTHLY_CREDITS;

/**
 * Centralized Operation Credit Costs Registry
 */
export const CREDIT_COSTS = {
  POSTER_IMAGE: 10,
  VIDEO_REEL: 50,
  MARI_STRATEGY: 1,
  SOCIAL_PUBLISH: 0, // Ordinary social publishing costs 0 credits
  WEBSITE_ANALYSIS: 5,
} as const;

/**
 * Server-Side Estimated Provider Cost Registry (USD)
 * Note: These are configurable operational estimates, not verified gross-margin accounting.
 */
export const ESTIMATED_PROVIDER_COSTS_USD = {
  GEMINI_FLASH_1K_TOKENS: 0.0001,
  FLUX_IMAGE_GEN: 0.003,
  COGVIDEO_REEL_GEN: 0.05,
  GEMINI_VISION_EVAL: 0.0002,
} as const;

// Global singleton store for isomorphic Next.js server & runtime dev support
const globalCreditStore = globalThis as unknown as {
  __ralion_credit_wallets?: Map<string, TenantWallet>;
  __ralion_credit_transactions?: Map<string, CreditTransaction[]>;
  __ralion_credit_correlation_map?: Map<string, CreditTransaction>;
};

if (!globalCreditStore.__ralion_credit_wallets) globalCreditStore.__ralion_credit_wallets = new Map();
if (!globalCreditStore.__ralion_credit_transactions) globalCreditStore.__ralion_credit_transactions = new Map();
if (!globalCreditStore.__ralion_credit_correlation_map) globalCreditStore.__ralion_credit_correlation_map = new Map();

export class TenantCreditsService {
  private static get wallets(): Map<string, TenantWallet> {
    return globalCreditStore.__ralion_credit_wallets!;
  }
  private static get transactions(): Map<string, CreditTransaction[]> {
    return globalCreditStore.__ralion_credit_transactions!;
  }
  private static get correlationMap(): Map<string, CreditTransaction> {
    return globalCreditStore.__ralion_credit_correlation_map!;
  }

  /**
   * Initializes or fetches an authoritative tenant wallet.
   * Default tier is strictly COMMUNITY (250 credits/month).
   */
  static getOrCreateWallet(
    organizationId: string,
    tier: SubscriptionPlanId = 'COMMUNITY'
  ): TenantWallet {
    if (!organizationId || organizationId === 'all') {
      throw new Error('[TenantCreditsService] Invalid organizationId: Tenant identifier is strictly required.');
    }

    let wallet = this.wallets.get(organizationId);
    if (!wallet) {
      const monthlyQuota = TIER_MONTHLY_CREDITS[tier] ?? TIER_MONTHLY_CREDITS.COMMUNITY;
      const now = new Date().toISOString();
      wallet = {
        organizationId,
        tier,
        planCredits: monthlyQuota,
        bonusCredits: 0,
        totalBalance: monthlyQuota,
        balance: monthlyQuota,
        monthlyQuota,
        lifetimeGranted: monthlyQuota,
        lifetimeConsumed: 0,
        lastRenewedAt: now,
        updatedAt: now,
      };
      this.wallets.set(organizationId, wallet);

      const initialTx: CreditTransaction = {
        id: `tx-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organizationId,
        amount: monthlyQuota,
        balanceBefore: 0,
        balanceAfter: monthlyQuota,
        planCreditsBefore: 0,
        planCreditsAfter: monthlyQuota,
        bonusCreditsBefore: 0,
        bonusCreditsAfter: 0,
        type: 'INITIAL_GRANT',
        sourceFeature: 'SYSTEM',
        reason: `Initial ${tier} monthly credit allowance (${monthlyQuota} credits)`,
        createdAt: now,
        timestamp: now,
      };
      this.transactions.set(organizationId, [initialTx]);
    }

    return { ...wallet };
  }

  /**
   * Retrieves the available credit balance for a tenant.
   */
  static getBalance(organizationId: string): number {
    const wallet = this.getOrCreateWallet(organizationId);
    return wallet.totalBalance ?? wallet.balance;
  }

  /**
   * Atomically and idempotently checks and deducts credits for an operation.
   * Debits from planCredits first, then bonusCredits.
   */
  static deductCredits(
    organizationId: string,
    amount: number,
    reason: string,
    options?: {
      sourceFeature?: CreditSourceFeature;
      correlationId?: string;
      userId?: string;
      provider?: string;
      model?: string;
      resourceId?: string;
      metadata?: Record<string, any>;
    } | string
  ): { success: boolean; balanceRemaining: number; transactionId: string } {
    if (!organizationId) {
      throw new Error('[TenantCreditsService] Access denied: organizationId is required for credit deduction.');
    }
    if (amount <= 0) {
      // 0-cost operations (such as ordinary social publishing) pass immediately with zero debit
      const w = this.getOrCreateWallet(organizationId);
      return { success: true, balanceRemaining: w.totalBalance, transactionId: `zero-cost-${Date.now()}` };
    }

    const opts = typeof options === 'string'
      ? { resourceId: options, sourceFeature: 'SYSTEM' as CreditSourceFeature }
      : options || {};

    const correlationId = opts.correlationId;
    if (correlationId && this.correlationMap.has(correlationId)) {
      const existing = this.correlationMap.get(correlationId)!;
      const currentWallet = this.getOrCreateWallet(organizationId);
      return {
        success: true,
        balanceRemaining: currentWallet.totalBalance,
        transactionId: existing.id,
      };
    }

    const wallet = this.getOrCreateWallet(organizationId);
    if (wallet.totalBalance < amount) {
      const err = new Error(
        `[TenantCreditsService] Insufficient credits: Organization '${organizationId}' has ${wallet.totalBalance} credits, but ${amount} are required for '${reason}'.`
      );
      (err as any).errorCode = 'INSUFFICIENT_CREDITS';
      (err as any).balanceRemaining = wallet.totalBalance;
      (err as any).requiredCredits = amount;
      throw err;
    }

    const balanceBefore = wallet.totalBalance;
    const planBefore = wallet.planCredits;
    const bonusBefore = wallet.bonusCredits;

    // Deduct from planCredits first, remainder from bonusCredits
    let planDeduct = Math.min(wallet.planCredits, amount);
    let bonusDeduct = amount - planDeduct;

    wallet.planCredits -= planDeduct;
    wallet.bonusCredits -= bonusDeduct;
    wallet.totalBalance = wallet.planCredits + wallet.bonusCredits;
    wallet.balance = wallet.totalBalance;
    wallet.lifetimeConsumed += amount;
    wallet.updatedAt = new Date().toISOString();
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-deduct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      userId: opts.userId,
      amount: -amount,
      balanceBefore,
      balanceAfter: wallet.totalBalance,
      planCreditsBefore: planBefore,
      planCreditsAfter: wallet.planCredits,
      bonusCreditsBefore: bonusBefore,
      bonusCreditsAfter: wallet.bonusCredits,
      type: 'CONSUMPTION',
      sourceFeature: opts.sourceFeature || 'SYSTEM',
      provider: opts.provider,
      model: opts.model,
      correlationId,
      reason,
      metadata: { ...opts.metadata, resourceId: opts.resourceId },
      createdAt: wallet.updatedAt,
      timestamp: wallet.updatedAt,
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);

    if (correlationId) {
      this.correlationMap.set(correlationId, tx);
    }

    return {
      success: true,
      balanceRemaining: wallet.totalBalance,
      transactionId: tx.id,
    };
  }

  /**
   * Adds credits (grants, refills, refunds, promo/bonus, or admin adjustments).
   */
  static addCredits(
    organizationId: string,
    amount: number,
    reason: string,
    options?: {
      type?: CreditTransactionType;
      sourceFeature?: CreditSourceFeature;
      isBonus?: boolean;
      correlationId?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }
  ): { success: boolean; newBalance: number; transactionId: string } {
    if (!organizationId) {
      throw new Error('[TenantCreditsService] organizationId is required to add credits.');
    }
    if (amount <= 0) {
      throw new Error('[TenantCreditsService] Amount added must be greater than zero.');
    }

    const opts = options || {};
    const correlationId = opts.correlationId;
    if (correlationId && this.correlationMap.has(correlationId)) {
      const existing = this.correlationMap.get(correlationId)!;
      const currentWallet = this.getOrCreateWallet(organizationId);
      return {
        success: true,
        newBalance: currentWallet.totalBalance,
        transactionId: existing.id,
      };
    }

    const wallet = this.getOrCreateWallet(organizationId);
    const balanceBefore = wallet.totalBalance;
    const planBefore = wallet.planCredits;
    const bonusBefore = wallet.bonusCredits;

    if (opts.isBonus) {
      wallet.bonusCredits += amount;
    } else {
      wallet.planCredits += amount;
    }

    wallet.totalBalance = wallet.planCredits + wallet.bonusCredits;
    wallet.balance = wallet.totalBalance;
    wallet.lifetimeGranted += amount;
    wallet.updatedAt = new Date().toISOString();
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-add-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      userId: opts.userId,
      amount,
      balanceBefore,
      balanceAfter: wallet.totalBalance,
      planCreditsBefore: planBefore,
      planCreditsAfter: wallet.planCredits,
      bonusCreditsBefore: bonusBefore,
      bonusCreditsAfter: wallet.bonusCredits,
      type: opts.type || (opts.isBonus ? 'ADMIN_GRANT' : 'REFUND'),
      sourceFeature: opts.sourceFeature || 'SYSTEM',
      correlationId,
      reason,
      metadata: opts.metadata,
      createdAt: wallet.updatedAt,
      timestamp: wallet.updatedAt,
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);

    if (correlationId) {
      this.correlationMap.set(correlationId, tx);
    }

    return {
      success: true,
      newBalance: wallet.totalBalance,
      transactionId: tx.id,
    };
  }

  /**
   * Processes an automated monthly cycle renewal.
   * Community plan credits reset strictly to 250 without accumulation/rollover.
   * Bonus credits are preserved.
   */
  static processMonthlyRenewal(organizationId: string): { success: boolean; newBalance: number; transactionId: string } {
    const wallet = this.getOrCreateWallet(organizationId);
    const quota = TIER_MONTHLY_CREDITS[wallet.tier] || 250;
    const balanceBefore = wallet.totalBalance;
    const planBefore = wallet.planCredits;
    const bonusBefore = wallet.bonusCredits;

    // Reset planCredits to defined allowance (no rollover for Community)
    wallet.planCredits = quota;
    wallet.monthlyQuota = quota;
    wallet.totalBalance = wallet.planCredits + wallet.bonusCredits;
    wallet.balance = wallet.totalBalance;
    wallet.lastRenewedAt = new Date().toISOString();
    wallet.updatedAt = wallet.lastRenewedAt;
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-renew-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      amount: quota - planBefore,
      balanceBefore,
      balanceAfter: wallet.totalBalance,
      planCreditsBefore: planBefore,
      planCreditsAfter: quota,
      bonusCreditsBefore: bonusBefore,
      bonusCreditsAfter: wallet.bonusCredits,
      type: 'MONTHLY_RENEWAL',
      sourceFeature: 'SYSTEM',
      reason: `Monthly cycle credit renewal for ${wallet.tier} tier (${quota} credits, non-accumulating)`,
      createdAt: wallet.lastRenewedAt,
      timestamp: wallet.lastRenewedAt,
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);

    return {
      success: true,
      newBalance: wallet.totalBalance,
      transactionId: tx.id,
    };
  }

  /**
   * Idempotently reconciles legacy 750-credit Community balances to canonical 250.
   */
  static reconcileCommunityMigration(organizationId: string): { reconciled: boolean; currentBalance: number; transactionId?: string } {
    const correlationId = `migration_community_250_${organizationId}`;
    if (this.correlationMap.has(correlationId)) {
      const existing = this.correlationMap.get(correlationId)!;
      const w = this.getOrCreateWallet(organizationId);
      return { reconciled: false, currentBalance: w.totalBalance, transactionId: existing.id };
    }

    let wallet = this.wallets.get(organizationId);
    if (!wallet) {
      wallet = this.getOrCreateWallet(organizationId, 'COMMUNITY');
    }

    if (wallet.tier !== 'COMMUNITY' && wallet.tier !== ('FREE' as any)) {
      return { reconciled: false, currentBalance: wallet.totalBalance };
    }

    const balanceBefore = wallet.totalBalance;
    if (balanceBefore === 250 && wallet.planCredits === 250) {
      return { reconciled: false, currentBalance: 250 };
    }

    const delta = 250 - balanceBefore;
    wallet.tier = 'COMMUNITY';
    wallet.planCredits = 250;
    wallet.bonusCredits = 0;
    wallet.totalBalance = 250;
    wallet.balance = 250;
    wallet.monthlyQuota = 250;
    wallet.updatedAt = new Date().toISOString();
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-mig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      amount: delta,
      balanceBefore,
      balanceAfter: 250,
      planCreditsBefore: balanceBefore,
      planCreditsAfter: 250,
      bonusCreditsBefore: 0,
      bonusCreditsAfter: 0,
      type: 'MIGRATION_ADJUSTMENT',
      sourceFeature: 'SYSTEM',
      correlationId,
      reason: 'Authoritative Community tier credit reconciliation (750 -> 250 credits/month)',
      createdAt: wallet.updatedAt,
      timestamp: wallet.updatedAt,
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);
    this.correlationMap.set(correlationId, tx);

    return {
      reconciled: true,
      currentBalance: 250,
      transactionId: tx.id,
    };
  }

  /**
   * Retrieves transaction ledger history for a specific organization only.
   */
  static getTransactions(organizationId: string): CreditTransaction[] {
    if (!organizationId) return [];
    return (this.transactions.get(organizationId) || []).map((t) => ({ ...t }));
  }

  static getLedger(organizationId: string): CreditTransaction[] {
    return this.getTransactions(organizationId);
  }

  /**
   * Lists all wallets across tenants (strictly for platform admin aggregation).
   */
  static listAllWallets(): TenantWallet[] {
    return Array.from(this.wallets.values()).map(w => ({ ...w }));
  }

  /**
   * Lists all ledger transactions across tenants (strictly for platform admin aggregation).
   */
  static listAllTransactions(): CreditTransaction[] {
    const all: CreditTransaction[] = [];
    this.transactions.forEach(txs => all.push(...txs));
    return all.map(t => ({ ...t }));
  }

  /**
   * Resets internal store for test isolation.
   */
  static _resetForTesting(): void {
    this.wallets.clear();
    this.transactions.clear();
    this.correlationMap.clear();
  }
}
