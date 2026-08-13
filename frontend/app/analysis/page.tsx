"use client";

import { useState } from "react";
import AnalysisForm from "@/components/analysis/AnalysisForm";
import AnalysisResults from "@/components/analysis/AnalysisResults";
import { AnalysisResponse } from "@/app/types/analysis";
import { apiClient } from "@/app/api/client";

export default function AnalysisPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (resumeFile: File, jobDescription: string) => {
    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append("resume", resumeFile);
      
      if (jobDescription.trim()) {
        formData.append("description", jobDescription.trim());
      }

      // Use apiClient which is configured to call the FastAPI backend
      const data = await apiClient.postFormData<AnalysisResponse>("/api/analysis", formData);
      setAnalysisResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      console.error("Analysis error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            AI Career Insights
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Upload your resume and a job description to get a comprehensive analysis 
            with deterministic matching scores and AI-generated career insights.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upload Your Documents
              </h2>
              <AnalysisForm
                onAnalyze={handleAnalyze}
                onReset={handleReset}
                isLoading={isLoading}
                hasResults={!!analysisResult}
              />
              
              {error && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-2 text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right column: Results */}
          <div className="lg:col-span-2">
            {analysisResult ? (
              <AnalysisResults analysis={analysisResult} />
            ) : (
              <div className="bg-white rounded-lg shadow p-8">
                <div className="text-center py-12">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <svg className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    No analysis yet
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                    Upload your resume and a job description to get started. 
                    The system will analyze your match and provide AI-powered career insights.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Information section */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">1</span>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Deterministic Matching
                </h3>
              </div>
              <p className="text-gray-600">
                Our algorithm calculates exact match scores based on your skills, 
                experience, and education compared to job requirements.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">2</span>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  AI Career Insights
                </h3>
              </div>
              <p className="text-gray-600">
                AI analyzes the match results to provide personalized career advice, 
                skill gap analysis, and interview preparation tips.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">3</span>
                </div>
                <h3 className="ml-3 text-lg font-medium text-gray-900">
                  Actionable Recommendations
                </h3>
              </div>
              <p className="text-gray-600">
                Get clear guidance on whether to apply, how to improve your resume, 
                and what to focus on in interviews.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}