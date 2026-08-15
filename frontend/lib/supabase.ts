/**
 * Supabase Browser Client
 * Single instance for all frontend Supabase interactions (auth only).
 * The service role key is NEVER used here - only the publishable anon key.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Create the Supabase client.
 * During build-time SSG (no env vars), returns a placeholder client
 * that won't be used for actual auth operations.
 */
function createSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    // During build or when env vars aren't set, use a dummy URL.
    // This avoids build failures. Auth features will gracefully degrade at runtime.
    if (typeof window !== 'undefined') {
      console.warn(
        '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Auth features will not work.'
      );
    }
    // Return a client with a placeholder URL so the module doesn't throw at import time
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = createSupabaseClient();

/**
 * Check if Supabase is properly configured (env vars present).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
