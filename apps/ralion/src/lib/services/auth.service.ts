import { createClient } from '../supabase/client';

export interface UserProfile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  email: string | null;
  orgName?: string | null;
  branchName?: string | null;
  tier?: string | null;
  role?: string | null;
  isPlatformAdmin?: boolean;
  billingFrequency?: string | null;
}

export class AuthService {
  private static get supabase() { return createClient(); }

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
    
    let baseUrl = 'https://rasalilabs.com/ralion';
    if (typeof window !== 'undefined' && window.location?.origin) {
      const isSubpath = window.location.pathname.startsWith('/ralion');
      baseUrl = isSubpath ? `${window.location.origin}/ralion` : window.location.origin;
    } else if (process.env.NEXT_PUBLIC_APP_URL) {
      baseUrl = process.env.NEXT_PUBLIC_APP_URL;
    }

    const redirectUrl = isDesktop
      ? 'ralion://reset-password'
      : `${baseUrl.replace(/\/$/, '')}/reset-password`;

    const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw error;
    }

    return true;
  }

  /**
   * Update password for the current authenticated recovery session
   */
  static async updatePassword(password: string) {
    if (!password || password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const { data, error } = await this.supabase.auth.updateUser({
      password,
    });

    if (error) {
      throw error;
    }

    return data;
  }

  /**
   * Exchange PKCE authorization code for session
   */
  static async exchangeCodeForSession(code: string) {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(code);
    if (error) {
      throw error;
    }
    return data;
  }

  /**
   * Set auth session explicitly from tokens
   */
  static async setSession(tokens: { access_token: string; refresh_token: string }) {
    const { data, error } = await this.supabase.auth.setSession(tokens);
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

    const providerMap: Record<string, string> = {
      linkedin: 'linkedin_oidc',
      x: 'twitter',
      facebook: 'facebook',
      instagram: 'facebook',
      google: 'google',
      github: 'github',
      azure: 'azure',
      apple: 'apple'
    };

    const targetProvider = providerMap[provider.toLowerCase()] || provider;

    const defaultScopes: Record<string, string> = {
      facebook: 'public_profile,email',
      instagram: 'public_profile,email',
      linkedin_oidc: 'openid profile email',
      google: 'email profile'
    };
    
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: targetProvider as any,
      options: {
        redirectTo: isDesktop ? 'ralion://oauth-callback' : `${window.location.origin}/ralion/dashboard`,
        scopes: defaultScopes[targetProvider],
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
   * Login with Facebook OAuth
   */
  static async loginWithFacebook() {
    return this.loginWithProvider('facebook');
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
      facebook: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts',
      instagram: 'public_profile,email,pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic',
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
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) {
        console.error('[AuthService] Error fetching session:', error.message);
        return null;
      }
      return session;
    } catch (err) {
      console.error('[AuthService] Unexpected error fetching session:', err);
      return null;
    }
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

      const isPlatformAdmin =
        user.user_metadata?.role === 'PLATFORM_ADMIN' ||
        user.email === 'ali@rasalilabs.com' ||
        user.user_metadata?.org_name === 'ras-ali-labs' ||
        user.user_metadata?.org_name === 'Ras Ali Labs';

      return {
        id: user.id,
        fullName: profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || (isPlatformAdmin ? 'Ras Ali Labs Platform Admin' : user.email?.split('@')[0] || 'User'),
        avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        email: user.email || null,
        orgName: isPlatformAdmin ? 'Ras Ali Labs' : (user.user_metadata?.org_name || null),
        branchName: user.user_metadata?.branch_name || 'Main HQ Branch',
        tier: isPlatformAdmin ? 'ENTERPRISE' : (user.user_metadata?.tier || 'COMMUNITY'),
        role: isPlatformAdmin ? 'PLATFORM_ADMIN' : (user.user_metadata?.role || 'ORGANIZATION_OWNER'),
        isPlatformAdmin,
        billingFrequency: user.user_metadata?.billing_frequency || null,
      };
    } catch {
      return null;
    }
  }

  /**
   * Logout user, clear all client-side tenant/workspace state, and redirect to platform login
   */
  static async logout() {
    try {
      await this.supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthService] Supabase signout notice:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        // Clear all client-side cached tenant & social state
        const keysToRemove = [
          'ralion_connected_social_accounts',
          'ralion_active_workspace_id',
          'ralion_cached_user',
          'ralion_selected_fb_page',
          'ralion_growth_cache',
          'sb-yidsfihagwttlmhfynmf-auth-token',
        ];
        keysToRemove.forEach((k) => localStorage.removeItem(k));

        // Clear dynamic keys with ralion_ or sb- prefix
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('ralion_') || key.startsWith('sb-')) {
            localStorage.removeItem(key);
          }
        });

        sessionStorage.clear();
      } catch (e) {
        console.warn('[AuthService] Storage purge notice:', e);
      }

      const platformUrl = process.env.NEXT_PUBLIC_RASALI_PLATFORM_URL || 'https://rasalilabs.com';
      if (window.location.protocol === 'file:') {
        window.location.href = '/ralion/login';
      } else {
        window.location.href = `${platformUrl}/login`;
      }
    }
  }
}
