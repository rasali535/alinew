import { createClient } from '../supabase/client';

export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
  orgName?: string | null;
  branchName?: string | null;
  tier?: string | null;
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
   * Register new user account with enterprise metadata
   */
  static async register(
    email: string,
    password: string,
    metadata: {
      fullName?: string;
      orgName?: string;
      branchName?: string;
      tier?: string;
    } = {}
  ) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    const redirectUrl = isDesktop
      ? 'ralion://auth-callback'
      : typeof window !== 'undefined'
      ? `${window.location.origin}/ralion/dashboard`
      : 'https://rasalilabs.com/ralion/dashboard';

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName,
          org_name: metadata.orgName,
          branch_name: metadata.branchName,
          tier: metadata.tier || 'COMMUNITY',
        },
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Resend signup email confirmation link
   */
  static async resendConfirmationEmail(email: string) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    const redirectUrl = isDesktop
      ? 'ralion://auth-callback'
      : typeof window !== 'undefined'
      ? `${window.location.origin}/ralion/dashboard`
      : 'https://rasalilabs.com/ralion/dashboard';

    const { error } = await this.supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    if (error) {
      throw error;
    }

    return true;
  }

  /**
   * Send password reset recovery email
   */
  static async resetPassword(email: string) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');
    const redirectUrl = isDesktop
      ? 'ralion://reset-password'
      : typeof window !== 'undefined'
      ? `${window.location.origin}/ralion/login`
      : 'https://rasalilabs.com/ralion/login';

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw error;
    }

    return true;
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
  static async linkSocialAccount(provider: string, customScopes?: string) {
    const isDesktop = typeof window !== 'undefined' && ((window as any).__RALION_DESKTOP__ || window.location.protocol === 'file:');

    // Map common provider aliases to Supabase provider names
    const providerMap: Record<string, string> = {
      linkedin: 'linkedin_oidc',
      x: 'twitter',
      facebook: 'facebook',
      instagram: 'facebook',
      google: 'google',
      github: 'github',
      azure: 'azure',
      apple: 'apple',
      tiktok: 'tiktok',
      youtube: 'google',
      discord: 'discord'
    };

    const targetProvider = providerMap[provider.toLowerCase()] || provider;

    const defaultScopes: Record<string, string> = {
      linkedin_oidc: 'openid profile email w_member_social',
      facebook: 'public_profile,email',
      google: 'email profile https://www.googleapis.com/auth/youtube.readonly',
      twitter: 'tweet.read tweet.write users.read offline.access',
      github: 'read:user user:email'
    };

    const scopes = customScopes || defaultScopes[targetProvider] || 'email,profile';

    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: targetProvider as any,
      options: {
        redirectTo: isDesktop ? 'ralion://oauth-callback' : `${window.location.origin}/ralion/growth`,
        scopes,
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
    try {
      const { data: { user }, error: userError } = await this.supabase.auth.getUser();
      if (userError || !user) return null;

      let profile: { full_name?: string | null; avatar_url?: string | null } | null = null;
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && data) {
          profile = data;
        }
      } catch (err) {
        console.warn('[AuthService] Profiles table query skipped:', err);
      }

      return {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        email: user.email || null,
        orgName: user.user_metadata?.org_name || null,
        branchName: user.user_metadata?.branch_name || null,
        tier: user.user_metadata?.tier || null,
      };
    } catch {
      return null;
    }
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
