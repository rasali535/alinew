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
  terminalId: string; // Mandatory workstation binding
  actionPayloadHash: string; // Mandatory action-bound SHA-256 hash
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
  expectedActionPayloadHash: string; // Strictly mandatory
  expectedTerminalId: string; // Strictly mandatory
  discountRate?: number;
  consumeOnVerify?: boolean; // Defaults to false to decouple pre-flight check from atomic commit
}

export class PosManagerApprovalService {
  // In-memory fallback caches for non-DB runtime/offline tests
  private static localConsumedTokens = new Map<string, number>();
  private static localLockoutTracker = new Map<string, { failedAttempts: number; lockedUntil: number }>();

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
  static hashManagerPin(pin: string, saltHex?: string): string {
    const salt = saltHex ? Buffer.from(saltHex, 'hex') : crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(pin.trim(), salt, 100_000, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

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
  // DURABLE RATE LIMITING & LOCKOUT (Anti-Brute-Force)
  // ---------------------------------------------------------------------------
  static async getLockoutStatus(
    key: string,
    workspaceId?: string
  ): Promise<{ locked: boolean; retryAfterSeconds?: number }> {
    try {
      const db = getServiceSupabase();
      const { data, error } = await db
        .from('retail_pos_lockouts')
        .select('failed_attempts, locked_until')
        .eq('lockout_key', key)
        .maybeSingle();

      if (!error && data && data.locked_until) {
        const lockedUntil = new Date(data.locked_until).getTime();
        const now = Date.now();
        if (lockedUntil > now) {
          return { locked: true, retryAfterSeconds: Math.ceil((lockedUntil - now) / 1000) };
        }
      }
    } catch {
      // Fall through to in-memory check
    }

    const local = this.localLockoutTracker.get(key);
    if (!local) return { locked: false };
    const now = Date.now();
    if (local.lockedUntil > now) {
      return { locked: true, retryAfterSeconds: Math.ceil((local.lockedUntil - now) / 1000) };
    }
    if (local.lockedUntil <= now && local.failedAttempts >= 5) {
      this.localLockoutTracker.delete(key);
      return { locked: false };
    }
    return { locked: false };
  }

  static async recordFailedAttempt(
    key: string,
    workspaceId: string
  ): Promise<{ locked: boolean; failedAttempts: number }> {
    let attempts = 1;
    let lockedUntil: number | null = null;

    try {
      const db = getServiceSupabase();
      const { data: existing } = await db
        .from('retail_pos_lockouts')
        .select('failed_attempts')
        .eq('lockout_key', key)
        .maybeSingle();

      attempts = (existing?.failed_attempts || 0) + 1;
      const isLocked = attempts >= 5;
      const lockedUntilIso = isLocked ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

      await db.from('retail_pos_lockouts').upsert({
        lockout_key: key,
        workspace_id: workspaceId,
        failed_attempts: attempts,
        locked_until: lockedUntilIso,
        last_failed_at: new Date().toISOString(),
      });

      if (isLocked) {
        lockedUntil = Date.now() + 15 * 60 * 1000;
      }
    } catch {
      // Fallback to local tracker
      const local = this.localLockoutTracker.get(key) || { failedAttempts: 0, lockedUntil: 0 };
      local.failedAttempts += 1;
      attempts = local.failedAttempts;
      if (local.failedAttempts >= 5) {
        local.lockedUntil = Date.now() + 15 * 60 * 1000;
        lockedUntil = local.lockedUntil;
      }
      this.localLockoutTracker.set(key, local);
    }

    return { locked: attempts >= 5, failedAttempts: attempts };
  }

  static async recordSuccessfulAttempt(key: string): Promise<void> {
    try {
      const db = getServiceSupabase();
      await db.from('retail_pos_lockouts').delete().eq('lockout_key', key);
    } catch {
      // Ignore
    }
    this.localLockoutTracker.delete(key);
  }

  static resetLockouts(): void {
    this.localLockoutTracker.clear();
  }

  // ---------------------------------------------------------------------------
  // DURABLE SINGLE-USE NONCE TRACKER (Atomic DB Insertion)
  // ---------------------------------------------------------------------------
  /**
   * Atomically consumes a token JTI in shared PostgreSQL storage.
   * If token is already in the database, returns consumed: false (Replay prevented).
   */
  static async consumeTokenDurable(params: {
    tokenId: string;
    workspaceId: string;
    organizationId: string;
    cashierUserId: string;
    action: string;
    actionPayloadHash: string;
    terminalId: string;
    saleId?: string;
    expiresAt: number;
  }): Promise<{ consumed: boolean; error?: string }> {
    const { tokenId, workspaceId, organizationId, cashierUserId, action, actionPayloadHash, terminalId, saleId, expiresAt } = params;

    // First check local in-memory fallback
    if (this.localConsumedTokens.has(tokenId)) {
      return { consumed: false, error: 'TOKEN_ALREADY_CONSUMED: Approval token was already consumed.' };
    }

    try {
      const db = getServiceSupabase();
      const { error } = await db.from('retail_pos_consumed_tokens').insert({
        token_id: tokenId,
        workspace_id: workspaceId,
        organization_id: organizationId,
        cashier_user_id: cashierUserId,
        action,
        action_payload_hash: actionPayloadHash,
        terminal_id: terminalId,
        sale_id: saleId || null,
        expires_at: new Date(expiresAt).toISOString(),
      });

      if (error) {
        // Unique constraint violation (23505) indicates duplicate/concurrent redemption
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('violates unique constraint')) {
          this.localConsumedTokens.set(tokenId, expiresAt);
          return { consumed: false, error: 'TOKEN_ALREADY_CONSUMED: Approval token was already consumed in another session.' };
        }
        console.warn('[PosManagerApprovalService] Notice inserting consumed token:', error.message);
      }
    } catch (err: any) {
      console.warn('[PosManagerApprovalService] DB consumed token check fallback:', err.message);
    }

    this.localConsumedTokens.set(tokenId, expiresAt);
    return { consumed: true };
  }

  static async isTokenConsumed(tokenId: string): Promise<boolean> {
    const now = Date.now();
    for (const [id, exp] of this.localConsumedTokens.entries()) {
      if (exp <= now) {
        this.localConsumedTokens.delete(id);
      }
    }
    if (this.localConsumedTokens.has(tokenId)) return true;

    try {
      const db = getServiceSupabase();
      const { data, error } = await db
        .from('retail_pos_consumed_tokens')
        .select('token_id')
        .eq('token_id', tokenId)
        .maybeSingle();

      if (!error && data) {
        this.localConsumedTokens.set(tokenId, Date.now() + 300_000);
        return true;
      }
    } catch {
      // Fallback
    }

    return false;
  }

  static resetConsumedTokens(): void {
    this.localConsumedTokens.clear();
  }

  // ---------------------------------------------------------------------------
  // CRYPTOGRAPHIC APPROVAL TOKEN GENERATION & VERIFICATION
  // ---------------------------------------------------------------------------
  /**
   * Cryptographically signs an action-bound, terminal-bound approval token.
   * Mandatory fields: terminalId, actionPayloadHash.
   */
  static createApprovalToken(data: {
    workspaceId: string;
    organizationId: string;
    cashierUserId: string;
    approvedByUserId: string;
    action: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
    terminalId: string;
    actionPayloadHash: string;
    maxDiscountRate?: number;
    reason?: string;
    ttlSeconds?: number;
  }): string {
    const secret = this.getSecret();

    if (!data.terminalId || typeof data.terminalId !== 'string' || !data.terminalId.trim()) {
      throw new Error('TERMINAL_BINDING_REQUIRED: Terminal ID is required to create approval token.');
    }
    if (!data.actionPayloadHash || typeof data.actionPayloadHash !== 'string' || !data.actionPayloadHash.trim()) {
      throw new Error('ACTION_HASH_REQUIRED: Server-validated action payload hash is required to create approval token.');
    }

    const ttlMs = (data.ttlSeconds || 300) * 1000;
    const payload: ManagerApprovalPayload = {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
      organizationId: data.organizationId,
      cashierUserId: data.cashierUserId,
      approvedByUserId: data.approvedByUserId,
      action: data.action,
      maxDiscountRate: data.maxDiscountRate,
      terminalId: data.terminalId.trim(),
      actionPayloadHash: data.actionPayloadHash.trim(),
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
   * cashier actor binding, action binding, exact terminal binding, and cart hash binding.
   * consumeOnVerify defaults to false to decouple pre-flight check from atomic commit.
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

    // 2. Local consumed check
    if (this.localConsumedTokens.has(payload.id)) {
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

    // 7. Exact terminal binding (MANDATORY & FAIL-CLOSED)
    if (!payload.terminalId || !params.expectedTerminalId) {
      return { valid: false, error: 'UNBOUND_TERMINAL: Token or request lacks required terminal binding.' };
    }
    if (payload.terminalId !== params.expectedTerminalId) {
      return {
        valid: false,
        error: `TERMINAL_MISMATCH: Approval token was issued for terminal '${payload.terminalId}', not '${params.expectedTerminalId}'.`,
      };
    }

    // 8. Exact cart/action payload hash binding (MANDATORY & FAIL-CLOSED)
    if (!payload.actionPayloadHash || !params.expectedActionPayloadHash) {
      return { valid: false, error: 'UNBOUND_ACTION_HASH: Token or request lacks required action payload hash.' };
    }
    if (payload.actionPayloadHash !== params.expectedActionPayloadHash) {
      return {
        valid: false,
        error: 'CART_HASH_MISMATCH: Approval token does not match current cart composition or transaction intent.',
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

    if (params.consumeOnVerify === true) {
      this.localConsumedTokens.set(payload.id, payload.expiresAt);
    }

    return { valid: true, payload };
  }

  // ---------------------------------------------------------------------------
  // DURABLE AUDIT LOGGING (Fail-Closed)
  // ---------------------------------------------------------------------------
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
    const lockout = await this.getLockoutStatus(lockoutKey, params.workspaceId);
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
          await this.recordFailedAttempt(lockoutKey, params.workspaceId);
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
          await this.recordFailedAttempt(lockoutKey, params.workspaceId);
          return { verified: false, approvedByUserId: '', error: 'UNAUTHORIZED_MANAGER: Account does not have OWNER or ADMINISTRATOR privileges in this workspace.' };
        }

        await this.recordSuccessfulAttempt(lockoutKey);
        return { verified: true, approvedByUserId: authData.user.id };
      } catch (err: any) {
        await this.recordFailedAttempt(lockoutKey, params.workspaceId);
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
        await this.recordSuccessfulAttempt(lockoutKey);
        const attribution = params.managerEmail ? `manager:${params.managerEmail.trim()}` : `manager_pin_verified:${params.workspaceId}`;
        return { verified: true, approvedByUserId: attribution };
      }

      const failedInfo = await this.recordFailedAttempt(lockoutKey, params.workspaceId);
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
