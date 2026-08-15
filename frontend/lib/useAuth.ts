/**
 * useAuth hook for React components.
 * Provides reactive auth state (user, loading) and actions (signIn, signUp, signOut).
 */

"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  AuthUser,
  getCurrentUser,
  signUp as authSignUp,
  signIn as authSignIn,
  signOut as authSignOut,
  onAuthStateChange,
} from './auth';
import { isSupabaseConfigured } from './supabase';

export interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) {
      setLoading(false);
      return;
    }

    // Get initial user
    getCurrentUser().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Subscribe to changes
    const unsubscribe = onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, [configured]);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    return authSignUp(email, password, name);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    return authSignIn(email, password);
  }, []);

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  return { user, loading, configured, signUp, signIn, signOut };
}
