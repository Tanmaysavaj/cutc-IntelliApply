/**
 * Core TypeScript types for IntelliApply
 * Aligned with FastAPI backend response schemas
 */

/**
 * Resume data extracted from PDF
 */
export interface Resume {
  resume_id: string;
  full_name?: string;
  email?: string;
  phone?: string;
  location?: string;
  professional_summary?: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications?: string[];
  languages?: string[];
  extracted_at?: string;
}

export interface WorkExperience {
  title: string;
  company: string;
  location?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
  description?: string;
  responsibilities?: string[];
  technologies?: string[];
}

export interface Education {
  degree: string;
  institution: string;
  field_of_study?: string;
  graduation_date?: string;
  gpa?: string;
  details?: string;
}

/**
 * Job posting data extracted from URL or description
 */
export interface JobPosting {
  job_id: string;
  job_title: string;
  company_name: string;
  location?: string;
  employment_type?: string;
  salary_range?: string;
  job_url?: string;
  description?: string;
  key_responsibilities: string[];
  required_skills: string[];
  preferred_skills?: string[];
  required_experience?: string;
  education_required?: string;
  extracted_at?: string;
  extraction_source?: string;
}

/**
 * Match result between resume and job
 */
export interface MatchResult {
  analysis_id: string;
  resume_id: string;
  job_id: string;
  overall_score: number; // 0-100
  recommendation: 'strong_match' | 'good_match' | 'moderate_match' | 'weak_match';
  strength_summary: string;
  gap_summary: string;
  matched_skills: SkillMatch[];
  missing_skills: SkillMatch[];
  experience_alignment: ExperienceAlignment;
  advice: ApplicationAdvice;
  interview_questions?: string[];
  created_at?: string;
}

export interface SkillMatch {
  skill: string;
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  relevance_score?: number; // 0-100
  matched?: boolean;
}

export interface ExperienceAlignment {
  required_years: string;
  candidate_years: string;
  alignment_score: number; // 0-100
  details: string;
}

export interface ApplicationAdvice {
  top_3_points: string[];
  common_interview_questions: string[];
  resume_optimization_tips: string[];
  cover_letter_focus_areas: string[];
}

/**
 * API Request/Response types
 */
export interface ResumeProcessingResponse {
  success: boolean;
  resume_id: string;
  status: 'processed' | 'failed';
  data?: Resume;
  error?: string;
}

export interface JobProcessingResponse {
  success: boolean;
  job_id: string;
  status: 'processed' | 'failed';
  data?: JobPosting;
  error?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysis_id: string;
  data?: MatchResult;
  error?: string;
}

/**
 * UI State types
 */
export type Page = 'landing' | 'resume' | 'jobs' | 'analysis' | 'history';
export type Theme = 'light' | 'dark';

export interface JobSource {
  kind: string;
  value: string;
}

export interface ApplicationRecord {
  id: string;
  date: string;
  job_source: JobSource;
  resume_filename: string;
  match_result: MatchResult;
}
