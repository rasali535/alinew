import crypto from 'node:crypto';
import { getServiceSupabase, getVerifierSupabase } from '@/lib/auth/serverAuth';

export interface ManagerApprovalPayload {
  id: string; // Token unique UUID / nonce
  workspaceId: string;
  organizationId: string;
  cashierUserId: string;
  approvedByUserId: string;
  action: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
  maxDiscountRate?: number;
  terminalId?: string;
  actionPayloadHash?: string;
  reason?: string;
  issuedAt: number;
  expiresAt: number;
}

export interface VerifyApprovalTokenParams {
  token: string;
  expectedWorkspaceId: string;
  expectedOrganizationId: string;
  expectedCashierUserId: string;
  expectedAction: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
  expectedActionPayloadHash?: string;
  expectedTerminalId?: string;
  discountRate?: number;
  consumeOnVerify?: boolean;
}

export class PosManagerApprovalService {
  // Single-use consumed nonce tracker with expiry
  private static consumedTokens = new Map<string, number>();

  // Failed attempts & lockout tracker (15-min lockout after 5 consecutive failures)
  private static lockoutTracker = new Map<string, { failedAttempts: number; lockedUntil: number }>();

  /**
   * Authoritative Token Signing Secret Resolution.
   * STRICT FAIL-CLOSED: Refuses to operate unless an independent, strong
   * POS_MANAGER_APPROVAL_SIGNING_SECRET (>= 32 chars) is configured server-side.
   * Shared database credentials and fallbacks are strictly prohibited.
   */
  public static getSecret(): string {
    const secret = process.env.POS_MANAGER_APPROVAL_SIGNING_SECRET;
    if (!secret || typeof secret !== 'string' || secret.trim().length < 32) {
      throw new Error(
        'POS_SECURITY_CONFIG_ERROR: POS_MANAGER_APPROVAL_SIGNING_SECRET must be configured with at least 32 characters. Refusing to operate with fallback or shared database credentials.'
      );
    }
    return secret.trim();
  }

  // ---------------------------------------------------------------------------
  // SALTED KDF HASHING FOR POS MANAGER PINS (PBKDF2 SHA-512)
  // ---------------------------------------------------------------------------
  /**
   * Hashes a manager PIN using PBKDF2 (SHA-512, 100,000 iterations, 16-byte random salt).
   * Format: `<salt_hex>:<hash_hex>`
   */
  static hashManagerPin(pin: string, saltHex?: string): string {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(pin.trim(), salt, 100_000, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  /**
   * Verifies a manager PIN against a salted KDF hash in constant-time.
   * Fails closed if the stored PIN is in plaintext or invalid format.
   */
  static verifyManagerPinHash(pin: string, storedHash: string): boolean {
    if (!storedHash || typeof storedHash !== 'string') return false;
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
      return false; // Not a salted hash format — reject plaintext!
    }
    const [saltHex, hashHex] = parts;
    try {
      const salt = Buffer.from(saltHex, 'hex');
      const expectedHash = Buffer.from(hashHex, 'hex');
      const computedHash = crypto.pbkdf2Sync(pin.trim(), salt, 100_000, 64, 'sha512');
      if (expectedHash.length !== computedHash.length) return false;
      return crypto.timingSafeEqual(expectedHash, computedHash);
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // RATE LIMITING & LOCKOUT (Anti-Brute-Force)
  // ---------------------------------------------------------------------------
  static getLockoutStatus(key: string): { locked: boolean; retryAfterSeconds?: number } {
    const entry = this.lockoutTracker.get(key);
    if (!entry) return { locked: false };
    const now = Date.now();
    if (entry.lockedUntil > now) {
      return { locked: true, retryAfterSeconds: Math.ceil((entry.lockedUntil - now) / 1000) };
    }
    if (entry.lockedUntil <= now && entry.failedAttempts >= 5) {
      this.lockoutTracker.delete(key);
      return { locked: false };
    }
    return { locked: false };
  }

  static recordFailedAttempt(key: string): { locked: boolean; failedAttempts: number } {
    const entry = this.lockoutTracker.get(key) || { failedAttempts: 0, lockedUntil: 0 };
    entry.failedAttempts += 1;
    if (entry.failedAttempts >= 5) {
      entry.lockedUntil = Date.now() + 15 * 60 * 1000; // 15-minute lockout
    }
    this.lockoutTracker.set(key, entry);
    return { locked: entry.failedAttempts >= 5, failedAttempts: entry.failedAttempts };
  }

  static recordSuccessfulAttempt(key: string): void {
    this.lockoutTracker.delete(key);
  }

  static resetLockouts(): void {
    this.lockoutTracker.clear();
  }

  // ---------------------------------------------------------------------------
  // SINGLE-USE TOKEN CONSUMPTION TRACKER (Replay Prevention)
  // ---------------------------------------------------------------------------
  static isTokenConsumed(tokenId: string): boolean {
    const now = Date.now();
    for (const [id, exp] of this.consumedTokens.entries()) {
      if (exp <= now) {
        this.consumedTokens.delete(id);
      }
    }
    return this.consumedTokens.has(tokenId);
  }

  static consumeToken(tokenId: string, expiresAt: number): void {
    this.consumedTokens.set(tokenId, expiresAt);
  }

  static resetConsumedTokens(): void {
    this.consumedTokens.clear();
  }

  // ---------------------------------------------------------------------------
  // CRYPTOGRAPHIC APPROVAL TOKEN GENERATION & VERIFICATION
  // ---------------------------------------------------------------------------
  /**
   * Cryptographically signs a short-lived manager approval token.
   * Bound to workspace, organization, cashier, manager, action, and cart payload hash.
   * TTL: 5 minutes (300 seconds).
   */
  static createApprovalToken(data: {
    workspaceId: string;
    organizationId: string;
    cashierUserId: string;
    approvedByUserId: string;
    action: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
    maxDiscountRate?: number;
    terminalId?: string;
    actionPayloadHash?: string;
    reason?: string;
    ttlSeconds?: number;
  }): string {
    const secret = this.getSecret();
    const ttlMs = (data.ttlSeconds || 300) * 1000;
    const payload: ManagerApprovalPayload = {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
      organizationId: data.organizationId,
      cashierUserId: data.cashierUserId,
      approvedByUserId: data.approvedByUserId,
      action: data.action,
      maxDiscountRate: data.maxDiscountRate,
      terminalId: data.terminalId,
      actionPayloadHash: data.actionPayloadHash,
      reason: data.reason,
      issuedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
    };

    const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(serialized);
    const signature = hmac.digest('base64url');

    return `${serialized}.${signature}`;
  }

  /**
   * Verifies an approval token against server secret, workspace scope, organization scope,
   * cashier actor binding, action binding, cart hash binding, and single-use consumption.
   */
  static verifyApprovalToken(params: VerifyApprovalTokenParams): {
    valid: boolean;
    payload?: ManagerApprovalPayload;
    error?: string;
  } {
    const { token } = params;
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'MISSING_APPROVAL_TOKEN: Manager approval token is required.' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'MALFORMED_APPROVAL_TOKEN: Token structure is invalid.' };
    }

    const [serialized, signature] = parts;
    const secret = this.getSecret();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(serialized);
    const expectedSig = hmac.digest('base64url');

    try {
      const sigA = Buffer.from(signature, 'base64url');
      const sigB = Buffer.from(expectedSig, 'base64url');
      if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
        return { valid: false, error: 'INVALID_SIGNATURE: Manager approval token signature is forged or corrupted.' };
      }
    } catch {
      return { valid: false, error: 'INVALID_SIGNATURE: Cryptographic verification failed.' };
    }

    let payload: ManagerApprovalPayload;
    try {
      payload = JSON.parse(Buffer.from(serialized, 'base64url').toString('utf8'));
    } catch {
      return { valid: false, error: 'INVALID_TOKEN_BODY: Payload could not be decoded.' };
    }

    // 1. Expiry check
    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'TOKEN_EXPIRED: Manager approval has expired. Re-authenticate with manager.' };
    }

    // 2. Single-use check (Replay prevention)
    if (this.isTokenConsumed(payload.id)) {
      return { valid: false, error: 'TOKEN_ALREADY_CONSUMED: Manager approval token has already been used and cannot be replayed.' };
    }

    // 3. Workspace tenant isolation
    if (payload.workspaceId !== params.expectedWorkspaceId) {
      return { valid: false, error: 'WORKSPACE_MISMATCH: Approval token was not issued for this workspace.' };
    }

    // 4. Organization tenant isolation
    if (payload.organizationId !== params.expectedOrganizationId) {
      return { valid: false, error: 'ORGANIZATION_MISMATCH: Approval token was not issued for this organization.' };
    }

    // 5. Actor binding (Must be used by the exact cashier who requested it)
    if (payload.cashierUserId !== params.expectedCashierUserId) {
      return {
        valid: false,
        error: `ACTOR_MISMATCH: Approval token was issued to cashier '${payload.cashierUserId}', but transaction was submitted by '${params.expectedCashierUserId}'.`,
      };
    }

    // 6. Action binding
    if (payload.action !== params.expectedAction) {
      return { valid: false, error: `ACTION_MISMATCH: Approval token is for ${payload.action}, not ${params.expectedAction}.` };
    }

    // 7. Cart / Action payload hash binding (Must match specific cart intent)
    if (
      params.expectedActionPayloadHash &&
      payload.actionPayloadHash &&
      payload.actionPayloadHash !== params.expectedActionPayloadHash
    ) {
      return {
        valid: false,
        error: 'CART_HASH_MISMATCH: Approval token is bound to a different cart composition or transaction intent.',
      };
    }

    // 8. Terminal binding (if specified)
    if (
      params.expectedTerminalId &&
      payload.terminalId &&
      payload.terminalId !== params.expectedTerminalId
    ) {
      return {
        valid: false,
        error: `TERMINAL_MISMATCH: Approval token was issued for terminal '${payload.terminalId}', not '${params.expectedTerminalId}'.`,
      };
    }

    // 9. Discount rate limit check
    if (
      params.expectedAction === 'DISCOUNT_OVERRIDE' &&
      params.discountRate !== undefined &&
      payload.maxDiscountRate !== undefined &&
      params.discountRate > payload.maxDiscountRate
    ) {
      return {
        valid: false,
        error: `DISCOUNT_EXCEEDED: Approved discount was ${payload.maxDiscountRate}%, but transaction requested ${params.discountRate}%.`,
      };
    }

    // 10. Enforce single use: consume token
    if (params.consumeOnVerify !== false) {
      this.consumeToken(payload.id, payload.expiresAt);
    }

    return { valid: true, payload };
  }

  // ---------------------------------------------------------------------------
  // DURABLE AUDIT LOGGING (Fail-Closed)
  // ---------------------------------------------------------------------------
  /**
   * Records an immutable security audit event for manager exception overrides.
   * FAIL CLOSED: Throws an error if audit log writing fails, preventing unlogged overrides.
   */
  static async recordApprovalAudit(params: {
    organizationId: string;
    workspaceId: string;
    action: string;
    cashierUserId: string;
    approvedByUserId: string;
    reason?: string;
    details?: any;
  }): Promise<void> {
    const db = getServiceSupabase();
    const { error } = await db.from('security_audit_logs').insert({
      organization_id: params.organizationId,
      workspace_id: params.workspaceId,
      event_type: `POS_MANAGER_${params.action}`,
      severity: 'INFO',
      action: `Manager exception override: ${params.action}`,
      actor_id: params.approvedByUserId,
      actor_email: params.approvedByUserId,
      details: {
        cashierUserId: params.cashierUserId,
        reason: params.reason || 'Manager approved exception override',
        ...(params.details || {}),
      },
    });

    if (error) {
      console.error('[PosManagerApprovalService] Mandatory audit logging failure:', error);
      throw new Error(`DURABLE_AUDIT_LOG_FAILED: Failed to record mandatory security audit log: ${error.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  // SERVER-SIDE MANAGER CREDENTIAL & SALTED PIN VERIFICATION
  // ---------------------------------------------------------------------------
  /**
   * Server-side manager credential verification.
   * Checks:
   * 1. If caller is already owner or manager in this workspace.
   * 2. If managerEmail and managerPassword provided, verifies against auth and workspace_members.
   * 3. If managerPin provided, verifies against workspace salted KDF hash with anti-brute-force lockout.
   */
  static async verifyManagerCredentials(params: {
    workspaceId: string;
    organizationId: string;
    cashierUserId: string;
    callerRole?: string;
    pin?: string;
    managerEmail?: string;
    managerPassword?: string;
  }): Promise<{ verified: boolean; approvedByUserId: string; error?: string }> {
    const db = getServiceSupabase();

    // 1. If caller is already an authorized manager or owner
    const callerRoleLower = (params.callerRole || '').toLowerCase();
    if (
      callerRoleLower === 'admin' ||
      callerRoleLower === 'administrator' ||
      callerRoleLower === 'owner' ||
      callerRoleLower === 'store_owner' ||
      callerRoleLower === 'retail_manager'
    ) {
      return { verified: true, approvedByUserId: params.cashierUserId };
    }

    const lockoutKey = `${params.workspaceId}:${(params.managerEmail || 'pin_auth').toLowerCase()}`;
    const lockout = this.getLockoutStatus(lockoutKey);
    if (lockout.locked) {
      return {
        verified: false,
        approvedByUserId: '',
        error: `RATE_LIMIT_EXCEEDED: Too many failed manager approval attempts. Account locked for ${lockout.retryAfterSeconds} seconds.`,
      };
    }

    // 2. Verified via Manager Email + Password
    if (params.managerEmail && params.managerPassword) {
      try {
        const verifier = getVerifierSupabase();
        const { data: authData, error: authErr } = await verifier.auth.signInWithPassword({
          email: params.managerEmail.trim(),
          password: params.managerPassword.trim(),
        });

        if (authErr || !authData.user) {
          this.recordFailedAttempt(lockoutKey);
          return { verified: false, approvedByUserId: '', error: 'INVALID_CREDENTIALS: Manager email or password is incorrect.' };
        }

        // Verify manager belongs to this workspace in workspace_members with owner/administrator role
        const { data: member, error: memberErr } = await db
          .from('workspace_members')
          .select('id, role, user_id')
          .eq('workspace_id', params.workspaceId)
          .eq('user_id', authData.user.id)
          .maybeSingle();

        const role = (member?.role || '').toLowerCase();
        const isManager = role === 'owner' || role === 'administrator' || role === 'admin';

        if (memberErr || !member || !isManager) {
          this.recordFailedAttempt(lockoutKey);
          return { verified: false, approvedByUserId: '', error: 'UNAUTHORIZED_MANAGER: Account does not have OWNER or ADMINISTRATOR privileges in this workspace.' };
        }

        this.recordSuccessfulAttempt(lockoutKey);
        return { verified: true, approvedByUserId: authData.user.id };
      } catch (err: any) {
        this.recordFailedAttempt(lockoutKey);
        return { verified: false, approvedByUserId: '', error: err.message || 'Authentication error verifying manager.' };
      }
    }

    // 3. Verified via Salted Manager PIN
    if (params.pin && typeof params.pin === 'string') {
      const enteredPin = params.pin.trim();
      if (!/^\d{4,8}$/.test(enteredPin)) {
        return { verified: false, approvedByUserId: '', error: 'INVALID_PIN_FORMAT: Manager PIN must be 4 to 8 numeric digits.' };
      }

      // Check tenant module entitlement settings for configured POS manager PIN hash
      const { data: ent } = await db
        .from('tenant_module_entitlements')
        .select('settings')
        .eq('workspace_id', params.workspaceId)
        .eq('module_key', 'retail')
        .maybeSingle();

      const configuredPinHash = ent?.settings?.pos_manager_pin_hash || ent?.settings?.pos_manager_pin;

      // Check workspace settings fallback
      let finalHash = configuredPinHash;
      if (!finalHash) {
        const { data: ws } = await db
          .from('workspaces')
          .select('settings')
          .eq('id', params.workspaceId)
          .maybeSingle();
        finalHash = ws?.settings?.pos_manager_pin_hash || ws?.settings?.pos_manager_pin;
      }

      if (!finalHash) {
        return {
          verified: false,
          approvedByUserId: '',
          error: 'NO_MANAGER_PIN_CONFIGURED: Workspace has not configured a salted manager PIN. Please authenticate using Manager Password.',
        };
      }

      // Strictly verify that the stored PIN is in salted KDF format (salt:hash)
      if (typeof finalHash !== 'string' || !finalHash.includes(':')) {
        return {
          verified: false,
          approvedByUserId: '',
          error: 'PIN_CONFIGURATION_ERROR: Stored manager PIN is not configured as a salted KDF hash. Plaintext PINs are rejected.',
        };
      }

      const match = this.verifyManagerPinHash(enteredPin, finalHash);
      if (match) {
        this.recordSuccessfulAttempt(lockoutKey);
        const attribution = params.managerEmail ? `manager:${params.managerEmail.trim()}` : `manager_pin_verified:${params.workspaceId}`;
        return { verified: true, approvedByUserId: attribution };
      }

      const failedInfo = this.recordFailedAttempt(lockoutKey);
      if (failedInfo.locked) {
        return {
          verified: false,
          approvedByUserId: '',
          error: 'RATE_LIMIT_EXCEEDED: Maximum consecutive failed attempts reached. Workstation manager approval locked for 15 minutes.',
        };
      }

      return {
        verified: false,
        approvedByUserId: '',
        error: `INCORRECT_PIN: Invalid Manager PIN. (${5 - failedInfo.failedAttempts} attempts remaining before lockout)`,
      };
    }

    return {
      verified: false,
      approvedByUserId: '',
      error: 'CREDENTIALS_REQUIRED: Provide Manager PIN or Manager Email and Password to authorize exception.',
    };
  }
}
