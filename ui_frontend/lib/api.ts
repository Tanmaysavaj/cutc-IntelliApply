/**
 * API client for IntelliApply backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ============ RESUME TYPES ============
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

// ============ JOB TYPES ============
export interface JobPosting {
  job_title: string;
  company_name: string;
  company_website?: string | null;
  location?: string | null;
  remote_status?: string | null;
  posting_age_days?: number | null;
  required_skills: string[];
  preferred_skills: string[];
  experience_level?: string | null;
  education_requirements?: string | null;
  salary_range?: string | null;
  key_responsibilities: string[];
  company_research?: {
    summary: string;
  } | null;
}

export interface ExtractionInfo {
  source?: string | null;
  method?: string | null;
  status: string;
  reason?: string | null;
}

export interface JobResponseData {
  job_id: string;
  status: string;
  processed_at: string;
  data: JobPosting;
  resume?: Record<string, unknown> | null;
}

export interface JobProcessingResponse {
  success: boolean;
  job_id: string;
  status: string;
  extraction: ExtractionInfo;
  data: JobResponseData;
}

export interface ErrorResponse {
  success: boolean;
  error: string;
  resume_id?: string;
  job_id?: string;
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
 * Process a job posting from text description
 * Priority: 1 (highest)
 */
export async function processJobFromDescription(description: string): Promise<JobProcessingResponse> {
  const formData = new FormData();
  formData.append('description', description);

  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || `Job processing failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Process a job posting from a PDF file
 * Priority: 2 (medium)
 */
export async function processJobFromPDF(file: File): Promise<JobProcessingResponse> {
  const formData = new FormData();
  formData.append('job_description_pdf', file);

  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || `Job processing failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Process a job posting from a URL
 * Priority: 3 (lowest)
 * Supports LinkedIn URLs with automatic normalization
 */
export async function processJobFromURL(url: string): Promise<JobProcessingResponse> {
  const formData = new FormData();
  formData.append('url', url);

  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || `Job processing failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Process a job posting with multiple sources (uses backend fallback priority)
 * Backend priority: description > PDF > URL
 */
export async function processJobWithFallback(
  description?: string,
  pdfFile?: File,
  url?: string
): Promise<JobProcessingResponse> {
  const formData = new FormData();
  
  if (description) {
    formData.append('description', description);
  }
  if (pdfFile) {
    formData.append('job_description_pdf', pdfFile);
  }
  if (url) {
    formData.append('url', url);
  }

  const response = await fetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.error || `Job processing failed with status ${response.status}`);
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