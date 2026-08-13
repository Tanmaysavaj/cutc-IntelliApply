"use client";

import { MatchResult } from "@/app/types/analysis";

interface SkillsAnalysisProps {
  match: MatchResult;
}

export default function SkillsAnalysis({ match }: SkillsAnalysisProps) {
  return (
    <div className="space-y-6">
      <h4 className="text-lg font-medium text-gray-900">
        Skills Analysis
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Required Skills */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="h-3 w-3 bg-blue-600 rounded-full mr-2"></span>
            Required Skills
          </h5>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Matched ({match.matched_required_skills.length})</div>
            {match.matched_required_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {match.matched_required_skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No required skills matched</p>
            )}
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-2">Missing ({match.missing_required_skills.length})</div>
            {match.missing_required_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {match.missing_required_skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All required skills matched!</p>
            )}
          </div>
        </div>

        {/* Preferred Skills */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-medium text-gray-900 mb-3 flex items-center">
            <span className="h-3 w-3 bg-blue-400 rounded-full mr-2"></span>
            Preferred Skills
          </h5>
          
          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Matched ({match.matched_preferred_skills.length})</div>
            {match.matched_preferred_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {match.matched_preferred_skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No preferred skills matched</p>
            )}
          </div>
          
          <div>
            <div className="text-sm text-gray-600 mb-2">Missing ({match.missing_preferred_skills.length})</div>
            {match.missing_preferred_skills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {match.missing_preferred_skills.map((skill, index) => (
                  <span 
                    key={index}
                    className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">All preferred skills matched!</p>
            )}
          </div>
        </div>
      </div>

      {/* Strengths and Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h5 className="font-medium text-green-900 mb-3 flex items-center">
            <svg className="h-5 w-5 text-green-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Strengths
          </h5>
          {match.strengths.length > 0 ? (
            <ul className="space-y-2">
              {match.strengths.map((strength, index) => (
                <li key={index} className="text-sm text-green-800 flex items-start">
                  <span className="h-2 w-2 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {strength}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-green-700">No specific strengths identified</p>
          )}
        </div>

        {/* Gaps */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h5 className="font-medium text-red-900 mb-3 flex items-center">
            <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Gaps & Areas for Improvement
          </h5>
          {match.gaps.length > 0 ? (
            <ul className="space-y-2">
              {match.gaps.map((gap, index) => (
                <li key={index} className="text-sm text-red-800 flex items-start">
                  <span className="h-2 w-2 bg-red-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {gap}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-red-700">No significant gaps identified</p>
          )}
        </div>
      </div>
    </div>
  );
}