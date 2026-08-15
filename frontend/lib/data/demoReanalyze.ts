/**
 * Centralized demo re-analyze comparison data for IntelliApply
 * Used in Demo Mode for the Re-Analyze feature.
 * Shows a before/after comparison when a user updates their resume.
 */

export interface DemoReanalyzeComparison {
  previousResume: string;
  newResume: string;
  previousScore: number;
  newScore: number;
  improvement: number;
  whatImproved: string[];
  remainingGaps: string[];
  previousBreakdown: {
    hard_skills: number;
    soft_skills: number;
    experience: number;
    education: number;
    responsibilities: number;
  };
  newBreakdown: {
    hard_skills: number;
    soft_skills: number;
    experience: number;
    education: number;
    responsibilities: number;
  };
}

export const demoReanalyzeComparison: DemoReanalyzeComparison = {
  previousResume: "Resume_v3.pdf",
  newResume: "Resume_v4.pdf",
  previousScore: 82,
  newScore: 89,
  improvement: 7,
  whatImproved: [
    "AWS experience identified — added cloud project details",
    "Docker experience better highlighted — container orchestration mentioned",
    "REST API experience better aligned — quantified API throughput metrics",
    "CI/CD pipeline ownership demonstrated with GitHub Actions certification",
  ],
  remainingGaps: [
    "Kubernetes",
    "GraphQL",
  ],
  previousBreakdown: {
    hard_skills: 85,
    soft_skills: 82,
    experience: 78,
    education: 90,
    responsibilities: 80,
  },
  newBreakdown: {
    hard_skills: 93,
    soft_skills: 85,
    experience: 86,
    education: 90,
    responsibilities: 88,
  },
};
