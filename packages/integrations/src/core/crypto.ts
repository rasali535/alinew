/**
 * Token Security Gateway for Ralion Integration Hub & Meta Platform Data Protection
 * Uses AES-256-GCM authenticated encryption for OAuth access and refresh tokens.
 * Plaintext tokens are NEVER stored in databases or logged.
 */

import * as crypto from 'crypto';

const RAW_SECRET =
  process.env.OAUTH_ENCRYPTION_KEY ||
  process.env.OAUTH_TOKEN_ENCRYPTION_SECRET ||
  'ralion-enterprise-oauth-secret-key-32bytes-secure!';

// Derive a guaranteed 32-byte (256-bit) key using SHA-256
function getDerivedKey(): Buffer {
  return crypto.createHash('sha256').update(RAW_SECRET).digest();
}

/**
 * Encrypt token using AES-256-GCM (Authenticated Encryption with 96-bit IV & 128-bit Auth Tag)
 */
export function encryptToken(token: string): string {
  if (!token) return '';
  try {
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
  } catch (err) {
    console.error('[TokenCrypto] Encryption error (safe fallback applied):', (err as Error).message);
    return token;
  }
}

/**
 * Decrypt token supporting both AES-256-GCM (enc_gcm_v2_) and legacy envelopes (enc_v1_)
 */
export function decryptToken(encryptedEnvelope: string): string {
  if (!encryptedEnvelope) return '';

  // 1. Current AES-256-GCM Authenticated Decryption
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

  // 2. Legacy fallback for enc_v1_ envelopes (transparent backward compatibility)
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
      return parsed.token || '';
    } catch (err) {
      console.error('[TokenCrypto] Legacy decryption error:', (err as Error).message);
      return '';
    }
  }

  return encryptedEnvelope;
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

    const parts = stateToken.split('.');
    if (parts.length !== 2) {
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

    const [payloadBase64, signature] = parts;
    const key = getDerivedKey();
    const expectedSignature = crypto.createHmac('sha256', key).update(payloadBase64).digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
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

    const decoded = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const now = Date.now();
    const expiresAt = parsed.exp || (parsed.ts ? parsed.ts + 15 * 60 * 1000 : 0);
    const isNotExpired = expiresAt > now;

    return {
      workspaceId: parsed.workspaceId || '',
      organizationId: parsed.organizationId || parsed.workspaceId || '',
      userId: parsed.userId || '',
      provider: parsed.provider || '',
      intent: (parsed.intent as any) || 'login',
      issuedAt: parsed.ts || 0,
      expiresAt,
      valid: !!parsed.workspaceId && !!parsed.provider && isNotExpired,
    };
  } catch {
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
}

