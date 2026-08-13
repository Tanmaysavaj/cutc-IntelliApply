/**
 * API client for IntelliApply backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ResumeData {
  resume_id: string;
  status: string;
  extracted_at: string;
  data: {
    hard_skills: string[];
    soft_skills: string[];
    work_experience: Array<{
      company: string | null;
      role: string | null;
      duration: string | null;
      responsibilities: string[];
    }>;
    education: Array<{
      institution: string | null;
      degree: string | null;
    }>;
    certifications: string[];
    projects: string[];
    keywords: string[];
  };
}

export interface ResumeResponse {
  success: boolean;
  resume_id: string;
  status: string;
  data: ResumeData;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  resume_id?: string;
}

/**
 * Upload and process a resume PDF file
 */
export async function uploadResume(file: File): Promise<ResumeResponse> {
  const formData = new FormData();
  formData.append('resume', file);

  const response = await fetch(`${API_BASE_URL}/api/resume`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || `Upload failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Get API information
 */
export async function getApiInfo(): Promise<{
  name: string;
  version: string;
  docs: string;
  health: string;
  resume: string;
  jobs: string;
  analysis: string;
}> {
  const response = await fetch(`${API_BASE_URL}/`);
  
  if (!response.ok) {
    throw new Error(`API info fetch failed with status ${response.status}`);
  }

  return response.json();
}