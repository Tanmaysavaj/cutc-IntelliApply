/**
 * Analysis API
 * Handles job-to-resume matching and scoring
 */

import { apiClient } from './client';
import { AnalysisResponse } from '@/app/types/analysis';

interface AnalyzeApplicationInput {
  resume: File;
  jobData?: string;
  jobDescription?: string;
  resumeId?: string;
  jobId?: string;
}

interface AnalysisHistoryItem {
  id: string;
  match_score: number;
  created_at: string;
  result: AnalysisResponse;
  jobs?: { title: string; company: string } | null;
}

export const analysisAPI = {
  /**
   * Analyze a job application by matching resume against job posting
   */
  async analyzeApplication(input: AnalyzeApplicationInput): Promise<AnalysisResponse> {
    const formData = new FormData();
    formData.append('resume', input.resume);

    if (input.jobData) {
      formData.append('job_data', input.jobData);
    }

    if (input.jobDescription) {
      formData.append('job_description', input.jobDescription);
    }

    if (input.resumeId) {
      formData.append('resume_id', input.resumeId);
    }

    if (input.jobId) {
      formData.append('job_id', input.jobId);
    }

    return apiClient.postFormData<AnalysisResponse>('/api/analysis', formData);
  },

  /**
   * Get analysis history for the authenticated user
   */
  async getHistory(): Promise<{ analyses: AnalysisHistoryItem[] }> {
    return apiClient.get<{ analyses: AnalysisHistoryItem[] }>('/api/analysis');
  },

  /**
   * Get a specific analysis by ID
   */
  async getAnalysis(analysisId: string): Promise<AnalysisHistoryItem> {
    return apiClient.get<AnalysisHistoryItem>(`/api/analysis/${analysisId}`);
  },
};
