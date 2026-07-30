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
   * Login with email and password
   */
  static async login(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Login with Google OAuth
   */
  static async loginWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Redirect back to the Ralion dashboard (or current domain)
        redirectTo: `${window.location.origin}/ralion`,
      },
    });
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Link a social account (OAuth) for Growth OS
   */
  static async linkSocialAccount(provider: any) {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: `${window.location.origin}/ralion/growth`,
        scopes: 'email,profile',
      },
    });
    if (error) {
      throw error;
    }
    return data;
  }

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
    if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
      window.location.href = '/ralion/login';
    } else {
      window.location.href = `${platformUrl}/login`;
    }
  }
}
