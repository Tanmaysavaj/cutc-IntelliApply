/**
 * Resume API
 * Handles resume upload and processing
 */

import { apiClient } from './client';
import { Resume, ResumeProcessingResponse } from '@/app/types';

export const resumeAPI = {
  /**
   * Upload and process a resume PDF
   * @param file - PDF file to upload
   * @returns Resume data with extracted information
   */
  async uploadResume(file: File): Promise<Resume> {
    const formData = new FormData();
    formData.append('resume', file);

    const response = await apiClient.postFormData<ResumeProcessingResponse>(
      '/api/resume',
      formData
    );

    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to process resume');
    }

    return response.data;
  },
};
