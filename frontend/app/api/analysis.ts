/**
 * Analysis API
 * Handles job-to-resume matching and scoring
 */

import { apiClient } from './client';
import { MatchResult, AnalysisResponse } from '@/app/types';

interface AnalyzeApplicationInput {
  resume: File;
  url?: string;
  description?: string;
}

export const analysisAPI = {
  /**
   * Analyze a job application by matching resume against job posting
   * @param resume - Resume PDF file (required)
   * @param url - Optional job posting URL
   * @param description - Optional job description text
   * @returns Match result with scoring and recommendations
   */
  async analyzeApplication(input: AnalyzeApplicationInput): Promise<MatchResult> {
    const formData = new FormData();
    formData.append('resume', input.resume);

    if (input.url) {
      formData.append('url', input.url);
    }

    if (input.description) {
      formData.append('description', input.description);
    }

    const response = await apiClient.postFormData<AnalysisResponse>(
      '/api/analysis',
      formData
    );

    if (!response.data) {
      throw new Error(response.error || 'Failed to analyze application');
    }

    return response.data;
  },
};
