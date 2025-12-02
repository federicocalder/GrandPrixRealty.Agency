// ============================================
// Auth Hook - React
// Grand Prix Realty - Phase 3 Buyer Portal
// ============================================

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  supabase,
  getCurrentUser,
  signUp as authSignUp,
  signIn as authSignIn,
  signInWithGoogle as authSignInWithGoogle,
  signInWithApple as authSignInWithApple,
  signOut as authSignOut,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  onAuthStateChange,
} from '../../lib/supabaseClient';
import type { UserProfile } from '../../types/portal';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null,
  });

  // Fetch user profile from user_profiles table
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as UserProfile;
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const user = await getCurrentUser();
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted && user) {
          const profile = await fetchProfile(user.id);
          setState({
            user,
            profile,
            session,
            loading: false,
            error: null,
          });
        } else if (mounted) {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: 'Failed to initialize auth',
          }));
        }
      }
    };

    initializeAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(async (_event, session) => {
      if (mounted) {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null,
          });
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Auth methods
  const signUp = useCallback(async (email: string, password: string, fullName?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authSignUp(email, password, fullName);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign up failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authSignIn(email, password);
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authSignInWithGoogle();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign in failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const signInWithApple = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authSignInWithApple();
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Apple sign in failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await authSignOut();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign out failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authResetPassword(email);
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password reset failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await authUpdatePassword(newPassword);
      setState((prev) => ({ ...prev, loading: false }));
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Password update failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!state.user) throw new Error('Not authenticated');

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', state.user.id)
        .select()
        .single();

      if (error) throw error;

      setState((prev) => ({
        ...prev,
        profile: data as UserProfile,
        loading: false,
      }));

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      throw error;
    }
  }, [state.user]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    // State
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: !!state.user,

    // Methods
    signUp,
    signIn,
    signInWithGoogle,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    clearError,
  };
}
