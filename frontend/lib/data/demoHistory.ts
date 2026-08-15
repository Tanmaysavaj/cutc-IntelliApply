/**
 * Centralized demo history data for IntelliApply
 * Derived from demoAnalyses to maintain consistency
 */

import { demoAnalyses } from "./demoAnalyses";

export interface DemoHistoryEntry {
  id: string;
  date: string;
  job_title: string;
  company_name: string;
  location: string;
  overall_score: number;
  recommendation: string;
  job_id: string;
}

/** Build history entries from analyses — sorted by date descending (most recent first) */
export const demoHistory: DemoHistoryEntry[] = demoAnalyses
  .map((a) => ({
    id: a.id,
    date: a.date,
    job_title: a.job_title,
    company_name: a.company_name,
    location: a.location,
    overall_score: a.overall_score,
    recommendation: a.recommendation,
    job_id: a.job_id,
  }))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

/** Summary stats derived from demo data */
export const demoStats = {
  jobsAnalyzed: demoAnalyses.length,
  averageMatch: Math.round(
    demoAnalyses.reduce((sum, a) => sum + a.overall_score, 0) / demoAnalyses.length
  ),
  strongMatches: demoAnalyses.filter((a) => a.overall_score >= 80).length,
  skillGaps: Array.from(new Set(demoAnalyses.flatMap((a) => a.gaps))).length,
};
