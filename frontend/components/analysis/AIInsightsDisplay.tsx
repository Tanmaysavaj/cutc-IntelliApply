"use client";

import { AIInsights } from "@/app/types/analysis";

interface AIInsightsDisplayProps {
  insights: AIInsights;
}

export default function AIInsightsDisplay({ insights }: AIInsightsDisplayProps) {
  if (insights.status !== "completed") {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              AI Insights Unavailable
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>{insights.summary}</p>
              {insights.reason && (
                <p className="mt-2 text-xs text-yellow-600">
                  Reason: {insights.reason}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              AI Analysis Summary
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>{insights.summary}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Why You Match */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-3">
          Why You Match This Role
        </h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          {insights.why_you_match.length > 0 ? (
            <ul className="space-y-3">
              {insights.why_you_match.map((reason, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm">No specific match reasons identified</p>
          )}
        </div>
      </div>

      {/* Skill Gaps */}
      {insights.skill_gaps.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            Skill Gaps Analysis
          </h4>
          <div className="space-y-4">
            {insights.skill_gaps.map((gap, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      gap.importance === "required" 
                        ? "bg-red-100 text-red-800" 
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {gap.importance === "required" ? "Required" : "Preferred"} Skill
                    </span>
                    <h5 className="text-md font-medium text-gray-900 mt-2">
                      {gap.skill}
                    </h5>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Why it matters:</span>
                    <p className="text-sm text-gray-600 mt-1">{gap.reason}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Recommendation:</span>
                    <p className="text-sm text-gray-600 mt-1">{gap.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resume Improvements */}
      {insights.resume_improvements.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            Resume Improvement Suggestions
          </h4>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul className="space-y-3">
              {insights.resume_improvements.map((improvement, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                    <svg className="h-4 w-4 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{improvement}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Application Recommendation */}
      <div>
        <h4 className="text-lg font-medium text-gray-900 mb-3">
          Application Recommendation
        </h4>
        <div className={`rounded-lg p-4 ${
          insights.application_recommendation.recommendation === "apply" 
            ? "bg-green-50 border border-green-200" 
            : insights.application_recommendation.recommendation === "consider" 
              ? "bg-yellow-50 border border-yellow-200" 
              : "bg-red-50 border border-red-200"
        }`}>
          <div className="flex items-center mb-3">
            <div className={`h-10 w-10 rounded-full flex items-center justify-center mr-3 ${
              insights.application_recommendation.recommendation === "apply" 
                ? "bg-green-100" 
                : insights.application_recommendation.recommendation === "consider" 
                  ? "bg-yellow-100" 
                  : "bg-red-100"
            }`}>
              {insights.application_recommendation.recommendation === "apply" && (
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {insights.application_recommendation.recommendation === "consider" && (
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {insights.application_recommendation.recommendation === "low_match" && (
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <div>
              <div className={`text-lg font-semibold ${
                insights.application_recommendation.recommendation === "apply" 
                  ? "text-green-800" 
                  : insights.application_recommendation.recommendation === "consider" 
                    ? "text-yellow-800" 
                    : "text-red-800"
              }`}>
                {insights.application_recommendation.recommendation === "apply" && "Apply"}
                {insights.application_recommendation.recommendation === "consider" && "Consider Applying"}
                {insights.application_recommendation.recommendation === "low_match" && "Low Match"}
              </div>
            </div>
          </div>
          <p className="text-gray-700">{insights.application_recommendation.reason}</p>
        </div>
      </div>

      {/* Interview Focus */}
      {insights.interview_focus.length > 0 && (
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-3">
            Interview Preparation Focus
          </h4>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <ul className="space-y-3">
              {insights.interview_focus.map((focus, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-gray-700">{focus}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}