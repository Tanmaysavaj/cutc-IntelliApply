/**
 * Frontend validation utilities
 * Lightweight client-side validation for UX
 * Backend validation is authoritative
 */

const VALID_MIME_TYPES = ['application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const validation = {
  /**
   * Validate resume PDF file
   */
  validateResumeFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file selected' };
    }

    if (!VALID_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Expected PDF, got ${file.type || 'unknown'}`,
      };
    }

    if (file.size === 0) {
      return { valid: false, error: 'File is empty' };
    }

    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      };
    }

    return { valid: true };
  },

  /**
   * Validate job URL
   */
  validateJobUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
      return { valid: false, error: 'URL is required' };
    }

    try {
      new URL(url);
      return { valid: true };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  },

  /**
   * Validate job description text
   */
  validateJobDescription(description: string): { valid: boolean; error?: string } {
    if (!description || !description.trim()) {
      return { valid: false, error: 'Description is required' };
    }

    const minLength = 50;
    if (description.trim().length < minLength) {
      return {
        valid: false,
        error: `Description too short (${description.trim().length} chars). Minimum is ${minLength} characters`,
      };
    }

    return { valid: true };
  },

  /**
   * Validate that at least URL or description is provided
   */
  validateJobSource(url?: string, description?: string): { valid: boolean; error?: string } {
    if (!url?.trim() && !description?.trim()) {
      return { valid: false, error: 'Provide either a job URL or description' };
    }

    return { valid: true };
  },
};
