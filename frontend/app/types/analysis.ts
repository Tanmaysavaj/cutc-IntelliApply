export interface RequiredSkillsScore {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface PreferredSkillsScore {
  score: number;
  matched_skills: string[];
  missing_skills: string[];
}

export interface ExperienceScore {
  score: number;
  matched: boolean;
  unknown: boolean;
  job_requirement?: string;
  candidate_experience?: string;
}

export interface EducationScore {
  score: number;
  matched: boolean;
  unknown: boolean;
  job_requirement?: string;
  candidate_education?: string;
}

export interface ResponsibilitiesScore {
  score: number;
  keyword_count: number;
  keyword_matches: string[];
}

export interface ScoreBreakdown {
  required_skills: RequiredSkillsScore;
  preferred_skills: PreferredSkillsScore;
  experience: ExperienceScore;
  education: EducationScore;
  responsibilities: ResponsibilitiesScore;
}

export interface MatchResult {
  overall_score: number;
  score_breakdown: ScoreBreakdown;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  missing_preferred_skills: string[];
  strengths: string[];
  gaps: string[];
  status: string;
}

export interface SkillGap {
  skill: string;
  importance: "required" | "preferred";
  reason: string;
  recommendation: string;
}

export interface ApplicationRecommendation {
  recommendation: "apply" | "consider" | "low_match";
  reason: string;
}

export interface AIInsights {
  status: "completed" | "unavailable" | "failed";
  summary: string;
  why_you_match: string[];
  skill_gaps: SkillGap[];
  resume_improvements: string[];
  application_recommendation: ApplicationRecommendation;
  interview_focus: string[];
  reason?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis_id: string;
  status: "completed" | "incomplete" | "failed";
  match: MatchResult;
  ai_insights: AIInsights;
}