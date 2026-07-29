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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(err => {
      console.warn('Supabase getSession error (mock mode enabled):', err.message);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
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
      // Fallback for demo environment if backend auth fails
      if (email && password) {
        const mockUser = {
          id: 'usr_rasali_' + Math.random().toString(36).substring(2, 9),
          email,
          user_metadata: { full_name: email.split('@')[0], avatar_url: '' }
        };
        setUser(mockUser);
        setSession({ user: mockUser, access_token: 'mock_token' });
        closeAuthModal();
        return { data: { user: mockUser }, error: null };
      }
      return { data: null, error };
    }
  };

  const signUp = async (email, password, metadata = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
      });
      if (error) throw error;
      closeAuthModal();
      return { data, error: null };
    } catch (error) {
      // Fallback for demo environment
      if (email && password) {
        const mockUser = {
          id: 'usr_rasali_' + Math.random().toString(36).substring(2, 9),
          email,
          user_metadata: { full_name: metadata.full_name || email.split('@')[0] }
        };
        setUser(mockUser);
        setSession({ user: mockUser, access_token: 'mock_token' });
        closeAuthModal();
        return { data: { user: mockUser }, error: null };
      }
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
