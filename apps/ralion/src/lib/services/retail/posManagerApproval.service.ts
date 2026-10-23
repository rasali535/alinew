import crypto from 'node:crypto';
import { getServiceSupabase, getVerifierSupabase } from '@/lib/auth/serverAuth';

export interface ManagerApprovalPayload {
  id: string;
  workspaceId: string;
  organizationId: string;
  action: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
  maxDiscountRate?: number;
  cashierUserId: string;
  approvedByUserId: string;
  reason?: string;
  issuedAt: number;
  expiresAt: number;
}

export class PosManagerApprovalService {
  private static getSecret(): string {
    return (
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.JWT_SECRET ||
      'ralion_pos_approval_hmac_secret_2026'
    );
  }

  /**
   * Cryptographically signs a short-lived manager approval token.
   * TTL: 5 minutes (300 seconds).
   */
  static createApprovalToken(data: {
    workspaceId: string;
    organizationId: string;
    action: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND';
    maxDiscountRate?: number;
    cashierUserId: string;
    approvedByUserId: string;
    reason?: string;
  }): string {
    const payload: ManagerApprovalPayload = {
      id: crypto.randomUUID(),
      workspaceId: data.workspaceId,
      organizationId: data.organizationId,
      action: data.action,
      maxDiscountRate: data.maxDiscountRate,
      cashierUserId: data.cashierUserId,
      approvedByUserId: data.approvedByUserId,
      reason: data.reason,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    };

    const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const hmac = crypto.createHmac('sha256', this.getSecret());
    hmac.update(serialized);
    const signature = hmac.digest('base64url');

    return `${serialized}.${signature}`;
  }

  /**
   * Verifies an approval token against server secret, workspace scope, action, and expiry.
   */
  static verifyApprovalToken(
    token: string,
    expectedWorkspaceId: string,
    expectedAction: 'DISCOUNT_OVERRIDE' | 'CART_VOID' | 'REFUND',
    discountRate?: number
  ): { valid: boolean; payload?: ManagerApprovalPayload; error?: string } {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'MISSING_APPROVAL_TOKEN: Manager approval token is required.' };
    }

    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'MALFORMED_APPROVAL_TOKEN: Token structure is invalid.' };
    }

    const [serialized, signature] = parts;
    const hmac = crypto.createHmac('sha256', this.getSecret());
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

    if (payload.workspaceId !== expectedWorkspaceId) {
      return { valid: false, error: 'WORKSPACE_MISMATCH: Approval token was not issued for this workspace.' };
    }

    if (payload.action !== expectedAction) {
      return { valid: false, error: `ACTION_MISMATCH: Approval token is for ${payload.action}, not ${expectedAction}.` };
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, error: 'TOKEN_EXPIRED: Manager approval has expired. Re-authenticate with manager.' };
    }

    if (
      expectedAction === 'DISCOUNT_OVERRIDE' &&
      discountRate !== undefined &&
      payload.maxDiscountRate !== undefined &&
      discountRate > payload.maxDiscountRate
    ) {
      return {
        valid: false,
        error: `DISCOUNT_EXCEEDED: Approved discount was ${payload.maxDiscountRate}%, but transaction requested ${discountRate}%.`,
      };
    }

    return { valid: true, payload };
  }

  /**
   * Records an immutable security audit event for manager exception overrides.
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
    try {
      const db = getServiceSupabase();
      await db.from('security_audit_logs').insert({
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
    } catch (err) {
      // Non-blocking for offline sandbox fallback
      console.warn('[PosManagerApprovalService] Audit logging notice:', err);
    }
  }

  /**
   * Server-side manager credential verification.
   * Checks:
   * 1. If caller is already owner or manager in this workspace.
   * 2. If managerEmail and managerPassword provided, verifies against auth and workspace membership.
   * 3. If managerPin provided, verifies against workspace configured manager PIN.
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
    if (params.callerRole === 'admin' || params.callerRole === 'owner' || params.callerRole === 'STORE_OWNER' || params.callerRole === 'RETAIL_MANAGER') {
      return { verified: true, approvedByUserId: params.cashierUserId };
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
          return { verified: false, approvedByUserId: '', error: 'INVALID_CREDENTIALS: Manager email or password is incorrect.' };
        }

        // Verify manager belongs to this workspace with admin/owner role
        const { data: member, error: memberErr } = await db
          .from('workspace_memberships')
          .select('role')
          .eq('workspace_id', params.workspaceId)
          .eq('user_id', authData.user.id)
          .maybeSingle();

        if (memberErr || !member || (member.role !== 'admin' && member.role !== 'owner')) {
          return { verified: false, approvedByUserId: '', error: 'UNAUTHORIZED_MANAGER: Account does not have manager privileges in this workspace.' };
        }

        return { verified: true, approvedByUserId: authData.user.id };
      } catch (err: any) {
        return { verified: false, approvedByUserId: '', error: err.message || 'Authentication error verifying manager.' };
      }
    }

    // 3. Verified via Manager PIN against tenant workspace settings
    if (params.pin && typeof params.pin === 'string') {
      const enteredPin = params.pin.trim();
      if (!/^\d{4,6}$/.test(enteredPin)) {
        return { verified: false, approvedByUserId: '', error: 'INVALID_PIN_FORMAT: Manager PIN must be 4 to 6 numeric digits.' };
      }

      // Check tenant module entitlement settings for configured POS manager PIN
      const { data: ent } = await db
        .from('tenant_module_entitlements')
        .select('settings')
        .eq('workspace_id', params.workspaceId)
        .eq('module_key', 'retail')
        .maybeSingle();

      const configuredPin = ent?.settings?.pos_manager_pin || ent?.settings?.manager_pin;

      if (configuredPin) {
        const match = typeof configuredPin === 'string' && enteredPin === configuredPin.trim();
        if (match) {
          return { verified: true, approvedByUserId: `manager_pin_verified` };
        }
        return { verified: false, approvedByUserId: '', error: 'INCORRECT_PIN: Invalid Manager PIN.' };
      }

      // Check workspace settings
      const { data: ws } = await db
        .from('workspaces')
        .select('settings')
        .eq('id', params.workspaceId)
        .maybeSingle();

      const wsPin = ws?.settings?.pos_manager_pin || ws?.settings?.manager_pin;
      if (wsPin) {
        if (enteredPin === String(wsPin).trim()) {
          return { verified: true, approvedByUserId: `manager_pin_verified` };
        }
        return { verified: false, approvedByUserId: '', error: 'INCORRECT_PIN: Invalid Manager PIN.' };
      }

      return {
        verified: false,
        approvedByUserId: '',
        error: 'NO_MANAGER_PIN_CONFIGURED: Please authenticate with Manager Email and Password or configure a POS Manager PIN in workspace settings.',
      };
    }

    return {
      verified: false,
      approvedByUserId: '',
      error: 'CREDENTIALS_REQUIRED: Enter Manager PIN or Manager Email and Password to authorize exception.',
    };
  }
}
