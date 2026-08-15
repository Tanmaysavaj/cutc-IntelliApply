/**
 * Resume API
 * Handles resume upload and processing
 */

import { apiClient } from './client';
import { Resume, ResumeProcessingResponse } from '@/app/types';

interface ResumeRecord {
  id: string;
  user_id: string;
  file_url: string;
  parsed_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const resumeAPI = {
  /**
   * Upload and process a resume PDF
   * @param file - PDF file to upload
   * @returns Resume data with extracted information
   */
  async uploadResume(file: File): Promise<ResumeProcessingResponse> {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await apiClient.postFormData<ResumeProcessingResponse>(
      '/api/resume',
      formData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to process resume');
    }

    return response;
  },

  /**
   * List all resumes for the authenticated user
   */
  async listResumes(): Promise<{ resumes: ResumeRecord[] }> {
    return apiClient.get<{ resumes: ResumeRecord[] }>('/api/resume');
  },

  /**
   * Get a specific resume by ID
   */
  async getResume(resumeId: string): Promise<ResumeRecord> {
    return apiClient.get<ResumeRecord>(`/api/resume/${resumeId}`);
  },
};
