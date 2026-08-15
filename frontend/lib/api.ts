/**
 * API client for IntelliApply backend
 * Auto-attaches Supabase access token for authenticated requests.
 */

import { getAccessToken } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Shared fetch wrapper that auto-attaches the Bearer token if authenticated. */
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(url, { ...options, headers });

  // Handle 401 - session expired
  if (response.status === 401 && token) {
    console.warn('[API] Session expired or invalid token');
  }

  return response;
}

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

  const response = await authFetch(`${API_BASE_URL}/api/resume`, {
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
export async function processJobFromDescription(description: string): Promise<JobProcessingResponse | ErrorResponse> {
  const formData = new FormData();
  formData.append('description', description);

  const response = await authFetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  // Check if response is an error (has 'error' field from ErrorResponse)
  if (data.error) {
    return data as ErrorResponse;
  }
  
  // Wrap the backend JobPosting response in the expected format
  // Backend returns: { job_title, company_name, ..., extracted_at, job_id, extraction_source }
  // Frontend expects: { success: true, job_id, status, extraction, data: { job_id, status, processed_at, data: {} } }
  return {
    success: true,
    job_id: data.job_id,
    status: 'completed',
    extraction: {
      source: data.extraction_source,
      method: 'text',
      status: 'success',
      reason: null,
    },
    data: {
      job_id: data.job_id,
      status: 'completed',
      processed_at: data.extracted_at,
      data: {
        job_title: data.job_title,
        company_name: data.company_name,
        company_website: data.company_website,
        location: data.location,
        remote_status: data.remote_status,
        posting_age_days: data.posting_age_days,
        required_skills: data.required_skills,
        preferred_skills: data.preferred_skills,
        experience_level: data.experience_level,
        education_requirements: data.education_requirements,
        salary_range: data.salary_range,
        key_responsibilities: data.key_responsibilities,
        company_research: data.company_research,
      },
      resume: null,
    },
  };
}

/**
 * Process a job posting from a PDF file
 * Priority: 2 (medium)
 */
export async function processJobFromPDF(file: File): Promise<JobProcessingResponse | ErrorResponse> {
  const formData = new FormData();
  formData.append('job_description_pdf', file);

  const response = await authFetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  // Check if response is an error (has 'error' field from ErrorResponse)
  if (data.error) {
    return data as ErrorResponse;
  }
  
  // Wrap the backend JobPosting response in the expected format
  // Backend returns: { job_title, company_name, ..., extracted_at, job_id, extraction_source }
  // Frontend expects: { success: true, job_id, status, extraction, data: { job_id, status, processed_at, data: {} } }
  return {
    success: true,
    job_id: data.job_id,
    status: 'completed',
    extraction: {
      source: data.extraction_source,
      method: 'pdf',
      status: 'success',
      reason: null,
    },
    data: {
      job_id: data.job_id,
      status: 'completed',
      processed_at: data.extracted_at,
      data: {
        job_title: data.job_title,
        company_name: data.company_name,
        company_website: data.company_website,
        location: data.location,
        remote_status: data.remote_status,
        posting_age_days: data.posting_age_days,
        required_skills: data.required_skills,
        preferred_skills: data.preferred_skills,
        experience_level: data.experience_level,
        education_requirements: data.education_requirements,
        salary_range: data.salary_range,
        key_responsibilities: data.key_responsibilities,
        company_research: data.company_research,
      },
      resume: null,
    },
  };
}

/**
 * Process a job posting from a URL
 * Priority: 3 (lowest)
 * Supports LinkedIn URLs with automatic normalization
 */
export async function processJobFromURL(url: string): Promise<JobProcessingResponse | ErrorResponse> {
  const formData = new FormData();
  formData.append('url', url);

  const response = await authFetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  // Check if response is an error (has 'error' field from ErrorResponse)
  if (data.error) {
    return data as ErrorResponse;
  }
  
  // Wrap the backend JobPosting response in the expected format
  // Backend returns: { job_title, company_name, ..., extracted_at, job_id, extraction_source }
  // Frontend expects: { success: true, job_id, status, extraction, data: { job_id, status, processed_at, data: {} } }
  return {
    success: true,
    job_id: data.job_id,
    status: 'completed',
    extraction: {
      source: data.extraction_source,
      method: 'url',
      status: 'success',
      reason: null,
    },
    data: {
      job_id: data.job_id,
      status: 'completed',
      processed_at: data.extracted_at,
      data: {
        job_title: data.job_title,
        company_name: data.company_name,
        company_website: data.company_website,
        location: data.location,
        remote_status: data.remote_status,
        posting_age_days: data.posting_age_days,
        required_skills: data.required_skills,
        preferred_skills: data.preferred_skills,
        experience_level: data.experience_level,
        education_requirements: data.education_requirements,
        salary_range: data.salary_range,
        key_responsibilities: data.key_responsibilities,
        company_research: data.company_research,
      },
      resume: null,
    },
  };
}

/**
 * Process a job posting with multiple sources (uses backend fallback priority)
 * Backend priority: description > PDF > URL
 */
export async function processJobWithFallback(
  description?: string,
  pdfFile?: File,
  url?: string
): Promise<JobProcessingResponse | ErrorResponse> {
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

  const response = await authFetch(`${API_BASE_URL}/api/jobs`, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();
  
  // Check if response is an error (has 'error' field from ErrorResponse)
  if (data.error) {
    return data as ErrorResponse;
  }
  
  // Wrap the backend JobPosting response in the expected format
  // Backend returns: { job_title, company_name, ..., extracted_at, job_id, extraction_source }
  // Frontend expects: { success: true, job_id, status, extraction, data: { job_id, status, processed_at, data: {} } }
  const method = data.extraction_source === 'job_description_pdf' ? 'pdf' : 
                 data.extraction_source === 'url' ? 'url' : 'text';
  
  return {
    success: true,
    job_id: data.job_id,
    status: 'completed',
    extraction: {
      source: data.extraction_source,
      method: method,
      status: 'success',
      reason: null,
    },
    data: {
      job_id: data.job_id,
      status: 'completed',
      processed_at: data.extracted_at,
      data: {
        job_title: data.job_title,
        company_name: data.company_name,
        company_website: data.company_website,
        location: data.location,
        remote_status: data.remote_status,
        posting_age_days: data.posting_age_days,
        required_skills: data.required_skills,
        preferred_skills: data.preferred_skills,
        experience_level: data.experience_level,
        education_requirements: data.education_requirements,
        salary_range: data.salary_range,
        key_responsibilities: data.key_responsibilities,
        company_research: data.company_research,
      },
      resume: null,
    },
  };
}

/**
 * Check backend health
 */
export async function checkHealth(): Promise<{ status: string; service: string }> {
  const response = await authFetch(`${API_BASE_URL}/api/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }

  return response.json();
}

// ============ ANALYSIS TYPES ============
export interface ScoreBreakdown {
  hard_skills: number;
  soft_skills: number;
  experience: number;
  education: number;
}

export interface MatchData {
  overall_score: number;
  score_breakdown: ScoreBreakdown;
  strengths: string[];
  gaps: string[];
  status: string;
}

export interface ApplicationRecommendation {
  recommendation: string;
  reason: string;
}

export interface AIInsights {
  status: string;
  summary: string;
  why_you_match: string[];
  skill_gaps: string[];
  resume_improvements: string[];
  application_recommendation: ApplicationRecommendation;
  interview_focus: string[];
}

export interface AnalysisResult {
  success: boolean;
  analysis_id: string;
  status: string;
  match: MatchData;
  ai_insights: AIInsights;
}

/**
 * Run full job match analysis
 * Sends resume PDF + job data to backend /api/analysis
 * Returns comprehensive match results with score, strengths, gaps, and AI insights
 */
export async function runAnalysis(
  resumeFile: File,
  jobData?: Record<string, unknown>,
  jobDescription?: string
): Promise<AnalysisResult | ErrorResponse> {
  const formData = new FormData();
  formData.append('resume', resumeFile);
  
  if (jobData) {
    formData.append('job_data', JSON.stringify(jobData));
  }
  if (jobDescription) {
    formData.append('job_description', jobDescription);
  }

  try {
    const response = await authFetch(`${API_BASE_URL}/api/analysis`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    
    if (data.error) {
      return data as ErrorResponse;
    }
    
    return data as AnalysisResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Analysis request failed',
    };
  }
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
  const response = await authFetch(`${API_BASE_URL}/`);
  
  if (!response.ok) {
    throw new Error(`API info fetch failed with status ${response.status}`);
  }

  return response.json();
}