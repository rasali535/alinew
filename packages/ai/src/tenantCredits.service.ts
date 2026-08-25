/**
 * Ralion OS — Production Multi-Tenant Credit & Usage Metering Service
 * Ras Ali Labs (Pty) Ltd
 *
 * Strict Architectural Guarantees:
 * 1. Zero cross-tenant balance leakage. Every transaction requires explicit organizationId.
 * 2. Atomic credit balance checks and deductions.
 * 3. Immutable audit ledger for every transaction.
 */

export type CreditTransactionType = 'INITIAL_GRANT' | 'REFILL' | 'CONSUMPTION' | 'REFUND';

export interface CreditTransaction {
  id: string;
  organizationId: string;
  amount: number; // Positive for grant/refill/refund, negative for consumption
  balanceAfter: number;
  type: CreditTransactionType;
  reason: string;
  resourceId?: string;
  timestamp: string;
}

export interface TenantWallet {
  organizationId: string;
  tier: 'COMMUNITY' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
  balance: number;
  lifetimeGranted: number;
  lifetimeConsumed: number;
  updatedAt: string;
}

const TIER_INITIAL_CREDITS: Record<string, number> = {
  COMMUNITY: 50,
  STANDARD: 250,
  PROFESSIONAL: 750,
  ENTERPRISE: 3000,
};

export const CREDIT_COSTS = {
  POSTER_IMAGE: 10,
  VIDEO_REEL: 50,
  MARI_STRATEGY: 1,
  SOCIAL_PUBLISH: 2,
  WEBSITE_ANALYSIS: 5,
};

export class TenantCreditsService {
  private static wallets = new Map<string, TenantWallet>();
  private static transactions = new Map<string, CreditTransaction[]>();

  /**
   * Initializes or fetches a tenant wallet. If new, seeds the initial tier credits.
   */
  static getOrCreateWallet(
    organizationId: string,
    tier: 'COMMUNITY' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE' = 'PROFESSIONAL'
  ): TenantWallet {
    if (!organizationId || organizationId === 'all') {
      throw new Error('[TenantCreditsService] Invalid organizationId: Tenant identifier is strictly required.');
    }

    let wallet = this.wallets.get(organizationId);
    if (!wallet) {
      const initialCredits = TIER_INITIAL_CREDITS[tier] || 50;
      wallet = {
        organizationId,
        tier,
        balance: initialCredits,
        lifetimeGranted: initialCredits,
        lifetimeConsumed: 0,
        updatedAt: new Date().toISOString(),
      };
      this.wallets.set(organizationId, wallet);

      const initialTx: CreditTransaction = {
        id: `tx-init-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        organizationId,
        amount: initialCredits,
        balanceAfter: initialCredits,
        type: 'INITIAL_GRANT',
        reason: `Initial credit grant for ${tier} tier`,
        timestamp: new Date().toISOString(),
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
    return wallet.balance;
  }

  /**
   * Atomically checks and deducts credits for an operation.
   * Throws an error if insufficient credits or organization mismatch.
   */
  static deductCredits(
    organizationId: string,
    amount: number,
    reason: string,
    resourceId?: string
  ): { success: boolean; balanceRemaining: number; transactionId: string } {
    if (!organizationId) {
      throw new Error('[TenantCreditsService] Access denied: organizationId is required for credit deduction.');
    }
    if (amount <= 0) {
      throw new Error('[TenantCreditsService] Deduction amount must be positive.');
    }

    const wallet = this.getOrCreateWallet(organizationId);
    if (wallet.balance < amount) {
      throw new Error(
        `[TenantCreditsService] Insufficient credits: Organization '${organizationId}' has ${wallet.balance} credits, but ${amount} are required for '${reason}'.`
      );
    }

    wallet.balance -= amount;
    wallet.lifetimeConsumed += amount;
    wallet.updatedAt = new Date().toISOString();
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-deduct-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      amount: -amount,
      balanceAfter: wallet.balance,
      type: 'CONSUMPTION',
      reason,
      resourceId,
      timestamp: new Date().toISOString(),
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);

    return {
      success: true,
      balanceRemaining: wallet.balance,
      transactionId: tx.id,
    };
  }

  /**
   * Adds credits to a tenant wallet (e.g. from top-up or subscription renewal).
   */
  static addCredits(
    organizationId: string,
    amount: number,
    reason: string
  ): { success: boolean; newBalance: number; transactionId: string } {
    if (!organizationId) {
      throw new Error('[TenantCreditsService] organizationId is required to add credits.');
    }
    if (amount <= 0) {
      throw new Error('[TenantCreditsService] Amount added must be greater than zero.');
    }

    const wallet = this.getOrCreateWallet(organizationId);
    wallet.balance += amount;
    wallet.lifetimeGranted += amount;
    wallet.updatedAt = new Date().toISOString();
    this.wallets.set(organizationId, wallet);

    const tx: CreditTransaction = {
      id: `tx-add-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      organizationId,
      amount,
      balanceAfter: wallet.balance,
      type: 'REFILL',
      reason,
      timestamp: new Date().toISOString(),
    };

    const orgTxs = this.transactions.get(organizationId) || [];
    orgTxs.push(tx);
    this.transactions.set(organizationId, orgTxs);

    return {
      success: true,
      newBalance: wallet.balance,
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

  /**
   * Resets internal store for test isolation.
   */
  static _resetForTesting(): void {
    this.wallets.clear();
    this.transactions.clear();
  }
}
