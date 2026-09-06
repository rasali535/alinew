import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'

  useEffect(() => {
    // Check initial active session
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn('[AuthContext] Session resolution note:', error.message);
        // Distinguish expired / revoked refresh tokens from network errors
        if (
          error.message?.includes('Refresh Token') ||
          error.message?.includes('invalid_grant') ||
          error?.status === 400
        ) {
          try {
            supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            if (typeof window !== 'undefined') {
              window.localStorage?.removeItem('ralion-app-auth-token');
              window.localStorage?.removeItem('sb-yidsfihagwttlmhfynmf-auth-token');
            }
          } catch {}
        }
        setSession(null);
        setUser(null);
      } else {
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
      }
      setLoading(false);
    }).catch(err => {
      console.warn('[AuthContext] getSession unexpected error:', err.message);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);


  const openAuthModal = (mode = 'login') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      closeAuthModal();
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/account`
        : 'https://rasalilabs.com/account';

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: redirectUrl
        }
      });

      if (error) throw error;

      const requiresConfirmation = !data?.session;
      if (!requiresConfirmation) {
        closeAuthModal();
      }

      return { data, error: null, requiresConfirmation, email };
    } catch (error) {
      return { data: null, error, requiresConfirmation: false };
    }
  };

  const resendConfirmation = async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/account`
        : 'https://rasalilabs.com/account';

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/account`
        : 'https://rasalilabs.com/account';

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signInWithOAuth = async (provider) => {
    try {
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/account`
        : 'https://rasalilabs.com/account';

      const defaultScopes = {
        facebook: 'public_profile,email',
        google: 'email profile'
      };

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          scopes: defaultScopes[provider]
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setUser(null);
      setSession(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthModalOpen,
        authMode,
        openAuthModal,
        closeAuthModal,
        signIn,
        signUp,
        signInWithOAuth,
        resendConfirmation,
        resetPassword,
        signOut
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
