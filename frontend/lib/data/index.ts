/**
 * Centralized demo data exports for IntelliApply
 */

export { demoResume } from "./demoResume";
export { demoJobs, type DemoJob } from "./demoJobs";
export {
  demoAnalyses,
  latestDemoAnalysis,
  getDemoAnalysisForJob,
  type DemoAnalysis,
} from "./demoAnalyses";
export { demoHistory, demoStats, type DemoHistoryEntry } from "./demoHistory";
export { demoCareerSnapshot } from "./demoCareer";
export {
  demoApplications,
  getDemoApplication,
  getDemoApplicationByJobId,
  getDemoApplicationsByStatus,
  APPLICATION_STATUSES,
  STATUS_CONFIG,
  type DemoApplication,
  type ApplicationStatus,
  type ApplicationTimelineEvent,
  type ApplicationCoverLetter,
} from "./demoApplications";
