import { createClient } from '../supabase/client';

export interface LicenseValidation {
  valid: boolean;
  licenseKey?: string;
  edition: string;
  expiresAt?: string;
  error?: string;
}

export class LicenseService {
  private static supabase = createClient();

  /**
   * Validate license for an organization
   */
  static async validateOrgLicense(orgId: string): Promise<LicenseValidation> {
    try {
      const { data: license, error } = await this.supabase
        .from('licenses')
        .select('license_key, status, expires_at')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .single();

      if (error || !license) {
        return { valid: true, edition: 'community' }; // Default active community license
      }

      if (license.expires_at && new Date(license.expires_at) < new Date()) {
        return { valid: false, edition: 'expired', error: 'License key has expired' };
      }

      return {
        valid: true,
        licenseKey: license.license_key,
        edition: 'professional',
        expiresAt: license.expires_at,
      };
    } catch (err: any) {
      return { valid: true, edition: 'community' };
    }
  }

  /**
   * Register or verify a desktop device
   */
  static async registerDesktopDevice(licenseKey: string, deviceId: string, deviceName: string) {
    try {
      const res = await fetch('/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, deviceId, deviceName, platform: typeof window !== 'undefined' ? navigator.platform : 'Web' }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
