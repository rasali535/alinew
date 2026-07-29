import { createClient } from '../supabase/client';

export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
}

export class AuthService {
  private static supabase = createClient();

  /**
   * Get current authenticated user session
   */
  static async getSession() {
    const { data: { session }, error } = await this.supabase.auth.getSession();
    if (error) {
      console.error('[AuthService] Error fetching session:', error.message);
      return null;
    }
    return session;
  }

  /**
   * Get authenticated user profile details
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      fullName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || null,
      email: user.email || null,
    };
  }

  /**
   * Logout user and redirect to platform login
   */
  static async logout() {
    await this.supabase.auth.signOut();
    const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';
    window.location.href = `${platformUrl}/login`;
  }
}
