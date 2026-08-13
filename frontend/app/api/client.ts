/**
 * API Client
 * Common fetch behavior and configuration for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  timeout?: number;
}

/**
 * Fetch wrapper with error handling and timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  const { timeout = 30000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = (errorData as { error?: string }).error || `HTTP ${response.status}`;
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
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return response.json();
  },

  /**
   * POST request with JSON body
   */
  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  },

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    const response = await fetchWithTimeout(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });
    return response.json();
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string }> {
    try {
      return await this.get('/api/health');
    } catch {
      throw new Error('Backend is unavailable');
    }
  },
};
