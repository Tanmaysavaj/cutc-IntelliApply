/**
 * Authentication helpers for Supabase Auth.
 * Provides sign up, sign in, sign out, session persistence,
 * and access token retrieval for API calls.
 */

import { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
}

function mapUser(user: User | null): AuthUser | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? '',
    name: user.user_metadata?.name ?? user.user_metadata?.full_name ?? null,
  };
}

/** Get the current session (cached). */
export async function getSession(): Promise<Session | null> {
  if (!isSupabaseConfigured()) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Get the current user from session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getSession();
  return mapUser(session?.user ?? null);
}

/** Get the current access token for API authorization header. */
export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

/** Sign up with email/password. */
export async function signUp(email: string, password: string, name?: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name || '' } },
  });
  return { error: error?.message ?? null };
}

/** Sign in with email/password. */
export async function signIn(email: string, password: string): Promise<{ error: string | null }> {
  if (!isSupabaseConfigured()) return { error: 'Auth not configured' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/** Sign out. */
export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  await supabase.auth.signOut();
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
  if (!isSupabaseConfigured()) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(mapUser(session?.user ?? null));
  });
  return () => subscription.unsubscribe();
}
