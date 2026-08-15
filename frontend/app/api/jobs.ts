/**
 * Jobs API
 * Handles job posting extraction from various sources
 */

import { apiClient } from './client';
import { JobPosting, JobProcessingResponse } from '@/app/types';

interface ProcessJobInput {
  job_description_pdf?: File;
  url?: string;
  description?: string;
}

interface JobRecord {
  id: string;
  user_id: string;
  url: string | null;
  company: string | null;
  title: string | null;
  description: string | null;
  parsed_data: Record<string, unknown>;
  created_at: string;
}

export const jobsAPI = {
  /**
   * Process a job posting from URL, description, or PDF
   * At least one source must be provided
   * @param input - Job source (URL, description, or PDF file)
   * @returns Extracted job data
   */
  async processJob(input: ProcessJobInput): Promise<JobPosting> {
    const formData = new FormData();

    if (input.job_description_pdf) {
      formData.append('job_description_pdf', input.job_description_pdf);
    }

    if (input.url) {
      formData.append('url', input.url);
    }

    if (input.description) {
      formData.append('description', input.description);
    }

    const response = await apiClient.postFormData<JobPosting>(
      '/api/jobs',
      formData
    );

    return response;
  },

  /**
   * Process job from URL
   */
  async processJobFromUrl(url: string): Promise<JobPosting> {
    return this.processJob({ url });
  },

  /**
   * Process job from description text
   */
  async processJobFromDescription(description: string): Promise<JobPosting> {
    return this.processJob({ description });
  },

  /**
   * Process job from PDF file
   */
  async processJobFromPdf(file: File): Promise<JobPosting> {
    return this.processJob({ job_description_pdf: file });
  },

  /**
   * List all jobs for the authenticated user
   */
  async listJobs(): Promise<{ jobs: JobRecord[] }> {
    return apiClient.get<{ jobs: JobRecord[] }>('/api/jobs');
  },
};
