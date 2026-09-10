/**
 * Token Security Gateway for Ralion Integration Hub & Meta Platform Data Protection
 * Uses AES-256-GCM authenticated encryption for OAuth access and refresh tokens.
 * Plaintext tokens are NEVER stored in databases or logged.
 */

import * as crypto from 'crypto';

function getRawSecret(): string {
  const secret = process.env.OAUTH_ENCRYPTION_KEY || process.env.OAUTH_TOKEN_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('OAuth token encryption secret is not configured.');
  }
  if (secret.length < 32) {
    throw new Error('OAuth token encryption secret must be at least 32 characters.');
  }
  return secret;
}

// Derive a guaranteed 32-byte (256-bit) key using SHA-256.
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(getRawSecret()).digest();
}

/**
 * Encrypt token using AES-256-GCM (Authenticated Encryption with 96-bit IV & 128-bit Auth Tag).
 * Encryption failures are fatal: plaintext is never returned as a fallback.
 */
export function encryptToken(token: string): string {
  if (!token) return '';

  const key = getDerivedKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([
    cipher.update(token, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag(); // 128-bit authentication tag

  // Format: enc_gcm_v2_{iv_hex}_{tag_hex}_{ciphertext_hex}
  return `enc_gcm_v2_${iv.toString('hex')}_${authTag.toString('hex')}_${encrypted.toString('hex')}`;
}

/**
 * Decrypt token supporting AES-256-GCM (enc_gcm_v2_) and the legacy enc_v1_
 * envelope. Unknown/plaintext values are rejected rather than passed through.
 */
export function decryptToken(encryptedEnvelope: string): string {
  if (!encryptedEnvelope) return '';

  // 1. Current AES-256-GCM authenticated decryption.
  if (encryptedEnvelope.startsWith('enc_gcm_v2_')) {
    try {
      const parts = encryptedEnvelope.replace('enc_gcm_v2_', '').split('_');
      if (parts.length !== 3) {
        throw new Error('Malformed GCM envelope structure');
      }

      const [ivHex, tagHex, cipherHex] = parts;
      const key = getDerivedKey();
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(tagHex, 'hex');
      const ciphertext = Buffer.from(cipherHex, 'hex');

      if (iv.length !== 12 || authTag.length !== 16 || ciphertext.length === 0) {
        throw new Error('Malformed GCM envelope values');
      }

      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (err) {
      console.error('[TokenCrypto] AES-256-GCM decryption failed:', (err as Error).message);
      return '';
    }
  }

  // 2. Legacy envelope support for controlled migration only.
  // This format is not authenticated encryption; callers should re-save any
  // successfully recovered credential immediately using encryptToken().
  if (encryptedEnvelope.startsWith('enc_v1_')) {
    try {
      const raw = encryptedEnvelope.replace('enc_v1_', '');
      let decoded = '';
      if (typeof atob !== 'undefined') {
        decoded = decodeURIComponent(atob(raw));
      } else {
        decoded = Buffer.from(raw, 'base64').toString('utf-8');
      }
      const parsed = JSON.parse(decoded);
      return typeof parsed.token === 'string' ? parsed.token : '';
    } catch (err) {
      console.error('[TokenCrypto] Legacy decryption error:', (err as Error).message);
      return '';
    }
  }

  // Never treat an unencrypted database value as a valid decrypted token.
  console.warn('[TokenCrypto] Rejected unrecognized or plaintext token envelope.');
  return '';
}

export interface OAuthStateOptions {
  userId?: string;
  organizationId?: string;
  workspaceId: string;
  provider: string;
  intent?: 'login' | 'page_connection' | 'connect';
  ttlMs?: number;
}

export interface VerifiedOAuthState {
  workspaceId: string;
  organizationId: string;
  userId: string;
  provider: string;
  intent: 'login' | 'page_connection' | 'connect';
  issuedAt: number;
  expiresAt: number;
  valid: boolean;
}

function invalidOAuthState(): VerifiedOAuthState {
  return {
    workspaceId: '',
    organizationId: '',
    userId: '',
    provider: '',
    intent: 'login',
    issuedAt: 0,
    expiresAt: 0,
    valid: false,
  };
}

export function generateOAuthState(
  workspaceOrOptions: string | OAuthStateOptions,
  providerParam?: string
): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const now = Date.now();

  let payload: Record<string, any>;
  if (typeof workspaceOrOptions === 'string') {
    const workspaceId = workspaceOrOptions;
    const provider = providerParam || '';
    if (!workspaceId || !provider) {
      throw new Error('workspaceId and provider are required to generate OAuth state.');
    }
    payload = {
      workspaceId,
      organizationId: workspaceId,
      userId: '',
      provider,
      intent: 'login',
      nonce,
      ts: now,
      exp: now + 15 * 60 * 1000,
    };
  } else {
    if (!workspaceOrOptions.workspaceId || !workspaceOrOptions.provider) {
      throw new Error('workspaceId and provider are required to generate OAuth state.');
    }
    const ttl = workspaceOrOptions.ttlMs || 15 * 60 * 1000;
    payload = {
      workspaceId: workspaceOrOptions.workspaceId,
      organizationId: workspaceOrOptions.organizationId || workspaceOrOptions.workspaceId,
      userId: workspaceOrOptions.userId || '',
      provider: workspaceOrOptions.provider,
      intent: workspaceOrOptions.intent || 'login',
      nonce,
      ts: now,
      exp: now + ttl,
    };
  }

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const key = getDerivedKey();
  const signature = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url');
  return `${payloadBase64}.${signature}`;
}

export function verifyOAuthState(stateToken: string): VerifiedOAuthState {
  try {
    if (!stateToken || typeof stateToken !== 'string') {
      return invalidOAuthState();
    }

    const parts = stateToken.split('.');
    if (parts.length !== 2) {
      return invalidOAuthState();
    }

    const [payloadBase64, signature] = parts;
    if (!payloadBase64 || !signature) {
      return invalidOAuthState();
    }

    const key = getDerivedKey();
    const expectedSignature = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return invalidOAuthState();
    }

    const decoded = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const now = Date.now();
    const expiresAt = parsed.exp || (parsed.ts ? parsed.ts + 15 * 60 * 1000 : 0);
    const isNotExpired = expiresAt > now;
    const hasRequiredFields = typeof parsed.workspaceId === 'string' && parsed.workspaceId.length > 0 &&
      typeof parsed.provider === 'string' && parsed.provider.length > 0;

    if (!hasRequiredFields || !isNotExpired) {
      return invalidOAuthState();
    }

    return {
      workspaceId: parsed.workspaceId,
      organizationId: parsed.organizationId || parsed.workspaceId,
      userId: parsed.userId || '',
      provider: parsed.provider,
      intent: (parsed.intent as any) || 'login',
      issuedAt: parsed.ts || 0,
      expiresAt,
      valid: true,
    };
  } catch {
    return invalidOAuthState();
  }
}
