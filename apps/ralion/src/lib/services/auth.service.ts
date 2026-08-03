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
   * Universal Login with Social OAuth Providers (Google, GitHub, Microsoft, Apple, LinkedIn, Facebook, Twitter, Discord)
   */
  static async loginWithProvider(provider: 'google' | 'github' | 'azure' | 'apple' | 'linkedin_oidc' | 'facebook' | 'twitter' | 'discord' | string) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: isDesktop ? 'ralion://oauth-callback' : `${window.location.origin}/ralion/dashboard`,
        skipBrowserRedirect: isDesktop,
      },
    });
    
    if (error) throw error;

    if (isDesktop && data?.url) {
      const electronApi = (window as any).electron?.ipcRenderer;
      if (electronApi?.invoke) {
        await electronApi.invoke('open-external', data.url);
      } else if ((window as any).ralionDesktop?.openExternal) {
        await (window as any).ralionDesktop.openExternal(data.url);
      } else {
        window.open(data.url, '_blank');
      }
    }
    
    return data;
  }

  /**
   * Login with Google OAuth
   */
  static async loginWithGoogle() {
    return this.loginWithProvider('google');
  }

  /**
   * Link a social account (OAuth) for Growth OS
   */
  static async linkSocialAccount(provider: any) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: isDesktop ? 'ralion://oauth-callback' : `${window.location.origin}/ralion/growth`,
        scopes: 'email,profile',
        skipBrowserRedirect: isDesktop,
      },
    });
    
    if (error) throw error;

    if (isDesktop && data?.url) {
      const electronApi = (window as any).electron?.ipcRenderer;
      if (electronApi?.invoke) {
        await electronApi.invoke('open-external', data.url);
      } else if ((window as any).ralionDesktop?.openExternal) {
        await (window as any).ralionDesktop.openExternal(data.url);
      } else {
        window.open(data.url, '_blank');
      }
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
