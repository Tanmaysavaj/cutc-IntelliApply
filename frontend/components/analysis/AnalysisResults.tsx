"use client";

import { AnalysisResponse } from "@/app/types/analysis";
import ScoreCard from "./ScoreCard";
import SkillsAnalysis from "./SkillsAnalysis";
import AIInsightsDisplay from "./AIInsightsDisplay";

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
}

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const { match, ai_insights } = analysis;

  return (
    <div className="space-y-8">
      {/* Header with analysis ID */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Analysis Results
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Analysis ID: {analysis.analysis_id}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            analysis.status === "completed" 
              ? "bg-green-100 text-green-800" 
              : analysis.status === "incomplete" 
                ? "bg-yellow-100 text-yellow-800" 
                : "bg-red-100 text-red-800"
          }`}>
            {analysis.status.charAt(0).toUpperCase() + analysis.status.slice(1)}
          </div>
        </div>
      </div>

      {/* Deterministic Score Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                Deterministic Match Score
              </h3>
              <p className="text-sm text-gray-600">
                Calculated by our matching algorithm - this is the source of truth
              </p>
            </div>
          </div>
        </div>

        {/* Overall Score Card */}
        <ScoreCard match={match} />

        {/* Skills Analysis */}
        <div className="mt-8">
          <SkillsAnalysis match={match} />
        </div>
      </div>

      {/* AI Insights Section */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <div className="h-10 w-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                AI Career Insights
              </h3>
              <p className="text-sm text-gray-600">
                Personalized analysis and recommendations based on your match results
              </p>
            </div>
          </div>
          
          {/* AI Insights Status */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-6 ${
            ai_insights.status === "completed" 
              ? "bg-green-100 text-green-800" 
              : ai_insights.status === "unavailable" 
                ? "bg-yellow-100 text-yellow-800" 
                : "bg-red-100 text-red-800"
          }`}>
            <span className={`h-2 w-2 rounded-full mr-2 ${
              ai_insights.status === "completed" 
                ? "bg-green-500" 
                : ai_insights.status === "unavailable" 
                  ? "bg-yellow-500" 
                  : "bg-red-500"
            }`}></span>
            AI Insights: {ai_insights.status.charAt(0).toUpperCase() + ai_insights.status.slice(1)}
          </div>
        </div>

        {/* AI Insights Content */}
        <AIInsightsDisplay insights={ai_insights} />
      </div>

      {/* Note about deterministic vs AI */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Understanding Your Results
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p className="mb-2">
                <strong>Deterministic Score:</strong> Calculated by our algorithm based on exact skill matching, 
                experience comparison, and education requirements. This is the objective measure of your fit.
              </p>
              <p>
                <strong>AI Insights:</strong> Provides personalized career advice, skill gap analysis, 
                and recommendations based on the deterministic results. The AI explains the match 
                but does not change the score.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}