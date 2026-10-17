import 'server-only';
import * as crypto from 'crypto';

function normalizeProvider(provider: string): string {
  const value = String(provider || '').trim().toLowerCase();
  if (value === 'twitter') return 'x';
  if (value === 'linkedin_oidc') return 'linkedin';
  return value;
}

export function oauthProviderMatches(routeProvider: string, stateProvider: string): boolean {
  return normalizeProvider(routeProvider) === normalizeProvider(stateProvider);
}

function oauthFlowFingerprint(stateToken: string): string {
  return crypto.createHash('sha256').update(String(stateToken || '')).digest('hex').slice(0, 20);
}

export function oauthStateCookieName(provider: string, stateToken: string): string {
  return `ralion_oauth_state_${normalizeProvider(provider)}_${oauthFlowFingerprint(stateToken)}`;
}

export function oauthVerifierCookieName(provider: string, stateToken: string): string {
  return `ralion_oauth_verifier_${normalizeProvider(provider)}_${oauthFlowFingerprint(stateToken)}`;
}

export function legacyOAuthVerifierCookieName(provider: string): string {
  return `oauth_verifier_${normalizeProvider(provider)}`;
}
