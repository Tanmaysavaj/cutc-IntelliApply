/**
 * Demo mode hook for IntelliApply
 * Provides a simple toggle between demo (seeded data) and live (backend API) modes.
 *
 * Demo Mode → mock/seeded frontend data
 * Live Mode → existing backend functionality
 */

import { useState, useCallback } from "react";
import {
  demoResume,
  demoJobs,
  demoAnalyses,
  demoHistory,
  demoStats,
  latestDemoAnalysis,
  getDemoAnalysisForJob,
  type DemoJob,
  type DemoAnalysis,
  type DemoHistoryEntry,
} from "./data";

export interface DemoState {
  /** Whether the app is currently in demo mode */
  isDemo: boolean;
  /** The currently selected job ID in demo mode */
  selectedJobId: string | null;
  /** The currently viewed analysis in demo mode */
  selectedAnalysis: DemoAnalysis | null;
}

export interface DemoActions {
  /** Activate demo mode */
  enterDemo: () => void;
  /** Exit demo mode and return to live */
  exitDemo: () => void;
  /** Select a job for analysis view in demo mode */
  selectJob: (jobId: string) => void;
  /** Clear selected job/analysis */
  clearSelection: () => void;
}

export interface DemoData {
  resume: typeof demoResume;
  jobs: DemoJob[];
  analyses: DemoAnalysis[];
  history: DemoHistoryEntry[];
  stats: typeof demoStats;
  latest: DemoAnalysis;
}

export function useDemo() {
  const [isDemo, setIsDemo] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<DemoAnalysis | null>(null);

  const enterDemo = useCallback(() => {
    setIsDemo(true);
    setSelectedJobId(null);
    setSelectedAnalysis(latestDemoAnalysis);
  }, []);

  const exitDemo = useCallback(() => {
    setIsDemo(false);
    setSelectedJobId(null);
    setSelectedAnalysis(null);
  }, []);

  const selectJob = useCallback((jobId: string) => {
    setSelectedJobId(jobId);
    const analysis = getDemoAnalysisForJob(jobId);
    setSelectedAnalysis(analysis || null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedJobId(null);
    setSelectedAnalysis(latestDemoAnalysis);
  }, []);

  const state: DemoState = { isDemo, selectedJobId, selectedAnalysis };
  const actions: DemoActions = { enterDemo, exitDemo, selectJob, clearSelection };
  const data: DemoData = {
    resume: demoResume,
    jobs: demoJobs,
    analyses: demoAnalyses,
    history: demoHistory,
    stats: demoStats,
    latest: latestDemoAnalysis,
  };

  return { state, actions, data };
}
