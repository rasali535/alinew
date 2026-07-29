import { createClient } from '../supabase/client';

export interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  role: string;
}

export class OrganizationService {
  private static supabase = createClient();

  /**
   * Get active organizations for current user
   */
  static async getUserOrganizations(): Promise<OrganizationDetails[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        role_id,
        organizations ( id, name, slug, logo_url ),
        roles ( name )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active');

    if (error || !data) {
      console.warn('[OrganizationService] Could not fetch orgs:', error?.message);
      return [];
    }

    return data.map((item: any) => ({
      id: item.organizations?.id,
      name: item.organizations?.name || 'My Organization',
      slug: item.organizations?.slug || 'my-org',
      logoUrl: item.organizations?.logo_url,
      role: item.roles?.name || 'Member',
    }));
  }
}
