/**
 * Centralized demo analytics data for IntelliApply
 * Used in Demo Mode for the Application Analytics page.
 * All values are static/seeded — no backend or AI calls needed.
 */

export interface DemoAnalyticsData {
  totalApplications: number;
  interviews: number;
  averageMatch: number;
  interviewRate: number;
  statusBreakdown: {
    saved: number;
    applied: number;
    screening: number;
    interview: number;
    offer: number;
  };
  matchPerformance: {
    strong: number;
    moderate: number;
    low: number;
  };
  commonSkillGaps: Array<{ skill: string; count: number }>;
  careerFocus: string;
  careerDescription: string;
  insights: string[];
}

export const demoAnalytics: DemoAnalyticsData = {
  totalApplications: 12,
  interviews: 4,
  averageMatch: 78,
  interviewRate: 33,
  statusBreakdown: {
    saved: 3,
    applied: 4,
    screening: 2,
    interview: 2,
    offer: 1,
  },
  matchPerformance: {
    strong: 7,
    moderate: 4,
    low: 1,
  },
  commonSkillGaps: [
    { skill: "Kubernetes", count: 6 },
    { skill: "Terraform", count: 4 },
    { skill: "GraphQL", count: 3 },
    { skill: "Kafka", count: 2 },
  ],
  careerFocus: "Backend & Cloud Engineering",
  careerDescription:
    "Your recent applications show strong alignment with backend development, cloud infrastructure and API-focused roles.",
  insights: [
    "Your strongest applications have an average match of 87%.",
    "Kubernetes is currently your most common skill gap.",
    "You have progressed to the interview stage on 4 applications.",
    "Applications with 80%+ match scores have a 57% interview rate.",
  ],
};
