/**
 * API Client
 * Common fetch behavior and configuration for backend communication.
 * Automatically attaches Supabase access token for authenticated requests.
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  timeout?: number;
  skipAuth?: boolean;
}

/**
 * Get the current access token from Supabase session
 */
async function getAccessToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetch wrapper with error handling, timeout, and automatic auth
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = 30000, skipAuth = false, ...fetchOptions } = options;

  // Auto-attach Authorization header if user is authenticated
  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      const headers = new Headers(fetchOptions.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
      fetchOptions.headers = headers;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      // Handle 401 - session expired
      if (response.status === 401) {
        const error = new Error('Session expired. Please sign in again.');
        (error as Error & { status?: number }).status = 401;
        throw error;
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string; detail?: string }).error
        || (errorData as { detail?: string }).detail
        || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * API client with common methods
 */
export const apiClient = {
  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: { skipAuth?: boolean }): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      skipAuth: options?.skipAuth,
    });
    return response.json();
  },

  /**
   * POST request with JSON body
   */
  async post<T>(endpoint: string, body: Record<string, unknown>, options?: { skipAuth?: boolean }): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      skipAuth: options?.skipAuth,
    });
    return response.json();
  },

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData, options?: { skipAuth?: boolean }): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      skipAuth: options?.skipAuth,
      // Don't set Content-Type header - browser will set it with boundary
    });
    return response.json();
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      return await this.get('/api/health', { skipAuth: true });
    } catch {
      throw new Error('Backend is unavailable');
    }
  },
};
