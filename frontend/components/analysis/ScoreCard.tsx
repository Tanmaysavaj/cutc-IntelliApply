"use client";

import { MatchResult } from "@/app/types/analysis";

interface ScoreCardProps {
  match: MatchResult;
}

export default function ScoreCard({ match }: ScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Strong Match";
    if (score >= 60) return "Moderate Match";
    return "Weak Match";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overall Score */}
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-sm font-medium text-gray-600 mb-2">
          Overall Match Score
        </div>
        <div className={`text-5xl font-bold ${getScoreColor(match.overall_score)} py-4 rounded-lg`}>
          {match.overall_score}%
        </div>
        <div className={`mt-2 text-lg font-semibold ${getScoreColor(match.overall_score)}`}>
          {getScoreLabel(match.overall_score)}
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Based on comprehensive analysis of skills, experience, education, and responsibilities
        </p>
      </div>

      {/* Score Breakdown */}
      <div className="md:col-span-2">
        <h4 className="text-lg font-medium text-gray-900 mb-4">
          Score Breakdown
        </h4>
        <div className="space-y-4">
          {/* Required Skills */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Required Skills
              </span>
              <span className="text-sm font-medium text-gray-900">
                {match.score_breakdown.required_skills.score}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${match.score_breakdown.required_skills.score}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {match.score_breakdown.required_skills.matched_skills.length} matched, 
              {" "}{match.score_breakdown.required_skills.missing_skills.length} missing
            </div>
          </div>

          {/* Preferred Skills */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Preferred Skills
              </span>
              <span className="text-sm font-medium text-gray-900">
                {match.score_breakdown.preferred_skills.score}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${match.score_breakdown.preferred_skills.score}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {match.score_breakdown.preferred_skills.matched_skills.length} matched, 
              {" "}{match.score_breakdown.preferred_skills.missing_skills.length} missing
            </div>
          </div>

          {/* Experience */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Experience
              </span>
              <span className="text-sm font-medium text-gray-900">
                {match.score_breakdown.experience.score}%
                {match.score_breakdown.experience.unknown && " (unknown)"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${match.score_breakdown.experience.score}%` }}
              ></div>
            </div>
          </div>

          {/* Education */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Education
              </span>
              <span className="text-sm font-medium text-gray-900">
                {match.score_breakdown.education.score}%
                {match.score_breakdown.education.unknown && " (unknown)"}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${match.score_breakdown.education.score}%` }}
              ></div>
            </div>
          </div>

          {/* Responsibilities */}
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">
                Responsibilities
              </span>
              <span className="text-sm font-medium text-gray-900">
                {match.score_breakdown.responsibilities.score}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ width: `${match.score_breakdown.responsibilities.score}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {match.score_breakdown.responsibilities.keyword_matches.length} keywords matched
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}