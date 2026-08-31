import { createClient } from '../supabase/client';

export interface ProductAccessResult {
  hasAccess: boolean;
  edition: string;
  status: string;
  reason?: string;
}

export class ProductService {
  private static get supabase() { return createClient(); }
  private static productId = process.env.NEXT_PUBLIC_PRODUCT_ID || 'ralion';

  /**
   * Verify if current organization/user has active access to Ralion
   */
  static async verifyProductAccess(orgId: string): Promise<ProductAccessResult> {
    try {
      const isPlatformAdmin = orgId === 'ras-ali-labs' || orgId === 'org-rasalilabs-demo' || !orgId;
      const isUuid = orgId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgId);

      if (isPlatformAdmin || !isUuid) {
        return {
          hasAccess: true,
          edition: isPlatformAdmin ? 'enterprise' : 'community',
          status: 'active',
        };
      }

      // 1. Check subscriptions table for active org subscription
      const { data: sub, error: subError } = await this.supabase
        .from('subscriptions')
        .select('status, edition, plan_id, end_date')
        .eq('organization_id', orgId)
        .in('status', ['active', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub && !subError) {
        return {
          hasAccess: true,
          edition: sub.edition || 'community',
          status: sub.status,
        };
      }

      // 2. Fallback check for user_products access
      const { data: userProd } = await this.supabase
        .from('user_products')
        .select('status, products(slug)')
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .maybeSingle();

      if (userProd) {
        return {
          hasAccess: true,
          edition: 'community',
          status: 'active',
        };
      }

      // Default: Community free tier is enabled for all valid organizations
      return {
        hasAccess: true,
        edition: 'community',
        status: 'active',
      };
    } catch (err: any) {
      console.warn('[ProductService] Access check warning:', err?.message || err);
      return {
        hasAccess: true,
        edition: 'community',
        status: 'active',
      };
    }
  }
}
